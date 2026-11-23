// Press-and-hold shortcuts. Every one is an extra: the plain tap still does what it always did.
import { useEffect, useRef, useState } from 'react'

const stopMenu = (e) => e.preventDefault()
const buzz = (ms) => { try { navigator.vibrate?.(ms) } catch { /* not supported (iPhone) */ } }

// Hold an element for a moment to run onHold. Moving the finger (a scroll or swipe) cancels it,
// and the tap that would follow a hold is swallowed.
export function useHold(onHold, ms = 450) {
  const st = useRef({})
  const cb = useRef(onHold)
  cb.current = onHold
  const clear = () => { clearTimeout(st.current.t); st.current.t = null }
  // the finger is up: swallow the tap that follows a hold, then forget about it
  const up = () => { clear(); const s = st.current; if (s.fired) setTimeout(() => { s.fired = false }, 80) }
  useEffect(() => () => clearTimeout(st.current.t), [])
  if (!onHold) return {}
  return {
    onPointerDown: (e) => {
      if (e.button) return
      clearTimeout(st.current.t)
      st.current = { x: e.clientX, y: e.clientY, fired: false, t: setTimeout(() => { st.current.fired = true; st.current.t = null; buzz(12); cb.current?.() }, ms) }
    },
    onPointerMove: (e) => { const s = st.current; if (s.t && (Math.abs(e.clientX - s.x) > 10 || Math.abs(e.clientY - s.y) > 10)) clear() },
    onPointerUp: up, onPointerLeave: clear, onPointerCancel: up,
    onContextMenu: stopMenu,
    onClickCapture: (e) => { if (st.current.fired) { st.current.fired = false; e.preventDefault(); e.stopPropagation() } },
  }
}

// A button with a hold shortcut (for lists, where a hook per row isn't possible)
export function HoldButton({ onHold, className = '', ...rest }) {
  const h = useHold(onHold)
  return <button {...rest} className={`${className} ${onHold ? 'holdable' : ''}`} {...h} />
}

// Keep a + or − pressed and it keeps counting. A tap still moves one step.
export function useRepeat(fn, disabled) {
  const r = useRef({})
  r.current.fn = fn
  r.current.disabled = disabled
  const stop = () => { clearTimeout(r.current.t); clearInterval(r.current.i); r.current.t = r.current.i = null }
  useEffect(() => () => { clearTimeout(r.current.t); clearInterval(r.current.i) }, [])
  useEffect(() => { if (disabled) stop() }, [disabled]) // eslint-disable-line react-hooks/exhaustive-deps
  return {
    onPointerDown: (e) => {
      if (e.button) return
      stop(); r.current.ran = false
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      r.current.t = setTimeout(() => {
        r.current.ran = true
        r.current.i = setInterval(() => { if (r.current.disabled) stop(); else r.current.fn() }, 110)
      }, 400)
    },
    onPointerUp: stop, onPointerCancel: stop, onLostPointerCapture: stop,
    onContextMenu: stopMenu,
    onClick: () => { if (r.current.ran) { r.current.ran = false; return } r.current.fn() },
  }
}

// A button that only acts after a short hold, filling up while held, so it can't be hit by accident.
// A quick tap shows a hint instead. Keyboard users press Enter as usual.
export function HoldConfirm({ onConfirm, onTap, ms = 650, className = '', children, ...rest }) {
  const [on, setOn] = useState(false)
  const st = useRef({})
  useEffect(() => () => clearTimeout(st.current.t), [])
  const stop = () => { clearTimeout(st.current.t); setOn(false) }
  return (
    <button {...rest} className={`hold-confirm holdable ${on ? 'holding' : ''} ${className}`} style={{ '--hold-ms': `${ms}ms` }}
      onPointerDown={(e) => { if (e.button) return; st.current.done = false; setOn(true); clearTimeout(st.current.t); st.current.t = setTimeout(() => { st.current.done = true; setOn(false); buzz(20); onConfirm() }, ms) }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={stopMenu}
      onClick={(e) => { if (st.current.done) { st.current.done = false; return } if (e.detail === 0) onConfirm(); else onTap?.() }}>
      <span>{children}</span>
    </button>
  )
}
