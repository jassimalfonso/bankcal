// Little animated figures that show how each built-in exercise moves: a jointed figure drawn
// from a few points per pose, looping between the poses. No images, no downloads, works offline.
// Coordinates live in a 200 × 150 box; the floor is at y = 136.
//
// A pose: h head, s shoulders, p hips, an/af near/far arm [elbow, hand], ln/lf near/far leg
// [knee, foot]. Front-view poses also give sn/sf (each shoulder) and pn/pf (each hip).
// A far limb that isn't given follows the near one, a few pixels behind it.

import { useEffect, useMemo, useState } from 'react'

const STAND = { h: [100, 30], s: [100, 48], p: [100, 88], an: [[102, 68], [104, 88]], ln: [[100, 112], [100, 135]] }
const PLANK_UP = { h: [150, 90], s: [134, 96], p: [94, 113], an: [[134, 115], [134, 134]], ln: [[72, 123], [50, 133]] }
const front = (o) => ({ front: true, ...o })
const F_STAND = front({ h: [100, 30], sn: [87, 50], sf: [113, 50], pn: [94, 90], pf: [106, 90], an: [[83, 70], [83, 90]], af: [[117, 70], [117, 90]], ln: [[95, 112], [96, 135]], lf: [[105, 112], [104, 135]] })
// halfway through a jumping jack: arms out to the sides, feet part-way apart
const F_OUT = front({ h: [100, 29], sn: [87, 49], sf: [113, 49], pn: [94, 89], pf: [106, 89], an: [[70, 52], [52, 54]], af: [[130, 52], [148, 54]], ln: [[89, 111], [85, 134]], lf: [[111, 111], [115, 134]] })

