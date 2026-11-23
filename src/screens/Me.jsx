import { useEffect, useRef, useState, Children, cloneElement, isValidElement } from 'react'
import { useSideFit } from '../motion'
import { maintainStatus, targetCheck, KCAL_PER_KG, ageOf, DEFAULT_BED, DEFAULT_WAKE, breakdown, dailyBudget, dayKey, fmt, prettyDate, recommendDates } from '../calc'
import Character, { ACCESSORIES } from '../Character'
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
  const sideRef = useRef(null)
  useSideFit(sideRef)
  const set = updateProfile
  const num = (k) => (e) => set({ [k]: e.target.value.replace(/[^\d.]/g, '') })
  // Target weight: saved with clear feedback, then point to "How fast?"
  const saveTarget = (v) => {
    set({ targetWeight: v || null, ...(v ? {} : { endDate: null, startDate: null }) })
    if (!v) { notify?.('Target cleared. BankCal takes off 550 kcal a day.'); return }
    const togo = +p.weight - +v
    notify?.(togo > 0 ? `Target saved: ${v} kg, ${togo.toFixed(1)} kg to go. Pick how fast below 👇` : `Target saved: ${v} kg.`)
    setTimeout(() => document.querySelector('.recs')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
  }
  const pickPace = (date, label) => {
    const next = { ...p, endDate: date, startDate: dayKey() }
    set({ endDate: date, startDate: dayKey() })
    const b = dailyBudget(next)
    notify?.(`Plan saved${label ? ` (${label})` : ''}: ${p.targetWeight} kg by ${prettyDate(date)}.${b ? ` Your budget is ${fmt(b)} kcal a day.` : ''}`)
  }
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
    // switching to Maintain keeps your lose-weight plan aside, so switching back brings it all back
    const loseSaved = { goal: p.goal, targetWeight: p.targetWeight ?? null, endDate: p.endDate ?? null, startDate: p.startDate ?? null, customBudget: p.customBudget ?? null }
    const goMaintain = () => set({ goal: 'maintain', maintainWeight: +p.weight || null, losePlan: loseSaved, targetWeight: null, endDate: null, startDate: null, customBudget: null })
    const tc = targetCheck(p.targetWeight, p.height)
  const budget = dailyBudget(p)
  const maintaining = p.goal === 'maintain'

  return (
    <>
      <div className="side-col" ref={sideRef}>
      <header className="large-title">
        <div>
          <p className="date">{user.email}</p>
          <h1>Settings</h1>
        </div>
      </header>

      <nav className="jump-row" aria-label="Jump to a section">
        {[['goal', '🎯 Goal'], ['breaks', '🏖️ Breaks'], ['about', '👤 About you'], ['day', '🌙 Your day'], ['habits', '✅ Habits'], ...(partner ? [['partner', '🤝 Partner']] : []), ['buddy', '🥚 Buddy'], ['look', '🎨 Look']].map(([id, l]) => (
          <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{l}</button>
        ))}
      </nav>

      <section className="card account">
        <Character kind={p.character} mood="happy" size={58} acc={p.accessory} />
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
      </div>

      <h2 className="group-title" id="goal">Your goal</h2>
      <div className="seg goal-seg">
        <button className={!maintaining ? 'on' : ''} onClick={() => maintaining && set({ goal: 'lose05', ...(p.losePlan ?? {}), maintainWeight: null })}>Lose weight</button>
        <button className={maintaining ? 'on' : ''} onClick={() => { if (maintaining) return; goMaintain(); notify?.('Switched to Maintain. Your lose-weight plan is kept, tap Lose weight to bring it back.') }}>Maintain</button>
      </div>

      {!maintaining && (
        <>
          <div className="card form-list goal-card">
            <Line label="Target weight"><SaveNum value={p.targetWeight ?? ''} unit="kg" ph="75" decimal onSave={saveTarget} /></Line>
          </div>
          {+p.targetWeight > 0 && +p.weight > +p.targetWeight ? (
            <div className="recs">
              <p className="recs-title">How fast?</p>
              <div className="recs-row">
                {recommendDates(p.weight, p.targetWeight).map((r) => (
                  <button key={r.id} className={`rec ${p.endDate === r.date ? 'on' : ''} ${r.best ? 'best' : ''}`} onClick={() => pickPace(r.date, r.label)}>
                    <b>{r.label}</b>
                    <span>{prettyDate(r.date)}</span>
                    <small>{r.rate} kg/week</small>
                  </button>
                ))}
              </div>
              <details className="own-date">
                <summary>Or choose my own date</summary>
                <input className="date-in" type="date" aria-label="Reach my target by" value={p.endDate ?? ''} min={dayKey()} onChange={(e) => e.target.value && pickPace(e.target.value)} />
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
        <Line label="Weight"><SaveNum value={p.weight ?? ''} unit="kg" ph="80" decimal onSave={(v) => { set({ weight: v }); notify?.(`Weight saved: ${v} kg. Your budget is updated.`) }} /></Line>
      </div>

      <h2 className="group-title" id="day">Your day</h2>
      <div className="card form-list">
        <Line label="Wake up"><input className="date-in" type="time" value={p.wakeTime ?? DEFAULT_WAKE} onChange={(e) => set({ wakeTime: e.target.value })} /></Line>
        <Line label="Bedtime"><input className="date-in" type="time" value={p.bedTime ?? DEFAULT_BED} onChange={(e) => set({ bedTime: e.target.value })} /></Line>
        <Line label="Weigh-in">
          <select className="date-in" value={p.weighFreq === 'weekly' ? String(p.weighDay ?? 5) : 'daily'} onChange={(e) => set(e.target.value === 'daily' ? { weighFreq: 'daily' } : { weighFreq: 'weekly', weighDay: +e.target.value })} aria-label="How often you weigh in">
            <option value="daily">Every morning</option>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>Weekly, {d}</option>)}
          </select>
        </Line>
        <Line label="Welcome card">
          <select className="date-in" value={p.helloMode ?? 'away'} onChange={(e) => set({ helloMode: e.target.value })} aria-label="When to show the welcome screen">
            <option value="always">Every time I open</option>
            <option value="away">After 2+ hours away</option>
            <option value="never">Never, go straight in</option>
          </select>
        </Line>
        <label className="line toggle-line">
          <span className="line-label">Morning welcome<small>Verse and motivation on your first open each day</small></span>
          <input type="checkbox" className="switch" checked={p.morningCard !== false} onChange={(e) => set({ morningCard: e.target.checked })} />
        </label>
        {openWords && <button className="line link-line" onClick={openWords}>Show it now</button>}
        <SoundLine />
        <RemindLines p={p} set={set} push={partner?.push} notify={notify} />
      </div>
      <p className="fine">A new day starts at midnight. If the morning welcome is on, it greets you the first time you open the app that day. An hour before bed, “Close my day” appears, and at bedtime BankCal offers to close it for you. Anything eaten after midnight counts toward the new day.</p>

      <HabitPicker profile={p} updateProfile={set} />

      {partner && <PartnerSettings partner={partner} profile={p} updateProfile={set} />}

      <h2 className="group-title" id="buddy">Buddy</h2>
      <div className="card buddy-card"><BuddyGrid value={p.character} onChange={(id) => set({ character: id })} /></div>
      <div className="card acc-card">
        <div className="acc-head">
          <span className="acc-preview" key={p.accessory ?? 'none'}><Character kind={p.character} mood="happy" size={72} acc={p.accessory} /></span>
          <p className="acc-title">Dress up<small>Just for fun. Tap to try one on. Your partner sees it too.</small></p>
        </div>
        <div className="acc-row">
          <button className={!p.accessory ? 'on' : ''} onClick={() => set({ accessory: null })} aria-pressed={!p.accessory}>None</button>
          {ACCESSORIES.map((a) => (
            <button key={a.id} className={p.accessory === a.id ? 'on' : ''} aria-pressed={p.accessory === a.id} onClick={() => set({ accessory: a.id })} aria-label={a.label} title={a.label}><span>{a.e}</span></button>
          ))}
        </div>
      </div>

      <h2 className="group-title" id="look">Look and feel</h2>
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
        <Line label="Steps"><SaveNum value={p.stepsGoal ?? ''} unit="steps" ph="8000" onSave={(v) => { set({ stepsGoal: v || null }); notify?.(v ? `Steps goal saved: ${fmt(+v)} steps` : 'Steps goal cleared') }} /></Line>
        <Line label="Treadmill"><SaveNum value={p.treadGoalMin ?? ''} unit="min" ph="30" onSave={(v) => { set({ treadGoalMin: v || null }); notify?.(v ? `Treadmill goal saved: ${fmt(+v)} min` : 'Treadmill goal cleared') }} /></Line>
        <Line label="Treadmill speed"><Num value={p.treadSpeed ?? ''} onChange={num('treadSpeed')} unit="km/h" ph="5" decimal /></Line>
        </div>

        <h3 className="more-h">Custom budget</h3>
        <div className="form-list">
          <Line label="Fixed daily budget"><SaveNum value={p.customBudget ?? ''} unit="kcal" ph="Off" onSave={(v) => { set({ customBudget: v || null }); notify?.(v ? `Daily budget saved: ${fmt(+v)} kcal` : 'Daily budget cleared') }} /></Line>
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
              <button className="btn-plain danger solid" onClick={async () => { await resetProgress(); try { localStorage.removeItem('bankcal:ms-seen') } catch { /* ignore */ } setConfirmReset(false) }}>Yes, start fresh</button>
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
  const kids = Children.map(children, (c) => (isValidElement(c) && (c.type === 'input' || c.type === Num || c.type === SaveNum) && !c.props['aria-label'] ? cloneElement(c, { 'aria-label': label }) : c))
  return (
    <div className="line">
      <span className="line-label">{label}</span>
      {kids}
    </div>
  )
}

// A number box with its own Save: shows a Save button once changed, saves on Save, Enter or leaving
// the box, then flashes "Saved".
function SaveNum({ value, onSave, unit, ph, decimal, 'aria-label': al }) {
  const [draft, setDraft] = useState(String(value ?? ''))
  const [saved, setSaved] = useState(false)
  const [focus, setFocus] = useState(false)
  useEffect(() => { if (!focus) setDraft(String(value ?? '')) }, [value, focus])
  const dirty = draft.trim() !== String(value ?? '')
  const commit = () => {
    if (!dirty) return
    const v = draft.replace(/[^\d.]/g, '')
    onSave(v === '' ? '' : v)
    setSaved(true); setTimeout(() => setSaved(false), 1800)
  }
  return (
    <span className="save-num">
      <label className="num-in">
        <input inputMode={decimal ? 'decimal' : 'numeric'} enterKeyHint="done" value={draft} placeholder={ph} aria-label={al}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
          onFocus={(e) => { setFocus(true); e.target.select() }}
          onBlur={() => { setFocus(false); commit() }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} />
        <span>{unit}</span>
      </label>
      {dirty ? <button type="button" className="sn-save" onMouseDown={(e) => e.preventDefault()} onClick={commit}>Save</button>
        : saved ? <span className="sn-ok" role="status">✓ Saved</span> : null}
    </span>
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
        <span className="line-label">Sounds<small>When all habits are done, your day closes on budget, or a cheer arrives</small></span>
        <input type="checkbox" className="switch" checked={on} onChange={(e) => { setOn(e.target.checked); setSoundOn(e.target.checked) }} />
      </label>
      {on && <button className="line link-line" onClick={test}>🔊 Play a sound</button>}
      {on && res && <p className="line-status" role="status">{res}</p>}
    </>
  )
}

// Gentle reminders: phone notifications, only when useful, never more than two a day
function RemindLines({ p, set, push, notify }) {
  const [busy, setBusy] = useState(false)
  const flip = async (key, v) => {
    if (v && push && !push.on) {
      setBusy(true)
      try { await push.turnOn() } catch (e) { notify?.(e.message || 'Couldn’t turn on notifications.'); setBusy(false); return }
      setBusy(false)
    }
    set({ [key]: v })
    if (v) notify?.(key === 'remindMeal' ? 'Meal reminders on. Only when nothing’s logged yet.' : 'Close-my-day reminder on, at your bedtime.')
  }
  return (
    <>
      <label className="line toggle-line">
        <span className="line-label">🍽️ Meal reminders<small>Around 12:30 and 19:30, only if nothing was logged in the last 3 hours</small></span>
        <input type="checkbox" className="switch" disabled={busy} checked={!!p.remindMeal} onChange={(e) => flip('remindMeal', e.target.checked)} />
      </label>
      <label className="line toggle-line">
        <span className="line-label">🌙 Close my day<small>At bedtime, if you logged food and haven’t closed the day</small></span>
        <input type="checkbox" className="switch" disabled={busy} checked={!!p.remindClose} onChange={(e) => flip('remindClose', e.target.checked)} />
      </label>
      {(p.remindMeal || p.remindClose) && push && !push.supported && <p className="line-status">Open BankCal from your Home Screen so reminders can reach this phone.</p>}
    </>
  )
}
