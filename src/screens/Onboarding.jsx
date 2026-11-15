import { useState } from 'react'
import Character, { CHARACTERS } from '../Character'

export const THEMES = ['moss', 'plum', 'sky', 'sun']

export default function Onboarding({ profile, updateProfile }) {
  const [name, setName] = useState(profile.name || '')
  const [character, setCharacter] = useState(profile.character)
  const [theme, setTheme] = useState(profile.theme)
  const [sex, setSex] = useState(profile.sex)

  return (
    <div className={`app theme-${theme}`}>
      <div className="onboard">
        <div className="preview"><Character kind={character} size={150} className="bob" /></div>
        <h1>Make it yours</h1>
        <p>Pick a name and a little buddy. They’ll react to how your day is going.</p>

        <label className="field">
          <span>Your name in the app</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Snack Goblin" maxLength={24} autoComplete="off" />
        </label>

        <h2 className="group-title">Buddy</h2>
        <div className="choice-row">
          {CHARACTERS.map((c) => (
            <button key={c.id} className={`choice ${character === c.id ? 'on' : ''}`} onClick={() => setCharacter(c.id)}>
              <Character kind={c.id} size={64} />
              {c.label}
            </button>
          ))}
        </div>

        <h2 className="group-title">Colour</h2>
        <div className="swatches">
          {THEMES.map((t) => (
            <button key={t} className={`swatch theme-${t} ${theme === t ? 'on' : ''}`} onClick={() => setTheme(t)} aria-label={t} />
          ))}
        </div>

        <h2 className="group-title">Body</h2>
        <div className="card form-list">
          <div className="line">
            <span className="line-label">Used for your calorie maths</span>
            <div className="seg">
              <button className={sex === 'm' ? 'on' : ''} onClick={() => setSex('m')}>Male</button>
              <button className={sex === 'f' ? 'on' : ''} onClick={() => setSex('f')}>Female</button>
            </div>
          </div>
        </div>

        <button className="btn-primary" disabled={!name.trim()} onClick={() => updateProfile({ name: name.trim(), character, theme, sex, onboarded: true })}>
          Start my bank
        </button>
      </div>
    </div>
  )
}
