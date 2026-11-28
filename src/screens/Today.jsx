import { useMemo, useRef, useState } from 'react'
import { VacationBanner, JoinVacation } from './Breaks'
import { createPortal } from 'react-dom'
import { useCountUp, useSwipe, useSideFit, useEscape, useSheetDrag } from '../motion'
import { IconClose } from '../icons'
import { useHold, HoldConfirm } from '../Hold'
import { firstTime } from '../keyboard'
import { breakdown, dayKey, fmt, KCAL_PER_KG, macrosOf, mealFor, sumMacros, usualFor } from '../calc'
import { CATS, catOf, foodEmoji } from '../foodCats'
import Character, { moodFor } from '../Character'
import { missingFor } from '../calc'
import { SECTION_ICONS, SECTION_NAMES, fullLayout } from '../layout'
import CardStack from './CardStack'
import { HabitsCard, JournalCard } from './Habits'
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

// any spelling of a meal lands in the right group; unknown counts as a snack
export const mealKey = (m) => { const k = String(m || '').toLowerCase(); return k.startsWith('break') ? 'Breakfast' : k.startsWith('lunch') ? 'Lunch' : k.startsWith('din') || k.startsWith('sup') ? 'Dinner' : 'Snack' }
// how Meals is shown: grouped by meal, by food type, or one list (remembered on this phone)
function useMealView() {
  const [v, setV] = useState(() => { try { return localStorage.getItem('bankcal:meal-view') || 'meal' } catch { return 'meal' } })
  return [v, (x) => { setV(x); try { localStorage.setItem('bankcal:meal-view', x) } catch { /* ignore */ } }]
}
function MealView({ value, onChange }) {
  return (
    <span className="meal-view" role="group" aria-label="Group meals">
      {[['meal', 'By meal'], ['type', 'By type'], ['all', 'All']].map(([k, l]) => <button key={k} className={value === k ? 'on' : ''} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}
    </span>
  )
}

export default function Today(props) {
  const heroRef = useRef(null)
  const sideRef = useRef(null)
  useSideFit(sideRef, heroRef)
  const [mealView, setMealView] = useMealView()
  const { profile, mine, todays, budget, base, earn, addEntry, removeEntry, goSetup, words, streakDays, closeDay, openWords, windDown, notify } = props
  // Weekly check-in appears on Sundays until hidden
  const weekKey = `bankcal:week:${props.today}`
  const [weekHidden, setWeekHidden] = useState(() => { try { return !!localStorage.getItem(weekKey) } catch { return false } })
  const showWeek = new Date(props.today + 'T12:00').getDay() === 0 && !weekHidden
  const hideWeek = () => { try { localStorage.setItem(weekKey, '1') } catch { /* ignore */ } setWeekHidden(true) }
  const [arranging, setArranging] = useState(false)
  // hold a food for a small menu; swipe it right to log it again
  const [menu, setMenu] = useState(null)
  const [rowTip, setRowTip] = useState(() => { try { return !localStorage.getItem('bankcal:hint:row-gestures') } catch { return false } })
  const usedRowTip = () => { if (rowTip) { firstTime('row-gestures'); setRowTip(false) } }
  const again = (e) => {
    const one = oneServing(e)
    props.logFood?.({ name: one.name, kcal: one.kcal, ...macrosOf(one), meal: mealFor(), ...(e.cat ? { cat: e.cat } : {}), ...(e.serving ? { serving: e.serving } : {}) })
  }
  const spent = todays.reduce((a, e) => a + e.kcal, 0)
  const left = budget != null ? budget - spent : null
  const party = !!props.party
  const over = !party && left != null && left < 0
  const mood = party ? 'happy' : moodFor(budget, spent)
  const shownLeft = useCountUp(party ? spent : left != null ? Math.abs(left) : null)
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
      <div className="side-col" ref={sideRef}>
      <header className="large-title">
        <div>
          <p className="date">{date}{streakDays > 0 && <span className="streak-chip">🔥 {streakDays}</span>}</p>
          <h1>{(() => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 ? 'Good evening' : 'Hi' })()}, {profile.name}</h1>
        </div>
        <button className="char-btn" onClick={goSetup} aria-label="Settings">
          <Character kind={profile.character} mood={mood} size={44} acc={profile.accessory} />
        </button>
      </header>

      <ShieldNote {...props} />
      <VacationBanner {...props} spentOver={(() => { const b = breakdown(profile); return b ? Math.round(spent - b.tdee - earn.total) : 0 })()} />
      <JoinVacation {...props} />
      {party && (
        <section className="vac-banner party">
          <span className="vac-sun" aria-hidden="true">🎉</span>
          <div className="vac-main">
            <b>Celebration day</b>
            <small>No budget today. Log what you eat if you like, nothing counts as over. Your usual budget is back tomorrow.</small>
          </div>
          <div className="vac-btns"><button className="btn-soft" onClick={() => props.setParty(false)}>End celebration</button></div>
        </section>
      )}
      <section ref={heroRef} className={`card hero ${over ? 'is-over' : ''}`}>
        <Ring value={party ? 1 : budget ? (over ? 1 : left / budget) : 0}>
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
              <span>{party ? 'kcal enjoyed' : over ? 'kcal over' : 'kcal left'}</span>
            </div>
            <p className="hero-msg">{party ? `${profile.name} is celebrating with you. Enjoy every bite.` : message(profile.name, budget, spent)}</p>
            {props.focus && <button className="focus-chip" onClick={() => props.focus.go === 'train' ? props.goTab('train') : props.focus.go === 'habits' ? goSetup('habits') : null}><span>One thing today</span>{props.focus.emoji} {props.focus.text}</button>}
            {todays.length > 0 && (props.closed
              ? <p className="day-closed">🌙 Day closed <button className="link-btn" onClick={props.reopenDay}>Reopen</button></p>
              : <HoldConfirm className={`${windDown ? 'btn-soft' : 'link-btn'} close-day`} onConfirm={closeDay} onTap={() => notify('Keep holding the button to close your day')} aria-label="Close my day. Press and hold.">🌙 Hold to close my day</HoldConfirm>)}
            <div className="hero-stats three">
              <div><b>{fmt(shownSpent)}</b><span>Eaten</span></div>
              <div><b className="pos">+{fmt(shownEarn)}</b><span>Burned</span></div>
              <div><b>{party ? 'Free' : fmt(budget)}</b><span>Budget</span></div>
            </div>
            {profile.macros && todays.length > 0 && (() => {
              const m = sumMacros(todays)
              if (!m.n) return <p className="hero-macros none">No macros on today’s foods yet. Look a food up, or type them when you log.</p>
              return (
                <p className="hero-macros" aria-label={`Macros today: protein ${m.p} grams, carbs ${m.c} grams, fat ${m.f} grams`}>
                  <span><b>{fmt(m.p)} g</b> protein</span><span><b>{fmt(m.c)} g</b> carbs</span><span><b>{fmt(m.f)} g</b> fat</span>
                  {m.n < m.of && <small>from {m.n} of {m.of} foods</small>}
                </p>
              )
            })()}
            {party ? <p className="hero-break">Celebration day: no budget, and your streak is safe.</p> : <p className="hero-break">{earn.total > 0
              ? <>Today’s budget: <b>{fmt(base)}</b> base <span className="pos">+ <b>{fmt(earn.total)}</b> burned</span>{earn.work > 0 && earn.steps + earn.tread > 0 ? ` (workouts ${fmt(earn.work)}, steps and walking ${fmt(earn.steps + earn.tread)})` : earn.work > 0 ? ' from workouts' : ' from steps and walking'}</>
              : <>Today’s budget: <b>{fmt(base)}</b> base. Tick a workout or log steps to add burned calories.</>}</p>}
            {!party && !props.closed && left != null && left / budget < 0.15 && <button className="link-btn party-link" onClick={() => props.setParty(true)}>🎉 Special occasion? Make today a celebration</button>}
            {!party && todays.length > 0 && (() => {
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
      </div>


      {showWeek && (
        <button className="card recap-teaser" onClick={() => { hideWeek(); props.goTab('week'); setTimeout(() => document.getElementById('recap')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350) }}>
          <span aria-hidden="true">🗓️</span><span><b>Your week recap is ready</b><small>See how it went, in Progress</small></span><span className="rt-go" aria-hidden="true">›</span>
        </button>
      )}
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
            <h2 className="group-title">Meals{todays.length > 1 && <MealView value={mealView} onChange={setMealView} />}</h2>
            <MealShortcut {...props} />
            {todays.length === 0 ? (
              <div className="card empty">
                <p>No meals yet today.</p>
                <p className="muted">Tap the + button before you eat.</p>
              </div>
            ) : (
              (() => {
                const row = (e) => <Row key={e.id} e={e} cats={profile?.foodCats} fresh={props.fresh === e.id} onEdit={() => props.editEntry?.(e)} onAgain={props.logFood ? () => { again(e); usedRowTip() } : undefined} onHold={() => { setMenu(e); usedRowTip() }} onDelete={() => { removeEntry(e.id); notify(`Removed ${e.name}`, () => addEntry({ name: e.name, kcal: e.kcal, meal: e.meal, photo: e.photo, cat: e.cat })) }} />
                if (mealView === 'all' || todays.length < 2) return <ul className="card list">{todays.map(row)}</ul>
                // grouped: by meal (Breakfast, Lunch…) or by food type (Meals, Drinks…)
                const groups = mealView === 'meal'
                  ? ['Breakfast', 'Lunch', 'Snack', 'Dinner'].map((m) => ({ key: m, label: m, e: { Breakfast: '🌅', Lunch: '☀️', Snack: '🍪', Dinner: '🌙' }[m], items: todays.filter((x) => mealKey(x.meal) === m) }))
                  : CATS.map((c) => ({ key: c.id, label: c.label, e: c.e, items: todays.filter((x) => catOf(x, profile?.foodCats) === c.id) }))
                return groups.filter((g) => g.items.length).map((g) => (
                  <div key={g.key} className="meal-group">
                    <p className="mg-head"><span>{g.e} {g.label}</span><small>{fmt(g.items.reduce((a, x) => a + x.kcal, 0))} kcal</small></p>
                    <ul className="card list">{g.items.map(row)}</ul>
                  </div>
                ))
              })()
            )}
            {rowTip && todays.length > 0 && <p className="fine row-tip">Hold a food for more options. Swipe it right to log it again.</p>}
          </section>
        )
        return null
      }} />
      {menu && <RowMenu e={todays.find((x) => x.id === menu.id) ?? menu} onClose={() => setMenu(null)}
        onAgain={props.logFood ? () => { again(menu); setMenu(null) } : null}
        onEdit={() => { setMenu(null); props.editEntry?.(menu) }}
        onMeal={(m) => { const was = menu.meal; props.updateEntry?.(menu.id, { meal: m }); notify(`Moved ${menu.name} to ${m}`, () => props.updateEntry?.(menu.id, { meal: was })); setMenu(null) }}
        onRemove={() => { const e = menu; removeEntry(e.id); notify(`Removed ${e.name}`, () => addEntry({ name: e.name, kcal: e.kcal, meal: e.meal, photo: e.photo, cat: e.cat, serving: e.serving, ...macrosOf(e) })); setMenu(null) }} />}
      {!arranging && <p className="arrange-tip">Hold a card’s title (⠿) and drag it to move it. <button className="arrange-link" onClick={() => setArranging(true)}>Or arrange as a list</button></p>}

    </>
  )
}

