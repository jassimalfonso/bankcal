import { useMemo, useRef, useState } from 'react'
import { compressPhoto } from '../store'
import { fmt, mealFor } from '../calc'
import { IconCamera, IconClose } from '../icons'

export default function AddSheet({ mine, todays, budget, onClose, onSave }) {
  const [photo, setPhoto] = useState(null)
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const fileRef = useRef(null)
  const meal = mealFor()

  // One-tap repeats: last distinct foods this profile logged.
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

  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  const n = Math.max(0, parseInt(kcal, 10) || 0)
  const after = budget != null ? budget - spent - n : null
  const valid = name.trim() && n > 0

  async function onPhoto(ev) {
    const f = ev.target.files?.[0]
    if (!f) return
    try {
      setPhoto(await compressPhoto(f))
    } catch {
      /* unreadable image — ignore */
    }
  }

  const bump = (d) => setKcal(String(Math.max(0, n + d)))

  function save() {
    if (!valid) return
    onSave({ name: name.trim(), kcal: n, meal, photo })
  }

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Log food">
        <div className="grabber" />
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
              <span>Take a photo of your plate</span>
              <small>Calories from photos are coming in the next update</small>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />

        {recent.length > 0 && (
          <div className="recent">
            {recent.map((r) => (
              <button key={r.id} className="chip" onClick={() => { setName(r.name); setKcal(String(r.kcal)) }}>
                {r.name} <span>{fmt(r.kcal)}</span>
              </button>
            ))}
          </div>
        )}

        <label className="field">
          <span>Food</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken shawarma" autoComplete="off" enterKeyHint="next" />
        </label>

        <div className="kcal-row">
          <button className="step" onClick={() => bump(-50)}>−50</button>
          <label className="kcal-input">
            <input inputMode="numeric" pattern="[0-9]*" value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, ''))} placeholder="0" />
            <span>kcal</span>
          </label>
          <button className="step" onClick={() => bump(50)}>+50</button>
        </div>

        {after != null && (
          <p className={`after ${after < 0 ? 'neg' : ''}`}>
            {after < 0 ? `This takes you ${fmt(-after)} kcal over` : `${fmt(after)} kcal left after this`}
          </p>
        )}

        <button className="btn-primary" disabled={!valid} onClick={save}>
          {valid ? `Spend ${fmt(n)} kcal` : 'Spend'}
        </button>
      </div>
    </div>
  )
}
