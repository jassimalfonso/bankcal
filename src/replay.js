// The progress replay: a short video that plays your days back one by one, drawn on a canvas and
// recorded on the phone itself (nothing is uploaded). No calories in it; weight change is opt-in.
import { alpha, font, mix, rng, rr, sticker } from './shareCard'

export const VW = 720, VH = 1280
export const SECONDS = 9
const INK = '#26262b'
const TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']

export function videoType() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null
  return TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? null
}

const clamp = (v) => Math.max(0, Math.min(1, v))
const ease = (v) => 1 - Math.pow(1 - clamp(v), 3)
const pop = (v) => { const x = clamp(v); return x === 1 ? 1 : 1 + 0.28 * Math.sin(x * Math.PI) * (1 - x) - Math.pow(1 - x, 3) } // small overshoot
const dateOf = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const short = (n) => (n >= 100000 ? `${Math.round(n / 1000)}k` : n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString('en-GB'))

// Draw the frame at time p (0 → 1). Pure: the same p always gives the same picture.
export function drawReplay(ctx, data, p, opts) {
  const { theme, buddy, showWeight } = opts
  const cache = (opts.cache ??= {})
  const t = { accent: theme.accent || '#45b866', accent2: theme.accent2 || '#a6e3a1' }
  const { days } = data
  const n = days.length
  const play = clamp((p - 0.07) / 0.63) // the days fill between 7% and 70% of the video
  const end = ease((p - 0.74) / 0.08)   // then the summary settles in
  const upto = play * n                  // how many days have appeared (fractional)
  const cur = days[Math.min(n - 1, Math.floor(upto))]

  // background and buddy sticker are painted once and reused, so every frame stays cheap
  if (!cache.bg) {
    const c = document.createElement('canvas'); c.width = VW; c.height = VH
    const b = c.getContext('2d')
    const bg = b.createLinearGradient(0, 0, VW, VH)
    bg.addColorStop(0, mix(t.accent, '#ffffff', 0.78)); bg.addColorStop(0.5, mix(t.accent, '#ffffff', 0.92)); bg.addColorStop(1, mix(t.accent2, '#ffffff', 0.45))
    b.fillStyle = bg; b.fillRect(0, 0, VW, VH)
    for (const [x, y, r] of [[70, 200, 230], [670, 660, 260], [90, 1130, 230]]) {
      const g = b.createRadialGradient(x, y, 8, x, y, r)
      g.addColorStop(0, alpha(t.accent2, 0.5)); g.addColorStop(1, alpha(t.accent2, 0))
      b.fillStyle = g; b.fillRect(0, 0, VW, VH)
    }
    cache.bg = c
    if (buddy) { const s = document.createElement('canvas'); s.width = s.height = 180; sticker(s.getContext('2d'), buddy, 90, 90, 130, -0.08); cache.bud = s }
  }
  ctx.drawImage(cache.bg, 0, 0)
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center'

  // heading: the date ticks forward, then gives way to the summary line
  const first = dateOf(days[0].key), last = dateOf(days[n - 1].key)
  const fmtD = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  ctx.fillStyle = alpha(INK, 0.6); ctx.font = font(800, 30)
  ctx.fillText(`${fmtD(first)} – ${fmtD(last)}`, VW / 2, 150)
  ctx.save(); ctx.globalAlpha = 1 - end
  ctx.fillStyle = INK; ctx.font = font(900, 84)
  ctx.fillText(dateOf(cur.key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), VW / 2, 250 - end * 20)
  ctx.restore()
  if (end > 0) {
    ctx.save(); ctx.globalAlpha = end
    const line = `${data.logged} ${data.logged === 1 ? 'day' : 'days'} of showing up`
    let size = 70
    ctx.fillStyle = INK; ctx.font = font(900, size)
    while (ctx.measureText(line).width > 620 && size > 40) ctx.font = font(900, (size -= 2))
    ctx.fillText(line, VW / 2, 250 + (1 - end) * 20)
    ctx.restore()
  }

  // the journey: a line that draws itself day by day, with the buddy walking on its tip.
  // Weight (shape and change only) when asked for; otherwise everything you did, adding up.
  const hero = { x: 70, y: 360, w: 580, h: 330 }
  ctx.fillStyle = alpha('#ffffff', 0.6); rr(ctx, hero.x - 30, hero.y - 50, hero.w + 60, hero.h + 90, 32); ctx.fill()
  const weighed = days.map((d, i) => ({ i, v: d.weight })).filter((q) => q.v)
  const asWeight = showWeight && weighed.length > 1
  let sum = 0
  const pts = asWeight ? weighed : days.map((d, i) => ({ i, v: (sum += (d.state !== 'none' ? 1 : 0) + d.workouts * 0.5 + Math.min(1, d.steps / 10000) * 0.5) }))
  if (!asWeight) pts.unshift({ i: -0.5, v: 0 })
  const lo = Math.min(...pts.map((q) => q.v)), hi = Math.max(...pts.map((q) => q.v))
  const i0 = pts[0].i, i1 = Math.max(pts.at(-1).i, i0 + 1)
  const xOf = (i) => hero.x + ((i - i0) / (i1 - i0)) * hero.w
  const yOf = (v) => hero.y + 30 + (1 - (v - lo) / (hi - lo || 1)) * (hero.h - 60)
  ctx.textAlign = 'left'; ctx.fillStyle = alpha(INK, 0.6); ctx.font = font(800, 26)
  ctx.fillText(asWeight ? 'Weight trend' : 'Adding up, day by day', hero.x, hero.y - 8)
  const lim = Math.min(i1, i0 + play * (i1 - i0))
  const path = [[xOf(pts[0].i), yOf(pts[0].v)]]
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], q = pts[k]
    if (q.i <= lim) path.push([xOf(q.i), yOf(q.v)])
    else { const f = clamp((lim - a.i) / (q.i - a.i)); path.push([xOf(a.i) + (xOf(q.i) - xOf(a.i)) * f, yOf(a.v) + (yOf(q.v) - yOf(a.v)) * f]); break }
  }
  const tip = path.at(-1)
  if (path.length > 1) {
    const fill = ctx.createLinearGradient(0, hero.y, 0, hero.y + hero.h)
    fill.addColorStop(0, alpha(t.accent, 0.3)); fill.addColorStop(1, alpha(t.accent, 0))
    ctx.beginPath(); path.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.lineTo(tip[0], hero.y + hero.h); ctx.lineTo(path[0][0], hero.y + hero.h); ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
    ctx.beginPath(); path.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.strokeStyle = t.accent; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
  }
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tip[0], tip[1], 12, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = t.accent; ctx.beginPath(); ctx.arc(tip[0], tip[1], 7, 0, Math.PI * 2); ctx.fill()
  if (cache.bud) { // the buddy steps along while the line draws, then hops when it arrives
    const walking = play > 0 && play < 1
    const hop = walking ? Math.abs(Math.sin(p * SECONDS * 9)) * 10 : end * Math.abs(Math.sin(p * SECONDS * 7)) * 22
    const bx = Math.max(70, Math.min(VW - 70, tip[0])), by = Math.max(hero.y + 10, tip[1] - 62 - hop)
    ctx.save(); ctx.translate(bx, by); ctx.rotate(walking ? Math.sin(p * SECONDS * 9) * 0.07 : 0); ctx.scale(0.72, 0.72)
    ctx.drawImage(cache.bud, -90, -90); ctx.restore()
  }
  if (asWeight && end > 0 && data.weightChange != null) {
    ctx.save(); ctx.globalAlpha = end; ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.font = font(900, 30)
    const c = data.weightChange
    ctx.fillText(c === 0 ? 'Holding steady' : `${c < 0 ? '−' : '+'}${Math.abs(c).toFixed(1)} kg`, hero.x + hero.w, hero.y - 8); ctx.restore()
  }

  // the days: one small tile each, lighting up as the date reaches them
  const box = { x: 60, y: 760, w: 600, h: 200 }
  let cols = Math.min(n, 15)
  while (Math.ceil(n / cols) * (box.w / cols) > box.h) cols++
  const rows = Math.ceil(n / cols)
  const cell = Math.min(box.w / cols, box.h / rows, 80)
  const ox = box.x + (box.w - cell * Math.min(cols, n)) / 2, oy = box.y + (box.h - cell * rows) / 2
  const gap = Math.max(2, cell * 0.14)
  days.forEach((d, i) => {
    const cx = ox + (i % cols) * cell + cell / 2, cy = oy + Math.floor(i / cols) * cell + cell / 2
    const size = cell - gap
    ctx.fillStyle = alpha('#ffffff', 0.6)
    rr(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.28); ctx.fill()
    const a = pop((upto - i) / 1.6)
    if (a <= 0 || d.state === 'none') return
    const s = size * a
    ctx.fillStyle = d.state === 'on' ? t.accent : mix(t.accent, '#ffffff', 0.55)
    rr(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.28); ctx.fill()
    if (d.workouts && cell > 30) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2); ctx.fill() }
  })

  // running totals
  const seen = days.slice(0, Math.min(n, Math.ceil(upto)))
  const stats = [
    [seen.filter((d) => d.state !== 'none').length, 'days logged'],
    [seen.reduce((a, d) => a + d.workouts, 0), 'workouts'],
    [short(seen.reduce((a, d) => a + d.steps, 0)), 'steps'],
  ]
  ctx.textAlign = 'center'
  stats.forEach(([v, label], i) => {
    const cx = 60 + 200 * i + 100
    ctx.fillStyle = alpha('#ffffff', 0.6); rr(ctx, cx - 92, 1000, 184, 130, 26); ctx.fill()
    ctx.fillStyle = INK; ctx.font = font(900, 52); ctx.fillText(String(v), cx, 1062)
    ctx.fillStyle = alpha(INK, 0.6); ctx.font = font(800, 24); ctx.fillText(label, cx, 1102)
  })

  // confetti once the summary lands
  if (end > 0) {
    const r = rng(n * 97 + data.logged)
    const fall = clamp((p - 0.74) / 0.26)
    const colors = [t.accent, t.accent2, '#ffd166', '#ffffff']
    for (let i = 0; i < 46; i++) {
      const x = r() * VW, start = -80 - r() * 500, speed = 900 + r() * 900, rot = r() * 6, w = 10 + r() * 12
      const y = start + speed * fall
      ctx.save(); ctx.translate(x + Math.sin(fall * 6 + i) * 18, y); ctx.rotate(rot + fall * 5)
      ctx.globalAlpha = 0.9 * (1 - Math.max(0, fall - 0.8) * 5); ctx.fillStyle = colors[i % colors.length]
      rr(ctx, -w / 2, -w / 4, w, w / 2, 3); ctx.fill(); ctx.restore()
    }
  }

  // sign-off
  ctx.textAlign = 'center'; ctx.font = font(900, 30); ctx.fillStyle = alpha(INK, 0.6)
  ctx.fillText('BankCal', VW / 2, 1216)
}

