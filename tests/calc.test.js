// Checks the app's maths against hand-worked values. Run with: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import * as c from '../src/calc.js'

const man = { sex: 'm', weight: 84, height: 173, age: 32, activity: 'sedentary', goal: 'lose05' }
const woman = { sex: 'f', weight: 62, height: 160, age: 32, activity: 'sedentary', goal: 'maintain' }

test('Mifflin-St Jeor BMR', () => {
  assert.equal(Math.round(c.bmr(man)), 1766) // 10×84 + 6.25×173 − 5×32 + 5
  assert.equal(Math.round(c.bmr(woman)), 1299) // 10×62 + 6.25×160 − 5×32 − 161
})

test('daily budget = BMR × activity − deficit, rounded to 10', () => {
  assert.equal(c.dailyBudget(man), 1570) // 1766×1.2 − 550 = 1569.7
  assert.equal(c.dailyBudget(woman), 1560) // 1299×1.2
  assert.equal(c.dailyBudget({ ...man, customBudget: 2000 }), 2000)
  assert.equal(c.dailyBudget({ sex: 'm' }), null)
})

test('budget never drops below the safe floor', () => {
  assert.equal(c.dailyBudget({ ...woman, weight: 45, height: 150, goal: 'lose05' }), 1200)
  assert.equal(c.dailyBudget({ ...man, weight: 55, height: 160, goal: 'lose05' }), 1500)
})

test('age from birthday, before and after the birthday', () => {
  assert.equal(c.ageOf({ birthDate: '1994-03-08' }, new Date(2026, 2, 7)), 31)
  assert.equal(c.ageOf({ birthDate: '1994-03-08' }, new Date(2026, 2, 8)), 32)
  assert.equal(c.isBirthday({ birthDate: '1994-03-08' }, '2026-03-08'), true)
})

test('plan: deficit from target weight and date, capped at 1000', () => {
  const p = c.plan({ targetWeight: 78, endDate: '2027-03-15' }, 84, '2026-11-15')
  assert.equal(p.daysLeft, 120)
  assert.equal(p.deficit, 385) // 6 kg × 7700 ÷ 120
  const fast = c.plan({ targetWeight: 70, endDate: '2026-12-15' }, 84, '2026-11-15')
  assert.equal(fast.tooFast, true)
  assert.equal(fast.deficit, 1000)
  assert.equal(c.plan({ targetWeight: 84, endDate: '2026-12-15' }, 84, '2026-11-15').reached, true)
})

test('activity deposits are net of resting burn', () => {
  assert.equal(c.earned({ steps: 3000 }, 84).total, 0) // baseline steps earn nothing
  assert.equal(c.earned({ steps: 10000 }, 84).steps, 259) // 7000 × 0.00044 × 84
  assert.equal(c.earned({ treadMin: 30, treadSpeed: 5.6 }, 84).tread, 139) // (4.3−1) × 84 × 0.5
  assert.equal(c.workoutKcal({ type: 'rope', min: 10 }, 84), 158) // (12.3−1) × 84 ÷ 6
  assert.equal(c.dailyBudget({ ...man, activity: 'active' }), c.dailyBudget(man)) // old activity setting no longer changes the base
})

test('BMI categories, international and Asian', () => {
  assert.equal(c.bmiInfo(84, 173).bmi, 28.1)
  assert.equal(c.bmiInfo(84, 173).cat, 'Overweight')
  assert.equal(c.bmiInfo(84, 173, 'asian').cat, 'High risk')
  assert.equal(c.bmiInfo(70, 173).cat, 'Healthy') // 23.4
  assert.equal(c.bmiInfo(70, 173, 'asian').cat, 'Increased risk')
  assert.equal(c.bmiInfo(50, 173).cat, 'Underweight')
})



test('sleep hours across midnight', () => {
  assert.equal(c.sleepHours({ bed: '22:30', wake: '06:30' }), 8)
  assert.equal(c.sleepHours({ bed: '01:15', wake: '07:00' }), 5.75)
  assert.equal(c.fmtSleep(5.75), '5 h 45 min')
  assert.equal(c.sleepHours({}), null)
})

test('streak counts consecutive days within budget', () => {
  const e = [{ day: '2026-11-14', kcal: 1500 }, { day: '2026-11-13', kcal: 1800 }, { day: '2026-11-12', kcal: 2500 }]
  assert.equal(c.streak(e, () => 1840, '2026-11-15', false), 2)
  assert.equal(c.streak([...e, { day: '2026-11-15', kcal: 900 }], () => 1840, '2026-11-15', true), 3)
  assert.equal(c.streak(e, () => 1840, '2026-11-17', false), 0) // a gap breaks it
})

