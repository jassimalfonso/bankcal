// Vercel serverless function: sends a phone notification when someone cheers their partner.
//   GET  /api/push            → the public key phones need to sign up for notifications
//   POST /api/push {to, msg}  → notify partner `to` (caller must be signed in and linked to them)
// Keys live on the server as env vars VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
// The partner's notification address is read from shares/{to} *with the caller's own sign-in*,
// so Firestore's rules decide: only a linked partner can read it, so only a partner can notify.
import { createRemoteJWKSet, jwtVerify } from 'jose'
import webpush from 'web-push'

const PROJECT = 'bankcal-2d763'
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

// Firestore REST values → plain JS
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

export default async function handler(req, res) {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (req.method === 'GET') {
    if (!pub) return res.status(503).json({ error: 'Notifications aren’t set up on the server yet.' })
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.json({ key: pub })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST' })
  if (!pub || !priv) return res.status(503).json({ error: 'Notifications aren’t set up on the server yet.' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  let me
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT })
    me = payload.sub
  } catch {
    return res.status(401).json({ error: 'Please sign in again.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const to = String(body.to || '')
  if (!/^[A-Za-z0-9]{10,64}$/.test(to) || to === me) return res.status(400).json({ error: 'Bad partner.' })

  // read their share as the caller; rules refuse anyone who isn't their partner
  const r = await fetch(`${FS}/shares/${to}`, { headers: { authorization: `Bearer ${token}` } })
  if (!r.ok) return res.status(r.status === 404 ? 404 : 403).json({ error: 'Not linked with this partner.' })
  const fields = Object.fromEntries(Object.entries((await r.json()).fields ?? {}).map(([k, v]) => [k, plain(v)]))
  if (!(fields.partners ?? []).includes(me)) return res.status(403).json({ error: 'Not linked with this partner.' })
  const subs = Object.values(fields.push ?? {}).filter((s) => s?.endpoint && s?.keys?.p256dh && s?.keys?.auth)
  if (!subs.length) return res.json({ sent: 0 }) // they haven't turned notifications on

  const from = fields.cheers?.[me]?.name || 'Your partner'
  const msg = String(body.msg || '👏').slice(0, 60)
  const payload = JSON.stringify({
    title: msg === '👏' ? `👏 ${from} cheered you on` : `${from} cheered you on`,
    body: msg === '👏' ? 'Open BankCal to see your day.' : msg,
    tag: `cheer-${me}`,
  })
  webpush.setVapidDetails('https://bankcal.vercel.app', pub, priv)
  const out = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload, { TTL: 12 * 3600, urgency: 'normal' })))
  return res.json({ sent: out.filter((x) => x.status === 'fulfilled').length })
}
