import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store'
import { useDemoStore } from './demoStore'
import { BUDDIES, Buddy } from './buddies'

const DEMO = import.meta.env.MODE === 'demo'
import { dailyBudget, dayKey } from './calc'
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
  useMode('auto')

  if (DEMO && location.search.includes('buddies')) return <BuddySheet />
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
