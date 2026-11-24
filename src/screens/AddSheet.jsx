import { useEffect, useMemo, useRef, useState } from 'react'
import { CATS, catById, catOf, keyOf as catKey } from '../foodCats'
import { compressPhoto } from '../store'
import { fmt, mealFor } from '../calc'
import { searchFoods } from '../foods'
import { askFood, cleanFoods, warmFood } from '../ai'
import { shareLookups } from '../partner'
import { matchFoods } from '../foods'
import { IconCamera, IconClose } from '../icons'
import { useEscape } from '../motion'
import { useSheetDrag } from '../motion'
import { HoldButton, useRepeat } from '../Hold'
import { FOODS } from '../foods'
import { firstTime } from '../keyboard'

// Online answers are kept on this phone for two months, so a food looked up once comes back instantly,
// and every food found online also shows up in the instant suggestions from then on.
const CACHE_KEY = 'bankcal:online-foods'
const onlineCache = new Map()
try {
  for (const [k, v, at, theirs] of JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')) if (Date.now() - at < 60 * 864e5) onlineCache.set(k, Object.assign(v, { at, ...(theirs ? { theirs: true } : {}) }))
} catch { /* start empty */ }
function keepOnline(k, found) {
  onlineCache.set(k, Object.assign(found, { at: Date.now() }))
  if (!found.length) return // "nothing found" is only remembered until the app is closed
  const all = [...onlineCache].filter(([, v]) => v.length).sort((a, b) => b[1].at - a[1].at)
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(all.slice(0, 200).map(([key, v]) => [key, [...v], v.at, v.theirs ? 1 : 0]))) } catch { /* full: fine */ }
  // my own lookups go to my partner too (theirs aren't sent back)
  shareLookups(all.filter(([, v]) => !v.theirs).map(([key, v]) => [key, [...v], v.at]))
}
// What my partner has looked up online: remembered here as if I had, so it shows instantly
function takeLookups(list) {
  let added = false
  for (const l of Array.isArray(list) ? list : []) {
    const k = String(l?.q ?? '').toLowerCase()
    const r = cleanFoods(l?.r, 8)
    if (!k || !r.length || !(Date.now() - l.at < 60 * 864e5)) continue
    const mine = onlineCache.get(k)
    if (mine && (mine.length || 0) > 0 && (mine.at ?? 0) >= l.at) continue
    onlineCache.set(k, Object.assign(r, { at: l.at, theirs: true })); added = true
  }
  if (added) try { localStorage.setItem(CACHE_KEY, JSON.stringify([...onlineCache].filter(([, v]) => v.length).sort((a, b) => b[1].at - a[1].at).slice(0, 200).map(([key, v]) => [key, [...v], v.at, v.theirs ? 1 : 0]))) } catch { /* full: fine */ }
}

