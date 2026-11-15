import { fmt, maintainStatus, plan, prettyDate, weightTrend } from '../calc'

const DAY = 86400000
const toDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }

// Weight trend from daily weigh-ins, target line, and an estimated finish date.
export default function Progress({ profile, goSetup }) {
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
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.trend).toFixed(1)}`).join(' ')

  return (
    <div className="card progress">
      <div className="progress-top">
        <b>{pts.length > 2 ? last.trend.toFixed(1) : last.w} kg{pts.length > 2 && <small> trend</small>}</b>
        <span>{pts.length > 1 ? `${change <= 0 ? '−' : '+'}${Math.abs(change).toFixed(1)} kg since ${toDate(first.k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'First weigh-in'}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Weight trend">
        {target && <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--pos)" strokeDasharray="5 5" strokeWidth="1.5" />}
        {pts.length > 1 && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {pts.map((p) => <circle key={p.k} cx={x(p.t)} cy={y(p.w)} r="2.5" fill="var(--accent)" opacity="0.35" />)}
      </svg>
      {pts.length > 2 && <p className="fine trend-note">The line is your 7-day average; the dots are daily weigh-ins (today: {last.w} kg). Daily ups and downs of 1–2 kg are just water and salt.</p>}
      {etaText && <p className="eta">{etaText}</p>}
      {!target && <button className="link-btn" onClick={goSetup}>Set a target weight</button>}
    </div>
  )
}
