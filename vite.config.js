import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Version shown in the app: package version plus the short id of the exact build.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))
let sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7)
if (!sha) { try { sha = execSync('git rev-parse --short HEAD').toString().trim() } catch { sha = 'local' } }
const built = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' })

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(`${built}, ${sha}`) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // updates are applied by src/update.js at a safe moment
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'BankCal',
        short_name: 'BankCal',
        description: 'Your daily calorie budget — spend it wisely.',
        theme_color: '#F2F3F7',
        background_color: '#F2F3F7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['push-sw.js'],
        importScripts: ['push-sw.js'], // cheer notifications
        navigateFallbackDenylist: [/^\/__\//, /^\/api\//], // let Firebase sign-in pages through
      },
    }),
  ],
})
