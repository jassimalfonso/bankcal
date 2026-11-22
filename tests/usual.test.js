import { test } from 'node:test'
import assert from 'node:assert/strict'
import { usualFoods } from '../src/calc.js'

test('logged foods become one serving each, newest first, no repeats', () => {
  const out = usualFoods([{ name: 'Black coffee ×2', kcal: 10 }, { name: 'Black coffee', kcal: 5 }, { name: 'Rice ×½', kcal: 100 }, { name: 'Water', kcal: 0 }])
  assert.deepEqual(out, [{ name: 'Black coffee', kcal: 5 }, { name: 'Rice', kcal: 200 }, { name: 'Water', kcal: 0 }])
})

import { dailyBudget, vacationOn, streak } from '../src/calc.js'
const P = { sex: 'm', weight: 90, height: 175, birthDate: '1993-01-01', goal: 'lose05', onboarded: true }

test('weekend mode keeps the weekly total the same', () => {
  const base = dailyBudget(P)
  const p = { ...P, weekend: { on: true, size: 250, days: [6, 0] } }
  // 2026-11-16 is a Monday
  const week = ['16', '17', '18', '19', '20', '21', '22'].map((d) => dailyBudget(p, `2026-11-${d}`))
  assert.equal(week[5], base + 250)
  assert.ok(Math.abs(week.reduce((a, b) => a + b, 0) - base * 7) <= 30)
})

test('vacation: maintenance while on, normal when paused or over', () => {
  const p = { ...P, vacation: { start: '2026-11-20', end: '2026-11-22' } }
  assert.ok(vacationOn(p, '2026-11-21'))
  assert.ok(dailyBudget(p, '2026-11-21') > dailyBudget(P, '2026-11-21'))
  assert.equal(vacationOn(p, '2026-11-23'), false)
  assert.equal(vacationOn({ ...p, vacation: { ...p.vacation, paused: true } }, '2026-11-21'), false)
})

test('vacation days pause the streak instead of breaking it', () => {
  const entries = [{ day: '2026-11-18', kcal: 1000 }, { day: '2026-11-21', kcal: 1000 }]
  const n = streak(entries, () => 2000, '2026-11-21', true, (k) => k === '2026-11-19' || k === '2026-11-20')
  assert.equal(n, 2)
})

test('weekend mode at the safe minimum still adds to the weekend', () => {
  const p = { ...P, customBudget: 1500, weekend: { on: true, size: 400, days: [6, 0] } }
  assert.equal(dailyBudget(p, '2026-11-21'), 1900)
  assert.equal(dailyBudget(p, '2026-11-17'), 1500)
})

import { guessCat, catOf } from '../src/foodCats.js'
test('food types are guessed from the name, and your fix wins', () => {
  assert.equal(guessCat('Black coffee'), 'drink')
  assert.equal(guessCat('Chicken shawarma wrap'), 'meal')
  assert.equal(guessCat('Banana'), 'fruit')
  assert.equal(guessCat('KitKat 4 finger'), 'snack')
  assert.equal(guessCat('Plain rice'), 'side')
  assert.equal(catOf({ name: 'Black coffee' }, { 'black coffee': 'snack' }), 'snack')
  assert.equal(catOf({ name: 'Mystery', cat: 'drink' }), 'drink')
})

import { usualFor } from '../src/calc.js'
test('your usual: most logged for this meal, not already eaten today', () => {
  const e = [
    { name: 'Black coffee ×2', kcal: 10, meal: 'Breakfast', day: '2026-11-20' },
    { name: 'Black coffee', kcal: 5, meal: 'Breakfast', day: '2026-11-19' },
    { name: 'Oats', kcal: 330, meal: 'Breakfast', day: '2026-11-19' },
  ]
  assert.deepEqual(usualFor(e, 'Breakfast', '2026-11-22', []), { name: 'Black coffee', kcal: 5, cat: undefined, meal: 'Breakfast', times: 2 })
  assert.equal(usualFor(e, 'Breakfast', '2026-11-22', [{ name: 'Black coffee', meal: 'Breakfast' }]), null)
  assert.equal(usualFor(e, 'Lunch', '2026-11-22', []), null)
})

import { streakInfo } from '../src/calc.js'
test('streak is forgiving: one off day in 7 is let go, a second one in the same week resets', () => {
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-10', '2026-11-11']
  const entries = days.map((day) => ({ day, kcal: 1000 }))
  const r = streakInfo(entries, () => 2000, '2026-11-11', true)
  assert.equal(r.days, 10)
  assert.deepEqual(r.covered, ['2026-11-09'])
  const twice = streakInfo(entries.filter((e) => e.day !== '2026-11-11'), () => 2000, '2026-11-12', true)
  assert.equal(twice.days, 0) // 9 let go, 11 off again within 7 days resets
})

import { dueFor } from '../api/remind.js'
test('reminders: lunch only if nothing logged lately, close day only once at bedtime', () => {
  const at = (hhmm) => new Date(`2026-11-22T${hhmm}:00+04:00`)
  const r = { meal: true, close: true, tz: 'Asia/Dubai', name: 'FM', bed: '23:30', left: 500 }
  assert.equal(dueFor(r, at('12:40')).slot, 'lunch')
  assert.equal(dueFor({ ...r, lastFood: at('11:00').getTime() }, at('12:40')), null)
  assert.equal(dueFor({ ...r, sent: { lunch: '2026-11-22' } }, at('12:45')), null)
  assert.equal(dueFor(r, at('15:00')), null)
  assert.equal(dueFor({ ...r, loggedDay: '2026-11-22' }, at('23:35')).slot, 'close')
  assert.equal(dueFor({ ...r, loggedDay: '2026-11-22', closed: '2026-11-22' }, at('23:35')), null)
  assert.equal(dueFor({ ...r, meal: false }, at('12:40')), null)
})
