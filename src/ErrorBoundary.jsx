// If something on screen ever fails to draw, show a friendly way back instead of a blank page.
// Nothing is lost: everything logged is already saved.
// With `onError` (used around sheets), the broken part is simply closed and the app carries on.
import { Component } from 'react'
import { reloadFresh } from './update'

export default class ErrorBoundary extends Component {
  state = { error: null, busy: false }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    console.error('BankCal hit a problem', error, info?.componentStack)
    try { localStorage.setItem('bankcal:last-error', JSON.stringify({ at: Date.now(), msg: String(error?.message ?? error).slice(0, 300) })) } catch { /* ignore */ }
    if (this.props.onError) { this.props.onError(error); this.setState({ error: null }) }
  }
  render() {
    if (!this.state.error) return this.props.children
    if (this.props.onError) return null
    return (
      <div className="crash">
        <div className="crash-card">
          <div className="crash-emoji" aria-hidden="true">🥚💫</div>
          <h1>Oops, something tripped</h1>
          <p>Your logs are safe. Tap below to pick up where you left off, on the newest version.</p>
          <button className="btn-primary" disabled={this.state.busy} onClick={() => { this.setState({ busy: true }); reloadFresh() }}>{this.state.busy ? 'Getting the latest…' : 'Reload BankCal'}</button>
          <small>{String(this.state.error?.message ?? '').slice(0, 140)}</small>
        </div>
      </div>
    )
  }
}
