import { useState } from 'react'
import { fmt, prettyDate, weighInReport } from '../calc'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'

const signed = (n, unit = ' kg') => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}${unit}`

// Today: the morning weigh-in. One number in, a calm check-in out.
export function WeighCard({ profile, dayLog, today, setDay, updateProfile }) {
  const [v, setV] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const done = +dayLog.weight > 0
  const report = done ? weighInReport(profile, today) : null
  const kg = parseFloat(v)
  const ok = kg >= 25 && kg <= 350
  const save = () => {
    if (!ok) return
    const w = Math.round(kg * 10) / 10
    setDay(today, { weight: w }); updateProfile({ weight: w })
    setV(''); setEditing(false); setOpen(true)
  }
  return (
    <section className="block">
      <h2 className="group-title">Weigh-in</h2>
      {done && !editing ? (
        <div className="card weigh done">
          <button className="weigh-main" onClick={() => setOpen(true)}>
            <span className="weigh-emoji">⚖️</span>
            <span className="weigh-txt"><b>{dayLog.weight} kg today</b><small>{report?.headline ?? 'Logged'}</small></span>
            <span className="chev" aria-hidden="true">›</span>
          </button>
          <button className="link-btn" onClick={() => { setV(String(dayLog.weight)); setEditing(true) }}>Change</button>
        </div>
      ) : (
        <form className="card weigh" onSubmit={(e) => { e.preventDefault(); save() }}>
          <p className="weigh-q">{editing ? 'Correct today’s weight' : 'What does the scale say this morning?'}</p>
          <div className="weigh-row">
            <label className="weigh-in">
              <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} placeholder={profile.weight ? String(profile.weight) : '70.0'} aria-label="Today’s weight in kg" />
              <span>kg</span>
            </label>
            <button className="btn-primary" disabled={!ok}>Save</button>
          </div>
          <p className="fine">Best after waking, after the bathroom and before eating. Skipping a day is fine.</p>
        </form>
      )}
      {open && report && <WeighSheet r={report} profile={profile} onClose={() => setOpen(false)} />}
    </section>
  )
}

function WeighSheet({ r, profile, onClose }) {
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet weigh-sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Weigh-in check-in">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div><p className="muted">Today’s weigh-in</p><h2>{r.w} kg</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className={`ws-msg ${r.tone}`}>
          <b>{r.headline}</b>
          <p>{r.tip}</p>
        </div>

        <div className="ws-grid">
          {r.sincePrev != null && <div><span>Since last weigh-in</span><b>{signed(r.sincePrev)}</b></div>}
          {r.count > 2 && <div><span>7-day trend</span><b>{r.trend.toFixed(1)} kg</b></div>}
          {r.total != null && <div><span>Since {prettyDate(r.since)}</span><b className={r.total < 0 && !r.ms ? 'pos' : ''}>{signed(r.total)}</b></div>}
          {r.perWeek != null && <div><span>Pace</span><b>{signed(r.perWeek, ' kg/wk')}</b></div>}
          {r.bmi && <div><span>BMI</span><b>{r.bmi.bmi}<small> {r.bmi.cat}</small></b></div>}
          {r.budget != null && <div><span>Today’s budget</span><b>{fmt(r.budget)}<small> kcal</small></b></div>}
        </div>

        {r.target && r.done != null && (
          <div className="ws-goal">
            <div className="ws-goal-top"><span>Goal: {r.target} kg</span><b>{r.toGo > 0 ? `${r.toGo.toFixed(1)} kg to go` : 'Reached'}</b></div>
            <div className="ws-bar" role="img" aria-label={`${Math.round(r.done * 100)}% of the way to your goal`}><i style={{ width: `${Math.max(3, r.done * 100)}%` }} /></div>
            <p className="fine">{Math.round(r.done * 100)}% of the way{r.eta ? `. At this pace you’d reach it around ${prettyDate(r.eta)}.` : profile.endDate && r.toGo > 0 ? `. Your plan aims for ${prettyDate(profile.endDate)}.` : '.'}</p>
          </div>
        )}
        {r.ms && (
          <div className="ws-goal">
            <div className="ws-goal-top"><span>Keeping {r.ms.keep} kg</span><b>{r.ms.status === 'in' ? 'In range' : r.ms.status === 'above' ? 'Above range' : 'Below range'}</b></div>
            <p className="fine">Your range is {r.ms.low.toFixed(1)}–{r.ms.high.toFixed(1)} kg.</p>
          </div>
        )}

        <button className="btn-primary" onClick={onClose}>Done</button>
        <p className="fine center">Your budget has been updated for this weight. The trend matters more than any single day.</p>
      </div>
    </div>
  )
}
