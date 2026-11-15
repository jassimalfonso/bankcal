import { useState } from 'react'
import { dayKey, fmt, KCAL_PER_KG } from '../calc'
import { Tile, level } from './Today'

export default function Statement({ mine, budget, profile }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = dayKey(d)
    const items = mine.filter((e) => e.day === key)
    const spent = items.reduce((a, e) => a + e.kcal, 0)
    return { key, d, items, spent, net: budget != null && items.length ? budget - spent : null }
  })
  const [pick, setPick] = useState(days[6].key)
  const sel = days.find((d) => d.key === pick)

  const logged = days.filter((d) => d.net != null)
  const weekNet = logged.reduce((a, d) => a + d.net, 0)
  const kg = weekNet / KCAL_PER_KG

  return (
    <>
      <header className="page-head">
        <p>This week,<br /><b>{profile.name}</b></p>
        <span className="avatar static">{profile.emoji}</span>
      </header>

      <div className="week">
        {days.map((d) => (
          <button key={d.key} className={`mini ${pick === d.key ? 'on' : ''} ${d.net != null && d.net < 0 ? 'over' : ''} ${d.items.length ? '' : 'empty'}`} onClick={() => setPick(d.key)}>
            <span className="mini-tank">
              <span className="mini-fill" style={{ height: `${d.items.length ? level(budget, d.spent) * 100 : 0}%` }} />
            </span>
            <span className="mini-day">{d.d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
          </button>
        ))}
      </div>

      <div className="stats">
        <div>
          <b className={weekNet < 0 ? 'neg' : ''}>{weekNet >= 0 ? '' : '−'}{fmt(Math.abs(weekNet))}</b>
          <span>kcal {weekNet >= 0 ? 'saved' : 'overspent'} this week</span>
        </div>
        <div>
          <b>{Math.abs(kg).toFixed(2)}</b>
          <span>kg {kg >= 0 ? 'lost' : 'gained'}, roughly</span>
        </div>
        <div>
          <b>{logged.length}/7</b>
          <span>days logged</span>
        </div>
      </div>

      <div className="section-head">
        <h2>{sel.key === dayKey() ? 'Today' : sel.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
        {sel.net != null && <span className={sel.net < 0 ? 'neg' : 'pos'}>{sel.net >= 0 ? `${fmt(sel.net)} kcal saved` : `${fmt(-sel.net)} kcal over`}</span>}
      </div>
      {sel.items.length ? (
        <ul className="gallery">{sel.items.map((e) => <Tile key={e.id} e={e} />)}</ul>
      ) : (
        <p className="empty">No meals logged on this day.</p>
      )}
    </>
  )
}
