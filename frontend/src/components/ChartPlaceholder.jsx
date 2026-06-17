/**
 * ChartPlaceholder - standardized empty/loading state for chart panels.
 * Replaces the ad-hoc "Awaiting_Analysis…" / "Pending" divs scattered across pages.
 *
 * Props:
 *   loading {bool?}  - if true, the message pulses to signal in-progress work
 *   message {string} - text to display (uppercased styling applied by class)
 */
export default function ChartPlaceholder({ loading = false, message }) {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className={`text-white/10 uppercase tracking-[0.5em] text-[13px] font-black ${loading ? 'animate-pulse' : ''}`}>
                {message}
            </div>
        </div>
    )
}
