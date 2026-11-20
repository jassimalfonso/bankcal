// Phones: when the keyboard opens, keep the box you're typing in visible,
// and hide the bottom tab bar while typing so it doesn't sit on top of the field.
const typing = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|range|time|date)$/.test(el.type)))

export function startKeyboardHelp() {
  if (typeof window === 'undefined') return
  const vv = window.visualViewport
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  let full = vv ? vv.height : window.innerHeight // tallest view seen = keyboard closed
  // Only treat the keyboard as open when the screen has really shrunk, so the
  // tab bar never stays hidden after the keyboard goes away.
  const kbOpen = () => {
    if (!vv || !touch) return typing(document.activeElement)
    full = Math.max(full, vv.height)
    return typing(document.activeElement) && vv.height < full - 120
  }
  const sync = () => document.body.classList.toggle('typing', kbOpen())
  const reveal = () => {
    const el = document.activeElement
    if (!typing(el)) return
    const h = vv ? vv.height : window.innerHeight
    const r = el.getBoundingClientRect()
    if (r.bottom > h - 24 || r.top < 60) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  document.addEventListener('focusin', (e) => { if (typing(e.target)) setTimeout(() => { sync(); reveal() }, 320) }) // after the keyboard slides up
  document.addEventListener('focusout', () => setTimeout(sync, 80))
  vv?.addEventListener('resize', () => { sync(); setTimeout(reveal, 50) })
  addEventListener('orientationchange', () => { full = 0; setTimeout(sync, 400) })
}

// One-time hints: true the first time, then never again
export function firstTime(key) {
  try { if (localStorage.getItem('bankcal:hint:' + key)) return false; localStorage.setItem('bankcal:hint:' + key, '1'); return true } catch { return false }
}
