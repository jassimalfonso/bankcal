import { createPortal } from 'react-dom'
import { Children, cloneElement, isValidElement, useEffect, useState } from 'react'
import { askFood, cleanExercises } from '../ai'
import { WORKOUTS, earned, fmt, workoutKcal, workoutMinutes } from '../calc'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { doseOf, exerciseIndex, routineWorkout, searchExercises } from '../training'
import { useMemo } from 'react'
import { Stepper } from './Routine'
import { Hl } from './AddSheet'
import Move, { WatchHow, hasMove } from '../Moves'

// Pick an exercise, enter amounts, see the calories it earns, deposit.
// `mine` = your routine and your own exercises, shown first since they're what you usually do.
export default function WorkoutSheet({ profile, mine = [], theirs = [], start = null, onClose, onSave, onKeep, steps, onSteps }) {
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
  const index = useMemo(() => exerciseIndex(profile, mine, WORKOUTS, theirs), [profile, mine, theirs])
  const found = q.trim() ? searchExercises(q, index) : []
  // not in the app's list? look it up online, like the food search
  const [ai, setAi] = useState({ busy: false, results: null, q: '' })
  const [aiAct, setAiAct] = useState(null) // an online activity being logged by minutes: { name, met }
  const term = q.trim()
  const [force, setForce] = useState('') // "Not it? Search online" was tapped for this search
  const thin = found.filter((r) => r.score >= 40).length < 2 || force === term.toLowerCase()
  useEffect(() => {
    if (term.length < 3 || !thin) { setAi({ busy: false, results: null, q: '' }); return }
    const key = term.toLowerCase()
    if (onlineSeen.has(key)) { setAi({ busy: false, results: onlineSeen.get(key), q: key }); return }
    setAi((a) => ({ ...a, busy: true }))
    let live = true
    const t = setTimeout(async () => {
      try {
        const j = await askFood({ mode: 'exercise', q: term })
        const have = new Set(index.map((e) => e.item.name.toLowerCase()))
        const list = cleanExercises(j.results).filter((x) => !have.has(x.name.toLowerCase())).map((x) => {
          if (x.kind === 'minutes') return { key: 'ai-' + x.name, kind: 'aimin', item: { name: x.name, emoji: x.emoji }, met: x.met, dose: 'by minutes' }
          const item = { name: x.name, emoji: x.emoji, kind: x.kind, sets: 3, ...(x.kind === 'time' ? { sec: 30 } : { reps: 10 }), ...(x.weighted ? { kg: 5 } : {}), ...(x.each ? { each: true } : {}), rest: 60, met: x.met }
          return { key: 'ai-' + x.name, kind: 'lib', ai: true, item, dose: doseOf(item) }
        })
        onlineSeen.set(key, list)
        if (live) setAi({ busy: false, results: list, q: key })
      } catch { if (live) setAi({ busy: false, results: [], q: key }) }
    }, 600)
    return () => { live = false; clearTimeout(t) }
  }, [term, thin]) // eslint-disable-line react-hooks/exhaustive-deps
  const online = ai.results ?? []
  const pick = (r) => { if (r.kind === 'aimin') { setAiAct({ name: r.item.name, met: r.met }); setType('custom') } else if (r.kind === 'act') { setAiAct(null); setType(r.type) } else pickOwn(r) }
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
  const entry = def ? { type, min: +f.min, sec: +f.sec, sets: +f.sets || 1, reps: +f.reps, kg: +f.kg, ...(type === 'custom' && aiAct ? { met: aiAct.met } : {}) } : null
  const kcal = entry ? workoutKcal(entry, profile.weight) : 0
  const mins = entry ? workoutMinutes(entry) : 0
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value.replace(/[^\d.]/g, '') }))

  return createPortal(
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Log a workout">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">Workouts earn calories</p>
            <h2>{own ? `${it.emoji} ${it.name}` : def ? `${def.emoji} ${type === 'custom' && aiAct ? aiAct.name : def.label}` : 'What did you do?'}</h2>
          </div>
          <button className="icon-btn" onClick={own && !start ? () => setOwn(null) : def ? () => setType(null) : onClose} aria-label={(own && !start) || def ? 'Back' : 'Close'}><IconClose /></button>
        </div>

        {own ? (
          <>
            <div className="ex-move slim">
              {hasMove(it.ex) && <Move id={it.ex} label={`How ${it.name} moves`} />}
              <WatchHow name={it.name} />
            </div>
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
          {q.trim() ? (() => {
            // one list, laid out like the food search: yours, the app's own, then online
            const row = (r) => (
              <button key={r.key} className={`suggest-row ws-row ${r.done ? 'done' : ''}`} onClick={() => pick(r)}>
                <span className="w-emoji small" aria-hidden="true">{r.item.emoji}</span>
                <span><b><Hl text={r.item.name} q={q} /></b><small>{r.kind === 'mine' ? (r.done ? 'Done today ✓' : r.dose) : r.from ? `${r.from}’s · ${r.dose}` : r.kind === 'lib' ? r.dose : r.kind === 'aimin' ? 'by minutes' : `by ${r.dose}`}</small></span>
                {r.kind === 'act' || r.kind === 'aimin' ? <span className="ws-go">›</span> : <span className="suggest-kcal pos">+{fmt(workoutKcal(routineWorkout(r.item), profile.weight))}<i>kcal</i></span>}
              </button>
            )
            const yours = found.filter((r) => r.kind === 'mine' || r.from)
            const rest = found.filter((r) => !yours.includes(r))
            const asked = ai.busy || ai.results != null
            return (
              <div className="card suggest ws-suggest">
                {yours.length > 0 && <p className="sg-h">Yours</p>}
                {yours.map(row)}
                {rest.length > 0 && yours.length > 0 && <p className="sg-h">More</p>}
                {rest.map(row)}
                {(ai.busy || online.length > 0) && <p className="sg-h">Online · AI estimate</p>}
                {ai.busy && !online.length && <div className="sg-skel" aria-label="Checking online"><i /><i /></div>}
                {online.map(row)}
                {asked && !ai.busy && !online.length && !found.length && <p className="sg-h">No match for “{term}”</p>}
                {!asked && term.length >= 3 && (
                  <button className="suggest-ai" onClick={() => setForce(term.toLowerCase())}>{found.length ? `Not it? Search online for “${term}”` : `Search online for “${term}”`}</button>
                )}
                {(!found.length || asked) && !ai.busy && (
                  <button className="suggest-ai" onClick={() => { setAiAct(null); setType('custom') }}>Log “{term}” by minutes instead</button>
                )}
              </div>
            )
          })() : (<>
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
          {theirs.length > 0 && (
            <>
              <h3 className="ex-h">🤝 {theirs[0].from}’s workouts</h3>
              <div className="card mine-list">
                {theirs.map((m) => (
                  <button key={m.key} className="mine-row" onClick={() => pickOwn(m)}>
                    <span className="w-emoji small">{m.item.emoji}</span>
                    <span className="ex-main"><b>{m.item.name}</b><small>{m.dose}</small></span>
                    <span className="pos">+{fmt(workoutKcal(routineWorkout(m.item), profile.weight))}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <h3 className="ex-h">Everything else</h3>
          <div className="workout-grid">
            {WORKOUTS.map((w) => (
              <button key={w.id} className="workout-choice" onClick={() => { setAiAct(null); setType(w.id) }}>
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
            <button className="btn-primary" disabled={kcal <= 0 && mins <= 0} onClick={() => onSave({ ...entry, kcal, ...(type === 'custom' && (aiAct || q.trim()) ? { label: aiAct?.name ?? q.trim().replace(/^./, (c) => c.toUpperCase()) } : {}) })}>
              {kcal > 0 ? `Deposit ${fmt(kcal)} kcal` : 'Log it'}
            </button>
            <p className="fine">Estimates use your weight ({profile.weight || '—'} kg) and standard exercise intensity values.</p>
          </>
        )}
      </div>
    </div>
  , document.body
  )
}

const onlineSeen = new Map() // exercises already looked up online this session

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
