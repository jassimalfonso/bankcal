// Share pictures: drawn on a canvas in the browser (nothing to download or pay for).
// Five cards (morning, verse, milestone, week, together) in two sizes:
//   story 1080 × 1920 (Instagram/Facebook/WhatsApp stories)  ·  post 1080 × 1350 (feed posts)
// Each card is a list of blocks stacked down the middle and centred. No calories, weight or links.

export const FORMATS = { story: { w: 1080, h: 1920, label: 'Story' }, post: { w: 1080, h: 1350, label: 'Post' } }
const W = 1080
const FONT = '"Nunito Variable", Nunito, system-ui, sans-serif'
const INK = '#26262b'
const BUBBLES = ['Let’s go!', 'Fresh start!', 'We got this!', 'Today’s a good day', 'One step at a time', 'Rise and shine!', 'Small wins count!', 'Grace for today', 'Hello, sunshine!']

// ---------- helpers ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }
const hex = (h) => { const n = parseInt(String(h).replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const mix = (a, b, t) => { const x = hex(a); const y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('') }
const alpha = (a, o) => `rgba(${hex(a).join(',')},${o})`
const font = (w, s) => `${w} ${s}px ${FONT}`

function lines(ctx, text, max) {
  const out = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const t = line ? `${line} ${word}` : word
      if (ctx.measureText(t).width > max && line) { out.push(line); line = word } else line = t
    }
    out.push(line)
  }
  return out
}
function fit(ctx, text, weight, size, min, max, maxLines) {
  let s = size
  for (; s > min; s -= 2) { ctx.font = font(weight, s); if (lines(ctx, text, max).length <= maxLines) break }
  ctx.font = font(weight, s)
  return { size: s, rows: lines(ctx, text, max) }
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h) }

function svgImage(svg, size) {
  return new Promise((ok) => {
    if (!svg) return ok(null)
    const s = svg.cloneNode(true)
    s.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    s.setAttribute('width', String(size)); s.setAttribute('height', String(size))
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => ok(null)
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(s))
  })
}

function sticker(ctx, img, cx, cy, size, rot) {
  if (!img) return
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot)
  ctx.filter = 'brightness(0) invert(1)' // white die-cut outline
  for (let a = 0; a < 20; a++) { const t = (a / 20) * Math.PI * 2; ctx.drawImage(img, -size / 2 + Math.cos(t) * size * 0.04, -size / 2 + Math.sin(t) * size * 0.04, size, size) }
  ctx.filter = 'none'
  ctx.drawImage(img, -size / 2, -size / 2, size, size)
  ctx.restore()
}

function bubble(ctx, text, x, y, tail = 'left') {
  ctx.font = font(900, 46)
  const bw = ctx.measureText(text).width + 72
  const bx = tail === 'left' ? x : x - bw
  ctx.save(); ctx.translate(bx, y); ctx.rotate(tail === 'left' ? 0.05 : -0.05)
  ctx.shadowColor = 'rgba(0,0,0,0.13)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10
  ctx.fillStyle = '#ffffff'; rr(ctx, 0, 0, bw, 100, 50); ctx.fill()
  ctx.beginPath()
  if (tail === 'left') { ctx.moveTo(26, 70); ctx.lineTo(-26, 128); ctx.lineTo(84, 90) } else { ctx.moveTo(bw - 26, 70); ctx.lineTo(bw + 26, 128); ctx.lineTo(bw - 84, 90) }
  ctx.closePath(); ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(text, bw / 2, 66)
  ctx.restore()
}

