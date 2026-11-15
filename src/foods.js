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

export function searchFoods(q, limit = 6) {
  const t = q.trim().toLowerCase()
  if (t.length < 2) return []
  const words = t.split(/\s+/)
  return FOODS
    .map((f) => {
      const n = f.name.toLowerCase()
      const score = n.startsWith(t) ? 3 : n.includes(t) ? 2 : words.every((w) => n.includes(w)) ? 1 : 0
      return { f, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.f)
}
