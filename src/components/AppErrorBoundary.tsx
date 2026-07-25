import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch() {
    // Keep production output free of wallet, address, and transaction details.
    if (import.meta.env.DEV) {
      console.error('[app] rendering error')
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="app-error" role="alert" aria-live="assertive">
        <h1>StellarPay Lite is unavailable</h1>
        <p>The interface hit an unexpected error. Refresh the page and try again.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Refresh page
        </button>
      </main>
    )
  }
}
