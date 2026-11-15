import { useState } from 'react'
import { dayKey, fmt, KCAL_PER_KG, fmtSleep, sleepHours, SLEEP_TARGET } from '../calc'
import { Row } from './Today'
import BodyCard from './BodyCard'
import Progress from './Progress'

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
  const sel = days.find((d) => d.key === pick)
  const logged = days.filter((d) => d.net != null)
  const weekNet = logged.reduce((a, d) => a + d.net, 0)
  const kg = weekNet / KCAL_PER_KG
  const top = Math.max(budget ?? 0, ...days.map((d) => d.spent), 1) * 1.1

  return (
    <>
      <header className="large-title">
        <div>
          <p className="date">Last 7 days</p>
          <h1>Week</h1>
        </div>
      </header>

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

      <div className="tiles">
        <div className="card tile-stat">
          <span>{weekNet >= 0 ? 'Saved' : 'Overspent'}</span>
          <b className={weekNet < 0 ? 'neg' : 'pos'}>{fmt(Math.abs(weekNet))}<small> kcal</small></b>
        </div>
        <div className="card tile-stat">
          <span>{kg >= 0 ? 'Weight lost' : 'Weight gained'}</span>
          <b>{Math.abs(kg).toFixed(2)}<small> kg</small></b>
        </div>
        <div className="card tile-stat">
          <span>Days logged</span>
          <b>{logged.length}<small> of 7</small></b>
        </div>
      </div>

      <SleepWeek days={days} log={props.profile?.days ?? {}} />

      <h2 className="group-title">Progress</h2>
      <Progress {...props} />

      <h2 className="group-title">Your body</h2>
      <BodyCard {...props} />

      <h2 className="group-title">
        {sel.key === dayKey() ? 'Today' : sel.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        {sel.net != null && <span className={sel.net < 0 ? 'neg' : 'pos'}>{sel.net >= 0 ? `${fmt(sel.net)} saved` : `${fmt(-sel.net)} over`}</span>}
      </h2>
      {sel.items.length ? (
        <ul className="card list">{sel.items.map((e) => <Row key={e.id} e={e} />)}</ul>
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
