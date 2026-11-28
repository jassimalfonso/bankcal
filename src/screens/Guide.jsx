// Getting people started: how to put BankCal on the home screen (iPhone has no install button,
// so we show the steps), and a short tour of the app.
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useState } from 'react'
import { IconClose } from '../icons'
import { useEscape, useSheetDrag } from '../motion'

// ───────── Install ─────────
let deferred = null // Android / desktop Chrome hands us its install prompt here
const waiting = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; waiting.forEach((f) => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; waiting.forEach((f) => f()) })
}
export const isInstalled = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true)
// Which instructions fit this phone
export function installKind(ua = navigator.userAgent, touch = navigator.maxTouchPoints) {
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touch > 1) // iPadOS says it's a Mac
  if (ios) {
    if (/FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|Snapchat|WhatsApp|LinkedInApp/i.test(ua)) return 'ios-inapp' // opened inside another app: no Add to Home Screen there
    return /CriOS|FxiOS|EdgiOS/i.test(ua) ? 'ios-other' : 'ios-safari'
  }
  if (/Android/i.test(ua)) return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|Snapchat/i.test(ua) ? 'android-inapp' : 'android'
  return 'desktop'
}
const ShareGlyph = () => (
  <svg className="share-glyph" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V3M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
)
const STEPS = {
  'ios-safari': [
    <>Tap the <b>Share</b> button <ShareGlyph /> in Safari’s toolbar. It’s at the bottom of the screen on iPhone; if you can’t see it, tap <b>⋯</b> first.</>,
    <>Scroll down the list and tap <b>Add to Home Screen</b>.</>,
    <>Tap <b>Add</b>. BankCal now opens from your home screen like any app.</>,
  ],
  'ios-other': [
    <>Tap the <b>Share</b> button <ShareGlyph /> next to the address bar.</>,
    <>Tap <b>Add to Home Screen</b>. If it isn’t in the list, open this page in <b>Safari</b> instead and do the same there.</>,
    <>Tap <b>Add</b>.</>,
  ],
  'ios-inapp': [
    <>You’re viewing this inside another app, which can’t install it. Tap <b>⋯</b> or the compass and choose <b>Open in Safari</b> (or copy the link into Safari).</>,
    <>In Safari, tap the <b>Share</b> button <ShareGlyph />.</>,
    <>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</>,
  ],
  android: [
    <>Tap <b>⋮</b> at the top right of Chrome.</>,
    <>Tap <b>Add to Home screen</b>, then <b>Install</b>.</>,
    <>BankCal appears with your other apps.</>,
  ],
  'android-inapp': [
    <>You’re viewing this inside another app. Tap <b>⋮</b> and choose <b>Open in Chrome</b>.</>,
    <>In Chrome, tap <b>⋮</b>, then <b>Add to Home screen</b>.</>,
    <>Tap <b>Install</b>.</>,
  ],
  desktop: [
    <>On your phone, open <b>bankcal.vercel.app</b>.</>,
    <>iPhone: Safari → Share → Add to Home Screen. Android: Chrome → ⋮ → Add to Home screen.</>,
    <>On a computer, Chrome and Edge show an install icon in the address bar.</>,
  ],
}
function usePrompt() {
  const [, bump] = useState(0)
  useEffect(() => { const f = () => bump((n) => n + 1); waiting.add(f); return () => waiting.delete(f) }, [])
  return deferred
}

export function InstallSteps({ onDone }) {
  const prompt = usePrompt()
  const kind = installKind()
  if (prompt) return (
    <div className="install-steps">
      <p className="is-lead">One tap and BankCal sits with your other apps: full screen, and it works offline.</p>
      <button className="btn-primary" onClick={async () => { prompt.prompt(); await prompt.userChoice.catch(() => {}); deferred = null; onDone?.() }}>Install BankCal</button>
    </div>
  )
  return (
    <div className="install-steps">
      <p className="is-lead">{kind.startsWith('ios') ? 'iPhone has no Install button, so it takes three taps:' : 'Three quick steps:'}</p>
      <ol>{STEPS[kind].map((s, i) => <li key={i}><span className="is-n" aria-hidden="true">{i + 1}</span><span>{s}</span></li>)}</ol>
    </div>
  )
}

export function InstallSheet({ onClose }) {
  const drag = useSheetDrag(onClose)
  useEscape(onClose)
  return createPortal(
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add BankCal to your home screen">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div><p className="muted">Opens full screen, like an app</p><h2>Add to your home screen</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <InstallSteps onDone={onClose} />
        <button className="btn-soft install-done" onClick={onClose}>Got it</button>
      </div>
    </div>, document.body)
}

