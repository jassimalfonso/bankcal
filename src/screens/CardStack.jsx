import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// The cards on Today, rearranged right where they are.
// Hold a card's title: every card shrinks to a small tile under your finger and you drag it
// straight to its new place. Tap Done (or the page background) to finish.
export default function CardStack({ order, names, icons, render, onChange, arranging, setArranging }) {
  const [drag, setDrag] = useState(null) // { from, dy, to }
  const ref = useRef(null)
  const st = useRef({})

  const pitch = () => {
    const s = ref.current.querySelectorAll('.slot')
    return s.length > 1 ? s[1].getBoundingClientRect().top - s[0].getBoundingClientRect().top : 64
  }
  const startDrag = (i, y, id) => {
    try { ref.current.setPointerCapture(id) } catch { /* pointer already gone */ }
    st.current = { active: true, i, y0: y, h: pitch() }
    setDrag({ from: i, dy: 0, to: i })
  }

  const down = (e) => {
    const slot = e.target.closest('.slot')
    if (!slot) return
    const i = +slot.dataset.i
    if (arranging) { startDrag(i, e.clientY, e.pointerId); return }
    // only a card's title picks it up, so scrolling over the cards never does
    if (!e.target.closest('.group-title, .block-head, .deposits-head') || e.target.closest('.link-btn')) return
    clearTimeout(st.current.timer)
    st.current = {
      x: e.clientX, y: e.clientY,
      timer: setTimeout(() => {
        st.current.pending = { i, y: st.current.y, id: e.pointerId }
        navigator.vibrate?.(12)
        setArranging(true)
      }, 550),
    }
  }
  const move = (e) => {
    const s = st.current
    if (s.active) {
      const dy = Math.max(-s.i * s.h, Math.min((order.length - 1 - s.i) * s.h, e.clientY - s.y0))
      setDrag({ from: s.i, dy, to: s.i + Math.round(dy / s.h) })
    } else if (s.timer && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) {
      clearTimeout(s.timer); s.timer = null
    }
  }
  const end = () => {
    const s = st.current
    clearTimeout(s.timer); s.timer = null
    if (!s.active) { s.pending = null; return }
    s.active = false
    setDrag((d) => {
      if (d && d.to !== d.from) {
        const next = [...order]
        next.splice(d.to, 0, next.splice(d.from, 1)[0])
        setTimeout(() => onChange(next), 0)
      }
      return null
    })
  }

  // Entering arrange mode: the cards have just collapsed, so bring the held tile back
  // under the finger and carry the same touch straight into a drag.
  useLayoutEffect(() => {
    if (!arranging) return
    const p = st.current.pending
    st.current.pending = null
    if (p) {
      const r = ref.current.querySelector(`.slot[data-i="${p.i}"] .slot-tile`).getBoundingClientRect()
      window.scrollBy(0, r.top + r.height / 2 - p.y)
      startDrag(p.i, p.y, p.id)
    } else {
      const top = ref.current.getBoundingClientRect().top
      if (top < 80 || top > innerHeight * 0.5) window.scrollBy(0, top - 120)
    }
  }, [arranging]) // eslint-disable-line react-hooks/exhaustive-deps

  // While holding or dragging, keep the page from scrolling under the finger
  useEffect(() => {
    const el = ref.current
    const block = (e) => { if (st.current.active) e.preventDefault() }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [])
  // any scrolling while a hold is pending cancels it
  useEffect(() => {
    const cancel = () => { if (st.current.timer) { clearTimeout(st.current.timer); st.current.timer = null } }
    addEventListener('scroll', cancel, { passive: true })
    return () => removeEventListener('scroll', cancel)
  }, [])
  useEffect(() => {
    if (!arranging) return
    const key = (e) => { if (e.key === 'Escape') setArranging(false) }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [arranging, setArranging])

  const swap = (i, d) => { const next = [...order]; [next[i], next[i + d]] = [next[i + d], next[i]]; onChange(next) }

  return (
    <div
      className={`cards ${arranging ? 'arranging' : ''} ${drag ? 'dragging' : ''}`} ref={ref}
      onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      onPointerLeave={() => { if (st.current.timer) { clearTimeout(st.current.timer); st.current.timer = null } }}
      onContextMenu={(e) => { if (arranging || st.current.timer) e.preventDefault() }}
    >
      {arranging && <p className="arrange-hint">Drag the cards into the order you like.</p>}
      {order.map((id, i) => {
        let style
        if (drag) {
          const h = st.current.h
          if (i === drag.from) style = { transform: `translateY(${drag.dy}px) scale(1.03)`, zIndex: 3, transition: 'none' }
          else if (drag.from < drag.to && i > drag.from && i <= drag.to) style = { transform: `translateY(${-h}px)` }
          else if (drag.from > drag.to && i < drag.from && i >= drag.to) style = { transform: `translateY(${h}px)` }
        }
        return (
          <div className={`slot ${drag?.from === i ? 'lifted' : ''}`} data-i={i} key={id} style={style}>
            {arranging && (
              <div className="slot-tile">
                <span className="grip" aria-hidden="true">≡</span>
                <span className="st-icon" aria-hidden="true">{icons[id]}</span>
                <span className="st-name">{names[id]}</span>
                <span className="lo-btns" onPointerDown={(e) => e.stopPropagation()}>
                  <button onClick={() => swap(i, -1)} disabled={i === 0} aria-label={`Move ${names[id]} up`}>↑</button>
                  <button onClick={() => swap(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${names[id]} down`}>↓</button>
                </span>
              </div>
            )}
            <div className="slot-body">{render(id)}</div>
          </div>
        )
      })}
      {arranging && <div className="arrange-bar"><button className="btn-primary" onPointerDown={(e) => e.stopPropagation()} onClick={() => setArranging(false)}>Done</button></div>}
    </div>
  )
}
