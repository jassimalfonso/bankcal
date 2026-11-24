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
  photo: `${CONTEXT} Look at this photo. It may be a plate of food, a drink, or a packet / product. If a nutrition label or calorie number is printed on the packaging (in any language, e.g. Japanese, Arabic), read it and use the calories for the whole pack (or one serving if that is all that's shown), and name the product in English. Otherwise identify each food, estimate its portion and calories. Return JSON exactly like {"name": "short name for the whole plate", "kcal": 0, "items": [{"name": "", "portion": "", "kcal": 0}], "confidence": "low|medium|high"}. If a barcode is visible and the digits printed under it are readable, also return them as "barcode": "digits only". If there is no food, return {"name": "", "kcal": 0, "items": [], "confidence": "low"}.`,
  search: (q) => `${CONTEXT} The user typed "${q}" to log something they ate or drank. It may be a brand or chain item (Starbucks, Costa, Tim Hortons, McDonald's, KFC, Jollibee, supermarket products): for those, use the brand's published calories for that exact item, size and options (cup size, milk type, syrups, cream). List the best match first, then up to 3 close alternatives (other sizes, milk options or similar items). Names must include the brand, size and options. Portion: the serving, always with its weight in g (ml for drinks), e.g. "1 bowl (350 g)". Also give g (that weight or volume as a number) and per100 (kcal per 100 g or 100 ml of this food); kcal must equal g × per100 ÷ 100. If unclear, assume the most common UAE version. Also give each a type, cat: "meal" (a main dish or combo), "fruit" (fruit, vegetables, salads), "snack" (snacks, sweets, desserts, pastries), "drink" (any drink) or "side" (rice, bread, sauces, extras). Reply with JSON only, no explanation: {"results": [{"name": "", "portion": "", "g": 0, "per100": 0, "kcal": 0, "cat": "meal"}]}.`,
  // asked for only when someone taps "More options": the wider set of things they might mean
  more: (q, have) => `${CONTEXT} The user is logging "${q}" and wants more options than: ${have || 'none yet'}. List 6 to 8 other versions someone in the UAE might mean, none of them repeating that list: other sizes (small, regular, large), how it is cooked or served (fried, grilled, with rice, with sauce), and versions from well-known restaurants, chains or supermarket brands (use their published calories). Names must say what makes each different. Portion: the serving, always with its weight in g (ml for drinks). Also give g (that number), per100 (kcal per 100 g or 100 ml; kcal must equal g × per100 ÷ 100), cat ("meal", "fruit", "snack", "drink" or "side") and group: "size", "style" or "brand". Reply with JSON only: {"results": [{"name": "", "portion": "", "g": 0, "per100": 0, "kcal": 0, "cat": "meal", "group": "size"}]}.`,
  exercise: (q) => `You are a fitness assistant. The user typed "${q}" to log an exercise or physical activity they did. Return JSON exactly like {"results": [{"name": "", "emoji": "", "kind": "reps|time|minutes", "met": 0, "weighted": false, "each": false, "kcal": 0}]}. Best match first, then up to 3 close variations. name: short, in English, capitalised. emoji: one fitting emoji. kind: "reps" for strength moves counted in repetitions, "time" for holds counted in seconds (plank, wall sit), "minutes" for continuous activities (sports, cardio, classes, dancing, housework). met: the MET value while doing it, from the Compendium of Physical Activities. weighted: true if it normally uses dumbbells, a barbell, a kettlebell or a machine load. each: true if it is done one side at a time. kcal: calories a 70 kg person burns doing it for 10 minutes. If it is not a physical activity, return {"results": []}.`,
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
  const useful = out && ((Array.isArray(out.results) && out.results.some((x) => x?.name && Number.isFinite(Number(x.kcal)))) || Number.isFinite(Number(out.kcal)))
  if (useful) return { out }
  // a readable answer with nothing in it ("no such food"): one more model gets a go, then it's accepted
  if (out && Array.isArray(out.results)) return { empty: true, out }
  return { overloaded: true } // unreadable: retry
}

