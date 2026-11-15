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

// More settings: send weight from a smart scale (Zepp, etc.) through an iPhone Shortcut.
export function ScaleSync({ scale, profile, notify }) {
  const [busy, setBusy] = useState(false)
  const url = profile.syncKey ? `${location.origin}/api/weight?k=${profile.syncKey}&kg=` : ''
  const copy = async () => { try { await navigator.clipboard.writeText(url); notify('Link copied') } catch { notify('Press and hold the link to copy it') } }
  return (
    <>
      <h3 className="more-h">Smart scale (Zepp and others)</h3>
      {!profile.syncKey ? (
        <>
          <p className="fine">Send your morning weight to BankCal automatically from Apple Health, where the Zepp app saves it. Needs an iPhone and a one-time setup in the Shortcuts app.</p>
          <button className="btn-plain" disabled={busy} onClick={async () => { setBusy(true); try { await scale.connect() } catch { notify('Couldn’t set that up. Check your connection.') } setBusy(false) }}>Set up scale sync</button>
        </>
      ) : (
        <div className="scale">
          <p className="fine">{profile.lastSyncAt ? `Last weight received ${new Date(profile.lastSyncAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.` : 'Waiting for the first weight.'}</p>
          <ol className="scale-steps">
            <li>In <b>Zepp</b>: Profile → Add accounts → <b>Apple Health</b>, and allow <b>Weight</b>.</li>
            <li>Open the <b>Shortcuts</b> app → <b>Automation</b> → <b>+</b> → <b>Time of Day</b>. Pick a time after your usual weigh-in, Daily, <b>Run Immediately</b>.</li>
            <li>Add the action <b>Find Health Samples</b>: Type is <b>Weight</b>, sort by <b>Start Date</b>, <b>Latest First</b>, limit <b>1</b>.</li>
            <li>Add the action <b>Get Contents of URL</b>. Paste your link below, then tap the end of it and insert <b>Health Samples → Value</b>.</li>
          </ol>
          <button className="scale-url" onClick={copy} aria-label="Copy my sync link">{url}<b>Copy</b></button>
          <p className="fine">Keep this link private; it can only add a weight to your account. Apple Health should be set to kilograms.</p>
          <button className="btn-plain danger" onClick={() => scale.disconnect()}>Turn off scale sync</button>
        </div>
      )}
    </>
  )
}