export const MOVES = {
  squat: { poses: [
    { ...STAND, an: [[108, 62], [124, 60]] },
    { h: [118, 58], s: [110, 74], p: [88, 108], an: [[128, 76], [146, 74]], ln: [[114, 113], [100, 135]] },
  ] },
  goblet: { weights: 'goblet', poses: [
    { ...STAND, an: [[106, 66], [110, 54]] },
    { h: [114, 58], s: [107, 75], p: [88, 108], an: [[116, 92], [120, 78]], ln: [[114, 113], [100, 135]] },
  ] },
  lunge: { poses: [
    { ...STAND, h: [104, 30], s: [104, 48], p: [104, 88], an: [[105, 68], [106, 88]], ln: [[106, 112], [108, 135]], lf: [[102, 112], [100, 135]] },
    { h: [88, 46], s: [88, 64], p: [86, 104], an: [[88, 84], [90, 102]], ln: [[108, 111], [108, 135]], lf: [[78, 127], [55, 133]] },
  ] },
  rdl: { weights: 'hands', poses: [
    { ...STAND, an: [[103, 68], [106, 88]] },
    { h: [140, 70], s: [125, 77], p: [88, 90], an: [[126, 97], [126, 117]], ln: [[101, 112], [100, 135]] },
  ] },
  bridge: { poses: [
    { h: [44, 126], s: [60, 128], p: [100, 128], an: [[78, 131], [96, 133]], ln: [[121, 112], [132, 134]] },
    { h: [44, 126], s: [60, 128], p: [99, 107], an: [[78, 131], [96, 133]], ln: [[124, 110], [132, 134]] },
  ] },
  pushup: { poses: [
    PLANK_UP,
    { h: [150, 116], s: [134, 121], p: [94, 124], an: [[120, 113], [134, 134]], ln: [[72, 129], [50, 133]] },
  ] },
  press: { weights: 'hands', bench: [38, 112, 106], poses: [
    { h: [48, 96], s: [64, 99], p: [104, 101], an: [[64, 79], [64, 59]], ln: [[126, 108], [128, 134]] },
    { h: [48, 96], s: [64, 99], p: [104, 101], an: [[74, 110], [74, 90]], ln: [[126, 108], [128, 134]] },
  ] },
  shoulder: { weights: 'hands', poses: [
    front({ ...F_STAND, an: [[78, 66], [76, 46]], af: [[122, 66], [124, 46]] }),
    front({ ...F_STAND, an: [[82, 30], [86, 10]], af: [[118, 30], [114, 10]] }),
  ] },
  row: { weights: 'near', bench: [112, 172, 102], poses: [
    { h: [136, 78], s: [120, 85], p: [82, 93], an: [[120, 105], [120, 124]], af: [[124, 94], [128, 101]], ln: [[84, 114], [78, 135]], lf: [[100, 112], [106, 135]] },
    { h: [136, 78], s: [120, 85], p: [82, 93], an: [[102, 79], [108, 98]], af: [[124, 94], [128, 101]], ln: [[84, 114], [78, 135]], lf: [[100, 112], [106, 135]] },
  ] },
  curl: { weights: 'hands', poses: [
    { ...STAND, an: [[100, 68], [102, 88]] },
    { ...STAND, an: [[100, 68], [111, 51]] },
  ] },
  hang: { bar: 12, floor: false, dur: 3.4, poses: [
    front({ h: [100, 40], sn: [89, 52], sf: [111, 52], pn: [95, 94], pf: [105, 94], an: [[86, 32], [84, 13]], af: [[114, 32], [116, 13]], ln: [[95, 116], [95, 138]], lf: [[105, 116], [105, 138]] }),
    front({ h: [100, 35], sn: [89, 48], sf: [111, 48], pn: [95, 90], pf: [105, 90], an: [[85, 30], [84, 13]], af: [[115, 30], [116, 13]], ln: [[95, 112], [95, 134]], lf: [[105, 112], [105, 134]] }),
  ] },
  plank: { dur: 3.4, poses: [
    { h: [147, 106], s: [132, 112], p: [92, 118], an: [[132, 133], [152, 134]], ln: [[70, 126], [50, 134]] },
    { h: [147, 104], s: [132, 111], p: [92, 115], an: [[132, 133], [152, 134]], ln: [[70, 125], [50, 134]] },
  ] },
  deadbug: { poses: [
    { h: [54, 125], s: [70, 127], p: [110, 129], an: [[70, 107], [70, 87]], af: [[74, 107], [74, 87]], ln: [[110, 105], [134, 105]], lf: [[114, 105], [138, 105]] },
    { h: [54, 125], s: [70, 127], p: [110, 129], an: [[52, 117], [34, 125]], af: [[74, 107], [74, 87]], ln: [[110, 105], [134, 105]], lf: [[134, 123], [158, 127]] },
  ] },
  jacks: { dur: 1.7, hold: 0.03, poses: [
    F_STAND,
    F_OUT,
    front({ h: [100, 28], sn: [87, 48], sf: [113, 48], pn: [94, 88], pf: [106, 88], an: [[76, 32], [94, 12]], af: [[124, 32], [106, 12]], ln: [[84, 110], [74, 133]], lf: [[116, 110], [126, 133]] }),
    F_OUT,
  ] },
  burpee: { dur: 5, hold: 0.07, poses: [
    { h: [80, 30], s: [80, 48], p: [80, 88], an: [[82, 68], [84, 88]], ln: [[80, 112], [80, 135]] },
    { h: [118, 84], s: [104, 92], p: [74, 113], an: [[108, 113], [112, 133]], ln: [[96, 118], [80, 135]] },
    PLANK_UP,
    { h: [118, 84], s: [104, 92], p: [74, 113], an: [[108, 113], [112, 133]], ln: [[96, 118], [80, 135]] },
    { h: [80, 12], s: [80, 30], p: [80, 70], an: [[84, 11], [88, -8]], ln: [[80, 94], [80, 117]] },
  ] },
  stepup: { bench: [106, 152, 110], poses: [
    { h: [94, 30], s: [94, 48], p: [94, 88], an: [[96, 68], [98, 88]], ln: [[112, 100], [116, 113]], lf: [[94, 112], [94, 135]] },
    { h: [116, 8], s: [116, 26], p: [116, 66], an: [[118, 46], [120, 66]], ln: [[116, 90], [116, 113]], lf: [[120, 88], [124, 110]] },
  ] },
  calf: { dur: 2.2, poses: [
    STAND,
    { h: [100, 22], s: [100, 40], p: [100, 80], an: [[102, 60], [104, 80]], ln: [[100, 104], [102, 128]] },
  ] },
  wallsit: { wall: 68, dur: 3.4, poses: [
    { h: [80, 46], s: [79, 64], p: [79, 102], an: [[90, 84], [102, 97]], ln: [[105, 103], [105, 135]] },
    { h: [80, 45], s: [79, 63], p: [79, 102], an: [[90, 83], [102, 97]], ln: [[105, 103], [105, 135]] },
  ] },
  sumo: { weights: 'near', poses: [
    front({ h: [100, 30], sn: [87, 50], sf: [113, 50], pn: [92, 90], pf: [108, 90], an: [[90, 70], [99, 88]], af: [[110, 70], [101, 88]], ln: [[84, 112], [76, 135]], lf: [[116, 112], [124, 135]] }),
    front({ h: [100, 52], sn: [87, 72], sf: [113, 72], pn: [92, 110], pf: [108, 110], an: [[90, 92], [99, 110]], af: [[110, 92], [101, 110]], ln: [[72, 114], [76, 135]], lf: [[128, 114], [124, 135]] }),
  ] },
  dip: { bench: [66, 110, 94], poses: [
    { h: [114, 44], s: [112, 62], p: [120, 98], an: [[110, 80], [108, 98]], ln: [[146, 102], [168, 135]] },
    { h: [116, 62], s: [114, 80], p: [122, 114], an: [[98, 86], [108, 98]], ln: [[148, 114], [168, 135]] },
  ] },
  triceps: { weights: 'near', poses: [
    { ...STAND, an: [[102, 28], [102, 8]] },
    { ...STAND, an: [[102, 28], [86, 34]] },
  ] },
  lateral: { weights: 'hands', poses: [
    F_STAND,
    front({ ...F_STAND, an: [[70, 52], [52, 54]], af: [[130, 52], [148, 54]] }),
  ] },
  bentrow: { weights: 'hands', poses: [
    { h: [140, 70], s: [125, 77], p: [88, 90], an: [[126, 97], [126, 117]], ln: [[101, 112], [100, 135]] },
    { h: [140, 70], s: [125, 77], p: [88, 90], an: [[108, 72], [116, 92]], ln: [[101, 112], [100, 135]] },
  ] },
  superman: { poses: [
    { h: [154, 124], s: [138, 128], p: [100, 130], an: [[156, 131], [174, 132]], ln: [[76, 131], [52, 132]] },
    { h: [154, 110], s: [138, 119], p: [100, 130], an: [[156, 110], [174, 104]], ln: [[76, 124], [52, 115]] },
  ] },
  pullup: { bar: 12, floor: false, poses: [
    front({ h: [100, 40], sn: [89, 52], sf: [111, 52], pn: [95, 94], pf: [105, 94], an: [[86, 32], [84, 13]], af: [[114, 32], [116, 13]], ln: [[95, 116], [95, 138]], lf: [[105, 116], [105, 138]] }),
    front({ h: [100, 6], sn: [89, 24], sf: [111, 24], pn: [95, 66], pf: [105, 66], an: [[76, 32], [84, 13]], af: [[124, 32], [116, 13]], ln: [[95, 88], [95, 110]], lf: [[105, 88], [105, 110]] }),
  ] },
  crunch: { poses: [
    { h: [54, 125], s: [70, 127], p: [110, 129], an: [[62, 117], [54, 113]], ln: [[128, 108], [142, 134]] },
    { h: [64, 104], s: [75, 116], p: [110, 129], an: [[68, 104], [62, 96]], ln: [[128, 108], [142, 134]] },
  ] },
  sideplank: { dur: 3.4, poses: [
    { h: [46, 98], s: [60, 110], p: [100, 122], an: [[60, 133], [78, 134]], af: [[80, 106], [98, 114]], ln: [[124, 128], [148, 134]], lf: [[124, 126], [148, 131]] },
    { h: [46, 97], s: [60, 109], p: [100, 118], an: [[60, 133], [78, 134]], af: [[80, 103], [98, 110]], ln: [[124, 126], [148, 134]], lf: [[124, 124], [148, 131]] },
  ] },
  legraise: { poses: [
    { h: [54, 125], s: [70, 127], p: [110, 129], an: [[88, 131], [104, 133]], ln: [[134, 127], [158, 126]] },
    { h: [54, 125], s: [70, 127], p: [110, 129], an: [[88, 131], [104, 133]], ln: [[111, 105], [112, 81]] },
  ] },
  birddog: { poses: [
    { h: [144, 94], s: [128, 100], p: [88, 100], an: [[128, 117], [128, 134]], ln: [[88, 134], [66, 134]] },
    { h: [144, 94], s: [128, 100], p: [88, 100], an: [[128, 117], [128, 134]], af: [[146, 98], [164, 96]], ln: [[88, 134], [66, 134]], lf: [[66, 100], [44, 100]] },
  ] },
  climbers: { dur: 1, hold: 0.05, poses: [
    { ...PLANK_UP, ln: [[114, 116], [100, 132]], lf: [[72, 123], [50, 133]] },
    { ...PLANK_UP, ln: [[72, 123], [50, 133]], lf: [[114, 116], [100, 132]] },
  ] },
  highknees: { dur: 0.9, hold: 0.05, poses: [
    { ...STAND, an: [[92, 66], [100, 82]], af: [[110, 64], [116, 50]], ln: [[120, 88], [120, 112]], lf: [[100, 112], [100, 135]] },
    { ...STAND, an: [[110, 64], [116, 50]], af: [[92, 66], [100, 82]], ln: [[100, 112], [100, 135]], lf: [[120, 88], [120, 112]] },
  ] },
}

