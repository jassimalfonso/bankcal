import { useEffect, useState } from 'react'
import Character from '../Character'
import { useCountUp } from '../motion'

// The tilted calorie card used on the opening page and the daily welcome.
// buddies: list of { kind, theme } that sit on top of the card.
export default function BankCard({ label = 'Today’s balance', value, holder, buddies, children }) {
  const [target, setTarget] = useState(0)
  useEffect(() => { const t = setTimeout(() => setTarget(value ?? 0), 450); return () => clearTimeout(t) }, [value])
  const shown = useCountUp(target, 1200)
  return (
    <div className="si-stage" aria-hidden="true">
      <div className="si-card">
        <div className={`si-buddies n${buddies.length}`}>
          {buddies.map((b) => (
            <span key={b.kind} className={`theme-${b.theme}`}><Character kind={b.kind} size={78} /></span>
          ))}
        </div>
        <span className="si-label">{label}</span>
        <b className="si-balance">{value == null ? '—' : Math.round(shown).toLocaleString('en')}<small>kcal</small></b>
        <div className="si-chip">
          <span className="si-cardname">{holder ?? 'BANKCAL'}</span>
          <span className="si-dots"><i /><i /></span>
        </div>
      </div>
      {children}
    </div>
  )
}
