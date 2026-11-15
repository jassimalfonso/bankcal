import { useState } from 'react'
import { fmt } from '../calc'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Today({ profile, todays, budget, removeEntry, openSwitch, goSetup }) {
  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  const left = budget != null ? budget - spent : null
  const pct = budget ? Math.min(100, (spent / budget) * 100) : 0
  const over = left != null && left < 0

  return (
    <>
      <header className="top">
        <div>
          <p className="muted">{greeting()},</p>
          <h1 className="hello">{profile.name}</h1>
        </div>
        <button className="avatar" onClick={openSwitch} aria-label="Switch profile">
          {profile.emoji}
        </button>
      </header>

      <section className={`card ${over ? 'is-over' : ''}`}>
        <div className="card-row">
          <span className="card-label">{over ? 'Overdrawn' : 'Available today'}</span>
          <span className="chip-date">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>

        {budget == null ? (
          <div className="card-setup">
            <p>Set your metrics to open your daily budget.</p>
            <button className="btn-light" onClick={goSetup}>Set up budget</button>
          </div>
        ) : (
          <>
            <div className="balance">
              <span className="num">{over ? '−' : ''}{fmt(Math.abs(left))}</span>
              <span className="unit">kcal</span>
            </div>
            <div className="meter" aria-hidden="true">
              <div className="meter-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="card-foot">
              <div><small>Budget</small><b>{fmt(budget)}</b></div>
              <div><small>Spent</small><b>{fmt(spent)}</b></div>
              <div><small>Status</small><b className="pill">{over ? 'Surplus' : spent === 0 ? 'Fresh day' : 'In deficit'}</b></div>
            </div>
          </>
        )}
        <div className="card-name">Account — {profile.name}</div>
      </section>

      <div className="section-head">
        <h2>Today’s receipts</h2>
        {todays.length > 0 && <span className="muted">{todays.length} item{todays.length > 1 ? 's' : ''}</span>}
      </div>

      {todays.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🧾</div>
          <p>Nothing spent yet.</p>
          <p className="muted">Tap <b>+</b> to log what you’re about to eat.</p>
        </div>
      ) : (
        <ul className="receipts">
          {todays.map((e) => <Receipt key={e.id} e={e} onDelete={() => removeEntry(e.id)} />)}
        </ul>
      )}
    </>
  )
}

export function Receipt({ e, onDelete }) {
  const [open, setOpen] = useState(false)
  const time = new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <li className={`receipt ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)}>
      {e.photo ? <img className="thumb" src={e.photo} alt="" /> : <div className="thumb ph">{e.name.slice(0, 1).toUpperCase()}</div>}
      <div className="r-mid">
        <b>{e.name}</b>
        <small>{e.meal} · {time}</small>
      </div>
      {open && onDelete ? (
        <button className="r-del" onClick={(ev) => { ev.stopPropagation(); onDelete() }}>Delete</button>
      ) : (
        <span className="r-amt">−{fmt(e.kcal)}</span>
      )}
    </li>
  )
}