const full = (q) => {
  const s = q.s ?? [(q.sn[0] + q.sf[0]) / 2, (q.sn[1] + q.sf[1]) / 2]
  const p = q.p ?? [(q.pn[0] + q.pf[0]) / 2, (q.pn[1] + q.pf[1]) / 2]
  const back = (pts, dx) => pts.map(([x, y]) => [x + dx, y - 1])
  return { h: q.h, s, p, sn: q.sn ?? s, sf: q.sf ?? [s[0] + 3, s[1] - 1], pn: q.pn ?? p, pf: q.pf ?? [p[0] + 3, p[1] - 1], an: q.an, af: q.af ?? back(q.an, 4), ln: q.ln, lf: q.lf ?? back(q.ln, 5) }
}
const pts = (...a) => a.map(([x, y]) => `${x},${y}`).join(' ')

export const hasMove = (id) => !!MOVES[id]

const KEYS = ['h', 's', 'p', 'sn', 'sf', 'pn', 'pf']
const LIMBS = ['an', 'af', 'ln', 'lf']
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const blend = (a, b, t) => {
  const o = {}
  for (const k of KEYS) o[k] = mix(a[k], b[k], t)
  for (const k of LIMBS) o[k] = a[k].map((pt, i) => mix(pt, b[k][i], t))
  return o
}
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

