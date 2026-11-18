// If something on screen ever fails to draw, show a friendly way back instead of a blank page.
// Nothing is lost: everything logged is already saved.
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    console.error('BankCal hit a problem', error, info?.componentStack)
    try { localStorage.setItem('bankcal:last-error', JSON.stringify({ at: Date.now(), msg: String(error?.message ?? error).slice(0, 300) })) } catch { /* ignore */ }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash">
        <div className="crash-card">
          <div className="crash-emoji" aria-hidden="true">🥚💫</div>
          <h1>Oops, something tripped</h1>
          <p>Your logs are safe. Tap below to pick up where you left off.</p>
          <button className="btn-primary" onClick={() => location.reload()}>Reload BankCal</button>
          <small>{String(this.state.error?.message ?? '').slice(0, 140)}</small>
        </div>
      </div>
    )
  }
}
