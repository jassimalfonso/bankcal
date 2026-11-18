// Vercel serverless function: food search + photo → calories using Gemini.
// The Gemini key stays on the server (GEMINI_API_KEY env var). Only signed-in
// BankCal users (valid Firebase ID token) can call it, so the free quota isn't abused.
import { createRemoteJWKSet, jwtVerify } from 'jose'

const PROJECT = 'bankcal-2d763'
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
// Google retires Gemini model names every few months (2.0 Flash and 2.5 Flash are both gone),
// so nothing is hard-coded: we try an optional override, then Google's "latest" alias, then
// whatever current Flash models the API itself lists for this key.
const OVERRIDE = (process.env.GEMINI_MODEL || '').split(',').map((s) => s.trim()).filter(Boolean)
const API = 'https://generativelanguage.googleapis.com/v1beta'
// photos can take a while; let the function run long enough (Vercel)
export const config = { maxDuration: 60 }
let cache = { at: 0, models: [] } // discovered models, kept for an hour while the function stays warm
// What last worked, remembered separately for typed searches (speed first) and photos (accuracy first)
const good = { search: null, photo: null }
// Newer Flash models "think" before answering, which adds seconds. A calorie lookup doesn't need it,
// so we ask for the least thinking the model allows. The setting's name differs between model
// generations, so each is tried once and the one that's accepted is remembered.
const THINKING = [{ thinkingConfig: { thinkingLevel: 'minimal' } }, { thinkingConfig: { thinkingBudget: 0 } }, {}]

async function discover(key) {
  if (Date.now() - cache.at < 3600e3 && cache.models.length) return cache.models
  const r = await fetch(`${API}/models?pageSize=200&key=${key}`)
  if (!r.ok) return []
  const j = await r.json()
  const ver = (n) => parseFloat((/gemini-(\d+(?:\.\d+)?)/.exec(n) || [])[1] || '0')
  const models = (j.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-.*flash/.test(n) && !/image|tts|audio|live|embedding|computer|robot/.test(n))
    // newest stable full Flash first, then previews, then the lighter "lite" models
    .sort((x, y) => (/lite/.test(x) - /lite/.test(y)) || (/preview|exp/.test(x) - /preview|exp/.test(y)) || ver(y) - ver(x) || x.length - y.length)
  cache = { at: Date.now(), models }
  return models
}

const CONTEXT = 'You are a nutrition assistant for people living in the UAE / GCC. Use typical portions served in UAE restaurants, cafeterias, supermarkets and homes (Arabic, Indian, Filipino and international food). Calories are kcal, integers.'

const PROMPTS = {
  photo: `${CONTEXT} Look at this photo. It may be a plate of food, a drink, or a packet / product. If a nutrition label or calorie number is printed on the packaging (in any language, e.g. Japanese, Arabic), read it and use the calories for the whole pack (or one serving if that is all that's shown), and name the product in English. Otherwise identify each food, estimate its portion and calories. Return JSON exactly like {"name": "short name for the whole plate", "kcal": 0, "items": [{"name": "", "portion": "", "kcal": 0}], "confidence": "low|medium|high"}. If there is no food, return {"name": "", "kcal": 0, "items": [], "confidence": "low"}.`,
  search: (q) => `${CONTEXT} The user typed "${q}" to log something they ate or drank. It may be a brand or chain item (Starbucks, Costa, Tim Hortons, McDonald's, KFC, Jollibee, supermarket products): for those, use the brand's published calories for that exact item, size and options (cup size, milk type, syrups, cream). List the best match first, then up to 3 close alternatives (other sizes, milk options or similar items). Names must include the brand, size and options. Portion: the serving, with ml for drinks. If unclear, assume the most common UAE version. Reply with JSON only, no explanation: {"results": [{"name": "", "portion": "", "kcal": 0}]}.`,
}

async function ask(key, model, parts, extra, signal) {
  const r = await fetch(`${API}/models/${model}:generateContent?key=${key}`, {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2, ...extra } }),
  })
  if (r.status === 404) return { gone: true } // retired model: try the next one
  if (r.status === 400) return { rejected: true } // this model doesn't accept that setting
  if (r.status === 429) return { busy: true }
  if (r.status >= 500) return { overloaded: true } // Google's side is busy: retry, then try another model
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('Online search isn’t set up correctly on the server.'), { status: 502 })
  if (!r.ok) return { overloaded: true }
  const j = await r.json().catch(() => ({}))
  const text = j.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? ''
  let out = null
  try { out = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim()) } catch { /* not JSON */ }
  // an empty or unreadable answer counts as a miss, so the next model gets a go
  const useful = out && ((Array.isArray(out.results) && out.results.some((x) => x?.name && Number.isFinite(Number(x.kcal)))) || Number.isFinite(Number(out.kcal)))
  return useful ? { out } : { overloaded: true }
}

