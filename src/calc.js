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

export function bmr({ sex, weight, height, age }) {
  const base = 10 * +weight + 6.25 * +height - 5 * +age
  return sex === 'm' ? base + 5 : base - 161
}

// p.weight is the latest weight; a target-weight plan (if set) replaces the simple goal.
export function breakdown(p) {
  if (!(p.weight > 0 && p.height > 0 && p.age > 0)) return null
  const b = bmr(p)
  const act = ACTIVITY.find((a) => a.id === p.activity) ?? ACTIVITY[0]
  const goal = GOALS.find((g) => g.id === p.goal) ?? GOALS[0]
  const pl = plan(p, p.weight)
  const deficit = pl ? pl.deficit : goal.perDay
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
  const stepKcal = steps * 0.0005 * w
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
  if (!(+p.targetWeight > 0) || !p.endDate) return null
  const w = +currentWeight || +p.weight
  if (!(w > 0)) return null
  const today = parseDay(todayKey)
  const end = parseDay(p.endDate)
  const daysLeft = Math.max(1, Math.round((end - today) / DAY))
  const toLose = Math.max(0, w - +p.targetWeight)
  const needed = (toLose * KCAL_PER_KG) / daysLeft
  const tooFast = needed > SAFE_MAX_DEFICIT
  const realisticDays = Math.ceil((toLose * KCAL_PER_KG) / 750)
  const realisticEnd = dayKey(new Date(today.getTime() + realisticDays * DAY))
  return { daysLeft, toLose, needed: Math.round(needed), deficit: Math.round(Math.min(needed, SAFE_MAX_DEFICIT)), tooFast, realisticEnd, reached: toLose === 0 }
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
  { id: 'lunges', label: 'Lunges', emoji: '🚶', kind: 'reps', met: 4.0, secPerRep: 3 },
  { id: 'burpees', label: 'Burpees', emoji: '🔥', kind: 'reps', met: 8.0, secPerRep: 5 },
  { id: 'dumbbells', label: 'Dumbbells', emoji: '🏋️', kind: 'weights', met: 3.5, secPerRep: 3 },
  { id: 'hang', label: 'Dead hang', emoji: '🙌', kind: 'sec', met: 3.0 },
  { id: 'plank', label: 'Plank', emoji: '📏', kind: 'sec', met: 3.8 },
  { id: 'rope', label: 'Skipping rope', emoji: '🪢', kind: 'min', met: 11.8 },
  { id: 'hiit', label: 'HIIT', emoji: '⚡', kind: 'min', met: 8.0 },
  { id: 'cycling', label: 'Cycling', emoji: '🚴', kind: 'min', met: 6.8 },
  { id: 'swim', label: 'Swimming', emoji: '🏊', kind: 'min', met: 6.0 },
  { id: 'padel', label: 'Padel / tennis', emoji: '🎾', kind: 'min', met: 6.0 },
  { id: 'football', label: 'Football', emoji: '⚽', kind: 'min', met: 7.0 },
  { id: 'stairs', label: 'Stairs', emoji: '🪜', kind: 'min', met: 8.8 },
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
  if (def.kind === 'min') return `${w.min} min`
  if (def.kind === 'sec') return `${w.sets > 1 ? `${w.sets} × ` : ''}${w.sec} s`
  if (def.kind === 'weights') return `${w.sets} × ${w.reps} reps @ ${w.kg} kg`
  return `${w.sets > 1 ? `${w.sets} × ` : ''}${w.reps} reps`
}

// ───────── BMI ─────────
export function bmiInfo(weightKg, heightCm) {
  const w = +weightKg, h = +heightCm / 100
  if (!(w > 0 && h > 0)) return null
  const bmi = w / (h * h)
  const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese'
  const low = 18.5 * h * h, high = 24.9 * h * h, ideal = 22 * h * h
  const toHealthy = Math.max(0, w - high), toIdeal = Math.max(0, w - ideal)
  return {
    bmi: Math.round(bmi * 10) / 10, cat, low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10,
    ideal: Math.round(ideal * 10) / 10, toHealthy: Math.round(toHealthy * 10) / 10, toIdeal: Math.round(toIdeal * 10) / 10,
    weeksToHealthy: Math.ceil(toHealthy / 0.5), weeksToIdeal: Math.ceil(toIdeal / 0.5),
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
