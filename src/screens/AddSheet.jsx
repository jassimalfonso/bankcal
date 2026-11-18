import { useEffect, useMemo, useRef, useState } from 'react'
import { compressPhoto } from '../store'
import { fmt, mealFor } from '../calc'
import { searchFoods } from '../foods'
import { askFood } from '../ai'
import { matchFoods } from '../foods'
import { IconCamera, IconClose } from '../icons'
import { useEscape } from '../motion'
import { useSheetDrag } from '../motion'

// online answers, remembered while the app stays open
const onlineCache = new Map()

export default function AddSheet({ mine, todays, budget, onClose, onSave, onRemove, editing, today, profile, updateProfile }) {
  const myFoods = profile?.myFoods ?? []
  const [keep, setKeep] = useState(false)
  const [editMine, setEditMine] = useState(false)
  const [allMine, setAllMine] = useState(false)
  const removeMine = (id) => updateProfile({ myFoods: myFoods.filter((f) => f.id !== id) })
  const [photo, setPhoto] = useState(editing?.photo ?? null)
  const [name, setName] = useState(editing?.name ?? '')
  const [kcal, setKcal] = useState(editing ? String(editing.kcal) : '')
  const [picked, setPicked] = useState(!!editing) // hide suggestions after choosing one
  const [ai, setAi] = useState({ busy: false, err: '', results: null, items: null, confidence: '' })
  const fileRef = useRef(null)
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const [meal, setMeal] = useState(editing?.meal ?? mealFor())
  const inputRef = useRef(null)

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
    const own = [...saved, ...past]
    const built = searchFoods(name).filter((f) => !own.some((o) => o.name.toLowerCase() === f.name.toLowerCase()))
    return [...own, ...built].slice(0, 8)
  }, [name, recent, picked, myFoods])

  // when changing something already logged today, don't count the old number twice
  const spent = todays.reduce((a, e) => a + (e.id === editing?.id ? 0 : e.kcal), 0)
  const otherDay = editing && editing.day && editing.day !== today
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
    setBase({ kcal: f.kcal, portion: f.portion })
    setMult(1)
    setAi((a) => ({ ...a, results: null }))
    inputRef.current?.blur() // put the keyboard away so the amount and Spend are in view
  }
  const portion = (m) => { setMult(m); if (base) setKcal(String(Math.round(base.kcal * m))) }

  const asked = useRef('')
  async function searchAi(auto = false) {
    const q = name.trim()
    const k = q.toLowerCase()
    asked.current = k
    // answers already fetched in this session come back instantly
    if (onlineCache.has(k)) { setAi({ busy: false, err: '', results: onlineCache.get(k), items: null, confidence: '' }); return }
    setAi({ busy: true, err: '', results: null, items: null, confidence: '' })
    try {
      const j = await askFood({ mode: 'search', q })
      onlineCache.set(k, j.results ?? [])
      if (asked.current !== k) return // they kept typing; a newer search is on its way
      setAi({ busy: false, err: '', results: j.results ?? [], items: null, confidence: '' })
    } catch (e) {
      if (asked.current !== k) return
      // an automatic search that fails stays quiet; the button is still there to try again
      setAi({ busy: false, err: auto ? '' : e.message, results: null, items: null, confidence: '' })
    }
  }

  // Look it up online by itself once typing pauses, whenever the built-in list has only a
  // few good matches, so there's no button to press. Once per search, only while online.
  useEffect(() => {
    const q = name.trim()
    if (picked || photo || q.length < 3 || !navigator.onLine || asked.current === q.toLowerCase()) return
    const strong = matchFoods(q).filter((m) => m.strong).length + suggestions.filter((sg) => sg.portion === 'my food' || sg.portion === 'your usual').length
    if (strong >= 3) return
    const id = setTimeout(() => searchAi(true), 500)
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

  async function onPhoto(ev) {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    try {
      const [thumb, big] = await Promise.all([compressPhoto(f), compressPhoto(f, 768)])
      setPhoto(thumb)
      setAi({ busy: true, err: '', results: null, items: null, confidence: '' })
      const j = await askFood({ mode: 'photo', image: big })
      if (!j.kcal) throw new Error('Couldn’t spot food in that photo. Type it in instead.')
      setName(j.name || 'Meal')
      setKcal(String(Math.round(j.kcal)))
      setPicked(true)
      setAi({ busy: false, err: '', results: null, items: j.items ?? [], confidence: j.confidence ?? '' })
    } catch (e) {
      setAi({ busy: false, err: e.message || 'Couldn’t read that photo.', results: null, items: null, confidence: '' })
    }
  }

  const bump = (d) => setKcal(String(Math.max(0, n + d)))

  function save() {
    if (!valid) return
    const nm = name.trim()
    const had = myFoods.find((f) => f.name.toLowerCase() === nm.toLowerCase())
    if (keep && !had) {
      updateProfile({ myFoods: [{ id: String(Date.now()), name: nm, kcal: n, portion: 'my food' }, ...myFoods].slice(0, 60) })
    } else if (had && myFoods[0] !== had && !editing) {
      // the ones you use most float to the top
      updateProfile({ myFoods: [had, ...myFoods.filter((f) => f !== had)] })
    }
    const label = { 0.5: '½', 1.5: '1½', 2: '2', 3: '3' }[mult]
    onSave({ name: picked && label ? `${nm} ×${label}` : nm, kcal: n, meal, photo })
  }

  return (
    <div className="sheet-wrap" onClick={onClose} style={view ? { top: view.top, bottom: 'auto', height: view.height } : undefined}>
      <div className={`sheet ${searching ? 'searching' : ''}`} style={view ? { ...drag.style, maxHeight: view.height - 8 } : drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? 'Edit food' : 'Log food'}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">{editing ? `${meal}, ${new Date(editing.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : meal}</p>
            <h2>{editing ? 'Edit this food' : 'What are you about to eat?'}</h2>
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
          const own = suggestions.filter((f) => f.portion === 'my food' || f.portion === 'your usual')
          const rest = suggestions.filter((f) => !own.includes(f))
          const row = (f, key, note) => (
            <button key={key} className="suggest-row" onClick={() => choose(f)}>
              <span><b><Hl text={f.name} q={name} /></b><small>{note ? `${f.portion} · ${note}` : f.portion}</small></span>
              <span className="suggest-kcal">{fmt(f.kcal)}<i>kcal</i></span>
            </button>
          )
          return (
            <div className="card suggest">
              {own.length > 0 && <p className="sg-h">Yours</p>}
              {own.map((f) => row(f, 'm' + f.name))}
              {rest.length > 0 && own.length > 0 && <p className="sg-h">More</p>}
              {rest.map((f) => row(f, f.name))}
              {(ai.busy || ai.results?.length > 0) && <p className="sg-h">Online · AI estimate</p>}
              {ai.busy && <div className="sg-skel" aria-label="Checking online"><i /><i /></div>}
              {ai.results?.map((f) => row(f, 'ai' + f.name))}
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
        {ai.err && <p className="ai-err">{ai.err}</p>}
        {myFoods.length > 0 && !name && (
          <div className="myfoods">
            <div className="mf-head"><b>⭐ My foods</b><button className="link-btn" onClick={() => setEditMine((x) => !x)}>{editMine ? 'Done' : 'Edit'}</button></div>
            <div className="mf-list">
              {(allMine || editMine ? myFoods : myFoods.slice(0, 4)).map((f) => (
                <button key={f.id} className={`mf-row ${editMine ? 'edit' : ''}`} onClick={() => (editMine ? removeMine(f.id) : choose(f))} aria-label={editMine ? `Remove ${f.name}` : `${f.name}, ${fmt(f.kcal)} kcal`}>
                  <span className="mf-name">{f.name}</span>
                  {editMine ? <span className="mf-x">Remove</span> : <span className="mf-kcal">{fmt(f.kcal)}</span>}
                </button>
              ))}
              {myFoods.length > 4 && !editMine && (
                <button className="mf-more" onClick={() => setAllMine((x) => !x)} aria-expanded={allMine}>
                  {allMine ? 'Show fewer' : `Show all ${myFoods.length}`} <span className={`chev ${allMine ? 'up' : ''}`}>⌄</span>
                </button>
              )}
            </div>
          </div>
        )}

        {recent.length > 0 && !name && (
          <div className="recent">
            {recent.map((r) => (
              <button key={r.id} className="chip" onClick={() => choose(r)}>
                {r.name} <span>{fmt(r.kcal)}</span>
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
              <span>Snap your plate<small>AI reads the calories for you</small></span>
            </>
          )}
          {ai.busy && photo && <span className="photo-busy">Reading your plate…</span>}
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
          {editing ? 'Save changes' : valid ? `Spend ${fmt(n)} kcal` : 'Spend'}
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
