import { useEffect, useMemo, useRef, useState } from 'react'
import { CATS, catById, catOf, keyOf as catKey } from '../foodCats'
import { compressPhoto } from '../store'
import { fmt, mealFor } from '../calc'
import { searchFoods } from '../foods'
import { askFood, cleanFoods, warmFood } from '../ai'
import { matchFoods } from '../foods'
import { IconCamera, IconClose } from '../icons'
import { useEscape } from '../motion'
import { useSheetDrag } from '../motion'

// Online answers are kept on this phone for two months, so a food looked up once comes back instantly,
// and every food found online also shows up in the instant suggestions from then on.
const CACHE_KEY = 'bankcal:online-foods'
const onlineCache = new Map()
try {
  for (const [k, v, at] of JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')) if (Date.now() - at < 60 * 864e5) onlineCache.set(k, Object.assign(v, { at }))
} catch { /* start empty */ }
function keepOnline(k, found) {
  onlineCache.set(k, Object.assign(found, { at: Date.now() }))
  if (!found.length) return // "nothing found" is only remembered until the app is closed
  try { localStorage.setItem(CACHE_KEY, JSON.stringify([...onlineCache].filter(([, v]) => v.length).sort((a, b) => b[1].at - a[1].at).slice(0, 200).map(([key, v]) => [key, [...v], v.at]))) } catch { /* full: fine */ }
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
      if (qs.every((w) => ws.some((x) => x.startsWith(w))) && !out.has(f.name.toLowerCase())) out.set(f.name.toLowerCase(), { name: f.name, kcal: f.kcal, portion: f.portion || 'found online', seen: true })
      if (out.size >= limit) return [...out.values()]
    }
  }
  return [...out.values()]
}

