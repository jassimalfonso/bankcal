// Keeps the installed app up to date without anyone having to refresh.
// It checks for a new version when the app opens, whenever it comes back to the front,
// and every 15 minutes. A new version is applied straight away if the app has only just
// opened; otherwise it waits until the app is put in the background, so nothing being
// typed is ever interrupted.
import { registerSW } from 'virtual:pwa-register'

export const VERSION = __APP_VERSION__

export function startUpdates() {
  if (!('serviceWorker' in navigator)) return
  let waiting = false
  const apply = () => { waiting = false; update(true) }
  const update = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (document.hidden || performance.now() < 10000) apply()
      else waiting = true
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
      setInterval(check, 15 * 60 * 1000)
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check() })
    },
  })
  document.addEventListener('visibilitychange', () => { if (document.hidden && waiting) apply() })
}
