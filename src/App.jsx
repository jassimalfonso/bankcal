import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store'
import { useDemoStore } from './demoStore'
import { BUDDIES, Buddy } from './buddies'

const DEMO = import.meta.env.MODE === 'demo'
import { dailyBudget, dayKey, earned, isBedtime, isBirthday, isWindDown, logicalDayKey, streak } from './calc'
import { useDailyWords } from './quotes'
import { MorningCard, DayResult, WelcomeBack } from './screens/DailyCards'
import Today from './screens/Today'
import Statement from './screens/Statement'
import Me from './screens/Me'
import AddSheet from './screens/AddSheet'
import SignIn from './screens/SignIn'
import Onboarding from './screens/Onboarding'
import { IconMe, IconPlus, IconStatement, IconToday } from './icons'

function useMode(mode) {
  useEffect(() => {
    document.documentElement.dataset.mode = mode
    const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#F2F3F7')
  }, [mode])
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = still checking
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  useMode('light')

  if (DEMO && location.search.includes('buddies')) return <BuddySheet />
  if (DEMO && !location.search.includes('signin')) return <Bank user={{ uid: 'demo', email: 'demo@example.com' }} />
  if (user === undefined) return <div className="loading" />
  if (!user) return <SignIn />
  return <Bank user={user} />
}