// Play the replay on the canvas for ever; the first pass is also recorded when the phone can.
// Returns stop(). onDone gets { blob, ext } once the video is ready (or null if it can't be made).
export function runReplay(canvas, data, opts, onDone) {
  const ctx = canvas.getContext('2d')
  const type = videoType()
  let rec = null, chunks = [], raf = 0, stopped = false, sent = false
  const finish = (v) => { if (!sent && !stopped) { sent = true; onDone?.(v) } }
  const t0 = performance.now()
  drawReplay(ctx, data, 0, opts)
  if (type) {
    try {
      rec = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 5_000_000 })
      rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
      rec.onstop = () => { const blob = new Blob(chunks, { type: type.split(';')[0] }); finish(blob.size > 2000 ? { blob, ext: type.includes('mp4') ? 'mp4' : 'webm' } : null) }
      rec.onerror = () => finish(null)
      rec.start()
    } catch { rec = null; finish(null) }
  } else finish(null)
  const tick = (now) => {
    if (stopped) return
    const el = (now - t0) / 1000
    if (rec && rec.state === 'recording' && el >= SECONDS + 0.25) rec.stop()
    // after the first pass, pause on the summary for a moment before looping
    const loop = SECONDS + 1.5
    drawReplay(ctx, data, Math.min(1, (el < SECONDS ? el : el % loop) / SECONDS), opts)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => { stopped = true; cancelAnimationFrame(raf); try { if (rec && rec.state !== 'inactive') rec.stop() } catch { /* already stopped */ } }
}

// The last frame as a picture, for phones that can't record
export function replayPicture(data, opts) {
  const c = document.createElement('canvas'); c.width = VW; c.height = VH
  drawReplay(c.getContext('2d'), data, 1, opts)
  return new Promise((ok) => c.toBlob(ok, 'image/png'))
}

// Share a ready file straight from a tap; falls back to saving it
export async function shareFile(blob, name, notify) {
  const file = new File([blob], name, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return } catch (e) { if (e?.name === 'AbortError') return }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  notify?.('Saved. Share it from your gallery')
}
