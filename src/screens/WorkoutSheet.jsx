import { Children, cloneElement, isValidElement, useState } from 'react'
import { WORKOUTS, earned, fmt, workoutKcal, workoutMinutes } from '../calc'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { exerciseIndex, routineWorkout, searchExercises } from '../training'
import { useMemo } from 'react'
import { Stepper } from './Routine'

// Pick an exercise, enter amounts, see the calories it earns, deposit.
// `mine` = your routine and your own exercises, shown first since they're what you usually do.
export default function WorkoutSheet({ profile, mine = [], start = null, onClose, onSave, onKeep, steps, onSteps }) {
  const [stepsIn, setStepsIn] = useState(steps ? String(steps) : '')
  const stepsN = Math.max(0, Math.round(+stepsIn || 0))
  const stepsKcal = Math.round(earned({ steps: stepsN }, profile.weight).steps)
  const [type, setType] = useState(null)
  const [own, setOwn] = useState(start) // one of `mine`, being adjusted
  const [it, setIt] = useState(start?.item ?? null)
  const pickOwn = (m) => { setOwn(m); setIt(m.item); setKeep(m.kind === 'lib') }
  // search: yours, the exercise library and activities, like the food search
  const [q, setQ] = useState('')
  const [keep, setKeep] = useState(false) // save a library exercise to My routine
  const index = useMemo(() => exerciseIndex(profile, mine, WORKOUTS), [profile, mine])
  const found = q.trim() ? searchExercises(q, index) : []
  const pick = (r) => { if (r.kind === 'act') setType(r.type); else pickOwn(r) }
  const deposit = (w) => {
    if (keep && own?.kind === 'lib' && onKeep) {
      const id = `r${Date.now().toString(36)}`
      onKeep({ ...it, id })
      return onSave({ ...w, rid: id }) // counts as today's tick for the new routine item
    }
    onSave(w)
  }
  const ownW = it ? routineWorkout(it) : null
  const ownKcal = ownW ? workoutKcal(ownW, profile.weight) : 0
  const drag = useSheetDrag(onClose)
  // Back from a chosen exercise returns to the list first
  useEscape(() => { if (own && !start) setOwn(null); else if (type) setType(null); else onClose() })
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
            {own.kind === 'lib' && onKeep && (
              <label className="keep-food"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
                <span>Save to <b>My routine</b>, ready to deposit next time</span></label>
            )}
            <button className="btn-primary" onClick={() => deposit({ ...ownW, ...(own.done || own.kind === 'lib' ? { rid: undefined } : {}) })}>Deposit {fmt(ownKcal)} kcal</button>
            <p className="fine">{own.kind === 'lib' ? 'Set it to what you actually did.' : 'Change the numbers for today only. To change your usual amounts, use Adjust in My routine on the Train tab.'}</p>
          </>
        ) : !def ? (
          <>
          <label className="field has-clear ws-search">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. squats, cycling, curls…" aria-label="Search exercises" autoComplete="off" enterKeyHint="search" />
            {q && <button type="button" className="field-clear" aria-label="Clear search" onClick={(e) => { e.preventDefault(); setQ('') }}><IconClose size={18} /></button>}
          </label>
          {q.trim() ? (
            found.length ? (
              <div className="card mine-list ws-results">
                {found.map((r) => (
                  <button key={r.key} className={`mine-row ${r.done ? 'done' : ''}`} onClick={() => pick(r)}>
                    <span className="w-emoji small">{r.item.emoji}</span>
                    <span className="ex-main"><b>{r.item.name}</b><small>{r.kind === 'mine' ? (r.done ? 'Yours · done today ✓' : `Yours · ${r.dose}`) : r.kind === 'lib' ? `Sets × reps · ${r.dose}` : `Log ${r.dose}`}</small></span>
                    {r.kind !== 'act' ? <span className="pos">+{fmt(workoutKcal(routineWorkout(r.item), profile.weight))}</span> : <span className="ws-go">›</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="ws-none">
                <p>No match for “{q.trim()}”.</p>
                <button className="btn-soft" onClick={() => setType('custom')}>Log “{q.trim()}” by minutes</button>
              </div>
            )
          ) : (<>
          {onSteps && (
            <div className="card ws-steps">
              <span className="w-emoji small">👣</span>
              <label className="ex-main"><b>Steps today</b><small>Total from your phone or watch</small>
                <input type="number" inputMode="numeric" min="0" value={stepsIn} placeholder="0" aria-label="Steps today"
                  onChange={(e) => setStepsIn(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && stepsN !== (+steps || 0)) onSteps(stepsN) }} />
              </label>
              <button className="btn-primary ws-steps-go" disabled={stepsN === (+steps || 0)} onClick={() => onSteps(stepsN)}>
                Save{stepsKcal > 0 ? <small>+{fmt(stepsKcal)} kcal</small> : null}
              </button>
            </div>
          )}
          <h3 className="ex-h">Yours</h3>
          {mine.length === 0 && <p className="ws-empty">Nothing saved yet. Search an exercise above, and tick <b>Save to My routine</b> when you deposit it. It’ll wait here for next time.</p>}
          {mine.length > 0 && (
            <>
              <div className="card mine-list">
                {mine.map((m) => (
                  <button key={m.key} className={`mine-row ${m.done ? 'done' : ''}`} onClick={() => pickOwn(m)}>
                    <span className="w-emoji small">{m.item.emoji}</span>
                    <span className="ex-main"><b>{m.item.name}</b><small>{m.done ? 'Done today ✓' : m.dose}</small></span>
                    <span className="pos">+{fmt(workoutKcal(routineWorkout(m.item), profile.weight))}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <h3 className="ex-h">Everything else</h3>
          <div className="workout-grid">
            {WORKOUTS.map((w) => (
              <button key={w.id} className="workout-choice" onClick={() => setType(w.id)}>
                <span className="w-emoji">{w.emoji}</span>
                <span>{w.label}</span>
              </button>
            ))}
          </div>
          </>)}
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
            <button className="btn-primary" disabled={kcal <= 0 && mins <= 0} onClick={() => onSave({ ...entry, kcal, ...(type === 'custom' && q.trim() ? { label: q.trim().replace(/^./, (c) => c.toUpperCase()) } : {}) })}>
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
