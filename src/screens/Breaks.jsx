// Breaks from the usual budget, for fun and real life:
//  • Weekend mode: a little less on weekdays, more on the weekend. Same week, same fat loss.
//  • Vacation mode: whenever you're away, eat at maintenance. Play / pause, optional end date,
//    and it can be taken together with your partner.
import { useState } from 'react'
import { breakdown, dailyBudget, dayKey, fmt, prettyDate, vacationDay, vacationLength, vacationOn, weekendPlan, KCAL_PER_KG } from '../calc'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SIZES = [[150, 'Small'], [250, 'Medium'], [400, 'Big']]

// a sample weekday and weekend day, to show the split in numbers
function split(p) {
  const days = p.weekend?.days?.length ? p.weekend.days : [6, 0]
  const d = new Date()
  const find = (want) => { for (let i = 0; i < 7; i++) { const x = new Date(d); x.setDate(d.getDate() + i); if (days.includes(x.getDay()) === want) return dayKey(x) } return null }
  const wk = find(false), we = find(true)
  const q = { ...p, vacation: null }
  return { weekday: wk && dailyBudget(q, wk), weekend: we && dailyBudget(q, we), days }
}

export function BreaksSettings({ profile: p, updateProfile: set, today, partner, celebrate, notify }) {
  const bd = breakdown(p)
  const base = dailyBudget({ ...p, vacation: null, weekend: null })
  const extra = bd && base != null ? Math.max(0, Math.round(bd.tdee / 10) * 10 - base) : null
  const w = p.weekend ?? {}
  const sp = split(p)
  const v = p.vacation
  const partnerName = (partner?.partners ?? []).map((id) => partner.shares?.[id]?.name).find(Boolean)
  const [end, setEnd] = useState('')
  const [together, setTogether] = useState(!!partnerName)
  const start = () => {
    set({ vacation: { start: today, end: end && end >= today ? end : null, together: together && !!partnerName, paused: false } })
    celebrate?.(`Vacation mode on! 🏖️ Enjoy${together && partnerName ? ` it with ${partnerName}` : ''}`)
  }

  return (
    <>
      <h2 className="group-title" id="breaks">Breaks</h2>
      <div className="card form-list breaks">
        <label className="line toggle-line">
          <span className="line-label">☀️ Weekend mode<small>Eat more on the weekend, a little less on weekdays</small></span>
          <input type="checkbox" className="switch" checked={!!w.on} onChange={(e) => set({ weekend: { size: 250, days: [6, 0], ...w, on: e.target.checked } })} />
        </label>
        {w.on && (
          <div className="br-body">
            <div className="seg">{SIZES.map(([n, l]) => <button key={n} className={(+w.size || 250) === n ? 'on' : ''} onClick={() => set({ weekend: { ...w, size: n } })}>{l} +{n}</button>)}</div>
            <div className="br-days" aria-label="Weekend days">
              {[5, 6, 0].map((d) => {
                const on = sp.days.includes(d)
                return <button key={d} aria-pressed={on} className={on ? 'on' : ''} onClick={() => { const next = on ? sp.days.filter((x) => x !== d) : [...sp.days, d]; if (next.length) set({ weekend: { ...w, days: next } }) }}>{DAY_NAMES[d]}</button>
              })}
            </div>
            {sp.weekday != null && <p className="br-split"><span>Weekdays <b>{fmt(sp.weekday)}</b></span><span>Weekend <b className="pos">{fmt(sp.weekend)}</b></span></p>}
            {(() => {
              const wp = weekendPlan(p)
              if (!wp) return null
              return wp.cost > 0
                ? <p className="br-note">{wp.minus === 0 ? 'Your weekdays are already at the safe minimum, so they stay the same.' : 'Weekdays can only go down a little before the safe minimum.'} The weekend extra slows you a bit: about <b>{(wp.cost / KCAL_PER_KG).toFixed(2)} kg less a week</b>.</p>
                : <p className="br-note">Same weekly total, so the same fat loss.</p>
            })()}
          </div>
        )}
      </div>

      <div className="card form-list breaks vac-set">
        {!v ? (
          <div className="br-body">
            <p className="br-title">🏖️ Vacation mode</p>
            <p className="br-note">Going away? Switch it on and enjoy. You eat at maintenance{extra ? <>, that’s <b>+{fmt(extra)} kcal a day</b> ({fmt(base + extra)} in all)</> : ''}, and hold your weight while you’re off. Your streak waits for you.</p>
            <label className="br-end"><span>Back on</span>
              <span className="br-date">
                <input type="date" value={end} min={today} onChange={(e) => setEnd(e.target.value)} aria-label="Back on (optional)" />
                <i aria-hidden="true" className={end ? "set" : ""}>{end ? prettyDate(end) : 'Pick a date (optional)'}</i>
              </span>
              {end && <button type="button" className="link-btn" onClick={(e) => { e.preventDefault(); setEnd('') }}>Clear</button>}
            </label>
            {partnerName && (
              <label className="keep-food"><input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} />
                <span>Together with <b>{partnerName}</b>. They’ll get an invite to join.</span></label>
            )}
            <button className="btn-primary" onClick={start}>Start vacation 🏖️</button>
          </div>
        ) : (
          <div className="br-body">
            <p className="br-title">🏖️ Vacation {v.paused ? 'paused' : 'on'}</p>
            <p className="br-note">Since {prettyDate(v.start)}{v.end ? `, back on ${prettyDate(v.end)}` : ''}.{extra ? ` Budget +${fmt(extra)} kcal a day while it’s on.` : ''}</p>
            <VacationControls p={p} set={set} notify={notify} />
          </div>
        )}
      </div>
      <p className="fine">Breaks change your budget only from today on. Past days keep the budget they had.</p>
    </>
  )
}

