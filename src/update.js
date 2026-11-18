// Keeps the installed app up to date without anyone having to refresh.
// It checks for a new version when the app opens, whenever it comes back to the front,
// when the phone comes back online, and every 5 minutes.
// A new version is applied straight away if the app has only just opened or hasn't been
// touched yet. Otherwise a small "Update" pill appears (tap it to update now), and the
// update also applies by itself the next time the app goes to the background, so nothing
// being typed is ever interrupted.
import { registerSW } from 'virtual:pwa-register'

export const VERSION = __APP_VERSION__
export const BUILD = __APP_BUILD__ // date and id of this exact build, shown only in Settings

let waiting = false
let applyFn = null
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn(waiting))
// lets the app show "new version ready"
export function onUpdateReady(fn) { listeners.add(fn); fn(waiting); return () => listeners.delete(fn) }
export function applyUpdate() { applyFn?.() }

export function startUpdates() {
  if (!('serviceWorker' in navigator)) return
  let touched = false
  addEventListener('pointerdown', () => { touched = true }, { once: true, capture: true, passive: true })
  const apply = () => { waiting = false; emit(); update(true) }
  applyFn = apply
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (document.hidden || !touched || performance.now() < 10000) apply()
      else { waiting = true; emit() }
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
      setInterval(check, 5 * 60 * 1000)
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check() })
      addEventListener('online', check)
    },
  })
  document.addEventListener('visibilitychange', () => { if (document.hidden && waiting) apply() })
}

// Reload onto the newest version (used by the "something tripped" screen): fetch any
// update first, switch to it, then reload. Falls back to a plain reload.
export async function reloadFresh() {
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms))
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg && navigator.onLine) {
      await Promise.race([reg.update(), wait(4000)])
      const sw = reg.installing
      if (sw) await Promise.race([new Promise((ok) => sw.addEventListener('statechange', () => { if (sw.state !== 'installing') ok() })), wait(8000)])
      if (reg.waiting) {
        const changed = new Promise((ok) => navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true }))
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        await Promise.race([changed, wait(3000)])
      }
    }
  } catch { /* plain reload below */ }
  location.reload()
}
