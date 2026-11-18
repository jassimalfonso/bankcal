// Budget maths — Mifflin-St Jeor BMR × activity factor − goal deficit.

export const ACTIVITY = [
  { id: 'sedentary', label: 'Desk job', hint: 'Little to no exercise', f: 1.2 },
  { id: 'light', label: 'Light', hint: '1–3 workouts a week', f: 1.375 },
  { id: 'moderate', label: 'Moderate', hint: '3–5 workouts a week', f: 1.55 },
  { id: 'active', label: 'Active', hint: '6–7 workouts a week', f: 1.725 },
]

export const GOALS = [
  { id: 'maintain', label: 'Maintain', hint: 'Stay where I am', perDay: 0 },
  { id: 'lose025', label: 'Lose 0.25 kg/wk', hint: 'Gentle, easy to keep', perDay: 275 },
  { id: 'lose05', label: 'Lose 0.5 kg/wk', hint: 'Steady, needs discipline', perDay: 550 },
]

export const KCAL_PER_KG = 7700
const FLOOR = { m: 1500, f: 1200 } // never budget below a safe minimum

// Age from birthday (YYYY-MM-DD); falls back to a typed age from older versions.
export function ageOf(p, now = new Date()) {
  if (p?.birthDate) {
    const [y, m, d] = p.birthDate.split('-').map(Number)
    let a = now.getFullYear() - y
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--
    return a > 0 && a < 120 ? a : null
  }
  return +p?.age > 0 ? +p.age : null
}

export function isBirthday(p, key) {
  if (!p?.birthDate) return false
  return p.birthDate.slice(5) === key.slice(5)
}

// What's still needed before a budget can be worked out
export function missingFor(p) {
  const m = []
  if (!(ageOf(p) > 0)) m.push('your birthday')
  if (!(+p?.height > 0)) m.push('your height')
  if (!(+p?.weight > 0)) m.push('your weight')
  return m
}

export function bmr({ sex, weight, height, ...p }) {
  const base = 10 * +weight + 6.25 * +height - 5 * (ageOf(p) ?? 0)
  return sex === 'm' ? base + 5 : base - 161
}

// p.weight is the latest weight; a target-weight plan (if set) replaces the simple goal.
export function breakdown(p) {
  if (!(p.weight > 0 && p.height > 0 && ageOf(p) > 0)) return null
  const b = bmr(p)
  // One base for everyone: daily life without exercise (×1.2). Exercise is added only when it's logged,
  // so it's never counted twice and rest days and active days get different budgets.
  const act = ACTIVITY[0]
  const goal = GOALS.find((g) => g.id === p.goal) ?? GOALS[0]
  const pl = plan(p, p.weight)
  // an active plan sets the deficit; reached = maintain; not started or past its date = simple goal
  const deficit = pl?.active ? pl.deficit : pl?.reached ? 0 : goal.perDay
  const tdee = b * act.f
  const floor = FLOOR[p.sex] ?? 1200
  const auto = Math.max(floor, Math.round((tdee - deficit) / 10) * 10)
  return { bmr: Math.round(b), tdee: Math.round(tdee), deficit, floor, auto, plan: pl }
}

// Base budget for the day (before activity deposits).
export function dailyBudget(p) {
  if (p.customBudget > 0) return +p.customBudget
  return breakdown(p)?.auto ?? null
}

export const fmt = (n) => Math.round(n).toLocaleString('en-US')

