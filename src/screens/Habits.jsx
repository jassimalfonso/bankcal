import { useEffect, useRef, useState } from 'react'
import { HABITS, JOURNAL_PROMPTS, MOODS, habitById, habitDays, suggestHabits } from '../habits'

// Today: tick tiny habits. No streak pressure — just a quiet row of dots for the week.
export function HabitsCard({ profile, updateProfile, dayLog, setDay, today, goSetup }) {
  const mine = profile.habits ?? []
  const done = dayLog.habits ?? {}
  if (!mine.length) {
    return (
      <section className="block">
        <h2 className="group-title">Tiny habits</h2>
        <div className="card habit-empty">
          <p><b>Start with one small habit.</b> Little things done most days add up more than big plans.</p>
          <div className="habit-sugs">
            {suggestHabits(profile.goal).map((id) => (
              <button key={id} className="chip" onClick={() => updateProfile({ habits: [id] })}>{habitById[id].emoji} {habitById[id].label}</button>
            ))}
          </div>
        </div>
      </section>
    )
  }
  return (
    <section className="block">
      <div className="block-head">
        <h2 className="group-title">Tiny habits</h2>
        <button className="link-btn" onClick={() => goSetup('habits')}>Edit</button>
      </div>
      <div className="card habit-list">
        {mine.map((id) => {
          const h = habitById[id]
          if (!h) return null
          const week = habitDays(profile.days, id, today)
          const two = habitDays(profile.days, id, today, 14).filter(Boolean).length
          const on = !!done[id]
          return (
            <button key={id} className={`habit ${on ? 'on' : ''}`} onClick={() => setDay(today, { habits: { ...done, [id]: !on } })} aria-pressed={on}>
              <span className="h-emoji">{h.emoji}</span>
              <span className="h-main">
                <b>{h.label}</b>
                <span className="h-dots" aria-label={`${week.filter(Boolean).length} of the last 7 days`}>
                  {week.map((x, i) => <i key={i} className={x ? 'on' : ''} />)}
                  {two >= 10 && <small>Becoming a habit 🌱</small>}
                </span>
              </span>
              <span className={`check ${on ? 'on' : ''}`} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </section>
  )
}

// Settings: choose up to three.
export function HabitPicker({ profile, updateProfile }) {
  const mine = profile.habits ?? []
  const toggle = (id) => updateProfile({ habits: mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id].slice(-3) })
  return (
    <>
      <h2 className="group-title" id="habits">Tiny habits</h2>
      <div className="card form-list">
        {HABITS.map((h) => (
          <button key={h.id} className="pick" onClick={() => toggle(h.id)}>
            <span><b>{h.emoji} {h.label}</b><small>{h.why}</small></span>
            <span className={`check ${mine.includes(h.id) ? 'on' : ''}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className="fine">Pick up to 3. Start with one, and add another once it feels automatic. Missing a day is fine; just pick it up the next.</p>
    </>
  )
}

// Today: an optional note. Private, saved as you type.
export function JournalCard({ dayLog, setDay, today }) {
  const j = dayLog.journal ?? {}
  const [text, setText] = useState(j.text ?? '')
  const [open, setOpen] = useState(!!j.text || !!j.mood)
  const timer = useRef()
  useEffect(() => { setText(dayLog.journal?.text ?? '') }, [today]) // eslint-disable-line react-hooks/exhaustive-deps
  const prompt = JOURNAL_PROMPTS[+today.slice(8) % JOURNAL_PROMPTS.length]
  const save = (patch) => setDay(today, { journal: { ...j, text, ...patch } })
  const onType = (v) => { setText(v); clearTimeout(timer.current); timer.current = setTimeout(() => save({ text: v }), 800) }
  return (
    <section className="block">
      <h2 className="group-title">Journal</h2>
      <div className="card journal">
        <p className="j-prompt">{prompt}</p>
        <div className="j-moods" role="radiogroup" aria-label="How was today?">
          {MOODS.map((m) => (
            <button key={m.id} role="radio" aria-checked={j.mood === m.id} className={j.mood === m.id ? 'on' : ''} onClick={() => { save({ mood: m.id }); setOpen(true) }}>
              <span>{m.e}</span><small>{m.label}</small>
            </button>
          ))}
        </div>
        {open ? (
          <textarea value={text} onChange={(e) => onType(e.target.value)} onBlur={() => save({ text })} rows={3} placeholder="Write as much or as little as you like…" aria-label="Journal note" />
        ) : (
          <button className="link-btn" onClick={() => setOpen(true)}>Write a note</button>
        )}
        <p className="fine">Optional, and only you can see it.</p>
      </div>
    </section>
  )
}
