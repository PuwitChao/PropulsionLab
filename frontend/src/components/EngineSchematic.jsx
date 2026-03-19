import React from 'react';
import { useSettings } from '../context/SettingsContext';

const EngineSchematic = ({ activeStation, onStationClick }) => {
  const { theme } = useSettings();
  const isLight = theme === 'light';
  
  // Design system colors based on theme
  const bgColor = isLight ? '#f8fafc' : '#0a0a0a';
  const borderColor = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)';
  const strokeColor = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.2)';
  const textColorMuted = isLight ? '#94a3b8' : 'rgba(255,255,255,0.3)';
  const textColorSecondary = isLight ? '#64748b' : 'rgba(255,255,255,0.5)';
  const accentColor = 'var(--primary)';
  const activeColor = isLight ? '#0f172a' : '#fff';
  const surfaceAlpha = isLight ? 'rgba(15, 23, 42, 0.03)' : 'rgba(255,255,255,0.02)';

  // SVG proportions and station positions
  const height = 180;
  const width = 600;
  
  // Standard Turbojet Stations (Simplified)
  const stations = [
    { id: 0, x: 20, label: '0', full: 'Ambient' },
    { id: 2, x: 100, label: '2', full: 'Inlet Exit' },
    { id: 3, x: 220, label: '3', full: 'Comp. Exit' },
    { id: 4, x: 340, label: '4', full: 'Turb. Inlet' },
    { id: 5, x: 460, label: '5', full: 'Turb. Exit' },
    { id: 9, x: 580, label: '9', full: 'Nozzle Exit' }
  ];

  return (
    <div className="engine-schematic-container p-12 border border-white/10 bg-surface-container-low transition-all" style={{ borderRadius: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="80%">
        {/* Connection Lines (Engine Body) */}
        <path 
          d={`M 100 ${height/2 - 40} L 220 ${height/2 - 30} L 340 ${height/2 - 30} L 460 ${height/2 - 35} L 550 ${height/2 - 50}`}
          fill="none" stroke={strokeColor} strokeWidth="2" 
        />
        <path 
          d={`M 100 ${height/2 + 40} L 220 ${height/2 + 30} L 340 ${height/2 + 30} L 460 ${height/2 + 35} L 550 ${height/2 + 50}`}
          fill="none" stroke={strokeColor} strokeWidth="2" 
        />

        {/* Component Boxes */}
        {/* Compressor */}
        <polygon points="100,30 220,40 220,110 100,120" fill={surfaceAlpha} stroke={strokeColor} />
        <text x="160" y="80" textAnchor="middle" fill={textColorMuted} fontSize="12" fontWeight="bold" className="mono tracking-widest uppercase">COM</text>

        {/* Burner */}
        <rect x="220" y="40" width="120" height="70" fill={isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255,255,255,0.05)'} stroke={strokeColor} />
        <text x="280" y="80" textAnchor="middle" fill={textColorSecondary} fontSize="12" fontWeight="bold" className="mono tracking-widest uppercase">BURNER</text>

        {/* Turbine */}
        <polygon points="340,40 460,30 460,120 340,110" fill={surfaceAlpha} stroke={strokeColor} />
        <text x="400" y="80" textAnchor="middle" fill={textColorMuted} fontSize="12" fontWeight="bold" className="mono tracking-widest uppercase">TURB</text>

        {/* Stations */}
        {stations.map(s => (
          <g 
            key={s.id} 
            onClick={() => onStationClick && onStationClick(s.id)}
            style={{ cursor: 'pointer' }}
          >
            <line x1={s.x} y1={20} x2={s.x} y2={130} stroke={activeStation === s.id ? "#fff" : strokeColor} strokeDasharray="4" />
            <circle cx={s.x} cy={150} r="12" fill={activeStation === s.id ? "#fff" : bgColor} stroke={activeStation === s.id ? "#fff" : strokeColor} />
            <text x={s.x} y={155} textAnchor="middle" fill={activeStation === s.id ? (isLight ? '#fff' : '#000') : textColorSecondary} fontSize="14" fontWeight="black" className="mono">{s.label}</text>
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-6 mt-10 gap-2 text-center uppercase tracking-widest mono font-black">
        {stations.map(s => (
          <span key={s.id} className={`text-[12px] ${activeStation === s.id ? 'text-white' : 'text-white/20'}`}>{s.full}</span>
        ))}
      </div>
    </div>
  );
};

export default EngineSchematic;
