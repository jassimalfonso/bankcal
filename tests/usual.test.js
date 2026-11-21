import { test } from 'node:test'
import assert from 'node:assert/strict'
import { usualFoods } from '../src/calc.js'

test('logged foods become one serving each, newest first, no repeats', () => {
  const out = usualFoods([{ name: 'Black coffee ×2', kcal: 10 }, { name: 'Black coffee', kcal: 5 }, { name: 'Rice ×½', kcal: 100 }, { name: 'Water', kcal: 0 }])
  assert.deepEqual(out, [{ name: 'Black coffee', kcal: 5 }, { name: 'Rice', kcal: 200 }, { name: 'Water', kcal: 0 }])
})

import { dailyBudget, vacationOn, streak } from '../src/calc.js'
const P = { sex: 'male', weight: 90, height: 175, birthDate: '1993-01-01', goal: 'lose05', onboarded: true }

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
