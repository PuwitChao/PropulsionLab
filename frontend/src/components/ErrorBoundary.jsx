import React from 'react'

/**
 * ErrorBoundary - prevents a render error in one page from blanking the whole app.
 * Wrap page content with this; pass a `key` (e.g. the active tab id) so navigating
 * to a different module remounts the boundary and clears a previous fault.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { error: null }
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        console.error('Module render error:', error, info)
    }

    reset = () => this.setState({ error: null })

    render() {
        if (this.state.error) {
            return (
                <div className="warning-panel px-16 py-12 m-8 space-y-6 text-center">
                    <span className="material-symbols-outlined warning-text !text-[32px]">error</span>
                    <h2 className="mono text-[13px] font-black warning-text uppercase tracking-widest">Module Render Fault</h2>
                    <p className="mono text-[11px] text-white/50 uppercase tracking-widest">
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={this.reset}
                        className="mono text-[11px] font-black uppercase tracking-widest text-white border border-white/20 hover:border-white px-8 py-3 transition-colors"
                    >
                        Reset Module
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
