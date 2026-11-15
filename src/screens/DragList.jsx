import { useEffect, useRef, useState } from 'react'

// A list you reorder by holding a row and dragging it (or grabbing the ≡ handle).
// Arrow buttons stay for keyboards and screen readers.
export default function DragList({ items, names, onChange }) {
  const [drag, setDrag] = useState(null) // { from, dy, to }
  const ref = useRef(null)
  const st = useRef({})

  const rowH = () => { const li = ref.current?.querySelector('li'); return li ? li.getBoundingClientRect().height : 56 }
  const begin = (i, y) => { st.current = { ...st.current, active: true, i, y0: y, h: rowH() }; setDrag({ from: i, dy: 0, to: i }); navigator.vibrate?.(12) }
  const down = (i, e, instant) => {
    if (e.target.closest('.lo-btns')) return
    const y = e.clientY
    st.current = { active: false, i, y0: y, id: e.pointerId }
    clearTimeout(st.current.timer)
    if (instant) begin(i, y)
    else st.current.timer = setTimeout(() => begin(i, y), 280)
  }
  const move = (e) => {
    const s = st.current
    if (!s.active) { if (Math.abs(e.clientY - s.y0) > 8) clearTimeout(s.timer); return }
    const max = (items.length - 1 - s.i) * s.h, min = -s.i * s.h
    const dy = Math.max(min, Math.min(max, e.clientY - s.y0))
    setDrag({ from: s.i, dy, to: s.i + Math.round(dy / s.h) })
  }
  const end = () => {
    const s = st.current
    clearTimeout(s.timer)
    if (!s.active) return
    s.active = false
    setDrag((d) => {
      if (d && d.to !== d.from) {
        const next = [...items]
        next.splice(d.to, 0, next.splice(d.from, 1)[0])
        setTimeout(() => onChange(next), 0)
      }
      return null
    })
  }
  // while dragging, stop the page from scrolling under the finger
  useEffect(() => {
    const el = ref.current
    const block = (e) => { if (st.current.active) e.preventDefault() }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [])
  const swap = (i, d) => { const next = [...items]; [next[i], next[i + d]] = [next[i + d], next[i]]; onChange(next) }

  return (
    <ol className={`card layout-list drag-list ${drag ? 'dragging' : ''}`} ref={ref} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end}>
      {items.map((id, i) => {
        let style
        if (drag) {
          const h = st.current.h
          if (i === drag.from) style = { transform: `translateY(${drag.dy}px) scale(1.02)`, zIndex: 2, transition: 'none' }
          else if (drag.from < drag.to && i > drag.from && i <= drag.to) style = { transform: `translateY(${-h}px)` }
          else if (drag.from > drag.to && i < drag.from && i >= drag.to) style = { transform: `translateY(${h}px)` }
        }
        return (
          <li key={id} style={style} className={drag?.from === i ? 'lifted' : ''} onPointerDown={(e) => down(i, e, false)}>
            <span className="grip" onPointerDown={(e) => { e.stopPropagation(); down(i, e, true) }} aria-hidden="true">≡</span>
            <span className="lo-name">{names[id]}</span>
            <span className="lo-btns">
              <button onClick={() => swap(i, -1)} disabled={i === 0} aria-label={`Move ${names[id]} up`}>↑</button>
              <button onClick={() => swap(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${names[id]} down`}>↓</button>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
