# Cal Bank 🏦

A daily calorie budget that works like a bank account — you get a balance each morning, every meal is a transaction, and the statement tells you whether you saved (deficit) or overspent (surplus).

Two accounts: **👾 Fart Monster** and **🐀 Sewer Butt**.

## Roadmap

| Version | Scope | Status |
|---|---|---|
| v0.1 | Profiles, budget calculator, manual logging, wallet, statement, installable PWA | ✅ |
| v0.2 | Photo → AI calorie estimate (serverless function, API key in Vercel env) | ⏳ |
| v0.3 | Sync both profiles across both phones (Supabase) | ⏳ |

## How the budget is calculated

- **BMR** — Mifflin-St Jeor: `10×kg + 6.25×cm − 5×age (+5 male / −161 female)`
- **Burn/day** — BMR × activity (1.2 / 1.375 / 1.55 / 1.725)
- **Budget** — burn − goal deficit (0 / 275 / 550 kcal), never below 1,500 (male) / 1,200 (female)
- 7,700 kcal ≈ 1 kg body weight (used on the Statement)

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run icons      # regenerate PNG icons from public/icon.svg
```

## Structure

```
src/
  calc.js              budget maths
  store.js             local storage + photo compression
  App.jsx              tabs, sheets, routing
  screens/
    Today.jsx          balance card + today's receipts
    AddSheet.jsx       log food (photo, recent chips, kcal)
    Statement.jsx      7-day statement
    Me.jsx             metrics, activity, goal, avatar
    SwitchSheet.jsx    "Who's eating?"
  styles.css           design tokens + all styles
```

Deploys automatically on Vercel on every push to `main`.
