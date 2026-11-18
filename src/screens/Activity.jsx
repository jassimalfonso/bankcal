import { useEffect, useState } from 'react'
import { BASE_STEPS, DEFAULT_BED, DEFAULT_WAKE, describeWorkout, fmt, fmtSleep, sleepHours, SLEEP_TARGET, WORKOUTS, workoutKcal } from '../calc'
import WorkoutSheet from './WorkoutSheet'
import { myWorkouts, routineWorkout } from '../training'
import { workoutKcal as kcalOf } from '../calc'

// Today's "deposits": steps and treadmill time earn calories back into the budget.
// Values are typed in (a web app can't read the phone's step counter) and saved on blur.
export default function Activity({ profile, dayLog, earn, today, setDay, updateProfile, celebrate, receipt, fresh }) {
  const stepsGoal = +profile.stepsGoal || 8000
  const treadGoal = +profile.treadGoalMin || 0
  const steps = +dayLog.steps || 0
  const tread = +dayLog.treadMin || 0
  const workouts = dayLog.workouts ?? []
  const sleepH = sleepHours(dayLog.sleep)
  const [adding, setAdding] = useState(false)
  // Collapsed by default so mornings feel light; remembers your choice
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('bankcal:deposits') === 'open' } catch { return false } })
  // a workout was just logged: open the card so its line can be seen
  useEffect(() => { if (fresh && (dayLog.workouts ?? []).some((w) => w.id === fresh)) setOpen(true) }, [fresh]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = () => setOpen((o) => { try { localStorage.setItem('bankcal:deposits', o ? 'closed' : 'open') } catch { /* ignore */ } return !o })
  const saveWorkout = (w) => {
    const id = Date.now().toString(36)
    setDay(today, { workouts: [...workouts, { id, ...w }] })
    if (receipt) receipt({ kind: 'deposit', what: w.label || 'Workout', kcal: Math.round(workoutKcal(w, profile.weight)), id, undo: () => setDay(today, { workouts }) })
    else celebrate?.(`Nice work! +${fmt(workoutKcal(w, profile.weight))} kcal 💪`)
    setAdding(false)
  }
  const mine = myWorkouts(profile, workouts)
  const removeWorkout = (id) => setDay(today, { workouts: workouts.filter((w) => w.id !== id) })

  return (
    <>
      <button className="deposits-head" onClick={toggle} aria-expanded={open}>
        <span className="group-title">Deposits</span>
        <span className="dep-sum">
          {open ? <span className="pos">+{fmt(earn.total)} kcal earned</span>
            : <>{sleepH != null ? `${fmtSleep(sleepH)} sleep, ` : ''}{fmt(steps)} steps{workouts.length ? `, ${workouts.length} workout${workouts.length > 1 ? 's' : ''}` : ''} <b className="pos">+{fmt(earn.total)}</b></>}
          <svg viewBox="0 0 12 12" aria-hidden="true" className={open ? 'up' : ''}><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
      {!open ? null : <>
      <div className="card form-list activity">
        <div className="act-row">
          <div className="act-head">
            <b>Steps</b>
            <small>{steps >= stepsGoal ? 'Goal reached 🎉' : `${fmt(Math.max(0, stepsGoal - steps))} to your ${fmt(stepsGoal)} goal`}</small>
          </div>
          <NumField value={dayLog.steps} placeholder="0" onCommit={(v) => { setDay(today, { steps: v }); if (v >= stepsGoal && !(steps >= stepsGoal)) celebrate?.(`${fmt(stepsGoal)} steps reached! 👟`) }} />
          <span className="act-kcal">+{fmt(earn.steps)}</span>
        </div>
        <Bar value={steps / stepsGoal} />

        <div className="act-row">
          <div className="act-head">
            <b>Treadmill</b>
            <small>{treadGoal ? (tread >= treadGoal ? 'Goal reached 🎉' : `${treadGoal - tread} min to your ${treadGoal} min goal`) : 'Minutes at your speed'}</small>
          </div>
          <div className="tread-in">
            <NumField value={dayLog.treadMin} placeholder="0" unit="min" onCommit={(v) => setDay(today, { treadMin: v, treadSpeed: +dayLog.treadSpeed || +profile.treadSpeed || 5 })} />
            <NumField value={dayLog.treadSpeed ?? profile.treadSpeed ?? 5} placeholder="5" unit="km/h" decimal onCommit={(v) => setDay(today, { treadSpeed: v })} />
          </div>
          <span className="act-kcal">+{fmt(earn.tread)}</span>
        </div>
        {treadGoal > 0 && <Bar value={tread / treadGoal} />}

        {workouts.map((w) => {
          const def = WORKOUTS.find((x) => x.id === w.type)
          return (
            <div className={`act-row ${fresh === w.id ? 'fresh' : ''}`} key={w.id}>
              <span className="w-emoji small">{def?.emoji}</span>
              <div className="act-head"><b>{w.label ?? def?.label}</b><small>{describeWorkout(w)}</small></div>
              <button className="w-del" onClick={() => removeWorkout(w.id)} aria-label={`Remove ${def?.label}`}>×</button>
              <span className="act-kcal">+{fmt(workoutKcal(w, profile.weight))}</span>
            </div>
          )
        })}
        {mine.length > 0 && (
          <div className="quick-ws" aria-label="Your workouts">
            {mine.filter((m) => !m.done).slice(0, 6).map((m) => (
              <button key={m.key} className="chip" onClick={() => setAdding(m)}>{m.item.emoji} {m.item.name} <span className="pos">+{fmt(kcalOf(routineWorkout(m.item), profile.weight))}</span></button>
            ))}
          </div>
        )}
        <button className="add-workout" onClick={() => setAdding(true)}>+ Add a workout <small>{mine.length ? 'yours, or walking, cycling, dumbbells…' : 'jumping jacks, squats, dumbbells…'}</small></button>

        <div className="act-row">
          <div className="act-head">
            <b>Sleep last night</b>
            <small>{sleepH == null ? `Aim for ${SLEEP_TARGET} hours or more` : sleepH >= SLEEP_TARGET ? `${fmtSleep(sleepH)}. Well rested 😴` : `${fmtSleep(sleepH)}. A bit short`}</small>
          </div>
          <div className="tread-in sleep-in">
            <input type="time" aria-label="Went to bed" value={dayLog.sleep?.bed ?? ''} placeholder={profile.bedTime ?? DEFAULT_BED}
              onChange={(e) => setDay(today, { sleep: { wake: profile.wakeTime ?? DEFAULT_WAKE, ...dayLog.sleep, bed: e.target.value } })} />
            <input type="time" aria-label="Woke up" value={dayLog.sleep?.wake ?? ''} placeholder={profile.wakeTime ?? DEFAULT_WAKE}
              onChange={(e) => setDay(today, { sleep: { bed: profile.bedTime ?? DEFAULT_BED, ...dayLog.sleep, wake: e.target.value } })} />
          </div>
        </div>
      </div>
      <p className="fine">First {fmt(BASE_STEPS)} steps are everyday movement and already in your budget.</p>
      </>}
      {adding && <WorkoutSheet profile={profile} mine={mine} start={adding === true ? null : adding} onClose={() => setAdding(false)} onSave={saveWorkout} onKeep={(item) => updateProfile({ routine: [...(profile.routine ?? []), item] })} />}
    </>
  )
}

function Bar({ value }) {
  return <div className="act-bar"><span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} /></div>
}

function NumField({ value, onCommit, placeholder, unit, decimal }) {
  const [v, setV] = useState(value ?? '')
  useEffect(() => setV(value ?? ''), [value])
  const commit = () => {
    const n = decimal ? parseFloat(v) : parseInt(v, 10)
    const clean = Number.isFinite(n) && n >= 0 ? n : 0
    if (clean !== (+value || 0)) onCommit(clean)
  }
  return (
    <label className="num-in">
      <input
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={v}
        placeholder={String(placeholder)}
        onChange={(e) => setV(e.target.value.replace(decimal ? /[^\d.]/g : /\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {unit && <span>{unit}</span>}
    </label>
  )
}
