// "Share my morning": draws a story-sized picture (1080 × 1920) of today's welcome,
// with the verse, the motivation and your buddy, then opens the phone's share sheet.
// Drawn on a canvas in the browser, so there's nothing extra to download or pay for.
// Calories and weight are never put in the picture.

const W = 1080
const H = 1920
const FONT = '"Nunito Variable", Nunito, system-ui, sans-serif'

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

function round(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h)
}

function svgImage(svg) {
  return new Promise((ok) => {
    if (!svg) return ok(null)
    const s = svg.cloneNode(true)
    s.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    s.setAttribute('width', '300'); s.setAttribute('height', '300')
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => ok(null)
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(s))
  })
}

export async function drawMorning({ words, name, greeting, streakDays, colors, buddySvg }) {
  try { await Promise.all([document.fonts.load(`900 60px ${FONT}`), document.fonts.load(`700 40px ${FONT}`)]) } catch { /* use what's there */ }
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  const { accent = '#45b866', accent2 = '#a6e3a1', soft = '#e7f6e7' } = colors
  const ink = '#1d1d1f'

  // background: soft wash with a glow of the theme colour
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, soft); bg.addColorStop(0.55, '#ffffff'); bg.addColorStop(1, soft)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

  // everything but the footer goes on a layer first, so it can be centred whatever its height
  const main = ctx
  const layer = document.createElement('canvas')
  layer.width = W; layer.height = H
  const lc = layer.getContext('2d')
  lc.textAlign = main.textAlign = 'center'
  lc.textBaseline = main.textBaseline = 'alphabetic'
  return drawBody(lc, main, layer, { words, name, greeting, streakDays, accent, accent2, ink, buddySvg })
}

async function drawBody(ctx, main, layer, { words, name, greeting, streakDays, accent, accent2, ink, buddySvg }) {
  let y = 50
  ctx.fillStyle = accent
  ctx.font = `800 40px ${FONT}`
  ctx.fillText(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), W / 2, y)

  // buddy
  const img = await svgImage(buddySvg)
  y += 40
  if (img) { ctx.drawImage(img, W / 2 - 150, y, 300, 300); y += 330 } else y += 40

  // greeting
  ctx.fillStyle = ink
  const g = fit(ctx, `${greeting}, ${name}`, 900, 84, 56, 920, 2)
  for (const r of g.rows) { y += g.size * 1.1; ctx.fillText(r, W / 2, y) }

  if (streakDays > 1) {
    y += 40
    ctx.font = `800 40px ${FONT}`
    const t = `🔥 ${streakDays} days in a row`
    const w = ctx.measureText(t).width + 64
    ctx.fillStyle = accent + '24'; round(ctx, W / 2 - w / 2, y, w, 76, 38); ctx.fill()
    ctx.fillStyle = ink; ctx.fillText(t, W / 2, y + 52)
    y += 76
  }

  // verse card
  y += 56
  const v = words?.verse
  if (v?.text) {
    const pad = 64
    const vf = fit(ctx, /[“"]/.test(v.text) ? v.text : `“${v.text}”`, 750, 50, 34, W - 120 - pad * 2, 9)
    const ref = `${v.reference}${v.version ? ` (${v.version})` : ''}`
    const h = pad + vf.rows.length * vf.size * 1.32 + 44 + 40 + pad - 10
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.10)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18
    ctx.fillStyle = '#ffffff'; round(ctx, 60, y, W - 120, h, 48); ctx.fill()
    ctx.restore()
    let ty = y + pad - 6
    ctx.fillStyle = ink
    ctx.font = `750 ${vf.size}px ${FONT}`
    for (const r of vf.rows) { ty += vf.size * 1.32; ctx.fillText(r, W / 2, ty) }
    ty += 78
    ctx.fillStyle = accent; ctx.font = `800 38px ${FONT}`
    ctx.fillText(ref, W / 2, ty)
    y += h
  }

  // motivation
  const m = words?.motivation
  if (m?.text) {
    y += 70
    ctx.fillStyle = '#4a4a50'
    const mf = fit(ctx, `“${m.text}”`, 650, 40, 30, 880, 4)
    for (const r of mf.rows) { y += mf.size * 1.35; ctx.fillText(r, W / 2, y) }
    if (m.by && !/^unknown$/i.test(m.by)) { y += 56; ctx.font = `800 32px ${FONT}`; ctx.fillStyle = '#8a8a90'; ctx.fillText(`— ${m.by}`, W / 2, y) }
  }

  // centre the content in the space above the footer
  const used = y + 40
  const top = Math.max(60, (H - 220 - used) / 2)
  // a soft glow of the theme colour behind the buddy
  const gy = top + 240
  const glow = main.createRadialGradient(W / 2, gy, 40, W / 2, gy, 620)
  glow.addColorStop(0, accent2 + 'cc'); glow.addColorStop(1, accent2 + '00')
  main.fillStyle = glow; main.fillRect(0, 0, W, H)
  main.drawImage(layer, 0, 0, W, used, 0, top, W, used)

  // footer
  main.fillStyle = accent; main.font = `900 46px ${FONT}`
  main.fillText('BankCal', W / 2, H - 120)
  main.fillStyle = '#8a8a90'; main.font = `700 30px ${FONT}`
  main.fillText('bankcal.vercel.app', W / 2, H - 72)

  return new Promise((ok) => main.canvas.toBlob(ok, 'image/png'))
}

// Opens the share sheet with the picture (Instagram, WhatsApp, Facebook, Save image…).
// Where sharing pictures isn't supported, the picture is downloaded instead.
export async function shareMorning(opts, notify) {
  const blob = await drawMorning(opts)
  if (!blob) { notify?.('Couldn’t make the picture on this phone'); return }
  const file = new File([blob], 'my-morning-bankcal.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return } catch (e) { if (e?.name === 'AbortError') return }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = file.name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  notify?.('Picture saved. Share it from your photos')
}
