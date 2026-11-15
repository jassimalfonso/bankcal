import { useMemo, useState } from 'react'
import { dayKey, fmt, fmtSleep, sleepHours } from '../calc'
import { MOODS, habitById } from '../habits'

const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Month view: each day is coloured by whether you stayed within budget.
export default function Calendar({ mine, budgetFor, profile, today }) {
  const [y0, m0] = today.split('-').map(Number)
  const [ym, setYm] = useState({ y: y0, m: m0 - 1 })
  const [pick, setPick] = useState(today)

  const byDay = useMemo(() => {
    const map = {}
    for (const e of mine) (map[e.day] ??= []).push(e)
    return map
  }, [mine])

  const info = (key) => {
    const items = byDay[key] ?? []
    const spent = items.reduce((a, e) => a + e.kcal, 0)
    const b = budgetFor(key)
    const net = b != null && items.length ? b - spent : null
    return { key, items, spent, budget: b, net, log: profile.days?.[key] ?? {} }
  }

  const first = new Date(ym.y, ym.m, 1)
  const lead = (first.getDay() + 6) % 7 // Monday first
  const count = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells = Array.from({ length: lead + count }, (_, i) => (i < lead ? null : info(dayKey(new Date(ym.y, ym.m, i - lead + 1)))))

  const monthDays = cells.filter((c) => c && c.net != null)
  const saved = monthDays.reduce((a, c) => a + c.net, 0)
  const within = monthDays.filter((c) => c.net >= 0).length
  const isFuture = (k) => k > today
  const canNext = new Date(ym.y, ym.m + 1, 1) <= new Date(y0, m0 - 1, 1)
  const go = (d) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() } })
  const sel = info(pick)
  const sl = sleepHours(sel.log.sleep)

  return (
    <>
      <section className="card cal">
        <div className="cal-head">
          <button onClick={() => go(-1)} aria-label="Previous month">‹</button>
          <b>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</b>
          <button onClick={() => go(1)} disabled={!canNext} aria-label="Next month">›</button>
        </div>
        <div className="cal-grid">
          {WD.map((w) => <span key={w} className="cal-wd">{w}</span>)}
          {cells.map((c, i) => c == null ? <span key={'x' + i} /> : (
            <button
              key={c.key}
              className={`cal-day ${c.net == null ? '' : c.net >= 0 ? 'good' : 'over'} ${c.key === today ? 'today' : ''} ${c.key === pick ? 'on' : ''}`}
              disabled={isFuture(c.key)}
              onClick={() => setPick(c.key)}
              aria-label={`${c.key}${c.net == null ? ', nothing logged' : c.net >= 0 ? `, saved ${c.net} kcal` : `, ${-c.net} kcal over`}`}
            >
              {+c.key.slice(8)}
            </button>
          ))}
        </div>
        <div className="cal-legend"><span><i className="good" />Within budget</span><span><i className="over" />Over</span><span><i />Not logged</span></div>
      </section>

      <div className="tiles two">
        <div className="card tile-stat"><span>{saved >= 0 ? 'Saved this month' : 'Over this month'}</span><b className={saved < 0 ? 'neg' : 'pos'}>{fmt(Math.abs(saved))}<small> kcal</small></b></div>
        <div className="card tile-stat"><span>Days within budget</span><b>{within}<small> of {monthDays.length}</small></b></div>
      </div>

      <section className="card cal-detail">
        <b>{new Date(pick + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
        {sel.items.length === 0 ? <p className="muted">Nothing logged this day.</p> : (
          <>
            <p className={sel.net >= 0 ? 'pos' : 'neg'}>{sel.net >= 0 ? `Saved ${fmt(sel.net)} kcal` : `${fmt(-sel.net)} kcal over`}</p>
            <ul>
              {sel.items.map((e) => <li key={e.id}><span>{e.name}</span><span>{fmt(e.kcal)}</span></li>)}
              <li className="sum"><span>Eaten of {fmt(sel.budget ?? 0)} budget</span><span>{fmt(sel.spent)}</span></li>
            </ul>
          </>
        )}
        {(sl != null || sel.log.weight || sel.log.steps) && (
          <p className="cal-extra">
            {[sl != null && `😴 ${fmtSleep(sl)}`, sel.log.steps && `🚶 ${fmt(+sel.log.steps)} steps`, sel.log.weight && `⚖️ ${sel.log.weight} kg`].filter(Boolean).join('   ')}
          </p>
        )}
        {Object.entries(sel.log.habits ?? {}).some(([, v]) => v) && (
          <p className="cal-extra">{Object.entries(sel.log.habits).filter(([, v]) => v).map(([id]) => `${habitById[id]?.emoji ?? '✓'} ${habitById[id]?.label ?? id}`).join('\n')}</p>
        )}
        {(sel.log.journal?.text || sel.log.journal?.mood) && (
          <div className="cal-journal">
            <span>{MOODS.find((m) => m.id === sel.log.journal.mood)?.e ?? '📝'} Journal</span>
            {sel.log.journal.text && <p>{sel.log.journal.text}</p>}
          </div>
        )}
      </section>
    </>
  )
}
