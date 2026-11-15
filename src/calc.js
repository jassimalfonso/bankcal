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
  return { steps: Math.round(stepKcal), tread: Math.round(treadKcal), total: Math.round(stepKcal + treadKcal) }
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
