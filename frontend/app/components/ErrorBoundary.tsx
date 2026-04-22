'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  sectionName?: string
}

interface State {
  hasError: boolean
  error: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error) {
    console.error(`[ErrorBoundary] ${this.props.sectionName}:`, error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: 40,
          margin: 20,
          borderRadius: 14,
          border: '1px solid #ef444433',
          background: '#ef444410',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>
            {this.props.sectionName || 'Section'} crashed
          </div>
          <div style={{ fontSize: 12, color: '#f87171', maxWidth: 400 }}>
            {this.state.error}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              background: '#ef444422',
              border: '1px solid #ef444444',
              borderRadius: 8,
              color: '#ef4444',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary