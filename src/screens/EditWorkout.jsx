// Edit a workout that's already logged: change sets, reps, weight or minutes, or remove it.
import { useState } from 'react'
import { WORKOUTS, fmt, workoutKcal } from '../calc'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { routineWorkout } from '../training'
import { Stepper } from './Routine'

export default function EditWorkout({ w, profile, onSave, onRemove, onClose }) {
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const def = WORKOUTS.find((x) => x.id === w.type)
  const [it, setIt] = useState(w.item ?? null) // sets × reps workouts logged from your exercises
  const [x, setX] = useState(w) // everything else
  const set = (k, v) => setX((o) => ({ ...o, [k]: v }))
  const out = it ? { ...routineWorkout(it), id: w.id, rid: w.rid } : x
  const kcal = workoutKcal(out, profile.weight)
  const changed = Math.round(kcal) !== Math.round(workoutKcal(w, profile.weight)) || JSON.stringify(out) !== JSON.stringify(w)
  const name = w.label ?? def?.label ?? 'Workout'

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Edit ${name}`}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div><p className="muted">Edit workout</p><h2>{it?.emoji ?? def?.emoji} {name}</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="card rt-adjust own-adjust">
          {it ? (
            <>
              <Stepper label="Sets" value={it.sets} min={1} max={20} onChange={(v) => setIt({ ...it, sets: v })} />
              {it.kind === 'time'
                ? <Stepper label="Seconds" value={it.sec} step={5} min={5} max={600} onChange={(v) => setIt({ ...it, sec: v })} />
                : <Stepper label="Reps" value={it.reps} min={1} max={100} onChange={(v) => setIt({ ...it, reps: v })} />}
              {it.kg != null && <Stepper label="Weight" unit="kg" value={it.kg} step={0.5} min={0} max={200} onChange={(v) => setIt({ ...it, kg: v })} />}
            </>
          ) : def?.kind === 'min' || w.type === 'custom' ? (
            <Stepper label="Minutes" value={+x.min || 0} step={def?.kind === 'min' && +x.min >= 10 ? 5 : 1} min={1} max={600} onChange={(v) => set('min', v)} />
          ) : def?.kind === 'sec' ? (
            <>
              <Stepper label="Sets" value={+x.sets || 1} min={1} max={20} onChange={(v) => set('sets', v)} />
              <Stepper label="Seconds" value={+x.sec || 0} step={5} min={5} max={600} onChange={(v) => set('sec', v)} />
            </>
          ) : (
            <>
              <Stepper label="Sets" value={+x.sets || 1} min={1} max={20} onChange={(v) => set('sets', v)} />
              <Stepper label="Reps" value={+x.reps || 0} min={1} max={200} onChange={(v) => set('reps', v)} />
              {def?.kind === 'weights' && <Stepper label="Weight" unit="kg" value={+x.kg || 0} step={0.5} min={0} max={200} onChange={(v) => set('kg', v)} />}
            </>
          )}
        </div>
        {!it && w.type === 'custom' && w.note && <p className="fine">Logged as {w.note}. Change the minutes to adjust it.</p>}

        <p className="earn-line"><b className="pos">+{fmt(kcal)} kcal</b> earned</p>
        <button className="btn-primary" disabled={!changed} onClick={() => onSave(it ? out : { ...x, note: x.note && x.min !== w.min ? undefined : x.note })}>Save changes</button>
        <button className="remove-entry" onClick={onRemove}>Remove this workout</button>
      </div>
    </div>
  )
}
