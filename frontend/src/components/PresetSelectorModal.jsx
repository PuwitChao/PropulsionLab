import React from 'react';
import { ENGINE_PRESETS, ROCKET_PRESETS, MISSION_PRESETS } from '../data/presets';

export default function PresetSelectorModal({ isOpen, onClose, onSelectPreset, category = 'gas_turbine' }) {
  if (!isOpen) return null;

  let presets = ENGINE_PRESETS;
  if (category === 'rocket') presets = ROCKET_PRESETS;
  if (category === 'mission') presets = MISSION_PRESETS;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preset-modal-title"
    >
      <div className="technical-card w-full max-w-2xl p-6 rounded-lg shadow-2xl relative border border-white/10">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-accent-cyan">model_training</span>
            <h2 id="preset-modal-title" className="text-lg font-bold text-white tracking-wider uppercase">
              Select Propulsion Preset Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close preset selector"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className="technical-card p-4 text-left border border-white/5 hover:border-accent-cyan/40 hover:bg-accent-cyan-dim transition-all group flex justify-between items-center"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-base group-hover:text-accent-cyan transition-colors">
                    {preset.name}
                  </span>
                  <span className="status-badge text-[9px] py-0.5 px-2">
                    {preset.subtitle || preset.engineType}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-1">
                  {preset.description || "Real-world engineering baseline specification."}
                </p>
              </div>
              <span className="material-symbols-outlined text-white/30 group-hover:text-accent-cyan group-hover:translate-x-1 transition-all">
                arrow_forward
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white border border-white/20 rounded hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
