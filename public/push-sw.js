// Added to the app's service worker: shows cheer notifications and opens BankCal when tapped.
self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { title: 'BankCal', body: e.data?.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'BankCal', {
    body: d.body || '', tag: d.tag || 'cheer', renotify: true,
    icon: '/pwa-192.png', badge: '/pwa-192.png', data: { url: '/' },
  }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => 'focus' in c)
    return open ? open.focus() : self.clients.openWindow('/')
  }))
})