function Bank({ user }) {
  const store = DEMO ? useDemoStore() : useStore(user) // eslint-disable-line react-hooks/rules-of-hooks
  const { profile, entries } = store
  const [tab, setTabRaw] = useState('today')
  const [dir, setDir] = useState('none') // slide direction for page transitions
  const ORDER = ['today', 'week', 'me']
  const setTab = (next) => {
    if (next === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setDir(ORDER.indexOf(next) > ORDER.indexOf(tab) ? 'left' : 'right')
    setTabRaw(next)
    window.scrollTo(0, 0) // every page starts at the top
  }
  const [adding, setAdding] = useState(false)
  useMode(profile?.mode ?? 'light')
  useEffect(() => {
    const bg = profile?.bg ?? 'glow'
    document.body.dataset.bg = bg
    // match the phone's status bar to the top of the background
    const dark = document.documentElement.dataset.mode === 'dark' || (document.documentElement.dataset.mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
    const top = dark
      ? { sunrise: '#3a2020', ocean: '#10243a', meadow: '#1a2a14', lavender: '#221a3a' }[bg] ?? '#000000'
      : { sunrise: '#ffe7d6', ocean: '#d8ecff', meadow: '#e6f6d8', lavender: '#ebe3ff' }[bg] ?? '#F2F3F7'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', top)
  }, [profile?.bg, profile?.mode])

  // Re-check the clock every minute and when the app returns to the front, so a new day starts on time
  const [, tick] = useState(0)
  useEffect(() => {
    const bump = () => tick((n) => n + 1)
    const id = setInterval(bump, 60000)
    document.addEventListener('visibilitychange', bump)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', bump) }
  }, [])
  const today = logicalDayKey(profile ?? {})
  const todays = useMemo(() => entries.filter((e) => e.day === today), [entries, today])
  const words = useDailyWords(today)
  const seenKey = `bankcal:morning:${user.uid}:${today}`
  const [morning, setMorning] = useState(() => { try { return !localStorage.getItem(seenKey) } catch { return false } })
  useEffect(() => { try { setMorning(!localStorage.getItem(seenKey)) } catch { /* ignore */ } }, [seenKey])
  // Welcome back on every fresh open, and again after being away for 30+ minutes
  const [hello, setHello] = useState(true)
  // Leaving the welcome: the card lifts away while the app rises in underneath
  const [leaving, setLeaving] = useState(false)
  const leave = useCallback((then) => {
    window.scrollTo(0, 0)
    setLeaving(true)
    setTimeout(() => { then(); setLeaving(false) }, 620)
  }, [])
  const doneHello = useCallback(() => leave(() => setHello(false)), [leave])
  useEffect(() => {
    let away = 0
    const onVis = () => {
      if (document.hidden) away = Date.now()
      else if (away && Date.now() - away > 30 * 60 * 1000) setHello(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  const closeMorning = () => { try { localStorage.setItem(seenKey, '1') } catch { /* ignore */ } leave(() => { setHello(false); setMorning(false) }) }
  // Remember each day's base budget, so later weight or plan changes don't rewrite past days
  useEffect(() => {
    if (!profile?.onboarded) return
    const b = dailyBudget(profile)
    if (b != null && profile.days?.[today]?.base !== b) store.setDay(today, { base: b })
  }, [profile, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState(false)
  // One toast for the whole app, with optional Undo.
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const notify = (text, undo) => {
    clearTimeout(toastTimer.current)
    setToast({ text, undo, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }
  // At bedtime, offer to close the day once (if anything was logged and it isn't closed yet).
  const bedKey = `bankcal:bedtime:${user.uid}:${today}`
  useEffect(() => {
    if (!profile?.onboarded || morning) return
    const dl = profile.days?.[today]
    if (isBedtime(profile) && !dl?.closed && entries.some((e) => e.day === today)) {
      try { if (localStorage.getItem(bedKey)) return; localStorage.setItem(bedKey, '1') } catch { /* ignore */ }
      setResult(true)
    }
  }, [profile, today, entries, morning, bedKey])

  if (!profile) return <div className="loading" />
  if (!profile.onboarded) return <Onboarding {...store} />

  const base = dailyBudget(profile)
  const dayLog = profile.days?.[today] ?? {}
  const earn = earned(dayLog, profile.weight, profile.activity)
  const budget = base != null ? base + earn.total : null // activity is a deposit into today's budget
  const budgetFor = (key) => { const b = key === today ? base : (profile.days?.[key]?.base ?? base); return b != null ? b + earned(profile.days?.[key], profile.weight, profile.activity).total : null }
  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  const closed = !!dayLog.closed
  const streakDays = streak(entries, budgetFor, today, closed)
  const yKey = (() => { const [y, m, d] = today.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1)) })()
  const yEntries = entries.filter((e) => e.day === yKey)
  const yesterday = yEntries.length && budgetFor(yKey) != null ? { net: budgetFor(yKey) - yEntries.reduce((a, e) => a + e.kcal, 0) } : null
  const closeDay = () => { if (budget != null && spent - budget <= 0) store.setDay(today, { closed: true }); setResult(true) }
  const ctx = { ...store, notify, addEntry: (e) => store.addEntry({ ...e, day: today }), windDown: isWindDown(profile), user, profile, mine: entries, todays, base, budget, earn, dayLog, today, budgetFor, words, streakDays, closeDay, openWords: () => setMorning(true), goSetup: (section) => {
    setTab('me')
    if (section) setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  } }

  return (
    <div className={`app theme-${profile.theme} ${(morning || hello) && !leaving ? 'behind' : ''} ${leaving ? 'entering' : ''}`}>
      <main className={`screen slide-${dir}`} key={tab}>
        {tab === 'today' && <Today {...ctx} />}
        {tab === 'week' && <Statement {...ctx} />}
        {tab === 'me' && <Me {...ctx} />}
      </main>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Log food">
        <IconPlus size={30} />
      </button>

      <nav className="tabbar">
        <TabBtn id="today" tab={tab} setTab={setTab} label="Today" Icon={IconToday} />
        <TabBtn id="week" tab={tab} setTab={setTab} label="Progress" Icon={IconStatement} />
        <TabBtn id="me" tab={tab} setTab={setTab} label="Settings" Icon={IconMe} />
      </nav>

      {toast && (
        <div className="toast" role="status" key={toast.key}>
          <span>{toast.text}</span>
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null) }}>Undo</button>}
        </div>
      )}
      {!morning && hello && profile.onboarded && <WelcomeBack leaving={leaving} profile={profile} left={budget != null ? budget - spent : null} onDone={doneHello} />}
      {morning && <MorningCard leaving={leaving} profile={profile} budget={budget} sleep={dayLog.sleep} onSleep={(sl) => store.setDay(today, { sleep: sl })} words={words} yesterday={yesterday} streakDays={streakDays} birthday={isBirthday(profile, today)} onClose={closeMorning} />}
      {result && <DayResult profile={profile} budget={budget} spent={spent} earn={earn} streakDays={streak(entries, budgetFor, today, true)} today={today} onClose={() => setResult(false)} />}

      {adding && (
        <AddSheet
          {...ctx}
          onClose={() => setAdding(false)}
          onSave={(e) => {
            const id = store.addEntry({ ...e, day: today })
            navigator.vibrate?.(12)
            notify(`Spent ${e.kcal.toLocaleString('en-US')} kcal on ${e.name}`, () => store.removeEntry(id))
            setAdding(false)
            setTab('today')
          }}
        />
      )}
    </div>
  )
}

function TabBtn({ id, tab, setTab, label, Icon }) {
  return (
    <button className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
      <Icon />
      <span>{label}</span>
    </button>
  )
}

function BuddySheet() {
  return (
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '120px repeat(4, 1fr)', gap: 6, alignItems: 'center', fontFamily: 'Nunito Variable, sans-serif' }}>
      <div />{['On track', 'Nearly out', 'Over', 'Asleep'].map((t) => <b key={t} style={{ fontSize: 13, color: '#8a8a90', textAlign: 'center' }}>{t}</b>)}
      {Object.entries(BUDDIES).map(([id, b], i) => [
        <b key={id} style={{ fontSize: 16 }}>{i + 1}. {b.label}</b>,
        ...['happy', 'ok', 'worried', 'sleepy'].map((m) => <div key={id + m} style={{ display: 'grid', placeItems: 'center' }}><Buddy id={id} mood={m} size={84} /></div>),
      ])}
    </div>
  )
}
