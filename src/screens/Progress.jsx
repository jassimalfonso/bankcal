import { useState } from 'react'
import { WINS, recentWins } from '../habits'
import { dayKey, fmt, maintainStatus, plan, prettyDate, startOf, weightTrend } from '../calc'

const DAY = 86400000
const toDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }

// Weight trend from daily weigh-ins, target line, and an estimated finish date.
export default function Progress({ profile, goSetup, updateProfile }) {
  const [at, setAt] = useState(null) // the weigh-in being looked at (tap or drag the chart)
  const [editStart, setEditStart] = useState(false)
  const pts = weightTrend(Object.entries(profile.days ?? {})
    .filter(([, d]) => +d?.weight > 0)
    .map(([k, d]) => ({ k, t: toDate(k).getTime(), w: +d.weight }))
    .sort((a, b) => a.t - b.t))
    .slice(-60)
  const target = +profile.targetWeight || null
  const pl = plan(profile, profile.weight)

  if (pts.length === 0) {
    return (
      <div className="card progress">
        <p className="eta">Log your weight on the Today screen (best in the morning) to see your trend here.</p>
      </div>
    )
  }

  // simple linear trend over the last 28 days
  const recent = pts.filter((p) => p.t >= pts[pts.length - 1].t - 28 * DAY)
  let slope = null // kg per day
  if (recent.length >= 2 && recent[recent.length - 1].t - recent[0].t >= 6 * DAY) {
    const n = recent.length, mt = recent.reduce((a, p) => a + p.t, 0) / n, mw = recent.reduce((a, p) => a + p.w, 0) / n
    const num = recent.reduce((a, p) => a + (p.t - mt) * (p.w - mw), 0), den = recent.reduce((a, p) => a + (p.t - mt) ** 2, 0)
    slope = den ? (num / den) * DAY : null
  }
  const last = pts[pts.length - 1]
  const first = pts[0]
  const change = last.trend - first.trend
  let etaText = null
  if (target && last.w > target) {
    if (slope != null && slope < -0.005) {
      const days = Math.ceil((last.w - target) / -slope)
      const d = new Date(last.t + days * DAY)
      etaText = <>At your current pace ({(slope * 7).toFixed(2)} kg/week) you’ll reach <b>{target} kg</b> around <b>{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</b>.</>
    } else if (pl && profile.endDate) {
      etaText = <>Your plan aims for <b>{target} kg</b> by <b>{prettyDate(profile.endDate)}</b>. Keep logging your weight; a pace estimate appears after a week of weigh-ins.</>
    } else {
      etaText = <>Keep logging your weight; a pace estimate appears after a week of weigh-ins.</>
    }
  } else if (target && last.w <= target) {
    etaText = <><b>🎉 You’ve reached your target.</b> Your budget now keeps you here. Tap <b>Switch to maintain</b> in Settings to lock it in.</>
  }
  const ms = maintainStatus(profile)
  if (ms) etaText = ms.status === 'in'
    ? <>Maintaining <b>{ms.keep} kg</b>. Staying within {ms.low.toFixed(1)}–{ms.high.toFixed(1)} kg counts as on track.</>
    : <>You’re <b>{Math.abs(ms.diff)} kg {ms.diff > 0 ? 'above' : 'below'}</b> the {ms.keep} kg you’re keeping. See Settings for a gentle reset.</>

  // chart scales
  const W = 320, H = 130, pad = 6
  const ws = pts.map((p) => p.w).concat(target ? [target] : [])
  const lo = Math.min(...ws) - 0.5, hi = Math.max(...ws) + 0.5
  const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + DAY)
  const x = (t) => pad + ((t - t0) / (t1 - t0)) * (W - 2 * pad)
  const y = (w) => pad + ((hi - w) / (hi - lo)) * (H - 2 * pad)
  const weekly = profile.weighFreq === 'weekly'
  // weekly weigh-ins: each point is already a "week", so the line joins the weigh-ins themselves
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(weekly ? p.w : p.trend).toFixed(1)}`).join(' ')
  const cur = pts[at ?? pts.length - 1]
  const pickAt = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0
    pts.forEach((p, i) => { if (Math.abs(x(p.t) - px) < Math.abs(x(pts[best].t) - px)) best = i })
    setAt(best)
  }
  const start = startOf(profile)
  const journey = start && target && start.w > target ? Math.min(1, Math.max(0, (start.w - last.w) / (start.w - target))) : null
  const lost = start ? Math.round((start.w - last.w) * 10) / 10 : null

  return (
    <div className="card progress">
      {/* start → now → goal */}
      {start && (
        <div className="journey">
          <div className="jr-row">
            <button className="jr-pt" onClick={() => setEditStart(true)} aria-label="Change starting weight"><small>Start</small><b>{start.w}</b><i>edit</i></button>
            <div className="jr-pt now"><small>Now</small><b>{last.w}</b></div>
            {target ? <div className="jr-pt"><small>Goal</small><b>{target}</b></div> : <button className="jr-pt" onClick={goSetup}><small>Goal</small><b>—</b><i>set</i></button>}
          </div>
          {journey != null && <div className="jr-bar"><span style={{ width: `${journey * 100}%` }} /></div>}
          <p className="jr-line">{lost > 0 ? <><b>{lost.toFixed(1)} kg down</b> since you started{start.k ? ` (${toDate(start.k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})` : ''}{journey != null ? `, ${Math.round(journey * 100)}% of the way` : ''}.</> : lost < 0 ? <>{Math.abs(lost).toFixed(1)} kg above your start. Trends matter more than any one day.</> : 'Right where you started. Every journey begins here.'}</p>
          {editStart && (
            <form className="jr-edit" onSubmit={(e) => { e.preventDefault(); const v = parseFloat(e.target.w.value); const d = e.target.d.value; if (v >= 25 && v <= 350) { updateProfile({ startWeight: Math.round(v * 10) / 10, startWeightDate: d || null }); setEditStart(false) } }}>
              <input name="w" inputMode="decimal" defaultValue={start.w} aria-label="Starting weight in kg" /> <span>kg on</span>
              <input name="d" type="date" defaultValue={start.k ?? ''} max={dayKey()} aria-label="Start date" />
              <button className="btn-primary">Save</button>
              <button type="button" className="link-btn" onClick={() => setEditStart(false)}>Cancel</button>
            </form>
          )}
        </div>
      )}
      <div className="progress-top">
        <b>{cur.w} kg{at == null && pts.length > 2 && !weekly && <small> (avg {cur.trend.toFixed(1)})</small>}</b>
        <span>{at == null
          ? (pts.length > 1 ? `${change <= 0 ? '−' : '+'}${Math.abs(change).toFixed(1)} kg since ${toDate(first.k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'First weigh-in')
          : <>{toDate(cur.k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}{!weekly && pts.length > 2 ? ` · 7-day avg ${cur.trend.toFixed(1)}` : ''}{at > 0 ? (Math.abs(cur.w - pts[at - 1].w) < 0.05 ? ' · same as before' : ` · ${cur.w - pts[at - 1].w < 0 ? '−' : '+'}${Math.abs(cur.w - pts[at - 1].w).toFixed(1)} from before`) : ''}</>}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Weight trend. Tap or drag to see each weigh-in." className="tap-chart"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); pickAt(e) }} onPointerMove={(e) => { if (e.buttons) pickAt(e) }}>
        {target && <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--pos)" strokeDasharray="5 5" strokeWidth="1.5" />}
        {at != null && <line x1={x(cur.t)} x2={x(cur.t)} y1={0} y2={H} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        {pts.length > 1 && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {pts.map((p, i) => <circle key={p.k} cx={x(p.t)} cy={y(p.w)} r={i === at ? 5 : 2.5} fill="var(--accent)" opacity={i === at || weekly ? 1 : 0.35} />)}
      </svg>
      <p className="fine trend-note">{weekly ? 'Each dot is a weekly weigh-in. ' : pts.length > 2 ? 'The line is your 7-day average; dots are daily weigh-ins. ' : ''}Tap or drag the chart to see any day.{weekly ? ' Weigh in on the same day and time each week for a fair comparison.' : ' Daily ups and downs of 1–2 kg are just water and salt.'}</p>
      {etaText && <p className="eta">{etaText}</p>}
      {(() => {
        const wins = recentWins(profile, dayKey(), 30)
        if (!wins.length) return null
        const count = wins.reduce((a, w) => ({ ...a, [w.id]: (a[w.id] ?? 0) + 1 }), {})
        return (
          <div className="wins-row">
            <b>Wins beyond the scale · 30 days</b>
            <div>{Object.entries(count).sort((a, b) => b[1] - a[1]).map(([id, n]) => { const w = WINS.find((x) => x.id === id); return w && <span key={id} className="chip">{w.e} {w.label}{n > 1 ? ` ×${n}` : ''}</span> })}</div>
          </div>
        )
      })()}
      {!target && <button className="link-btn" onClick={goSetup}>Set a target weight</button>}
    </div>
  )
}
