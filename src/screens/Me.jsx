import { useState, Children, cloneElement, isValidElement } from 'react'
import { maintainStatus, targetCheck, KCAL_PER_KG, ageOf, DEFAULT_BED, DEFAULT_WAKE, breakdown, dailyBudget, dayKey, fmt, prettyDate, recommendDates } from '../calc'
import Character from '../Character'
import { HabitPicker } from './Habits'
import { BUILD, VERSION } from '../update'
import { lastLookup } from '../ai'
import { PartnerSettings } from './Partner'
import { BreaksSettings } from './Breaks'
import { THEMES, BuddyGrid } from './Onboarding'
import { logOut } from '../firebase'
import { soundOn, setSoundOn, testSound } from '../sound'

// Each background comes with a matching colour; you can still pick another colour after.
const BACKGROUNDS = [
  { id: 'plain', label: 'Plain', theme: null, dot: null }, { id: 'glow', label: 'Glow', theme: 'moss', dot: '#45b866' },
  { id: 'sunrise', label: 'Sunrise', theme: 'coral', dot: '#ef6b57' }, { id: 'ocean', label: 'Ocean', theme: 'teal', dot: '#1f9e9a' },
  { id: 'meadow', label: 'Meadow', theme: 'moss', dot: '#45b866' }, { id: 'lavender', label: 'Lavender', theme: 'violet', dot: '#8a63e6' },
  { id: 'sakura', label: 'Sakura', theme: 'berry', dot: '#d2417b' }, { id: 'beach', label: 'Beach', theme: 'sky', dot: '#3b97e8' },
  { id: 'peach', label: 'Peach', theme: 'sun', dot: '#f0952a' }, { id: 'dusk', label: 'Dusk', theme: 'navy', dot: '#3556c9' },
  { id: 'paper', label: 'Paper', theme: 'mono', dot: '#2b2b30' },
]

// Height is stored in cm (for the maths) but entered in feet + inches.
export const toFtIn = (cm) => {
  if (!(cm > 0)) return { ft: '', inch: '' }
  const total = cm / 2.54
  let ft = Math.floor(total / 12)
  let inch = Math.round(total - ft * 12)
  if (inch === 12) { ft += 1; inch = 0 }
  return { ft: String(ft), inch: String(inch) }
}
export const toCm = (ft, inch) => (+ft > 0 ? Math.round(((+ft || 0) * 12 + (+inch || 0)) * 2.54) : '')

