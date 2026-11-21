// Food types, for the filter in Log food. Guessed on the phone from the name (instant, free),
// the online search also suggests one, and you can change any of them by hand.
export const CATS = [
  { id: 'meal', e: '🍛', label: 'Meals' },
  { id: 'fruit', e: '🍎', label: 'Fruit & veg' },
  { id: 'snack', e: '🍪', label: 'Snacks & sweets' },
  { id: 'drink', e: '🥤', label: 'Drinks' },
  { id: 'side', e: '🍞', label: 'Sides & extras' },
]
export const catById = Object.fromEntries(CATS.map((c) => [c.id, c]))
export const isCat = (c) => !!catById[c]

const WORDS = {
  drink: 'coffee, latte, cappuccino, americano, espresso, macchiato, mocha, frappe, frappuccino, iced tea, chai, karak, juice, smoothie, shake, milkshake, milk, laban, lassi, water, soda, cola, pepsi, coke, sprite, 7up, fanta, drink, beer, wine, kombucha, yakult, zesty, protein shake, energy, redbull, red bull, gatorade, lemonade, mojito, capp, hot chocolate, cocoa, matcha, boba, bubble tea',
  fruit: 'apple, banana, orange, saging, mango, grape, grapes, watermelon, melon, strawberry, strawberries, berries, blueberry, pineapple, papaya, kiwi, pear, peach, plum, dates, date, fig, figs, pomegranate, guava, lychee, cherry, cherries, avocado, salad, cucumber, carrot, carrots, tomato, tomatoes, lettuce, broccoli, spinach, vegetables, veggies, veg, fruit, fruits, corn, kangkong, ampalaya, pechay, okra, eggplant, sitaw, beans, greens, fattoush, tabbouleh',
  snack: 'banana bread, chocolate, choc, biscuit, biscuits, cookie, cookies, cake, cupcake, brownie, donut, doughnut, ice cream, gelato, chips, crisps, popcorn, candy, sweets, dessert, pudding, leche flan, halo-halo, halo, kunafa, knafeh, baklava, luqaimat, muffin, croissant, pastry, cheesecake, wafer, bar, granola, nuts, almonds, cashews, peanuts, pistachio, crackers, pretzel, kitkat, snickers, mars, twix, oreo, pringles, doritos, lays, jelly, gummy, turon, banana cue, bibingka, puto, kakanin, ensaymada, pandesal, cinnamon roll, pie, tart, waffle, pancake, pancakes, churros',
  side: 'rice, plain rice, garlic rice, bread, toast, roti, chapati, naan, paratha, khubz, pita, bun, fries, french fries, mashed potato, hummus, sauce, dip, ketchup, mayo, mayonnaise, gravy, dressing, butter, cheese slice, egg, boiled egg, fried egg, coleslaw, pickles, olives, oil, ghee, sugar, honey, jam, syrup, creamer',
}
const norm = (t) => ` ${String(t).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `
const LISTS = Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, v.split(', ').map((w) => norm(w).trim())]))

export function guessCat(name) {
  const n = norm(name)
  const has = (w) => n.includes(` ${w} `)
  // a meal that comes "with rice" or "and fries" is still a meal
  if (/\b(meal|combo|plate|platter|bowl|burger|sandwich|wrap|shawarma|biryani|pizza|pasta|noodles|adobo|sinigang|curry|kabsa|machboos|mandi|steak|chicken|beef|lamb|fish|salmon|tuna|shrimp|pork|tapsilog|silog|longganisa|sisig|kare kare|lechon|lumpia|pancit|burrito|taco|sushi|ramen|omelette|oats|oatmeal|overnight oats|porridge|champorado|arroz caldo|lugaw|congee)\b/.test(n) && !/\b(chips|crisps|nuggets? snack)\b/.test(n)) {
    if (/\b(salad)\b/.test(n) && !/\b(chicken|beef|tuna|salmon|shrimp)\b/.test(n)) return 'fruit'
    return 'meal'
  }
  for (const k of ['drink', 'snack', 'fruit', 'side']) if (LISTS[k].some(has)) return k
  return 'meal'
}

