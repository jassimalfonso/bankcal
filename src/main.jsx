import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito/wght.css'
import './styles.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary'
import { startUpdates } from './update'
import { startKeyboardHelp } from './keyboard'
import { startSound } from './sound'
import { BUDDIES, Buddy } from './buddies'
import Move, { MOVES } from './Moves'
import Character, { ACCESSORIES } from './Character'

startUpdates()
startKeyboardHelp()
startSound()

// demo only: ?buddies shows every buddy big, in each mood (for design checks)
const gallery = import.meta.env.MODE === 'demo' && location.search.includes('buddies')
const iconOf = import.meta.env.MODE === 'demo' && new URLSearchParams(location.search).get('icon')
const accGallery = import.meta.env.MODE === 'demo' && location.search.includes('accs')
const moveGallery = import.meta.env.MODE === 'demo' && location.search.includes('moves')
createRoot(document.getElementById('root')).render(iconOf ? (
  <div id="icon" style={{ width: 192, height: 192, display: 'grid', placeItems: 'center', background: '#f3f0ea', borderRadius: 96 }}><Buddy id={iconOf} mood="happy" size={150} /></div>
) : moveGallery ? (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 230px)', gap: 8, padding: 12, background: '#f2f3f7' }}>
    {Object.entries(MOVES).flatMap(([id, m]) => m.poses.map((_, i) => <div key={id + i} style={{ background: '#fff', borderRadius: 16, padding: 6, textAlign: 'center', font: '700 12px system-ui' }}><Move id={id} frame={i} /><div>{id} · {i + 1}</div></div>))}
  </div>
) : accGallery ? (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 120px)', gap: 8, padding: 30, background: '#f2f3f7' }}>
    {ACCESSORIES.flatMap((a) => ['egg', 'onigiri', 'blobcat'].map((k) => <div key={a.id + k} style={{ background: '#fff', borderRadius: 16, padding: '26px 10px 6px', textAlign: 'center', font: '700 11px system-ui' }}><Character kind={k} size={90} acc={a.id} /><div>{a.id}</div></div>))}
  </div>
) : gallery ? (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 180px)', gap: 8, padding: 12, background: '#f2f3f7' }}>
    {Object.entries(BUDDIES).filter(([id]) => !location.search.includes('only=') || location.search.split('only=')[1].split(',').includes(id)).flatMap(([id]) => ['happy', 'ok', 'worried', 'sleepy'].map((m) => (
      <div key={id + m} style={{ background: '#fff', borderRadius: 16, padding: 10, textAlign: 'center', font: '700 12px system-ui' }}><Buddy id={id} mood={m} size={150} /><div>{id} · {m}</div></div>
    )))}
  </div>
) : (
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
))