export default function Me({ user, profile: p, updateProfile, resetProgress, partner, openWords, today, celebrate, notify }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const set = updateProfile
  const num = (k) => (e) => set({ [k]: e.target.value.replace(/[^\d.]/g, '') })
  const [h, setH] = useState(() => toFtIn(p.height))
  const setHeight = (patch) => {
    const next = { ...h, ...patch }
    setH(next)
    set({ height: toCm(next.ft, next.inch) })
  }
  const bd = breakdown(p)
  const ms = maintainStatus(p)
  // reached the target: stop the plan and keep this weight
  const keepIt = () => set({ goal: 'maintain', maintainWeight: +p.targetWeight || +p.weight, targetWeight: null, endDate: null, startDate: null, customBudget: null })
    // Maintain from the simple goal: keep today's weight and clear the plan and any custom budget so maintenance applies
    const goMaintain = () => set({ goal: 'maintain', maintainWeight: +p.weight || null, targetWeight: null, endDate: null, startDate: null, customBudget: null })
    const tc = targetCheck(p.targetWeight, p.height)
  const budget = dailyBudget(p)
  const maintaining = p.goal === 'maintain'

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
          {p.customBudget > 0 ? 'Using your own number (under More settings).'
            : bd ? `You burn about ${fmt(bd.tdee)} kcal on a normal day${bd.deficit ? `, and your goal takes off ${fmt(bd.deficit)}` : ''}.${bd.auto === bd.floor ? ` Kept at the safe minimum of ${fmt(bd.floor)}.` : ''} Steps and workouts you log add more.`
            : 'Fill in About you below to work out your budget.'}
        </p>
      </section>

      <h2 className="group-title">Your goal</h2>
      <div className="seg goal-seg">
        <button className={!maintaining ? 'on' : ''} onClick={() => maintaining && set({ goal: 'lose05', maintainWeight: null })}>Lose weight</button>
        <button className={maintaining ? 'on' : ''} onClick={() => !maintaining && goMaintain()}>Maintain</button>
      </div>

      {!maintaining && (
        <>
          <div className="card form-list goal-card">
            <Line label="Target weight"><Num value={p.targetWeight ?? ''} onChange={num('targetWeight')} unit="kg" ph="75" decimal /></Line>
          </div>
          {+p.targetWeight > 0 && +p.weight > +p.targetWeight ? (
            <div className="recs">
              <p className="recs-title">How fast?</p>
              <div className="recs-row">
                {recommendDates(p.weight, p.targetWeight).map((r) => (
                  <button key={r.id} className={`rec ${p.endDate === r.date ? 'on' : ''} ${r.best ? 'best' : ''}`} onClick={() => set({ endDate: r.date, startDate: dayKey() })}>
                    <b>{r.label}</b>
                    <span>{prettyDate(r.date)}</span>
                    <small>{r.rate} kg/week</small>
                  </button>
                ))}
              </div>
              <details className="own-date">
                <summary>Or choose my own date</summary>
                <input className="date-in" type="date" aria-label="Reach my target by" value={p.endDate ?? ''} min={dayKey()} onChange={(e) => set({ endDate: e.target.value, startDate: dayKey() })} />
              </details>
            </div>
          ) : !(+p.targetWeight > 0) && (
            <p className="fine">Add a target to see when you could reach it. Until then BankCal takes off 550 kcal a day, about 0.5 kg a week.</p>
          )}
        </>
      )}
      {bd?.plan && (
        <div className={`card plan-note ${bd.plan.tooFast || bd.plan.expired ? 'warn' : ''}`}>
          {bd.plan.reached ? (
            <p><b>🎉 You’ve reached {p.targetWeight} kg.</b> Your budget is now set to maintain this weight.
              <button className="link-btn" onClick={keepIt}>Switch to maintain</button></p>
          ) : bd.plan.expired ? (
            <p><b>Your plan ended on {prettyDate(p.endDate)}</b> with {bd.plan.toLose.toFixed(1)} kg still to go. Until you pick a new date, BankCal takes off 550 kcal a day. A realistic one is <b>{prettyDate(bd.plan.realisticEnd)}</b>.
              <button className="link-btn" onClick={() => set({ endDate: bd.plan.realisticEnd, startDate: dayKey() })}>Use that date</button></p>
          ) : bd.plan.notStarted ? (
            <p><b>Your plan starts on {prettyDate(p.startDate)}.</b> </p>
          ) : bd.plan.tooFast ? (
            <p><b>That date is too fast.</b> Losing {bd.plan.toLose.toFixed(1)} kg in {bd.plan.daysLeft} days needs {fmt(bd.plan.needed)} kcal less a day. BankCal caps it at a safe 1,000, so you’ll lose about {bd.plan.rate} kg a week, not {bd.plan.rateNeeded}. A realistic date is <b>{prettyDate(bd.plan.realisticEnd)}</b>.
              <button className="link-btn" onClick={() => set({ endDate: bd.plan.realisticEnd })}>Use that date</button></p>
          ) : (
            <p><b>{bd.plan.pace === 'fast' ? 'On plan, at a fast pace.' : 'On plan.'}</b> {bd.plan.toLose.toFixed(1)} kg to go in {bd.plan.daysLeft} days, so you eat {fmt(bd.plan.deficit)} kcal less than you burn each day.</p>
          )}
        </div>
      )}
      {bd?.plan?.active && bd.plan.pace !== 'steady' && <PaceTable plan={bd.plan} weight={+p.weight} />}
      {tc?.tooLow && (
        <div className="card plan-note warn">
          <p><b>{p.targetWeight} kg is below a healthy weight for your height</b> (BMI {tc.bmi}; healthy starts at 18.5). The lowest healthy weight for you is about <b>{tc.lowest} kg</b>.
            <button className="link-btn" onClick={() => set({ targetWeight: tc.lowest })}>Aim for {tc.lowest} kg</button></p>
        </div>
      )}
      {ms && (
        <div className={`card plan-note ${ms.status === 'in' ? '' : 'warn'}`}>
          {ms.status === 'in' ? (
            <p><b>Maintaining {ms.keep} kg.</b> You’re {ms.diff === 0 ? 'right on it' : `${Math.abs(ms.diff)} kg ${ms.diff > 0 ? 'above' : 'below'}`}, inside your healthy range of {ms.low.toFixed(1)}–{ms.high.toFixed(1)} kg. Day-to-day swings like this are normal.</p>
          ) : ms.status === 'above' ? (
            <p><b>You’re {ms.diff} kg above the {ms.keep} kg you’re keeping.</b> A gentle reset brings it back without strict dieting.
              <button className="link-btn" onClick={() => set({ goal: 'lose025', maintainWeight: null, targetWeight: ms.keep, endDate: null })}>Ease back to {ms.keep} kg</button></p>
          ) : (
            <p><b>You’re {Math.abs(ms.diff)} kg below the {ms.keep} kg you’re keeping.</b> If that wasn’t planned, eat a little more, or keep the new weight.
              <button className="link-btn" onClick={() => set({ maintainWeight: +p.weight })}>Keep {p.weight} kg instead</button></p>
          )}
        </div>
      )}


      <BreaksSettings profile={p} updateProfile={updateProfile} today={today} partner={partner} celebrate={celebrate} notify={notify} />

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
            <input className="date-in" type="date" aria-label="Birthday" value={p.birthDate ?? ''} max={dayKey()} onChange={(e) => set({ birthDate: e.target.value })} />
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
        <Line label="Weigh-in">
          <select className="date-in" value={p.weighFreq === 'weekly' ? String(p.weighDay ?? 5) : 'daily'} onChange={(e) => set(e.target.value === 'daily' ? { weighFreq: 'daily' } : { weighFreq: 'weekly', weighDay: +e.target.value })} aria-label="How often you weigh in">
            <option value="daily">Every morning</option>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>Weekly, {d}</option>)}
          </select>
        </Line>
        <label className="line toggle-line">
          <span className="line-label">Morning welcome<small>Verse and motivation on your first open each day</small></span>
          <input type="checkbox" className="switch" checked={p.morningCard !== false} onChange={(e) => set({ morningCard: e.target.checked })} />
        </label>
        {openWords && <button className="line link-line" onClick={openWords}>Show it now</button>}
        <SoundLine />
      </div>
      <p className="fine">A new day starts at midnight. If the morning welcome is on, it greets you the first time you open the app that day. An hour before bed, “Close my day” appears, and at bedtime BankCal offers to close it for you. Anything eaten after midnight counts toward the new day.</p>

      <HabitPicker profile={p} updateProfile={set} />

      {partner && <PartnerSettings partner={partner} profile={p} updateProfile={set} />}

      <h2 className="group-title">Buddy</h2>
      <div className="card buddy-card"><BuddyGrid value={p.character} onChange={(id) => set({ character: id })} /></div>

      <h2 className="group-title">Look and feel</h2>
      <div className="card form-list">
        <div className="line colour-line">
          <span className="line-label">Colour</span>
          <div className="swatches small">
            {THEMES.map((t) => (
              <button key={t} className={`swatch theme-${t} ${p.theme === t ? 'on' : ''}`} onClick={() => set({ theme: t })} aria-label={t} aria-pressed={p.theme === t} />
            ))}
          </div>
        </div>
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
      </div>

      <details className="more card">
        <summary>More settings</summary>
      <h3 className="more-h">Daily activity targets</h3>
        <div className="form-list">
        <Line label="Steps"><Num value={p.stepsGoal ?? ''} onChange={num('stepsGoal')} unit="steps" ph="8000" /></Line>
        <Line label="Treadmill"><Num value={p.treadGoalMin ?? ''} onChange={num('treadGoalMin')} unit="min" ph="30" /></Line>
        <Line label="Treadmill speed"><Num value={p.treadSpeed ?? ''} onChange={num('treadSpeed')} unit="km/h" ph="5" decimal /></Line>
        </div>

        <h3 className="more-h">Custom budget</h3>
        <div className="form-list">
          <Line label="Fixed daily budget"><Num value={p.customBudget ?? ''} onChange={num('customBudget')} unit="kcal" ph="Off" /></Line>
        </div>
        <p className="fine">Only if a doctor or dietitian gave you a number. It replaces your goal.</p>
        <h3 className="more-h">Start fresh</h3>
        {!confirmReset ? (
          <>
            <p className="fine">Clears your meals, steps, workouts, weigh-ins, sleep, habits and journal so you can begin again. Your name, buddy, body details and goal stay.</p>
            <button className="btn-plain danger" onClick={() => setConfirmReset(true)}>Reset my progress</button>
          </>
        ) : (
          <div className="reset-confirm">
            <p><b>Delete all your logged progress?</b> This can’t be undone.</p>
            <div className="rc-btns">
              <button className="btn-plain" onClick={() => setConfirmReset(false)}>Keep it</button>
              <button className="btn-plain danger solid" onClick={async () => { await resetProgress(); setConfirmReset(false) }}>Yes, start fresh</button>
            </div>
          </div>
        )}
        <h3 className="more-h">Add BankCal to your home screen</h3>
        <p className="fine">iPhone: open in Safari, tap Share, then Add to Home Screen. Android: open in Chrome, tap ⋮, then Install app.</p>
      </details>
      <button className="btn-plain" onClick={logOut}>Sign out</button>
      <p className="fine disclaimer">BankCal gives estimates from standard methods: the Mifflin-St Jeor equation for calories burned at rest, the Compendium of Physical Activities for exercise, about 7,700 kcal per kg of body fat, and WHO BMI categories. Real results vary from person to person. It isn’t medical advice, so check with a doctor before big changes, especially if you’re pregnant, under 18, or managing a health condition.</p>
      <p className="foot">BankCal version {VERSION} ({BUILD}). Updates itself. Synced to your Google account and works offline.</p>
      {(() => {
        const l = lastLookup()
        return l && <p className="foot">Last online {l.kind === 'photo' ? 'photo' : 'food'} lookup: {(l.total / 1000).toFixed(1)} s, of which the AI took {(l.ai / 1000).toFixed(1)} s ({l.model.replace('gemini-', '')}).</p>
      })()}
    </>
  )
}

