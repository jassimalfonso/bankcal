import { useState } from 'react'
import { ACTIVITY, ageOf, DEFAULT_BED, DEFAULT_WAKE, GOALS, breakdown, dailyBudget, dayKey, fmt, prettyDate, recommendDates } from '../calc'
import Character from '../Character'
import { THEMES, BuddyGrid } from './Onboarding'
import { logOut } from '../firebase'

// Each background comes with a matching colour; you can still pick another colour after.
const BACKGROUNDS = [
  { id: 'plain', label: 'Plain', theme: null, dot: null }, { id: 'glow', label: 'Glow', theme: 'moss', dot: '#45b866' },
  { id: 'sunrise', label: 'Sunrise', theme: 'coral', dot: '#ef6b57' }, { id: 'ocean', label: 'Ocean', theme: 'teal', dot: '#1f9e9a' },
  { id: 'meadow', label: 'Meadow', theme: 'moss', dot: '#45b866' }, { id: 'lavender', label: 'Lavender', theme: 'violet', dot: '#8a63e6' },
]

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
            : 'Fill in your birthday, height and weight below.'}
        </p>
      </section>

      <h2 className="group-title" id="about">About you</h2>
      <div className="card form-list">
        <Line label="Sex">
          <div className="seg">
            <button className={p.sex === 'm' ? 'on' : ''} onClick={() => set({ sex: 'm' })}>Male</button>
            <button className={p.sex === 'f' ? 'on' : ''} onClick={() => set({ sex: 'f' })}>Female</button>
          </div>
        </Line>
        <Line label="Birthday">
          <span className="bday">
            <input className="date-in" type="date" value={p.birthDate ?? ''} max={dayKey()} onChange={(e) => set({ birthDate: e.target.value })} />
            {ageOf(p) && <small>{ageOf(p)} yrs</small>}
          </span>
        </Line>
        <Line label="Height">
          <div className="num-row">
            <Num value={h.ft} onChange={(e) => setHeight({ ft: e.target.value.replace(/\D/g, '').slice(0, 1) })} unit="ft" ph="5" />
            <Num value={h.inch} onChange={(e) => setHeight({ inch: e.target.value.replace(/\D/g, '').slice(0, 2) })} unit="in" ph="9" />
          </div>
        </Line>
        <Line label="Weight"><Num value={p.weight} onChange={num('weight')} unit="kg" ph="80" decimal /></Line>
      </div>

      <h2 className="group-title">Your day</h2>
      <div className="card form-list">
        <Line label="Wake up"><input className="date-in" type="time" value={p.wakeTime ?? DEFAULT_WAKE} onChange={(e) => set({ wakeTime: e.target.value })} /></Line>
        <Line label="Bedtime"><input className="date-in" type="time" value={p.bedTime ?? DEFAULT_BED} onChange={(e) => set({ bedTime: e.target.value })} /></Line>
      </div>
      <p className="fine">Your morning card appears when your day starts. An hour before bed, “Close my day” appears, and at bedtime BankCal offers to close it for you. Late-night snacks after midnight still count to the day you’re in.</p>

      <h2 className="group-title">How active are you?</h2>
      <div className="card form-list">
        {ACTIVITY.map((a) => (
          <button key={a.id} className="pick" onClick={() => set({ activity: a.id })}>
            <span><b>{a.label}</b><small>{a.hint}</small></span>
            <span className={`check ${p.activity === a.id ? 'on' : ''}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <p className="fine">Tip: if you log steps and workouts in Deposits, choose <b>Desk job</b>. Higher levels already include exercise, so BankCal won’t add your logged activity on top.</p>

      <h2 className="group-title">Your plan</h2>
      <div className="card form-list">
        <Line label="Target weight"><Num value={p.targetWeight ?? ''} onChange={num('targetWeight')} unit="kg" ph="75" decimal /></Line>
        <Line label="Start date"><input className="date-in" type="date" value={p.startDate ?? dayKey()} onChange={(e) => set({ startDate: e.target.value })} /></Line>
        <Line label="Reach it by"><input className="date-in" type="date" value={p.endDate ?? ''} min={dayKey()} onChange={(e) => set({ endDate: e.target.value })} /></Line>
      </div>
      {+p.targetWeight > 0 && +p.weight > +p.targetWeight && (
        <div className="recs">
          <p className="recs-title">When to aim for {p.targetWeight} kg</p>
          <div className="recs-row">
            {recommendDates(p.weight, p.targetWeight).map((r) => (
              <button key={r.id} className={`rec ${p.endDate === r.date ? 'on' : ''} ${r.best ? 'best' : ''}`} onClick={() => set({ endDate: r.date, startDate: dayKey() })}>
                <b>{r.label}</b>
                <span>{prettyDate(r.date)}</span>
                <small>{r.rate} kg/week · {r.note}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {bd?.plan && (
        <div className={`card plan-note ${bd.plan.tooFast ? 'warn' : ''}`}>
          {bd.plan.reached ? (
            <p><b>You’re at your target.</b> Your budget is set to maintain.</p>
          ) : bd.plan.tooFast ? (
            <p><b>That date is too fast.</b> Losing {bd.plan.toLose.toFixed(1)} kg in {bd.plan.daysLeft} days needs {fmt(bd.plan.needed)} kcal less a day. BankCal caps it at a safe 1,000. A realistic date is <b>{prettyDate(bd.plan.realisticEnd)}</b>.
              <button className="link-btn" onClick={() => set({ endDate: bd.plan.realisticEnd })}>Use that date</button></p>
          ) : (
            <p><b>On plan.</b> {bd.plan.toLose.toFixed(1)} kg to go in {bd.plan.daysLeft} days, so you eat {fmt(bd.plan.deficit)} kcal less than you burn each day.</p>
          )}
        </div>
      )}

      <h2 className="group-title">Daily activity targets</h2>
      <div className="card form-list">
        <Line label="Steps"><Num value={p.stepsGoal ?? ''} onChange={num('stepsGoal')} unit="steps" ph="8000" /></Line>
        <Line label="Treadmill"><Num value={p.treadGoalMin ?? ''} onChange={num('treadGoalMin')} unit="min" ph="30" /></Line>
        <Line label="Treadmill speed"><Num value={p.treadSpeed ?? ''} onChange={num('treadSpeed')} unit="km/h" ph="5" decimal /></Line>
      </div>

      <h2 className="group-title">{bd?.plan ? 'Simple goal (not used while a plan is set)' : 'Or a simple goal'}</h2>
      <div className="card form-list">
        {GOALS.map((g) => (
          <button key={g.id} className="pick" onClick={() => set({ goal: g.id })}>
            <span><b>{g.label}</b><small>{g.hint}</small></span>
            <span className={`check ${p.goal === g.id ? 'on' : ''}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <h2 className="group-title">Buddy</h2>
      <div className="card buddy-card"><BuddyGrid value={p.character} onChange={(id) => set({ character: id })} /></div>

      <h2 className="group-title">Look and feel</h2>
      <div className="card form-list">
        <Line label="Colour">
          <div className="swatches small">
            {THEMES.map((t) => (
              <button key={t} className={`swatch theme-${t} ${p.theme === t ? 'on' : ''}`} onClick={() => set({ theme: t })} aria-label={t} />
            ))}
          </div>
        </Line>
        <div className="line bg-line">
          <span className="line-label">Background</span>
          <div className="bg-row">
            {BACKGROUNDS.map((b) => (
              <button key={b.id} className={`bg-swatch bgs-${b.id} ${(p.bg ?? 'glow') === b.id ? 'on' : ''}`} onClick={() => set(b.theme ? { bg: b.id, theme: b.theme } : { bg: b.id })} aria-label={b.label} title={b.label}>
                {b.dot && <i style={{ background: b.dot }} />}
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        </div>
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
      <p className="fine disclaimer">BankCal gives estimates from standard methods: the Mifflin-St Jeor equation for calories burned at rest, standard activity multipliers, the Compendium of Physical Activities for exercise, about 7,700 kcal per kg of body fat, and WHO BMI categories. Real results vary from person to person. It isn’t medical advice, so check with a doctor before big changes, especially if you’re pregnant, under 18, or managing a health condition.</p>
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
