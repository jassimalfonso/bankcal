import { createPortal } from 'react-dom'
import { useState } from 'react'
import { fmt, workoutKcal } from '../calc'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { useRepeat } from '../Hold'
import { WatchHow } from '../Moves'
import { EFFORTS, routineWorkout } from '../training'

const uid = () => crypto.randomUUID?.() ?? String(Math.random())

export function Stepper({ label, value, unit, step = 1, min = 0, max = 999, onChange }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, Math.round(v * 2) / 2)))
  // keep − or + pressed and it keeps counting
  const less = useRepeat(() => set(value - step), value <= min)
  const more = useRepeat(() => set(value + step), value >= max)
  return (
    <div className="stepper">
      <span>{label}</span>
      <div>
        <button className="holdable" {...less} disabled={value <= min} aria-label={`Less ${label.toLowerCase()}`}>−</button>
        <b aria-live="polite">{value}{unit ? <small> {unit}</small> : null}</b>
        <button className="holdable" {...more} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  )
}

// The set of exercises you always do. Tick each one as you finish it: it's logged and
// its calories are added to today's budget. Untick to take it back.
export function RoutineCard({ profile, updateProfile, dayLog, setDay, today, celebrate, onCreate }) {
  const items = profile.routine ?? []
  const workouts = dayLog.workouts ?? []
  const [edit, setEdit] = useState(null)
  const isDone = (it) => workouts.some((w) => w.rid === it.id)
  const kcalOf = (it) => workoutKcal(routineWorkout(it), profile.weight)
  const doneItems = items.filter(isDone)
  const burned = workouts.filter((w) => items.some((it) => it.id === w.rid)).reduce((a, w) => a + workoutKcal(w, profile.weight), 0)

  const toggle = (it) => {
    if (isDone(it)) { setDay(today, { workouts: workouts.filter((w) => w.rid !== it.id) }); return }
    setDay(today, { workouts: [...workouts, { id: uid(), ...routineWorkout(it) }] })
    navigator.vibrate?.(12)
    if (doneItems.length + 1 === items.length && items.length > 1) celebrate?.(`Routine done! +${fmt(burned + kcalOf(it))} kcal 💪`)
  }
  const change = (id, patch) => updateProfile({ routine: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })
  const remove = (id) => { updateProfile({ routine: items.filter((it) => it.id !== id) }); setEdit(null) }
  const move = (i, d) => { const next = [...items]; [next[i], next[i + d]] = [next[i + d], next[i]]; updateProfile({ routine: next }) }

  return (
    <>
      <div className="block-head">
        <h2 className="group-title">My routine</h2>
        {items.length > 0 && <span className="rt-sum">{doneItems.length} of {items.length} done{burned > 0 ? <b className="pos"> · +{fmt(burned)} kcal</b> : null}</span>}
      </div>
      {items.length === 0 ? (
        <div className="card rt-empty">
          <p><b>Build the set you always do.</b> Open any exercise below and tap <b>Add to my routine</b>, or create your own. Then just tick each one off as you train.</p>
          <button className="btn-soft" onClick={onCreate}>＋ Create my own exercise</button>
        </div>
      ) : (
        <div className="card rt-list">
          {items.map((it, i) => {
            const done = isDone(it), open = edit === it.id
            const dose = it.kind === 'time' ? `${it.sets} × ${it.sec} s` : `${it.sets} × ${it.reps}${it.each ? ' each side' : ''}`
            return (
              <div className={`rt ${done ? 'done' : ''}`} key={it.id}>
                <div className="rt-row">
                  <button className="rt-tick" onClick={() => toggle(it)} aria-pressed={done} aria-label={`${done ? 'Untick' : 'Tick'} ${it.name}`}>
                    <span className={`check big ${done ? 'on' : ''}`} aria-hidden="true" />
                  </button>
                  <button className="rt-main" onClick={() => setEdit(open ? null : it.id)} aria-expanded={open}>
                    <b>{it.emoji} {it.name}</b>
                    <small>{dose}{it.kg ? ` · ${it.kg} kg` : ''} · <span className="pos">+{fmt(kcalOf(it))} kcal</span></small>
                  </button>
                  <button className="rt-edit" onClick={() => setEdit(open ? null : it.id)} aria-label={`${open ? 'Close' : 'Adjust'} ${it.name}`}>{open ? 'Close' : 'Adjust'}</button>
                </div>
                {open && (
                  <div className="rt-adjust">
                    <Stepper label="Sets" value={it.sets} min={1} max={20} onChange={(v) => change(it.id, { sets: v })} />
                    {it.kind === 'time'
                      ? <Stepper label="Seconds" value={it.sec} step={5} min={5} max={600} onChange={(v) => change(it.id, { sec: v })} />
                      : <Stepper label="Reps" value={it.reps} min={1} max={100} onChange={(v) => change(it.id, { reps: v })} />}
                    {it.kg != null && <Stepper label="Weight" unit="kg" value={it.kg} step={0.5} min={0} max={200} onChange={(v) => change(it.id, { kg: v })} />}
                    <Stepper label="Rest" unit="s" value={it.rest ?? 60} step={15} min={0} max={300} onChange={(v) => change(it.id, { rest: v })} />
                    <div className="rt-tools">
                      <button onClick={() => move(i, -1)} disabled={i === 0}>↑ Move up</button>
                      <button onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓ Move down</button>
                      <button className="danger" onClick={() => remove(it.id)}>Remove</button>
                    </div>
                    {done && <p className="fine">Already ticked today. Changes apply from the next time you tick it.</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {items.length > 0 && <p className="fine">Tick each exercise when you finish it. It’s logged and its calories are added to today’s budget. Calories depend on time and effort; heavier weights change them only slightly.</p>}
    </>
  )
}

const EMOJIS = ['✅', '💪', '🏋️', '🦵', '🤸', '🧘', '🚴', '🏃', '🥊', '🧗', '⛹️', '🪢']

// Create or edit one of your own exercises.
export function CustomSheet({ initial: given, weight, inRoutine, existing = [], onSave, onDelete, onAddRoutine, onLog, onOpen, notify, onClose }) {
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const initial = given?.id ? given : null // an exercise without an id is a new one prefilled from search
  const [c, setC] = useState(given ?? { name: '', emoji: '✅', kind: 'reps', weighted: false, met: 3.8 })
  const set = (patch) => setC((x) => ({ ...x, ...patch }))
  // new exercises go straight into the routine (that's where they're used); edits leave it as is
  const [toRoutine, setToRoutine] = useState(!initial)
  const twin = !initial && existing.find((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase())
  const valid = c.name.trim().length > 1 && !twin
  const sets = +c.sets || 3, reps = +c.reps || 10, sec = +c.sec || 30, kg = c.kg != null ? +c.kg : 5
  const sample = { id: 'x', name: c.name, kind: c.kind, sets, reps, sec, rest: 60, met: c.met }
  const saved = () => { const out = { ...c, name: c.name.trim(), id: c.id ?? `c${Date.now().toString(36)}` }; onSave(out); return out }
  return createPortal(
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet custom-sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={initial ? 'Edit my exercise' : 'Create my own exercise'}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div><p className="muted">My exercise</p><h2>{initial ? 'Edit exercise' : 'Create my own'}</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <label className="field"><span>Name</span>
          <input value={c.name} onChange={(e) => set({ name: e.target.value.slice(0, 40) })} placeholder="e.g. Hammer curl…" aria-label="Exercise name" autoComplete="off" />
        </label>
        <div className="emoji-row" role="radiogroup" aria-label="Icon">
          {EMOJIS.map((e) => <button key={e} role="radio" aria-checked={c.emoji === e} className={c.emoji === e ? 'on' : ''} onClick={() => set({ emoji: e })}>{e}</button>)}
        </div>

        <h3 className="ex-h">How do you count it?</h3>
        <div className="seg two">
          <button className={c.kind === 'reps' ? 'on' : ''} onClick={() => set({ kind: 'reps' })}>Sets and reps</button>
          <button className={c.kind === 'time' ? 'on' : ''} onClick={() => set({ kind: 'time', weighted: false })}>Timed holds</button>
        </div>
        {c.kind === 'reps' && (
          <label className="keep-food"><input type="checkbox" checked={!!c.weighted} onChange={(e) => set({ weighted: e.target.checked })} /><span>Uses weights (track kg)</span></label>
        )}

        {c.name.trim().length >= 3 && <WatchHow name={c.name.trim()} />}
        <h3 className="ex-h">Your usual amount</h3>
        <div className="card rt-adjust own-adjust">
          <Stepper label="Sets" value={sets} min={1} max={20} onChange={(v) => set({ sets: v })} />
          {c.kind === 'time'
            ? <Stepper label="Seconds" value={sec} step={5} min={5} max={600} onChange={(v) => set({ sec: v })} />
            : <Stepper label="Reps" value={reps} min={1} max={100} onChange={(v) => set({ reps: v })} />}
          {c.kind === 'reps' && c.weighted && <Stepper label="Weight" unit="kg" value={kg} step={0.5} min={0} max={200} onChange={(v) => set({ kg: v })} />}
        </div>
        <p className="fine">This is what gets logged when you tap it. Did more? Tap <b>+1 set</b> on it in Deposits, or log it again and the sets add up.</p>

        <h3 className="ex-h">How hard is it?</h3>
        <div className="effort-list">
          {EFFORTS.map((e) => (
            <button key={e.id} className={`pick ${c.met === e.met ? 'on' : ''}`} onClick={() => set({ met: e.met })} aria-pressed={c.met === e.met}>
              <span><b>{e.label}</b><small>{e.hint}</small></span>
              <span className={`check ${c.met === e.met ? 'on' : ''}`} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="fine">At this effort, {sets} set{sets === 1 ? '' : 's'} of {c.kind === 'time' ? `${sec} seconds` : `${reps} reps`} with 1-minute rests burns about <b>{fmt(workoutKcal(routineWorkout(sample), weight))} kcal</b> for you, above what you’d burn resting.</p>

        {twin && (
          <p className="dup-note">You already have <b>{twin.name}</b>. <button className="link-btn" onClick={() => onOpen?.(twin)}>Open it</button></p>
        )}
        {!inRoutine && (
          <label className="keep-food"><input type="checkbox" checked={toRoutine} onChange={(e) => setToRoutine(e.target.checked)} />
            <span><b>Add to my routine</b>, so you can tick it off each time you train</span></label>
        )}
        <div className="custom-actions">
          <button className="btn-primary" disabled={!valid} onClick={() => {
            const out = saved()
            if (toRoutine && !inRoutine) onAddRoutine(out)
            notify?.(initial ? `${out.name} updated` : toRoutine ? `${out.name} saved and added to your routine` : `${out.name} saved. It’s under Mine, and in Deposits`)
            onClose()
          }}>{initial ? 'Save changes' : 'Save exercise'}</button>
          {initial && <button className="btn-soft" onClick={() => { onLog(saved()); onClose() }}>Log it today</button>}
          {initial && <button className="btn-plain danger" onClick={() => { onDelete(initial.id); onClose() }}>Delete this exercise</button>}
        </div>
      </div>
    </div>
  , document.body
  )
}
