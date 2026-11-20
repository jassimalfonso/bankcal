// Phones: when the keyboard opens, keep the box you're typing in visible,
// and hide the bottom tab bar while typing so it doesn't sit on top of the field.
const typing = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|range|time|date)$/.test(el.type)))

export function startKeyboardHelp() {
  if (typeof window === 'undefined') return
  const vv = window.visualViewport
  const reveal = () => {
    const el = document.activeElement
    if (!typing(el)) return
    const h = vv ? vv.height : window.innerHeight
    const r = el.getBoundingClientRect()
    if (r.bottom > h - 24 || r.top < 60) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  document.addEventListener('focusin', (e) => {
    if (!typing(e.target)) return
    document.body.classList.add('typing')
    setTimeout(reveal, 320) // after the keyboard has slid up
  })
  document.addEventListener('focusout', () => setTimeout(() => { if (!typing(document.activeElement)) document.body.classList.remove('typing') }, 60))
  vv?.addEventListener('resize', () => setTimeout(reveal, 50))
}

// One-time hints: true the first time, then never again
export function firstTime(key) {
  try { if (localStorage.getItem('bankcal:hint:' + key)) return false; localStorage.setItem('bankcal:hint:' + key, '1'); return true } catch { return false }
}
