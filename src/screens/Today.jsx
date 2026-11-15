import { useMemo, useState } from 'react'
import { fmt } from '../calc'
import Character, { moodFor } from '../Character'
import Activity from './Activity'

function message(name, budget, spent) {
  if (budget == null) return `${name} is asleep until you set a daily budget.`
  const left = budget - spent
  if (left < 0) return `${name} went ${fmt(-left)} kcal over. Tomorrow is a fresh start.`
  if (spent === 0) return `Full tank. ${name} is ready for the day.`
  if (left / budget < 0.15) return `Nearly empty. Pick something light next.`
  return `${name} is feeling light. Keep it going.`
}

export function Ring({ value, size = 220, stroke = 20, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        {value > 0 && <circle
          cx={size / 2} cy={size / 2} r={r} className="ring-bar" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />}
      </svg>
      <div className="ring-inner">{children}</div>
    </div>
  )
}

export default function Today(props) {
  const { profile, mine, todays, budget, base, earn, addEntry, removeEntry, goSetup } = props
  const [toast, setToast] = useState(null)
  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  const left = budget != null ? budget - spent : null
  const over = left != null && left < 0
  const mood = moodFor(budget, spent)
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const recent = useMemo(() => {
    const seen = new Set()
    return mine.filter((e) => {
      const k = e.name.trim().toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }).slice(0, 6)
  }, [mine])

  function quickAdd(r) {
    const id = addEntry({ name: r.name, kcal: r.kcal, meal: r.meal, photo: r.photo })
    navigator.vibrate?.(10)
    setToast({ id, text: `Added ${r.name}` })
    clearTimeout(quickAdd.t)
    quickAdd.t = setTimeout(() => setToast(null), 3500)
  }

  return (
    <>
      <header className="large-title">
        <div>
          <p className="date">{date}</p>
          <h1>Hi, {profile.name}</h1>
        </div>
        <button className="char-btn" onClick={goSetup} aria-label="Settings">
          <Character kind={profile.character} mood={mood} size={44} />
        </button>
      </header>

      <section className={`card hero ${over ? 'is-over' : ''}`}>
        <Ring value={budget ? (over ? 1 : left / budget) : 0}>
          <Character kind={profile.character} mood={mood} size={112} className="bob" />
        </Ring>

        {budget == null ? (
          <div className="hero-setup">
            <p className="hero-msg">{message(profile.name, budget, spent)}</p>
            <button className="btn-primary" onClick={goSetup}>Set my budget</button>
          </div>
        ) : (
          <>
            <div className="hero-num">
              <b>{fmt(Math.abs(left))}</b>
              <span>{over ? 'kcal over' : 'kcal left'}</span>
            </div>
            <p className="hero-msg">{message(profile.name, budget, spent)}</p>
            <div className="hero-stats three">
              <div><b>{fmt(spent)}</b><span>Eaten</span></div>
              <div><b className="pos">+{fmt(earn.total)}</b><span>Earned</span></div>
              <div><b>{fmt(base)}</b><span>Budget</span></div>
            </div>
          </>
        )}
      </section>

      {budget != null && <Activity {...props} />}

      {recent.length > 0 && (
        <>
          <h2 className="group-title">Eat again</h2>
          <div className="quick">
            {recent.map((r) => (
              <button key={r.id} className="quick-chip" onClick={() => quickAdd(r)}>
                {r.photo ? <img src={r.photo} alt="" /> : <span className="q-dot">+</span>}
                <span className="q-name">{r.name}</span>
                <span className="q-kcal">{fmt(r.kcal)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <h2 className="group-title">Meals</h2>
      {todays.length === 0 ? (
        <div className="card empty">
          <p>No meals yet today.</p>
          <p className="muted">Tap the + button before you eat.</p>
        </div>
      ) : (
        <ul className="card list">
          {todays.map((e) => <Row key={e.id} e={e} onDelete={() => removeEntry(e.id)} />)}
        </ul>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          <button onClick={() => { removeEntry(toast.id); setToast(null) }}>Undo</button>
        </div>
      )}
    </>
  )
}

export function Row({ e, onDelete }) {
  const [open, setOpen] = useState(false)
  const time = new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <li className="row" onClick={() => onDelete && setOpen((o) => !o)}>
      {e.photo ? <img className="row-img" src={e.photo} alt="" /> : <span className="row-img ph">{e.name.slice(0, 1).toUpperCase()}</span>}
      <div className="row-text">
        <b>{e.name}</b>
        <small>{e.meal} at {time}</small>
      </div>
      {open && onDelete ? (
        <button className="row-del" onClick={(ev) => { ev.stopPropagation(); onDelete() }}>Remove</button>
      ) : (
        <span className="row-kcal">{fmt(e.kcal)}<small> kcal</small></span>
      )}
    </li>
  )
}