// The type to show: your own choice first, then what the food came with, then the guess
export const keyOf = (name) => norm(name).trim().replace(/\s×.*$/, '')
export const catOf = (f, overrides = {}) => overrides[keyOf(f.name)] || (isCat(f.cat) ? f.cat : guessCat(f.name))

// A picture for foods without a photo: the closest food emoji, else the type's emoji
const PICS = [
  ['☕', 'coffee latte cappuccino americano espresso macchiato mocha capp flat white'], ['🧋', 'boba bubble tea milk tea'], ['🍵', 'tea chai karak matcha'],
  ['🥤', 'juice smoothie shake soda cola pepsi coke sprite fanta laban frappe frappuccino'], ['🥛', 'milk lassi yogurt drink'], ['💧', 'water'],
  ['🍌', 'banana saging'], ['🍎', 'apple'], ['🍊', 'orange mandarin'], ['🥭', 'mango'], ['🍇', 'grape grapes'], ['🍉', 'watermelon'], ['🍓', 'strawberry strawberries berries'],
  ['🍍', 'pineapple'], ['🥑', 'avocado'], ['🥗', 'salad fattoush tabbouleh'], ['🥕', 'carrot carrots'], ['🥒', 'cucumber'], ['🌴', 'dates date'],
  ['🍔', 'burger zinger big mac whopper'], ['🍕', 'pizza'], ['🌯', 'shawarma wrap burrito'], ['🌮', 'taco'], ['🥪', 'sandwich sub panini club'], ['🍟', 'fries'],
  ['🍗', 'chicken fried chicken nuggets wings drumstick inasal'], ['🥩', 'steak beef lamb'], ['🐟', 'fish salmon tuna bangus tilapia'], ['🍤', 'shrimp prawn prawns'],
  ['🍜', 'noodles ramen pancit pho laksa mami'], ['🍝', 'pasta spaghetti carbonara lasagna'], ['🍲', 'soup sinigang curry stew kare nilaga tinola bulalo adobo'],
  ['🍛', 'biryani kabsa mandi machboos'], ['🍚', 'rice'], ['🍣', 'sushi'], ['🥟', 'dumpling dumplings siomai gyoza lumpia samosa'], ['🍳', 'egg eggs omelette silog tapsilog'],
  ['🥣', 'oats oatmeal porridge cereal granola champorado lugaw arroz caldo congee'], ['🥞', 'pancake pancakes waffle'], ['🥐', 'croissant pastry'],
  ['🍞', 'bread toast pandesal bun roti chapati naan paratha khubz pita'], ['🍰', 'cake cheesecake slice'], ['🧁', 'cupcake muffin'], ['🍩', 'donut doughnut'],
  ['🍪', 'cookie cookies biscuit biscuits'], ['🍫', 'chocolate choc kitkat snickers mars twix'], ['🍦', 'ice cream gelato soft serve'], ['🍿', 'popcorn'],
  ['🥜', 'nuts almonds cashews peanuts pistachio'], ['🥔', 'chips crisps pringles lays doritos'], ['🧀', 'cheese'], ['🍯', 'honey'], ['🍮', 'flan pudding leche'],
]
const PIC_WORDS = PICS.map(([e, w]) => [e, w.split(' ')])
export function foodEmoji(f, overrides) {
  const n = norm(f.name)
  // the food named first wins: "oats with banana" is oats
  let best = null, at = Infinity
  for (const [e, ws] of PIC_WORDS) for (const w of ws) { const i = n.indexOf(` ${w} `); if (i >= 0 && i < at) { at = i; best = e } }
  if (best) return best
  return catById[catOf(f, overrides)].e
}