async function callGemini(key, parts, kind) {
  const tried = new Set()
  let busy = false
  const signal = AbortSignal.timeout(kind === 'photo' ? 45000 : 12000)
  const attempt = async (model, known) => {
    if (!model || tried.has(model)) return null
    tried.add(model)
    for (const extra of known ? [known] : THINKING) {
      let r = await ask(key, model, parts, extra, signal)
      if (r.overloaded) { await new Promise((ok) => setTimeout(ok, 700)); r = await ask(key, model, parts, extra, signal) } // one quick retry
      if (r.overloaded) break // try another model
      if (r.rejected) continue
      if (r.busy) { busy = true; return null }
      if (r.gone) break
      good[kind] = { model, extra }
      return r.out
    }
    if (good[kind]?.model === model) good[kind] = null
    return null
  }
  try {
    // Photos: start the full model; if it hasn't answered in 8 s, start the quicker "lite"
    // model too, and use whichever answers first.
    if (kind === 'photo') {
      let done = false
      const first = good.photo?.model ?? 'gemini-flash-latest'
      const lite = 'gemini-flash-lite-latest'
      const out = await new Promise((resolve) => {
        let left = 2
        const fin = (o) => { if (o && !done) { done = true; resolve(o) } else if (--left === 0 && !done) resolve(null) }
        attempt(first, good.photo?.model === first ? good.photo.extra : undefined).then(fin, () => fin(null))
        setTimeout(() => { if (done) return fin(null); attempt(lite).then(fin, () => fin(null)) }, 8000)
      })
      done = true
      if (out) return out
    }
    if (good[kind]) { const out = await attempt(good[kind].model, good[kind].extra); if (out) return out }
    // typed searches use the lighter, faster models first; photos use the full model first
    const alias = kind === 'photo' ? ['gemini-flash-latest'] : ['gemini-flash-lite-latest', 'gemini-flash-latest']
    for (const m of [...OVERRIDE, ...alias]) { const out = await attempt(m); if (out) return out }
    const found = await discover(key)
    const ordered = kind === 'photo' ? found : [...found.filter((m) => /lite/.test(m)), ...found.filter((m) => !/lite/.test(m))]
    for (const m of ordered.slice(0, 6)) { const out = await attempt(m); if (out) return out }
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') throw Object.assign(new Error('The online search is taking too long. Try again, or type the calories.'), { status: 504 })
    throw e
  }
  if (busy) throw Object.assign(new Error('Today’s free online searches are used up. Try again later, or type the calories.'), { status: 429 })
  throw Object.assign(new Error('Online food search isn’t available right now. Type the calories for now.'), { status: 502 })
}

export { callGemini as _callGemini } // for tests
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' })
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT })
  } catch {
    return res.status(401).json({ error: 'Please sign in again.' })
  }
  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server.' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  try {
    if (body.mode === 'photo') {
      const m = /^data:(image\/\w+);base64,(.+)$/.exec(body.image || '')
      if (!m) return res.status(400).json({ error: 'No photo received.' })
      const out = await callGemini(key, [{ text: PROMPTS.photo }, { inline_data: { mime_type: m[1], data: m[2] } }], 'photo')
      return res.status(200).json(out)
    }
    if (body.mode === 'search') {
      const q = String(body.q || '').slice(0, 80).trim()
      if (q.length < 2) return res.status(400).json({ error: 'Type a little more.' })
      const raw = await callGemini(key, [{ text: PROMPTS.search(q) }], 'search')
      const txt = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').trim()
      const out = { results: (Array.isArray(raw?.results) ? raw.results : [])
        .map((x) => ({ name: txt(x?.name).slice(0, 120), portion: txt(x?.portion).slice(0, 60), kcal: Math.round(Number(x?.kcal)) }))
        .filter((x) => x.name && Number.isFinite(x.kcal) && x.kcal >= 0 && x.kcal < 6000).slice(0, 6) }
      res.setHeader('Cache-Control', 'private, max-age=3600')
      return res.status(200).json(out)
    }
    return res.status(400).json({ error: 'Unknown request.' })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Something went wrong.' })
  }
}
