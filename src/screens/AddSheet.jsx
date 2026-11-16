import { useEffect, useMemo, useRef, useState } from 'react'
import { compressPhoto } from '../store'
import { fmt, mealFor } from '../calc'
import { searchFoods } from '../foods'
import { askFood } from '../ai'
import { matchFoods } from '../foods'
import { IconCamera, IconClose } from '../icons'
import { useEscape } from '../motion'
import { useSheetDrag } from '../motion'

export default function AddSheet({ mine, todays, budget, onClose, onSave, profile, updateProfile }) {
  const myFoods = profile?.myFoods ?? []
  const [keep, setKeep] = useState(false)
  const [editMine, setEditMine] = useState(false)
  const removeMine = (id) => updateProfile({ myFoods: myFoods.filter((f) => f.id !== id) })
  const [photo, setPhoto] = useState(null)
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [picked, setPicked] = useState(false) // hide suggestions after choosing one
  const [ai, setAi] = useState({ busy: false, err: '', results: null, items: null, confidence: '' })
  const fileRef = useRef(null)
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const meal = mealFor()

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
    return [...own, ...built].slice(0, 6)
  }, [name, recent, picked, myFoods])

  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  const n = Math.max(0, parseInt(kcal, 10) || 0)
  const after = budget != null ? budget - spent - n : null
  const valid = name.trim() && n > 0

  function choose(f) {
    setName(f.name)
    setKcal(String(f.kcal))
    setPicked(true)
    setAi((a) => ({ ...a, results: null }))
  }

  const asked = useRef('')
  async function searchAi(auto = false) {
    const q = name.trim()
    asked.current = q.toLowerCase()
    setAi({ busy: true, err: '', results: null, items: null, confidence: '' })
    try {
      const j = await askFood({ mode: 'search', q })
      if (asked.current !== q.toLowerCase()) return // they kept typing; a newer search is on its way
      setAi({ busy: false, err: '', results: j.results ?? [], items: null, confidence: '' })
    } catch (e) {
      if (asked.current !== q.toLowerCase()) return
      // an automatic search that fails stays quiet; the button is still there to try again
      setAi({ busy: false, err: auto ? '' : e.message, results: null, items: null, confidence: '' })
    }
  }

  // When the built-in list has no good match, look it up online automatically
  // (after a short pause in typing, once per search, and only while online).
  useEffect(() => {
    const q = name.trim()
    if (picked || photo || q.length < 4 || !navigator.onLine || asked.current === q.toLowerCase()) return
    const strong = matchFoods(q).filter((m) => m.strong).length + suggestions.filter((sg) => sg.portion === 'my food' || sg.portion === 'your usual').length
    if (strong >= 1) return
    const id = setTimeout(() => searchAi(true), 900)
    return () => clearTimeout(id)
  }, [name, picked, photo]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (keep && !myFoods.some((f) => f.name.toLowerCase() === nm.toLowerCase())) {
      updateProfile({ myFoods: [{ id: String(Date.now()), name: nm, kcal: n, portion: 'my food' }, ...myFoods].slice(0, 60) })
    }
    onSave({ name: nm, kcal: n, meal, photo })
  }

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Log food">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">{meal}</p>
            <h2>What are you about to eat?</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <button className={`photo ${photo ? 'has' : ''}`} onClick={() => fileRef.current?.click()}>
          {photo ? (
            <img src={photo} alt="Your meal" />
          ) : (
            <>
              <IconCamera size={30} />
              <span>Snap your plate</span>
              <small>AI reads the calories for you</small>
            </>
          )}
          {ai.busy && photo && <span className="photo-busy">Reading your plate…</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />

        {ai.items?.length > 0 && (
          <div className="ai-items">
            {ai.items.map((it, i) => (
              <span key={i}>{it.name}{it.portion ? `, ${it.portion}` : ''} <b>{fmt(it.kcal)}</b></span>
            ))}
            {ai.confidence === 'low' && <small>Low confidence. Check the number below.</small>}
          </div>
        )}

        {myFoods.length > 0 && !name && (
          <div className="myfoods">
            <div className="mf-head"><b>My foods</b><button className="link-btn" onClick={() => setEditMine((x) => !x)}>{editMine ? 'Done' : 'Edit'}</button></div>
            <div className="recent">
              {myFoods.map((f) => editMine ? (
                <button key={f.id} className="chip mine edit" onClick={() => removeMine(f.id)} aria-label={`Remove ${f.name}`}>{f.name} <span>✕</span></button>
              ) : (
                <button key={f.id} className="chip mine" onClick={() => choose(f)}>⭐ {f.name} <span>{fmt(f.kcal)}</span></button>
              ))}
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

        <label className="field">
          <span>Food</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setPicked(false) }} placeholder="Search or type, e.g. adobo…" aria-label="Food name" autoComplete="off" enterKeyHint="search" />
        </label>

        {(suggestions.length > 0 || (name.trim().length >= 2 && !picked)) && (
          <div className="card suggest">
            {suggestions.map((f) => (
              <button key={f.name} className="suggest-row" onClick={() => choose(f)}>
                <span><b>{f.name}</b><small>{f.portion}</small></span>
                <span className="suggest-kcal">{fmt(f.kcal)}</span>
              </button>
            ))}
            {ai.results?.map((f) => (
              <button key={'ai' + f.name} className="suggest-row" onClick={() => choose(f)}>
                <span><b>{f.name}</b><small>{f.portion} · AI estimate</small></span>
                <span className="suggest-kcal">{fmt(f.kcal)}</span>
              </button>
            ))}
            {!ai.results && (
              <button className="suggest-ai" onClick={() => searchAi(false)} disabled={ai.busy}>
                {ai.busy ? 'Searching online…' : `Search online for “${name.trim()}”`}
              </button>
            )}
          </div>
        )}
        {ai.err && <p className="ai-err">{ai.err}</p>}

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
          {valid ? `Spend ${fmt(n)} kcal` : 'Spend'}
        </button>
      </div>
    </div>
  )
}
