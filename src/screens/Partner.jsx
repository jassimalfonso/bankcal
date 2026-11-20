import { useRef, useState } from 'react'
import ShareSheet from './ShareSheet'
import Character from '../Character'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'

// One tap sends these. [sticker, words]
// Everyday cheers, rotated so the same ones don't keep coming up. [sticker, words]
const QUICK = [
  ['👋', 'Just dropping by to say hi'], ['💪', 'You’ve got this'], ['❤️', 'Proud of you'], ['🙏', 'Praying for you'],
  ['🥚', 'You’re egg-cellent'], ['🥑', 'Holy guacamole, look at you go'], ['💧', 'Drink some water!'], ['🚶', 'Walk with me later?'],
  ['😘', 'Thinking of you'], ['🍽️', 'What’s for dinner?'], ['🌟', 'One good choice at a time'], ['🤗', 'Sending you a hug'],
  ['🎯', 'Small steps still count'], ['😄', 'You make this fun'], ['🌱', 'Every day you show up matters'], ['🥗', 'Let’s eat well together today'],
]
// Cheers that fit what your partner actually did today (best ones first)
function suggestFor(s, info) {
  const h = new Date().getHours()
  const out = []
  // (each idea is [sticker, words, fitsTheirDay])
  if (info.fresh && s.moved) out.push(['💪', 'Saw you moved today. Love it!', true])
  if (s.streak >= 3) out.push(['🔥', `${s.streak} days in a row! Unstoppable`, true])
  if (info.fresh && s.habitsTotal > 0 && s.habitsDone >= s.habitsTotal) out.push(['✅', 'All your habits done. Wow!', true])
  if (s.weekLogged >= 4 && s.weekWithin >= s.weekLogged - 1) out.push(['🎯', `${s.weekWithin} of ${s.weekLogged} days on budget. What a week!`, true])
  if (s.kgChange != null && s.kgChange <= -0.5) out.push(['📉', `${Math.abs(s.kgChange).toFixed(1)} kg down. So proud of you`, true])
  if (s.weekWorkouts >= 3) out.push(['🏋️', `${s.weekWorkouts} workouts this week. Strong!`, true])
  if (h < 11) out.push(['☀️', 'Good morning! Rooting for you today', true])
  else if (h >= 20) out.push(['🌙', 'Well done today. Rest well tonight', true])
  else if (!info.fresh) out.push(['👀', 'Thinking of you. How’s your day going?', true])
  return out
}
const STICKERS = ['💌', '👋', '😘', '🥳', '💪', '🔥', '🌟', '🤗', '🥚', '🥑']
const SEEN = (me, id) => `bankcal:note:${me}:${id}`

const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = new Date(t)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const cheerText = (c) => (!c.msg || c.msg === '👏' ? '👏 Cheer' : `${c.s ? c.s + ' ' : ''}${c.msg}`)
// How many cheers a record holds. Cheers sent before counting began count as one.
const countOf = (c) => (c ? c.count ?? (c.log?.length || 1) : 0)

