// Press-and-hold shortcuts. Every one is an extra: the plain tap still does what it always did.
import { useEffect, useRef, useState } from 'react'

const stopMenu = (e) => e.preventDefault()
const buzz = (ms) => { try { navigator.vibrate?.(ms) } catch { /* not supported (iPhone) */ } }

// A hold often opens something right under the finger (a sheet, a menu). The phone's own long-press
// would then select text in it and leave the page stuck in selection mode. So from the moment a hold
// fires until the finger lifts, nothing on the page can be selected and the long-press menu is off.
let guardOffTimer = null
const noMenu = (e) => e.preventDefault()
const clearSelection = () => { try { window.getSelection()?.removeAllRanges() } catch { /* ignore */ } }
function guardOn() {
  clearTimeout(guardOffTimer)
  document.body.classList.add('holding')
  document.addEventListener('contextmenu', noMenu, true)
  document.addEventListener('selectstart', noMenu, true)
  clearSelection()
  // the finger may lift over something else entirely, so listen on the whole page
  const lift = () => { window.removeEventListener('pointerup', lift, true); window.removeEventListener('pointercancel', lift, true); window.removeEventListener('touchend', lift, true); guardOff() }
  window.addEventListener('pointerup', lift, true); window.addEventListener('pointercancel', lift, true); window.addEventListener('touchend', lift, true)
  guardOffTimer = setTimeout(guardOff, 8000) // never leave the page unselectable
}
function guardOff() {
  clearTimeout(guardOffTimer)
  // a moment later, so a long-press that lands just after the finger lifts is still ignored
  guardOffTimer = setTimeout(() => {
    document.body.classList.remove('holding')
    document.removeEventListener('contextmenu', noMenu, true)
    document.removeEventListener('selectstart', noMenu, true)
    clearSelection()
  }, 350)
}

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
      st.current = { x: e.clientX, y: e.clientY, fired: false, t: setTimeout(() => { st.current.fired = true; st.current.t = null; guardOn(); buzz(12); cb.current?.() }, ms) }
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
      onPointerDown={(e) => { if (e.button) return; st.current.done = false; setOn(true); clearTimeout(st.current.t); st.current.t = setTimeout(() => { st.current.done = true; setOn(false); guardOn(); buzz(20); onConfirm() }, ms) }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={stopMenu}
      onClick={(e) => { if (st.current.done) { st.current.done = false; return } if (e.detail === 0) onConfirm(); else onTap?.() }}>
      <span>{children}</span>
    </button>
  )
}