function confetti(ctx, rand, colors, H, avoid) {
  const shapes = ['dot', 'ring', 'squiggle', 'spark', 'dot', 'spark']
  for (let i = 0; i < 70; i++) {
    const x = rand() * W; const y = rand() * H
    const c = colors[Math.floor(rand() * colors.length)]
    const s = 10 + rand() * 18
    const kind = shapes[Math.floor(rand() * shapes.length)]
    const rot = rand() * Math.PI
    if (avoid.some((a) => x > a.x && x < a.x + a.w && y > a.y && y < a.y + a.h)) continue
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineCap = 'round'
    if (kind === 'dot') { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, 7); ctx.fill() }
    if (kind === 'ring') { ctx.beginPath(); ctx.arc(0, 0, s / 2 + 2, 0, 7); ctx.stroke() }
    if (kind === 'squiggle') { ctx.beginPath(); ctx.moveTo(-s, 0); ctx.bezierCurveTo(-s / 2, -s, 0, s, s / 2, 0); ctx.quadraticCurveTo(s * 0.8, -s / 2, s, 0); ctx.stroke() }
    if (kind === 'spark') { ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.28 : s * 0.95; const a = (k * Math.PI) / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) } ctx.closePath(); ctx.fill() }
    ctx.restore()
  }
}

