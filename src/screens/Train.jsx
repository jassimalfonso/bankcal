import { createPortal } from 'react-dom'
import { useState } from 'react'
import { fmt, workoutKcal } from '../calc'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { EXERCISES, GROUPS, LEVELS, PLANS, exerciseById, routineFromCustom, routineFromExercise, routineWorkout, toSession, toWorkout, weightRange } from '../training'
import { CustomSheet, RoutineCard } from './Routine'

const range = (r) => (r ? `${r[0]}–${r[1]} kg` : null)

export default function Train(props) {
  const { profile, updateProfile, setDay, today, dayLog, celebrate } = props
  const level = profile.level ?? 'beginner'
  const favs = profile.favs ?? []
  const lifts = profile.lifts ?? {}
  const [group, setGroup] = useState('all')
  const [open, setOpen] = useState(null)
  const [browse, setBrowse] = useState(false)
  const active = PLANS.find((p) => p.id === profile.trainPlan?.id)
  const done = profile.trainPlan?.done ?? 0
  const session = active ? active.sessions[done % active.sessions.length] : null

  const toggleFav = (id) => updateProfile({ favs: favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id] })
  const setLift = (id, kg) => updateProfile({ lifts: { ...lifts, [id]: kg } })
  const kgFor = (ex) => lifts[ex.id] ?? weightRange(ex, profile.sex, level)?.[0] ?? 0

  const log = (exs, session) => {
    const ws = (session ? [session] : exs.map((ex) => toWorkout(ex, level, kgFor(ex)))).map((w) => ({ id: crypto.randomUUID?.() ?? String(Math.random()), ...w }))
    setDay(today, { workouts: [...(dayLog.workouts ?? []), ...ws] })
    const kcal = ws.reduce((a, w) => a + workoutKcal(w, profile.weight), 0)
    celebrate(session ? `Workout done! +${fmt(kcal)} kcal 💪` : `${exs[0].name} logged, +${fmt(kcal)} kcal`)
  }
  const finishSession = () => {
    log(null, toSession(active, session, level))
    updateProfile({ trainPlan: { ...profile.trainPlan, done: done + 1, last: today } })
  }

  // your own exercises and routine
  const customs = profile.customEx ?? []
  const routine = profile.routine ?? []
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState(null) // 'new' or an exercise being edited
  const saveCustom = (c) => updateProfile({
    customEx: customs.some((x) => x.id === c.id) ? customs.map((x) => (x.id === c.id ? c : x)) : [...customs, c],
    // the routine copy follows the name, icon and effort, and any amount that was just changed here
    routine: routine.map((it) => {
      if (it.ex !== c.id) return it
      const was = customs.find((x) => x.id === c.id) ?? {}
      const amounts = Object.fromEntries(['sets', 'reps', 'sec', 'kg'].filter((k) => c[k] != null && c[k] !== was[k] && (k !== 'kg' || c.weighted) && (k !== 'reps' || c.kind === 'reps') && (k !== 'sec' || c.kind === 'time')).map((k) => [k, +c[k]]))
      return { ...it, name: c.name, emoji: c.emoji, met: c.met, ...amounts }
    }),
  })
  const addRoutine = (item, quiet) => { updateProfile({ routine: [...(profile.routine ?? []), item] }); if (!quiet) props.notify(`${item.name} added to your routine`) }
  const inRoutine = (id) => routine.some((it) => it.ex === id)
  const t = q.trim().toLowerCase()
  const match = (e) => !t || e.name.toLowerCase().includes(t) || (e.muscles ?? '').toLowerCase().includes(t)
  const list = EXERCISES.filter((e) => (group === 'all' || e.group === group) && match(e))
  const mine = group === 'all' || group === 'mine' ? customs.filter(match) : []

  return (
    <>
      <header className="large-title">
        <div>
          <p className="date">Workouts with good form</p>
          <h1>Train</h1>
        </div>
      </header>

      <div className="seg level-seg" role="radiogroup" aria-label="Your level">
        {LEVELS.map((l) => (
          <button key={l.id} role="radio" aria-checked={level === l.id} className={level === l.id ? 'on' : ''} onClick={() => updateProfile({ level: l.id })}>{l.label}</button>
        ))}
      </div>
      <p className="fine level-hint">{LEVELS.find((l) => l.id === level).hint}. Sets, reps and weights below match this level.</p>

      <RoutineCard {...props} onCreate={() => setCustom('new')} />

      <h2 className="group-title">Your plan</h2>
      {active && !browse ? (
        <div className="card plan-card">
          <div className="pc-top">
            <span className="pc-emoji">{active.emoji}</span>
            <div><b>{active.name}</b><small>{active.days} days a week · about {toSession(active, session, level).min} min · {done} session{done === 1 ? '' : 's'} done</small></div>
          </div>
          <p className="pc-next">Next: <b>{session.name}</b>{profile.trainPlan?.last === today ? ' (you’ve already trained today, rest is fine too)' : ''}</p>
          <ul className="pc-list">
            {session.items.map((id) => {
              const ex = exerciseById[id], L = ex.levels[level], w = weightRange(ex, profile.sex, level)
              return (
                <li key={id}>
                  <button onClick={() => setOpen(ex)}>
                    <span className="ex-emoji">{ex.emoji}</span>
                    <span className="pc-ex"><b>{ex.name}</b><small>{L.sets} × {L.reps}{w ? ` · ${kgFor(ex)} kg` : ''}</small></span>
                    <span className="chev" aria-hidden="true">›</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="fine warmup">Warm up first: 5 minutes of brisk walking or jumping jacks, then a few easy reps of the first move.</p>
          <button className="btn-primary" onClick={finishSession}>I did this workout · +{fmt(workoutKcal(toSession(active, session, level), profile.weight))} kcal</button>
          <button className="link-btn center" onClick={() => setBrowse(true)}>Change plan</button>
        </div>
      ) : (
        <div className="plans">
          {PLANS.map((p) => (
            <button key={p.id} className={`card plan-pick ${active?.id === p.id ? 'on' : ''}`} onClick={() => { updateProfile({ trainPlan: { id: p.id, done: 0, start: today } }); setBrowse(false) }}>
              <span className="pc-emoji">{p.emoji}</span>
              <span><b>{p.name}</b><small>{p.days}×/week · about {toSession(p, p.sessions[0], level).min} min · {p.level}</small><em>{p.blurb}</em></span>
            </button>
          ))}
          {browse && <button className="link-btn center" onClick={() => setBrowse(false)}>Keep my current plan</button>}
        </div>
      )}

      {favs.length > 0 && (
        <>
          <h2 className="group-title">Favourites</h2>
          <div className="card ex-list">
            {favs.map((id) => exerciseById[id]).filter(Boolean).map((ex) => <ExRow key={ex.id} ex={ex} level={level} profile={profile} kg={kgFor(ex)} onOpen={() => setOpen(ex)} fav />)}
          </div>
        </>
      )}

      <h2 className="group-title">Exercises</h2>
      <label className="ex-search">
        <span aria-hidden="true">🔍</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises…" aria-label="Search exercises" autoComplete="off" />
        {q && <button onClick={() => setQ('')} aria-label="Clear search">✕</button>}
      </label>
      <div className="chips" role="tablist">
        {[...GROUPS, ...(customs.length ? [{ id: 'mine', label: 'Mine' }] : [])].map((g) => <button key={g.id} role="tab" aria-selected={group === g.id} className={`chip ${group === g.id ? 'on' : ''}`} onClick={() => setGroup(g.id)}>{g.label}</button>)}
      </div>
      <div className="card ex-list">
        {mine.map((c) => (
          <button className="ex-row" key={c.id} onClick={() => setCustom(c)}>
            <span className="ex-emoji">{c.emoji}</span>
            <span className="ex-main"><b>{c.name}</b><small>My exercise{inRoutine(c.id) ? ' · in my routine' : ''}</small></span>
            <span className="ex-dose">Edit</span>
          </button>
        ))}
        {list.map((ex) => <ExRow key={ex.id} ex={ex} level={level} profile={profile} kg={kgFor(ex)} onOpen={() => setOpen(ex)} fav={favs.includes(ex.id)} />)}
        {list.length + mine.length === 0 && <p className="ex-none">Nothing matches “{q}”. You can add it as your own exercise.</p>}
      </div>
      <button className="btn-soft create-ex" onClick={() => setCustom(q.trim() && list.length + mine.length === 0 ? { name: q.trim(), emoji: '✅', kind: 'reps', weighted: false, met: 3.8 } : 'new')}>＋ Create my own exercise</button>
      <p className="fine">These are general guides for healthy adults. Stop if anything hurts (beyond normal muscle effort), and check with a doctor first if you’re pregnant, injured or managing a health condition.</p>

      {open && (
        <ExerciseSheet ex={open} level={level} profile={profile} kg={kgFor(open)} fav={favs.includes(open.id)}
          onFav={() => toggleFav(open.id)} onKg={(v) => setLift(open.id, v)} onLog={() => { log([open]); setOpen(null) }} onClose={() => setOpen(null)}
          inRoutine={inRoutine(open.id)} onRoutine={() => addRoutine(routineFromExercise(open, level, kgFor(open)))} />
      )}
      {custom && (
        <CustomSheet initial={custom === 'new' ? null : custom} key={custom === 'new' ? 'new' : custom.id ?? custom.name} weight={profile.weight}
          inRoutine={custom !== 'new' && custom.id ? inRoutine(custom.id) : false}
          existing={customs} notify={props.notify} onOpen={(c) => setCustom(c)}
          onSave={saveCustom} onAddRoutine={(c) => addRoutine(routineFromCustom(c), true)}
          onLog={(c) => { const w = { id: crypto.randomUUID?.() ?? String(Math.random()), ...routineWorkout(routineFromCustom(c)), rid: undefined }; setDay(today, { workouts: [...(dayLog.workouts ?? []), w] }); celebrate(`${c.name} logged, +${fmt(workoutKcal(w, profile.weight))} kcal`) }}
          onDelete={(id) => updateProfile({ customEx: customs.filter((x) => x.id !== id), routine: routine.filter((it) => it.ex !== id) })}
          onClose={() => setCustom(null)} />
      )}
    </>
  )
}

function ExRow({ ex, level, profile, kg, onOpen, fav }) {
  const L = ex.levels[level], w = weightRange(ex, profile.sex, level)
  return (
    <button className="ex-row" onClick={onOpen}>
      <span className="ex-emoji">{ex.emoji}</span>
      <span className="ex-main"><b>{ex.name}{fav ? ' ★' : ''}</b><small>{L.variant}</small></span>
      <span className="ex-dose">{L.sets} × {L.reps}{w ? <small>{kg} kg</small> : null}</span>
    </button>
  )
}

function ExerciseSheet({ ex, level, profile, kg, fav, onFav, onKg, onLog, onClose, inRoutine, onRoutine }) {
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const L = ex.levels[level]
  const w = weightRange(ex, profile.sex, level)
  const order = LEVELS.map((l) => l.id)
  const easier = order[order.indexOf(level) - 1], harder = order[order.indexOf(level) + 1]
  const kcal = workoutKcal(toWorkout(ex, level, kg), profile.weight)
  return createPortal(
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet ex-sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={ex.name}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">{ex.muscles}</p>
            <h2>{ex.emoji} {ex.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="ex-dosecard">
          <div><span>Your version</span><b>{L.variant}</b></div>
          <div className="ex-grid">
            <div><span>Sets</span><b>{L.sets}</b></div>
            <div><span>Reps</span><b>{L.reps}</b></div>
            <div><span>Rest</span><b>{L.rest}</b></div>
          </div>
          <p className="fine">Equipment: {ex.equipment}</p>
        </div>

        {w && (
          <div className="ex-weight">
            <div className="ew-top">
              <div><span>Starting weight{ex.one ? '' : ' (each hand)'}</span><b>{range(w)}</b></div>
              <label className="ew-mine">
                <span>I use</span>
                <input inputMode="decimal" aria-label={`My weight for ${ex.name}`} value={kg} onChange={(e) => onKg(e.target.value.replace(/[^\d.]/g, ''))} />
                <span>kg</span>
              </label>
            </div>
            <p className="fine">Pick a weight where the last 2 reps feel hard but your form stays clean. When you can do the top of the rep range for every set, go up by 1–2 kg next time.</p>
          </div>
        )}

        <h3 className="ex-h">How to do it</h3>
        <ol className="ex-steps">{ex.steps.map((s) => <li key={s}>{s}</li>)}</ol>

        <h3 className="ex-h">Posture check</h3>
        <ul className="ex-cues good">{ex.cues.map((s) => <li key={s}>{s}</li>)}</ul>

        <h3 className="ex-h">Avoid</h3>
        <ul className="ex-cues bad">{ex.mistakes.map((s) => <li key={s}>{s}</li>)}</ul>

        <p className="ex-breath">🫁 {ex.breathing}</p>
        {ex.caution && <p className="ex-caution">⚠️ {ex.caution}</p>}

        <div className="ex-levels">
          {easier && <p><span>Easier</span>{ex.levels[easier].variant}</p>}
          {harder && <p><span>Harder</span>{ex.levels[harder].variant}</p>}
        </div>

        <button className="btn-soft ex-routine" disabled={inRoutine} onClick={onRoutine}>{inRoutine ? '✓ In my routine' : '＋ Add to my routine'}</button>
        <div className="ex-actions">
          <button className={`btn-ghost ${fav ? 'on' : ''}`} onClick={onFav} aria-pressed={fav}>{fav ? '★ Favourite' : '☆ Favourite'}</button>
          <button className="btn-primary" onClick={onLog}>Log it · +{fmt(kcal)} kcal</button>
        </div>
      </div>
    </div>
  , document.body
  )
}