export function dayKey(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export function mealFor(date = new Date()) {
  const h = date.getHours()
  if (h < 11) return 'Breakfast'
  if (h < 15) return 'Lunch'
  if (h < 18) return 'Snack'
  return 'Dinner'
}

// ───────── Activity "deposits" ─────────
// Walking/running MET by speed (km/h), from the Compendium of Physical Activities.
const MET = [[3.2, 2.8], [4.0, 3.0], [4.8, 3.5], [5.6, 4.3], [6.4, 5.0], [7.2, 7.0], [8.0, 8.3], [9.7, 9.8], [11.3, 11.0], [12.9, 11.8]]
export function metFor(kmh) {
  if (!(kmh > 0)) return 0
  if (kmh <= MET[0][0]) return MET[0][1]
  for (let i = 1; i < MET.length; i++) {
    const [s1, m1] = MET[i - 1], [s2, m2] = MET[i]
    if (kmh <= s2) return m1 + ((kmh - s1) / (s2 - s1)) * (m2 - m1)
  }
  return MET[MET.length - 1][1]
}
export const BASE_STEPS = 3000 // everyday steps already counted in a desk-job budget

// Calories earned today from steps (above the everyday baseline) and treadmill time.
export function earned(day, weightKg) {
  const w = +weightKg || 70
  const steps = Math.max(0, (+day?.steps || 0) - BASE_STEPS)
  // net walking cost ≈ 2.5 MET × 3.5 ml/kg/min ÷ 200 ≈ 0.044 kcal/kg per minute, ~100 steps a minute
  const stepKcal = steps * 0.00044 * w
  const tm = +day?.treadMin || 0
  const treadKcal = tm > 0 ? Math.max(0, metFor(+day?.treadSpeed || 5) - 1) * w * (tm / 60) : 0
  const workKcal = (day?.workouts ?? []).reduce((a, x) => a + workoutKcal(x, w), 0)
  return { steps: Math.round(stepKcal), tread: Math.round(treadKcal), work: Math.round(workKcal), total: Math.round(stepKcal + treadKcal + workKcal) }
}

// ───────── Weight plan (target weight between two dates) ─────────
const DAY = 86400000
const SAFE_MAX_DEFICIT = 1000 // kcal/day — about 1 kg a week
const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }

export function plan(p, currentWeight, todayKey = dayKey()) {
  if (!(+p.targetWeight > 0)) return null
  const w = +currentWeight || +p.weight
  if (!(w > 0)) return null
  // at or below target counts as reached, with or without a date
  if (w <= +p.targetWeight) return { daysLeft: 0, toLose: 0, needed: 0, deficit: 0, tooFast: false, realisticEnd: todayKey, reached: true, notStarted: false, expired: false, active: false }
  if (!p.endDate) return null
  const today = parseDay(todayKey)
  const end = parseDay(p.endDate)
  // plan only runs between its start date and its end date
  const notStarted = !!p.startDate && parseDay(p.startDate) > today
  const expired = end < today
  const daysLeft = Math.max(1, Math.round((end - today) / DAY))
  const toLose = Math.max(0, w - +p.targetWeight)
  const needed = (toLose * KCAL_PER_KG) / daysLeft
  const tooFast = needed > SAFE_MAX_DEFICIT
  const realisticDays = Math.ceil((toLose * KCAL_PER_KG) / 750)
  const realisticEnd = dayKey(new Date(today.getTime() + realisticDays * DAY))
  const active = !notStarted && !expired && toLose > 0
  const deficitUsed = active ? Math.min(needed, SAFE_MAX_DEFICIT) : 0
  // expected loss per week, mostly fat: 7 days × daily deficit ÷ 7,700 kcal per kg
  const rateNeeded = (needed * 7) / KCAL_PER_KG
  const rate = (deficitUsed * 7) / KCAL_PER_KG
  return { rateNeeded: Math.round(rateNeeded * 100) / 100, rate: Math.round(rate * 100) / 100, pctPerWeek: Math.round((rateNeeded / w) * 1000) / 10, pace: paceFor(rateNeeded, w), daysLeft, toLose, needed: Math.round(needed), deficit: active ? Math.round(Math.min(needed, SAFE_MAX_DEFICIT)) : 0, tooFast: active && tooFast, realisticEnd, reached: toLose === 0, notStarted, expired: expired && toLose > 0, active }
}

