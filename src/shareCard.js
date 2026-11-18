// "Share my morning": a playful story-sized picture (1080 × 1920) of today's welcome,
// with your buddy as a sticker, today's verse on a taped card and the motivation.
// Drawn on a canvas in the browser, so there's nothing to download or pay for.
// No calories, weight or links are ever put in the picture.

const W = 1080
const H = 1920
const FONT = '"Nunito Variable", Nunito, system-ui, sans-serif'
const INK = '#26262b'

// Fun lines for the buddy's speech bubble (picked by date, so it's the same all day)
const BUBBLES = ['Let’s go!', 'Fresh start!', 'We got this!', 'Today’s a good day', 'One step at a time', 'Rise and shine!', 'Small wins count!', 'Grace for today', 'Hello, sunshine!']

// tiny seeded random, so the confetti is the same every time you share that day
function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const hex = (h) => { const n = parseInt(String(h).replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const mix = (a, b, t) => { const x = hex(a); const y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('') }
const alpha = (a, o) => `rgba(${hex(a).join(',')},${o})`

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

// shrink the font until the text fits in `maxLines`
function fit(ctx, text, weight, size, min, max, maxLines) {
  let s = size
  for (; s > min; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`
    if (lines(ctx, text, max).length <= maxLines) break
  }
  ctx.font = `${weight} ${s}px ${FONT}`
  return { size: s, rows: lines(ctx, text, max) }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h)
}

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

// confetti: dots, rings, squiggles and sparkles in the theme colours
function confetti(ctx, rand, colors, avoid) {
  const shapes = ['dot', 'ring', 'squiggle', 'spark', 'dot', 'spark']
  for (let i = 0; i < 60; i++) {
    const x = rand() * W
    const y = rand() * H
    const c = colors[Math.floor(rand() * colors.length)]
    const s = 10 + rand() * 18
    const kind = shapes[Math.floor(rand() * shapes.length)]
    const rot = rand() * Math.PI
    if (avoid.some((a) => x > a.x - 24 && x < a.x + a.w + 24 && y > a.y - 24 && y < a.y + a.h + 24)) continue
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineCap = 'round'
    if (kind === 'dot') { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, 7); ctx.fill() }
    if (kind === 'ring') { ctx.beginPath(); ctx.arc(0, 0, s / 2 + 2, 0, 7); ctx.stroke() }
    if (kind === 'squiggle') { ctx.beginPath(); ctx.moveTo(-s, 0); ctx.bezierCurveTo(-s / 2, -s, 0, s, s / 2, 0); ctx.quadraticCurveTo(s * 0.8, -s / 2, s, 0); ctx.stroke() }
    if (kind === 'spark') {
      ctx.beginPath()
      for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.28 : s * 0.95; const a = (k * Math.PI) / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) }
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }
}

function tape(ctx, cx, y, rot, color) {
  ctx.save(); ctx.translate(cx, y); ctx.rotate(rot)
  ctx.fillStyle = color
  ctx.fillRect(-90, -22, 180, 44)
  ctx.restore()
}

export async function drawMorning({ words, name, greeting, streakDays, colors, buddySvg, date = new Date() }) {
  try { await Promise.all([document.fonts.load(`900 60px ${FONT}`), document.fonts.load(`700 40px ${FONT}`)]) } catch { /* use what's there */ }
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  const accent = colors.accent || '#45b866'
  const accent2 = colors.accent2 || '#a6e3a1'
  const day = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const rand = rng(day * 31 + (name?.length ?? 0))
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // ---- measure everything first, so it can be centred ----
  const greet = fit(ctx, `${greeting},\n${name}!`, 900, 92, 58, 900, 3)
  const v = words?.verse
  const vText = v?.text ? (/[“"]/.test(v.text) ? v.text : `“${v.text}”`) : null
  const vPad = 64
  const m = words?.motivation
  const showBy = m?.by && !/^unknown$/i.test(m.by)
  const BUD = 320
  const greetH = greet.rows.length * greet.size * 1.08
  // long verses: shrink the verse (then the quote) until everything fits above the sign-off
  let vf = null, vH = 0, mf = null, mH = 0, total = 0
  for (let vMax = 50, mMax = 42; ; vMax -= 2, mMax = Math.max(32, mMax - 1)) {
    vf = vText ? fit(ctx, vText, 750, vMax, 28, W - 160 - vPad * 2, 12) : null
    vH = vf ? vPad + vf.rows.length * vf.size * 1.33 + 100 + vPad - 20 : 0
    mf = m?.text ? fit(ctx, `“${m.text}”`, 700, mMax, 28, 860, 4) : null
    mH = mf ? mf.rows.length * mf.size * 1.38 + (showBy ? 60 : 0) : 0
    total = 50 + BUD + 10 + greetH + (streakDays > 1 ? 130 : 40) + (vH ? vH + 50 : 0) + mH
    if (total <= H - 230 || vMax <= 30) break
  }
  const top = Math.max(100, (H - 150 - total) / 2 + 30)

  const dateY = top
  const budY = dateY + 50
  const greetY = budY + BUD + 10
  const streakY = greetY + greetH + 30
  const cardY = streakY + (streakDays > 1 ? 100 : 10) + 30
  const motY = cardY + (vH ? vH + 50 : 0)

  // ---- background: theme wash, soft blobs, confetti ----
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, mix(accent, '#ffffff', 0.78)); bg.addColorStop(0.5, mix(accent, '#ffffff', 0.92)); bg.addColorStop(1, mix(accent2, '#ffffff', 0.45))
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  for (const [x, y, r] of [[100, 300, 340], [1000, 1000, 380], [140, 1700, 340]]) {
    const g = ctx.createRadialGradient(x, y, 10, x, y, r)
    g.addColorStop(0, alpha(accent2, 0.55)); g.addColorStop(1, alpha(accent2, 0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }
  const avoid = [
    { x: 160, y: dateY - 60, w: 760, h: 90 },
    { x: 150, y: budY - 20, w: 780, h: BUD + 20 },
    { x: 60, y: greetY, w: W - 120, h: greetH + 30 },
    { x: W / 2 - 260, y: streakY, w: 520, h: 100 },
    { x: 50, y: cardY - 40, w: W - 100, h: vH + 70 },
    { x: 80, y: motY, w: W - 160, h: mH + 30 },
    { x: W / 2 - 280, y: H - 120, w: 560, h: 80 },
  ]
  confetti(ctx, rand, [accent, accent2, '#ffd166', '#ffffff', mix(accent, '#000000', 0.15)], avoid)

  // ---- date pill ----
  const dateTxt = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  ctx.font = `850 38px ${FONT}`
  const dw = ctx.measureText(dateTxt).width + 64
  ctx.fillStyle = '#ffffff'; rr(ctx, W / 2 - dw / 2, dateY - 48, dw, 70, 35); ctx.fill()
  ctx.fillStyle = accent; ctx.fillText(dateTxt, W / 2, dateY)

  // ---- buddy as a sticker, with a speech bubble ----
  const img = await svgImage(buddySvg, BUD)
  const bx = W / 2 - BUD / 2 - 110
  if (img) {
    ctx.save()
    ctx.translate(bx + BUD / 2, budY + BUD / 2); ctx.rotate(-0.07)
    // white die-cut outline: the buddy's shape in white, nudged all round, then the buddy
    ctx.filter = 'brightness(0) invert(1)'
    for (let a = 0; a < 20; a++) { const t = (a / 20) * Math.PI * 2; ctx.drawImage(img, -BUD / 2 + Math.cos(t) * 13, -BUD / 2 + Math.sin(t) * 13, BUD, BUD) }
    ctx.filter = 'none'
    ctx.drawImage(img, -BUD / 2, -BUD / 2, BUD, BUD)
    ctx.restore()
  }
  const say = BUBBLES[day % BUBBLES.length]
  ctx.font = `900 46px ${FONT}`
  const bw = ctx.measureText(say).width + 72
  const bubX = Math.min(W - bw - 50, bx + BUD - 10)
  const bubY = budY + 30
  ctx.save(); ctx.translate(bubX, bubY); ctx.rotate(0.05)
  ctx.shadowColor = 'rgba(0,0,0,0.13)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10
  ctx.fillStyle = '#ffffff'
  rr(ctx, 0, 0, bw, 100, 50); ctx.fill()
  ctx.beginPath(); ctx.moveTo(26, 70); ctx.lineTo(-26, 128); ctx.lineTo(84, 90); ctx.closePath(); ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = INK; ctx.fillText(say, bw / 2, 66)
  ctx.restore()

  // ---- greeting, with a marker-pen highlight behind the name ----
  ctx.font = `900 ${greet.size}px ${FONT}`
  let gy = greetY
  greet.rows.forEach((r, i) => {
    gy += greet.size * 1.08
    if (i === greet.rows.length - 1 && greet.rows.length > 1) {
      const w = ctx.measureText(r).width
      ctx.save(); ctx.translate(W / 2, gy - greet.size * 0.2); ctx.rotate(-0.012)
      ctx.fillStyle = alpha(accent2, 0.95); rr(ctx, -w / 2 - 20, -greet.size * 0.18, w + 40, greet.size * 0.42, 16); ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = INK
    ctx.fillText(r, W / 2, gy)
  })

  // ---- streak badge ----
  if (streakDays > 1) {
    const t = `🔥 ${streakDays}-day streak`
    ctx.font = `900 42px ${FONT}`
    const w = ctx.measureText(t).width + 80
    ctx.save(); ctx.translate(W / 2, streakY + 44); ctx.rotate(-0.04)
    ctx.shadowColor = alpha(accent, 0.35); ctx.shadowBlur = 24; ctx.shadowOffsetY = 10
    ctx.fillStyle = accent; rr(ctx, -w / 2, -42, w, 86, 43); ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#ffffff'; ctx.fillText(t, 0, 15)
    ctx.restore()
  }

  // ---- verse on a taped card ----
  if (vf) {
    const cw = W - 160
    ctx.save()
    ctx.translate(W / 2, cardY + vH / 2); ctx.rotate(-0.015)
    ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20
    ctx.fillStyle = '#ffffff'; rr(ctx, -cw / 2, -vH / 2, cw, vH, 36); ctx.fill()
    ctx.shadowColor = 'transparent'
    let ty = -vH / 2 + vPad - 4
    ctx.fillStyle = INK; ctx.font = `750 ${vf.size}px ${FONT}`
    for (const r of vf.rows) { ty += vf.size * 1.33; ctx.fillText(r, 0, ty) }
    ty += 78
    ctx.fillStyle = accent; ctx.font = `850 38px ${FONT}`
    ctx.fillText(`${v.reference}${v.version ? ` (${v.version})` : ''}`, 0, ty)
    ctx.restore()
    tape(ctx, W / 2 - 260, cardY + 6, -0.2, alpha(accent2, 0.85))
    tape(ctx, W / 2 + 260, cardY + 2, 0.17, 'rgba(255,209,102,0.85)')
  }

  // ---- motivation ----
  if (mf) {
    let my = motY
    ctx.fillStyle = '#44444b'; ctx.font = `750 ${mf.size}px ${FONT}`
    for (const r of mf.rows) { my += mf.size * 1.38; ctx.fillText(r, W / 2, my) }
    if (showBy) { my += 58; ctx.font = `850 32px ${FONT}`; ctx.fillStyle = mix(accent, '#000000', 0.2); ctx.fillText(`— ${m.by}`, W / 2, my) }
  }

  // ---- little sign-off (no link) ----
  ctx.font = `800 30px ${FONT}`; ctx.fillStyle = alpha(INK, 0.4)
  ctx.fillText('my morning with BankCal ☀️', W / 2, H - 64)

  return new Promise((ok) => c.toBlob(ok, 'image/png'))
}

// Opens the share sheet with the picture (Instagram, WhatsApp, Facebook, Save image…).
// Where sharing pictures isn't supported, the picture is downloaded instead.
export async function shareMorning(opts, notify) {
  const blob = await drawMorning(opts)
  if (!blob) { notify?.('Couldn’t make the picture on this phone'); return }
  const file = new File([blob], 'my-morning.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return } catch (e) { if (e?.name === 'AbortError') return }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = file.name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  notify?.('Picture saved. Share it from your photos')
}