function Line({ label, children }) {
  // give a bare input inside the row an accessible name from the row label
  const kids = Children.map(children, (c) => (isValidElement(c) && (c.type === 'input' || c.type === Num) && !c.props['aria-label'] ? cloneElement(c, { 'aria-label': label }) : c))
  return (
    <div className="line">
      <span className="line-label">{label}</span>
      {kids}
    </div>
  )
}

function Num({ value, onChange, unit, ph, decimal, 'aria-label': al }) {
  return (
    <label className="num-in">
      <input inputMode={decimal ? 'decimal' : 'numeric'} value={value} onChange={onChange} placeholder={ph} aria-label={al} />
      <span>{unit}</span>
    </label>
  )
}

// What the plan means each week: needed pace vs what BankCal will budget, and how hard that is.
function PaceTable({ plan, weight }) {
  const label = { steady: 'Steady and easy to keep', fast: 'Fast but within safe limits', extreme: 'Extreme' }[plan.pace]
  const perMonth = Math.round(plan.rate * 4.35 * 10) / 10
  return (
    <div className="card pace">
      <div className="pace-row"><span>Your date needs</span><b>{plan.rateNeeded} kg/week</b></div>
      <div className="pace-row"><span>That’s</span><b>{plan.pctPerWeek}% of body weight a week</b></div>
      <div className="pace-row"><span>Your budget gives</span><b>≈ {plan.rate} kg/week · {perMonth} kg/month</b></div>
      <div className="pace-row"><span>Pace</span><b className={`pace-tag ${plan.pace}`}>{label}</b></div>
      <p className="fine">Each kg of body fat is about {KCAL_PER_KG.toLocaleString('en')} kcal. Most of the loss is fat at these rates, though the first week or two also drops some water. Safe guidance is up to about 1 kg (or 1% of body weight) a week{weight ? `, ${Math.min(1, Math.round(weight) / 100).toFixed(2)} kg for you` : ''}.</p>
    </div>
  )
}

// Sounds are a choice for this phone only
function SoundLine() {
  const [on, setOn] = useState(soundOn)
  const [res, setRes] = useState('')
  const test = async () => {
    const r = await testSound()
    setRes(r === 'ok' ? 'Playing now. If you hear nothing, turn up the media volume. On iPhone, also switch off Silent mode.' : r === 'blocked' ? 'This phone blocked the sound. Tap the button once more.' : 'This browser can’t play app sounds.')
  }
  return (
    <>
      <label className="line toggle-line">
        <span className="line-label">Sounds<small>Cheers, notes, milestones, deposits and habits</small></span>
        <input type="checkbox" className="switch" checked={on} onChange={(e) => { setOn(e.target.checked); setSoundOn(e.target.checked) }} />
      </label>
      {on && <button className="line link-line" onClick={test}>🔊 Play a sound</button>}
      {on && res && <p className="line-status" role="status">{res}</p>}
    </>
  )
}