export const prettyDate = (k) => parseDay(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// ───────── Workouts ─────────
// MET values from the Compendium of Physical Activities. Calories are net
// (MET − 1) × kg × hours, because resting burn is already in the budget.
// kind: 'min' (minutes) · 'sec' (seconds) · 'reps' (sets × reps) · 'weights' (sets × reps × kg)
export const WORKOUTS = [
  { id: 'jacks', label: 'Jumping jacks', emoji: '⭐', kind: 'reps', met: 8.0, secPerRep: 1.2 },
  { id: 'squats', label: 'Squats', emoji: '🦵', kind: 'reps', met: 5.0, secPerRep: 3 },
  { id: 'pushups', label: 'Push-ups', emoji: '💪', kind: 'reps', met: 8.0, secPerRep: 2.5 },
  { id: 'situps', label: 'Sit-ups', emoji: '🔄', kind: 'reps', met: 3.8, secPerRep: 3 },
  // whole-session values from the Compendium: resistance training (rests included) 3.5, moderate circuit training 4.3
  { id: 'custom', label: 'Exercise', emoji: '✅', kind: 'min', met: 3.5 },
  { id: 'strength', label: 'Strength training', emoji: '🏋️', kind: 'min', met: 3.5 },
  { id: 'circuit', label: 'Circuit training', emoji: '⚡', kind: 'min', met: 4.3 },
  { id: 'bridge', label: 'Glute bridges', emoji: '🍑', kind: 'reps', met: 3.8, secPerRep: 3 },
  { id: 'lunges', label: 'Lunges', emoji: '🚶', kind: 'reps', met: 3.8, secPerRep: 3 },
  { id: 'burpees', label: 'Burpees', emoji: '🔥', kind: 'reps', met: 8.0, secPerRep: 5 },
  { id: 'dumbbells', label: 'Dumbbells', emoji: '🏋️', kind: 'weights', met: 3.5, secPerRep: 3 },
  { id: 'hang', label: 'Dead hang', emoji: '🙌', kind: 'sec', met: 2.8 },
  { id: 'plank', label: 'Plank', emoji: '📏', kind: 'sec', met: 3.8 },
  { id: 'rope', label: 'Skipping rope', emoji: '🪢', kind: 'min', met: 12.3 },
  { id: 'hiit', label: 'HIIT', emoji: '⚡', kind: 'min', met: 8.0 },
  { id: 'cycling', label: 'Cycling', emoji: '🚴', kind: 'min', met: 6.8 },
  { id: 'swim', label: 'Swimming', emoji: '🏊', kind: 'min', met: 5.8 },
  { id: 'padel', label: 'Padel / tennis', emoji: '🎾', kind: 'min', met: 6.0 },
  { id: 'football', label: 'Football', emoji: '⚽', kind: 'min', met: 7.0 },
  { id: 'stairs', label: 'Stairs (brisk)', emoji: '🪜', kind: 'min', met: 8.8 },
  { id: 'yoga', label: 'Yoga / stretching', emoji: '🧘', kind: 'min', met: 2.5 },
  { id: 'dance', label: 'Dancing', emoji: '💃', kind: 'min', met: 5.0 },
]

// Active time in minutes for a logged workout.
export function workoutMinutes(w) {
  const def = WORKOUTS.find((x) => x.id === w.type)
  if (!def) return 0
  if (def.kind === 'min') return +w.min || 0
  if (def.kind === 'sec') return ((+w.sec || 0) * (+w.sets || 1)) / 60
  return ((+w.sets || 1) * (+w.reps || 0) * def.secPerRep) / 60
}

export function workoutKcal(w, weightKg) {
  const def = WORKOUTS.find((x) => x.id === w.type)
  if (!def) return 0
  // heavier dumbbells = harder effort (vigorous weight training ≈ 6 MET)
  // an entry can carry its own effort level (custom exercises and routine items)
  const met = +w.met > 0 ? +w.met : def.id === 'dumbbells' ? (+w.kg >= 10 ? 6.0 : +w.kg >= 5 ? 5.0 : 3.5) : def.met
  return Math.round(Math.max(0, met - 1) * (+weightKg || 70) * (workoutMinutes(w) / 60))
}

export function describeWorkout(w) {
  const def = WORKOUTS.find((x) => x.id === w.type)
  if (!def) return ''
  if (w.note) return w.note
  if (def.kind === 'min') return `${w.min} min`
  if (def.kind === 'sec') return `${w.sets > 1 ? `${w.sets} × ` : ''}${w.sec} s`
  if (def.kind === 'weights') return `${w.sets} × ${w.reps} reps @ ${w.kg} kg`
  return `${w.sets > 1 ? `${w.sets} × ` : ''}${w.reps} reps`
}

// ───────── BMI ─────────
// standard: 'who' (international) or 'asian' (WHO expert consultation for Asian populations)
export function bmiInfo(weightKg, heightCm, standard = 'who') {
  const w = +weightKg, h = +heightCm / 100
  if (!(w > 0 && h > 0)) return null
  const bmi = w / (h * h)
  const asian = standard === 'asian'
  const top = asian ? 22.9 : 24.9
  // Asian cut-offs are described by WHO as risk levels rather than weight labels
  const cat = bmi < 18.5 ? 'Underweight' : bmi <= top ? 'Healthy'
    : asian ? (bmi < 27.5 ? 'Increased risk' : 'High risk')
    : bmi < 30 ? 'Overweight' : 'Obese'
  const low = 18.5 * h * h, high = top * h * h, ideal = (asian ? 21 : 22) * h * h
  const toHealthy = Math.max(0, w - high), toIdeal = Math.max(0, w - ideal)
  return {
    bmi: Math.round(bmi * 10) / 10, cat, low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10,
    ideal: Math.round(ideal * 10) / 10, toHealthy: Math.round(toHealthy * 10) / 10, toIdeal: Math.round(toIdeal * 10) / 10,
    weeksToHealthy: Math.ceil(toHealthy / 0.5), weeksToIdeal: Math.ceil(toIdeal / 0.5),
    top, idealBmi: asian ? 21 : 22, asian, cuts: asian ? [18.5, 23, 27.5] : [18.5, 25, 30],
  }
}

// ───────── Goal-date recommendations ─────────
export function recommendDates(currentKg, targetKg, from = new Date()) {
  const toLose = (+currentKg || 0) - (+targetKg || 0)
  if (!(toLose > 0)) return []
  return [
    { id: 'gentle', label: 'Gentle', rate: 0.25, note: 'Easiest to keep' },
    { id: 'steady', label: 'Steady', rate: 0.5, note: 'Recommended', best: true },
    { id: 'faster', label: 'Faster', rate: 0.75, note: 'Needs discipline' },
  ].map((o) => {
    const weeks = Math.ceil(toLose / o.rate)
    const d = new Date(from); d.setDate(d.getDate() + weeks * 7)
    return { ...o, weeks, date: dayKey(d) }
  })
}

// ───────── Streak: days in a row within budget (before today, plus today once closed) ─────────
export function streak(entries, budgetFor, todayKey, includeToday) {
  const byDay = {}
  for (const e of entries) byDay[e.day] = (byDay[e.day] || 0) + e.kcal
  let n = 0
  const d = parseDay(todayKey)
  if (!includeToday) d.setDate(d.getDate() - 1)
  for (let i = 0; i < 365; i++) {
    const k = dayKey(d)
    const b = budgetFor(k)
    if (!(k in byDay) || b == null || byDay[k] > b) break
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

// ───────── Your day: wake-up and bedtime ─────────
// The app's day is the calendar day: it changes at midnight, the same as the phone's clock.
// 'HH:MM' → minutes; anything missing or malformed → null so the defaults apply
const toMin = (hhmm) => { if (!/^\d{1,2}:\d{2}$/.test(String(hhmm ?? ''))) return null; const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const nowMin = (d) => d.getHours() * 60 + d.getMinutes()
export const DEFAULT_WAKE = '06:30'
export const DEFAULT_BED = '22:30'

export function logicalDayKey(_p, now = new Date()) {
  return dayKey(now)
}

// Evening windows run from shortly before bedtime until midnight. If bedtime is after
// midnight, they use the last stretch of the evening so they still belong to the day being closed.
const eveningFrom = (p, lead, fallback) => {
  const bed = toMin(p?.bedTime) ?? toMin(DEFAULT_BED)
  const start = (bed - lead + 1440) % 1440
  return start < 720 ? fallback : start
}

// From an hour before bedtime: time to close the day.
export function isWindDown(p, now = new Date()) {
  return nowMin(now) >= eveningFrom(p, 60, 23 * 60)
}

// From 15 minutes before bedtime: the app offers to close the day by itself.
export function isBedtime(p, now = new Date()) {
  return nowMin(now) >= eveningFrom(p, 15, 23 * 60 + 45)
}

// Sleep: stored on the day you woke up as { bed: 'HH:MM', wake: 'HH:MM' }.
// Adults need at least 7 hours a night (American Academy of Sleep Medicine / Sleep Research Society).
export const SLEEP_TARGET = 7
export function sleepHours(s) {
  if (!s?.bed || !s?.wake) return null
  const [bh, bm] = s.bed.split(':').map(Number), [wh, wm] = s.wake.split(':').map(Number)
  let mins = wh * 60 + wm - (bh * 60 + bm)
  if (mins <= 0) mins += 24 * 60
  return mins / 60
}
export function fmtSleep(h) {
  if (h == null) return '—'
  const total = Math.round(h * 60)
  return `${Math.floor(total / 60)} h${total % 60 ? ` ${total % 60} min` : ''}`
}

// ───────── Maintenance ─────────
// Normal day-to-day weight swings are about ±1–2 kg (water, food, salt), so a
// maintained weight is judged against a ±1.5 kg band around the weight you chose to keep.
export const MAINTAIN_BAND = 1.5
export function maintainStatus(p) {
  const keep = +p.maintainWeight, w = +p.weight
  if (p.goal !== 'maintain' || !(keep > 0) || !(w > 0)) return null
  const diff = Math.round((w - keep) * 10) / 10
  return { keep, low: keep - MAINTAIN_BAND, high: keep + MAINTAIN_BAND, diff, status: diff > MAINTAIN_BAND ? 'above' : diff < -MAINTAIN_BAND ? 'below' : 'in' }
}

// How hard a weekly loss rate is. Common guidance: 0.25–0.5 kg a week is steady,
// up to about 1 kg (or 1% of body weight) is the safe upper limit, beyond that is extreme.
export function paceFor(kgPerWeek, weightKg) {
  const pct = weightKg > 0 ? (kgPerWeek / weightKg) * 100 : 0
  if (kgPerWeek <= 0) return 'none'
  if (kgPerWeek <= 0.5) return 'steady'
  if (kgPerWeek <= 1 && pct <= 1) return 'fast'
  return 'extreme'
}

// Is the target itself healthy for this height? Below BMI 18.5 is underweight.
export function targetCheck(targetKg, heightCm) {
  const h = +heightCm / 100, t = +targetKg
  if (!(h > 0 && t > 0)) return null
  const bmi = t / (h * h)
  return { bmi: Math.round(bmi * 10) / 10, tooLow: bmi < 18.5, lowest: Math.ceil(18.5 * h * h * 10) / 10 }
}

// ───────── Weight trend ─────────
// Daily weight swings 1–2 kg from water and salt. The trend is the average of the
// weigh-ins in the 7 days up to each point, which shows the real direction.
export function weightTrend(pts) {
  const DAY = 86400000
  return pts.map((p) => {
    const win = pts.filter((q) => q.t <= p.t && q.t > p.t - 7 * DAY)
    return { ...p, trend: Math.round((win.reduce((a, q) => a + q.w, 0) / win.length) * 100) / 100 }
  })
}

const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)) }

// ───────── Weekly check-in ─────────
// Summary of the 7 days before todayKey (so Sunday morning reviews the week just finished).
export function weekSummary({ entries, profile, budgetFor, todayKey }) {
  const keys = Array.from({ length: 7 }, (_, i) => addDays(todayKey, i - 7))
  const days = profile.days ?? {}
  let logged = 0, within = 0, saved = 0, workouts = 0, sleepSum = 0, sleepN = 0, habitDone = 0
  for (const k of keys) {
    const items = entries.filter((e) => e.day === k)
    if (items.length) {
      logged++
      const net = (budgetFor(k) ?? 0) - items.reduce((a, e) => a + e.kcal, 0)
      saved += net
      if (net >= 0) within++
    }
    workouts += days[k]?.workouts?.length ?? 0
    const sh = sleepHours(days[k]?.sleep)
    if (sh != null) { sleepSum += sh; sleepN++ }
    habitDone += (profile.habits ?? []).filter((id) => days[k]?.habits?.[id]).length
  }
  const pts = Object.entries(days).filter(([, d]) => +d?.weight > 0).map(([k, d]) => ({ k, t: parseDay(k).getTime(), w: +d.weight })).sort((a, b) => a.t - b.t)
  const tr = weightTrend(pts)
  const end = tr.filter((p) => p.k < todayKey).at(-1), start = tr.filter((p) => p.k < keys[0]).at(-1) ?? tr.find((p) => p.k >= keys[0])
  const weightChange = end && start && end.k !== start.k ? Math.round((end.trend - start.trend) * 10) / 10 : null
  return {
    from: keys[0], to: keys[6], logged, within, saved: Math.round(saved), workouts,
    sleepAvg: sleepN ? sleepSum / sleepN : null, weightChange,
    habitDone, habitPossible: (profile.habits ?? []).length * 7,
  }
}

// ───────── Weigh-in check-in ─────────
// Everything shown after a weigh-in: where you are, how the trend is moving, and one
// calm next step. Judged on the 7-day trend, never on a single day's number.
export function weighInReport(profile, todayKey) {
  const DAY = 86400000
  const pts = weightTrend(Object.entries(profile.days ?? {}).filter(([k, d]) => +d?.weight > 0 && k <= todayKey)
    .map(([k, d]) => ({ k, t: parseDay(k).getTime(), w: +d.weight })).sort((a, b) => a.t - b.t))
  const now = pts.at(-1)
  if (!now || now.k !== todayKey) return null
  const prev = pts.at(-2) ?? null, first = pts[0]
  const r1 = (n) => Math.round(n * 10) / 10
  const sincePrev = prev ? r1(now.w - prev.w) : null
  const total = pts.length > 1 ? r1(now.trend - first.trend) : null
  // pace from the trend over the last 2–4 weeks (needs at least 7 days of history)
  const base = pts.find((p) => p.t >= now.t - 28 * DAY)
  const span = (now.t - base.t) / DAY
  const perWeek = span >= 7 ? Math.round(((now.trend - base.trend) / span) * 7 * 100) / 100 : null
  const maintaining = profile.goal === 'maintain'
  const target = !maintaining && +profile.targetWeight > 0 ? +profile.targetWeight : null
  const toGo = target ? r1(Math.max(0, now.w - target)) : null
  const startW = first.w
  const done = target && startW > target ? Math.min(1, Math.max(0, (startW - now.w) / (startW - target))) : null
  const eta = target && toGo > 0 && perWeek != null && perWeek < -0.05 ? dayKey(new Date(now.t + (toGo / -perWeek) * 7 * DAY)) : null
  const ms = maintainStatus({ ...profile, weight: now.w })
  const bmi = bmiInfo(now.w, profile.height, profile.bmiStandard ?? 'who')
  const pctWeek = perWeek != null ? (-perWeek / now.w) * 100 : 0

  let headline, tip, tone = 'good'
  if (pts.length === 1) {
    headline = 'This is your starting line.'
    tip = 'Weigh in at the same time each morning, after the bathroom and before eating. After a week you’ll see your real trend.'
  } else if (maintaining && ms) {
    if (ms.status === 'in') { headline = `Holding steady around ${ms.keep} kg.`; tip = 'Nothing to change. Small ups and downs inside your range are just water and meals.' }
    else if (ms.status === 'above') { headline = `A little above your range (+${ms.diff} kg).`; tip = 'Check it against the next few mornings first. If it stays, a couple of lighter dinners and a daily walk usually bring it back.'; tone = 'care' }
    else { headline = `Below your range (${ms.diff} kg).`; tip = 'If this wasn’t planned, eat up to your full budget. Add a snack with protein.'; tone = 'care' }
  } else if (target && toGo === 0) {
    headline = `You’ve reached ${target} kg. Well done! 🎉`
    tip = 'Switch your goal to Maintain in Settings so your budget rises to keep you here.'
  } else if (perWeek == null) {
    headline = sincePrev <= 0 ? 'Off to a good start.' : 'Early days. One number means very little.'
    tip = 'Keep weighing in each morning. Your trend and pace appear after a week.'
  } else if (pctWeek > 1 && -perWeek > 1) {
    headline = 'You’re losing quickly.'
    tip = 'Faster isn’t better. Eat up to your budget, include protein at each meal, and keep your strength sessions so you lose fat, not muscle.'
    tone = 'care'
  } else if (perWeek <= -0.2) {
    headline = sincePrev > 0 ? 'Up a little today, but your trend is still going down.' : 'Your trend is going down. This is working.'
    tip = sincePrev > 0 ? 'A day-to-day rise like this is water and salt, not fat. Nothing to change.' : 'Keep doing what you’re doing. Steady beats fast.'
  } else if (perWeek < 0.15) {
    headline = span >= 14 ? 'Your weight has levelled off for now.' : 'Holding about steady this week.'
    tip = span >= 14 ? 'Plateaus are a normal part of losing weight. Two things to try: measure your rice and cooking oil for a few days, and add a 10-minute walk after meals.' : 'One flat week is normal. Give it another week before changing anything.'
    tone = span >= 14 ? 'care' : 'good'
  } else {
    headline = 'Your trend has drifted up a little.'
    tip = 'No need to make up for it. Log everything for the next three days, including drinks and bites, and the picture usually becomes clear.'
    tone = 'care'
  }
  return { w: now.w, trend: now.trend, count: pts.length, prevW: prev?.w ?? null, sincePrev, total, since: first.k, perWeek, target, toGo, done, eta, ms, bmi, headline, tip, tone, budget: dailyBudget({ ...profile, weight: now.w }) }
}

// What a linked partner can see. Effort always; weight progress only if you switch it on,
// and then only the change and % to goal, never the weight itself.
export function partnerProgress({ entries, profile, budgetFor, todayKey }) {
  const w = weekSummary({ entries, profile, budgetFor, todayKey })
  const out = { weekWithin: w.within, weekLogged: w.logged, weekWorkouts: w.workouts }
  if (profile.shareWeight) {
    const pts = weightTrend(Object.entries(profile.days ?? {}).filter(([, d]) => +d?.weight > 0).map(([k, d]) => ({ k, t: parseDay(k).getTime(), w: +d.weight })).sort((a, b) => a.t - b.t))
    if (pts.length > 1) {
      const first = pts[0], last = pts.at(-1), target = profile.goal !== 'maintain' ? +profile.targetWeight : 0
      out.kgChange = Math.round((last.trend - first.trend) * 10) / 10
      out.goalPct = target > 0 && first.w > target ? Math.round(Math.min(1, Math.max(0, (first.w - last.w) / (first.w - target))) * 100) : null
    }
  }
  return out
}

// ───────── Real calorie deficit ─────────
// What the body used (maintenance at rest ×1.2, plus logged steps and workouts) minus what was eaten.
// Unlike "under budget", this includes the planned deficit already built into the budget,
// so it's the number that actually drives fat loss. Days with no food logged are left out.
export function deficitDays({ entries, profile, keys, todayKey }) {
  const b = breakdown(profile)
  if (!b) return null
  return keys.map((k) => {
    const items = entries.filter((e) => e.day === k)
    if (!items.length) return { key: k, deficit: null, today: k === todayKey }
    const used = b.tdee + earned(profile.days?.[k], profile.weight).total
    const ate = items.reduce((a, e) => a + e.kcal, 0)
    return { key: k, deficit: Math.round(used - ate), used: Math.round(used), ate, today: k === todayKey }
  })
}
