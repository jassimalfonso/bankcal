import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store'
import { useDemoStore, demoPartner } from './demoStore'
import { BUDDIES, Buddy } from './buddies'
import { setBackHandlers } from './motion'
import ShareSheet from './screens/ShareSheet'
import WorkoutSheet from './screens/WorkoutSheet'
import Swipeable from './Swipeable'
import ErrorBoundary from './ErrorBoundary'
import { applyUpdate, onUpdateReady } from './update'
import { myWorkouts } from './training'

const DEMO = import.meta.env.MODE === 'demo'
import { partnerProgress, dailyBudget, dayKey, earned, fmt, isBedtime, isBirthday, isWindDown, logicalDayKey, streak, workoutKcal } from './calc'
import { useDailyWords } from './quotes'
import { MorningCard, DayResult, WelcomeBack } from './screens/DailyCards'
import Today from './screens/Today'
import Statement from './screens/Statement'
import Me from './screens/Me'
import Train from './screens/Train'
import { usePartners } from './partner'
import { MILESTONES, reached } from './milestones'
import { oneThing, weekTicks } from './habits'
import { PLANS } from './training'
import Character from './Character'
import AddSheet from './screens/AddSheet'
import SignIn from './screens/SignIn'
import Onboarding from './screens/Onboarding'
import { IconMe, IconTrain, IconPlus, IconStatement, IconToday } from './icons'

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
  const ORDER = ['today', 'week', 'train', 'me']
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
  // The morning welcome: first open of the day (unless switched off in Settings), or on request
  const [replay, setReplay] = useState(false)
  const [plus, setPlus] = useState(false) // the + menu
  const [newVersion, setNewVersion] = useState(false)
  useEffect(() => onUpdateReady(setNewVersion), [])
  const [working, setWorking] = useState(false) // Log a workout, from +
  const showM = replay || (morning && profile?.morningCard !== false)
  // One time after the share update: show the morning welcome again so the new Share button is seen
  const SHARE_INTRO = `bankcal:intro-share:${user.uid}`
  const [shareNew, setShareNew] = useState(() => { try { return !localStorage.getItem(SHARE_INTRO) } catch { return false } })
  useEffect(() => {
    if (!shareNew || !profile?.onboarded) return
    try { localStorage.setItem(SHARE_INTRO, '1') } catch { /* ignore */ }
    setReplay(true)
  }, [shareNew, profile?.onboarded]) // eslint-disable-line react-hooks/exhaustive-deps
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
  const closeMorning = () => { try { localStorage.setItem(seenKey, '1') } catch { /* ignore */ } leave(() => { setHello(false); setMorning(false); setReplay(false); setShareNew(false); setTab('today'); scrollTo(0, 0) }) }
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
  // The buddy pops up to celebrate effort
  const [cheer, setCheer] = useState(null)
  const cheerTimer = useRef()
  const cheerQueue = useRef([])
  const [msShare, setMsShare] = useState(null) // a milestone to share, from the pop-up
  const showNext = useRef(null)
  const celebrate = useCallback((text, share = null) => {
    // one at a time: a second celebration waits for the first to finish
    const show = () => {
      const next = cheerQueue.current[0]
      if (!next) { setCheer(null); return }
      try { navigator.vibrate?.([12, 40, 12]) } catch { /* not allowed yet */ }
      setCheer({ ...next, key: Date.now() })
      cheerTimer.current = setTimeout(() => { cheerQueue.current.shift(); show() }, next.share ? 6000 : 3200)
    }
    showNext.current = show
    cheerQueue.current.push({ text, share })
    if (cheerQueue.current.length === 1) show()
  }, [])
  // swipe or tap a pop-up away: the next one (if any) comes straight after
  const dismissCheer = () => { clearTimeout(cheerTimer.current); cheerQueue.current.shift(); showNext.current?.() }
  const dismissToast = () => { clearTimeout(toastTimer.current); setToast(null) }
  // A clear confirmation every time something is logged: a banner from the top with
  // what happened and the new balance; the new line in the list flashes too.
  const [receiptMsg, setReceiptMsg] = useState(null)
  const [fresh, setFresh] = useState(null) // id of the line that was just added or changed
  const receiptTimer = useRef(null)
  const receipt = ({ kind, what, kcal, id, undo }) => {
    clearTimeout(receiptTimer.current)
    const left0 = budgetRef.current
    const left = left0 == null ? null : kind === 'spend' ? left0 - kcal : left0 + kcal
    setReceiptMsg({ kind, what, kcal, left, undo, key: Date.now() })
    receiptTimer.current = setTimeout(() => setReceiptMsg(null), 4500)
    if (id) { setFresh(id); setTimeout(() => setFresh((f) => (f === id ? null : f)), 2200) }
    try { navigator.vibrate?.(kind === 'spend' ? 12 : [10, 40, 10]) } catch { /* not allowed yet */ }
  }
  const budgetRef = useRef(null)
  const notify = (text, undo) => {
    clearTimeout(toastTimer.current)
    setToast({ text, undo, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }
  // Phone Back button: other tabs go back to Today; on Today, a second press closes the app
  setBackHandlers(
    () => { if (plus) { setPlus(false); return true } if (tab !== 'today') { setTab('today'); return true } return false },
    () => notify('Press Back again to close BankCal'),
  )
  // At bedtime, offer to close the day once (if anything was logged and it isn't closed yet).
  const bedKey = `bankcal:bedtime:${user.uid}:${today}`
  useEffect(() => {
    if (!profile?.onboarded || showM) return
    const dl = profile.days?.[today]
    if (isBedtime(profile) && !dl?.closed && entries.some((e) => e.day === today)) {
      try { if (localStorage.getItem(bedKey)) return; localStorage.setItem(bedKey, '1') } catch { /* ignore */ }
      setResult(true)
    }
  }, [profile, today, entries, showM, bedKey])


  // (calculations tolerate a profile that hasn't loaded yet so the hooks below always run in the same order)
  const pf = profile ?? {}
  const base = profile ? dailyBudget(profile) : null
  const dayLog = pf.days?.[today] ?? {}
  const earn = earned(dayLog, pf.weight)
  const budget = base != null ? base + earn.total : null // activity is a deposit into today's budget
  const budgetFor = (key) => { const b = key === today ? base : (pf.days?.[key]?.base ?? base); return b != null ? b + earned(pf.days?.[key], pf.weight).total : null }
  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  budgetRef.current = budget != null ? budget - spent : null
  const closed = !!dayLog.closed
  const streakDays = streak(entries, budgetFor, today, closed)
  const yKey = (() => { const [y, m, d] = today.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1)) })()
  const yEntries = entries.filter((e) => e.day === yKey)
  const yesterday = yEntries.length && budgetFor(yKey) != null ? { net: budgetFor(yKey) - yEntries.reduce((a, e) => a + e.kcal, 0) } : null
  const closeDay = () => { if (budget != null && spent - budget <= 0) store.setDay(today, { closed: true }); setResult(true) }
  const livePartner = usePartners({
    enabled: !DEMO, uid: user.uid, profile, updateProfile: store.updateProfile, notify, celebrate,
    summary: { day: today, streak: streakDays, habitsDone: (pf.habits ?? []).filter((id) => dayLog.habits?.[id]).length, habitsTotal: (pf.habits ?? []).length, moved: earn.total > 0, logged: todays.length > 0, weekTicks: weekTicks(pf, today), kgChange: null, goalPct: null, ...partnerProgress({ entries, profile: pf, budgetFor, todayKey: today }) },
  })
  const partner = DEMO && location.search.includes('partner') ? demoPartner(today) : livePartner

  // Milestones: save newly reached ones and let the buddy announce them
  const reachedIds = profile?.onboarded ? reached({ entries, profile: pf, streakDays }) : []
  const newIds = reachedIds.filter((id) => !pf.badges?.[id])
  useEffect(() => {
    if (!newIds.length || showM || hello) return // wait until the welcome screen is out of the way
    store.updateProfile({ badges: { ...(pf.badges ?? {}), ...Object.fromEntries(newIds.map((id) => [id, today])) } })
    const m = MILESTONES.find((x) => x.id === newIds[0])
    celebrate(newIds.length > 1 ? `${newIds.length} milestones reached! ${m.emoji}` : `Milestone: ${m.label} ${m.emoji}`, m)
  }, [newIds.join(','), showM, hello]) // eslint-disable-line react-hooks/exhaustive-deps
  const focus = profile?.onboarded ? oneThing({ profile: pf, todayKey: today, yesterday, plans: PLANS }) : null

  if (!profile) return <div className="loading" />
  if (!profile.onboarded) return <Onboarding {...store} />

  const ctx = { ...store, partner, notify, celebrate, receipt, fresh, focus, goTab: setTab, editEntry: (e) => setAdding(e), addEntry: (e) => store.addEntry({ ...e, day: today }), windDown: isWindDown(profile), user, profile, mine: entries, todays, base, budget, earn, dayLog, today, budgetFor, words, streakDays, closeDay, openWords: () => setReplay(true), goSetup: (section) => {
    setTab('me')
    if (section) setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  } }

  return (
    <div className={`app theme-${profile.theme} ${(showM || hello) && !leaving ? 'behind' : ''} ${leaving ? 'entering' : ''}`}>
      <main className={`screen slide-${dir} tab-${tab}`} key={tab}>
        {tab === 'today' && <Today {...ctx} />}
        {tab === 'week' && <Statement {...ctx} />}
        {tab === 'train' && <Train {...ctx} />}
        {tab === 'me' && <Me {...ctx} />}
      </main>

      {/* + opens a small menu: spend (food) or deposit (workout) */}
      {plus && <div className="plus-veil" onClick={() => setPlus(false)} />}
      {plus && (
        <div className="plus-menu" role="menu">
          <button role="menuitem" onClick={() => { setPlus(false); setWorking(true) }}><span>💪</span><b>Log a workout</b><small>Deposit calories</small></button>
          <button role="menuitem" onClick={() => { setPlus(false); setAdding(true) }}><span>🍽️</span><b>Log food</b><small>Spend calories</small></button>
        </div>
      )}
      <button className={`fab ${plus ? 'open' : ''}`} onClick={() => setPlus((x) => !x)} aria-label={plus ? 'Close menu' : 'Log food or a workout'} aria-expanded={plus}>
        <IconPlus size={30} />
      </button>
      {working && (
        <ErrorBoundary onError={() => { setWorking(false); notify('That screen hit a problem and was closed. Please try again.') }}>
        <WorkoutSheet profile={profile} mine={myWorkouts(profile, dayLog.workouts ?? [])} onClose={() => setWorking(false)}
          steps={dayLog.steps} onSteps={(v) => {
            const goal = +profile.stepsGoal || 8000
            store.setDay(today, { steps: v })
            if (v >= goal && !((+dayLog.steps || 0) >= goal)) celebrate(`${fmt(goal)} steps reached! 👟`)
            else receipt({ kind: 'steps', what: `${fmt(v)} steps today`, kcal: 0 })
            setWorking(false)
          }}
          onKeep={(item) => store.updateProfile({ routine: [...(profile.routine ?? []), item] })}
          onSave={(w) => {
            const id = Date.now().toString(36)
            const before = dayLog.workouts ?? []
            store.setDay(today, { workouts: [...before, { id, ...w }] })
            receipt({ kind: 'deposit', what: w.label || 'Workout', kcal: Math.round(workoutKcal(w, profile.weight)), id, undo: () => store.setDay(today, { workouts: before }) })
            setWorking(false)
            setTab('today')
          }} />
        </ErrorBoundary>
      )}

      <nav className="tabbar">
        <TabBtn id="today" tab={tab} setTab={setTab} label="Today" Icon={IconToday} />
        <TabBtn id="week" tab={tab} setTab={setTab} label="Progress" Icon={IconStatement} />
        <TabBtn id="train" tab={tab} setTab={setTab} label="Train" Icon={IconTrain} />
        <TabBtn id="me" tab={tab} setTab={setTab} label="Settings" Icon={IconMe} />
      </nav>

      {cheer && (
        <div className="buddy-cheer" role="status" key={cheer.key} style={cheer.share ? { animationDuration: '6s' } : undefined}>
          <Swipeable className="bc-swipe" onGone={dismissCheer} aria-label="Swipe or tap to dismiss">
            <span className="bc-bubble">{cheer.text}
              {cheer.share && <button className="bc-share" onClick={() => setMsShare(cheer.share)}>Share it</button>}
            </span>
            <Character kind={profile.character} mood="happy" size={84} />
          </Swipeable>
        </div>
      )}
      {msShare && <ShareSheet kind="milestone" title="Share this milestone" file="milestone.png" buddies={[profile.character]} notify={notify} data={{ emoji: msShare.emoji, label: msShare.label }} onClose={() => setMsShare(null)} />}
      {newVersion && !adding && !working && (
        <button className="update-pill" onClick={applyUpdate}>✨ New version ready <b>Update</b></button>
      )}
      {receiptMsg && (
        <Swipeable className={`receipt ${receiptMsg.kind}`} role="status" key={receiptMsg.key} onGone={() => setReceiptMsg(null)}>
          <span className="rc-icon" aria-hidden="true">{{ spend: '🍽️', deposit: '💪', steps: '👣', edit: '✏️' }[receiptMsg.kind]}</span>
          <span className="rc-text">
            <b>{receiptMsg.kind === 'spend' ? `Spent ${fmt(receiptMsg.kcal)} kcal` : receiptMsg.kind === 'deposit' ? `Deposited +${fmt(receiptMsg.kcal)} kcal` : receiptMsg.kind === 'steps' ? 'Steps saved' : 'Changes saved'}</b>
            <small>{receiptMsg.what}{receiptMsg.left != null && receiptMsg.kind !== 'edit' && receiptMsg.kind !== 'steps' ? ` · ${fmt(receiptMsg.left)} kcal left` : ''}</small>
          </span>
          {receiptMsg.undo && <button onClick={() => { receiptMsg.undo(); setReceiptMsg(null) }}>Undo</button>}
        </Swipeable>
      )}
      {toast && !cheer && (
        <Swipeable className="toast" role="status" key={toast.key} onGone={dismissToast}>
          <span>{toast.text}</span>
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null) }}>Undo</button>}
        </Swipeable>
      )}
      {!showM && hello && profile.onboarded && <WelcomeBack leaving={leaving} profile={profile} left={budget != null ? budget - spent : null} onDone={doneHello} />}
      {showM && <MorningCard notify={notify} isNew={shareNew} focus={focus} leaving={leaving} profile={profile} budget={budget} sleep={dayLog.sleep} onSleep={(sl) => store.setDay(today, { sleep: sl })} words={words} yesterday={yesterday} streakDays={streakDays} birthday={isBirthday(profile, today)} onClose={closeMorning} />}
      {result && <DayResult profile={profile} budget={budget} spent={spent} earn={earn} streakDays={streak(entries, budgetFor, today, true)} today={today} onClose={() => setResult(false)} />}

      {adding && (
        <ErrorBoundary onError={() => { setAdding(false); notify('That screen hit a problem and was closed. Please try again.') }}>
        <AddSheet
          {...ctx}
          editing={adding === true ? null : adding}
          onClose={() => setAdding(false)}
          onRemove={(old) => {
            store.removeEntry(old.id)
            notify(`Removed ${old.name}`, () => store.addEntry({ name: old.name, kcal: old.kcal, meal: old.meal, photo: old.photo, day: old.day }))
            setAdding(false)
          }}
          onSave={(e) => {
            if (adding !== true) {
              const old = adding
              store.updateEntry(old.id, e)
              receipt({ kind: 'edit', what: e.name, kcal: 0, id: old.id, undo: () => store.updateEntry(old.id, { name: old.name, kcal: old.kcal, meal: old.meal, photo: old.photo ?? null }) })
              setAdding(false)
              return
            }
            // the same food again in the same meal today: bump that line's quantity instead
            const base = (nm) => String(nm).replace(/\s×\d+$/, '')
            const q = (nm) => +(String(nm).match(/\s×(\d+)$/)?.[1] ?? 1)
            const same = !e.photo && todays.find((x) => x.meal === e.meal && base(x.name).toLowerCase() === e.name.toLowerCase() && Math.round(x.kcal / q(x.name)) === e.kcal)
            if (same) {
              const n = q(same.name) + 1
              store.updateEntry(same.id, { name: `${base(same.name)} ×${n}`, kcal: same.kcal + e.kcal })
              receipt({ kind: 'spend', what: `${base(same.name)} ×${n}`, kcal: e.kcal, id: same.id, undo: () => store.updateEntry(same.id, { name: same.name, kcal: same.kcal }) })
              setAdding(false)
              setTab('today')
              return
            }
            const id = store.addEntry({ ...e, day: today })
            receipt({ kind: 'spend', what: e.name, kcal: e.kcal, id, undo: () => store.removeEntry(id) })
            setAdding(false)
            setTab('today')
          }}
        />
        </ErrorBoundary>
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
