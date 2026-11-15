import { useState } from 'react'
import { fmt } from '../calc'

function partOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

// How much of the tank is still full (0–1).
export function level(budget, spent) {
  if (!budget) return 0
  return Math.max(0, Math.min(1, (budget - spent) / budget))
}

export default function Today({ profile, todays, budget, removeEntry, openSwitch, goSetup }) {
  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  const left = budget != null ? budget - spent : null
  const over = left != null && left < 0
  const lvl = level(budget, spent)
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <section className={`tank ${over ? 'is-over' : ''}`}>
        <div className="tank-fill" style={{ height: `${budget == null ? 0 : lvl * 44}%` }}>
          <svg className="wave" viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 10 Q 50 0 100 8 T 200 8 T 300 8 T 400 6 V16 H0 Z" />
          </svg>
        </div>

        <header className="tank-top">
          <p>{partOfDay()},<br /><b>{profile.name}</b></p>
          <button className="avatar" onClick={openSwitch} aria-label="Switch account">{profile.emoji}</button>
        </header>

        {budget == null ? (
          <div className="tank-setup">
            <p>Your tank is empty until we know your numbers.</p>
            <button className="btn-fill" onClick={goSetup}>Set my budget</button>
          </div>
        ) : (
          <div className="tank-num">
            <span className="num">{over ? '−' : ''}{fmt(Math.abs(left))}</span>
            <span className="unit">{over ? 'kcal over budget' : 'kcal left today'}</span>
          </div>
        )}

        <div className="tank-foot">
          <span>{date}</span>
          {budget != null && <span>{fmt(spent)} eaten of {fmt(budget)}</span>}
        </div>
      </section>

      <div className="section-head">
        <h2>Eaten today</h2>
        {todays.length > 0 && <span>{todays.length} {todays.length > 1 ? 'meals' : 'meal'}</span>}
      </div>

      {todays.length === 0 ? (
        <p className="empty">Nothing eaten yet. Tap <b>+</b> before your next bite and watch the tank.</p>
      ) : (
        <ul className="gallery">
          {todays.map((e) => <Tile key={e.id} e={e} onDelete={() => removeEntry(e.id)} />)}
        </ul>
      )}
    </>
  )
}

export function Tile({ e, onDelete }) {
  const [open, setOpen] = useState(false)
  const time = new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <li className="tile" onClick={() => onDelete && setOpen((o) => !o)}>
      <div className="tile-img">
        {e.photo ? <img src={e.photo} alt="" /> : <span>{e.name.slice(0, 1).toUpperCase()}</span>}
        <b className="tile-kcal">{fmt(e.kcal)}</b>
        {open && (
          <button className="tile-del" onClick={(ev) => { ev.stopPropagation(); onDelete() }}>Remove</button>
        )}
      </div>
      <p className="tile-name">{e.name}</p>
      <p className="tile-meta">{e.meal}, {time}</p>
    </li>
  )
}
