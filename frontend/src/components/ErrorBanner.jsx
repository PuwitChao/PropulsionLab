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
        <div className="warning-panel px-6 lg:px-12 py-6 lg:py-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <span className="material-symbols-outlined warning-text !text-[22px] shrink-0">error_outline</span>
            <p className="mono text-[11px] warning-text uppercase tracking-widest leading-relaxed flex-1">{error}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    aria-label="Retry analysis"
                    className="mono text-[11px] font-black uppercase tracking-widest text-white border border-white/20 hover:border-accent-cyan hover:text-accent-cyan px-6 py-2 transition-colors shrink-0 cursor-pointer"
                >
                    Retry
                </button>
            )}
        </div>
    )
}
