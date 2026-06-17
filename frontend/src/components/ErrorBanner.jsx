/**
 * ErrorBanner - shared inline error banner used across analysis pages.
 * Renders nothing when there is no error.
 *
 * Props:
 *   error   {string|null} - error message to display
 *   onRetry {function?}   - optional retry handler; shows a RETRY button when provided
 */
export default function ErrorBanner({ error, onRetry }) {
    if (!error) return null
    return (
        <div className="warning-panel px-12 py-8 flex items-center gap-8">
            <span className="material-symbols-outlined warning-text !text-[22px] shrink-0">error_outline</span>
            <p className="mono text-[11px] warning-text uppercase tracking-widest leading-relaxed flex-1">{error}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    aria-label="Retry analysis"
                    className="mono text-[11px] font-black uppercase tracking-widest text-white border border-white/20 hover:border-white px-6 py-2 transition-colors shrink-0"
                >
                    Retry
                </button>
            )}
        </div>
    )
}