export default function AddSheet({ partner, mine, todays, budget, onClose, onSave, onRemove, editing, forDay, today, profile, updateProfile }) {
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
  // the type badge: a button while fixing types, otherwise just a little emoji
  const Badge = ({ f }) => fixCats
    ? <span role="button" tabIndex={0} className="cat-fix" onClick={(e) => { e.stopPropagation(); nextCat(f) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); nextCat(f) } }} aria-label={`${f.name} is ${catById[typeOf(f)].label}. Tap to change`}>{catById[typeOf(f)].e} {catById[typeOf(f)].label}</span>
    : <span className="cat-e" aria-hidden="true">{catById[typeOf(f)].e}</span>
  const [allMine, setAllMine] = useState(false)
  const removeMine = (id) => updateProfile({ myFoods: myFoods.filter((f) => f.id !== id) })
  // Your partner's saved foods (the ones you haven't saved yourself), ready to use
  const theirs = useMemo(() => {
    const key = (n) => words(String(n)).join(' ') // "Max’s" and "Max's" count as the same food
    const have = new Set(myFoods.map((f) => key(f.name)))
    const out = []
    for (const id of partner?.partners ?? []) {
      const sh = partner.shares?.[id]
      for (const f of sh?.foods ?? []) {
        const k = key(f.name)
        if (!f.name || have.has(k) || !(f.kcal >= 0)) continue
        have.add(k); out.push({ id: `p-${id}-${k}`, name: f.name, kcal: f.kcal, cat: f.cat, portion: `${sh.name}’s food`, from: sh.name })
      }
    }
    return out
  }, [partner?.shares, partner?.partners, myFoods])
  const [allTheirs, setAllTheirs] = useState(false)
  const [photo, setPhoto] = useState(editing?.photo ?? null)
  const [name, setName] = useState(editing?.name ?? '')
  const [kcal, setKcal] = useState(editing ? String(editing.kcal) : '')
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
    const saved = myFoods.filter((f) => f.name.toLowerCase().includes(t)).map((f) => ({ name: f.name, kcal: f.kcal, portion: f.portion || 'my food' }))
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
  const valid = name.trim() && n > 0

  // a chosen food can be scaled: ½, 1, 1½, 2 or 3 portions
  const [base, setBase] = useState(null)
  const [mult, setMult] = useState(1)
  function choose(f) {
    setName(f.name)
    setKcal(String(f.kcal))
    setPicked(true)
    setBase({ kcal: f.kcal, portion: f.portion, cat: f.cat })
    setMult(1)
    setAi((a) => ({ ...a, results: null }))
    inputRef.current?.blur() // put the keyboard away so the amount and Spend are in view
  }
  const portion = (m) => { setMult(m); if (base) setKcal(String(Math.round(base.kcal * m))) }

  const asked = useRef('')
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
      await readPhoto(big)
    } catch {
      setAi({ busy: false, err: 'Couldn’t open that photo. Try another one, or type the food.', results: null, items: null, confidence: '', photoErr: true })
    }
  }
  async function readPhoto(big) {
    setSlow(false)
    const t = setTimeout(() => setSlow(true), 10000)
    try {
      setAi({ busy: true, err: '', results: null, items: null, confidence: '' })
      const j = await askFood({ mode: 'photo', image: big })
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

  function save() {
    if (!valid) return
    const nm = name.trim()
    const cat = catOf({ name: nm, cat: picked ? base?.cat : undefined }, cats)
    const one = baseName(nm) // My foods keeps a single serving, not "×3"
    const had = myFoods.find((f) => f.name.toLowerCase() === one.toLowerCase())
    if (keep && !had) {
      updateProfile({ myFoods: [{ id: String(Date.now()), name: one, kcal: Math.round(n / qty), portion: 'my food', cat }, ...myFoods].slice(0, 60) })
    } else if (had && myFoods[0] !== had && !editing) {
      // the ones you use most float to the top
      updateProfile({ myFoods: [had, ...myFoods.filter((f) => f !== had)] })
    }
    const label = { 0.5: '½', 1.5: '1½', 2: '2', 3: '3' }[mult]
    onSave({ name: picked && label ? `${nm} ×${label}` : nm, kcal: n, meal, photo, cat })
  }

  return (
    <div className="sheet-wrap" onClick={onClose} style={view ? { top: view.top, bottom: 'auto', height: view.height } : undefined}>
      <div className={`sheet ${searching ? 'searching' : ''}`} style={view ? { ...drag.style, maxHeight: view.height - 8 } : drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? 'Edit food' : 'Log food'}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">{editing ? `${meal}, ${new Date(editing.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : forDay && forDay !== today ? new Date(forDay + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : meal}</p>
            <h2>{editing ? 'Edit this food' : forDay && forDay !== today ? 'What did you eat?' : 'What are you about to eat?'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <label className="field has-clear">
          <span>Food</span>
          {/* tapping a food that's already chosen selects the whole name, so typing replaces it */}
          <input ref={inputRef} value={name} onKeyDown={onEnter} type="search" onFocus={(e) => { if (picked) e.target.select() }} onChange={(e) => { setName(e.target.value); setPicked(false) }} placeholder="Search or type, e.g. adobo…" aria-label="Food name" autoComplete="off" enterKeyHint="search" />
          {name && <button type="button" className="field-clear" aria-label="Clear food" onClick={(e) => { e.preventDefault(); setName(''); setPicked(false); setAi((a) => ({ ...a, results: null, err: null })); inputRef.current?.focus() }}><IconClose size={18} /></button>}
        </label>

        {(suggestions.length > 0 || (name.trim().length >= 2 && !picked)) && (() => {
          const row = (f, key, note) => (
            <button key={key} className="suggest-row" onClick={() => choose(f)}>
              <span><b><Hl text={f.name} q={name} /></b><small>{note ? `${f.portion} · ${note}` : f.portion}</small></span>
              <span className="suggest-kcal">{fmt(f.kcal)}<i>kcal</i></span>
            </button>
          )
          const own = suggestions.filter((f) => f.portion === 'my food' || f.portion === 'your usual' || f.from || (f.seen && !ai.results?.some((r) => r.name === f.name)))
          // nothing in the built-in list matches every word: the online answer is likely the right one,
          // so it goes first and only a few loose matches follow
          const loose = !picked && name.trim().length >= 3 && !matchFoods(name).some((m) => m.strong)
          const rest = suggestions.filter((f) => !own.includes(f) && !f.seen && !f.from).slice(0, loose ? 4 : 8)
          const online = (ai.busy || ai.results?.length > 0) && (
            <>
              <p className="sg-h">Online · AI estimate</p>
              {ai.busy && <div className="sg-skel" aria-label="Checking online"><i /><i /></div>}
              {ai.results?.map((f) => row(f, 'ai' + f.name))}
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
        {picked && base && !editing && (
          <div className="portion" role="radiogroup" aria-label="How much">
            <span>How much?</span>
            {[[0.5, '½'], [1, '1'], [1.5, '1½'], [2, '2'], [3, '3']].map(([m, l]) => (
              <button key={m} role="radio" aria-checked={mult === m} className={mult === m ? 'on' : ''} onClick={() => portion(m)}>{l}{m === 1 && base.portion && base.portion !== 'my food' && base.portion !== 'your usual' ? <small> {base.portion}</small> : '×'}</button>
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
            <div className="mf-head"><b>⭐ My foods</b><button className="link-btn" onClick={() => setEditMine((x) => !x)}>{editMine ? 'Done' : 'Edit'}</button></div>
            <div className="mf-list">
              {(allMine || editMine || filter ? myFoods.filter(fits) : myFoods.slice(0, 4)).map((f) => (
                <button key={f.id} className={`mf-row ${editMine ? 'edit' : ''}`} onClick={() => (editMine ? removeMine(f.id) : choose(f))} aria-label={editMine ? `Remove ${f.name}` : `${f.name}, ${fmt(f.kcal)} kcal`}>
                  <Badge f={f} /><span className="mf-name">{f.name}</span>
                  {editMine ? <span className="mf-x">Remove</span> : <span className="mf-kcal">{fmt(f.kcal)}</span>}
                </button>
              ))}
              {myFoods.length > 4 && !editMine && !filter && (
                <button className="mf-more" onClick={() => setAllMine((x) => !x)} aria-expanded={allMine}>
                  {allMine ? 'Show fewer' : `Show all ${myFoods.length}`} <span className={`chev ${allMine ? 'up' : ''}`}>⌄</span>
                </button>
              )}
            </div>
          </div>
        )}

        {theirs.length > 0 && !name && theirs.some(fits) && (
          <div className="myfoods shared-foods">
            <div className="mf-head"><b>🤝 {theirs[0].from}’s foods</b><small>{theirs.length} foods {theirs[0].from} saved or logged, ready for you</small></div>
            <div className="mf-list">
              {(allTheirs || filter ? theirs.filter(fits) : theirs.slice(0, 4)).map((f) => (
                <button key={f.id} className="mf-row" onClick={() => choose(f)} aria-label={`${f.name}, ${fmt(f.kcal)} kcal, from ${f.from}`}>
                  <Badge f={f} /><span className="mf-name">{f.name}</span>
                  <span className="mf-kcal">{fmt(f.kcal)}</span>
                </button>
              ))}
              {theirs.length > 4 && !filter && (
                <button className="mf-more" onClick={() => setAllTheirs((x) => !x)} aria-expanded={allTheirs}>
                  {allTheirs ? 'Show fewer' : `Show all ${theirs.length}`} <span className={`chev ${allTheirs ? 'up' : ''}`}>⌄</span>
                </button>
              )}
            </div>
          </div>
        )}

        {recent.length > 0 && !name && recent.some(fits) && (
          <div className="recent">
            {recent.filter(fits).map((r) => (
              <button key={r.id} className="chip" onClick={() => choose(r)}>
                <Badge f={r} />{r.name} <span>{fmt(r.kcal)}</span>
              </button>
            ))}
          </div>
        )}


        {(photo || !searching) && <button className={`photo ${photo ? 'has' : 'compact'}`} onClick={() => fileRef.current?.click()}>
          {photo ? (
            <img src={photo} alt="Your meal" />
          ) : (
            <>
              <IconCamera size={26} />
              <span>Snap your plate<small>Food, drinks or a packet label</small></span>
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

        <div className="kcal-row">
          <button className="step" onClick={() => bump(-50)}>−50</button>
          <label className="kcal-input">
            <input inputMode="numeric" pattern="[0-9]*" value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, ''))} placeholder="0" aria-label="Calories" />
            <span>kcal</span>
          </label>
          <button className="step" onClick={() => bump(50)}>+50</button>
        </div>

        {after != null && (
          <p className={`after ${after < 0 ? 'neg' : ''}`}>
            {after < 0 ? `This takes you ${fmt(-after)} kcal over` : `${fmt(after)} kcal left after this`}
          </p>
        )}

        {valid && !myFoods.some((f) => f.name.toLowerCase() === name.trim().toLowerCase()) && (
          <label className="keep-food">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            <span>Save to <b>My foods</b> for next time</span>
          </label>
        )}

        <button className="btn-primary" disabled={!valid} onClick={save}>
          {editing ? 'Save changes' : otherDay ? (valid ? `Add ${fmt(n)} kcal to this day` : 'Add to this day') : valid ? `Spend ${fmt(n)} kcal` : 'Spend'}
        </button>
        {editing && <button className="remove-entry" onClick={() => onRemove?.(editing)}>Remove this food</button>}
      </div>
    </div>
  )
}

// Bold the parts of a name that match what was typed
function Hl({ text, q }) {
  const words = q.toLowerCase().split(/[^a-z0-9]+/i).filter((w) => w.length > 1)
  if (!words.length) return text
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
  return String(text).split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))
}