test('goal-date recommendations', () => {
  const r = c.recommendDates(84, 78, new Date(2026, 10, 15))
  assert.deepEqual(r.map((x) => x.weeks), [24, 12, 8])
  assert.equal(r[1].date, '2027-02-07')
})

test('plan respects its start and end dates, and reaching the target means maintain', () => {
  const base = { sex: 'm', weight: 84, height: 173, age: 32, activity: 'sedentary', goal: 'lose025', targetWeight: 78 }
  const maint = Math.round((1766 * 1.2) / 10) * 10
  assert.equal(c.dailyBudget({ ...base, startDate: '2099-01-01', endDate: '2099-06-01' }), Math.round((1766 * 1.2 - 275) / 10) * 10) // not started → simple goal
  assert.equal(c.dailyBudget({ ...base, startDate: '2020-01-01', endDate: '2020-06-01' }), Math.round((1766 * 1.2 - 275) / 10) * 10) // ended → simple goal
  assert.equal(c.dailyBudget({ ...base, targetWeight: 84, endDate: '2099-06-01' }), maint) // reached → maintain
})

test('maintenance band', () => {
  const p = { goal: 'maintain', maintainWeight: 70 }
  assert.equal(c.maintainStatus({ ...p, weight: 71.2 }).status, 'in')
  assert.equal(c.maintainStatus({ ...p, weight: 72 }).status, 'above')
  assert.equal(c.maintainStatus({ ...p, weight: 68 }).status, 'below')
  assert.equal(c.maintainStatus({ goal: 'lose05', maintainWeight: 70, weight: 72 }), null)
})

test('weekly loss rate and pace', () => {
  const p = c.plan({ targetWeight: 78, endDate: '2027-03-15' }, 84, '2026-11-15') // 385/day
  assert.equal(p.rate, 0.35) // 385 × 7 ÷ 7700
  assert.equal(p.pace, 'steady')
  const fast = c.plan({ targetWeight: 70, endDate: '2026-12-15' }, 84, '2026-11-15')
  assert.equal(fast.pace, 'extreme')
  assert.equal(fast.rate, 0.91) // capped at 1000/day
  assert.equal(c.paceFor(0.8, 90), 'fast')
  assert.equal(c.paceFor(0.8, 60), 'extreme') // 1.3% of body weight
  assert.equal(c.targetCheck(50, 173).tooLow, true)
  assert.equal(c.targetCheck(50, 173).lowest, 55.4)
})

test('strength sessions count rests (Compendium whole-session values)', async () => {
  const t = await import('../src/training.js')
  const g = t.exerciseById.goblet // intermediate: 3 × 8–12, 90 s rest → 3 × (24 + 90) s = 5.7 min
  assert.equal(Math.round(t.exerciseMinutes(g, 'intermediate') * 10) / 10, 5.7)
  const w = t.toWorkout(g, 'intermediate', 12)
  assert.equal(w.type, 'strength')
  assert.equal(c.workoutKcal(w, 84), 21) // (3.5−1) × 84 × 6/60
  const plan = t.PLANS.find((p) => p.id === 'dumbbell')
  const s = t.toSession(plan, plan.sessions[0], 'intermediate')
  assert.ok(s.min >= 25 && s.min <= 45, `session ${s.min} min`)
})

test('habits week dots and layout upgrade', async () => {
  const h = await import('../src/habits.js')
  const l = await import('../src/layout.js')
  const days = { '2026-11-15': { habits: { walk: true } }, '2026-11-13': { habits: { walk: true } } }
  assert.deepEqual(h.habitDays(days, 'walk', '2026-11-15'), [false, false, false, false, true, false, true])
  assert.deepEqual(h.habitDays(days, 'walk', '2026-12-01', 3), [false, false, false]) // crosses month
  assert.deepEqual(l.fullLayout(['meals', 'words', 'deposits', 'eat']), ['meals', 'partner', 'habits', 'weigh', 'words', 'deposits', 'eat', 'journal'])
  assert.deepEqual(l.fullLayout(undefined).slice(0, 4), ['words', 'partner', 'habits', 'weigh'])
  assert.equal(h.suggestHabits('maintain').length, 3)
})

test('weight trend is a 7-day average', () => {
  const D = 86400000, t0 = new Date(2026, 10, 1).getTime()
  const pts = [84, 85, 83, 84, 83.5].map((w, i) => ({ k: `2026-11-0${i + 1}`, t: t0 + i * D, w }))
  const tr = c.weightTrend(pts)
  assert.equal(tr[0].trend, 84)
  assert.equal(tr[4].trend, 83.9) // (84+85+83+84+83.5)/5
  const far = c.weightTrend([{ t: t0, w: 90 }, { t: t0 + 10 * D, w: 80 }])
  assert.equal(far[1].trend, 80) // older than 7 days is left out
})

