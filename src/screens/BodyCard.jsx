import { bmiInfo, dayKey } from '../calc'

const toFtIn = (cm) => {
  const t = cm / 2.54
  let ft = Math.floor(t / 12), inch = Math.round(t - ft * 12)
  if (inch === 12) { ft += 1; inch = 0 }
  return `${ft} ft ${inch} in`
}
const addWeeks = (weeks) => { const d = new Date(); d.setDate(d.getDate() + weeks * 7); return dayKey(d) }

// Current BMI, healthy range for your height, and a plain strategy to get there.
export default function BodyCard({ profile, updateProfile, goSetup }) {
  const std = profile.bmiStandard ?? 'who'
  const b = bmiInfo(profile.weight, profile.height, std)
  if (!b) {
    return (
      <div className="card body-card empty">
        <p>Add your height and weight in Settings to see your BMI and healthy range.</p>
        <button className="link-btn" onClick={goSetup}>Open Settings</button>
      </div>
    )
  }
  // pointer position on a 15–35 BMI scale
  const pos = (v) => `${Math.min(100, Math.max(0, ((v - 15) / 20) * 100))}%`
  const tone = b.cat === 'Healthy' ? 'pos' : b.cat === 'Underweight' ? 'warn' : 'neg'

  const setPlan = (target, weeks) => updateProfile({ targetWeight: target, startDate: dayKey(), endDate: addWeeks(weeks) })

  return (
    <div className="card body-card">
      <div className="bmi-top">
        <div>
          <span className="muted">Your BMI</span>
          <b className="bmi-num">{b.bmi}</b>
        </div>
        <span className={`bmi-pill ${tone}`}>{b.cat}</span>
      </div>
      <div className="seg bmi-std">
        <button className={std === 'who' ? 'on' : ''} onClick={() => updateProfile({ bmiStandard: 'who' })}>International</button>
        <button className={std === 'asian' ? 'on' : ''} onClick={() => updateProfile({ bmiStandard: 'asian' })}>Asian</button>
      </div>

      <div className="bmi-scale" aria-hidden="true">
        <span className="band" style={{ left: pos(18.5), width: `calc(${pos(b.top)} - ${pos(18.5)})` }} />
        <span className="pin" style={{ left: pos(b.bmi) }} />
      </div>
      <div className="bmi-ticks"><span>15</span>{b.cuts.map((c) => <span key={c} style={{ left: pos(c) }}>{c}</span>)}<span className="end">35</span></div>

      <p className="bmi-line">
        Healthy weight at {toFtIn(+profile.height)}: <b>{b.low}–{b.high} kg</b>. Ideal (BMI {b.idealBmi}): <b>{b.ideal} kg</b>.
      </p>

      {b.cat === 'Healthy' ? (
        <div className="strategy">
          <b>You’re in the healthy range.</b>
          <ul>
            <li>Keep your daily budget at maintenance, or aim for BMI {b.idealBmi} if you want more margin.</li>
            <li>Stay active: 8,000–10,000 steps a day and 150 minutes of cardio a week.</li>
            <li>Strength train twice a week to keep muscle.</li>
          </ul>
        </div>
      ) : b.cat === 'Underweight' ? (
        <div className="strategy">
          <b>You’re below the healthy range.</b>
          <ul>
            <li>Aim to gain slowly, about 0.25–0.5 kg a week, with a small calorie surplus.</li>
            <li>Strength train twice a week so the gain is muscle, not just fat.</li>
            <li>Talk to a doctor if the weight loss wasn’t planned.</li>
          </ul>
        </div>
      ) : (
        <div className="strategy">
          <b>Strategy: lose {b.toHealthy} kg to reach a healthy BMI</b>
          <small>About {b.weeksToHealthy} weeks at a steady 0.5 kg a week{b.toIdeal > b.toHealthy ? `, or ${b.weeksToIdeal} weeks to BMI ${b.idealBmi}` : ''}.</small>
          <ol>
            <li><b>Eat about 550 kcal under your burn</b> each day. BankCal sets this for you when you pick a plan below.</li>
            <li><b>Walk 8,000–10,000 steps</b> a day. Steps above 3,000 earn calories back.</li>
            <li><b>150 minutes of cardio a week</b>, like 30 minutes on the treadmill 5 days a week.</li>
            <li><b>Strength twice a week</b>: squats, push-ups, dumbbells, dead hang. It keeps muscle while you lose fat.</li>
            <li><b>Protein at every meal</b>, plenty of water, and 7–8 hours of sleep to keep hunger down.</li>
          </ol>
          <div className="plan-btns">
            <button className="btn-primary" onClick={() => setPlan(b.high, b.weeksToHealthy)}>Plan to {b.high} kg (healthy)</button>
            {b.toIdeal > b.toHealthy && <button className="btn-soft" onClick={() => setPlan(b.ideal, b.weeksToIdeal)}>Plan to {b.ideal} kg (ideal)</button>}
          </div>
        </div>
      )}
      <p className="fine">{b.asian ? 'Asian cut-offs follow the WHO expert consultation for Asian populations: healthy 18.5–22.9, increased risk from 23, high risk from 27.5.' : 'International WHO categories: healthy 18.5–24.9, overweight 25–29.9, obese 30+. For people of South, Southeast or East Asian background, the Asian cut-offs may fit better.'} BMI can’t tell muscle from fat, and it isn’t meant for pregnancy or under-18s.</p>
    </div>
  )
}
