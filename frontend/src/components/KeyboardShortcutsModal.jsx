import React from 'react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Tab', desc: 'Navigate between form fields and menu items' },
    { key: 'U', desc: 'Toggle Unit System (SI <-> Imperial)' },
    { key: 'P', desc: 'Open Preset Selector Modal' },
    { key: '?', desc: 'Toggle Keyboard Shortcuts Help overlay' },
    { key: 'Esc', desc: 'Dismiss active tooltips & modals' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div className="technical-card w-full max-w-lg p-6 rounded-lg shadow-2xl relative border border-white/10">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-accent-cyan">keyboard</span>
            <h2 id="shortcuts-modal-title" className="text-lg font-bold text-white tracking-wider uppercase">
              Keyboard Shortcuts & Controls
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close keyboard shortcuts modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5">
              <span className="text-xs text-white/80">{sc.desc}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-white/10 text-accent-cyan rounded border border-accent-cyan/30">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white border border-white/20 rounded hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
