// Cloud store. Each person's data lives under users/{uid} in Firestore.
// Firestore's on-device cache means reads and writes work offline and
// sync automatically when the phone is back online.
import { useCallback, useEffect, useState } from 'react'
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { dayKey } from './calc'

// You two are set up automatically; everyone else picks their own.
const PRESETS = {
  'jassim.alfonso@gmail.com': { name: 'Fart Monster', character: 'egg', theme: 'moss', sex: 'm', onboarded: true },
  'christinenantonio@gmail.com': { name: 'Sewer Butt', character: 'avocado', theme: 'plum', sex: 'f', onboarded: true },
}

const BLANK = {
  name: '', character: 'mochi', theme: 'sky', sex: 'm', age: '', height: '', weight: '',
  activity: 'sedentary', goal: 'lose025', customBudget: '', mode: 'auto', onboarded: false,
}

export function useStore(user) {
  const [profile, setProfile] = useState(null)
  const [entries, setEntries] = useState([])
  const uid = user.uid

  useEffect(() => {
    const ref = doc(db, 'users', uid)
    const unsubProfile = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        // one-time: Fart Monster becomes the fried egg, Sewer Butt the avocado
        const preset = PRESETS[user.email?.toLowerCase()]
        if (preset && !data.buddyV2) {
          setDoc(ref, { character: preset.character, buddyV2: true }, { merge: true })
        }
        setProfile({ ...BLANK, ...data })
      } else if (!snap.metadata.fromCache) {
        const preset = PRESETS[user.email?.toLowerCase()] ?? { name: user.displayName?.split(' ')[0] ?? '' }
        const fresh = { ...BLANK, ...preset, email: user.email, createdAt: Date.now() }
        setProfile(fresh)
        setDoc(ref, fresh, { merge: true })
      }
    })
    const q = query(collection(db, 'users', uid, 'entries'), orderBy('ts', 'desc'), limit(500))
    const unsubEntries = onSnapshot(q, (snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    return () => { unsubProfile(); unsubEntries() }
  }, [uid, user.email, user.displayName])

  const updateProfile = useCallback((patch) => {
    setProfile((p) => ({ ...p, ...patch }))
    setDoc(doc(db, 'users', uid), patch, { merge: true })
  }, [uid])

  // Per-day log (steps, treadmill, weight) kept in the profile doc as days.{YYYY-MM-DD}.
  const setDay = useCallback((key, patch) => {
    setProfile((p) => ({ ...p, days: { ...(p.days ?? {}), [key]: { ...(p.days?.[key] ?? {}), ...patch } } }))
    setDoc(doc(db, 'users', uid), { days: { [key]: patch } }, { merge: true })
  }, [uid])

  const addEntry = useCallback((e) => {
    const ref = doc(collection(db, 'users', uid, 'entries'))
    const now = new Date()
    const entry = { ts: now.getTime(), day: e.day ?? dayKey(now), name: e.name, kcal: e.kcal, meal: e.meal, photo: e.photo ?? null }
    setDoc(ref, entry) // the local cache updates instantly; the cloud catches up when online
    return ref.id
  }, [uid])

  const removeEntry = useCallback((id) => { deleteDoc(doc(db, 'users', uid, 'entries', id)) }, [uid])

  return { profile, entries, updateProfile, setDay, addEntry, removeEntry }
}

// Shrink a camera photo to a small JPEG thumbnail so cloud storage stays tiny (~8–15 KB).
export function compressPhoto(file, max = 280) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.68))
    }
    img.onerror = reject
    img.src = url
  })
}
