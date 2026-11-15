// Partner view. Uses small documents outside the private users/{uid} area:
//   shares/{uid}   a tiny public-to-partners summary (never calories, weight or journal)
//   invites/{code} a short-lived pairing code
import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

const code6 = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')

export function usePartners({ enabled, uid, profile, updateProfile, summary, notify, celebrate }) {
  const partners = profile?.partners ?? []
  const [shares, setShares] = useState({})
  const [mineShare, setMineShare] = useState(null)
  const last = useRef('')

  // publish my summary (only when something changed)
  useEffect(() => {
    if (!enabled || !profile?.onboarded) return
    const data = { uid, name: profile.name, character: profile.character, theme: profile.theme, partners, ...summary }
    const sig = JSON.stringify(data)
    if (sig === last.current) return
    last.current = sig
    setDoc(doc(db, 'shares', uid), { ...data, updatedAt: Date.now() }, { merge: true }).catch(() => {})
  }, [enabled, uid, profile?.onboarded, profile?.name, profile?.character, profile?.theme, partners.join(','), JSON.stringify(summary)]) // eslint-disable-line react-hooks/exhaustive-deps

  // watch partners
  useEffect(() => {
    if (!enabled || !partners.length) { setShares({}); return }
    const subs = partners.map((p) => onSnapshot(doc(db, 'shares', p), (s) => setShares((x) => ({ ...x, [p]: s.exists() ? s.data() : null })), () => setShares((x) => ({ ...x, [p]: null }))))
    return () => subs.forEach((u) => u())
  }, [enabled, partners.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // watch my own share for incoming cheers
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(doc(db, 'shares', uid), (s) => setMineShare(s.exists() ? s.data() : null), () => {})
  }, [enabled, uid])
  useEffect(() => {
    const cheers = mineShare?.cheers
    if (!cheers) return
    let seen = 0
    try { seen = +localStorage.getItem(`bankcal:cheer:${uid}`) || 0 } catch { /* ignore */ }
    const fresh = Object.values(cheers).filter((c) => c.at > seen && Date.now() - c.at < 36 * 3600 * 1000)
    if (!fresh.length) return
    try { localStorage.setItem(`bankcal:cheer:${uid}`, String(Math.max(...fresh.map((c) => c.at)))) } catch { /* ignore */ }
    const c = fresh.sort((a, b) => b.at - a.at)[0]
    ;(celebrate ?? notify)(c.msg && c.msg !== '👏' ? `${c.name}: ${c.msg}` : `👏 ${c.name} cheered you on`)
  }, [mineShare?.cheers]) // eslint-disable-line react-hooks/exhaustive-deps

  // my pending invite: when the partner accepts, link them here too
  useEffect(() => {
    if (!enabled || !profile?.inviteCode) return
    return onSnapshot(doc(db, 'invites', profile.inviteCode), (s) => {
      const by = s.data()?.acceptedBy
      if (!by || by === uid) return
      updateProfile({ partners: [...new Set([...partners, by])].slice(0, 5), inviteCode: null })
      deleteDoc(s.ref).catch(() => {})
      notify(`You’re now connected with ${s.data().acceptedName || 'your partner'} 🎉`)
    }, () => {})
  }, [enabled, profile?.inviteCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const createInvite = useCallback(async () => {
    const code = code6()
    await setDoc(doc(db, 'invites', code), { uid, name: profile.name, createdAt: Date.now() })
    updateProfile({ inviteCode: code })
    return code
  }, [uid, profile?.name, updateProfile])

  const acceptInvite = useCallback(async (raw) => {
    const code = raw.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Codes are 6 letters and numbers.')
    let snap
    try { snap = await getDoc(doc(db, 'invites', code)) } catch { throw new Error('Couldn’t check that code. Check your connection and try again.') }
    if (!snap.exists()) throw new Error('That code wasn’t found. Ask your partner for a new one.')
    const other = snap.data().uid
    if (other === uid) throw new Error('That’s your own code. Share it with your partner.')
    await updateDoc(snap.ref, { acceptedBy: uid, acceptedName: profile.name })
    updateProfile({ partners: [...new Set([...partners, other])].slice(0, 5) })
    return snap.data().name
  }, [uid, profile?.name, partners.join(','), updateProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  const removePartner = useCallback((p) => updateProfile({ partners: partners.filter((x) => x !== p) }), [partners.join(','), updateProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  const cheer = useCallback(async (p, msg = '👏') => {
    await updateDoc(doc(db, 'shares', p), { [`cheers.${uid}`]: { at: Date.now(), name: profile.name, msg: String(msg).slice(0, 40) } })
  }, [uid, profile?.name])

  return { partners, shares, createInvite, acceptInvite, removePartner, cheer }
}
