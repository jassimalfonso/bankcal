import { useRef, useState } from 'react'
import { HABITS, JOURNAL_PROMPTS, MOODS, WINS, habitById, habitDays, journalStarters, suggestHabits } from '../habits'
import { sleepHours } from '../calc'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import CollectionSheet from './Collection'

// Today: tick tiny habits. No streak pressure — just a quiet row of dots for the week.
export function HabitsCard({ profile, updateProfile, dayLog, setDay, today, goSetup, celebrate }) {
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
            <button key={id} className={`habit ${on ? 'on' : ''}`} onClick={() => { setDay(today, { habits: { ...done, [id]: !on } }); if (!on && mine.length > 1 && mine.every((x) => x === id || done[x])) celebrate?.('All your habits done today! 🎉') }} aria-pressed={on}>
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

// Today: a compact journal card. Tapping it opens a calm writing sheet.
export function JournalCard({ dayLog, setDay, today, profile, updateProfile, notify, todays = [], budget }) {
  const j = dayLog.journal ?? {}
  const [open, setOpen] = useState(false)
  const [shelf, setShelf] = useState(false)
  const count = Object.values(profile.days ?? {}).filter((d) => d?.journal?.text?.trim() || d?.journal?.mood).length
  const prompt = JOURNAL_PROMPTS[+today.slice(8) % JOURNAL_PROMPTS.length]
  const mood = MOODS.find((m) => m.id === j.mood)
  const has = !!(j.text?.trim() || j.mood)
  return (
    <section className="block">
      <div className="block-head">
        <h2 className="group-title">Journal</h2>
        {count > 0 && <button className="link-btn" onClick={() => setShelf(true)}>All notes ({count})</button>}
      </div>
      <button className={`card journal-card ${has ? 'has' : ''}`} onClick={() => setOpen(true)}>
        {has ? (
          <>
            <span className="jc-top"><b>{mood ? `${mood.e} ${mood.label}` : 'Today’s note'}</b><em>Edit</em></span>
            {j.text?.trim() && <span className="jc-text">{j.text.trim()}</span>}
          </>
        ) : (
          <>
            <span className="jc-prompt">{prompt}</span>
            <span className="jc-cta">✍️ Write today’s note</span>
            <span className="jc-fine">Optional, takes a minute, and only you can see it.</span>
          </>
        )}
      </button>
      {open && <JournalSheet {...{ j, prompt, setDay, today, dayLog, profile, todays, budget }} onClose={() => setOpen(false)} />}
      {shelf && <CollectionSheet tab="journal" {...{ profile, updateProfile, setDay, today, notify }} onClose={() => setShelf(false)} />}
    </section>
  )
}

export function JournalSheet({ j, prompt, setDay, today, day = today, dayLog, profile, todays, budget, onClose }) {
  const [text, setText] = useState(j.text ?? '')
  const [mood, setMood] = useState(j.mood ?? null)
  const [saved, setSaved] = useState(false)
  const area = useRef()
  const timer = useRef()
  const drag = useSheetDrag(() => close())
  const persist = (t = text, m = mood) => { setDay(day, { journal: { text: t, mood: m, at: Date.now() } }); setSaved(true) }
  const close = () => { clearTimeout(timer.current); if (text !== (j.text ?? '') || mood !== (j.mood ?? null)) persist(); onClose() }
  useEscape(close)
  const onType = (v) => { setText(v); setSaved(false); clearTimeout(timer.current); timer.current = setTimeout(() => persist(v, mood), 900) }
  const starters = journalStarters({
    dayLog, mealsLogged: todays.length, left: budget != null ? budget - todays.reduce((a, e) => a + e.kcal, 0) : null,
    habitsDone: (profile?.habits ?? []).filter((id) => dayLog.habits?.[id]).length, sleepH: sleepHours(dayLog.sleep),
  })
  const start = (line) => {
    const v = text.trim() ? `${text.trimEnd()}\n${line}` : line
    onType(v)
    setTimeout(() => { const el = area.current; if (el) { el.focus(); el.setSelectionRange(v.length, v.length) } }, 60)
  }
  return (
    <div className="sheet-wrap" onClick={close}>
      <div className="sheet journal-sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Journal">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">{new Date(day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h2>{prompt}</h2>
          </div>
          <button className="icon-btn" onClick={close} aria-label="Close"><IconClose /></button>
        </div>

        <div className="j-moods" role="radiogroup" aria-label="How was today?">
          {MOODS.map((m) => (
            <button key={m.id} role="radio" aria-checked={mood === m.id} className={mood === m.id ? 'on' : ''} onClick={() => { const next = mood === m.id ? null : m.id; setMood(next); persist(text, next) }}>
              <span>{m.e}</span><small>{m.label}</small>
            </button>
          ))}
        </div>

        <div className="j-wins" role="group" aria-label="Any wins today?">
          <span>Any wins today? <small>Progress the scale can’t see</small></span>
          <div>
            {WINS.map((w) => {
              const on = (dayLog.wins ?? []).includes(w.id)
              return <button key={w.id} aria-pressed={on} className={`chip ${on ? 'on' : ''}`} onClick={() => setDay(day, { wins: on ? (dayLog.wins ?? []).filter((x) => x !== w.id) : [...(dayLog.wins ?? []), w.id] })}>{w.e} {w.label}</button>
            })}
          </div>
        </div>

        <textarea ref={area} value={text} onChange={(e) => onType(e.target.value)} rows={6} maxLength={3000} placeholder="Write as much or as little as you like…" aria-label="Journal note" />
        <p className="j-status" role="status">{saved ? 'Saved ✓' : text.trim() ? 'Saving…' : ' '}</p>

        {day === today && text.trim().length < 40 && (
          <div className="j-starters">
            <span>Not sure where to begin? Tap one to start:</span>
            {starters.map((s) => <button key={s} onClick={() => start(s)}>{s.trim().replace(/:$/, '')}…</button>)}
          </div>
        )}

        <button className="btn-primary" onClick={close}>Done</button>
        <p className="fine center">Private to you. All your notes are kept under Journal → All notes.</p>
      </div>
    </div>
  )
}
