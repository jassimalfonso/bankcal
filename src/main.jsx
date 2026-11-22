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

startUpdates()
startKeyboardHelp()
startSound()

// demo only: ?buddies shows every buddy big, in each mood (for design checks)
const gallery = import.meta.env.MODE === 'demo' && location.search.includes('buddies')
createRoot(document.getElementById('root')).render(gallery ? (
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
