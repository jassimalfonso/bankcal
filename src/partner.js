// Partner view. Uses small documents outside the private users/{uid} area:
//   shares/{uid}   a tiny public-to-partners summary (never calories, weight or journal)
//   invites/{code} a short-lived pairing code
import { useCallback, useEffect, useRef, useState } from 'react'
import { arrayUnion, deleteDoc, deleteField, doc, getDoc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { myWorkouts } from './training'
import { catOf } from './foodCats'
export { usualFoods } from './calc'

const code6 = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')

export function usePartners({ enabled, uid, profile, updateProfile, summary, notify, celebrate, usual = [] }) {
  const partners = profile?.partners ?? []
  const [shares, setShares] = useState({})
  const [mineShare, setMineShare] = useState(null)
  const last = useRef('')

  // publish my summary (only when something changed)
  useEffect(() => {
    if (!enabled || !profile?.onboarded) return
    // saved foods are shared too (name and kcal only), so a partner doesn't have to save them again
    // ⭐ saved foods first, then the foods you've logged (one serving each), up to 100 in all
    const saved = (profile.myFoods ?? []).slice(0, 60).map((f) => ({ name: String(f.name).slice(0, 120), kcal: Math.round(+f.kcal) || 0, cat: f.cat, ...(f.full > 0 ? { full: Math.round(+f.full) } : {}), ...(f.serving ? { serving: String(f.serving).slice(0, 30) } : {}) }))
    const foods = profile.shareFoods === false ? [] : [...saved, ...usual.filter((u) => !saved.some((f) => f.name.toLowerCase() === u.name.toLowerCase()))].slice(0, 100).map((f) => ({ ...f, cat: catOf(f, profile.foodCats) })) // your type fixes travel with them
    // saved workouts too (the exercise and amounts), so a partner can deposit them in one tap
    const pick = ['name', 'emoji', 'kind', 'sets', 'reps', 'sec', 'kg', 'each', 'rest', 'met', 'ex']
    const workouts = profile.shareFoods === false ? [] : myWorkouts(profile).slice(0, 30).map(({ item }) => Object.fromEntries(pick.filter((k) => item[k] != null && item[k] !== '').map((k) => [k, item[k]])))
    const data = { uid, name: profile.name, character: profile.character, theme: profile.theme, partners, foods, workouts, ...summary }
    const sig = JSON.stringify(data)
    if (sig === last.current) return
    last.current = sig
    setDoc(doc(db, 'shares', uid), { ...data, updatedAt: Date.now() }, { merge: true }).catch(() => {})
  }, [enabled, uid, profile?.onboarded, profile?.name, profile?.character, profile?.theme, partners.join(','), JSON.stringify(summary), profile?.shareFoods, JSON.stringify(profile?.myFoods ?? []), JSON.stringify(usual), JSON.stringify(profile?.foodCats ?? {}), JSON.stringify(profile?.routine ?? []), JSON.stringify(profile?.customEx ?? [])]) // eslint-disable-line react-hooks/exhaustive-deps

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
    // keep each partner's log short (the latest 30 cheers)
    const trim = Object.fromEntries(Object.entries(cheers).filter(([, v]) => (v.log?.length ?? 0) > 30).map(([k, v]) => [`cheers.${k}.log`, [...v.log].sort((a, b) => a.at - b.at).slice(-30)]))
    if (Object.keys(trim).length) updateDoc(doc(db, 'shares', uid), trim).catch(() => {})
    const c = fresh.sort((a, b) => b.at - a.at)[0]
    const from = Object.keys(cheers).find((k) => cheers[k] === c)
    const who = { kind: c.kind || shares[from]?.character, acc: c.acc ?? shares[from]?.acc ?? null } // their buddy pops up, not yours
    const text = c.msg && c.msg !== '👏' ? `${c.s ? c.s + ' ' : ''}${c.name}: ${c.msg}` : `👏 ${c.name} cheered you on`
    if (celebrate) celebrate(text, null, false, who); else notify(text)
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

  // A cheer, or a short note with a sticker (s)
  const cheer = useCallback(async (p, msg = '👏', sticker = '') => {
    const at = Date.now()
    const m = String(msg).trim().slice(0, 120) || '👏'
    const st = String(sticker).slice(0, 8)
    const k = `cheers.${uid}`
    await updateDoc(doc(db, 'shares', p), { [`${k}.at`]: at, [`${k}.name`]: profile.name, [`${k}.kind`]: profile.character ?? null, [`${k}.acc`]: profile.accessory ?? null, [`${k}.msg`]: m, [`${k}.s`]: st, [`${k}.count`]: increment(1), [`${k}.log`]: arrayUnion(st ? { at, msg: m, s: st } : { at, msg: m }) })
    // ping their phone too (only if they've turned notifications on); never blocks the cheer
    auth.currentUser?.getIdToken().then((t) => fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` }, body: JSON.stringify({ to: p, msg: m, s: st, kind: profile.character }) })).catch(() => {})
  }, [uid, profile?.name, profile?.character, profile?.accessory])

  // Notifications on this phone
  const push = usePush(enabled, uid)

  return { partners, shares, me: uid, received: mineShare?.cheers ?? {}, createInvite, acceptInvite, removePartner, cheer, push }
}

// Phone notifications for cheers. Each phone signs up separately; the address is kept in
// shares/{uid}.push so only linked partners (through the server) can use it.
const deviceId = () => {
  try {
    let d = localStorage.getItem('bankcal:device')
    if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('bankcal:device', d) }
    return d
  } catch { return 'phone' }
}
const b64ToBytes = (b) => { const s = atob((b + '='.repeat((4 - (b.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)) }

function usePush(enabled, uid) {
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!supported || !enabled) return
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((sub) => setOn(!!sub && Notification.permission === 'granted')).catch(() => {})
  }, [supported, enabled])
  const turnOn = useCallback(async () => {
    if (!supported) throw new Error('Add BankCal to your Home Screen first, then open it from there and turn this on.')
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications are blocked. Allow them for BankCal in your phone’s settings.')
    const k = await fetch('/api/push', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ error: 'Couldn’t reach BankCal. Check your connection.' }))
    if (!k.key) throw new Error(k.error || 'Notifications aren’t ready yet. Try again later.')
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(k.key) })
    await setDoc(doc(db, 'shares', uid), { push: { [deviceId()]: JSON.parse(JSON.stringify(sub)) } }, { merge: true })
    setOn(true)
  }, [supported, uid])
  const turnOff = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready
    await (await reg.pushManager.getSubscription())?.unsubscribe()
    await updateDoc(doc(db, 'shares', uid), { [`push.${deviceId()}`]: deleteField() }).catch(() => {})
    setOn(false)
  }, [uid])
  return { supported, on, turnOn, turnOff }
}
