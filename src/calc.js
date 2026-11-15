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
  const act = ACTIVITY.find((a) => a.id === p.activity) ?? ACTIVITY[0]
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
export function earned(day, weightKg, activity = 'sedentary') {
  if (activity && activity !== 'sedentary') return { steps: 0, tread: 0, work: 0, total: 0, blocked: true }
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
  const met = def.id === 'dumbbells' ? (+w.kg >= 10 ? 6.0 : +w.kg >= 5 ? 5.0 : 3.5) : def.met
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
// The "day" rolls over 3 hours before you wake (never later than 5 am), so a
// late-night snack after midnight still counts towards the day you were in.
const toMin = (hhmm) => { const [h, m] = String(hhmm || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null }
const nowMin = (d) => d.getHours() * 60 + d.getMinutes()
const inWindow = (m, s, e) => (s <= e ? m >= s && m < e : m >= s || m < e)
export const DEFAULT_WAKE = '06:30'
export const DEFAULT_BED = '22:30'

function rollover(p) {
  const wake = toMin(p?.wakeTime) ?? toMin(DEFAULT_WAKE)
  return Math.min(300, Math.max(0, wake - 180))
}

export function logicalDayKey(p, now = new Date()) {
  const d = new Date(now)
  if (nowMin(now) < rollover(p)) d.setDate(d.getDate() - 1)
  return dayKey(d)
}

// From an hour before bedtime until the day rolls over: time to close the day.
export function isWindDown(p, now = new Date()) {
  const bed = toMin(p?.bedTime) ?? toMin(DEFAULT_BED)
  return inWindow(nowMin(now), (bed - 60 + 1440) % 1440, rollover(p))
}

// From 15 minutes before bedtime: the app offers to close the day by itself.
export function isBedtime(p, now = new Date()) {
  const bed = toMin(p?.bedTime) ?? toMin(DEFAULT_BED)
  return inWindow(nowMin(now), (bed - 15 + 1440) % 1440, rollover(p))
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
