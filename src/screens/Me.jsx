import { useState } from 'react'
import { ACTIVITY, GOALS, breakdown, dailyBudget, fmt } from '../calc'
import Character, { CHARACTERS } from '../Character'
import { THEMES } from './Onboarding'
import { logOut } from '../firebase'

// Height is stored in cm (for the maths) but entered in feet + inches.
const toFtIn = (cm) => {
  if (!(cm > 0)) return { ft: '', inch: '' }
  const total = cm / 2.54
  let ft = Math.floor(total / 12)
  let inch = Math.round(total - ft * 12)
  if (inch === 12) { ft += 1; inch = 0 }
  return { ft: String(ft), inch: String(inch) }
}
const toCm = (ft, inch) => (+ft > 0 ? Math.round(((+ft || 0) * 12 + (+inch || 0)) * 2.54) : '')

export default function Me({ user, profile: p, updateProfile }) {
  const set = updateProfile
  const num = (k) => (e) => set({ [k]: e.target.value.replace(/[^\d.]/g, '') })
  const [h, setH] = useState(() => toFtIn(p.height))
  const setHeight = (patch) => {
    const next = { ...h, ...patch }
    setH(next)
    set({ height: toCm(next.ft, next.inch) })
  }
  const bd = breakdown(p)
  const budget = dailyBudget(p)

  return (
    <>
      <header className="large-title">
        <div>
          <p className="date">{user.email}</p>
          <h1>Settings</h1>
        </div>
      </header>

      <section className="card account">
        <Character kind={p.character} mood="happy" size={58} />
        <div>
          <input className="name-in" value={p.name} maxLength={24} onChange={(e) => set({ name: e.target.value })} aria-label="Your name in the app" />
          <small>Tap your name to change it</small>
        </div>
      </section>

      <section className="card budget-card">
        <span>Daily budget</span>
        <b>{budget != null ? fmt(budget) : '—'}<small> kcal</small></b>
        <p>
          {bd
            ? `You burn about ${fmt(bd.tdee)} kcal a day${bd.deficit ? `, minus ${bd.deficit} for your goal` : ''}.${bd.auto === bd.floor ? ` Kept at the safe minimum of ${fmt(bd.floor)}.` : ''}${p.customBudget > 0 ? ' Using your custom number.' : ''}`
            : 'Fill in your age, height and weight below.'}
        </p>
      </section>

      <h2 className="group-title">About you</h2>
      <div className="card form-list">
        <Line label="Sex">
          <div className="seg">
            <button className={p.sex === 'm' ? 'on' : ''} onClick={() => set({ sex: 'm' })}>Male</button>
            <button className={p.sex === 'f' ? 'on' : ''} onClick={() => set({ sex: 'f' })}>Female</button>
          </div>
        </Line>
        <Line label="Age"><Num value={p.age} onChange={num('age')} unit="yrs" ph="30" /></Line>
        <Line label="Height">
          <div className="num-row">
            <Num value={h.ft} onChange={(e) => setHeight({ ft: e.target.value.replace(/\D/g, '').slice(0, 1) })} unit="ft" ph="5" />
            <Num value={h.inch} onChange={(e) => setHeight({ inch: e.target.value.replace(/\D/g, '').slice(0, 2) })} unit="in" ph="9" />
          </div>
        </Line>
        <Line label="Weight"><Num value={p.weight} onChange={num('weight')} unit="kg" ph="80" decimal /></Line>
      </div>

      <h2 className="group-title">How active are you?</h2>
      <div className="card form-list">
        {ACTIVITY.map((a) => (
          <button key={a.id} className="pick" onClick={() => set({ activity: a.id })}>
            <span><b>{a.label}</b><small>{a.hint}</small></span>
            <span className={`check ${p.activity === a.id ? 'on' : ''}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <h2 className="group-title">Your goal</h2>
      <div className="card form-list">
        {GOALS.map((g) => (
          <button key={g.id} className="pick" onClick={() => set({ goal: g.id })}>
            <span><b>{g.label}</b><small>{g.hint}</small></span>
            <span className={`check ${p.goal === g.id ? 'on' : ''}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <h2 className="group-title">Look and feel</h2>
      <div className="card form-list">
        <Line label="Buddy">
          <div className="seg">
            {CHARACTERS.map((c) => (
              <button key={c.id} className={p.character === c.id ? 'on' : ''} onClick={() => set({ character: c.id })}>{c.id === 'cloud' ? 'Cloud' : 'Rat'}</button>
            ))}
          </div>
        </Line>
        <Line label="Colour">
          <div className="swatches small">
            {THEMES.map((t) => (
              <button key={t} className={`swatch theme-${t} ${p.theme === t ? 'on' : ''}`} onClick={() => set({ theme: t })} aria-label={t} />
            ))}
          </div>
        </Line>
        <Line label="Appearance">
          <div className="seg">
            {['auto', 'light', 'dark'].map((m) => (
              <button key={m} className={p.mode === m ? 'on' : ''} onClick={() => set({ mode: m })}>{m[0].toUpperCase() + m.slice(1)}</button>
            ))}
          </div>
        </Line>
        <Line label="Custom budget"><Num value={p.customBudget} onChange={num('customBudget')} unit="kcal" ph={bd ? String(bd.auto) : 'Off'} /></Line>
      </div>

      <div className="card note">
        <b>Add BankCal to your home screen</b>
        <p>iPhone: open in Safari, tap Share, then Add to Home Screen.</p>
        <p>Android: open in Chrome, tap the ⋮ menu, then Install app.</p>
      </div>
      <button className="btn-plain" onClick={logOut}>Sign out</button>
      <p className="foot">BankCal 0.2. Synced to your Google account and works offline.</p>
    </>
  )
}

function Line({ label, children }) {
  return (
    <div className="line">
      <span className="line-label">{label}</span>
      {children}
    </div>
  )
}

function Num({ value, onChange, unit, ph, decimal }) {
  return (
    <label className="num-in">
      <input inputMode={decimal ? 'decimal' : 'numeric'} value={value} onChange={onChange} placeholder={ph} />
      <span>{unit}</span>
    </label>
  )
}