function VacationControls({ p, set, notify }) {
  const v = p.vacation
  return (
    <div className="vac-btns">
      <button className="btn-soft" onClick={() => set({ vacation: { ...v, paused: !v.paused } })}>{v.paused ? '▶️ Resume' : '⏸️ Pause'}</button>
      <button className="btn-soft" onClick={() => { set({ vacation: null }); notify?.('Welcome back! Your normal budget is on again.') }}>I’m back</button>
    </div>
  )
}

// The banner on Today while a vacation is on or paused
export function VacationBanner({ profile: p, updateProfile: set, today, notify, spentOver }) {
  const v = p.vacation
  if (!v?.start || today < v.start) return null
  const on = vacationOn(p, today)
  const day = vacationDay(p, today)
  const len = vacationLength(p)
  return (
    <section className={`vac-banner ${on ? '' : 'paused'}`}>
      <span className="vac-sun" aria-hidden="true">{on ? '🏖️' : '⏸️'}</span>
      <div className="vac-main">
        <b>{on ? `Vacation · day ${day}${len ? ` of ${len}` : ''}` : 'Vacation paused'}{v.together ? ' together' : ''}</b>
        <small>{on
          ? (spentOver > 0 ? `${fmt(spentOver)} over maintenance today, about ${(spentOver / KCAL_PER_KG).toFixed(2)} kg. No stress, enjoy!` : len && day >= len ? 'Last day. Make it a good one!' : !len && day >= 14 ? 'Still away? Keep going, or tap I’m back.' : 'Eating at maintenance. Enjoy every bite.')
          : 'Normal budget today. Resume whenever you like.'}</small>
      </div>
      <VacationControls p={p} set={set} notify={notify} />
    </section>
  )
}

// Your partner started a vacation together: offer to join (once per vacation)
export function JoinVacation({ profile: p, updateProfile: set, partner, today, celebrate }) {
  const [hidden, setHidden] = useState(false)
  if (hidden || p.vacation) return null
  const hit = (partner?.partners ?? []).map((id) => partner.shares?.[id]).find((s) => s?.vacation?.together && (!s.vacation.end || s.vacation.end >= today))
  if (!hit) return null
  const k = `bankcal:vac-join:${hit.vacation.start}`
  try { if (localStorage.getItem(k)) return null } catch { /* ignore */ }
  const no = () => { try { localStorage.setItem(k, '1') } catch { /* ignore */ } setHidden(true) }
  const join = () => { no(); set({ vacation: { start: today, end: hit.vacation.end, together: true, paused: false } }); celebrate?.(`Vacation together with ${hit.name}! 🏖️`) }
  return (
    <section className="vac-banner invite">
      <span className="vac-sun" aria-hidden="true">🏖️</span>
      <div className="vac-main">
        <b>{hit.name} started a vacation together</b>
        <small>{hit.vacation.end ? `Until ${prettyDate(hit.vacation.end)}. ` : ''}Join to eat at maintenance too.</small>
      </div>
      <div className="vac-btns">
        <button className="btn-primary" onClick={join}>Join</button>
        <button className="btn-soft" onClick={no}>Not now</button>
      </div>
    </section>
  )
}
