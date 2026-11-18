import Calendar from './Calendar'
import { MILESTONES } from '../milestones'
import { useState } from 'react'
import { dayKey, deficitDays, fmt, KCAL_PER_KG, fmtSleep, sleepHours, SLEEP_TARGET } from '../calc'
import { Row } from './Today'
import BodyCard from './BodyCard'
import Progress from './Progress'
import ShareSheet from './ShareSheet'

export default function Statement(props) {
  const { mine, base: budget, budgetFor } = props
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = dayKey(d)
    const items = mine.filter((e) => e.day === key)
    const spent = items.reduce((a, e) => a + e.kcal, 0)
    const b = budgetFor(key)
    return { key, d, items, spent, net: b != null && items.length ? b - spent : null }
  })
  const [pick, setPick] = useState(days[6].key)
  const [view, setView] = useState('week')
  const sel = days.find((d) => d.key === pick)
  const logged = days.filter((d) => d.net != null)
  const weekNet = logged.reduce((a, d) => a + d.net, 0)
  const top = Math.max(budget ?? 0, ...days.map((d) => d.spent), 1) * 1.1

  return (
    <>
      <header className="large-title">
        <div>
          <p className="date">{view === 'week' ? 'Last 7 days' : 'Day by day'}</p>
          <h1>Progress</h1>
        </div>
      </header>
      <div className="seg view-seg">
        <button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>Week</button>
        <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Calendar</button>
      </div>
      {view === 'month' ? <Calendar {...props} /> : <>

      <section className="card chart">
        <div className="bars">
          {budget != null && <div className="budget-line" style={{ bottom: `calc(26px + 174px * ${budget / top})` }}><span>Budget {fmt(budget)}</span></div>}
          {days.map((d) => (
            <button key={d.key} className={`bar ${pick === d.key ? 'on' : ''}`} onClick={() => setPick(d.key)} aria-label={d.key}>
              <span className="bar-track">
                <span className={`bar-fill ${d.net != null && d.net < 0 ? 'over' : ''}`} style={{ height: `${(d.spent / top) * 100}%` }} />
              </span>
              <span className="bar-day">{d.d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</span>
            </button>
          ))}
        </div>
      </section>

      <DeficitCard {...props} keys={days.map((d) => d.key)} />

      <div className="tiles">
        <div className="card tile-stat">
          <span>{weekNet >= 0 ? 'Under budget' : 'Over budget'}</span>
          <b className={weekNet < 0 ? 'neg' : 'pos'}>{fmt(Math.abs(weekNet))}<small> kcal</small></b>
        </div>
        <div className="card tile-stat">
          <span>Days on budget</span>
          <b>{logged.filter((d) => d.net >= 0).length}<small> of {logged.length || 0}</small></b>
        </div>
        <div className="card tile-stat">
          <span>Days logged</span>
          <b>{logged.length}<small> of 7</small></b>
        </div>
      </div>

      <SleepWeek days={days} log={props.profile?.days ?? {}} />
      </>}

      <h2 className="group-title">Progress</h2>
      <Progress {...props} />

      <Milestones badges={props.profile?.badges ?? {}} character={props.profile?.character} notify={props.notify} />

      <h2 className="group-title">Your body</h2>
      <BodyCard {...props} />

      <h2 className="group-title">
        {sel.key === dayKey() ? 'Today' : sel.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        {sel.net != null && <span className={sel.net < 0 ? 'neg' : 'pos'}>{sel.net >= 0 ? `${fmt(sel.net)} saved` : `${fmt(-sel.net)} over`}</span>}
      </h2>
      {sel.items.length ? (
        <ul className="card list">{sel.items.map((e) => <Row key={e.id} e={e} onEdit={() => props.editEntry?.(e)} />)}</ul>
      ) : (
        <div className="card empty"><p className="muted">Nothing logged on this day.</p></div>
      )}
    </>
  )
}

function SleepWeek({ days, log }) {
  const nights = days.map((d) => ({ ...d, h: sleepHours(log[d.key]?.sleep) }))
  const logged = nights.filter((n) => n.h != null)
  if (!logged.length) return null
  const avg = logged.reduce((a, n) => a + n.h, 0) / logged.length
  const good = logged.filter((n) => n.h >= SLEEP_TARGET).length
  return (
    <>
      <h2 className="group-title">Sleep</h2>
      <div className="card sleep-week">
        <div className="sw-top">
          <div><span>Average</span><b>{fmtSleep(avg)}</b></div>
          <p>{good} of {logged.length} nights with {SLEEP_TARGET}+ hours</p>
        </div>
        <div className="sw-bars" role="img" aria-label={`Sleep each night this week, average ${fmtSleep(avg)}`}>
          <span className="sw-line" style={{ bottom: `${(SLEEP_TARGET / 10) * 100}%` }} />
          {nights.map((n) => (
            <div key={n.key} className="sw-col">
              <i className={n.h == null ? 'none' : n.h >= SLEEP_TARGET ? 'ok' : 'short'} style={{ height: n.h == null ? '4%' : `${Math.min(100, (n.h / 10) * 100)}%` }} />
              <small>{n.d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</small>
            </div>
          ))}
        </div>
        <p className="fine">Adults need at least {SLEEP_TARGET} hours a night. Short sleep tends to raise hunger the next day, so be kind to yourself on those days.</p>
      </div>
    </>
  )
}

function Milestones({ badges, character, notify }) {
  const [all, setAll] = useState(false)
  const [pic, setPic] = useState(null)
  const got = MILESTONES.filter((m) => badges[m.id])
  const next = MILESTONES.filter((m) => !badges[m.id])
  const shown = all ? next : next.slice(0, 3)
  return (
    <>
      <h2 className="group-title">Milestones <span className="ms-count">{got.length} of {MILESTONES.length}</span></h2>
      <div className="card milestones">
        {got.length === 0 && <p className="ms-empty">Your first milestone is one logged meal away.</p>}
        {got.length > 0 && (
          <div className="ms-grid">
            {got.map((m) => <button className="ms on" key={m.id} onClick={() => setPic(m)} aria-label={`Share milestone: ${m.label}`}><span>{m.emoji}</span><b>{m.label}</b></button>)}
          </div>
        )}
        {got.length > 0 && <p className="ms-tip">Tap a milestone to share it</p>}
        {pic && <ShareSheet kind="milestone" title="Share this milestone" file="milestone.png" buddies={[character]} notify={notify} data={{ emoji: pic.emoji, label: pic.label }} onClose={() => setPic(null)} />}
        {next.length > 0 && <p className="ms-next">Coming up</p>}
        <ul className="ms-list">
          {shown.map((m) => <li key={m.id}><span>{m.emoji}</span>{m.hint}</li>)}
        </ul>
        {next.length > 3 && <button className="link-btn" onClick={() => setAll((x) => !x)}>{all ? 'Show fewer' : `Show all ${next.length}`}</button>}
      </div>
    </>
  )
}

// The real calorie deficit this week: what your body used minus what you ate.
// This is what turns into fat loss (about 7,700 kcal per kg), so it's the motivating number.
function DeficitCard({ mine, profile, keys, today }) {
  const rows = deficitDays({ entries: mine, profile, keys, todayKey: today })
  if (!rows) return null
  const done = rows.filter((r) => r.deficit != null && !r.today)
  const now = rows.find((r) => r.today && r.deficit != null)
  const total = done.reduce((a, r) => a + r.deficit, 0) + (now?.deficit ?? 0)
  const kg = total / KCAL_PER_KG
  const maintain = profile.goal === 'maintain' && !(+profile.targetWeight > 0 && +profile.weight > +profile.targetWeight)
  const counted = done.length + (now ? 1 : 0)
  if (!counted) {
    return <section className="card deficit empty"><h3>Calorie deficit</h3><p>Log your meals and your weekly deficit shows up here: the calories your body burned beyond what you ate.</p></section>
  }
  const inDeficit = done.filter((r) => r.deficit > 0).length
  const avg = Math.round(total / counted)
  const top = Math.max(300, ...rows.map((r) => Math.abs(r.deficit ?? 0)))
  const headline = maintain
    ? Math.abs(avg) <= 200 ? 'Right on balance ⚖️' : avg > 0 ? 'A little under maintenance' : 'A little over maintenance'
    : total > 0 ? (kg >= 0.25 ? 'Fat is melting 🔥' : 'Nice, you’re in a deficit 💪') : 'No deficit this week, yet'
  const line = maintain
    ? `You average ${fmt(Math.abs(avg))} kcal a day ${avg >= 0 ? 'under' : 'over'} what your body uses. For maintaining, close to zero is the goal.`
    : total > 0
      ? `Your body burned ${fmt(total)} kcal more than you ate. That's about ${kg.toFixed(2)} kg of fat${inDeficit ? `, with ${inDeficit} of ${done.length} full days in a deficit` : ''}.`
      : `You ate ${fmt(-total)} kcal more than your body used. A few lighter days or an extra walk turns it around.`
  return (
    <section className={`card deficit ${maintain ? 'maint' : total > 0 ? 'good' : 'over'}`}>
      <div className="df-head">
        <div>
          <p className="df-label">Calorie deficit · this week</p>
          <h3>{headline}</h3>
        </div>
        {!maintain && total > 0 && <div className="df-kg"><b>{kg >= 0.1 ? kg.toFixed(1) : kg.toFixed(2)}</b><small>kg fat</small></div>}
      </div>
      <p className="df-line">{line}</p>
      <div className={`df-days ${rows.some((r) => r.deficit != null && r.deficit <= 0) ? '' : 'no-down'}`} aria-label="Deficit by day">
        {rows.map((r) => {
          const d = new Date(r.key + 'T12:00')
          const h = r.deficit == null ? 0 : Math.max(6, (Math.abs(r.deficit) / top) * 44)
          return (
            <div key={r.key} className={`df-day ${r.deficit == null ? 'none' : r.deficit > 0 ? 'plus' : 'minus'} ${r.today ? 'today' : ''}`}
              title={r.deficit == null ? 'Nothing logged' : `${r.deficit > 0 ? '−' : '+'}${fmt(Math.abs(r.deficit))} kcal`}>
              <span className="df-up">{r.deficit > 0 && <i style={{ height: h }} />}</span>
              <span className="df-down">{r.deficit != null && r.deficit <= 0 && <i style={{ height: h }} />}</span>
              <small>{r.today ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</small>
            </div>
          )
        })}
      </div>
      <p className="df-foot">Up = burned more than you ate. {now ? 'Today counts as you go.' : ''} Days with nothing logged are left out.</p>
    </section>
  )
}
