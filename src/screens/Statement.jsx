import { useState } from 'react'
import { dayKey, fmt, KCAL_PER_KG } from '../calc'
import { Receipt } from './Today'

export default function Statement({ mine, budget, profile }) {
  const [openDay, setOpenDay] = useState(null)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    const items = mine.filter((e) => e.day === key)
    const spent = items.reduce((a, e) => a + e.kcal, 0)
    return { key, d, items, spent, net: budget != null && items.length ? budget - spent : null }
  })

  const logged = days.filter((d) => d.net != null)
  const weekNet = logged.reduce((a, d) => a + d.net, 0)
  const kg = weekNet / KCAL_PER_KG

  return (
    <>
      <header className="top">
        <div>
          <p className="muted">Last 7 days</p>
          <h1 className="hello">Statement</h1>
        </div>
        <span className="avatar static">{profile.emoji}</span>
      </header>

      <section className="summary">
        <div>
          <small>Week balance</small>
          <b className={weekNet < 0 ? 'neg' : 'pos'}>{weekNet >= 0 ? '+' : '−'}{fmt(Math.abs(weekNet))} <em>kcal</em></b>
        </div>
        <div>
          <small>≈ body weight</small>
          <b>{kg >= 0 ? '−' : '+'}{Math.abs(kg).toFixed(2)} <em>kg</em></b>
        </div>
        <div>
          <small>Days logged</small>
          <b>{logged.length}<em>/7</em></b>
        </div>
      </section>
      <p className="hint">Positive balance = calories saved (deficit). Only days with entries count.</p>

      <ul className="days">
        {days.map((d) => (
          <li key={d.key}>
            <button className="day" onClick={() => setOpenDay(openDay === d.key ? null : d.key)} disabled={!d.items.length}>
              <div>
                <b>{d.key === dayKey() ? 'Today' : d.d.toLocaleDateString('en-GB', { weekday: 'long' })}</b>
                <small>{d.d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {d.items.length ? `${fmt(d.spent)} spent` : 'no entries'}</small>
              </div>
              {d.net != null && <span className={`net ${d.net < 0 ? 'neg' : 'pos'}`}>{d.net >= 0 ? '+' : '−'}{fmt(Math.abs(d.net))}</span>}
            </button>
            {openDay === d.key && (
              <ul className="receipts nested">
                {d.items.map((e) => <Receipt key={e.id} e={e} />)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
