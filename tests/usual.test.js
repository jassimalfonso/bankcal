import { test } from 'node:test'
import assert from 'node:assert/strict'
import { usualFoods } from '../src/calc.js'

test('logged foods become one serving each, newest first, no repeats', () => {
  const out = usualFoods([{ name: 'Black coffee ×2', kcal: 10 }, { name: 'Black coffee', kcal: 5 }, { name: 'Rice ×½', kcal: 100 }, { name: 'Water', kcal: 0 }])
  assert.deepEqual(out, [{ name: 'Black coffee', kcal: 5 }, { name: 'Rice', kcal: 200 }, { name: 'Water', kcal: 0 }])
})
