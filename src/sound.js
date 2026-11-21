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
  // 👏 quick cheer: clap-clap, clap-clap-clap and a little "yay"
  cheer: [...[0, 0.14, 0.34, 0.46, 0.58].map((t) => [0, t, 0.09, 0.24, 'clap']), [600, 0.56, 0.3, 0.09, 'whoo'], [1568, 0.6, 0.25, 0.08, 'sine']],
  // ❤️ love it: two warm rising notes
  love: [[784, 0, 0.16, 0.16, 'sine'], [1175, 0.12, 0.4, 0.17, 'sine'], [587, 0.12, 0.4, 0.07, 'triangle']],
  // deposit: a coin dropping in the bank
  coin: [[1319, 0, 0.08, 0.15, 'square'], [1976, 0.07, 0.4, 0.14, 'square']],
  // spending: a soft pop
  pop: [[520, 0, 0.09, 0.14, 'sine'], [390, 0.05, 0.1, 0.1, 'sine']],
  // habit ticked: a tiny bright tick
  tick: [[1397, 0, 0.07, 0.12, 'triangle'], [1865, 0.06, 0.16, 0.12, 'triangle']],
  // note sent: a quick "whoosh-ding!"
  send: [[400, 0, 0.16, 0.08, 'whoo'], [988, 0.12, 0.12, 0.15, 'triangle'], [1319, 0.2, 0.3, 0.16, 'triangle'], [2637, 0.24, 0.2, 0.04, 'sine']],
}

let noise = null
let out = null // everything goes through a limiter so loud moments don't crackle
const master = () => { if (!out) { out = ctx.createDynamicsCompressor(); const g = ctx.createGain(); g.gain.value = 0.8; out.connect(g).connect(ctx.destination) } return out }
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
    if (ctx?.state === 'running') { run(name); return }
    // not awake yet: most sounds are asked for inside a tap, so try to wake the sound right now
    waiting = { name, at: Date.now() }
    wake()
  } catch { /* sound is a nice-to-have */ }
}

// Phones keep sound locked until a real tap. iPhones only accept the END of a tap
// (finger lifted / click), so we listen to every kind of touch, and keep listening,
// because iPhones also put the sound back to sleep when the app goes to the background.
function wake() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  try {
    ctx ??= new AC()
    const go = () => { if (ctx.state !== 'running') return; if (waiting && Date.now() - waiting.at < 60000 && soundOn()) { const w = waiting; waiting = null; run(w.name) } else waiting = null }
    if (ctx.state === 'running') go(); else ctx.resume().then(go).catch(() => {})
  } catch { /* ignore */ }
}

export function startSound() {
  if (typeof window === 'undefined') return
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, wake, { passive: true, capture: true })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}) })
}

// For the "Play a sound" button in Settings: says whether this phone let the sound through
export async function testSound() {
  try { wake(); await ctx?.resume() } catch { /* ignore */ }
  if (!ctx) return 'unsupported'
  if (ctx.state !== 'running') return 'blocked'
  run('win')
  return 'ok'
}
