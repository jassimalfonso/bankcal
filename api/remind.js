// Vercel serverless function: gentle reminders, at most two a day per person.
//   GET /api/remind   → checks everyone who turned reminders on and sends the ones that are due
// Called every 30 minutes by a scheduled job (.github/workflows/remind.yml). Safe to call more
// often: each reminder is sent once per day at most, and only when it's useful:
//   • lunch (12:30) and dinner (19:30): only if nothing was logged in the last 3 hours
//   • close my day (at your bedtime): only if you logged food today and haven't closed the day
// Needs env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (already set for cheers) and
// FIREBASE_SERVICE_ACCOUNT (the service account JSON from Firebase, saved in Vercel as Secret).
import { SignJWT, importPKCS8 } from 'jose'

const PROJECT = 'bankcal-2d763'
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

function plain(v) {
  if (!v) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(plain)
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)]))
  return null
}

async function accessToken(sa) {
  const key = await importPKCS8(sa.private_key, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email).setSubject(sa.client_email).setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now).setExpirationTime(now + 3000).sign(key)
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('Could not sign in with the service account.')
  return j.access_token
}

// local date and minutes-since-midnight in a time zone
function localNow(tz, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, p.value]))
  return { day: `${parts.year}-${parts.month}-${parts.day}`, min: +parts.hour * 60 + +parts.minute }
}
const toMin = (hhmm, dflt) => (/^\d{1,2}:\d{2}$/.test(String(hhmm ?? '')) ? hhmm.split(':').reduce((h, m) => +h * 60 + +m) : dflt)
const WINDOW = 40 // minutes after the set time in which a reminder can still go out

// what's due for one person right now, if anything
export function dueFor(r, now = new Date()) {
  if (!r) return null
  const { day, min } = localNow(r.tz, now)
  const sent = r.sent ?? {}
  const quiet = r.lastFood && now.getTime() - r.lastFood < 3 * 3600e3
  const inWin = (t) => min >= t && min < t + WINDOW
  if (r.meal) {
    for (const [slot, t, label] of [['lunch', 12 * 60 + 30, 'Lunch'], ['dinner', 19 * 60 + 30, 'Dinner']]) {
      if (inWin(t) && sent[slot] !== day && !quiet) {
        return { slot, day, title: `${label} time, ${r.name || 'friend'} 🍽️`, body: r.left != null && r.left > 0 ? `Log before you eat? ${r.left.toLocaleString('en')} kcal left today.` : 'Log before you eat? It only takes a tap.' }
      }
    }
  }
  if (r.close) {
    const bed = toMin(r.bed, 22 * 60 + 30)
    if (inWin(bed) && sent.close !== day && r.loggedDay === day && r.closed !== day) {
      return { slot: 'close', day, title: 'Close your day? 🌙', body: r.left != null && r.left >= 0 ? `You’re ${r.left.toLocaleString('en')} kcal under budget. Nice work today.` : 'Wrap up today and see how it went.' }
    }
  }
  return null
}

export default async function handler(req, res) {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY
  let sa
  try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null') } catch { sa = null }
  if (!pub || !priv || !sa?.private_key) return res.status(503).json({ error: 'Reminders aren’t set up on the server yet (needs FIREBASE_SERVICE_ACCOUNT and the VAPID keys).' })

  const token = await accessToken(sa)
  const auth = { authorization: `Bearer ${token}` }
  const webpush = await import('web-push')
  webpush.setVapidDetails('https://bankcal.vercel.app', pub, priv)

  let pageToken = '', sentCount = 0, checked = 0
  do {
    const r = await fetch(`${FS}/shares?pageSize=300&mask.fieldPaths=remind&mask.fieldPaths=push${pageToken ? `&pageToken=${pageToken}` : ''}`, { headers: auth })
    const j = await r.json()
    for (const d of j.documents ?? []) {
      const f = Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, plain(v)]))
      const due = dueFor(f.remind)
      checked++
      if (!due) continue
      const subs = Object.values(f.push ?? {}).filter((s) => s?.endpoint && s?.keys?.p256dh && s?.keys?.auth)
      if (!subs.length) continue
      // mark it sent first, so two runs can never send the same reminder twice
      const patch = await fetch(`https://firestore.googleapis.com/v1/${d.name}?updateMask.fieldPaths=${encodeURIComponent(`remind.sent.${due.slot}`)}`, {
        method: 'PATCH', headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ fields: { remind: { mapValue: { fields: { sent: { mapValue: { fields: { [due.slot]: { stringValue: due.day } } } } } } } } }),
      })
      if (!patch.ok) continue
      const payload = JSON.stringify({ title: due.title, body: due.body, tag: `remind-${due.slot}` })
      const out = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload, { TTL: 1800, urgency: 'normal' })))
      sentCount += out.filter((x) => x.status === 'fulfilled').length
    }
    pageToken = j.nextPageToken || ''
  } while (pageToken)
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ checked, sent: sentCount })
}
