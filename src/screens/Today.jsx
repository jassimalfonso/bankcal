import { useMemo, useState } from 'react'
import { VacationBanner, JoinVacation } from './Breaks'
import { useCountUp, useSwipe } from '../motion'
import { breakdown, fmt, KCAL_PER_KG, mealFor, usualFor } from '../calc'
import { foodEmoji } from '../foodCats'
import Character, { moodFor } from '../Character'
import { missingFor } from '../calc'
import { SECTION_ICONS, SECTION_NAMES, fullLayout } from '../layout'
import CardStack from './CardStack'
import { HabitsCard, JournalCard } from './Habits'
import { WeeklyCard } from './DailyCards'
import { PartnerCard } from './Partner'
import { WeighCard } from './WeighIn'
import { weekTicks } from '../habits'
import Activity from './Activity'
import { WordsCard } from './DailyCards'

function message(name, budget, spent) {
  if (budget == null) return `${name} is asleep until you set a daily budget.`
  const left = budget - spent
  if (left < 0) return `${name} went ${fmt(-left)} kcal over. Tomorrow is a fresh start.`
  if (spent === 0) return `Full tank. ${name} is ready for the day.`
  if (left / budget < 0.15) return `Nearly empty. Pick something light next.`
  return `${name} is feeling light. Keep it going.`
}

export function Ring({ value, size = 220, stroke = 20, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        {value > 0 && <circle
          cx={size / 2} cy={size / 2} r={r} className="ring-bar" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />}
      </svg>
      <div className="ring-inner">{children}</div>
    </div>
  )
}

