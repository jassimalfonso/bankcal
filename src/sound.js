// Little sounds made on the phone itself (no audio files to download).
// Phones only allow sound after the first tap, so a sound asked for before
// that waits and plays on the first touch.
const KEY = 'bankcal:sound'
export const soundOn = () => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setSoundOn = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* ignore */ } if (on) play('note') }

let ctx = null
let waiting = null // { name, at }

// each sound: [frequency Hz, start s, length s, volume, wave]
const TUNES = {
  // achievement: a bright rising arpeggio with a sparkle on top
  win: [[523, 0, 0.16, 0.2, 'triangle'], [659, 0.1, 0.16, 0.2, 'triangle'], [784, 0.2, 0.16, 0.2, 'triangle'], [1047, 0.3, 0.5, 0.22, 'triangle'], [2093, 0.34, 0.4, 0.06, 'sine']],
  // a note arrived: two soft bells
  note: [[880, 0, 0.3, 0.16, 'sine'], [1175, 0.13, 0.5, 0.16, 'sine']],
  // note sent: a quick upward pop
  send: [[587, 0, 0.1, 0.14, 'sine'], [880, 0.07, 0.22, 0.14, 'sine']],
}

function run(name) {
  if (import.meta.env.MODE === 'demo') console.log('SOUND', name)
  const now = ctx.currentTime + 0.02
  for (const [f, t, d, vol, wave] of TUNES[name] ?? []) {
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = wave; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, now + t)
    g.gain.exponentialRampToValueAtTime(vol, now + t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + d)
    o.connect(g).connect(ctx.destination)
    o.start(now + t); o.stop(now + t + d + 0.05)
  }
}

export function play(name) {
  if (!soundOn() || typeof window === 'undefined') return
  try {
    if (ctx?.state === 'running') run(name)
    else waiting = { name, at: Date.now() }
  } catch { /* sound is a nice-to-have */ }
}

export function startSound() {
  if (typeof window === 'undefined') return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  const unlock = () => {
    try {
      ctx ??= new AC()
      const go = () => { if (waiting && Date.now() - waiting.at < 60000 && soundOn()) run(waiting.name); waiting = null }
      if (ctx.state === 'running') go(); else ctx.resume().then(go).catch(() => {})
    } catch { /* ignore */ }
  }
  addEventListener('pointerdown', unlock, { passive: true })
  addEventListener('keydown', unlock)
}
