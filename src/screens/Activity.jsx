import { useEffect, useState } from 'react'
import { BASE_STEPS, describeWorkout, fmt, WORKOUTS, workoutKcal } from '../calc'
import WorkoutSheet from './WorkoutSheet'

// Today's "deposits": steps and treadmill time earn calories back into the budget.
// Values are typed in (a web app can't read the phone's step counter) and saved on blur.
export default function Activity({ profile, dayLog, earn, today, setDay, updateProfile }) {
  const stepsGoal = +profile.stepsGoal || 8000
  const treadGoal = +profile.treadGoalMin || 0
  const steps = +dayLog.steps || 0
  const tread = +dayLog.treadMin || 0
  const workouts = dayLog.workouts ?? []
  const [adding, setAdding] = useState(false)
  const saveWorkout = (w) => {
    const id = Date.now().toString(36)
    setDay(today, { workouts: [...workouts, { id, ...w }] })
    navigator.vibrate?.(12)
    setAdding(false)
  }
  const removeWorkout = (id) => setDay(today, { workouts: workouts.filter((w) => w.id !== id) })

  return (
    <>
      <h2 className="group-title">Deposits <span className="pos">+{fmt(earn.total)} kcal earned</span></h2>
      <div className="card form-list activity">
        <div className="act-row">
          <div className="act-head">
            <b>Steps</b>
            <small>{steps >= stepsGoal ? 'Goal reached 🎉' : `${fmt(Math.max(0, stepsGoal - steps))} to your ${fmt(stepsGoal)} goal`}</small>
          </div>
          <NumField value={dayLog.steps} placeholder="0" onCommit={(v) => setDay(today, { steps: v })} />
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
            <div className="act-row" key={w.id}>
              <span className="w-emoji small">{def?.emoji}</span>
              <div className="act-head"><b>{def?.label}</b><small>{describeWorkout(w)}</small></div>
              <button className="w-del" onClick={() => removeWorkout(w.id)} aria-label={`Remove ${def?.label}`}>×</button>
              <span className="act-kcal">+{fmt(workoutKcal(w, profile.weight))}</span>
            </div>
          )
        })}
        <button className="add-workout" onClick={() => setAdding(true)}>+ Add a workout <small>jumping jacks, squats, dumbbells…</small></button>

        <div className="act-row">
          <div className="act-head">
            <b>Weight today</b>
            <small>{dayLog.weight ? 'Logged. Your budget follows it.' : 'Optional, best in the morning'}</small>
          </div>
          <NumField value={dayLog.weight} placeholder={profile.weight || '—'} unit="kg" decimal
            onCommit={(v) => { if (v > 0) { setDay(today, { weight: v }); updateProfile({ weight: v }) } }} />
        </div>
      </div>
      <p className="fine">First {fmt(BASE_STEPS)} steps are everyday movement and already in your budget.</p>
      {adding && <WorkoutSheet profile={profile} onClose={() => setAdding(false)} onSave={saveWorkout} />}
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
