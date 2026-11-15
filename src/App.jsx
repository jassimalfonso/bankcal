import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store'
import { useDemoStore } from './demoStore'

const DEMO = import.meta.env.MODE === 'demo'
import { dailyBudget, dayKey } from './calc'
import Today from './screens/Today'
import Statement from './screens/Statement'
import Me from './screens/Me'
import AddSheet from './screens/AddSheet'
import SignIn from './screens/SignIn'
import Onboarding from './screens/Onboarding'
import Avatar, { AVATARS } from './Avatar'
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
  useMode('auto')

  if (DEMO && location.search.includes('avatars')) return <AvatarSheet />
  if (DEMO && !location.search.includes('signin')) return <Bank user={{ uid: 'demo', email: 'demo@example.com' }} />
  if (user === undefined) return <div className="loading" />
  if (!user) return <SignIn />
  return <Bank user={user} />
}

function Bank({ user }) {
  const store = DEMO ? useDemoStore() : useStore(user) // eslint-disable-line react-hooks/rules-of-hooks
  const { profile, entries } = store
  const [tab, setTab] = useState('today')
  const [adding, setAdding] = useState(false)
  useMode(profile?.mode ?? 'auto')

  const today = dayKey()
  const todays = useMemo(() => entries.filter((e) => e.day === today), [entries, today])

  if (!profile) return <div className="loading" />
  if (!profile.onboarded) return <Onboarding {...store} />

  const budget = dailyBudget(profile)
  const ctx = { ...store, user, profile, mine: entries, todays, budget, goSetup: () => setTab('me') }

  return (
    <div className={`app theme-${profile.theme}`}>
      <main className="screen" key={tab}>
        {tab === 'today' && <Today {...ctx} />}
        {tab === 'week' && <Statement {...ctx} />}
        {tab === 'me' && <Me {...ctx} />}
      </main>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Log food">
        <IconPlus size={30} />
      </button>

      <nav className="tabbar">
        <TabBtn id="today" tab={tab} setTab={setTab} label="Today" Icon={IconToday} />
        <TabBtn id="week" tab={tab} setTab={setTab} label="Week" Icon={IconStatement} />
        <TabBtn id="me" tab={tab} setTab={setTab} label="Settings" Icon={IconMe} />
      </nav>

      {adding && (
        <AddSheet
          {...ctx}
          onClose={() => setAdding(false)}
          onSave={(e) => {
            store.addEntry(e)
            navigator.vibrate?.(12)
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

function AvatarSheet() {
  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {AVATARS.flatMap((a) => [undefined, 'happy', 'ok', 'over', 'sleep'].map((m) => <Avatar key={a.id + m} id={a.id} mood={m} size={96} />))}
    </div>
  )
}