// "Kiwi ×2, 90 kcal" → one Kiwi, 45 kcal
export function oneServing(e) {
  const m = String(e.name).match(/\s×(1½|½|\d+)$/)
  const q = m ? ({ '½': 0.5, '1½': 1.5 }[m[1]] ?? +m[1]) : 1
  return { name: m ? e.name.slice(0, m.index) : e.name, kcal: Math.round(e.kcal / (q || 1)), ...macrosOf(e, 1 / (q || 1)) }
}

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
// The small menu you get by holding a food
function RowMenu({ e, onClose, onAgain, onEdit, onMeal, onRemove }) {
  useEscape(onClose)
  const drag = useSheetDrag(onClose)
  return createPortal(
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet row-menu" style={drag.style} onClick={(ev) => ev.stopPropagation()} role="dialog" aria-label={`${e.name} options`}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div><p className="muted">{fmt(e.kcal)} kcal{e.serving ? ` · ${e.serving}` : ''}</p><h2>{e.name}</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <div className="rm-list">
          {onAgain && <button onClick={onAgain}><span>➕</span>Log it again</button>}
          <button onClick={onEdit}><span>✏️</span>Edit name, kcal or portion</button>
        </div>
        <p className="rm-label">Move to</p>
        <div className="rm-meals" role="radiogroup" aria-label="Meal">
          {MEALS.map((m) => <button key={m} role="radio" aria-checked={e.meal === m} className={`chip ${e.meal === m ? 'on' : ''}`} onClick={() => (e.meal === m ? onClose() : onMeal(m))}>{m}</button>)}
        </div>
        <button className="remove-entry" onClick={onRemove}>Remove this food</button>
      </div>
    </div>
  , document.body)
}