// A quiet card on Today until the app is installed or the card is dismissed
export function InstallBanner() {
  const [gone, setGone] = useState(() => { try { return isInstalled() || !!localStorage.getItem('bankcal:install-hide') || installKind() === 'desktop' } catch { return true } })
  const [open, setOpen] = useState(false)
  if (gone) return null
  const hide = () => { try { localStorage.setItem('bankcal:install-hide', '1') } catch { /* ignore */ } setGone(true) }
  return (
    <section className="install-banner">
      <span className="ib-icon" aria-hidden="true">📲</span>
      <div className="ib-main"><b>Add BankCal to your home screen</b><small>Opens full screen like an app. Takes three taps.</small></div>
      <div className="ib-btns">
        <button className="btn-soft" onClick={() => setOpen(true)}>Show me how</button>
        <button className="link-btn" onClick={hide}>Not now</button>
      </div>
      {open && <InstallSheet onClose={() => setOpen(false)} />}
    </section>
  )
}

// ───────── Tour ─────────
// Each step moves to the right tab and puts a spotlight on the real thing it talks about.
const TOUR = [
  { tab: 'today', at: '.hero', title: 'Your day at a glance', text: 'The ring shows the calories you have left today. It fills back up every morning, and your buddy’s mood follows along.' },
  { tab: 'today', at: '.fab', title: 'Log with the + button', text: 'Tap + to log food or a workout. For food you can search, snap a photo of your plate or scan a barcode. Hold + to jump straight to food.' },
  { tab: 'today', at: '.hero-stats', title: 'Moving adds to your budget', text: 'Steps and workouts you log show up as Burned and give you more calories to spend that day.' },
  { tab: 'today', title: 'Quick moves on your list', text: 'On a logged food: swipe right to log it again, swipe left to remove it, or press and hold for more options.' },
  { tab: 'week', at: '[data-tour="week"]', title: 'Progress', text: 'Your week, weight and sleep. Tap any bar for that day’s details, and make a short replay video of your progress to share.' },
  { tab: 'train', at: '[data-tour="train"]', title: 'Train', text: 'Simple routines and plans with moves shown step by step. Pick your level and what kit you have.' },
  { tab: 'me', at: '[data-tour="me"]', title: 'Settings', text: 'Change your goal, buddy and colours, set reminders, take a break or a celebration day, and link a partner if you want to cheer each other on.' },
]
export function Tour({ setTab, onDone }) {
  const installStep = !isInstalled() && installKind() !== 'desktop'
  const steps = installStep ? [...TOUR, { tab: 'today', install: true, title: 'Last thing: add it to your home screen' }] : TOUR
  const [i, setI] = useState(0)
  const [box, setBox] = useState(null)
  const s = steps[i]
  useEscape(onDone)
  useLayoutEffect(() => { setTab(s.tab); window.scrollTo(0, 0) }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let t = 0, raf = 0, tries = 0
    const find = () => {
      const el = s.at ? document.querySelector(s.at) : null
      if (!el) { if (s.at && tries++ < 30) t = setTimeout(find, 60); else setBox(null); return } // the tab may still be drawing
      const vh = window.innerHeight
      const fixed = !!el.closest('.tabbar') || el.classList.contains('fab')
      if (!fixed) { // bring it into the top half; the card sits below it
        const r0 = el.getBoundingClientRect()
        window.scrollTo(0, Math.max(0, window.scrollY + r0.top - (r0.height > vh * 0.4 ? 64 : vh * 0.2)))
      }
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const y = Math.max(8, r.top - 8)
        setBox({ x: Math.max(4, r.left - 8), y, w: Math.min(window.innerWidth - 8, r.width + 16), h: fixed ? r.height + 16 : Math.min(r.height + 16, vh * 0.5 - y) })
      })
    }
    setBox(null)
    t = setTimeout(find, 380) // after the tab has slid in
    const again = () => { clearTimeout(t); t = setTimeout(find, 120) }
    window.addEventListener('resize', again)
    return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('resize', again) }
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  const last = i === steps.length - 1
  const low = box && box.y > window.innerHeight * 0.5 // the thing is at the bottom (tabs, +): the card goes above it
  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-label={`App tour, step ${i + 1} of ${steps.length}`}>
      <div className="tour-light" style={box ? { left: box.x, top: box.y, width: box.w, height: box.h } : { left: '50%', top: '30%', width: 0, height: 0 }} />
      <div className={`tour-card ${low ? 'up' : ''}`} key={i}>
        <div className="tour-top">
          <span className="tour-count">{i + 1} of {steps.length}</span>
          {!last && <button className="link-btn" onClick={onDone}>Skip tour</button>}
        </div>
        <h2>{s.title}</h2>
        {s.install ? <InstallSteps /> : <p>{s.text}</p>}
        <div className="tour-btns">
          {i > 0 && <button className="btn-soft" onClick={() => setI(i - 1)}>Back</button>}
          <button className="btn-primary" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? 'Start using BankCal' : 'Next'}</button>
        </div>
      </div>
    </div>, document.body)
}