// `hint` = the model and thinking setting that worked last time on this phone. The function
// goes to sleep between uses (there are only a few users), so without the hint every search
// would spend a second or two re-learning which setting the model accepts.
async function callGemini(key, parts, kind, hint) {
  const tried = new Set()
  let busy = false
  let empties = 0
  let emptyOut = null
  if (!good[kind] && hint && /^gemini-[\w.-]+$/.test(hint.model || '') && THINKING[hint.x]) good[kind] = { model: hint.model, extra: THINKING[hint.x] }
  const signal = AbortSignal.timeout(kind === 'photo' ? 45000 : 12000)
  const attempt = async (model, known) => {
    if (!model || tried.has(model)) return null
    tried.add(model)
    for (const extra of known ? [known, ...THINKING.filter((t) => t !== known)] : THINKING) {
      let r = await ask(key, model, parts, extra, signal)
      if (r.overloaded) { await new Promise((ok) => setTimeout(ok, 700)); r = await ask(key, model, parts, extra, signal) } // one quick retry
      if (r.overloaded) break // try another model
      if (r.rejected) continue
      if (r.busy) { busy = true; return null }
      if (r.gone) break
      good[kind] = { model, extra }
      if (r.empty) { empties++; emptyOut = r.out; return null }
      return r.out
    }
    if (good[kind]?.model === model) good[kind] = null
    return null
  }
  try {
    // Start the preferred model. If it hasn't answered after a few seconds, start the other
    // one too and use whichever answers first. Typed searches prefer the quick "lite" model
    // (the full one joins after 3 s); photos prefer the full model (lite joins after 8 s).
    const lite = 'gemini-flash-lite-latest'
    const full = 'gemini-flash-latest'
    const first = good[kind]?.model ?? OVERRIDE[0] ?? (kind === 'photo' ? full : lite)
    const second = first === full ? lite : full
    const known = good[kind]?.model === first ? good[kind].extra : undefined
    const out = await new Promise((resolve) => {
      let done = false
      let left = 2
      let started = false
      let t = null
      const fin = (o) => { if (done) return; if (o) { done = true; resolve(o) } else if (--left === 0) { done = true; resolve(null) } }
      const startSecond = () => { if (started) return; started = true; clearTimeout(t); if (!done) attempt(second).then(fin, () => fin(null)) }
      t = setTimeout(startSecond, kind === 'photo' ? 8000 : 3000)
      // if the first one fails before the timer, the second starts straight away
      attempt(first, known).then((o) => { if (!o) startSecond(); fin(o) }, () => { startSecond(); fin(null) })
    })
    if (out) return out
    if (emptyOut && tried.has(first) && tried.has(second)) return emptyOut // two models agree there's nothing
    for (const m of [...OVERRIDE, lite, full]) { const o = await attempt(m); if (o) return o }
    if (emptyOut) return emptyOut
    const found = await discover(key)
    const ordered = kind === 'photo' ? found : [...found.filter((m) => /lite/.test(m)), ...found.filter((m) => !/lite/.test(m))]
    for (const m of ordered.slice(0, 6)) { const o = await attempt(m); if (o) return o; if (emptyOut) return emptyOut }
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') throw Object.assign(new Error('The online search is taking too long. Try again, or type the calories.'), { status: 504 })
    throw e
  }
  if (busy) throw Object.assign(new Error('Today’s free online searches are used up. Try again later, or type the calories.'), { status: 429 })
  throw Object.assign(new Error('Online food search isn’t available right now. Type the calories for now.'), { status: 502 })
}

export { callGemini as _callGemini } // for tests