export default function Move({ id, label, frame }) {
  const m = MOVES[id]
  const P = useMemo(() => (m ? m.poses.map(full) : []), [m])
  const n = P.length
  const still = frame != null || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [q, setQ] = useState(() => P[frame ?? 0])
  // each pose is held for a moment, then eases into the next, and back round to the first
  useEffect(() => {
    if (still || n < 2) { setQ(P[frame ?? 0]); return }
    const dur = (m.dur ?? 2.8) * 1000, hold = m.hold ?? 0.16, slot = 1 / n
    let raf = 0, t0 = 0
    const tick = (now) => {
      if (!t0) t0 = now
      const u = ((now - t0) % dur) / dur
      const i = Math.min(n - 1, Math.floor(u / slot))
      const within = (u - i * slot) / slot // 0..1 inside this pose's slot
      const glide = Math.max(0, (within - hold / slot) / (1 - hold / slot))
      setQ(blend(P[i], P[(i + 1) % n], ease(glide)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [P, still, frame]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!m || !q) return null
  const isFront = !!m.poses[0].front
  const far = isFront ? 'mv-limb' : 'mv-far' // side views: the far arm and leg sit back a little
  const hands = m.weights === 'hands' ? ['an', 'af'] : m.weights === 'near' || m.weights === 'goblet' ? ['an'] : []
  const upright = m.weights === 'goblet'
  const body = (b, ghost) => (
    <g className={ghost ? 'mv-ghost' : undefined}>
      <polyline className={far} points={pts(b.sf, ...b.af)} fill="none" />
      <polyline className={far} points={pts(b.pf, ...b.lf)} fill="none" />
      <polyline className="mv-torso" points={pts(b.s, b.p)} fill="none" />
      {isFront && <polyline className="mv-limb" points={pts(b.sn, b.sf)} fill="none" />}
      {isFront && <polyline className="mv-limb" points={pts(b.pn, b.pf)} fill="none" />}
      <circle className="mv-head" cx={b.h[0]} cy={b.h[1]} r="10.5" />
      <polyline className="mv-limb" points={pts(b.pn, ...b.ln)} fill="none" />
      <polyline className="mv-limb" points={pts(b.sn, ...b.an)} fill="none" />
    </g>
  )
  return (
    <svg className="move" viewBox="0 -14 200 164" role="img" aria-label={label ?? 'How the exercise moves'}>
      {m.floor !== false && <line className="mv-floor" x1="14" y1="140" x2="186" y2="140" />}
      {m.bench && <g className="mv-prop"><line x1={m.bench[0]} y1={m.bench[2] + 5} x2={m.bench[1]} y2={m.bench[2] + 5} /><line className="thin" x1={m.bench[0] + 10} y1={m.bench[2] + 8} x2={m.bench[0] + 10} y2="139" /><line className="thin" x1={m.bench[1] - 10} y1={m.bench[2] + 8} x2={m.bench[1] - 10} y2="139" /></g>}
      {m.bar != null && <g className="mv-prop"><line x1="52" y1={m.bar} x2="148" y2={m.bar} /></g>}
      {m.wall != null && <g className="mv-prop"><line x1={m.wall} y1="20" x2={m.wall} y2="139" /></g>}
      {/* with motion turned off on the phone: the start pose, with the end pose faint behind it */}
      {still && frame == null && n > 1 && body(P[1], true)}
      {body(q)}
      {hands.map((k) => {
        const a = q[k][1]
        return <line key={k} className="mv-weight" x1={upright ? a[0] : a[0] - 8} y1={upright ? a[1] - 8 : a[1]} x2={upright ? a[0] : a[0] + 8} y2={upright ? a[1] + 8 : a[1]} />
      })}
    </svg>
  )
}

// For any exercise, including your own and ones found online: open a video search for it.
export function WatchHow({ name }) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to do ${name} proper form`)}`
  return <a className="watch-how" href={url} target="_blank" rel="noopener noreferrer">▶ Watch how on YouTube</a>
}
