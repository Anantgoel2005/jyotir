"use client"

import type { ReactNode } from "react"
import { Component } from "react"

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl opacity-30 font-serif">ॐ</div>
          <h3 className="text-zinc-400 text-sm font-medium">Something shifted in the cosmos</h3>
          <p className="text-zinc-600 text-xs">Refresh the page to realign the stars</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            className="mt-3 px-4 py-1.5 rounded-full text-xs border border-amber-400/20 text-amber-400 hover:bg-amber-400/10 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
