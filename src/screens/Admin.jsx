// Owners only: who is using BankCal, and removing or blocking people.
// The server decides who is an owner (OWNER_EMAILS); this screen just asks it.
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { HoldConfirm } from '../Hold'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'

const DEMO = import.meta.env.MODE === 'demo'
let demoPeople = [
  { uid: 'demo-me', email: 'you@example.com', name: 'Fart Monster', joined: Date.now() - 40 * 86400000, seen: Date.now() - 3600000, owner: true, setUp: true },
  { uid: 'demo-partner', email: 'partner@example.com', name: 'Sewer Butt', joined: Date.now() - 39 * 86400000, seen: Date.now() - 7200000, owner: true, setUp: true },
  { uid: 'demo-friend1', email: 'friend.one@example.com', name: 'Gym Buddy', joined: Date.now() - 2 * 86400000, seen: Date.now() - 86400000, setUp: true },
  { uid: 'demo-friend2', email: 'someone.new@example.com', name: '', joined: Date.now() - 3600000, seen: Date.now() - 3600000, setUp: false },
]
async function admin(body) {
  if (DEMO) {
    await new Promise((ok) => setTimeout(ok, 400))
    if (body.action === 'me') return { owner: true }
    if (body.action === 'remove') demoPeople = demoPeople.filter((p) => p.uid !== body.uid)
    if (body.action === 'block') demoPeople = demoPeople.map((p) => (p.uid === body.uid ? { ...p, blocked: true, setUp: false, name: '' } : p))
    if (body.action === 'unblock') demoPeople = demoPeople.map((p) => (p.uid === body.uid ? { ...p, blocked: false } : p))
    return { people: demoPeople, me: 'demo-me', ok: true }
  }
  const token = await auth.currentUser.getIdToken()
  const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
    .catch(() => { throw new Error('Couldn’t reach the server. Check your connection.') })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Something went wrong.')
  return j
}
const when = (ms) => (ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

// The row in Settings: only appears for owners
export function AdminRow({ notify }) {
  const [owner, setOwner] = useState(() => { try { return sessionStorage.getItem('bankcal:owner') === '1' } catch { return false } })
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let live = true
    admin({ action: 'me' }).then((j) => { if (!live) return; setOwner(!!j.owner); try { sessionStorage.setItem('bankcal:owner', j.owner ? '1' : '0') } catch { /* ignore */ } }).catch(() => {})
    return () => { live = false }
  }, [])
  if (!owner) return null
  return (
    <>
      <button className="card tour-line" onClick={() => setOpen(true)}>
        <span aria-hidden="true">👥</span>
        <span><b>People using BankCal</b><small>See who has signed up, and remove or block anyone</small></span>
      </button>
      {open && <AdminSheet notify={notify} onClose={() => setOpen(false)} />}
    </>
  )
}

function AdminSheet({ notify, onClose }) {
  const [people, setPeople] = useState(null)
  const [me, setMe] = useState('')
  const [err, setErr] = useState('')
  const [pick, setPick] = useState(null) // the person being removed
  const [busy, setBusy] = useState(false)
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  const load = () => admin({ action: 'list' }).then((j) => { setPeople(j.people); setMe(j.me); setErr('') }).catch((e) => setErr(e.message))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (action, p) => {
    setBusy(true); setErr('')
    try {
      await admin({ action, uid: p.uid })
      notify?.(action === 'unblock' ? `${p.name || p.email} can sign in again` : action === 'block' ? `Removed and blocked ${p.name || p.email}` : `Removed ${p.name || p.email}`)
      setPick(null); await load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const label = (p) => p.name || p.email || 'Someone'
  return createPortal(
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet admin-sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="People using BankCal">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div><p className="muted">{people ? `${people.length} ${people.length === 1 ? 'account' : 'accounts'}` : 'Only you and other owners see this'}</p><h2>People using BankCal</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        {err && <p className="fine neg" role="alert">{err}</p>}
        {!people && !err && <p className="fine" aria-live="polite">Loading…</p>}
        {pick ? (
          <div className="card admin-confirm">
            <p><b>Remove {label(pick)}?</b></p>
            <p className="fine">{pick.email}</p>
            <p className="fine">This deletes everything they logged and can’t be undone. <b>Remove</b> lets them sign up again from scratch. <b>Remove and block</b> also stops that Google account from signing in.</p>
            <HoldConfirm className="btn-plain danger solid" ms={1200} disabled={busy} onConfirm={() => act('remove', pick)}>{busy ? 'Working…' : 'Hold to remove'}</HoldConfirm>
            <HoldConfirm className="btn-plain danger" ms={1200} disabled={busy} onConfirm={() => act('block', pick)}>Hold to remove and block</HoldConfirm>
            <button className="btn-plain keep" disabled={busy} onClick={() => setPick(null)}>Keep them</button>
          </div>
        ) : (
          <ul className="admin-list">
            {(people ?? []).map((p) => (
              <li key={p.uid}>
                <div className="al-main">
                  <b>{label(p)}{p.uid === me ? <i>You</i> : p.owner ? <i>Owner</i> : p.blocked ? <i className="off">Blocked</i> : !p.setUp ? <i className="off">Not set up</i> : null}</b>
                  {p.name && <small>{p.email}</small>}
                  <small>Joined {when(p.joined)} · last sign-in {when(p.seen)}</small>
                </div>
                {!p.owner && p.uid !== me && (p.blocked
                  ? <button className="btn-soft" disabled={busy} onClick={() => act('unblock', p)}>Unblock</button>
                  : <button className="btn-soft danger" onClick={() => setPick(p)}>Remove</button>)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>, document.body)
}
