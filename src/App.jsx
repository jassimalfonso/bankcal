import { useEffect, useMemo, useState } from 'react'
import { useStore } from './store'
import { dailyBudget, dayKey } from './calc'
import Today from './screens/Today'
import Statement from './screens/Statement'
import Me from './screens/Me'
import AddSheet from './screens/AddSheet'
import SwitchSheet from './screens/SwitchSheet'
import { IconMe, IconPlus, IconStatement, IconToday } from './icons'

export default function App() {
  const store = useStore()
  const { state } = store
  const pid = state.active
  const profile = state.profiles[pid]
  const [tab, setTab] = useState('today')
  const [adding, setAdding] = useState(false)
  const [switching, setSwitching] = useState(false)

  const mine = useMemo(() => state.entries.filter((e) => e.pid === pid), [state.entries, pid])
  const today = dayKey()
  const todays = mine.filter((e) => e.day === today)
  const budget = dailyBudget(profile)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.mode = state.mode
    const dark = state.mode === 'dark' || (state.mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1B1B19' : '#EDEEEA')
  }, [state.mode])

  const ctx = { ...store, pid, profile, mine, todays, budget, openSwitch: () => setSwitching(true), goSetup: () => setTab('me') }

  return (
    <div className={`app theme-${profile.theme}`}>
      <main className="screen" key={tab + pid}>
        {tab === 'today' && <Today {...ctx} />}
        {tab === 'statement' && <Statement {...ctx} />}
        {tab === 'me' && <Me {...ctx} />}
      </main>

      <nav className="tabbar">
        <TabBtn id="today" tab={tab} setTab={setTab} label="Today" Icon={IconToday} />
        <TabBtn id="statement" tab={tab} setTab={setTab} label="Week" Icon={IconStatement} />
        <button className="fab" onClick={() => setAdding(true)} aria-label="Log food">
          <IconPlus size={28} />
        </button>
        <TabBtn id="me" tab={tab} setTab={setTab} label="Me" Icon={IconMe} />
        <button className="tab avatar-tab" onClick={() => setSwitching(true)} aria-label="Switch profile">
          <span className="mini-avatar">{profile.emoji}</span>
          <span>Switch</span>
        </button>
      </nav>

      {adding && (
        <AddSheet
          {...ctx}
          onClose={() => setAdding(false)}
          onSave={(e) => {
            store.addEntry({ ...e, pid })
            navigator.vibrate?.(12)
            setAdding(false)
            setTab('today')
          }}
        />
      )}
      {switching && <SwitchSheet {...ctx} onClose={() => setSwitching(false)} />}
    </div>
  )
}

function TabBtn({ id, tab, setTab, label, Icon }) {
  return (
    <button className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
      <Icon />
      <span>{label}</span>
    </button>
  )
}
