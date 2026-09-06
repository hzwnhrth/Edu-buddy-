import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

/**
 * ErrorBoundary
 * Catches any render crash so the app never shows a blank white screen.
 * Shows a friendly message with a reload button instead.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('EduBuddy crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFBFC', padding: '1.5rem' }}>
          <div style={{ maxWidth: '440px', textAlign: 'center', background: '#FFFFFF', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 24px 48px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.03)' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Something went wrong</h1>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '0.8rem 2rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#FFF', fontWeight: 800, fontSize: '0.95rem', fontFamily: 'inherit' }}
            >
              Reload EduBuddy
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Application Entry Point
 * Mounts the React application to the DOM using createRoot.
 * Wraps the App component in StrictMode for additional development checks.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
