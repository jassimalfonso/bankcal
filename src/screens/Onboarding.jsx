import { useState } from 'react'
import Character, { CHARACTERS } from '../Character'

export const THEMES = ['moss', 'plum', 'sky', 'sun', 'coral', 'teal', 'violet']

export default function Onboarding({ profile, updateProfile }) {
  const [name, setName] = useState(profile.name || '')
  const [character, setCharacter] = useState(profile.character)
  const [theme, setTheme] = useState(profile.theme)
  const [sex, setSex] = useState(profile.sex)
  const [birthDate, setBirth] = useState(profile.birthDate ?? '')
  const [ft, setFt] = useState('')
  const [inch, setInch] = useState('')
  const [weight, setWeight] = useState(profile.weight || '')
  const height = +ft > 0 ? Math.round(((+ft || 0) * 12 + (+inch || 0)) * 2.54) : ''
  const ready = name.trim() && birthDate && height && +weight > 0

  return (
    <div className={`app theme-${theme}`}>
      <div className="onboard">
        <div className="preview"><Character kind={character} size={150} className="bob" /></div>
        <h1>Make it yours</h1>
        <p>Pick a name and a little buddy. They’ll react to how your day is going.</p>

        <label className="field">
          <span>Your name in the app</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Snack Goblin…" aria-label="Your name" maxLength={24} autoComplete="off" />
        </label>

        <h2 className="group-title">Buddy</h2>
        <BuddyGrid value={character} onChange={setCharacter} />

        <h2 className="group-title">Colour</h2>
        <div className="swatches">
          {THEMES.map((t) => (
            <button key={t} className={`swatch theme-${t} ${theme === t ? 'on' : ''}`} onClick={() => setTheme(t)} aria-label={t} />
          ))}
        </div>

        <h2 className="group-title">About you</h2>
        <div className="card form-list">
          <div className="line">
            <span className="line-label">Sex</span>
            <div className="seg">
              <button className={sex === 'm' ? 'on' : ''} onClick={() => setSex('m')}>Male</button>
              <button className={sex === 'f' ? 'on' : ''} onClick={() => setSex('f')}>Female</button>
            </div>
          </div>
          <div className="line">
            <span className="line-label">Birthday</span>
            <input className="date-in" type="date" aria-label="Birthday" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirth(e.target.value)} />
          </div>
          <div className="line">
            <span className="line-label">Height</span>
            <div className="num-row">
              <label className="num-in"><input inputMode="numeric" aria-label="Height, feet" value={ft} onChange={(e) => setFt(e.target.value.replace(/\D/g, '').slice(0, 1))} placeholder="5" /><span>ft</span></label>
              <label className="num-in"><input inputMode="numeric" aria-label="Height, inches" value={inch} onChange={(e) => setInch(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="6" /><span>in</span></label>
            </div>
          </div>
          <div className="line">
            <span className="line-label">Weight</span>
            <label className="num-in"><input inputMode="decimal" aria-label="Weight in kg" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))} placeholder="70" /><span>kg</span></label>
          </div>
        </div>
        <p className="fine">These work out your daily calorie budget. You can change them any time in Settings, and they stay private.</p>

        <button className="btn-primary" disabled={!ready} onClick={() => updateProfile({ name: name.trim(), character, theme, sex, birthDate, height, weight, onboarded: true })}>
          Start my bank
        </button>
        {!ready && <p className="fine center">Fill in your name and the details above to continue.</p>}
      </div>
    </div>
  )
}

export function BuddyGrid({ value, onChange }) {
  return (
    <div className="buddy-grid">
      {CHARACTERS.map((c) => (
        <button key={c.id} className={`buddy-choice ${value === c.id ? 'on' : ''}`} onClick={() => onChange(c.id)} aria-label={c.label} aria-pressed={value === c.id}>
          <Character kind={c.id} size={52} />
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  )
}
