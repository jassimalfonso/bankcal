// Your collection: every journal note, and the verses, reflections and quotes you saved.
import { useMemo, useState } from 'react'
import { JOURNAL_PROMPTS, MOODS } from '../habits'
import { IconClose, IconHeart, IconShare } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { KIND_LABEL, copyFav, shareFav, toggleFav } from '../favorites'
import { JournalSheet } from './Habits'

const dateLong = (k) => new Date(k + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const monthOf = (k) => new Date(k + 'T12:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export default function CollectionSheet({ tab: start = 'journal', profile, updateProfile, setDay, today, notify, onClose }) {
  const [tab, setTab] = useState(start)
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('all')
  const [openDay, setOpenDay] = useState(null)
  const drag = useSheetDrag(onClose)
  useEscape(onClose)

  const notes = useMemo(() => Object.entries(profile.days ?? {})
    .filter(([, d]) => d?.journal && (d.journal.text?.trim() || d.journal.mood))
    .map(([day, d]) => ({ day, ...d.journal }))
    .sort((a, b) => (a.day < b.day ? 1 : -1)), [profile.days])
  const t = q.trim().toLowerCase()
  const shownNotes = t ? notes.filter((n) => n.text?.toLowerCase().includes(t)) : notes
  const favs = (profile.favorites ?? []).filter((f) => (kind === 'all' || f.kind === kind) && (!t || f.text.toLowerCase().includes(t) || f.ref?.toLowerCase().includes(t)))

  // group notes by month
  const groups = []
  for (const n of shownNotes) {
    const m = monthOf(n.day)
    if (groups.at(-1)?.m !== m) groups.push({ m, list: [] })
    groups.at(-1).list.push(n)
  }

  return (
    <>
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet collection" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your collection">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div>
            <p className="muted">Only you can see these</p>
            <h2>Your collection</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'journal'} className={tab === 'journal' ? 'on' : ''} onClick={() => setTab('journal')}>Journal · {notes.length}</button>
          <button role="tab" aria-selected={tab === 'favs'} className={tab === 'favs' ? 'on' : ''} onClick={() => setTab('favs')}>Favourites · {profile.favorites?.length ?? 0}</button>
        </div>

        {(tab === 'journal' ? notes.length > 3 : (profile.favorites?.length ?? 0) > 3) && (
          <label className="field col-search">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'journal' ? 'Search your notes' : 'Search your favourites'} aria-label="Search" autoComplete="off" />
          </label>
        )}

        {tab === 'journal' ? (
          notes.length === 0 ? (
            <p className="col-empty">Your notes will collect here. Write one on Today under Journal, even a single line counts.</p>
          ) : shownNotes.length === 0 ? (
            <p className="col-empty">No notes with “{q.trim()}”.</p>
          ) : groups.map((g) => (
            <div key={g.m}>
              <h3 className="ex-h">{g.m}</h3>
              <div className="card col-list">
                {g.list.map((n) => {
                  const mood = MOODS.find((m) => m.id === n.mood)
                  return (
                    <button key={n.day} className="col-note" onClick={() => setOpenDay(n.day)}>
                      <span className="col-mood" aria-label={mood?.label}>{mood?.e ?? '📝'}</span>
                      <span className="col-main">
                        <b>{n.day === today ? 'Today' : dateLong(n.day)}{mood ? ` · ${mood.label}` : ''}</b>
                        <span>{n.text?.trim() || 'Mood only'}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <>
            {(profile.favorites?.length ?? 0) > 0 && (
              <div className="meal-pick" role="radiogroup" aria-label="Show">
                {[['all', 'All'], ['verse', 'Verses'], ['reflection', 'Reflections'], ['motivation', 'Quotes']].map(([id, l]) => (
                  <button key={id} role="radio" aria-checked={kind === id} className={`chip ${kind === id ? 'on' : ''}`} onClick={() => setKind(id)}>{l}</button>
                ))}
              </div>
            )}
            {(profile.favorites?.length ?? 0) === 0 ? (
              <p className="col-empty">Tap ♡ Save under a verse, reflection or quote on Today and it will be kept here.</p>
            ) : favs.length === 0 ? (
              <p className="col-empty">Nothing here yet.</p>
            ) : favs.map((f) => (
              <div key={f.id} className="card col-fav">
                <small>{KIND_LABEL[f.kind]}</small>
                <p className={f.kind === 'reflection' ? '' : 'q'}>{f.kind === 'reflection' ? f.text : `“${f.text}”`}</p>
                {f.ref && <span className="col-ref">— {f.ref}</span>}
                <div className="w-acts">
                  <button onClick={() => shareFav(f, notify)}><IconShare size={18} /><span>Share</span></button>
                  <button onClick={() => copyFav(f, notify)}><span>Copy</span></button>
                  <button className="on" onClick={() => toggleFav(profile, updateProfile, f, notify)} aria-label="Remove from favourites"><IconHeart filled size={18} /><span>Remove</span></button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
      {openDay && (
        <JournalSheet
          day={openDay}
          prompt={JOURNAL_PROMPTS[+openDay.slice(8) % JOURNAL_PROMPTS.length]}
          j={profile.days?.[openDay]?.journal ?? {}}
          dayLog={profile.days?.[openDay] ?? {}}
          {...{ setDay, profile, today }}
          todays={[]} budget={null}
          onClose={() => setOpenDay(null)}
        />
      )}
    </>
  )
}