// Today: how your partner is doing. Tap them for the full picture; cheer as often as you like.
export function PartnerCard({ partner, today, notify, profile, myTicks = 0, streakDays = 0 }) {
  const { partners, shares, cheer, me: myId, received = {} } = partner
  const [open, setOpen] = useState(null)
  const [justSent, setJustSent] = useState(null)
  const [replyTo, setReplyTo] = useState(false)
  const [together, setTogether] = useState(null) // partner id, for the shared picture
  const [, bump] = useState(0)
  const list = partners.map((id) => [id, shares[id]]).filter(([, s]) => s)
  if (!list.length) return null
  // Shared weekly goal: each habit on 5 of 7 days, added up across everyone linked
  const habitsAll = (profile?.habits ?? []).length + list.reduce((a, [, s]) => a + (s.habitsTotal ?? 0), 0)
  const team = habitsAll > 0 ? { target: habitsAll * 5, ticks: myTicks + list.reduce((a, [, s]) => a + (s.weekTicks ?? 0), 0) } : null
  if (team) team.done = team.ticks >= team.target
  const send = async (id, name, msg = '👏', sticker = '') => {
    try {
      await cheer(id, msg, sticker)
      setJustSent(id); setTimeout(() => setJustSent((x) => (x === id ? null : x)), 1800)
      notify(msg === '👏' ? `Cheer sent to ${name}` : `${sticker || '💌'} Note sent to ${name}`)
    } catch { notify('Couldn’t send that. Check your connection.') }
  }
  const today_ = (s) => {
    const fresh = s.day === today
    return { fresh, bits: [
      s.streak > 1 && `🔥 ${s.streak} days`,
      fresh && s.habitsTotal > 0 && `${s.habitsDone}/${s.habitsTotal} habits`,
      fresh && s.moved && 'moved today',
      fresh && s.logged && !s.moved && 'logging today',
    ].filter(Boolean) }
  }
  const sel = open && shares[open]
  // Their newest note you haven't read yet sits on the card like a sticky note
  const unread = (id) => {
    const c = received[id]
    if (!c || !c.msg || c.msg === '👏' || Date.now() - c.at > 3 * 864e5) return null
    let seen = 0
    try { seen = +localStorage.getItem(SEEN(myId, id)) || 0 } catch { /* ignore */ }
    return c.at > seen ? c : null
  }
  const markRead = (id, c) => { try { localStorage.setItem(SEEN(myId, id), String(c.at)) } catch { /* ignore */ } bump((n) => n + 1) }
  return (
    <section className="block">
      <h2 className="group-title">Together</h2>
      {team && <TeamGoal team={team} />}
      {list.map(([id, s]) => {
        const c = unread(id)
        return c && (
          <div key={'n' + id} className="sticky-note" role="status">
            <span className="sn-sticker" aria-hidden="true">{c.s || '💌'}</span>
            <p>{c.msg}</p>
            <small>{s.name} · {ago(c.at)}</small>
            <div className="sn-acts">
              <button onClick={() => { send(id, s.name, 'Loved your note', '❤️'); markRead(id, c) }}>❤️ Love it</button>
              <button onClick={() => { markRead(id, c); setReplyTo(true); setOpen(id) }}>Reply</button>
              <button onClick={() => markRead(id, c)} aria-label="Mark as read">✓</button>
            </div>
          </div>
        )
      })}
      <div className="card partner-list">
        {list.map(([id, s]) => {
          const { fresh, bits } = today_(s)
          return (
            <div className={`partner theme-${s.theme}`} key={id}>
              <button className="p-open" onClick={() => setOpen(id)} aria-label={`See ${s.name}’s progress`}>
                <Character kind={s.character} mood={fresh ? 'happy' : 'calm'} size={46} />
                <span className="p-main">
                  <b>{s.name}</b>
                  <small>{bits.length ? bits.join(' · ') : fresh ? 'Starting the day' : 'Hasn’t opened BankCal yet today'}</small>
                </span>
                <span className="chev" aria-hidden="true">›</span>
              </button>
              <button className={`cheer ${justSent === id ? 'done' : ''}`} onClick={() => send(id, s.name)}>{justSent === id ? 'Sent ✓' : '👏 Cheer'}</button>
            </div>
          )
        })}
      </div>
      {together && shares[together] && (() => {
        const p = shares[together]
        const n = countOf(p.cheers?.[myId]) + countOf(received[together])
        return (
          <ShareSheet kind="together" title={`Share you and ${p.name}`} file="together.png" buddies={[profile?.character, p.character]} notify={notify} onClose={() => setTogether(null)}
            data={{ names: `${profile?.name}\n& ${p.name}`, team: team && { ticks: team.ticks, target: team.target }, stats: [
              (streakDays > 0 || p.streak > 0) && { emoji: '🔥', value: `${streakDays} + ${p.streak ?? 0}`, label: 'day streaks' },
              n > 0 && { emoji: '💌', value: String(n), label: 'cheers & notes' },
            ].filter(Boolean) }} />
        )
      })()}
      {sel && <PartnerSheet s={sel} sent={sel.cheers?.[myId]} got={received[open]} info={today_(sel)} team={team} myTicks={myTicks} me={profile?.name} reply={replyTo} onShare={() => setTogether(open)} onCheer={(msg, st) => send(open, sel.name, msg, st)} onClose={() => { setOpen(null); setReplyTo(false) }} />}
    </section>
  )
}

