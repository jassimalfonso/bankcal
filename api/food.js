// Vercel serverless function: food search + photo → calories using Gemini.
// The Gemini key stays on the server (GEMINI_API_KEY env var). Only signed-in
// BankCal users (valid Firebase ID token) can call it, so the free quota isn't abused.
import { createRemoteJWKSet, jwtVerify } from 'jose'

const PROJECT = 'bankcal-2d763'
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
const MODELS = (process.env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-2.0-flash').split(',').map((s) => s.trim())

const CONTEXT = 'You are a nutrition assistant for people living in the UAE / GCC. Use typical portions served in UAE restaurants, cafeterias, supermarkets and homes (Arabic, Indian, Filipino and international food). Calories are kcal, integers.'

const PROMPTS = {
  photo: `${CONTEXT} Look at this meal photo. Identify each food, estimate its portion and calories. Return JSON exactly like {"name": "short name for the whole plate", "kcal": 0, "items": [{"name": "", "portion": "", "kcal": 0}], "confidence": "low|medium|high"}. If there is no food, return {"name": "", "kcal": 0, "items": [], "confidence": "low"}.`,
  search: (q) => `${CONTEXT} The user typed "${q}". List up to 6 common foods or dishes that match, each with a typical single-serving portion and its calories. Return JSON exactly like {"results": [{"name": "", "portion": "", "kcal": 0}]}.`,
}

async function callGemini(key, parts) {
  let last
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
    })
    if (r.status === 404) { last = `model ${model} not found`; continue }
    if (r.status === 429) throw Object.assign(new Error('Daily free limit reached. Try again later or type the calories.'), { status: 429 })
    if (!r.ok) throw Object.assign(new Error(`AI error ${r.status}`), { status: 502 })
    const j = await r.json()
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '{}'
    return JSON.parse(text)
  }
  throw Object.assign(new Error(last || 'No AI model available'), { status: 502 })
}

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
      const out = await callGemini(key, [{ text: PROMPTS.photo }, { inline_data: { mime_type: m[1], data: m[2] } }])
      return res.status(200).json(out)
    }
    if (body.mode === 'search') {
      const q = String(body.q || '').slice(0, 80).trim()
      if (q.length < 2) return res.status(400).json({ error: 'Type a little more.' })
      const out = await callGemini(key, [{ text: PROMPTS.search(q) }])
      return res.status(200).json(out)
    }
    return res.status(400).json({ error: 'Unknown request.' })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Something went wrong.' })
  }
}
