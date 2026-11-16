import { Children, cloneElement, isValidElement, useState } from 'react'
import { WORKOUTS, fmt, workoutKcal, workoutMinutes } from '../calc'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { routineWorkout } from '../training'
import { Stepper } from './Routine'

// Pick an exercise, enter amounts, see the calories it earns, deposit.
// `mine` = your routine and your own exercises, shown first since they're what you usually do.
export default function WorkoutSheet({ profile, mine = [], start = null, onClose, onSave }) {
  const [type, setType] = useState(null)
  const [own, setOwn] = useState(start) // one of `mine`, being adjusted
  const [it, setIt] = useState(start?.item ?? null)
  const pickOwn = (m) => { setOwn(m); setIt(m.item) }
  const ownW = it ? routineWorkout(it) : null
  const ownKcal = ownW ? workoutKcal(ownW, profile.weight) : 0
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const [f, setF] = useState({ min: '', sec: '', sets: '1', reps: '', kg: '' })
  const def = WORKOUTS.find((w) => w.id === type)
  const entry = def ? { type, min: +f.min, sec: +f.sec, sets: +f.sets || 1, reps: +f.reps, kg: +f.kg } : null
  const kcal = entry ? workoutKcal(entry, profile.weight) : 0
  const mins = entry ? workoutMinutes(entry) : 0
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value.replace(/[^\d.]/g, '') }))

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Log a workout">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">Workouts earn calories</p>
            <h2>{own ? `${it.emoji} ${it.name}` : def ? `${def.emoji} ${def.label}` : 'What did you do?'}</h2>
          </div>
          <button className="icon-btn" onClick={own && !start ? () => setOwn(null) : def ? () => setType(null) : onClose} aria-label={(own && !start) || def ? 'Back' : 'Close'}><IconClose /></button>
        </div>

        {own ? (
          <>
            <div className="card rt-adjust own-adjust">
              <Stepper label="Sets" value={it.sets} min={1} max={20} onChange={(v) => setIt({ ...it, sets: v })} />
              {it.kind === 'time'
                ? <Stepper label="Seconds" value={it.sec} step={5} min={5} max={600} onChange={(v) => setIt({ ...it, sec: v })} />
                : <Stepper label="Reps" value={it.reps} min={1} max={100} onChange={(v) => setIt({ ...it, reps: v })} />}
              {it.kg != null && <Stepper label="Weight" unit="kg" value={it.kg} step={0.5} min={0} max={200} onChange={(v) => setIt({ ...it, kg: v })} />}
            </div>
            <p className="earn-line"><b className="pos">+{fmt(ownKcal)} kcal</b> earned<span> · about {Math.round(ownW.min)} min with rests</span></p>
            {own.done && <p className="fine center">Already done once today. This logs it again.</p>}
            <button className="btn-primary" onClick={() => onSave({ ...ownW, ...(own.done ? { rid: undefined } : {}) })}>Deposit {fmt(ownKcal)} kcal</button>
            <p className="fine">Change the numbers for today only. To change your usual amounts, use Adjust in My routine on the Train tab.</p>
          </>
        ) : !def ? (
          <>
          {mine.length > 0 && (
            <>
              <h3 className="ex-h">Yours</h3>
              <div className="card mine-list">
                {mine.map((m) => (
                  <button key={m.key} className={`mine-row ${m.done ? 'done' : ''}`} onClick={() => pickOwn(m)}>
                    <span className="w-emoji small">{m.item.emoji}</span>
                    <span className="ex-main"><b>{m.item.name}</b><small>{m.done ? 'Done today ✓' : m.dose}</small></span>
                    <span className="pos">+{fmt(workoutKcal(routineWorkout(m.item), profile.weight))}</span>
                  </button>
                ))}
              </div>
              <h3 className="ex-h">Everything else</h3>
            </>
          )}
          <div className="workout-grid">
            {WORKOUTS.map((w) => (
              <button key={w.id} className="workout-choice" onClick={() => setType(w.id)}>
                <span className="w-emoji">{w.emoji}</span>
                <span>{w.label}</span>
              </button>
            ))}
          </div>
          </>
        ) : (
          <>
            <div className="card form-list">
              {def.kind === 'min' && <Line label="Minutes"><In v={f.min} on={set('min')} ph="20" /></Line>}
              {(def.kind === 'sec' || def.kind === 'reps' || def.kind === 'weights') && <Line label="Sets"><In v={f.sets} on={set('sets')} ph="3" /></Line>}
              {def.kind === 'sec' && <Line label="Seconds per set"><In v={f.sec} on={set('sec')} ph="30" /></Line>}
              {(def.kind === 'reps' || def.kind === 'weights') && <Line label="Reps per set"><In v={f.reps} on={set('reps')} ph="15" /></Line>}
              {def.kind === 'weights' && <Line label="Weight per dumbbell"><In v={f.kg} on={set('kg')} ph="5" unit="kg" decimal /></Line>}
            </div>
            <p className="earn-line">
              <b className="pos">+{fmt(kcal)} kcal</b> earned
              {mins > 0 && <span> · about {mins < 1 ? `${Math.round(mins * 60)} s` : `${Math.round(mins)} min`} of effort</span>}
            </p>
            <button className="btn-primary" disabled={kcal <= 0 && mins <= 0} onClick={() => onSave({ ...entry, kcal })}>
              {kcal > 0 ? `Deposit ${fmt(kcal)} kcal` : 'Log it'}
            </button>
            <p className="fine">Estimates use your weight ({profile.weight || '—'} kg) and standard exercise intensity values.</p>
          </>
        )}
      </div>
    </div>
  )
}

function Line({ label, children }) {
  const kids = Children.map(children, (c) => (isValidElement(c) && c.type === In && !c.props['aria-label'] ? cloneElement(c, { 'aria-label': label }) : c))
  return <div className="line"><span className="line-label">{label}</span>{kids}</div>
}
function In({ v, on, ph, unit, decimal, 'aria-label': al }) {
  return (
    <label className="num-in">
      <input inputMode={decimal ? 'decimal' : 'numeric'} value={v} onChange={on} placeholder={ph} aria-label={al} />
      {unit && <span>{unit}</span>}
    </label>
  )
}
