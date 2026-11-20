import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito/wght.css'
import './styles.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary'
import { startUpdates } from './update'
import { startKeyboardHelp } from './keyboard'

startUpdates()
startKeyboardHelp()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
