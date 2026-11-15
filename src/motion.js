// Small motion helpers. All respect "reduce motion" in the phone's settings.
import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Smoothly counts a number to its new value.
export function useCountUp(value, ms = 650) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (value == null || reduced()) { setShown(value); from.current = value; return }
    const start = performance.now(), a = from.current ?? value, b = value
    if (a === b) return
    let raf
    const tick = (t) => {
      const k = Math.min(1, (t - start) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(a + (b - a) * e))
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = b }
  }, [value, ms])
  return shown
}

// Swipe a row left to reveal / trigger delete.
export function useSwipe(onDelete) {
  const [dx, setDx] = useState(0)
  const st = useRef(null)
  const handlers = {
    onTouchStart: (e) => { st.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, lock: null } },
    onTouchMove: (e) => {
      const s = st.current
      if (!s) return
      const mx = e.touches[0].clientX - s.x, my = e.touches[0].clientY - s.y
      if (s.lock == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      if (s.lock === 'x') setDx(Math.min(0, Math.max(-140, mx)))
    },
    onTouchEnd: () => {
      if (dx < -100) { navigator.vibrate?.(15); onDelete() } else setDx(dx < -40 ? -84 : 0)
      st.current = null
    },
  }
  return { dx, setDx, handlers }
}

// Drag a bottom sheet down to close it.
export function useSheetDrag(onClose) {
  const [dy, setDy] = useState(0)
  const st = useRef(null)
  return {
    style: dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined,
    handle: {
      onTouchStart: (e) => { st.current = e.touches[0].clientY },
      onTouchMove: (e) => { if (st.current != null) setDy(Math.max(0, e.touches[0].clientY - st.current)) },
      onTouchEnd: () => { if (dy > 110) onClose(); setDy(0); st.current = null },
    },
  }
}