export default function Today(props) {
  const { profile, mine, todays, budget, base, earn, addEntry, removeEntry, goSetup, words, streakDays, closeDay, openWords, windDown, notify } = props
  // Weekly check-in appears on Sundays until hidden
  const weekKey = `bankcal:week:${props.today}`
  const [weekHidden, setWeekHidden] = useState(() => { try { return !!localStorage.getItem(weekKey) } catch { return false } })
  const showWeek = new Date(props.today + 'T12:00').getDay() === 0 && !weekHidden
  const hideWeek = () => { try { localStorage.setItem(weekKey, '1') } catch { /* ignore */ } setWeekHidden(true) }
  const [arranging, setArranging] = useState(false)
  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  const left = budget != null ? budget - spent : null
  const over = left != null && left < 0
  const mood = moodFor(budget, spent)
  const shownLeft = useCountUp(left != null ? Math.abs(left) : null)
  const shownSpent = useCountUp(spent)
  const shownEarn = useCountUp(earn.total)
  const date = (() => { const [y, m, d] = props.today.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) })()

  const recent = useMemo(() => {
    const seen = new Set()
    return mine.filter((e) => {
      const k = e.name.trim().toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }).slice(0, 6)
  }, [mine])

  function quickAdd(r) {
    const id = addEntry({ name: r.name, kcal: r.kcal, meal: r.meal, photo: r.photo })
    navigator.vibrate?.(10)
    notify(`Spent ${fmt(r.kcal)} kcal on ${r.name}`, () => removeEntry(id))
  }

  return (
    <>
      <header className="large-title">
        <div>
          <p className="date">{date}{streakDays > 0 && <span className="streak-chip">🔥 {streakDays}</span>}{props.sInfo?.shields > 0 && <span className="streak-chip shield" title="Streak shields">🧊 {props.sInfo.shields}</span>}</p>
          <h1>{(() => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 22 ? 'Good evening' : 'Hi' })()}, {profile.name}</h1>
        </div>
        <button className="char-btn" onClick={goSetup} aria-label="Settings">
          <Character kind={profile.character} mood={mood} size={44} acc={profile.accessory} />
        </button>
      </header>

      <ShieldNote {...props} />
      <VacationBanner {...props} spentOver={(() => { const b = breakdown(profile); return b ? Math.round(spent - b.tdee - earn.total) : 0 })()} />
      <JoinVacation {...props} />
      <section className={`card hero ${over ? 'is-over' : ''}`}>
        <Ring value={budget ? (over ? 1 : left / budget) : 0}>
          <span className="munch" key={todays.length}><Character kind={profile.character} mood={mood} size={112} className="bob" acc={profile.accessory} /></span>
        </Ring>

        {budget == null ? (
          <div className="hero-setup">
            <p className="hero-msg">{(() => {
              const m = missingFor(profile)
              if (!m.length) return message(profile.name, budget, spent)
              const list = m.length > 1 ? `${m.slice(0, -1).join(', ')} and ${m.at(-1)}` : m[0]
              return `${profile.name} is asleep. Add ${list} so BankCal can work out your daily budget.`
            })()}</p>
            <button className="btn-primary" onClick={() => goSetup('about')}>{missingFor(profile).length ? `Add ${missingFor(profile)[0].replace('your ', '')}` : 'Set my budget'}</button>
          </div>
        ) : (
          <>
            <div className="hero-num" key={left} data-bump="1">
              <b>{fmt(shownLeft ?? 0)}</b>
              <span>{over ? 'kcal over' : 'kcal left'}</span>
            </div>
            <p className="hero-msg">{message(profile.name, budget, spent)}</p>
            {props.focus && <button className="focus-chip" onClick={() => props.focus.go === 'train' ? props.goTab('train') : props.focus.go === 'habits' ? goSetup('habits') : null}><span>One thing today</span>{props.focus.emoji} {props.focus.text}</button>}
            {(windDown || location.search.includes('evening')) && todays.length > 0 && <button className="btn-soft close-day" onClick={closeDay}>Close my day</button>}
            <div className="hero-stats three">
              <div><b>{fmt(shownSpent)}</b><span>Eaten</span></div>
              <div><b className="pos">+{fmt(shownEarn)}</b><span>Burned</span></div>
              <div><b>{fmt(budget)}</b><span>Budget</span></div>
            </div>
            <p className="hero-break">{earn.total > 0
              ? <>Today’s budget: <b>{fmt(base)}</b> base <span className="pos">+ <b>{fmt(earn.total)}</b> burned</span>{earn.work > 0 && earn.steps + earn.tread > 0 ? ` (workouts ${fmt(earn.work)}, steps and walking ${fmt(earn.steps + earn.tread)})` : earn.work > 0 ? ' from workouts' : ' from steps and walking'}</>
              : <>Today’s budget: <b>{fmt(base)}</b> base. Tick a workout or log steps to add burned calories.</>}</p>
            {todays.length > 0 && (() => {
              // today's real deficit: what your body used (maintenance + deposits) minus what you ate
              const b = breakdown(profile)
              if (!b) return null
              const d = Math.round(b.tdee + earn.total - spent)
              return (
                <p className={`hero-deficit ${d > 0 ? 'good' : 'over'}`}>
                  {d > 0
                    ? <>🔥 Deficit so far: <b>{fmt(d)} kcal</b> · about <b>{(d / KCAL_PER_KG).toFixed(2)} kg</b> of fat</>
                    : <>Above maintenance by <b>{fmt(-d)} kcal</b> so far</>}
                </p>
              )
            })()}
          </>
        )}
      </section>


      {showWeek && <WeeklyCard {...props} onClose={hideWeek} />}
      <CardStack order={fullLayout(profile.layout2)} names={SECTION_NAMES} icons={SECTION_ICONS} arranging={arranging} setArranging={setArranging}
        onChange={(layout2) => props.updateProfile({ layout2 })} render={(id) => {
        if (id === 'words') return <WordsCard key="words" words={words} profile={profile} updateProfile={props.updateProfile} notify={props.notify} onReplay={openWords} />
        if (id === 'weigh') return budget != null ? <WeighCard key="weigh" {...props} /> : null
        if (id === 'habits') return <HabitsCard key="habits" {...props} />
        if (id === 'partner') return props.partner ? <PartnerCard key="partner" partner={props.partner} today={props.today} notify={notify} profile={profile} myTicks={weekTicks(profile, props.today)} streakDays={props.streakDays} /> : null
        if (id === 'journal') return <JournalCard key="journal" {...props} />
        if (id === 'deposits') return budget != null ? <section key="deposits" className="block"><Activity {...props} /></section> : null
        if (id === 'eat') return recent.length > 0 ? (
          <section key="eat" className="block">
            <h2 className="group-title">Eat again</h2>
            <div className="quick">
              {recent.map((r) => (
                <button key={r.id} className="quick-chip" onClick={() => quickAdd(r)}>
                  {r.photo ? <img src={r.photo} alt="" /> : <span className="q-dot">+</span>}
                  <span className="q-name">{r.name}</span>
                  <span className="q-kcal">{fmt(r.kcal)}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null
        if (id === 'meals') return (
          <section key="meals" className="block">
            <h2 className="group-title">Meals</h2>
            <UsualCard {...props} />
            {todays.length === 0 ? (
              <div className="card empty">
                <p>No meals yet today.</p>
                <p className="muted">Tap the + button before you eat.</p>
              </div>
            ) : (
              <ul className="card list">
                {todays.map((e) => <Row key={e.id} e={e} cats={profile?.foodCats} fresh={props.fresh === e.id} onEdit={() => props.editEntry?.(e)} onDelete={() => { removeEntry(e.id); notify(`Removed ${e.name}`, () => addEntry({ name: e.name, kcal: e.kcal, meal: e.meal, photo: e.photo })) }} />)}
              </ul>
            )}
          </section>
        )
        return null
      }} />
      {!arranging && <p className="arrange-tip">Hold a card’s title (⠿) and drag it to move it. <button className="arrange-link" onClick={() => setArranging(true)}>Or arrange as a list</button></p>}

    </>
  )
}

export function Row({ e, onDelete, onEdit, fresh, cats }) {
  const [open, setOpen] = useState(false)
  const { dx, setDx, handlers } = useSwipe(() => onDelete?.())
  const time = new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const shift = onDelete ? (dx || (open ? -84 : 0)) : 0
  return (
    <li className={`row-wrap ${fresh ? 'fresh' : ''}`}>
      {onDelete && <button className="row-del-bg" onClick={() => onDelete()} aria-label={`Remove ${e.name}`}>Remove</button>}
      <div
        className="row"
        style={{ transform: `translateX(${shift}px)`, transition: dx ? 'none' : undefined }}
        onClick={() => { if (open || dx) { setDx(0); setOpen(false); return } if (onEdit) onEdit(); else if (onDelete) setOpen(true) }}
        role={onEdit ? 'button' : undefined} aria-label={onEdit ? `Edit ${e.name}` : undefined}
        {...(onDelete ? handlers : {})}
      >
        {e.photo ? <img className="row-img" src={e.photo} alt="" /> : <span className="row-img ph emo" aria-hidden="true">{foodEmoji(e, cats)}</span>}
        <div className="row-text">
          <b>{e.name}</b>
          <small>{e.meal} at {time}</small>
        </div>
        <span className="row-kcal">{fmt(e.kcal)}<small> kcal</small></span>
      </div>
    </li>
  )
}

// "Your usual": the food you log most at this time of day, one tap to add
function UsualCard({ mine, todays, today, logFood, profile }) {
  const [gone, setGone] = useState(null)
  const meal = mealFor()
  const u = usualFor(mine, meal, today, todays)
  if (!u || !logFood || gone === u.name) return null
  return (
    <div className="card usual-card">
      <span className="uc-e" aria-hidden="true">{foodEmoji(u, profile?.foodCats)}</span>
      <span className="uc-t"><b>{u.name}</b><small>Your usual {meal.toLowerCase()} · {fmt(u.kcal)} kcal</small></span>
      <button className="uc-add" onClick={() => { logFood({ name: u.name, kcal: u.kcal, meal, ...(u.cat ? { cat: u.cat } : {}) }); setGone(u.name) }} aria-label={`Add ${u.name}, ${fmt(u.kcal)} kcal`}>+ Add</button>
    </div>
  )
}

// A shield just saved the streak: say so once, gently
function ShieldNote({ sInfo, today }) {
  const day = sInfo?.covered?.at(-1)
  const k = `bankcal:shield-seen:${day}`
  const [hide, setHide] = useState(() => { try { return !!localStorage.getItem(k) } catch { return false } })
  if (!day || hide) return null
  const close = () => { try { localStorage.setItem(k, '1') } catch { /* ignore */ } setHide(true) }
  const when = (() => { const d = Math.round((new Date(today + 'T12:00') - new Date(day + 'T12:00')) / 864e5); return d === 1 ? 'yesterday' : new Date(day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' }) })()
  return (
    <button className="card shield-note" onClick={close}>
      <span aria-hidden="true">🧊</span>
      <span><b>Your shield covered {when}</b><small>Streak safe at {sInfo.days} days. Earn a shield every 7 days on budget. Tap to hide.</small></span>
    </button>
  )
}
