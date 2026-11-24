import { useEffect, useState } from 'react'
import { BASE_STEPS, earned, DEFAULT_BED, DEFAULT_WAKE, describeWorkout, fmt, fmtSleep, sleepHours, SLEEP_TARGET, WORKOUTS, workoutKcal } from '../calc'
import WorkoutSheet from './WorkoutSheet'
import EditWorkout, { fromNote } from './EditWorkout'
import { myWorkouts, partnerWorkouts, routineWorkout, sameDose, withMoreSets } from '../training'
import { workoutKcal as kcalOf } from '../calc'

// Today's "deposits": steps and treadmill time earn calories back into the budget.
// Values are typed in (a web app can't read the phone's step counter) and saved on blur.
export default function Activity({ profile, dayLog, earn, today, setDay, updateProfile, celebrate, receipt, fresh, pastDay, partner }) {
  const stepsGoal = +profile.stepsGoal || 8000
  const treadGoal = +profile.treadGoalMin || 0
  const steps = +dayLog.steps || 0
  const tread = +dayLog.treadMin || 0
  const workouts = dayLog.workouts ?? []
  const sleepH = sleepHours(dayLog.sleep)
  const [adding, setAdding] = useState(false)
  // Collapsed by default so mornings feel light; remembers your choice
  // a past day (opened from Progress) starts open; Today remembers whether you left it open
  const [open, setOpen] = useState(() => { if (pastDay) return true; try { return localStorage.getItem('bankcal:deposits') === 'open' } catch { return false } })
  // a workout was just logged: open the card so its line can be seen
  useEffect(() => { if (fresh && (dayLog.workouts ?? []).some((w) => w.id === fresh)) setOpen(true) }, [fresh]) // eslint-disable-line react-hooks/exhaustive-deps
  // Save a steps/treadmill change and confirm it, with Undo
  const deposit = (patch, label) => {
    const prev = Object.fromEntries(Object.keys(patch).map((k) => [k, dayLog[k] ?? null]))
    const gain = earned({ ...dayLog, ...patch }, profile.weight).total - earned(dayLog, profile.weight).total
    setDay(today, patch)
    if (!receipt) return
    const undo = () => setDay(today, prev)
    if (gain > 0) receipt({ kind: 'deposit', what: label, kcal: gain, undo })
    else receipt({ kind: 'steps', what: patch.steps != null && patch.steps > 0 && patch.steps < BASE_STEPS ? `${label} · earning starts after ${fmt(BASE_STEPS)}` : label, kcal: 0, undo })
  }
  const toggle = () => setOpen((o) => { if (!pastDay) { try { localStorage.setItem('bankcal:deposits', o ? 'closed' : 'open') } catch { /* ignore */ } } return !o })
  // sets × reps of a logged workout, when it has them
  const itemOf = (w) => w.item ?? fromNote(w, profile)
  const addSets = (w, n) => {
    const it = itemOf(w)
    if (!it) return
    const next = withMoreSets(w, it, n)
    const gain = Math.round(workoutKcal(next, profile.weight) - workoutKcal(w, profile.weight))
    setDay(today, { workouts: workouts.map((x) => (x.id === w.id ? next : x)) })
    receipt?.({ kind: 'deposit', what: `${w.label}: now ${next.note}`, kcal: Math.max(0, gain), id: w.id, undo: () => setDay(today, { workouts }) })
  }
  const saveWorkout = (w) => {
    // the same exercise at the same reps and weight, done again today: its sets add up on one line
    const twin = w.item && !w.rid && workouts.find((x) => sameDose(itemOf(x), { ...w.item, name: w.item.name ?? w.label }))
    if (twin && (+itemOf(twin).sets || 1) + (+w.item.sets || 1) <= 20) { addSets(twin, +w.item.sets || 1); setAdding(false); return }
    const id = Date.now().toString(36)
    setDay(today, { workouts: [...workouts, { id, ...w }] })
    if (receipt) receipt({ kind: 'deposit', what: w.label || WORKOUTS.find((x) => x.id === w.type)?.label || 'Workout', kcal: Math.round(workoutKcal(w, profile.weight)), id, undo: () => setDay(today, { workouts }) })
    else celebrate?.(`Nice work! +${fmt(workoutKcal(w, profile.weight))} kcal 💪`)
    setAdding(false)
  }
  const mine = myWorkouts(profile, workouts)
  const removeWorkout = (id) => setDay(today, { workouts: workouts.filter((w) => w.id !== id) })
  const [editing, setEditing] = useState(null)
  const updateWorkout = (old, next) => {
    setDay(today, { workouts: workouts.map((w) => (w.id === old.id ? { ...next, id: old.id } : w)) })
    const diff = Math.round(workoutKcal(next, profile.weight) - workoutKcal(old, profile.weight))
    if (receipt) receipt({ kind: 'edit', what: `${next.label ?? old.label ?? 'Workout'}: now +${fmt(workoutKcal(next, profile.weight))} kcal (${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))})`, kcal: 0, id: old.id, undo: () => setDay(today, { workouts }) })
    setEditing(null)
  }

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
            <small>{steps > 0 && steps < BASE_STEPS
              ? `Earning starts after ${fmt(BASE_STEPS)} · ${fmt(BASE_STEPS - steps)} to go`
              : steps >= stepsGoal ? 'Goal reached 🎉' : `${fmt(Math.max(0, stepsGoal - steps))} to your ${fmt(stepsGoal)} goal`}</small>
          </div>
          <NumField value={dayLog.steps} placeholder="0" onCommit={(v) => { deposit({ steps: v }, `${fmt(v)} steps`); if (v >= stepsGoal && !(steps >= stepsGoal)) celebrate?.(`${fmt(stepsGoal)} steps reached! 👟`) }} />
          <span className={`act-kcal ${steps > 0 && steps < BASE_STEPS ? 'act-wait' : ''}`}>+{fmt(earn.steps)}</span>
        </div>
        <Bar value={steps / stepsGoal} mark={BASE_STEPS / stepsGoal} />

        <div className="act-row">
          <div className="act-head">
            <b>Treadmill</b>
            <small>{treadGoal ? (tread >= treadGoal ? 'Goal reached 🎉' : `${treadGoal - tread} min to your ${treadGoal} min goal`) : 'Minutes at your speed'}</small>
          </div>
          <div className="tread-in">
            <NumField value={dayLog.treadMin} placeholder="0" unit="min" onCommit={(v) => deposit({ treadMin: v, treadSpeed: +dayLog.treadSpeed || +profile.treadSpeed || 5 }, `Treadmill ${v} min`)} />
            <NumField value={dayLog.treadSpeed ?? profile.treadSpeed ?? 5} placeholder="5" unit="km/h" decimal onCommit={(v) => deposit({ treadSpeed: v }, `Treadmill at ${v} km/h`)} />
          </div>
          <span className="act-kcal">+{fmt(earn.tread)}</span>
        </div>
        {treadGoal > 0 && <Bar value={tread / treadGoal} />}

        {workouts.map((w) => {
          const def = WORKOUTS.find((x) => x.id === w.type)
          return (
            <div className={`act-row ${fresh === w.id ? 'fresh' : ''}`} key={w.id}>
              <span className="w-emoji small">{w.item?.emoji ?? def?.emoji}</span>
              <button className="act-head act-edit" onClick={() => setEditing(w)} aria-label={`Edit ${w.label ?? def?.label}`}><b>{w.label ?? def?.label}</b><small>{describeWorkout(w)} · <span className="act-tap">Edit</span></small></button>
              {itemOf(w) && (+itemOf(w).sets || 1) < 20 && <button className="w-more" onClick={() => addSets(w, 1)} aria-label={`Add one more set of ${w.label ?? def?.label}`}>+1 set</button>}
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

        <div className="act-row sleep-row">
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
      <p className="fine">Your first {fmt(BASE_STEPS)} steps are everyday movement, already counted in your budget. Steps after that (the tick on the bar) earn calories.</p>
      </>}
      {editing && <EditWorkout w={editing} profile={profile} onClose={() => setEditing(null)} onSave={(next) => updateWorkout(editing, next)}
        onRemove={() => { const before = workouts; removeWorkout(editing.id); setEditing(null); receipt?.({ kind: 'edit', what: `${editing.label ?? 'Workout'} removed`, kcal: 0, undo: () => setDay(today, { workouts: before }) }) }} />}
      {adding && <WorkoutSheet profile={profile} mine={mine} theirs={partnerWorkouts(partner, myWorkouts(profile))} start={adding === true ? null : adding} onClose={() => setAdding(false)} onSave={saveWorkout} onKeep={(item) => updateProfile({ routine: [...(profile.routine ?? []), item] })} />}
    </>
  )
}

// `mark`: a tick where earning starts (after the everyday 3,000 steps)
function Bar({ value, mark }) {
  return (
    <div className="act-bar">
      <span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
      {mark > 0 && mark < 1 && <i className="act-mark" style={{ left: `${mark * 100}%` }} title="Earning starts here" />}
    </div>
  )
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
        enterKeyHint="next"
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          // Enter jumps to the next box; the last one closes the keyboard
          const box = e.currentTarget.closest('.activity')
          const all = box ? [...box.querySelectorAll('input:not([type=time])')] : []
          const next = all[all.indexOf(e.currentTarget) + 1]
          if (next) { next.focus({ preventScroll: true }); requestAnimationFrame(() => next.select?.()) } else e.currentTarget.blur()
        }}
        onFocus={(e) => e.currentTarget.select()}
      />
      {unit && <span>{unit}</span>}
    </label>
  )
}
