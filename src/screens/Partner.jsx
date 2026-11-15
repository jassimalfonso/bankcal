import { useState } from 'react'
import Character from '../Character'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'

const CHEERS = ['👏 Go you!', '💪 You’ve got this', '❤️ Proud of you', '🙏 Praying for you']

// Today: how your partner is doing. Tap them for the full picture; cheer as often as you like.
export function PartnerCard({ partner, today, notify, profile, myTicks = 0 }) {
  const { partners, shares, cheer } = partner
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
      {sel && <PartnerSheet s={sel} info={today_(sel)} team={team} myTicks={myTicks} me={profile?.name} onCheer={(msg) => send(open, sel.name, msg)} onClose={() => setOpen(null)} />}
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

function PartnerSheet({ s, info, team, myTicks, me, onCheer, onClose }) {
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
        <p className="fine center">Cheer as often as you like. They’ll see it the next time BankCal is open.</p>
      </div>
    </div>
  )
}

// Settings: link a partner with a code.
export function PartnerSettings({ partner, profile, updateProfile }) {
  const { partners, shares, createInvite, acceptInvite, removePartner } = partner
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
        <label className="keep-food ps-share">
          <input type="checkbox" checked={!!profile.shareWeight} onChange={(e) => updateProfile({ shareWeight: e.target.checked })} />
          <span>Also share my <b>weight progress</b> (kg lost so far and % to goal, not my actual weight)</span>
        </label>
      </div>
      <p className="fine">Partners always see your streak, habits ticked, whether you moved today, and how many of the last 7 days were on budget. Never your calories, meals, actual weight or journal.</p>
    </>
  )
}
