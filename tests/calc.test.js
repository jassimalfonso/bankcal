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
  assert.equal(c.earned({ steps: 10000 }, 84, 'moderate').total, 0) // no double counting
})

test('BMI categories, international and Asian', () => {
  assert.equal(c.bmiInfo(84, 173).bmi, 28.1)
  assert.equal(c.bmiInfo(84, 173).cat, 'Overweight')
  assert.equal(c.bmiInfo(84, 173, 'asian').cat, 'High risk')
  assert.equal(c.bmiInfo(70, 173).cat, 'Healthy') // 23.4
  assert.equal(c.bmiInfo(70, 173, 'asian').cat, 'Increased risk')
  assert.equal(c.bmiInfo(50, 173).cat, 'Underweight')
})

test('the day rolls over 3 hours before wake-up, never later than 5 am', () => {
  const p = { wakeTime: '06:30' }
  assert.equal(c.logicalDayKey(p, new Date(2026, 10, 16, 1, 0)), '2026-11-15') // 1 am snack → yesterday
  assert.equal(c.logicalDayKey(p, new Date(2026, 10, 16, 3, 30)), '2026-11-16')
  assert.equal(c.logicalDayKey({ wakeTime: '10:00' }, new Date(2026, 10, 16, 5, 1)), '2026-11-16')
})

test('wind-down and bedtime windows', () => {
  const p = { wakeTime: '06:30', bedTime: '22:30' }
  assert.equal(c.isWindDown(p, new Date(2026, 10, 15, 21, 29)), false)
  assert.equal(c.isWindDown(p, new Date(2026, 10, 15, 21, 30)), true)
  assert.equal(c.isBedtime(p, new Date(2026, 10, 15, 22, 15)), true)
  assert.equal(c.isBedtime(p, new Date(2026, 10, 16, 2, 0)), true) // past midnight, same day
  assert.equal(c.isBedtime(p, new Date(2026, 10, 16, 8, 0)), false)
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