export function Row({ e, onDelete, onEdit, onAgain, onHold, fresh, cats }) {
  const [open, setOpen] = useState(false)
  const { dx, setDx, handlers } = useSwipe(() => onDelete?.(), onAgain)
  const hold = useHold(onHold)
  const time = new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const shift = onDelete ? (dx || (open ? -84 : 0)) : 0
  return (
    <li className={`row-wrap ${fresh ? 'fresh' : ''}`}>
      {onDelete && dx <= 0 && <button className="row-del-bg" onClick={() => onDelete()} aria-label={`Remove ${e.name}`}>Remove</button>}
      {onAgain && dx > 0 && <span className={`row-again-bg ${dx > 84 ? 'go' : ''}`} aria-hidden="true">＋ Again</span>}
      <div
        className={`row ${onHold ? 'holdable' : ''}`}
        style={{ transform: `translateX(${shift}px)`, transition: dx ? 'none' : undefined }}
        onClick={() => { if (open || dx) { setDx(0); setOpen(false); return } if (onEdit) onEdit(); else if (onDelete) setOpen(true) }}
        role={onEdit ? 'button' : undefined} aria-label={onEdit ? `Edit ${e.name}` : undefined}
        {...(onDelete ? handlers : {})}
        {...hold}
      >
        {e.photo ? <img className="row-img" src={e.photo} alt="" /> : <span className="row-img ph emo" aria-hidden="true">{foodEmoji(e, cats)}</span>}
        <div className="row-text">
          <b>{e.name}</b>
          <small>{e.serving ? `${e.serving} · ` : ''}{e.meal} at {time}</small>
        </div>
        <span className="row-kcal">{fmt(e.kcal)}<small> kcal</small></span>
      </div>
    </li>
  )
}