test('weekly summary covers the 7 days before today', () => {
  const entries = [{ day: '2026-11-14', kcal: 1500 }, { day: '2026-11-13', kcal: 2000 }, { day: '2026-11-15', kcal: 999 }, { day: '2026-11-07', kcal: 999 }]
  const profile = { habits: ['walk'], days: { '2026-11-14': { habits: { walk: true }, workouts: [{}, {}], sleep: { bed: '23:00', wake: '06:00' } }, '2026-11-09': { weight: 84 }, '2026-11-14x': {} } }
  const w = c.weekSummary({ entries, profile, budgetFor: () => 1800, todayKey: '2026-11-15' })
  assert.equal(w.from, '2026-11-08'); assert.equal(w.to, '2026-11-14')
  assert.equal(w.logged, 2); assert.equal(w.within, 1); assert.equal(w.saved, 100)
  assert.equal(w.workouts, 2); assert.equal(w.sleepAvg, 7); assert.equal(w.habitDone, 1); assert.equal(w.habitPossible, 7)
})

test('weigh-in report judges the trend, not the day', () => {
  const mk = (ws, extra = {}) => ({ sex: 'm', height: 173, age: 32, goal: 'lose05', targetWeight: 78, ...extra, days: Object.fromEntries(ws.map((w, i) => [`2026-11-${String(i + 1).padStart(2, '0')}`, { weight: w }])) })
  assert.equal(c.weighInReport(mk([84]), '2026-11-02'), null) // not weighed today
  assert.match(c.weighInReport(mk([84]), '2026-11-01').headline, /starting line/)
  const down = c.weighInReport(mk([85, 84.8, 84.9, 84.5, 84.4, 84.2, 84.0, 83.9, 83.6, 84.0]), '2026-11-10')
  assert.equal(down.sincePrev, 0.4)
  assert.ok(down.perWeek < -0.2); assert.match(down.headline, /Up a little today/); assert.equal(down.tone, 'good')
  assert.equal(down.toGo, 6); assert.ok(down.eta > '2026-11-10')
  const flat = c.weighInReport(mk(Array(16).fill(84)), '2026-11-16')
  assert.match(flat.headline, /levelled off/)
  assert.match(c.weighInReport(mk([79, 78]), '2026-11-02').headline, /reached 78/)
  const keep = c.weighInReport(mk([70, 70.4], { goal: 'maintain', maintainWeight: 70, targetWeight: null }), '2026-11-02')
  assert.match(keep.headline, /Holding steady/); assert.equal(keep.target, null)
})

test('partner summary shares weight progress only when switched on', () => {
  const days = { '2026-11-01': { weight: 84 }, '2026-11-10': { weight: 82 } }
  const base = { entries: [], budgetFor: () => 1800, todayKey: '2026-11-15' }
  const off = c.partnerProgress({ ...base, profile: { days, targetWeight: 78 } })
  assert.equal(off.kgChange, undefined)
  const on = c.partnerProgress({ ...base, profile: { days, targetWeight: 78, shareWeight: true } })
  assert.equal(on.kgChange, -2); assert.equal(on.goalPct, 33)
})

test('milestones, week ticks and one thing today', async () => {
  const m = await import('../src/milestones.js'); const h = await import('../src/habits.js')
  const days = { '2026-11-09': { weight: 84, habits: { walk: true } }, '2026-11-10': { weight: 81, workouts: [{}], steps: 10400 }, '2026-11-11': { habits: { walk: true } } }
  const got = m.reached({ entries: [{ day: '2026-11-09' }, { day: '2026-11-10' }, { day: '2026-11-11' }], profile: { days, targetWeight: 80, habits: ['walk'] }, streakDays: 3 })
  for (const id of ['first-log', 'log-3', 'streak-3', 'weigh-1', 'kg-1', 'move-1', 'steps-10k']) assert.ok(got.includes(id), id)
  assert.ok(!got.includes('log-7') && !got.includes('goal') && !got.includes('habit-7'))
  assert.equal(m.reached({ entries: [], profile: {}, streakDays: 0 }).length, 0)
  assert.equal(h.weekTicks({ days, habits: ['walk'] }, '2026-11-11'), 2) // Mon 9th to Wed 11th
  assert.equal(h.weekTicks({ days, habits: ['walk'] }, '2026-11-16'), 0) // new week on Monday
  assert.match(h.oneThing({ profile: {}, todayKey: '2026-11-11' }).text, /Pick one tiny habit/)
  assert.match(h.oneThing({ profile: { habits: ['walk'], days }, todayKey: '2026-11-11', yesterday: { net: -200 } }).text, /Log each meal/)
  assert.match(h.oneThing({ profile: { habits: ['walk'], days: {} }, todayKey: '2026-11-11' }).text, /scale/)
  assert.equal(h.oneThing({ profile: { habits: ['walk', 'water'], days }, todayKey: '2026-11-11', yesterday: { net: 50 } }).text, 'Water with every meal')
})