// ---------- blocks: each knows its height and how to draw itself at y ----------
const B = {
  gap: (h) => ({ h, draw() {} }),

  pill: (text, t) => ({ h: 70, draw(ctx, y) {
    ctx.font = font(850, 38)
    const w = ctx.measureText(text).width + 64
    ctx.fillStyle = '#ffffff'; rr(ctx, W / 2 - w / 2, y, w, 70, 35); ctx.fill()
    ctx.fillStyle = t.accent; ctx.textAlign = 'center'; ctx.fillText(text, W / 2, y + 48)
  } }),

  // one or two buddies as stickers; optional speech bubble
  buddies: (imgs, say, size = 320) => ({ h: size, draw(ctx, y) {
    if (imgs.length > 1) {
      sticker(ctx, imgs[0], W / 2 - size * 0.55, y + size / 2, size, -0.1)
      sticker(ctx, imgs[1], W / 2 + size * 0.55, y + size / 2, size, 0.1)
      if (say) { ctx.font = font(900, 46); const bw = ctx.measureText(say).width + 72; bubble(ctx, say, W / 2 - bw / 2, y - 90) }
    } else if (imgs.length === 1) {
      const cx = say ? W / 2 - 110 : W / 2
      sticker(ctx, imgs[0], cx, y + size / 2, size, -0.07)
      if (say) { ctx.font = font(900, 46); const bw = ctx.measureText(say).width + 72; bubble(ctx, say, Math.min(W - bw - 50, cx + size / 2 - 10), y + 30) }
    }
  } }),

  // a big emoji in a glowing medal
  medal: (emoji, t, size = 300) => ({ h: size + 60, draw(ctx, y) {
    const cx = W / 2; const cy = y + 30 + size / 2
    ctx.save()
    ctx.fillStyle = alpha(t.accent, 0.16)
    for (let k = 0; k < 16; k++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, size * 0.78, (k / 16) * Math.PI * 2, ((k + 0.45) / 16) * Math.PI * 2); ctx.fill() }
    ctx.shadowColor = alpha(t.accent, 0.4); ctx.shadowBlur = 40; ctx.shadowOffsetY = 14
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, 7); ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.lineWidth = 14; ctx.strokeStyle = t.accent2; ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 18, 0, 7); ctx.stroke()
    ctx.font = `${Math.round(size * 0.46)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = INK; ctx.fillText(emoji, cx, cy + 6)
    ctx.restore()
  } }),

  // big headline; the last line gets a marker-pen highlight
  title: (ctx0, text, t, { size = 92, min = 56, maxLines = 3, highlight = true } = {}) => {
    const f = fit(ctx0, text, 900, size, min, 900, maxLines)
    return { h: f.rows.length * f.size * 1.08 + 20, draw(ctx, y) {
      ctx.font = font(900, f.size); ctx.textAlign = 'center'
      let gy = y
      f.rows.forEach((r, i) => {
        gy += f.size * 1.08
        if (highlight && i === f.rows.length - 1) {
          const w = ctx.measureText(r).width
          ctx.save(); ctx.translate(W / 2, gy - f.size * 0.2); ctx.rotate(-0.012)
          ctx.fillStyle = alpha(t.accent2, 0.95); rr(ctx, -w / 2 - 20, -f.size * 0.18, w + 40, f.size * 0.42, 16); ctx.fill()
          ctx.restore()
        }
        ctx.fillStyle = INK; ctx.fillText(r, W / 2, gy)
      })
    } }
  },

  text: (ctx0, text, { size = 42, weight = 750, color = '#44444b', maxLines = 4 } = {}) => {
    const f = fit(ctx0, text, weight, size, 28, 860, maxLines)
    return { h: f.rows.length * f.size * 1.38 + 10, draw(ctx, y) {
      ctx.font = font(weight, f.size); ctx.fillStyle = color; ctx.textAlign = 'center'
      let ty = y
      for (const r of f.rows) { ty += f.size * 1.38; ctx.fillText(r, W / 2, ty) }
    } }
  },

  badge: (text, t) => ({ h: 90, draw(ctx, y) {
    ctx.font = font(900, 42)
    const w = ctx.measureText(text).width + 80
    ctx.save(); ctx.translate(W / 2, y + 45); ctx.rotate(-0.04)
    ctx.shadowColor = alpha(t.accent, 0.35); ctx.shadowBlur = 24; ctx.shadowOffsetY = 10
    ctx.fillStyle = t.accent; rr(ctx, -w / 2, -42, w, 86, 43); ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(text, 0, 15)
    ctx.restore()
  } }),

  // verse on a white card held down with washi tape
  verse: (ctx0, v, t, { size = 50 } = {}) => {
    const text = /[“"]/.test(v.text) ? v.text : `“${v.text}”`
    const pad = 64
    const f = fit(ctx0, text, 750, size, 30, W - 160 - pad * 2, 12)
    const h = pad + f.rows.length * f.size * 1.33 + 100 + pad - 20
    return { h: h + 20, draw(ctx, y) {
      y += 20
      const cw = W - 160
      ctx.save(); ctx.translate(W / 2, y + h / 2); ctx.rotate(-0.015)
      ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20
      ctx.fillStyle = '#ffffff'; rr(ctx, -cw / 2, -h / 2, cw, h, 36); ctx.fill()
      ctx.shadowColor = 'transparent'
      let ty = -h / 2 + pad - 4
      ctx.fillStyle = INK; ctx.font = font(750, f.size); ctx.textAlign = 'center'
      for (const r of f.rows) { ty += f.size * 1.33; ctx.fillText(r, 0, ty) }
      ty += 78
      ctx.fillStyle = t.accent; ctx.font = font(850, 38)
      ctx.fillText(`${v.reference}${v.version ? ` (${v.version})` : ''}`, 0, ty)
      ctx.restore()
      for (const [dx, rot, col] of [[-260, -0.2, alpha(t.accent2, 0.85)], [260, 0.17, 'rgba(255,209,102,0.85)']]) {
        ctx.save(); ctx.translate(W / 2 + dx, y + 4); ctx.rotate(rot); ctx.fillStyle = col; ctx.fillRect(-90, -22, 180, 44); ctx.restore()
      }
    } }
  },

  quote: (ctx0, m, t) => {
    const by = m.by && !/^unknown$/i.test(m.by)
    const q = B.text(ctx0, `“${m.text}”`, { size: 42, weight: 700 })
    return { h: q.h + (by ? 60 : 0), draw(ctx, y) {
      q.draw(ctx, y)
      if (by) { ctx.font = font(850, 32); ctx.fillStyle = mix(t.accent, '#000000', 0.2); ctx.textAlign = 'center'; ctx.fillText(`— ${m.by}`, W / 2, y + q.h + 46) }
    } }
  },

  // tilted white tiles: emoji, big number, label
  stats: (items) => {
    const cols = items.length === 4 || items.length === 2 ? 2 : Math.min(3, items.length)
    const rows = Math.ceil(items.length / cols)
    const tw = cols === 2 ? 400 : 290
    const th = 240
    const gap = 36
    return { h: rows * th + (rows - 1) * gap + 30, draw(ctx, y) {
      items.forEach((it, i) => {
        const r = Math.floor(i / cols); const c = i % cols
        const inRow = Math.min(cols, items.length - r * cols)
        const x = W / 2 - (inRow * tw + (inRow - 1) * gap) / 2 + c * (tw + gap)
        const ty = y + 15 + r * (th + gap)
        ctx.save(); ctx.translate(x + tw / 2, ty + th / 2); ctx.rotate((i % 2 ? 1 : -1) * 0.03)
        ctx.shadowColor = 'rgba(0,0,0,0.10)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12
        ctx.fillStyle = '#ffffff'; rr(ctx, -tw / 2, -th / 2, tw, th, 32); ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.textAlign = 'center'
        ctx.font = `54px ${FONT}`; ctx.fillStyle = INK; ctx.fillText(it.emoji, 0, -44)
        ctx.font = font(900, 64); ctx.fillText(it.value, 0, 42)
        ctx.font = font(800, 28); ctx.fillStyle = '#6a6a72'; ctx.fillText(it.label, 0, 88)
        ctx.restore()
      })
    } }
  },

  bar: (label, value, pct, t) => ({ h: 150, draw(ctx, y) {
    const bw = W - 200
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.10)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12
    ctx.fillStyle = '#ffffff'; rr(ctx, 100, y, bw, 140, 36); ctx.fill()
    ctx.restore()
    ctx.textAlign = 'left'; ctx.font = font(850, 32); ctx.fillStyle = '#6a6a72'; ctx.fillText(label, 140, y + 54)
    ctx.textAlign = 'right'; ctx.font = font(900, 34); ctx.fillStyle = INK; ctx.fillText(value, 100 + bw - 40, y + 54)
    ctx.fillStyle = alpha(t.accent, 0.15); rr(ctx, 140, y + 80, bw - 80, 30, 15); ctx.fill()
    ctx.fillStyle = t.accent; rr(ctx, 140, y + 80, Math.max(30, (bw - 80) * Math.min(1, pct)), 30, 15); ctx.fill()
    ctx.textAlign = 'center'
  } }),
}

// ---------- the cards ----------
const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const range = (a, b) => { const f = (k) => new Date(k + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); return `${f(a)} – ${f(b)}` }

function recipe(kind, d, t, ctx, imgs, post, seed) {
  const say = BUBBLES[seed % BUBBLES.length]
  if (kind === 'morning') return [
    B.pill(fmtDate(d.date), t), B.gap(post ? 30 : 50),
    B.buddies(imgs, say, post ? 260 : 320), B.gap(10),
    B.title(ctx, `${d.greeting},\n${d.name}!`, t, { size: post ? 80 : 92 }),
    ...(d.streakDays > 1 ? [B.gap(20), B.badge(`🔥 ${d.streakDays}-day streak`, t)] : []),
    ...(d.words?.verse?.text ? [B.gap(40), B.verse(ctx, d.words.verse, t, { size: post ? 44 : 50 })] : []),
    ...(d.words?.motivation?.text ? [B.gap(40), B.quote(ctx, d.words.motivation, t)] : []),
  ]
  if (kind === 'verse') return [
    B.pill(fmtDate(d.date), t), B.gap(50),
    B.title(ctx, 'Today’s verse', t, { size: 80, maxLines: 1 }), B.gap(30),
    B.verse(ctx, d.verse, t, { size: post ? 52 : 64 }),
  ]
  if (kind === 'milestone') return [
    B.pill('Milestone unlocked', t), B.gap(40),
    B.medal(d.emoji, t, post ? 260 : 320), B.gap(40),
    B.title(ctx, d.label, t, { size: 88, maxLines: 3 }), B.gap(80),
    ...(imgs[0] ? [B.buddies(imgs, 'So proud of me!', post ? 200 : 260)] : []),
  ]
  if (kind === 'week') return [
    B.pill(range(d.from, d.to), t), B.gap(40),
    B.buddies(imgs, d.say || 'What a week!', post ? 220 : 280), B.gap(20),
    B.title(ctx, 'My week', t, { size: 100, maxLines: 1 }), B.gap(30),
    B.stats(d.stats),
    ...(d.line ? [B.gap(30), B.text(ctx, d.line, { size: 40, maxLines: 3 })] : []),
  ]
  if (kind === 'together') return [
    B.pill('This week, together', t), B.gap(130),
    B.buddies(imgs, 'Better together!', post ? 240 : 300), B.gap(20),
    B.title(ctx, d.names, t, { size: 84, maxLines: 3 }), B.gap(30),
    ...(d.team ? [B.bar('Shared habit goal', `${d.team.ticks} / ${d.team.target}`, d.team.ticks / d.team.target, t), B.gap(40)] : []),
    ...(d.stats?.length ? [B.stats(d.stats)] : []),
  ]
  return []
}

export async function drawShare(kind, data, { theme, buddySvgs = [], format = 'story' }) {
  try { await Promise.all([document.fonts.load(font(900, 60)), document.fonts.load(font(700, 40))]) } catch { /* use what's there */ }
  const H = (FORMATS[format] ?? FORMATS.story).h
  const post = format === 'post'
  const t = { accent: theme.accent || '#45b866', accent2: theme.accent2 || '#a6e3a1' }
  const date = data.date ?? new Date()
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const imgs = (await Promise.all(buddySvgs.map((s) => svgImage(s, 320)))).filter(Boolean)

  // lay the blocks out on a tall layer first, then fit that layer into the picture
  const layer = document.createElement('canvas')
  layer.width = W; layer.height = 3400
  const lc = layer.getContext('2d')
  lc.textBaseline = 'alphabetic'
  const blocks = recipe(kind, { ...data, date }, t, lc, imgs, post, seed + kind.length)
  let y = 60
  for (const b of blocks) { b.draw(lc, y); y += b.h }
  const used = y + 50

  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, mix(t.accent, '#ffffff', 0.78)); bg.addColorStop(0.5, mix(t.accent, '#ffffff', 0.92)); bg.addColorStop(1, mix(t.accent2, '#ffffff', 0.45))
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  for (const [x, yy, r] of [[100, H * 0.16, 340], [1000, H * 0.52, 380], [140, H * 0.88, 340]]) {
    const g = ctx.createRadialGradient(x, yy, 10, x, yy, r)
    g.addColorStop(0, alpha(t.accent2, 0.55)); g.addColorStop(1, alpha(t.accent2, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }
  // fit the content between the top and the sign-off
  const room = H - 110 - 30
  const scale = Math.min(1, room / used)
  const dh = used * scale; const dw = W * scale
  const ox = (W - dw) / 2; const oy = 30 + (room - dh) / 2
  confetti(ctx, rng(seed * 7 + kind.length), [t.accent, t.accent2, '#ffd166', '#ffffff', mix(t.accent, '#000000', 0.15)], H,
    [{ x: ox + 80 * scale, y: oy + 20, w: dw - 160 * scale, h: dh - 40 }, { x: W / 2 - 200, y: H - 150, w: 400, h: 120 }])
  ctx.drawImage(layer, 0, 0, W, used, ox, oy, dw, dh)
  // sign-off: just the name, small and quiet. No link.
  ctx.font = font(900, 38); ctx.fillStyle = alpha(INK, 0.6); ctx.textAlign = 'center'
  ctx.fillText('BankCal', W / 2, H - 62)
  ctx.textAlign = 'center'
  return new Promise((ok) => c.toBlob(ok, 'image/png'))
}

// Share a ready picture (call it straight from a tap, so iPhone allows it)
export async function sharePicture(blob, name, notify) {
  const file = new File([blob], name, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return } catch (e) { if (e?.name === 'AbortError') return }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  notify?.('Picture saved. Share it from your photos')
}
