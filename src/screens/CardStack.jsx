import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// The cards on Today, rearranged right where they are.
// Hold a card's title and the real card lifts under your finger: drag it up or down, the
// other cards make room, and the page scrolls when you reach the top or bottom edge. Let go to drop it.
// (The "Arrange cards" link still offers a compact list, which also shows cards that are hidden.)
export default function CardStack({ order, names, icons, render, onChange, arranging, setArranging }) {
  const [drag, setDrag] = useState(null) // { from, dy, to } in the compact list
  const [lift, setLift] = useState(null) // { from, dy, to, h } while a real card is being dragged
  const live = useRef(null)
  const justDragged = useRef(false)
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

  // ── dragging a real card ──
  const place = () => {
    const L = live.current
    if (!L) return
    const me = L.rects[L.i]
    const shown = L.rects.filter((r) => r.h > 0)
    const lo = shown[0].top - me.top, hi = shown.at(-1).top + shown.at(-1).h - me.h - me.top
    const dy = Math.max(lo, Math.min(hi, L.y - L.y0 + (window.scrollY - L.s0)))
    const top = me.top + dy, bottom = top + me.h
    let to = L.i
    for (let j = L.i + 1; j < L.rects.length; j++) { const r = L.rects[j]; if (r.h > 0 && bottom > r.top + r.h / 2) to = j }
    for (let j = L.i - 1; j >= 0; j--) { const r = L.rects[j]; if (r.h > 0 && top < r.top + r.h / 2) to = j }
    L.to = to
    setLift({ from: L.i, dy, to, h: me.h })
  }
  const loop = () => {
    const L = live.current
    if (!L) return
    // scroll the page when the finger is near the top or bottom edge
    const edgeTop = 110, edgeBottom = window.innerHeight - 150
    const v = L.y < edgeTop ? -Math.min(16, (edgeTop - L.y) / 5) : L.y > edgeBottom ? Math.min(16, (L.y - edgeBottom) / 5) : 0
    if (v) { window.scrollBy(0, v); place() }
    L.raf = requestAnimationFrame(loop)
  }
  const beginLift = (i, y, id) => {
    try { ref.current.setPointerCapture(id) } catch { /* pointer already gone */ }
    const rects = [...ref.current.querySelectorAll(':scope > .slot')].map((el) => { const r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, h: r.height } })
    if (!(rects[i]?.h > 0)) return
    live.current = { i, y0: y, y, s0: window.scrollY, rects, to: i }
    try { navigator.vibrate?.(12) } catch { /* not allowed */ }
    setLift({ from: i, dy: 0, to: i, h: rects[i].h })
    live.current.raf = requestAnimationFrame(loop)
  }
  const endLift = () => {
    const L = live.current
    if (!L) return false
    cancelAnimationFrame(L.raf)
    live.current = null
    justDragged.current = true
    setTimeout(() => { justDragged.current = false }, 350)
    setLift(null)
    if (L.to !== L.i) {
      const next = [...order]
      next.splice(L.to, 0, next.splice(L.i, 1)[0])
      onChange(next)
    }
    return true
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
      timer: setTimeout(() => { st.current.timer = null; beginLift(i, st.current.y, e.pointerId) }, 450),
    }
  }
  const move = (e) => {
    if (live.current) { live.current.y = e.clientY; place(); return }
    const s = st.current
    if (s.active) {
      const dy = Math.max(-s.i * s.h, Math.min((order.length - 1 - s.i) * s.h, e.clientY - s.y0))
      setDrag({ from: s.i, dy, to: s.i + Math.round(dy / s.h) })
    } else if (s.timer && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) {
      clearTimeout(s.timer); s.timer = null
    }
  }
  const end = () => {
    if (endLift()) return
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
    const block = (e) => { if (st.current.active || live.current) e.preventDefault() }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [])
  // any scrolling while a hold is pending cancels it
  useEffect(() => {
    const cancel = () => { if (st.current.timer && !live.current) { clearTimeout(st.current.timer); st.current.timer = null } }
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
      className={`cards ${arranging ? 'arranging' : ''} ${drag ? 'dragging' : ''} ${lift ? 'lifting' : ''}`} ref={ref}
      onClickCapture={(e) => { if (justDragged.current) { e.stopPropagation(); e.preventDefault() } }}
      onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      onPointerLeave={() => { if (st.current.timer) { clearTimeout(st.current.timer); st.current.timer = null } }}
      onContextMenu={(e) => { if (arranging || st.current.timer || live.current) e.preventDefault() }}
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
        if (lift) {
          if (i === lift.from) style = { transform: `translateY(${lift.dy}px)` }
          else if (lift.from < lift.to && i > lift.from && i <= lift.to) style = { transform: `translateY(${-lift.h}px)` }
          else if (lift.from > lift.to && i < lift.from && i >= lift.to) style = { transform: `translateY(${lift.h}px)` }
        }
        return (
          <div className={`slot ${drag?.from === i ? 'lifted' : ''} ${lift?.from === i ? 'held' : ''}`} data-i={i} key={id} style={style}>
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