function TeamGoal({ team, split }) {
  return (
    <div className={`card team ${team.done ? 'done' : ''}`}>
      <div className="team-top"><span>This week together</span><b>{team.ticks} / {team.target} habit ticks</b></div>
      <div className="ws-bar"><i style={{ width: `${Math.max(3, Math.min(100, (team.ticks / team.target) * 100))}%` }} /></div>
      {split && <p className="team-split">{split}</p>}
      <p className="fine">{team.done ? 'You reached this week’s goal together. Well done, both of you! 🎉' : `${team.target - team.ticks} more to reach this week’s shared goal. Every tick from either of you counts.`}</p>
    </div>
  )
}

function PartnerSheet({ s, sent, got, info, team, myTicks, me, reply, onCheer, onShare, onClose }) {
  const [note, setNote] = useState('')
  const [sticker, setSticker] = useState('💌')
  const [pickSticker, setPickSticker] = useState(false)
  const [more, setMore] = useState(0) // 🔀 rotates the everyday ideas
  const [allLog, setAllLog] = useState(false)
  const [writing, setWriting] = useState(!!reply)
  const [sentKey, setSentKey] = useState(null) // the card that was just sent, for a moment of "Sent ✓"
  const send = (t, e) => {
    if (sentKey) return
    setSentKey(t); onCheer(t, e)
    try { navigator.vibrate?.([8, 30, 8]) } catch { /* ignore */ }
    setTimeout(() => { setSentKey(null); setMore((m) => m) }, 1400)
  }
  const noteRef = useRef(null)
  const focusNote = (el) => { noteRef.current = el; if (el && reply && !el.dataset.done) { el.dataset.done = 1; setTimeout(() => { el.scrollIntoView({ block: 'center' }); el.focus() }, 350) } }
  const drop = () => { if (!note.trim()) return; onCheer(note.trim(), sticker); setNote(''); setWriting(false) }
  const all = [
    ...(sent?.log ?? []).map((c) => ({ ...c, who: 'You' })),
    ...(got?.log ?? []).map((c) => ({ ...c, who: s.name })),
  ].sort((a, b) => a.at - b.at)
  // "Loved your note" becomes a ❤️ on the note it was for, instead of its own line
  const log = []
  for (const c of all) {
    if (c.msg === 'Loved your note') {
      const target = [...log].reverse().find((x) => x.who !== c.who && x.msg && x.msg !== '👏')
      if (target) { target.loved = true; continue }
    }
    log.push({ ...c })
  }
  log.reverse()
  const day0 = new Date().setHours(0, 0, 0, 0)
  const todayN = all.filter((c) => c.at >= day0).length
  // suggestions: what fits their day first, then everyday ideas; nothing you sent in the last 3 days
  const recent = new Set((sent?.log ?? []).filter((c) => c.at > Date.now() - 3 * 864e5).map((c) => c.msg))
  const daySeed = Math.floor(Date.now() / 864e5)
  const everyday = QUICK.filter(([, t]) => !recent.has(t))
  const rot = everyday.length ? (daySeed * 3 + more * 3) % everyday.length : 0
  const ideas = [...suggestFor(s, info).filter(([, t]) => !recent.has(t)), ...everyday.slice(rot), ...everyday.slice(0, rot)]
  const shown = more === 0 ? ideas.slice(0, 3) : [...everyday.slice(rot), ...everyday.slice(0, rot)].slice(0, 3)
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const rows = [
    ['Streak within budget', s.streak > 0 ? `🔥 ${s.streak} day${s.streak > 1 ? 's' : ''}` : 'Not started yet'],
    ['Habits today', s.habitsTotal > 0 ? (info.fresh ? `${s.habitsDone} of ${s.habitsTotal} ticked` : 'Not yet today') : 'No habits chosen yet'],
    ['Moved today', info.fresh && s.moved ? 'Yes 💪' : 'Not yet'],
    ['Last 7 days', s.weekLogged > 0 ? `${s.weekWithin} of ${s.weekLogged} logged days on budget` : 'Nothing logged yet'],
    ['Workouts, last 7 days', s.weekWorkouts > 0 ? String(s.weekWorkouts) : 'None yet'],
    s.kgChange != null && ['Weight so far', `${s.kgChange < 0 ? '−' : s.kgChange > 0 ? '+' : ''}${Math.abs(s.kgChange).toFixed(1)} kg${s.goalPct != null ? ` · ${s.goalPct}% to goal` : ''}`],
  ].filter(Boolean)
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className={`sheet partner-sheet theme-${s.theme}`} style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${s.name}’s progress`}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div className="psh-who">
            <Character kind={s.character} mood="happy" size={56} />
            <div><p className="muted">{info.fresh ? 'Active today' : 'Not in yet today'}</p><h2>{s.name}</h2></div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="cheer-ideas">
          <div className="ci-head">
            <b>Make {s.name}’s day</b>
            <button className="ci-shuffle" onClick={() => setMore((m) => m + 1)} aria-label="Show other ideas">🔀</button>
          </div>
          {shown[0] && (() => {
            const [e, t, fits] = shown[0]
            const done = sentKey === t
            return (
              <button key={t + more} className={`ci-feature ${done ? 'sent' : ''}`} onClick={() => send(t, e)} disabled={!!sentKey}>
                {fits && !done && <small className="ci-tag">Fits their day</small>}
                <span className="ci-big">{done ? '💌' : e}</span>
                <span className="ci-text">{done ? `Sent to ${s.name}!` : t}</span>
                <span className="ci-go">{done ? '✓' : 'Tap to send'}</span>
              </button>
            )
          })()}
          <div className="ci-pair">
            {shown.slice(1, 3).map(([e, t]) => (
              <button key={t + more} className={`ci-small ${sentKey === t ? 'sent' : ''}`} onClick={() => send(t, e)} disabled={!!sentKey}>
                <span className="ci-emo">{sentKey === t ? '✓' : e}</span>
                <span>{sentKey === t ? 'Sent!' : t}</span>
              </button>
            ))}
          </div>
        </div>
        {!writing ? (
          <button className="ci-write" onClick={() => setWriting(true)}>✏️ Write your own note</button>
        ) : (
        <div className="note-box">
          <div className="nb-write">
            <button className="nb-sticker" onClick={() => setPickSticker((x) => !x)} aria-label="Change sticker" aria-expanded={pickSticker}>{sticker}</button>
            <textarea ref={focusNote} value={note} onChange={(e) => setNote(e.target.value.slice(0, 120))} rows={1} placeholder={`Write something for ${s.name}…`} aria-label="Your note" enterKeyHint="send" autoFocus={!reply}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); drop() } }} />
            <button className="btn-primary" disabled={!note.trim()} onClick={drop}>Send</button>
          </div>
          {pickSticker && (
            <div className="nb-stickers" role="radiogroup" aria-label="Sticker">
              {STICKERS.map((e) => <button key={e} role="radio" aria-checked={sticker === e} className={sticker === e ? 'on' : ''} onClick={() => { setSticker(e); setPickSticker(false) }}>{e}</button>)}
            </div>
          )}
          {note.length > 90 && <small className="nb-count">{120 - note.length} left</small>}
        </div>
        )}
        <p className="fine center ci-foot">Lands on {s.name}’s Today like a sticky note 📌</p>

        <h3 className="ex-h">{s.name}’s progress</h3>
        <ul className="psh-rows">{rows.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}</ul>
        {s.kgChange == null && <p className="fine">{s.name} hasn’t switched on sharing weight progress.</p>}

        {team && <TeamGoal team={team} split={`${me ?? 'You'}: ${myTicks} · ${s.name}: ${s.weekTicks ?? 0}`} />}
        <button className="btn-soft share-us" onClick={onShare}>💞 Share us as a picture</button>


        <h3 className="ex-h">Between you</h3>
        <p className="cheer-sum">You sent <b>{countOf(sent)}</b> · {s.name} sent <b>{countOf(got)}</b>{todayN ? <> · <b>{todayN}</b> today</> : ''}</p>
        {log.length > 0 ? (
          <ul className="cheer-log">
            {log.slice(0, allLog ? 30 : 5).map((c, i) => (
              <li key={i} className={c.who === 'You' ? 'mine' : ''}>
                <span><b>{c.who}</b> {cheerText(c)}{c.loved && <i className="cl-loved" title="Loved">❤️</i>}</span>
                <small>{ago(c.at)}</small>
                {c.who !== 'You' && c.msg && c.msg !== '👏' && !c.loved && (
                  <span className="cl-acts">
                    <button onClick={() => onCheer('Loved your note', '❤️')} aria-label={`Love ${s.name}’s note`}>❤️</button>
                    <button onClick={() => { setWriting(true); setTimeout(() => { noteRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); noteRef.current?.focus() }, 50) }}>Reply</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="fine">Nothing yet. Send the first one!</p>}
        {log.length > 5 && <button className="link-btn cl-more" onClick={() => setAllLog((x) => !x)}>{allLog ? 'Show less' : `Show all (${Math.min(30, log.length)})`}</button>}
      </div>
    </div>
  )
}

// Settings: link a partner with a code.
export function PartnerSettings({ partner, profile, updateProfile }) {
  const { partners, shares, createInvite, acceptInvite, removePartner, push } = partner
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fn) => { setBusy(true); setMsg(''); try { await fn() } catch (e) { setMsg(e.message || 'Something went wrong. Try again.') } setBusy(false) }
  return (
    <>
      <h2 className="group-title" id="partner">Partner</h2>
      <div className="card partner-set">
        {partners.map((id) => (
          <div className="ps-row" key={id}>
            <span><b>{shares[id]?.name ?? 'Connecting…'}</b><small>Linked</small></span>
            <button className="link-btn danger" onClick={() => removePartner(id)}>Remove</button>
          </div>
        ))}
        {profile.inviteCode ? (
          <div className="ps-code">
            <span>Your code</span>
            <b>{profile.inviteCode}</b>
            <small>Ask your partner to enter it under Settings → Partner. You’ll link automatically.</small>
          </div>
        ) : (
          <button className="btn-soft" disabled={busy} onClick={() => run(createInvite)}>Get a code to share</button>
        )}
        <form className="ps-enter" onSubmit={(e) => { e.preventDefault(); run(async () => { const n = await acceptInvite(code); setCode(''); setMsg(`Linked with ${n} 🎉`) }) }}>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="Enter their code…" aria-label="Partner code" autoCapitalize="characters" autoComplete="off" spellCheck={false} />
          <button className="btn-soft" disabled={busy || code.length !== 6}>Link</button>
        </form>
        {msg && <p className="ps-msg" role="status">{msg}</p>}
        {partners.length > 0 && push && (
          <label className="keep-food ps-share">
            <input type="checkbox" checked={push.on} disabled={busy} onChange={(e) => run(e.target.checked ? push.turnOn : push.turnOff)} />
            <span><b>Notify me</b> on this phone when I’m cheered{!push.supported && ' (open BankCal from your Home Screen to turn this on)'}</span>
          </label>
        )}
        <label className="keep-food ps-share">
          <input type="checkbox" checked={!!profile.shareWeight} onChange={(e) => updateProfile({ shareWeight: e.target.checked })} />
          <span>Also share my <b>weight progress</b> (kg lost so far and % to goal, not my actual weight)</span>
        </label>
      </div>
      <p className="fine">Partners always see your streak, habits ticked, whether you moved today, and how many of the last 7 days were on budget. Never your calories, meals, actual weight or journal.</p>
    </>
  )
}
