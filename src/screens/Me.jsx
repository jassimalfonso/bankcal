import { ACTIVITY, GOALS, breakdown, dailyBudget, fmt } from '../calc'

const EMOJIS = ['👾', '🐀', '💨', '🦨', '🐷', '🦖', '🐸', '🍑', '🧌', '🐙']

export default function Me({ pid, profile: p, updateProfile, openSwitch, state, setMode }) {
  const set = (patch) => updateProfile(pid, patch)
  const num = (k) => (e) => set({ [k]: e.target.value.replace(/[^\d.]/g, '') })
  const bd = breakdown(p)
  const budget = dailyBudget(p)

  return (
    <>
      <header className="top">
        <div>
          <p className="muted">Profile & budget</p>
          <h1 className="hello">{p.name}</h1>
        </div>
        <button className="avatar" onClick={openSwitch} aria-label="Switch profile">{p.emoji}</button>
      </header>

      <section className="budget-box">
        <small>Daily budget</small>
        <div className="balance dark">
          <span className="num">{budget != null ? fmt(budget) : '—'}</span>
          <span className="unit">kcal</span>
        </div>
        {bd ? (
          <p className="calc-line">
            BMR {fmt(bd.bmr)} × activity = {fmt(bd.tdee)} burn/day
            {bd.deficit ? ` − ${bd.deficit} goal` : ''}
            {bd.auto === bd.floor ? ` (raised to ${bd.floor} safe minimum)` : ''}
            {p.customBudget > 0 ? ' · custom override on' : ''}
          </p>
        ) : (
          <p className="calc-line">Fill in age, height and weight below.</p>
        )}
      </section>

      <div className="form">
        <div className="group">
          <span className="g-label">Avatar</span>
          <div className="emoji-row">
            {EMOJIS.map((e) => (
              <button key={e} className={`emoji ${p.emoji === e ? 'on' : ''}`} onClick={() => set({ emoji: e })}>{e}</button>
            ))}
          </div>
        </div>

        <div className="grid3">
          <label className="field"><span>Age</span><input inputMode="numeric" value={p.age} onChange={num('age')} placeholder="30" /></label>
          <label className="field"><span>Height <i>cm</i></span><input inputMode="numeric" value={p.height} onChange={num('height')} placeholder="175" /></label>
          <label className="field"><span>Weight <i>kg</i></span><input inputMode="decimal" value={p.weight} onChange={num('weight')} placeholder="80" /></label>
        </div>

        <div className="group">
          <span className="g-label">Body</span>
          <div className="seg two">
            <button className={p.sex === 'm' ? 'on' : ''} onClick={() => set({ sex: 'm' })}>Male</button>
            <button className={p.sex === 'f' ? 'on' : ''} onClick={() => set({ sex: 'f' })}>Female</button>
          </div>
        </div>

        <div className="group">
          <span className="g-label">Activity</span>
          <div className="options">
            {ACTIVITY.map((a) => (
              <button key={a.id} className={`opt ${p.activity === a.id ? 'on' : ''}`} onClick={() => set({ activity: a.id })}>
                <b>{a.label}</b><small>{a.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="group">
          <span className="g-label">Goal</span>
          <div className="options">
            {GOALS.map((g) => (
              <button key={g.id} className={`opt ${p.goal === g.id ? 'on' : ''}`} onClick={() => set({ goal: g.id })}>
                <b>{g.label}</b><small>{g.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="group">
          <span className="g-label">Appearance</span>
          <div className="seg three">
            {['auto', 'light', 'dark'].map((m) => (
              <button key={m} className={state.mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Custom budget <i>optional — overrides the calculation</i></span>
          <input inputMode="numeric" value={p.customBudget} onChange={num('customBudget')} placeholder={bd ? String(bd.auto) : 'e.g. 1800'} />
        </label>

        <div className="install">
          <b>Put Cal Bank on your home screen</b>
          <p><b>iPhone:</b> open in Safari → Share → Add to Home Screen.</p>
          <p><b>Android:</b> open in Chrome → ⋮ menu → Install app.</p>
        </div>
        <p className="foot muted">Cal Bank v0.1 · data stays on this phone</p>
      </div>
    </>
  )
}