const txt = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').trim()
const CATS = ['meal', 'fruit', 'snack', 'drink', 'side']
// Tidy what the model returned, and check each answer against itself: the weight and the kcal per
// 100 g are facts models know better than a plate's total, so when weight × per-100 disagrees with
// the total by a lot, the total is recomputed from them.
export function tidyFoods(list, limit = 6) {
  return (Array.isArray(list) ? list : []).map((x) => {
    let kcal = Math.round(Number(x?.kcal))
    const g = Number(x?.g), per100 = Number(x?.per100)
    const checked = g > 0 && g < 3000 && per100 > 0 && per100 <= 900
    if (checked) {
      const calc = Math.round(g * per100 / 100)
      if (!Number.isFinite(kcal) || Math.abs(calc - kcal) > Math.max(40, kcal * 0.25)) kcal = calc
    }
    let portion = txt(x?.portion).slice(0, 60)
    if (checked && !/\d\s*(g|ml|kg|l)\b/i.test(portion)) portion = `${portion || '1 serving'} (${Math.round(g)} ${x?.cat === 'drink' ? 'ml' : 'g'})`.slice(0, 60)
    return { name: txt(x?.name).slice(0, 120), portion, kcal, ...(CATS.includes(x?.cat) ? { cat: x.cat } : {}), ...(checked ? { per100: Math.round(per100) } : {}), ...(['size', 'style', 'brand'].includes(x?.group) ? { group: x.group } : {}) }
  }).filter((x) => x.name && Number.isFinite(x.kcal) && x.kcal >= 0 && x.kcal < 6000).slice(0, limit)
}

