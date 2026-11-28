// Vercel serverless function: the owners' view of who uses BankCal, and removing people.
//   POST /api/admin { action: 'me' | 'list' | 'remove' | 'block' | 'unblock', uid }
// Only the Google accounts named in OWNER_EMAILS may use it; everyone else gets "not an owner".
// Works through the Firebase service account (FIREBASE_SERVICE_ACCOUNT, saved in Vercel as Secret).
//   remove  → deletes the person's data and their sign-in (they could sign up again from scratch)
//   block   → deletes the person's data and switches their sign-in off (they can't come back)
//   unblock → switches a blocked sign-in back on
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from 'jose'

const PROJECT = 'bankcal-2d763'
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const IDT = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`
export const ownersOf = (env) => String(env || '').toLowerCase().split(/[\s,;]+/).filter(Boolean)

async function accessToken(sa) {
  const key = await importPKCS8(sa.private_key, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/cloud-platform' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email).setSubject(sa.client_email).setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now).setExpirationTime(now + 600).sign(key)
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('Could not sign in with the service account.')
  return j.access_token
}

// Everyone with a sign-in, newest first, with the name they chose in the app
export async function listPeople(call, owners) {
  const users = []
  let page = ''
  for (let i = 0; i < 10; i++) {
    const j = await call(`${IDT}/accounts:batchGet?maxResults=500${page ? `&nextPageToken=${encodeURIComponent(page)}` : ''}`)
    users.push(...(j.users ?? []))
    if (!(page = j.nextPageToken)) break
  }
  const names = {}
  let next = ''
  for (let i = 0; i < 10; i++) {
    const j = await call(`${FS}/users?pageSize=300&mask.fieldPaths=name${next ? `&pageToken=${encodeURIComponent(next)}` : ''}`)
    for (const d of j.documents ?? []) names[d.name.split('/').pop()] = d.fields?.name?.stringValue ?? ''
    if (!(next = j.nextPageToken)) break
  }
  return users.map((u) => ({
    uid: u.localId, email: u.email ?? '', name: names[u.localId] || u.displayName || '',
    joined: Number(u.createdAt) || 0, seen: Number(u.lastLoginAt) || 0,
    blocked: u.disabled === true, owner: owners.includes(String(u.email || '').toLowerCase()), setUp: u.localId in names,
  })).sort((a, b) => b.joined - a.joined)
}

// Delete everything a person stored: every entry, their profile and what they shared
export async function wipePerson(call, uid) {
  for (let i = 0; i < 40; i++) {
    const j = await call(`${FS}/users/${uid}/entries?pageSize=300&mask.fieldPaths=day`)
    const docs = j.documents ?? []
    if (!docs.length) break
    await call(`${FS}:commit`, { writes: docs.map((d) => ({ delete: d.name })) })
  }
  await call(`${FS}:commit`, { writes: [{ delete: `projects/${PROJECT}/databases/(default)/documents/users/${uid}` }, { delete: `projects/${PROJECT}/databases/(default)/documents/shares/${uid}` }] })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })
  res.setHeader('Cache-Control', 'no-store')
  let me, email
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT })
    me = payload.sub
    email = payload.email_verified ? String(payload.email || '').toLowerCase() : ''
  } catch {
    return res.status(401).json({ error: 'Please sign in again.' })
  }
  const owners = ownersOf(process.env.OWNER_EMAILS)
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const owner = !!email && owners.includes(email)
  if (body.action === 'me') return res.json({ owner })
  if (!owner) return res.status(403).json({ error: 'Only the owners can manage users.' })

  let sa
  try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null') } catch { sa = null }
  if (!sa?.private_key) return res.status(503).json({ error: 'The server is missing FIREBASE_SERVICE_ACCOUNT. Add it in Vercel (as Secret), then redeploy.' })
  try {
    const at = await accessToken(sa)
    const call = async (url, post) => {
      const r = await fetch(url, { method: post ? 'POST' : 'GET', headers: { authorization: `Bearer ${at}`, ...(post ? { 'content-type': 'application/json' } : {}) }, body: post ? JSON.stringify(post) : undefined, signal: AbortSignal.timeout(20000) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw Object.assign(new Error(j.error?.message || `Google said ${r.status}`), { status: 502 })
      return j
    }
    if (body.action === 'list') return res.json({ people: await listPeople(call, owners), me })

    const uid = String(body.uid || '')
    if (!/^[A-Za-z0-9]{10,64}$/.test(uid)) return res.status(400).json({ error: 'Unknown person.' })
    const target = (await call(`${IDT}/accounts:lookup`, { localId: [uid] })).users?.[0]
    if (!target) return res.status(404).json({ error: 'That account no longer exists.' })
    if (uid === me || owners.includes(String(target.email || '').toLowerCase())) return res.status(400).json({ error: 'Owners can’t be removed here.' })

    if (body.action === 'unblock') { await call(`${IDT}/accounts:update`, { localId: uid, disableUser: false }); return res.json({ ok: true }) }
    if (body.action === 'remove' || body.action === 'block') {
      // switch the sign-in off first, so nothing is written back while the data is deleted
      await call(`${IDT}/accounts:update`, { localId: uid, disableUser: true })
      await wipePerson(call, uid)
      if (body.action === 'remove') await call(`${IDT}/accounts:delete`, { localId: uid })
      return res.json({ ok: true })
    }
    return res.status(400).json({ error: 'Unknown request.' })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Something went wrong.' })
  }
}
