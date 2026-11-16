import { useState } from 'react'
import Character from '../Character'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'

const CHEERS = ['👏 Go you!', '💪 You’ve got this', '❤️ Proud of you', '🙏 Praying for you']

const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = new Date(t)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const cheerText = (msg) => (!msg || msg === '👏' ? '👏 Cheer' : msg)
// How many cheers a record holds. Cheers sent before counting began count as one.
const countOf = (c) => (c ? c.count ?? (c.log?.length || 1) : 0)

// Today: how your partner is doing. Tap them for the full picture; cheer as often as you like.
export function PartnerCard({ partner, today, notify, profile, myTicks = 0 }) {
  const { partners, shares, cheer, me: myId, received = {} } = partner
  const [open, setOpen] = useState(null)
  const [justSent, setJustSent] = useState(null)
  const list = partners.map((id) => [id, shares[id]]).filter(([, s]) => s)
  if (!list.length) return null
  // Shared weekly goal: each habit on 5 of 7 days, added up across everyone linked
  const habitsAll = (profile?.habits ?? []).length + list.reduce((a, [, s]) => a + (s.habitsTotal ?? 0), 0)
  const team = habitsAll > 0 ? { target: habitsAll * 5, ticks: myTicks + list.reduce((a, [, s]) => a + (s.weekTicks ?? 0), 0) } : null
  if (team) team.done = team.ticks >= team.target
  const send = async (id, name, msg = '👏') => {
    try {
      await cheer(id, msg)
      setJustSent(id); setTimeout(() => setJustSent((x) => (x === id ? null : x)), 1800)
      notify(`Sent to ${name}: ${msg}`)
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
  return (
    <section className="block">
      <h2 className="group-title">Together</h2>
      {team && <TeamGoal team={team} />}
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
      {sel && <PartnerSheet s={sel} sent={sel.cheers?.[myId]} got={received[open]} info={today_(sel)} team={team} myTicks={myTicks} me={profile?.name} onCheer={(msg) => send(open, sel.name, msg)} onClose={() => setOpen(null)} />}
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

function PartnerSheet({ s, sent, got, info, team, myTicks, me, onCheer, onClose }) {
  const log = [
    ...(sent?.log ?? []).map((c) => ({ ...c, who: 'You' })),
    ...(got?.log ?? []).map((c) => ({ ...c, who: s.name })),
  ].sort((a, b) => b.at - a.at)
  const day0 = new Date().setHours(0, 0, 0, 0)
  const todayN = log.filter((c) => c.at >= day0).length
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

        <ul className="psh-rows">{rows.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}</ul>
        {s.kgChange == null && <p className="fine">{s.name} hasn’t switched on sharing weight progress.</p>}

        {team && <TeamGoal team={team} split={`${me ?? 'You'}: ${myTicks} · ${s.name}: ${s.weekTicks ?? 0}`} />}

        <h3 className="ex-h">Send a cheer</h3>
        <div className="psh-cheers">
          {CHEERS.map((c) => <button key={c} className="btn-soft" onClick={() => onCheer(c)}>{c}</button>)}
        </div>
        <p className="fine center">Cheer as often as you like. If {s.name} has notifications on, their phone lets them know straight away.</p>

        <h3 className="ex-h">Cheers between you</h3>
        <div className="cheer-stats">
          <span><b>{countOf(sent)}</b>sent</span>
          <span><b>{countOf(got)}</b>received</span>
          <span><b>{todayN}</b>today</span>
        </div>
        {log.length > 0 ? (
          <ul className="cheer-log">
            {log.slice(0, 15).map((c, i) => (
              <li key={i} className={c.who === 'You' ? 'mine' : ''}><span><b>{c.who}</b> {cheerText(c.msg)}</span><small>{ago(c.at)}</small></li>
            ))}
          </ul>
        ) : <p className="fine">No cheers yet. Send the first one!</p>}
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
