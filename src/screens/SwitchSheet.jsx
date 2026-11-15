import { dailyBudget, dayKey, fmt } from '../calc'

export default function SwitchSheet({ state, setActive, onClose }) {
  const today = dayKey()
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Switch profile">
        <div className="grabber" />
        <h2 className="sheet-title">Who’s eating?</h2>
        <div className="who">
          {Object.entries(state.profiles).map(([id, p]) => {
            const b = dailyBudget(p)
            const spent = state.entries.filter((e) => e.pid === id && e.day === today).reduce((a, e) => a + e.kcal, 0)
            return (
              <button key={id} className={`who-card theme-${p.theme} ${state.active === id ? 'on' : ''}`} onClick={() => { setActive(id); onClose() }}>
                <span className="who-emoji">{p.emoji}</span>
                <b>{p.name}</b>
                <small>{b == null ? 'Not set up' : `${fmt(b - spent)} kcal left`}</small>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