// Foods found online before that match what's being typed (every typed word starts a word in the name)
const words = (t) => t.toLowerCase().replace(/['’]/g, '').split(/[^a-z0-9]+/).filter(Boolean)
function seenOnline(q, limit = 4) {
  const qs = words(q)
  if (!qs.length) return []
  const out = new Map()
  for (const [, list] of [...onlineCache].sort((a, b) => b[1].at - a[1].at)) {
    for (const f of list) {
      const ws = words(f.name)
      if (qs.every((w) => ws.some((x) => x.startsWith(w))) && !out.has(f.name.toLowerCase())) out.set(f.name.toLowerCase(), { name: f.name, kcal: f.kcal, portion: f.portion || 'found online', seen: true, ...(f.cat ? { cat: f.cat } : {}), ...(f.per100 ? { per100: f.per100 } : {}) })
      if (out.size >= limit) return [...out.values()]
    }
  }
  return [...out.values()]
}

export default function AddSheet({ notify, partner, mine, todays, budget, onClose, onSave, onRemove, editing, peek, forDay, today, profile, updateProfile }) {
  const myFoods = profile?.myFoods ?? []
  const [keep, setKeep] = useState(false)
  const [editMine, setEditMine] = useState(false)
  // Food types: a filter for the lists, and your own fixes (saved by name, so they apply everywhere)
  const cats = profile?.foodCats ?? {}
  const [filter, setFilter] = useState(null)
  const [fixCats, setFixCats] = useState(false)
  const typeOf = (f) => catOf(f, cats)
  const fits = (f) => !filter || fixCats || typeOf(f) === filter
  const nextCat = (f) => {
    const now = typeOf(f)
    const next = CATS[(CATS.findIndex((c) => c.id === now) + 1) % CATS.length].id
    updateProfile({ foodCats: { ...cats, [catKey(f.name)]: next } })
  }
  // Saved foods by type: one header per type, tap to open it
  const [openGroup, setOpenGroup] = useState({})
  const groups = (list, where, row) => {
    const by = CATS.map((c) => [c, list.filter((f) => typeOf(f) === c.id)]).filter(([, l]) => l.length)
    const first = by[0]?.[0].id
    return by.map(([c, l]) => {
      const k = `${where}:${c.id}`
      const isOpen = openGroup[k] ?? (by.length === 1 || c.id === first)
      return (
        <div key={c.id} className={`mf-group ${isOpen ? 'open' : ''}`}>
          <button className="mf-ghead" aria-expanded={isOpen} onClick={() => setOpenGroup((o) => ({ ...o, [k]: !isOpen }))}>
            <span>{c.e} {c.label}</span><small>{l.length}</small><span className={`chev ${isOpen ? 'up' : ''}`}>⌄</span>
          </button>
          {isOpen && l.map(row)}
        </div>
      )
    })
  }
  // the type badge: a button while fixing types, otherwise just a little emoji
  const Badge = ({ f }) => fixCats
    ? <span role="button" tabIndex={0} className="cat-fix" onClick={(e) => { e.stopPropagation(); nextCat(f) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); nextCat(f) } }} aria-label={`${f.name} is ${catById[typeOf(f)].label}. Tap to change`}>{catById[typeOf(f)].e} {catById[typeOf(f)].label}</span>
    : <span className="cat-e" aria-hidden="true">{catById[typeOf(f)].e}</span>
  // My foods: rename, change kcal, or remove (with Undo). Tapping a food in Edit opens it, never deletes it.
  const [fixing, setFixing] = useState(null) // { id, name, kcal }
  const removeMine = (id) => {
    const before = myFoods
    const f = myFoods.find((x) => x.id === id)
    updateProfile({ myFoods: myFoods.filter((x) => x.id !== id) })
    setFixing(null)
    notify?.(`Removed ${f?.name ?? 'food'}`, () => updateProfile({ myFoods: before }))
  }
  const saveMine = () => {
    const nm = fixing.name.trim(), kc = Math.max(0, parseInt(fixing.kcal, 10) || 0)
    if (!nm) return
    updateProfile({ myFoods: myFoods.map((x) => { if (x.id !== fixing.id) return x; const { serving: _old, ...rest } = x; const sv = (fixing.serving ?? '').trim().slice(0, 30); return { ...rest, name: nm.slice(0, 120), kcal: kc, ...(sv ? { serving: sv } : {}) } }) })
    setFixing(null)
    notify?.(`Saved ${nm}`)
  }
  // what your partner has looked up online is ready here too
  useEffect(() => { for (const id of partner?.partners ?? []) takeLookups(partner.shares?.[id]?.lookups) }, [partner?.shares, partner?.partners])
  // Your partner's saved foods (the ones you haven't saved yourself), ready to use
  const builtIn = useMemo(() => new Map(FOODS.map((f) => [words(String(f.name)).join(' '), f])), [])
  const theirs = useMemo(() => {
    const key = (n) => words(String(n)).join(' ') // "Max’s" and "Max's" count as the same food
    const have = new Set(myFoods.map((f) => key(f.name)))
    const out = []
    for (const id of partner?.partners ?? []) {
      const sh = partner.shares?.[id]
      for (const f of sh?.foods ?? []) {
        const k = key(f.name)
        if (!f.name || have.has(k) || !(f.kcal >= 0)) continue
        const listed = builtIn.get(k)
        const full = f.full > 0 ? f.full : listed?.kcal
        have.add(k); out.push({ id: `p-${id}-${k}`, name: f.name, kcal: f.kcal, cat: f.cat, serving: f.serving, portion: `${sh.name}’s food`, from: sh.name,
          ...(f.full > 0 && Math.abs(f.full - f.kcal) < 5 ? { whole: true } : {}),
          ...(full > 0 && Math.abs(full - f.kcal) >= 5 ? { full, ...(f.full > 0 ? {} : { listed: true, fullPortion: listed?.portion ?? '' }) } : {}) })
      }
    }
    return out
  }, [partner?.shares, partner?.partners, myFoods])
  const [photo, setPhoto] = useState(editing?.photo ?? null)
  const [name, setName] = useState(editing?.name ?? '')
  const [kcal, setKcal] = useState(editing ? String(editing.kcal) : '')
  // the portion this is for, in your own words: "1 pc", "1 cup", "100 g"
  const [serving, setServing] = useState(editing?.serving ?? '')
  const realPortion = (x) => (x && !['my food', 'your usual', 'found online'].includes(x) && !/’s food$/.test(x) ? String(x).slice(0, 30) : '')
  const [picked, setPicked] = useState(!!editing)
  // Quantity of an item already logged ("Black coffee ×2"): changing it scales the calories
  const qtyOf = (nm) => +(String(nm).match(/\s×(\d+)$/)?.[1] ?? 1)
  const baseName = (nm) => String(nm).replace(/\s×\d+$/, '')
  const [qty, setQtyRaw] = useState(editing ? qtyOf(editing.name) : 1)
  const setQty = (q) => {
    const per = (+kcal || 0) / qty
    setQtyRaw(q)
    setKcal(String(Math.round(per * q)))
    setName((nm) => (q > 1 ? `${baseName(nm)} ×${q}` : baseName(nm)))
  } // hide suggestions after choosing one
  const [ai, setAi] = useState({ busy: false, err: '', results: null, items: null, confidence: '' })
  const fileRef = useRef(null)
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const [meal, setMeal] = useState(editing?.meal ?? (forDay && forDay !== today ? 'Lunch' : mealFor()))
  const inputRef = useRef(null)
  // the name box grows with the text (for phones that can't size it themselves)
  useEffect(() => { const el = inputRef.current; if (!el || CSS.supports?.('field-sizing', 'content')) return; el.style.height = 'auto'; el.style.height = `${Math.min(140, el.scrollHeight + 4)}px` }, [name])
  useEffect(() => { warmFood() }, []) // wake the online search while the person is still typing

  // Keep the sheet inside the part of the screen the keyboard leaves visible (iPhone),
  // so the results under the search box are never hidden behind the keyboard.
  const [view, setView] = useState(null)
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    const on = () => {
      const full = Math.max(document.documentElement.clientHeight, window.innerHeight)
      const kb = full - v.height > 120 // keyboard is up
      setView(kb ? { top: v.offsetTop, height: v.height } : null)
    }
    on()
    v.addEventListener('resize', on)
    v.addEventListener('scroll', on)
    return () => { v.removeEventListener('resize', on); v.removeEventListener('scroll', on) }
  }, [])
  // once the keyboard is up, bring the search box to the top of the sheet
  useEffect(() => {
    if (view && document.activeElement === inputRef.current) inputRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [view?.height]) // eslint-disable-line react-hooks/exhaustive-deps

  // One-tap repeats: last distinct foods this person logged.
  const recent = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const e of mine) {
      const k = e.name.trim().toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(e)
      if (out.length === 8) break
    }
    return out
  }, [mine])

  // Suggestions as you type: your own past foods first, then the built-in list.
  const suggestions = useMemo(() => {
    const t = name.trim().toLowerCase()
    if (picked || t.length < 2) return []
    const saved = myFoods.filter((f) => f.name.toLowerCase().includes(t)).map((f) => ({ name: f.name, kcal: f.kcal, portion: f.portion || 'my food', serving: f.serving }))
    const past = recent.filter((r) => r.name.toLowerCase().includes(t) && !saved.some((s) => s.name.toLowerCase() === r.name.toLowerCase())).map((r) => ({ name: r.name, kcal: r.kcal, portion: 'your usual' }))
    const qw = words(t)
    const shared = theirs.filter((f) => { const fw = words(f.name); return qw.every((w) => fw.some((x) => x.startsWith(w))) && !saved.some((o) => o.name.toLowerCase() === f.name.toLowerCase()) })
    const own = [...saved, ...shared.slice(0, 4), ...past.filter((r) => !shared.some((f) => f.name.toLowerCase() === r.name.toLowerCase()))]
    for (const f of seenOnline(name)) if (!own.some((o) => o.name.toLowerCase() === f.name.toLowerCase())) own.push(f)
    const built = searchFoods(name).filter((f) => !own.some((o) => o.name.toLowerCase() === f.name.toLowerCase()))
    return [...own, ...built].slice(0, 8)
  }, [name, recent, picked, myFoods, theirs])

  // when changing something already logged today, don't count the old number twice
  const spent = todays.reduce((a, e) => a + (e.id === editing?.id ? 0 : e.kcal), 0)
  const otherDay = (editing && editing.day && editing.day !== today) || (forDay && forDay !== today)
  const n = Math.max(0, parseInt(kcal, 10) || 0)
  const after = budget != null && !otherDay ? budget - spent - n : null
  const valid = name.trim() && String(kcal).trim() !== '' // 0 kcal is fine (water, black tea…)

  // a chosen food can be scaled: ½, 1, 1½, 2 or 3 portions
  const [base, setBase] = useState(null)
  const [mult, setMult] = useState(1)
  const base0 = useRef(0) // the kcal the chosen food came with, before any change
  function choose(f) {
    base0.current = f.kcal
    setName(f.name)
    setKcal(String(f.kcal))
    setPicked(true)
    setLook({ busy: false, msg: '' })
    setBase({ kcal: f.kcal, portion: f.portion, cat: f.cat, ...(f.per100 ? { per100: f.per100 } : {}), ...(f.from ? { from: f.from, own: f.kcal, serving: f.serving || realPortion(f.portion), whole: f.whole } : {}), ...(f.full > 0 && Math.abs(f.full - f.kcal) >= 5 ? { full: f.full, own: f.kcal, from: f.from, fullPortion: f.fullPortion, listed: f.listed, serving: f.serving || realPortion(f.portion) } : {}) })
    setServing(f.serving || realPortion(f.portion))
    setMult(1)
    setAi((a) => ({ ...a, results: null }))
    inputRef.current?.blur() // put the keyboard away so the amount and Spend are in view
  }
  const portion = (m) => { setMult(m); if (base) setKcal(String(Math.round(base.kcal * m))) }
  // a partner's food with no original on record: look up what a usual portion is online
  const [look, setLook] = useState({ busy: false, msg: '' })
  async function lookUp() {
    const q = baseName(name.trim())
    setLook({ busy: true, msg: '' })
    try {
      const k = q.toLowerCase()
      const found = onlineCache.get(k) ?? cleanFoods((await askFood({ mode: 'search', q })).results)
      const r = found[0]
      if (!r) { setLook({ busy: false, msg: 'Couldn’t find this one online.' }); return }
      if (Math.abs(r.kcal - base.own) < 5) { setLook({ busy: false, msg: `Online, a usual portion is about the same (${fmt(r.kcal)} kcal), so this looks like the full amount.` }); return }
      setBase((b) => ({ ...b, full: r.kcal, own: b.own ?? b.kcal, fullPortion: realPortion(r.portion), listed: true, looked: true }))
      setLook({ busy: false, msg: '' })
    } catch (e) { setLook({ busy: false, msg: e.message || 'Couldn’t look it up just now.' }) }
  }
  // a food someone cut down (or topped up): take their amount, or the food's full one
  const amount = (k) => { setBase((b) => ({ ...b, kcal: k })); setKcal(String(Math.round(k * mult))); setServing(k === base.full ? (base.fullPortion ?? '') : (base.serving ?? '')) } // their portion note belongs to their amount only

  const asked = useRef('')
  // "More options": other sizes, styles and brand versions, fetched only when asked for
  const [more, setMore] = useState({ q: '', busy: false, list: null, err: '' })
  async function moreOptions() {
    const q = name.trim(), k = q.toLowerCase() + '|more'
    if (onlineCache.get(k)?.length) { setMore({ q, busy: false, list: onlineCache.get(k), err: '' }); return }
    setMore({ q, busy: true, list: null, err: '' })
    try {
      const j = await askFood({ mode: 'more', q, have: (ai.results ?? []).map((r) => r.name) })
      const have = new Set((ai.results ?? []).map((r) => r.name.toLowerCase()))
      const list = cleanFoods(j.results, 8).filter((r) => !have.has(r.name.toLowerCase()))
      keepOnline(k, list)
      setMore({ q, busy: false, list, err: list.length ? '' : 'No other versions found.' })
    } catch (e) { setMore({ q, busy: false, list: null, err: e.message || 'Couldn’t get more options just now.' }) }
  }
  async function searchAi(auto = false, retry = true) {
    const q = name.trim()
    const k = q.toLowerCase()
    asked.current = k
    // answers already fetched in this session come back instantly
    if (onlineCache.has(k)) { setAi({ busy: false, err: '', results: onlineCache.get(k), items: null, confidence: '' }); return }
    setAi({ busy: true, err: '', results: null, items: null, confidence: '' })
    try {
      const j = await askFood({ mode: 'search', q })
      const found = cleanFoods(j.results)
      keepOnline(k, found)
      if (asked.current !== k) return // they kept typing; a newer search is on its way
      setAi({ busy: false, err: '', results: found, items: null, confidence: '' })
    } catch (e) {
      if (asked.current !== k) return
      // one quiet retry first (the online service is sometimes briefly busy), unless the free quota is used up
      if (retry && !/used up|offline|sign in/i.test(e.message || '')) { await new Promise((ok) => setTimeout(ok, 1500)); if (asked.current === k) return searchAi(auto, false); return }
      // an automatic search that fails stays quiet; the button is still there to try again
      setAi({ busy: false, err: auto ? '' : e.message, results: null, items: null, confidence: '' })
    }
  }

  // Look it up online by itself once typing pauses, whenever the built-in list has only a
  // few good matches, so there's no button to press. Once per search, only while online.
  useEffect(() => {
    const q = name.trim()
    if (picked || photo || q.length < 3 || !navigator.onLine || asked.current === q.toLowerCase()) return
    const strong = matchFoods(q).filter((m) => m.strong).length + suggestions.filter((sg) => sg.portion === 'my food' || sg.portion === 'your usual' || sg.seen || sg.from).length
    if (strong >= 3) return
    if (onlineCache.has(q.toLowerCase())) { searchAi(true); return } // already looked up: show it now
    const id = setTimeout(() => searchAi(true), 450) // long enough that slow typing doesn't fire a search per letter
    return () => clearTimeout(id)
  }, [name, picked, photo]) // eslint-disable-line react-hooks/exhaustive-deps

  // The keyboard's Search key: put the keyboard away so all results show, and look online too.
  function onEnter(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    inputRef.current?.blur()
    if (name.trim().length >= 2 && !ai.results && !ai.busy) searchAi(false)
  }
  const searching = name.trim().length > 0 && !picked

  const lastPhoto = useRef(null) // kept so "Try again" doesn't need a new photo
  const [slow, setSlow] = useState(false)
  async function onPhoto(ev) {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    try {
      // 1024 px keeps small print on packets readable
      const [thumb, big] = await Promise.all([compressPhoto(f), compressPhoto(f, 1024)])
      setPhoto(thumb)
      lastPhoto.current = big
      // a barcode in the photo: the product's own label numbers, no estimating (Android reads it on the phone)
      if (await readBarcode(f)) return
      await readPhoto(big)
    } catch {
      setAi({ busy: false, err: 'Couldn’t open that photo. Try another one, or type the food.', results: null, items: null, confidence: '', photoErr: true })
    }
  }
  const showPack = (results) => {
    const list = cleanFoods(results, 4)
    if (!list.length) return false
    setName(list[0].name); setPicked(false)
    asked.current = list[0].name.toLowerCase() // no extra online search for it
    setAi({ busy: false, err: '', results: list, items: null, confidence: '', barcode: true })
    return true
  }
  async function readBarcode(file) {
    if (!('BarcodeDetector' in window)) return false
    try {
      const bmp = await createImageBitmap(file)
      const found = await new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }).detect(bmp)
      bmp.close?.()
      const code = found?.[0]?.rawValue
      if (!code) return false
      setAi({ busy: true, err: '', results: null, items: null, confidence: '' })
      return showPack((await askFood({ mode: 'barcode', code })).results)
    } catch { return false }
  }
  async function readPhoto(big) {
    setSlow(false)
    const t = setTimeout(() => setSlow(true), 10000)
    try {
      setAi({ busy: true, err: '', results: null, items: null, confidence: '' })
      const j = await askFood({ mode: 'photo', image: big })
      if (showPack(j.pack)) return // the AI read a barcode in the photo and the product was found
      const total = Math.round(Number(String(j.kcal ?? '').replace(/[^\d.]/g, '')))
      if (!Number.isFinite(total) || total <= 0) throw new Error('Couldn’t spot food or a calorie label in that photo. Type it in instead.')
      j.kcal = total
      j.name = typeof j.name === 'string' ? j.name.slice(0, 120) : ''
      setName(j.name || 'Meal')
      setKcal(String(Math.round(j.kcal)))
      setPicked(true)
      setAi({ busy: false, err: '', results: null, items: cleanFoods(j.items), confidence: typeof j.confidence === 'string' ? j.confidence : '' })
    } catch (e) {
      const msg = /too long|taking/i.test(e.message || '') ? 'Reading the photo took too long. Try again, or type the food.' : e.message || 'Couldn’t read that photo.'
      setAi({ busy: false, err: msg, results: null, items: null, confidence: '', photoErr: true })
    } finally { clearTimeout(t); setSlow(false) }
  }

  const bump = (d) => setKcal(String(Math.max(0, n + d)))
  const less50 = useRepeat(() => bump(-50), n <= 0)
  const more50 = useRepeat(() => bump(50), n >= 5000)
  // hold a saved or recent food to log it straight away, without opening it
  const [holdTip, setHoldTip] = useState(() => { try { return !localStorage.getItem('bankcal:hint:hold-food') } catch { return false } })
  const logNow = (f) => onSave({ name: f.name, kcal: Math.round(f.kcal), meal, cat: catOf(f, cats), serving: (f.serving || realPortion(f.portion)).trim().slice(0, 30), ...(f.full > 0 ? { full: f.full } : {}) })
  const quick = peek || editing ? null : (f) => {
    if (holdTip) { firstTime('hold-food'); setHoldTip(false) }
    onSave({ name: f.name, kcal: Math.round(f.kcal), meal, cat: catOf(f, cats), serving: (f.serving || realPortion(f.portion)).trim().slice(0, 30), ...(f.full > 0 ? { full: f.full } : {}) })
  }

  function save() {
    if (!valid) return
    const nm = name.trim()
    const cat = catOf({ name: nm, cat: picked ? base?.cat : undefined }, cats)
    const sv = serving.trim().slice(0, 30)
    const one = baseName(nm) // My foods keeps a single serving, not "×3"
    // the food's own kcal for one serving, kept when you logged a different amount (a smaller plate, say)
    const per = Math.round(n / (qty || 1) / (picked ? mult || 1 : 1))
    const source = picked && base ? (base.full > 0 ? (base.listed && base.kcal !== base.full ? 0 : base.full) : ['my food', 'your usual'].includes(base.portion) || /’s food$/.test(base.portion ?? '') ? 0 : base0.current) : 0
    const full = source > 0 ? source : 0 // kept even when equal, so a partner can tell "this is the full portion"
    const had = myFoods.find((f) => f.name.toLowerCase() === one.toLowerCase())
    if (keep && !had) {
      updateProfile({ myFoods: [{ id: String(Date.now()), name: one, kcal: Math.round(n / qty), portion: 'my food', cat, ...(full ? { full } : {}), ...(sv ? { serving: sv } : {}) }, ...myFoods].slice(0, 60) })
    } else if (had && myFoods[0] !== had && !editing) {
      // the ones you use most float to the top
      updateProfile({ myFoods: [had, ...myFoods.filter((f) => f !== had)] })
    }
    const label = { 0.5: '½', 1.5: '1½', 2: '2', 3: '3' }[mult]
    onSave({ name: picked && label ? `${nm} ×${label}` : nm, kcal: n, meal, photo, cat, serving: sv, ...(full ? { full } : {}) })
  }

  return (
    <div className="sheet-wrap" onClick={onClose} style={view ? { top: view.top, bottom: 'auto', height: view.height } : undefined}>
      <div className={`sheet ${searching ? 'searching' : ''}`} style={view ? { ...drag.style, maxHeight: view.height - 8 } : drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? 'Edit food' : 'Log food'}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">{peek ? 'Just looking, nothing is logged' : editing ? `${meal}, ${new Date(editing.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : forDay && forDay !== today ? new Date(forDay + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : meal}</p>
            <h2>{peek ? 'How many calories?' : editing ? 'Edit this food' : forDay && forDay !== today ? 'What did you eat?' : 'What are you about to eat?'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <label className="field has-clear">
          <span>Food</span>
          {/* tapping a food that's already chosen selects the whole name, so typing replaces it */}
          {/* grows onto more lines so a long name is fully visible while editing */}
          <textarea ref={inputRef} rows={1} className="food-name" value={name} onKeyDown={onEnter} onFocus={(e) => { if (picked) e.target.select() }}
            onChange={(e) => { setName(e.target.value.replace(/\n/g, ' ')); setPicked(false) }} placeholder={peek ? 'Type a food, e.g. kiwi…' : 'Search or type, e.g. adobo…'} autoFocus={peek} aria-label="Food name" autoComplete="off" enterKeyHint="search" spellCheck={false} />
          {name && <button type="button" className="field-clear" aria-label="Clear food" onClick={(e) => { e.preventDefault(); setName(''); setPicked(false); setAi((a) => ({ ...a, results: null, err: null })); inputRef.current?.focus() }}><IconClose size={18} /></button>}
        </label>

        {(suggestions.length > 0 || (name.trim().length >= 2 && !picked)) && (() => {
          const row = (f, key, note) => (
            <button key={key} className="suggest-row" onClick={() => choose(f)}>
              <span><b><Hl text={f.name} q={name} /></b><small>{f.serving ? `${f.serving} · ` : ''}{note ? `${f.portion} · ${note}` : f.portion}</small></span>
              <span className="suggest-kcal">{fmt(f.kcal)}<i>kcal</i></span>
              {peek && <span role="button" tabIndex={0} className="sg-add" aria-label={`Log ${f.name}, ${fmt(f.kcal)} kcal`}
                onClick={(ev) => { ev.stopPropagation(); logNow(f) }} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.stopPropagation(); logNow(f) } }}>+</span>}
            </button>
          )
          const own = suggestions.filter((f) => f.portion === 'my food' || f.portion === 'your usual' || f.from || (f.seen && !ai.results?.some((r) => r.name === f.name)))
          // nothing in the built-in list matches every word: the online answer is likely the right one,
          // so it goes first and only a few loose matches follow
          const loose = !picked && name.trim().length >= 3 && !matchFoods(name).some((m) => m.strong)
          const rest = suggestions.filter((f) => !own.includes(f) && !f.seen && !f.from).slice(0, loose ? 4 : 8)
          const moreNow = more.q === name.trim() ? more : null
          const GROUPS = [['size', 'Other sizes'], ['style', 'Other styles'], ['brand', 'Restaurants and brands'], [undefined, 'Also']]
          const online = (ai.busy || ai.results?.length > 0) && (
            <>
              <p className="sg-h">{ai.barcode ? 'From the barcode · Open Food Facts' : 'Online · AI estimate'}</p>
              {ai.busy && <div className="sg-skel" aria-label="Checking online"><i /><i /></div>}
              {ai.results?.map((f) => row(f, 'ai' + f.name + f.portion))}
              {moreNow?.list && GROUPS.map(([g, label]) => {
                const items = moreNow.list.filter((f) => f.group === g)
                return items.length > 0 && <div key={label}><p className="sg-h">{label}</p>{items.map((f) => row(f, 'mo' + f.name + f.portion))}</div>
              })}
              {moreNow?.busy && <div className="sg-skel" aria-label="Getting more options"><i /><i /></div>}
              {ai.results?.length > 0 && !ai.barcode && !moreNow?.list && !moreNow?.busy && (
                <button className="suggest-ai" onClick={moreOptions}>{moreNow?.err || 'More options: sizes, styles, brands'}</button>
              )}
            </>
          )
          return (
            <div className="card suggest">
              {loose && online}
              {own.length > 0 && <p className="sg-h">Yours</p>}
              {own.map((f) => row(f, 'm' + f.name))}
              {rest.length > 0 && (own.length > 0 || loose) && <p className="sg-h">{loose ? 'Close matches' : 'More'}</p>}
              {rest.map((f) => row(f, f.name))}
              {!loose && online}
              {!ai.results && !ai.busy && (
                <button className="suggest-ai" onClick={() => searchAi(false)}>
                  {suggestions.length ? `Not it? Search online for “${name.trim()}”` : `Search online for “${name.trim()}”`}
                </button>
              )}
            </div>
          )
        })()}
        {picked && base?.per100 > 0 && !editing && <p className="per100">About {fmt(base.per100)} kcal per 100 {base.cat === 'drink' ? 'ml' : 'g'}</p>}
        {picked && base?.full > 0 && !editing && (
          <div className="whose" role="radiogroup" aria-label="Which amount">
            <button role="radio" aria-checked={base.kcal === base.own} className={base.kcal === base.own ? 'on' : ''} onClick={() => amount(base.own)}>
              <small>{base.from ? `${base.from}’s portion` : 'Your usual portion'}</small><b>{fmt(base.own)}<i> kcal</i></b>
            </button>
            <button role="radio" aria-checked={base.kcal === base.full} className={base.kcal === base.full ? 'on' : ''} onClick={() => amount(base.full)}>
              <small>{base.looked ? 'Usual portion online' : base.listed ? 'BankCal’s list' : 'Full portion'}{base.fullPortion ? ` · ${base.fullPortion}` : ''}</small><b>{fmt(base.full)}<i> kcal</i></b>
            </button>
          </div>
        )}
        {picked && base?.from && !(base.full > 0) && !editing && (
          base.whole
            ? <p className="whose-note">This is the food’s full portion, as {base.from} logged it.</p>
            : <p className="whose-note">
                This is {base.from}’s amount{base.serving ? ` (${base.serving})` : ''}. The food’s original wasn’t recorded.
                {look.msg ? <span> {look.msg}</span> : <button className="link-btn" onClick={lookUp} disabled={look.busy}>{look.busy ? 'Looking it up…' : 'Look up the usual amount'}</button>}
              </p>
        )}
        {picked && base && !editing && (
          <div className="portion" role="radiogroup" aria-label="How much">
            <span>How much?</span>
            {[[0.5, '½'], [1, '1'], [1.5, '1½'], [2, '2'], [3, '3']].map(([m, l]) => (
              <button key={m} role="radio" aria-checked={mult === m} className={mult === m ? 'on' : ''} onClick={() => portion(m)}>{l}{m === 1 && realPortion(base.portion) ? <small> {base.portion}</small> : '×'}</button>
            ))}
          </div>
        )}
        {ai.err && (
          <p className="ai-err">{ai.err}
            {ai.photoErr && lastPhoto.current && <button className="link-btn ai-retry" onClick={() => readPhoto(lastPhoto.current)}>Try again</button>}
          </p>
        )}
        {!name && (myFoods.length + theirs.length + recent.length) > 0 && (
          <div className="cat-filter" role="group" aria-label="Filter by food type">
            <button aria-pressed={!filter} className={!filter ? 'on' : ''} onClick={() => setFilter(null)}>All</button>
            {CATS.filter((c) => [...myFoods, ...theirs, ...recent].some((f) => typeOf(f) === c.id)).map((c) => (
              <button key={c.id} aria-pressed={filter === c.id} className={filter === c.id ? 'on' : ''} onClick={() => setFilter(filter === c.id ? null : c.id)}>{c.e} {c.label}</button>
            ))}
            <button className={`cat-fix-toggle ${fixCats ? 'on' : ''}`} aria-pressed={fixCats} onClick={() => setFixCats((x) => !x)}>{fixCats ? '✓ Done' : '✏️ Fix types'}</button>
          </div>
        )}
        {fixCats && !name && <p className="cat-hint">Tap a food’s type to change it. BankCal remembers it for next time.</p>}
        {myFoods.length > 0 && !name && myFoods.some(fits) && (
          <div className="myfoods">
            <div className="mf-head"><b>⭐ My foods</b><button className="link-btn" onClick={() => { setEditMine((x) => !x); setFixing(null) }}>{editMine ? 'Done' : 'Edit'}</button></div>
            {holdTip && quick && !editMine && !fixCats && <p className="cat-hint">Tip: hold a food to log it straight away.</p>}
            {editMine && <p className="cat-hint">Tap a food to rename it, change its kcal or remove it.</p>}
            <div className="mf-list">
              {(() => {
                const row = (f) => (
                  fixing?.id === f.id ? (
                    <div key={f.id} className="mf-fix">
                      <textarea rows={1} className="mf-fix-name" value={fixing.name} autoFocus onChange={(e) => setFixing({ ...fixing, name: e.target.value.replace(/\n/g, ' ') })} aria-label="Food name" />
                      <input className="mf-fix-serving" value={fixing.serving ?? ''} onChange={(e) => setFixing({ ...fixing, serving: e.target.value.slice(0, 30) })} placeholder="Portion, e.g. 1 pc (optional)" aria-label="Portion" autoComplete="off" />
                      <div className="mf-fix-row">
                        <label className="num-in"><input inputMode="numeric" value={fixing.kcal} onChange={(e) => setFixing({ ...fixing, kcal: e.target.value.replace(/\D/g, '') })} aria-label="Calories" onFocus={(e) => e.target.select()} /><span>kcal</span></label>
                        <button className="link-btn mf-del" onClick={() => removeMine(f.id)}>Remove</button>
                        <button className="link-btn" onClick={() => setFixing(null)}>Cancel</button>
                        <button className="sn-save" onClick={saveMine} disabled={!fixing.name.trim()}>Save</button>
                      </div>
                    </div>
                  ) : (
                  <HoldButton key={f.id} onHold={quick && !editMine && !fixCats ? () => quick(f) : undefined} className={`mf-row ${editMine ? 'edit' : ''}`} onClick={() => (editMine ? setFixing({ id: f.id, name: f.name, kcal: String(f.kcal), serving: f.serving ?? '' }) : choose(f))} aria-label={editMine ? `Edit ${f.name}` : `${f.name}, ${fmt(f.kcal)} kcal`}>
                    <Badge f={f} /><span className="mf-name">{f.name}{f.serving ? <small className="mf-serving"> · {f.serving}</small> : null}</span>
                    {editMine ? <span className="mf-x">✏️ {fmt(f.kcal)}</span> : <span className="mf-kcal">{fmt(f.kcal)}</span>}
                  </HoldButton>
                  )
                )
                // a filter or Edit shows a plain list; otherwise grouped by type
                return filter || editMine || fixCats ? myFoods.filter(fits).map(row) : groups(myFoods, 'mine', row)
              })()}
            </div>
          </div>
        )}

        {theirs.length > 0 && !name && theirs.some(fits) && (
          <div className="myfoods shared-foods">
            <div className="mf-head"><b>🤝 {theirs[0].from}’s foods</b><small>{theirs.length} foods {theirs[0].from} saved or logged, ready for you</small></div>
            <div className="mf-list">
              {(() => {
                const row = (f) => (
                  <HoldButton key={f.id} onHold={quick && !fixCats ? () => quick(f) : undefined} className="mf-row" onClick={() => choose(f)} aria-label={`${f.name}, ${fmt(f.kcal)} kcal, from ${f.from}`}>
                    <Badge f={f} /><span className="mf-name">{f.name}</span>
                    <span className="mf-kcal">{fmt(f.kcal)}</span>{f.full > 0 && <span className="mf-full">{f.listed ? 'listed' : 'full'} {fmt(f.full)}</span>}{f.whole && <span className="mf-full">full portion</span>}
                  </HoldButton>
                )
                return filter || fixCats ? theirs.filter(fits).map(row) : groups(theirs, 'theirs', row)
              })()}
            </div>
          </div>
        )}

        {recent.length > 0 && !name && recent.some(fits) && (
          <div className="recent">
            {recent.filter(fits).map((r) => (
              <HoldButton key={r.id} onHold={quick && !fixCats ? () => quick(r) : undefined} className="chip" onClick={() => choose(r)}>
                <Badge f={r} />{r.name} <span>{fmt(r.kcal)}</span>
              </HoldButton>
            ))}
          </div>
        )}


        {(photo || !searching) && <button className={`photo ${photo ? 'has' : 'compact'}`} onClick={() => fileRef.current?.click()}>
          {photo ? (
            <img src={photo} alt="Your meal" />
          ) : (
            <>
              <IconCamera size={26} />
              <span>Snap your plate<small>Food, drinks, a packet label or a barcode</small></span>
            </>
          )}
          {ai.busy && photo && <span className="photo-busy">{slow ? 'Still reading… labels can take a little longer' : 'Reading your photo…'}</span>}
        </button>}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />

        {ai.items?.length > 0 && (
          <div className="ai-items">
            {ai.items.map((it, i) => (
              <span key={i}>{it.name}{it.portion ? `, ${it.portion}` : ''} <b>{fmt(it.kcal)}</b></span>
            ))}
            {ai.confidence === 'low' && <small>Low confidence. Check the number below.</small>}
          </div>
        )}


        {editing && (
          <div className="qty-row">
            <span>Quantity</span>
            <button onClick={() => setQty(qty - 1)} disabled={qty <= 1} aria-label="One less">−</button>
            <b aria-live="polite">{qty}</b>
            <button onClick={() => setQty(qty + 1)} disabled={qty >= 20} aria-label="One more">+</button>
          </div>
        )}
        {(editing || otherDay) && (
          <div className="meal-pick" role="radiogroup" aria-label="Meal">
            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((m) => (
              <button key={m} role="radio" aria-checked={meal === m} className={`chip ${meal === m ? 'on' : ''}`} onClick={() => setMeal(m)}>{m}</button>
            ))}
          </div>
        )}

        {(name.trim() || editing) && (
          <div className="serving-row">
            <label><span>Portion</span>
              <input value={serving} onChange={(e) => setServing(e.target.value.slice(0, 30))} placeholder="optional, e.g. 1 pc" aria-label="Portion" autoComplete="off" enterKeyHint="done" onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }} />
            </label>
            <div className="serving-chips">
              {['1 pc', '2 pcs', '1 cup', '1 bowl', '1 plate', '100 g'].map((x) => <button key={x} className={serving === x ? 'on' : ''} onClick={() => setServing(serving === x ? '' : x)}>{x}</button>)}
            </div>
          </div>
        )}

        <div className="kcal-row">
          <button className="step holdable" {...less50} disabled={n <= 0}>−50</button>
          <label className="kcal-input">
            <input inputMode="numeric" pattern="[0-9]*" value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, ''))} placeholder="0" aria-label="Calories" />
            <span>kcal</span>
          </label>
          <button className="step holdable" {...more50}>+50</button>
        </div>

        {after != null && (
          <p className={`after ${after < 0 ? 'neg' : ''}`}>
            {peek ? (after < 0 ? `Eating this would take you ${fmt(-after)} kcal over today` : `You’d have ${fmt(after)} kcal left if you ate this`) : after < 0 ? `This takes you ${fmt(-after)} kcal over` : `${fmt(after)} kcal left after this`}
          </p>
        )}

        {!peek && valid && !myFoods.some((f) => f.name.toLowerCase() === name.trim().toLowerCase()) && (
          <label className="keep-food">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            <span>Save to <b>My foods</b> for next time</span>
          </label>
        )}

        {peek && <button className="btn-primary" onClick={onClose}>Done</button>}
        {peek && valid && <button className="remove-entry peek-log" onClick={save}>Ate it? Log it · {fmt(n)} kcal</button>}
        {!peek && <button className="btn-primary" disabled={!valid} onClick={save}>
          {editing ? 'Save changes' : otherDay ? (valid ? `Add ${fmt(n)} kcal to this day` : 'Add to this day') : valid ? `Spend ${fmt(n)} kcal` : 'Spend'}
        </button>}
        {editing && <button className="remove-entry" onClick={() => onRemove?.(editing)}>Remove this food</button>}
      </div>
    </div>
  )
}

// Bold the parts of a name that match what was typed
export function Hl({ text, q }) {
  const words = q.toLowerCase().split(/[^a-z0-9]+/i).filter((w) => w.length > 1)
  if (!words.length) return text
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
  return String(text).split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))
}
