import Calendar from './Calendar'
import { MILESTONES } from '../milestones'
import { useRef, useState } from 'react'
import { useSideFit } from '../motion'
import { sumMacros, dayKey, deficitDays, earned, sleepInsights, sleepCoach, SLEEP_STRATEGIES, weightCheck, fmt, KCAL_PER_KG, fmtSleep, sleepHours, SLEEP_TARGET } from '../calc'
import { Row, mealKey } from './Today'
import BodyCard from './BodyCard'
import Progress from './Progress'
import ShareSheet from './ShareSheet'
import ReplaySheet from './ReplaySheet'
import Activity from './Activity'
import { WeeklyCard } from './DailyCards'

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
  const [open, setOpen] = useState(false) // a tapped bar opens that day's details under the chart
  const [view, setView] = useState('week')
  const [replay, setReplay] = useState(false)
  const replaySeen = replay || (() => { try { return !!localStorage.getItem('bankcal:replay-seen') } catch { return true } })()
  const recapRef = useRef(null)
  const sideRef = useRef(null)
  useSideFit(sideRef, recapRef, view)
  const sel = days.find((d) => d.key === pick)
  const logged = days.filter((d) => d.net != null)
  const top = Math.max(budget ?? 0, ...days.map((d) => d.spent), 1) * 1.1

  return (
    <>
      <div className={`side-col ${view === 'month' ? 'solo' : ''}`} ref={sideRef}>
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
      {view !== 'month' && <div id="recap" ref={recapRef}><WeeklyCard {...props} /></div>}
      </div>
      {view === 'month' ? <Calendar {...props} /> : <>

      <section className="card chart">
        <div className="bars">
          {budget != null && <div className="budget-line" style={{ bottom: `calc(26px + 174px * ${budget / top})` }}><span>Budget {fmt(budget)}</span></div>}
          {days.map((d) => (
            <button key={d.key} className={`bar ${pick === d.key ? 'on' : ''}`} onClick={() => { setOpen(pick === d.key ? !open : true); setPick(d.key) }} aria-expanded={pick === d.key && open} aria-label={`${d.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}: ${d.items.length ? `${fmt(d.spent)} kcal` : 'nothing logged'}. Tap for details.`}>
              <span className="bar-track">
                <span className={`bar-fill ${d.net != null && d.net < 0 ? 'over' : ''}`} style={{ height: `${(d.spent / top) * 100}%` }} />
              </span>
              <span className="bar-day">{d.d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</span>
            </button>
          ))}
        </div>
        <p className="chart-detail">
          <b>{sel.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b>
          {props.profile?.days?.[sel.key]?.party ? ' · 🎉 celebration day' : ''}{sel.items.length ? <> · ate {fmt(sel.spent)}{budgetFor(sel.key) != null ? ` of ${fmt(budgetFor(sel.key))}` : ''}{sel.net != null ? <> · <span className={sel.net < 0 ? 'neg' : 'pos'}>{sel.net >= 0 ? `${fmt(sel.net)} under` : `${fmt(-sel.net)} over`}</span></> : ''}</> : ' · nothing logged'}
          <small>{open ? ' Tap the bar again to close' : ' Tap a bar for that day’s details'}</small>
        </p>
        {open && <DayDetail d={sel} budget={budgetFor(sel.key)} profile={props.profile} onFull={() => document.getElementById('day-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />}
      </section>

      <DeficitCard {...props} keys={days.map((d) => d.key)} />
      <WeightCheckCard {...props} />

      <button className="card replay-card" onClick={() => { setReplay(true); try { localStorage.setItem('bankcal:replay-seen', '1') } catch { /* ignore */ } }}>
        <span className="rc-play" aria-hidden="true">▶</span>
        <span><b>Progress replay{!replaySeen && <i>New</i>}</b><small>Tap to watch your days play back, then share the video</small></span>
      </button>
      {replay && <ReplaySheet mine={mine} profile={props.profile} budgetFor={budgetFor} notify={props.notify} onClose={() => setReplay(false)} />}

      <SleepWeek days={days} log={props.profile?.days ?? {}} profile={props.profile} mine={mine} />
      <SleepCoach profile={props.profile} mine={mine} />
      </>}

      <h2 className="group-title">Progress</h2>
      <Progress {...props} />

      <Milestones badges={props.profile?.badges ?? {}} character={props.profile?.character} notify={props.notify} />

      <h2 className="group-title">Your body</h2>
      <BodyCard {...props} />

      <h2 className="group-title" id="day-list">
        {sel.key === dayKey() ? 'Today' : sel.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        {sel.net != null && <span className={sel.net < 0 ? 'neg' : 'pos'}>{sel.net >= 0 ? `${fmt(sel.net)} saved` : `${fmt(-sel.net)} over`}</span>}
      </h2>
      {sel.items.length ? (
        <ul className="card list">{sel.items.map((e) => <Row key={e.id} e={e} cats={props.profile?.foodCats} onEdit={() => props.editEntry?.(e)} />)}</ul>
      ) : (
        <div className="card empty"><p className="muted">Nothing logged on this day.</p></div>
      )}
      {sel.key < props.today && (
        <>
          <button className="add-workout past-add" onClick={() => props.addFoodOn?.(sel.key)}>+ Add food to this day <small>forgot to log something? It goes on this day</small></button>
          {/* steps, workouts and sleep for that day, same as on Today */}
          <Activity {...props} key={sel.key} today={sel.key} dayLog={props.profile.days?.[sel.key] ?? {}} earn={earned(props.profile.days?.[sel.key], props.profile.weight)}
            receipt={null} celebrate={(t) => props.notify?.(t)} fresh={null} pastDay />
        </>
      )}
    </>
  )
}

// The details of one day, opened by tapping its bar: meals, biggest foods, what was burned, sleep
function DayDetail({ d, budget, profile, onFull }) {
  const log = profile?.days?.[d.key] ?? {}
  const burn = earned(log, profile?.weight)
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((m) => ({ m, kcal: d.items.filter((e) => mealKey(e.meal) === m).reduce((a, e) => a + e.kcal, 0) })).filter((x) => x.kcal > 0)
  const most = Math.max(1, ...meals.map((x) => x.kcal))
  const biggest = [...d.items].sort((a, b) => b.kcal - a.kcal).slice(0, 3)
  const slept = sleepHours(log.sleep)
  const when = d.d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
  if (!d.items.length && !burn.total && slept == null) return <div className="day-detail"><p className="dd-note muted">Nothing was logged on {when}.</p></div>
  return (
    <div className="day-detail" role="region" aria-label={`Details for ${when}`}>
      {meals.length > 0 && (
        <div className="dd-meals">
          {meals.map((x) => (
            <div key={x.m} className="dd-meal"><span>{x.m}</span><i><em style={{ width: `${(x.kcal / most) * 100}%` }} /></i><b>{fmt(x.kcal)}</b></div>
          ))}
        </div>
      )}
      {biggest.length > 0 && <p className="dd-note"><b>Biggest:</b> {biggest.map((e) => `${e.name} (${fmt(e.kcal)})`).join(', ')}</p>}
      <div className="dd-grid">
        <div><small>Eaten</small><b>{fmt(d.spent)} kcal</b></div>
        <div><small>Budget</small><b>{log.party ? 'Free 🎉' : budget != null ? `${fmt(budget)} kcal` : '—'}</b></div>
        <div><small>Burned</small><b>{burn.total ? `+${fmt(burn.total)} kcal` : '—'}</b></div>
        <div><small>Steps</small><b>{+log.steps ? fmt(+log.steps) : '—'}</b></div>
        {profile?.macros && sumMacros(d.items).n > 0 && (() => { const m = sumMacros(d.items); return <div className="wide"><small>Protein, carbs, fat{m.n < m.of ? ` (from ${m.n} of ${m.of} foods)` : ''}</small><b>{m.p} g, {m.c} g, {m.f} g</b></div> })()}
        {(log.workouts ?? []).length > 0 && <div className="wide"><small>Workouts</small><b>{log.workouts.map((w) => w.label).filter(Boolean).join(', ') || `${log.workouts.length} logged`}</b></div>}
        {slept != null && <div className="wide"><small>Sleep the night before</small><b>{fmtSleep(slept)} · {log.sleep.bed} → {log.sleep.wake}</b></div>}
      </div>
      {d.items.length > 0 && <button className="link-btn" onClick={onFull}>See everything logged that day</button>}
    </div>
  )
}

// Suggestions from your own nights, a plan for tonight, and habits that help anyone
function SleepCoach({ profile, mine }) {
  const [more, setMore] = useState(false)
  const keys = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return dayKey(d) })
  const c = sleepCoach({ profile, entries: mine, keys })
  if (!c) return null
  const rows = [['☕', 'Last coffee or tea', c.plan.caffeine], ['🍽️', 'Finish dinner', c.plan.dinner], ['📵', 'Start winding down', c.plan.windDown], ['🌙', 'Lights out', c.plan.lightsOut], ['☀️', 'Up, and get some daylight', c.plan.wake]]
  return (
    <div className="card sleep-coach">
      <h3>Sleep better</h3>
      <p className="sc-sub">From your last {c.nights} logged nights: in bed around {c.usualBed}, up around {c.usualWake}, {fmtSleep(c.avg)} on average.</p>
      {c.tips.map((t) => <div key={t.id} className="sc-tip"><b>{t.title}</b><p>{t.text}</p></div>)}
      <h4>Tonight’s plan</h4>
      <ol className="sc-plan">
        {rows.map(([e, label, time]) => <li key={label}><span aria-hidden="true">{e}</span><span>{label}</span><b>{time}</b></li>)}
      </ol>
      <p className="fine">Worked back from when you usually get up, with {SLEEP_TARGET} hours of sleep and time to drop off.</p>
      <button className="link-btn" onClick={() => setMore(!more)} aria-expanded={more}>{more ? 'Hide the strategies' : 'More strategies that help'}</button>
      {more && (
        <>
          <ul className="sc-list">
            {SLEEP_STRATEGIES.map(([e, title, text]) => <li key={title}><span aria-hidden="true">{e}</span><div><b>{title}</b><p>{text}</p></div></li>)}
          </ul>
          <p className="fine">General guidance, not medical advice. If poor sleep goes on for weeks, or you snore heavily and wake up unrefreshed, it’s worth seeing a doctor.</p>
        </>
      )}
    </div>
  )
}

function SleepWeek({ days, log, profile, mine }) {
  const [pickS, setPickS] = useState(null)
  const ins = sleepInsights({ profile, entries: mine, keys: days.map((d) => d.key) })
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
        <div className="sw-bars" role="group" aria-label={`Sleep each night this week, average ${fmtSleep(avg)}. Tap a night for details.`}>
          <span className="sw-line" style={{ bottom: `${(SLEEP_TARGET / 10) * 100}%` }} />
          {nights.map((n) => (
            <button key={n.key} className={`sw-col ${pickS === n.key ? 'on' : ''}`} onClick={() => setPickS(pickS === n.key ? null : n.key)} aria-label={`${n.key}: ${n.h == null ? 'not logged' : fmtSleep(n.h)}`}>
              <i className={n.h == null ? 'none' : n.h >= SLEEP_TARGET ? 'ok' : 'short'} style={{ height: n.h == null ? '4%' : `${Math.min(100, (n.h / 10) * 100)}%` }} />
              <small>{n.d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</small>
            </button>
          ))}
        </div>
        {pickS && (() => {
          const n = nights.find((x) => x.key === pickS)
          const sl = log[pickS]?.sleep
          const when = n.d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          if (n.h == null) return <p className="chart-detail"><b>Night before {when}</b> · not logged<small>Add it from that day, under Progress → the day → Sleep</small></p>
          const gap = n.h - SLEEP_TARGET, vsAvg = n.h - avg
          const span = (h) => (h < 1 ? `${Math.round(h * 60)} min` : fmtSleep(h)) // "40 min", not "0 h 40 min"
          const ate = mine.filter((e) => e.day === n.key).reduce((a, e) => a + e.kcal, 0)
          const others = nights.filter((x) => x.key !== n.key && x.h != null).map((x) => mine.filter((e) => e.day === x.key).reduce((a, e) => a + e.kcal, 0)).filter((v) => v > 0)
          const usual = others.length ? others.reduce((a, v) => a + v, 0) / others.length : null
          const mins = (t) => { const [h, m] = t.split(':').map(Number); return ((h * 60 + m) - 18 * 60 + 1440) % 1440 }
          const beds = logged.filter((x) => x.key !== n.key).map((x) => mins(log[x.key].sleep.bed)).sort((a, b) => a - b)
          const typical = beds.length ? beds[Math.floor(beds.length / 2)] : null
          const off = typical == null ? 0 : Math.round((mins(sl.bed) - typical) / 5) * 5
          return (
            <div className="day-detail" role="region" aria-label={`Night before ${when}`}>
              <div className="dd-head"><b>Night before {when}</b><span className={gap > -0.25 ? 'pos' : 'neg'}>{gap >= 0 ? 'Enough sleep' : gap > -0.25 ? 'Just about enough' : `${span(-gap)} short`}</span></div>
              <div className="dd-grid">
                <div><small>In bed</small><b>{sl.bed} → {sl.wake}</b></div>
                <div><small>Slept</small><b>{fmtSleep(n.h)}</b></div>
                <div><small>Against your week</small><b>{Math.abs(vsAvg) < 0.17 ? 'About average' : `${span(Math.abs(vsAvg))} ${vsAvg > 0 ? 'more' : 'less'}`}</b></div>
                <div><small>Bedtime</small><b>{typical == null || Math.abs(off) < 15 ? 'Your usual time' : `${span(Math.abs(off) / 60)} ${off > 0 ? 'later' : 'earlier'} than usual`}</b></div>
              </div>
              {ate > 0 && <p className="dd-note">That day you ate <b>{fmt(ate)} kcal</b>{usual ? <>, {Math.abs(ate - usual) < 100 ? 'about the same as' : <><b>{fmt(Math.abs(ate - usual))} {ate > usual ? 'more' : 'less'}</b> than</>} your other days this week</> : ''}.</p>}
              <p className="dd-note muted">Tap the bar again to close.</p>
            </div>
          )
        })()}
        {ins && (
          <div className="sw-ins">
            <div><b>{ins.spread <= 60 ? 'Steady' : ins.spread <= 120 ? 'Fairly steady' : 'Up and down'}</b><small>bedtimes {ins.spread < 60 ? `within ${ins.spread} min` : `varied by ${fmtSleep(ins.spread / 60)}`}</small></div>
            <div><b>{ins.debt <= 0 ? 'None' : fmtSleep(ins.debt)}</b><small>sleep owed this week</small></div>
            {ins.effect != null && ins.effect >= 100 && <p className="sw-tip">After short nights (under 6 h) you ate about <b>{fmt(ins.effect)} kcal more</b> than after rested ones. Planning an early night is a diet tip too.</p>}
            {ins.spread > 120 && <p className="sw-tip">A steady bedtime, even on weekends, usually helps more than extra hours now and then.</p>}
          </div>
        )}
        {!pickS && <p className="fine sw-hint">Tap a night for its details.</p>}
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
  const [pickD, setPickD] = useState(null)
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
            <button key={r.key} className={`df-day ${r.deficit == null ? 'none' : r.deficit > 0 ? 'plus' : 'minus'} ${r.today ? 'today' : ''} ${pickD === r.key ? 'on' : ''}`}
              onClick={() => setPickD(pickD === r.key ? null : r.key)} aria-label={`${r.key}: ${r.deficit == null ? 'nothing logged' : `${r.deficit > 0 ? 'deficit' : 'over'} ${fmt(Math.abs(r.deficit))} kcal`}`}>
              <span className="df-up">{r.deficit > 0 && <i style={{ height: h }} />}</span>
              <span className="df-down">{r.deficit != null && r.deficit <= 0 && <i style={{ height: h }} />}</span>
              <small>{r.today ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</small>
            </button>
          )
        })}
      </div>
      {pickD && (() => {
        const r = rows.find((x) => x.key === pickD)
        const when = new Date(pickD + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        return <p className="chart-detail"><b>{when}</b>{r.deficit == null ? ' · nothing logged' : <> · used {fmt(r.used)} · ate {fmt(r.ate)} · <span className={r.deficit > 0 ? 'pos' : 'neg'}>{r.deficit > 0 ? `${fmt(r.deficit)} deficit` : `${fmt(-r.deficit)} over`}</span></>}</p>
      })()}
      <p className="df-foot">Tap a day for details. Up = burned more than you ate. {now ? 'Today counts as you go.' : ''} Days with nothing logged are left out.</p>
    </section>
  )
}

// Expected vs actual weight: is the deficit showing up on the scale?
function WeightCheckCard({ mine, profile, today, updateProfile, notify }) {
  const r = weightCheck({ profile, entries: mine, todayKey: today })
  if (!r.ready) {
    const left = r.reason === 'logging'
      ? 'Log your meals on more days in between weigh-ins so the comparison is fair.'
      : r.weighIns < 2 ? `Weigh in ${r.weighIns === 0 ? 'twice' : 'once more'}, at least 10 days apart, and this compares what your deficit predicted with what the scale shows.`
      : `Weigh in again after ${Math.max(1, (r.need.days - (r.span ?? 0)))} more day${r.need.days - (r.span ?? 0) === 1 ? '' : 's'} to compare what your deficit predicted with what the scale shows.`
    return <section className="card wcheck empty"><h3>Expected vs actual weight</h3><p>{left}</p></section>
  }
  const kg = (v) => `${v > 0 ? '−' : v < 0 ? '+' : ''}${Math.abs(v).toFixed(1)} kg`
  const top = Math.max(0.5, Math.abs(r.expected), Math.abs(r.actual))
  const d = (k) => new Date(k + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const title = { 'on-track': 'Right on track ✅', faster: 'Losing faster than expected 🚀', slower: 'A bit slower than expected' }[r.status]
  const line = {
    'on-track': 'The scale matches your logging. Your numbers are working, keep going.',
    faster: 'Great news: your body burns a little more than the formula thinks.',
    slower: 'Common causes: portions bigger than logged, untracked snacks or drinks, or water weight hiding fat loss.',
  }[r.status]
  const apply = () => {
    const next = Math.max(-500, Math.min(500, (+profile.tdeeAdjust || 0) + r.suggest))
    updateProfile({ tdeeAdjust: next, tdeeAdjustAt: today })
    notify?.(`Maintenance updated by ${r.suggest > 0 ? '+' : '−'}${fmt(Math.abs(r.suggest))} kcal a day`)
  }
  return (
    <section className={`card wcheck ${r.status}`}>
      <p className="df-label">Expected vs actual · {d(r.from)} – {d(r.to)} ({r.span} days)</p>
      <h3>{title}</h3>
      <div className="wc-bars">
        {[['Expected', r.expected, 'from your deficit'], ['Actual', r.actual, '7-day average on the scale']].map(([l, v, sub]) => (
          <div className="wc-bar" key={l}>
            <span className="wc-l"><b>{l}</b><small>{sub}</small></span>
            <span className="wc-track"><i className={v < 0 ? 'up' : ''} style={{ width: `${Math.min(100, (Math.abs(v) / top) * 100)}%` }} /></span>
            <b className="wc-v">{kg(v)}</b>
          </div>
        ))}
      </div>
      <p className="df-line">{line}</p>
      {r.suggest !== 0 && (
        <div className="wc-fix">
          <p>Your real maintenance looks about <b>{fmt(Math.abs(r.suggest))} kcal a day {r.suggest > 0 ? 'higher' : 'lower'}</b> than the formula. Adjust your budget to match?</p>
          <button className="btn-primary" onClick={apply}>Use my real number ({r.suggest > 0 ? '+' : '−'}{fmt(Math.abs(r.suggest))} kcal)</button>
        </div>
      )}
      {r.suggest === 0 && +profile.tdeeAdjust ? <p className="df-foot">Your maintenance includes a personal correction of {+profile.tdeeAdjust > 0 ? '+' : '−'}{fmt(Math.abs(+profile.tdeeAdjust))} kcal. <button className="link-btn" onClick={() => { updateProfile({ tdeeAdjust: 0, tdeeAdjustAt: today }); notify?.('Back to the standard formula') }}>Undo</button></p> : null}
      {r.coverage < 0.9 && <p className="df-foot">Meals logged on {Math.round(r.coverage * 100)}% of these days; the rest are assumed average.</p>}
    </section>
  )
}