// A packaged product by its barcode, from Open Food Facts (free, community-run). Returns the
// amounts someone might log: one serving, the whole pack, and 100 g.
export async function barcodeFoods(code, fetcher = fetch) {
  if (!/^\d{8,14}$/.test(code)) return []
  const r = await fetcher(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,quantity,product_quantity`, {
    headers: { 'user-agent': 'BankCal/1.0 (https://bankcal.vercel.app)' }, signal: AbortSignal.timeout(6000),
  })
  if (!r.ok) return []
  const j = await r.json().catch(() => null)
  const p = j?.product
  if (!p || j.status === 0) return []
  const n = p.nutriments || {}
  const kj = (v) => (Number(v) > 0 ? Number(v) / 4.184 : NaN)
  const per100 = Number(n['energy-kcal_100g']) >= 0 && n['energy-kcal_100g'] !== '' && n['energy-kcal_100g'] != null ? Number(n['energy-kcal_100g']) : kj(n['energy_100g'])
  const perServing = Number(n['energy-kcal_serving']) > 0 ? Number(n['energy-kcal_serving']) : kj(n['energy_serving'])
  const brand = txt(p.brands).split(',')[0].trim()
  const title = txt(p.product_name_en) || txt(p.product_name)
  if (!title && !brand) return []
  const name = (brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${title}` : title || brand).slice(0, 110)
  const drink = /\b(ml|cl|l)\b/i.test(`${p.quantity || ''} ${p.serving_size || ''}`)
  const unit = drink ? 'ml' : 'g'
  const out = []
  const servingQ = Number(p.serving_quantity)
  const serving = Number.isFinite(perServing) ? perServing : (servingQ > 0 && Number.isFinite(per100) ? per100 * servingQ / 100 : NaN)
  if (Number.isFinite(serving)) out.push({ name, portion: `1 serving${p.serving_size ? ` (${txt(p.serving_size).slice(0, 30)})` : ''}`, kcal: Math.round(serving) })
  const packQ = Number(p.product_quantity)
  if (Number.isFinite(per100) && packQ > 0 && packQ <= 3000 && Math.round(per100 * packQ / 100) !== Math.round(serving)) out.push({ name, portion: `whole pack (${txt(p.quantity).slice(0, 20) || `${packQ} ${unit}`})`, kcal: Math.round(per100 * packQ / 100) })
  if (Number.isFinite(per100)) out.push({ name, portion: `100 ${unit}`, kcal: Math.round(per100) })
  return out.filter((x) => x.kcal >= 0 && x.kcal < 6000).map((x) => ({ ...x, ...(Number.isFinite(per100) ? { per100: Math.round(per100) } : {}), ...(drink ? { cat: 'drink' } : {}), barcode: true }))
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
  const t0 = Date.now()
  // which model answered and how long it took, so the phone can skip the warm-up next time
  const via = (kind) => ({ model: good[kind]?.model ?? '', x: Math.max(0, THINKING.indexOf(good[kind]?.extra)), ms: Date.now() - t0 })
  try {
    // "warm": the app calls this when the food sheet opens, so the function is awake
    // (and its sign-in keys loaded) by the time a search is typed
    if (body.mode === 'warm') {
      await Promise.race([discover(key).catch(() => {}), new Promise((ok) => setTimeout(ok, 1500))])
      return res.status(204).end()
    }
    if (body.mode === 'photo') {
      const m = /^data:(image\/\w+);base64,(.+)$/.exec(body.image || '')
      if (!m) return res.status(400).json({ error: 'No photo received.' })
      const out = await callGemini(key, [{ text: PROMPTS.photo }, { inline_data: { mime_type: m[1], data: m[2] } }], 'photo', body.hint)
      // a readable barcode in the photo: the product's own numbers beat an estimate
      const code = txt(out?.barcode).replace(/\D/g, '')
      const pack = code ? await barcodeFoods(code).catch(() => []) : []
      return res.status(200).json({ ...out, ...(pack.length ? { pack } : {}), via: via('photo') })
    }
    if (body.mode === 'search') {
      const q = String(body.q || '').replace(/["\\\n\r]/g, ' ').slice(0, 80).trim()
      if (q.length < 2) return res.status(400).json({ error: 'Type a little more.' })
      const raw = await callGemini(key, [{ text: PROMPTS.search(q) }], 'search', body.hint)
      const out = { results: tidyFoods(raw?.results), via: via('search') }
      res.setHeader('Cache-Control', 'private, max-age=3600')
      return res.status(200).json(out)
    }
    // "More options": the wider set, only when asked for
    if (body.mode === 'more') {
      const q = String(body.q || '').replace(/["\\\n\r]/g, ' ').slice(0, 80).trim()
      if (q.length < 2) return res.status(400).json({ error: 'Type a little more.' })
      const have = (Array.isArray(body.have) ? body.have : []).slice(0, 8).map((x) => txt(x).replace(/["\\\n\r]/g, ' ').slice(0, 60)).filter(Boolean).join('; ')
      const raw = await callGemini(key, [{ text: PROMPTS.more(q, have) }], 'search', body.hint)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      return res.status(200).json({ results: tidyFoods(raw?.results, 8), via: via('search') })
    }
    // a packaged product by barcode (Open Food Facts)
    if (body.mode === 'barcode') {
      const results = await barcodeFoods(txt(body.code).replace(/\D/g, '')).catch(() => [])
      return res.status(200).json({ results })
    }
    // look up an exercise or activity that isn't in the app's own list
    if (body.mode === 'exercise') {
      const q = String(body.q || '').replace(/["\\\n\r]/g, ' ').slice(0, 60).trim()
      if (q.length < 3) return res.status(400).json({ error: 'Type a little more.' })
      const raw = await callGemini(key, [{ text: PROMPTS.exercise(q) }], 'search', body.hint)
      const txt = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').trim()
      const out = { results: (Array.isArray(raw?.results) ? raw.results : [])
        .map((x) => ({ name: txt(x?.name).slice(0, 60), emoji: txt(x?.emoji).slice(0, 8), kind: ['reps', 'time', 'minutes'].includes(x?.kind) ? x.kind : 'minutes', met: Math.round(Number(x?.met) * 10) / 10, weighted: x?.weighted === true, each: x?.each === true }))
        .filter((x) => x.name && x.met >= 1.5 && x.met <= 16).slice(0, 4), via: via('search') }
      res.setHeader('Cache-Control', 'private, max-age=3600')
      return res.status(200).json(out)
    }
    return res.status(400).json({ error: 'Unknown request.' })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Something went wrong.' })
  }
}
