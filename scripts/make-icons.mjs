// Generates PNG app icons from public/icon.svg. Run: npm run icons
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/icon.svg', import.meta.url))
const out = (f) => new URL(`../public/${f}`, import.meta.url).pathname

await sharp(svg).resize(192, 192).png().toFile(out('pwa-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('pwa-512.png'))
await sharp(svg).resize(180, 180).flatten({ background: '#E3F5D8' }).png().toFile(out('apple-touch-icon.png'))
// Maskable: full-bleed background so Android can crop to any shape
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#E3F5D8' } })
  .composite([{ input: await sharp(svg).resize(400, 400).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile(out('pwa-512-maskable.png'))
console.log('icons done')
