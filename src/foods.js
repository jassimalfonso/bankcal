// Built-in food list: works offline. Typical single servings in the UAE;
// values are rounded estimates — adjust the number before you save if needed.
export const FOODS = [
  // Arabic & Levantine
  ['Chicken shawarma wrap', '1 wrap', 550], ['Beef shawarma wrap', '1 wrap', 600], ['Chicken shawarma plate', '1 plate', 850],
  ['Falafel wrap', '1 wrap', 480], ['Falafel', '4 pieces', 230], ['Hummus', '100 g', 170], ['Moutabal', '100 g', 130],
  ['Tabbouleh', '1 bowl', 150], ['Fattoush', '1 bowl', 200], ['Manakish zaatar', '1 piece', 450], ['Manakish cheese', '1 piece', 520],
  ['Chicken machboos', '1 plate', 750], ['Lamb mandi', '1 plate', 900], ['Chicken mandi', '1 plate', 800], ['Chicken biryani', '1 plate', 800],
  ['Mixed grill', '1 plate', 950], ['Shish tawook', '1 skewer', 220], ['Kofta kebab', '2 skewers', 400], ['Grilled hammour', '1 fillet', 300],
  ['Arabic bread', '1 round', 170], ['Luqaimat', '5 pieces', 300], ['Kunafa', '1 slice', 450], ['Umm Ali', '1 bowl', 480],
  ['Dates (small)', '3 pieces', 70], ['Medjool dates', '2 pieces', 135], ['Laban', '1 cup', 120], ['Karak chai', '1 cup', 180], ['Arabic coffee', '1 cup', 5],
  // Indian & Pakistani
  ['Butter chicken + rice', '1 plate', 850], ['Dal tadka + rice', '1 plate', 600], ['Chicken tikka', '6 pieces', 300], ['Paratha', '1 piece', 260],
  ['Chapati', '1 piece', 110], ['Samosa', '1 piece', 260], ['Masala dosa', '1 piece', 400], ['Idli', '2 pieces', 120], ['Pani puri', '6 pieces', 250],
  // Filipino
  ['Chicken adobo + rice', '1 plate', 700], ['Pork sisig + rice', '1 plate', 850], ['Pancit canton', '1 plate', 500], ['Lumpia', '3 pieces', 250],
  ['Sinigang', '1 bowl', 250], ['Tapsilog', '1 plate', 800], ['Longsilog', '1 plate', 850], ['Halo-halo', '1 glass', 450], ['Garlic rice', '1 cup', 280],
  ['Pork adobo + rice', '1 plate', 800], ['Adobong kangkong', '1 serving', 120], ['Pork sinigang + rice', '1 plate', 600], ['Bulalo', '1 bowl', 550],
  ['Kare-kare + rice', '1 plate', 850], ['Lechon kawali', '150 g', 600], ['Crispy pata', '1 serving (shared, 1/4)', 650], ['Chicken inasal + rice', '1 plate', 700],
  ['Pancit bihon', '1 plate', 400], ['Pancit palabok', '1 plate', 500], ['Arroz caldo', '1 bowl', 350], ['Lugaw', '1 bowl', 250],
  ['Tocilog', '1 plate', 800], ['Bangsilog', '1 plate', 650], ['Cornsilog', '1 plate', 650], ['Hotsilog', '1 plate', 700],
  ['Bistek tagalog + rice', '1 plate', 650], ['Chicken tinola', '1 bowl', 300], ['Pinakbet', '1 serving', 180], ['Menudo + rice', '1 plate', 650],
  ['Kaldereta + rice', '1 plate', 750], ['Laing', '1 serving', 300], ['Bicol express + rice', '1 plate', 750], ['Dinuguan + rice', '1 plate', 600],
  ['Lumpiang shanghai', '5 pieces', 300], ['Lumpiang sariwa', '1 roll', 220], ['Fish fillet (lapu-lapu) + rice', '1 plate', 550],
  ['Pandesal', '2 pieces', 240], ['Ensaymada', '1 piece', 350], ['Spanish bread', '1 piece', 200], ['Bibingka', '1 piece', 300],
  ['Puto', '3 pieces', 220], ['Kutsinta', '3 pieces', 180], ['Turon', '1 piece', 220], ['Banana cue', '1 stick', 250],
  ['Leche flan', '1 slice', 250], ['Ube halaya', '100 g', 260], ['Taho', '1 cup', 200], ['Buko juice', '1 glass', 60],
  ['Okoy (shrimp fritter)', '2 pieces', 300], ['Tortang talong', '1 piece', 220], ['Tortang talong + rice', '1 plate', 450],
  ['Tortang giniling', '1 piece', 280], ['Tortang alamang', '1 piece', 200], ['Lomi', '1 bowl', 550], ['Lomi overload (with toppings)', '1 big bowl', 850],
  ['Batchoy (La Paz)', '1 bowl', 480], ['Mami', '1 bowl', 420], ['Sotanghon soup', '1 bowl', 300], ['Pancit malabon', '1 plate', 550],
  ['Pancit habhab', '1 serving', 400], ['Pancit lomi guisado', '1 plate', 600], ['Miki bihon', '1 plate', 480], ['Spaghetti (Filipino sweet)', '1 plate', 500],
  ['Chopsuey', '1 serving', 180], ['Ginisang ampalaya', '1 serving', 150], ['Ginisang monggo', '1 bowl', 280], ['Ginataang kalabasa at sitaw', '1 serving', 250],
  ['Ginataang tilapia', '1 serving', 350], ['Paksiw na isda', '1 serving', 250], ['Sinigang na hipon', '1 bowl', 220], ['Sinigang na bangus', '1 bowl', 280],
  ['Pinangat', '1 serving', 300], ['Tinolang tahong', '1 bowl', 220], ['Nilaga (pork or beef)', '1 bowl', 400], ['Pochero', '1 bowl', 450],
  ['Afritada (chicken)', '1 serving', 350], ['Mechado', '1 serving', 420], ['Chicken curry (Filipino)', '1 serving', 420], ['Humba', '1 serving', 550],
  ['Pork binagoongan', '1 serving', 550], ['Lechon (roast pork)', '150 g', 600], ['Lechon manok', '1/4 chicken', 400], ['Liempo (grilled)', '150 g', 580],
  ['Pork BBQ skewer', '1 stick', 180], ['Isaw', '3 sticks', 150], ['Kwek-kwek', '5 pieces', 250], ['Fishball', '10 pieces', 150],
  ['Tokneneng', '3 pieces', 220], ['Dynamite (cheese chili lumpia)', '3 pieces', 270], ['Calamares', '1 serving', 350],
  ['Kamote cue', '1 stick', 250], ['Maruya (banana fritter)', '1 piece', 200], ['Proben', '1 cup', 280], ['Chicken skin (fried)', '1 cup', 400],
  ['Balut', '1 egg', 190], ['Penoy', '1 egg', 160], ['Cheese sticks (lumpia)', '3 pieces', 240], ['Lumpiang toge', '1 piece', 180],
  ['Siomai rice', '1 serving', 450], ['Betamax (grilled blood)', '2 sticks', 120], ['Adidas (chicken feet)', '3 sticks', 200], ['Hotdog on stick', '1 piece', 220],
  ['Fried siomai', '4 pieces', 260], ['Squid balls', '10 pieces', 180], ['Kikiam', '5 pieces', 220], ['Corndog (Korean style)', '1 piece', 350], ['Siomai', '4 pieces', 200], ['Siopao asado', '1 piece', 320], ['Siopao bola-bola', '1 piece', 340],
  ['Embutido', '2 slices', 280], ['Hamonado / tocino', '100 g', 330], ['Longganisa', '2 pieces', 300], ['Skinless longganisa', '3 pieces', 280],
  ['Corned beef (ginisa)', '1 serving', 300], ['Daing na bangus', '1/2 fish', 380], ['Fried tilapia', '1 piece', 280], ['Tuyo', '3 pieces', 150],
  ['Sardinas with egg', '1 serving', 250], ['Fried egg', '1 egg', 90], ['Sinangag (garlic rice)', '1 cup', 280], ['White rice', '1 cup', 205],
  ['Kinilaw', '1 serving', 180], ['Sisig (bangus)', '1 serving', 380], ['Chicharon', '30 g', 160], ['Chicharon bulaklak', '50 g', 300],
  ['Dinakdakan', '1 serving', 450], ['Papaitan', '1 bowl', 350], ['Kare-kare (oxtail)', '1 serving', 600], ['Kaldereta (goat)', '1 serving', 450],
  ['Champorado', '1 bowl', 320], ['Goto', '1 bowl', 330], ['Palabok (Jollibee)', '1 serving', 470], ['Pansit canton (instant)', '1 pack', 310],
  ['Lucky Me Pancit Canton', '1 pack', 310], ['Cup noodles (Filipino)', '1 cup', 280], ['Ensaladang talong', '1 serving', 80], ['Atchara', '2 tbsp', 30],
  ['Biko', '1 slice', 280], ['Suman', '1 piece', 180], ['Maja blanca', '1 slice', 200], ['Cassava cake', '1 slice', 280], ['Buko pandan', '1 cup', 300],
  ['Mais con yelo', '1 glass', 300], ['Sago at gulaman', '1 glass', 180], ['Palitaw', '3 pieces', 200], ['Polvoron', '2 pieces', 140], ['Hopia', '1 piece', 180],
  ['Mamon', '1 piece', 170], ['Pianono', '1 slice', 200], ['Brazo de Mercedes', '1 slice', 260], ['Ube cake', '1 slice', 350], ['Cheese ensaymada', '1 piece', 380],
  ['Kakanin platter', '1 serving', 350], ['Puto bumbong', '1 serving', 280], ['Fruit salad (Filipino)', '1 cup', 280], ['Mango float', '1 slice', 400],
  ['Calamansi juice', '1 glass', 90], ['Tsokolate (tablea)', '1 cup', 200], ['Kapeng barako with sugar', '1 cup', 50], ['3-in-1 coffee', '1 sachet', 100],
  ['Greenwich pizza slice', '1 slice', 280], ['Chowking siopao', '1 piece', 320], ['Chowking halo-halo', '1 serving', 470], ['Goldilocks polvoron', '1 piece', 80],
  // Starbucks (grande = 473 ml unless noted; published values, which vary a little by country)
  ['Starbucks Caffè Latte, skimmed milk', 'grande', 130], ['Starbucks Caffè Latte, semi-skimmed (2%) milk', 'grande', 190], ['Starbucks Caffè Latte, whole milk', 'grande', 250],
  ['Starbucks Caffè Latte, oat milk', 'grande', 170], ['Starbucks Caffè Latte, almond milk', 'grande', 100], ['Starbucks Iced Latte, skimmed milk', 'grande', 130],
  ['Starbucks Cappuccino, skimmed milk', 'grande', 80], ['Starbucks Cappuccino, semi-skimmed (2%) milk', 'grande', 140], ['Starbucks Flat White, whole milk', 'grande', 220],
  ['Starbucks Americano', 'grande', 15], ['Starbucks Iced Americano', 'grande', 15], ['Starbucks brewed coffee, black (dark roast, Pike Place or blonde)', 'grande', 5],
  ['Starbucks brewed coffee with a splash of skimmed milk', 'grande', 20], ['Starbucks Cold Brew, black', 'grande', 5], ['Starbucks Iced Coffee, sweetened', 'grande', 80],
  ['Starbucks Espresso, double (doppio)', '2 shots', 10], ['Starbucks Doubleshot on Ice (Iced Shaken Espresso), skimmed milk', 'grande', 90],
  ['Starbucks Doubleshot on Ice (Iced Shaken Espresso), semi-skimmed (2%) milk', 'grande', 100], ['Starbucks Brown Sugar Oat Shaken Espresso', 'grande', 120],
  ['Starbucks Caffè Mocha with whipped cream', 'grande', 370], ['Starbucks White Chocolate Mocha', 'grande', 430], ['Starbucks Caramel Macchiato', 'grande', 250],
  ['Starbucks Vanilla Latte', 'grande', 250], ['Starbucks Skinny Vanilla Latte', 'grande', 100], ['Starbucks Chai Tea Latte', 'grande', 240], ['Starbucks Matcha Latte', 'grande', 240],
  ['Starbucks Hot Chocolate with whipped cream', 'grande', 370], ['Starbucks Vanilla Sweet Cream Cold Brew', 'grande', 110],
  ['Starbucks Caramel Frappuccino with whipped cream', 'grande', 380], ['Starbucks Java Chip Frappuccino with whipped cream', 'grande', 440], ['Starbucks Mocha Frappuccino with whipped cream', 'grande', 370],
  ['Starbucks Coffee Frappuccino', 'grande', 230], ['Starbucks Butter Croissant', '1 piece', 260], ['Starbucks Banana Bread', '1 slice', 410], ['Starbucks Blueberry Muffin', '1 piece', 360],
  ['Starbucks Cheese Danish', '1 piece', 290], ['Starbucks Chocolate Chip Cookie', '1 piece', 370], ['Starbucks Egg & Cheese Sandwich', '1 sandwich', 380],
  ['Starbucks Doubleshot Espresso can (ready to drink)', '200 ml can', 140], ['Starbucks Frappuccino bottle (ready to drink)', '250 ml bottle', 190],
  // Coffee shop drinks (any café, medium ≈ 350 ml)
  ['Latte, skimmed milk', 'medium cup', 100], ['Latte, full-fat milk', 'medium cup', 190], ['Cappuccino, skimmed milk', 'medium cup', 70], ['Cappuccino, full-fat milk', 'medium cup', 130],
  ['Flat white', 'small cup', 120], ['Spanish latte', 'medium cup', 250], ['Iced Spanish latte', 'medium cup', 230], ['Mocha', 'medium cup', 290], ['Americano / black coffee', '1 cup', 5],
  ['Espresso', '1 shot', 5], ['Hot chocolate', 'medium cup', 300], ['Matcha latte', 'medium cup', 190], ['Iced caramel latte', 'medium cup', 220], ['Affogato', '1 serving', 150],
  ['Jollibee Chickenjoy + rice', '1 piece', 520], ['Jollibee Jolly Spaghetti', '1 serving', 480], ['Jollibee Yumburger', '1 burger', 290],
  ['Chowking chao fan', '1 serving', 550], ['Mang Inasal PM1', '1 meal', 700], ['Max’s fried chicken', '1/4 chicken', 450],
  // Everyday & international
  ['Plain rice', '1 cup cooked', 205], ['Brown rice', '1 cup cooked', 215], ['Boiled eggs', '2 eggs', 155], ['Fried egg', '1 egg', 90],
  ['Omelette', '2 eggs', 200], ['Eggs & toast', '2 eggs + 2 toast', 420], ['Toast with butter', '2 slices', 250], ['Oats with milk', '1 bowl', 300],
  ['Greek yogurt', '170 g', 150], ['Banana', '1 medium', 105], ['Apple', '1 medium', 95], ['Orange', '1 medium', 60], ['Mango', '1 cup', 100],
  ['Grilled chicken breast', '150 g', 250], ['Chicken caesar salad', '1 bowl', 450], ['Greek salad', '1 bowl', 300], ['Tuna sandwich', '1 sandwich', 400],
  ['Club sandwich', '1 sandwich', 600], ['Cheeseburger', '1 burger', 550], ['Fries', 'medium', 350], ['Pizza margherita', '2 slices', 500],
  ['Pepperoni pizza', '2 slices', 600], ['Spaghetti bolognese', '1 plate', 650], ['Sushi', '8 pieces', 350], ['Chicken noodles', '1 plate', 550],
  ['Fried chicken', '2 pieces', 500], ['Croissant', '1', 270], ['Cappuccino', 'regular', 120], ['Latte', 'regular', 190], ['Iced latte', 'regular', 150],
  ['Black coffee', '1 cup', 5], ['Orange juice', '1 glass', 110], ['Soft drink', '1 can', 140], ['Protein shake', '1 scoop + water', 120],
  ['Mixed nuts', '30 g', 175], ['Dark chocolate', '2 squares', 110], ['Ice cream', '1 scoop', 140], ['Donut', '1', 260], ['Chips', 'small bag', 160],
].map(([name, portion, kcal]) => ({ name, portion, kcal }))

