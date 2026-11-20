// Little sounds made on the phone itself (no audio files to download).
// Phones only allow sound after the first tap, so a sound asked for before
// that waits and plays on the first touch.
const KEY = 'bankcal:sound'
export const soundOn = () => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setSoundOn = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* ignore */ } if (on) play('note') }

let ctx = null
let waiting = null // { name, at }

// each note: [frequency Hz, start s, length s, volume, wave]. 'clap' = a hand clap, 'whoo' = a rising cheer.
const chord = (fs, t, d, vol, wave = 'triangle') => fs.map((f) => [f, t, d, vol, wave])
const TUNES = {
  // achievement: "ta-da-da DAAA!" fanfare, a big happy chord, sparkles, a cheer and clapping
  win: [
    ...chord([523, 659], 0, 0.12, 0.16, 'square'), ...chord([523, 659], 0.13, 0.12, 0.16, 'square'), ...chord([523, 659], 0.26, 0.12, 0.16, 'square'),
    ...chord([523, 659, 784, 1047], 0.4, 0.75, 0.15, 'square'), ...chord([262, 392], 0.4, 0.75, 0.16),
    [1568, 0.5, 0.18, 0.07, 'sine'], [2093, 0.6, 0.18, 0.07, 'sine'], [2637, 0.7, 0.18, 0.07, 'sine'], [3136, 0.8, 0.35, 0.07, 'sine'],
    [500, 0.42, 0.5, 0.1, 'whoo'],
    ...[0.45, 0.6, 0.72, 0.85, 0.97, 1.08, 1.2, 1.3, 1.4].map((t, i) => [0, t, 0.09, 0.22 - i * 0.015, 'clap']),
  ],
  // a note arrived: a bouncy "you've got love!" run up the scale with a sparkle
  note: [[659, 0, 0.13, 0.17, 'triangle'], [784, 0.1, 0.13, 0.17, 'triangle'], [1047, 0.2, 0.13, 0.17, 'triangle'], [1319, 0.3, 0.4, 0.18, 'triangle'],
    [659, 0.3, 0.4, 0.08, 'sine'], [2637, 0.36, 0.3, 0.05, 'sine'], [0, 0.3, 0.07, 0.1, 'clap']],
  // note sent: a quick "whoosh-ding!"
  send: [[400, 0, 0.16, 0.08, 'whoo'], [988, 0.12, 0.12, 0.15, 'triangle'], [1319, 0.2, 0.3, 0.16, 'triangle'], [2637, 0.24, 0.2, 0.04, 'sine']],
}

let noise = null
let out = null // everything goes through a limiter so loud moments don't crackle
const master = () => { if (!out) { out = ctx.createDynamicsCompressor(); const g = ctx.createGain(); g.gain.value = 0.8; out.connect(g).connect(master()) } return out }
function run(name) {
  if (import.meta.env.MODE === 'demo') console.log('SOUND', name)
  const now = ctx.currentTime + 0.02
  for (const [f, t, d, vol, wave] of TUNES[name] ?? []) {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now + t)
    if (wave === 'clap') {
      // a clap is a very short burst of hiss around 1.2 kHz
      if (!noise) { noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate); const ch = noise.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1 }
      const n = ctx.createBufferSource(); n.buffer = noise
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100 + Math.random() * 500; bp.Q.value = 0.9
      g.gain.exponentialRampToValueAtTime(vol, now + t + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + d)
      n.connect(bp).connect(g).connect(master())
      n.start(now + t); n.stop(now + t + d + 0.02)
      continue
    }
    const o = ctx.createOscillator()
    if (wave === 'whoo') { o.type = 'sawtooth'; o.frequency.setValueAtTime(f, now + t); o.frequency.exponentialRampToValueAtTime(f * 2.2, now + t + d) } else { o.type = wave; o.frequency.value = f }
    // soften the buzzy waves so they sound like brass, not a buzzer
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = wave === 'square' ? 2600 : wave === 'whoo' ? 1800 : 9000
    g.gain.exponentialRampToValueAtTime(vol, now + t + 0.015)
    g.gain.setValueAtTime(vol, now + t + d * 0.55)
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + d)
    o.connect(lp).connect(g).connect(master())
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
