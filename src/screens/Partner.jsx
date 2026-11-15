import { useState } from 'react'
import Character from '../Character'

// Today: how your partner is doing, and a one-tap cheer. Shares effort, never numbers.
export function PartnerCard({ partner, today, notify }) {
  const { partners, shares, cheer } = partner
  const [sent, setSent] = useState(() => { try { return JSON.parse(localStorage.getItem(`bankcal:cheered:${today}`) || '[]') } catch { return [] } })
  const list = partners.map((id) => [id, shares[id]]).filter(([, s]) => s)
  if (!list.length) return null
  const send = async (id, name) => {
    try {
      await cheer(id)
      const next = [...sent, id]
      setSent(next)
      try { localStorage.setItem(`bankcal:cheered:${today}`, JSON.stringify(next)) } catch { /* ignore */ }
      notify(`Cheer sent to ${name} 👏`)
    } catch { notify('Couldn’t send that. Check your connection.') }
  }
  return (
    <section className="block">
      <h2 className="group-title">Together</h2>
      <div className="card partner-list">
        {list.map(([id, s]) => {
          const fresh = s.day === today
          const bits = [
            s.streak > 1 && `🔥 ${s.streak} days`,
            fresh && s.habitsTotal > 0 && `${s.habitsDone}/${s.habitsTotal} habits`,
            fresh && s.moved && 'moved today',
            fresh && s.logged && !s.moved && 'logging today',
          ].filter(Boolean)
          return (
            <div className={`partner theme-${s.theme}`} key={id}>
              <Character kind={s.character} mood={fresh ? 'happy' : 'calm'} size={46} />
              <div className="p-main">
                <b>{s.name}</b>
                <small>{bits.length ? bits.join(' · ') : fresh ? 'Starting the day' : 'Hasn’t opened BankCal yet today'}</small>
              </div>
              <button className={`cheer ${sent.includes(id) ? 'done' : ''}`} disabled={sent.includes(id)} onClick={() => send(id, s.name)}>
                {sent.includes(id) ? 'Cheered' : '👏 Cheer'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// Settings: link a partner with a code.
export function PartnerSettings({ partner, profile }) {
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
      </div>
      <p className="fine">Partners see only your streak, how many habits you ticked and whether you moved today. Never your calories, weight or journal.</p>
    </>
  )
}