// Words people type that should find the same dish
const ALIASES = { talong: 'eggplant', okoy: 'ukoy', ukoy: 'okoy', pansit: 'pancit', pancit: 'pansit', sinangag: 'garlic rice', longsilog: 'longganisa', siopao: 'bun', dinamita: 'dynamite', dynamite: 'dinamita', sili: 'chili', camote: 'kamote', kamote: 'camote' }
const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// one typo allowed for words of 5+ letters
function close(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

const STOP = new Set(['with', 'and', 'the', 'of', 'in', 'a', 'an', 'on', 'for', 'milk', 'coffee', 'size'])
// common ways of saying the same thing, applied to what was typed
const REWRITE = [
  [/\b(non ?fat|fat ?free|skim(med)?|skinny milk|0 ?%)\b/g, 'skimmed'], [/\bdouble ?shots?\b/g, 'doubleshot'], [/\bfrapp?(e|é)?s?\b/g, 'frappuccino'],
  [/\b(low ?fat|semi ?skim(med)?|2 ?%)\b/g, 'semi skimmed'], [/\b(full ?fat|full cream)\b/g, 'whole'], [/\bcafe latte\b/g, 'caffe latte'], [/\bsbux\b/g, 'starbucks'],
  [/\bchoco\b/g, 'chocolate'], [/\b(medium|16 ?oz)\b/g, 'grande'],
]

// Ranked matches. `strong` is true when every meaningful word typed was found in the name.
export function matchFoods(q, limit = 8) {
  let t = norm(q)
  if (t.length < 2) return []
  const raw = t
  for (const [re, to] of REWRITE) t = t.replace(re, to)
  const all = t.split(' ').filter(Boolean)
  const words = all.filter((w) => !STOP.has(w))
  const use = words.length ? words : all
  return FOODS
    .map((f) => {
      const n = norm(f.name)
      const nw = n.split(' ')
      const hit = (w) => n.includes(w) || (ALIASES[w] && n.includes(ALIASES[w])) || nw.some((x) => close(w, x))
      const hits = use.filter(hit).length
      const strong = hits === use.length
      const score = n.startsWith(raw) ? 1000 : n.includes(raw) ? 900 : strong ? 500 + hits : hits >= 2 || (hits === 1 && use.some((w) => w.length > 3 && hit(w))) ? hits * 10 : 0
      return { f, score, strong }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.f.name.length - b.f.name.length)
    .slice(0, limit)
}

export function searchFoods(q, limit = 8) {
  return matchFoods(q, limit).map((x) => x.f)
}
