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

export function breakdown(p) {
  if (!(p.weight > 0 && p.height > 0 && p.age > 0)) return null
  const b = bmr(p)
  const act = ACTIVITY.find((a) => a.id === p.activity) ?? ACTIVITY[0]
  const goal = GOALS.find((g) => g.id === p.goal) ?? GOALS[0]
  const tdee = b * act.f
  const floor = FLOOR[p.sex] ?? 1200
  const auto = Math.max(floor, Math.round((tdee - goal.perDay) / 10) * 10)
  return { bmr: Math.round(b), tdee: Math.round(tdee), deficit: goal.perDay, floor, auto }
}

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