test('routine items: honest calories from time and effort', async () => {
  const t = await import('../src/training.js')
  // bicep curl, 3 × 10 @ 5 kg, 60 s rests: 90 s work + 180 s rest = 4.5 min at 3.5 MET
  const curl = t.routineFromExercise(t.exerciseById.curl, 'intermediate', 5)
  assert.equal(curl.sets, 3); assert.equal(curl.reps, 10); assert.equal(curl.kg, 5); assert.equal(curl.rest, 60)
  const w = t.routineWorkout(curl)
  assert.equal(w.min, 4.5); assert.equal(w.note, '3 × 10 @ 5 kg'); assert.equal(w.rid, curl.id)
  assert.equal(c.workoutKcal(w, 84), 16) // (3.5−1) × 84 × 4.5 ÷ 60
  // more sets → more calories; heavier weight alone → same
  assert.ok(c.workoutKcal(t.routineWorkout({ ...curl, sets: 5 }), 84) > 16)
  assert.equal(c.workoutKcal(t.routineWorkout({ ...curl, kg: 12 }), 84), 16)
  // very hard custom exercise: work at 8 MET, rests at 2 MET
  const hard = t.routineWorkout({ id: 'x', name: 'Sprints', kind: 'time', sets: 4, sec: 30, rest: 60, met: 8 })
  assert.equal(hard.min, 6); assert.equal(hard.met, 4) // (8×120 + 2×240) ÷ 360
  assert.equal(c.workoutKcal(hard, 84), 25)
  assert.equal(c.earned({ workouts: [w, hard] }, 84).work, 41)
})



test('the day changes at midnight, like the clock', () => {
  const at = (d, h, m) => new Date(2026, 10, d, h, m)
  assert.equal(c.logicalDayKey({ wakeTime: '06:30' }, at(15, 23, 59)), '2026-11-15')
  assert.equal(c.logicalDayKey({ wakeTime: '06:30' }, at(16, 0, 1)), '2026-11-16')
  assert.equal(c.logicalDayKey({}, at(16, 0, 40)), '2026-11-16')
})

test('close-my-day windows end at midnight', () => {
  const at = (h, m) => new Date(2026, 10, 15, h, m)
  const p = { bedTime: '22:30' }
  assert.equal(c.isWindDown(p, at(21, 29)), false); assert.equal(c.isWindDown(p, at(21, 30)), true); assert.equal(c.isWindDown(p, at(23, 59)), true)
  assert.equal(c.isBedtime(p, at(22, 14)), false); assert.equal(c.isBedtime(p, at(22, 15)), true)
  assert.equal(c.isBedtime(p, at(0, 30)), false); assert.equal(c.isWindDown(p, at(8, 0)), false) // a new day: nothing to close yet
  assert.equal(c.isWindDown({}, at(21, 45)), true); assert.equal(c.isBedtime({}, at(12, 0)), false) // defaults
  const owl = { bedTime: '01:00' } // bedtime after midnight: prompt late in the evening
  assert.equal(c.isWindDown(owl, at(22, 59)), false); assert.equal(c.isWindDown(owl, at(23, 0)), true)
  assert.equal(c.isBedtime(owl, at(23, 45)), true); assert.equal(c.isBedtime(owl, at(0, 30)), false)
})

test('food search understands brands, sizes and milk wording', async () => {
  const f = await import('../src/foods.js')
  const top = (q) => f.matchFoods(q)[0]?.f.name
  assert.match(top('starbucks double shot coffee dark roast with skimmed milk grande'), /Doubleshot on Ice.*skimmed/)
  assert.match(top('starbucks latte nonfat'), /Latte, skimmed/)
  assert.match(top('sbux frap'), /Frappuccino/)
  assert.equal(top('okoy'), 'Okoy (shrimp fritter)')
  assert.equal(top('tortang talog'), 'Tortang talong')
  assert.equal(f.matchFoods('starbucks double shot coffee dark roast with skimmed milk grande').some((m) => m.strong), false) // → looks online too
  assert.equal(f.matchFoods('spanish latte')[0].strong, true)
})
