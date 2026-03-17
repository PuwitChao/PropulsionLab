import React from 'react';
import { useSettings } from '../context/SettingsContext';

const EngineSchematic = ({ activeStation, onStationClick }) => {
  const { theme } = useSettings();
  const isLight = theme === 'light';
  
  // Design system colors based on theme
  const bgColor = isLight ? '#f8fafc' : '#0a0a0a';
  const borderColor = isLight ? '#e2e8f0' : '#222';
  const strokeColor = isLight ? '#cbd5e1' : '#333';
  const textColorMuted = isLight ? '#94a3b8' : '#555';
  const textColorSecondary = isLight ? '#64748b' : '#888';
  const accentColor = 'var(--accent-color)';
  const activeColor = isLight ? '#0f172a' : '#fff';
  const surfaceAlpha = isLight ? 'rgba(15, 23, 42, 0.03)' : 'rgba(255,255,255,0.02)';

  // SVG proportions and station positions
  const height = 150;
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
    <div className="engine-schematic-container" style={{ margin: '2rem 0', background: bgColor, padding: '2rem', borderRadius: '12px', border: `1px solid ${borderColor}`, transition: 'all 0.3s' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
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
        <text x="160" y="80" textAnchor="middle" fill={textColorMuted} fontSize="10" fontWeight="bold">COMPRESSOR</text>

        {/* Burner */}
        <rect x="220" y="40" width="120" height="70" fill={isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255,255,255,0.05)'} stroke={strokeColor} />
        <text x="280" y="80" textAnchor="middle" fill={textColorSecondary} fontSize="10" fontWeight="bold">COMBUSTOR</text>

        {/* Turbine */}
        <polygon points="340,40 460,30 460,120 340,110" fill={surfaceAlpha} stroke={strokeColor} />
        <text x="400" y="80" textAnchor="middle" fill={textColorMuted} fontSize="10" fontWeight="bold">TURBINE</text>

        {/* Stations */}
        {stations.map(s => (
          <g 
            key={s.id} 
            onClick={() => onStationClick && onStationClick(s.id)}
            style={{ cursor: 'pointer' }}
          >
            <line x1={s.x} y1={20} x2={s.x} y2={130} stroke={activeStation === s.id ? accentColor : strokeColor} strokeDasharray="4" />
            <circle cx={s.x} cy={140} r="10" fill={activeStation === s.id ? accentColor : bgColor} stroke={activeStation === s.id ? accentColor : strokeColor} />
            <text x={s.x} y={144} textAnchor="middle" fill={activeStation === s.id ? (isLight ? '#fff' : '#000') : textColorSecondary} fontSize="12" fontWeight="bold">{s.label}</text>
          </g>
        ))}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', marginTop: '1.5rem', color: textColorSecondary, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
        {stations.map(s => (
          <span key={s.id} style={{ color: activeStation === s.id ? accentColor : 'inherit' }}>{s.full}</span>
        ))}
      </div>
    </div>
  );
};

export default EngineSchematic;
