// Wraps a pop-up so it can be swiped away (left, right or down) or tapped to dismiss.
// Buttons inside still work as normal. Uses the CSS `translate` property so it doesn't
// fight any `transform` the pop-up already uses for its own animation.
import { useRef, useState } from 'react'

export default function Swipeable({ onGone, className = '', children, ...rest }) {
  const [d, setD] = useState({ x: 0, y: 0, drag: false, out: null })
  const start = useRef(null)

  const down = (e) => {
    if (e.target.closest('button, a, input')) return // let buttons be buttons
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const x = e.clientX - s.x
    const y = Math.max(0, e.clientY - s.y) // only downwards
    setD({ x, y: Math.abs(x) > y ? 0 : y, drag: true, out: null })
  }
  const up = (e) => {
    const s = start.current
    start.current = null
    if (!s) return
    const x = e.clientX - s.x
    const y = e.clientY - s.y
    const moved = Math.hypot(x, y)
    if (moved < 8) return gone(0, 40) // a tap dismisses too
    if (Math.abs(x) > 70) return gone(Math.sign(x) * 480, 0)
    if (y > 50) return gone(0, 220)
    setD({ x: 0, y: 0, drag: false, out: null }) // not far enough: spring back
  }
  const gone = (x, y) => {
    setD({ x, y, drag: false, out: true })
    setTimeout(() => onGone?.(), 180)
  }

  const far = Math.min(1, Math.hypot(d.x, d.y) / 200)
  return (
    <div
      {...rest}
      className={`swipeable ${className}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { start.current = null; setD({ x: 0, y: 0, drag: false, out: null }) }}
      style={{
        translate: `${d.x}px ${d.y}px`,
        opacity: d.out ? 0 : 1 - far * 0.6,
        transition: d.drag ? 'none' : 'translate 0.22s ease, opacity 0.18s ease',
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      {children}
    </div>
  )
}
