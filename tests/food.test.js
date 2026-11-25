import test from 'node:test'
import assert from 'node:assert/strict'
import { tidyFoods, barcodeFoods, dbFoods } from '../api/food.js'

test('tidyFoods keeps a consistent answer as it is', () => {
  const [f] = tidyFoods([{ name: 'Chicken biryani', portion: '1 plate (400 g)', g: 400, per100: 150, kcal: 600, cat: 'meal' }])
  assert.equal(f.kcal, 600)
  assert.equal(f.per100, 150)
  assert.equal(f.portion, '1 plate (400 g)')
})

test('tidyFoods recomputes a total that disagrees with weight × per-100', () => {
  // a 450 g stew with rice can't be 190 kcal at 95 kcal per 100 g
  const [f] = tidyFoods([{ name: 'Tofu stew with rice', portion: '1 bowl', g: 450, per100: 95, kcal: 190, cat: 'meal' }])
  assert.equal(f.kcal, 428)
  assert.match(f.portion, /450 g/)
})

test('tidyFoods leaves answers without weights alone and drops junk', () => {
  const out = tidyFoods([{ name: 'Mystery', portion: '1 serving', kcal: 250 }, { name: '', kcal: 100 }, { name: 'Huge', kcal: 99999 }, { name: 'Bad weights', kcal: 300, g: -5, per100: 2000 }])
  assert.deepEqual(out.map((x) => [x.name, x.kcal, x.per100]), [['Mystery', 250, undefined], ['Bad weights', 300, undefined]])
})

test('tidyFoods labels drinks in ml and keeps the group', () => {
  const [f] = tidyFoods([{ name: 'Iced latte, large', portion: 'large', g: 470, per100: 40, kcal: 188, cat: 'drink', group: 'size' }])
  assert.match(f.portion, /470 ml/)
  assert.equal(f.group, 'size')
})

const off = (product, status = 1) => async () => ({ ok: true, json: async () => ({ status, product }) })

test('barcodeFoods offers a serving, the whole pack and 100 g', async () => {
  const out = await barcodeFoods('6291003001234', off({ product_name: 'Laban Up', brands: 'Almarai', quantity: '340 ml', product_quantity: 340, serving_size: '200 ml', serving_quantity: 200, nutriments: { 'energy-kcal_100g': 60, 'energy-kcal_serving': 120 } }))
  assert.deepEqual(out.map((x) => [x.portion, x.kcal]), [['1 serving (200 ml)', 120], ['whole pack (340 ml)', 204], ['100 ml', 60]])
  assert.equal(out[0].name, 'Almarai Laban Up')
  assert.equal(out[0].cat, 'drink')
})

test('barcodeFoods converts kJ and copes with a product that has only per-100 g', async () => {
  const out = await barcodeFoods('12345678', off({ product_name: 'Oat biscuits', brands: '', nutriments: { energy_100g: 1883 } }))
  assert.deepEqual(out.map((x) => [x.portion, x.kcal]), [['100 g', 450]])
})

test('barcodeFoods returns nothing for unknown products or bad codes', async () => {
  assert.deepEqual(await barcodeFoods('6291003001234', off(null, 0)), [])
  assert.deepEqual(await barcodeFoods('abc', off({ product_name: 'x' })), [])
  assert.deepEqual(await barcodeFoods('6291003001234', async () => ({ ok: false })), [])
})

test('dbFoods lists label numbers by name, one row per product', async () => {
  let asked = ''
  const fake = async (url) => { asked = url; return { ok: true, json: async () => ({ products: [
    { product_name: 'Laban Up', brands: 'Almarai', quantity: '340 ml', product_quantity: 340, serving_size: '200 ml', serving_quantity: 200, nutriments: { 'energy-kcal_100g': 60, 'energy-kcal_serving': 120 } },
    { product_name: 'Laban Up', brands: 'Almarai', serving_size: '200 ml', serving_quantity: 200, nutriments: { 'energy-kcal_100g': 60, 'energy-kcal_serving': 120 } },
    { product_name: 'Plain Laban', brands: '', nutriments: { 'energy-kcal_100g': 55 } },
    { product_name: '', brands: '', nutriments: {} },
  ] }) } }
  const out = await dbFoods('laban up', fake)
  assert.match(asked, /search_terms=laban%20up/)
  assert.deepEqual(out.map((x) => [x.name, x.kcal]), [['Almarai Laban Up', 120], ['Plain Laban', 55]])
  assert.match(out[1].portion, /^100/)
  assert.deepEqual(await dbFoods('x', async () => ({ ok: false })), [])
})