// "Your usual": the food you log most at this time of day, one tap to add
// One quiet shortcut above Meals for the meal it's time for: repeat what you had for it yesterday
// (when that was more than one thing), otherwise your usual.
function MealShortcut(props) {
  const { mine, todays, today, addEntry, removeEntry, notify } = props
  const [done, setDone] = useState('')
  const meal = mealFor()
  const yKey = dayKey(new Date(new Date(today + 'T12:00').getTime() - 864e5))
  const had = (mine ?? []).filter((e) => e.day === yKey && mealKey(e.meal) === mealKey(meal))
  const nothingYet = !todays.some((e) => mealKey(e.meal) === mealKey(meal))
  if (had.length < 2 || !nothingYet || !addEntry || done === yKey + meal) return <UsualCard {...props} />
  const total = had.reduce((a, e) => a + e.kcal, 0)
  const names = had.map((e) => e.name).join(', ')
  const add = () => {
    const ids = had.map((e) => addEntry({ name: e.name, kcal: e.kcal, meal, ...(e.cat ? { cat: e.cat } : {}), ...(e.serving ? { serving: e.serving } : {}), ...(e.full > 0 ? { full: e.full } : {}), ...macrosOf(e) }))
    setDone(yKey + meal)
    notify?.(`Added yesterday’s ${meal.toLowerCase()} · ${fmt(total)} kcal`, () => { ids.forEach((id) => removeEntry(id)); setDone('') })
  }
  return (
    <div className="card usual-card">
      <span className="uc-e" aria-hidden="true">↺</span>
      <span className="uc-t"><b>Same as yesterday?</b><small>{names} · {fmt(total)} kcal</small></span>
      <button className="uc-add" onClick={add} aria-label={`Add yesterday’s ${meal.toLowerCase()}: ${names}, ${fmt(total)} kcal`}>+ Add</button>
    </div>
  )
}

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

// An off day was let go: say so once, gently
function ShieldNote({ sInfo, today }) {
  const day = sInfo?.covered?.at(-1)
  const k = `bankcal:shield-seen:${day}`
  const [hide, setHide] = useState(() => { try { return !!localStorage.getItem(k) } catch { return false } })
  if (!day || hide) return null
  const close = () => { try { localStorage.setItem(k, '1') } catch { /* ignore */ } setHide(true) }
  const when = (() => { const d = Math.round((new Date(today + 'T12:00') - new Date(day + 'T12:00')) / 864e5); return d === 1 ? 'yesterday' : new Date(day + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' }) })()
  return (
    <button className="card shield-note" onClick={close}>
      <span aria-hidden="true">🌿</span>
      <span><b>{when[0].toUpperCase() + when.slice(1)} was a rest day</b><small>No worries, your streak carries on at {sInfo.days} days. Tap to hide.</small></span>
    </button>
  )
}
