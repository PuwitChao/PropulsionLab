import React, { useState } from 'react';
import { formatTemp, formatPressure } from '../utils/unitConversion';

export default function EngineBlueprintDiagram({ stations, mode = 'turbofan', unitSystem = 'si' }) {
  const [selectedStation, setSelectedStation] = useState(null);

  // Helper to resolve color gradient based on total temperature Tt [K]
  const getTempColor = (ttK) => {
    if (!ttK || ttK <= 0) return '#00F0FF'; // default cyan
    if (ttK < 400) return '#00F0FF'; // Cold air (cyan)
    if (ttK < 800) return '#3B82F6'; // Warm compressed air (blue)
    if (ttK < 1300) return '#F59E0B'; // Hot compressed / turbine exit (amber)
    if (ttK < 1800) return '#EF4444'; // Combustion (red)
    return '#DC2626'; // Afterburner / Reheat peak (bright red)
  };

  const getStationData = (stNum) => {
    if (!stations) return { tt: 0, pt: 0, s: 0 };
    return stations[stNum] || { tt: 0, pt: 0, s: 0 };
  };

  const stationNodes = [
    { id: 0, label: '0: Freestream', x: 40, y: 100, stNum: 0 },
    { id: 2, label: '2: Inlet Exit', x: 120, y: 100, stNum: 2 },
    { id: 21, label: '21: Fan Exit', x: 190, y: 60, stNum: 21, hidden: mode === 'turbojet' || mode === 'ramjet' },
    { id: 25, label: '25: Booster', x: 260, y: 100, stNum: 25, hidden: mode === 'turbojet' || mode === 'ramjet' },
    { id: 3, label: '3: HPC Exit', x: 350, y: 100, stNum: 3, hidden: mode === 'ramjet' },
    { id: 4, label: '4: Tit Combustor', x: 450, y: 100, stNum: 4 },
    { id: 5, label: '5: Core Exit', x: 550, y: 100, stNum: 5, hidden: mode === 'ramjet' },
    { id: 7, label: '7: Reheat/AB', x: 640, y: 100, stNum: 7 },
    { id: 9, label: '9: Nozzle Exit', x: 740, y: 100, stNum: 9 },
  ].filter(n => !n.hidden);

  return (
    <div className="technical-card p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-accent-cyan">schema</span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Interactive Thermodynamic Engine Blueprint
          </h3>
        </div>
        <span className="status-badge text-[10px] py-1 px-3">
          {mode.toUpperCase()} ARCHITECTURE
        </span>
      </div>

      <div className="relative w-full overflow-x-auto custom-scrollbar">
        <svg viewBox="0 0 800 200" className="w-full min-w-[700px] h-48 drop-shadow-lg">
          <defs>
            {/* Heat map gradient across engine core */}
            <linearGradient id="coreHeatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={getTempColor(getStationData(0).tt)} />
              <stop offset="25%" stopColor={getTempColor(getStationData(2).tt)} />
              <stop offset="50%" stopColor={getTempColor(getStationData(3).tt)} />
              <stop offset="70%" stopColor={getTempColor(getStationData(4).tt)} />
              <stop offset="85%" stopColor={getTempColor(getStationData(5).tt)} />
              <stop offset="100%" stopColor={getTempColor(getStationData(9).tt)} />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
          
          {/* Outer Nacelle Outline */}
          <path
            d="M 60 40 L 220 30 L 680 40 L 760 70 L 760 130 L 680 160 L 220 170 L 60 160 Z"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
            strokeDasharray="6,3"
          />

          {/* Engine Core Heat-Map Tube */}
          <path
            d="M 120 70 L 450 75 L 550 80 L 740 70 L 740 130 L 550 120 L 450 125 L 120 130 Z"
            fill="url(#coreHeatGradient)"
            fillOpacity="0.15"
            stroke="url(#coreHeatGradient)"
            strokeWidth="2.5"
          />

          {/* Animated Flow Streamlines */}
          <line x1="80" y1="85" x2="720" y2="85" stroke="#00F0FF" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="8,6">
            <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite" />
          </line>
          <line x1="80" y1="115" x2="720" y2="115" stroke="#00F0FF" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="8,6">
            <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite" />
          </line>

          {/* Component Blocks */}
          {mode !== 'ramjet' && (
            <>
              {/* Fan / LPC */}
              <rect x="180" y="50" width="30" height="100" fill="rgba(0, 240, 255, 0.15)" stroke="#00F0FF" strokeWidth="1" rx="3" />
              <text x="195" y="104" fill="#00F0FF" fontSize="10" fontWeight="bold" textAnchor="middle">FAN</text>

              {/* HPC */}
              <rect x="330" y="65" width="50" height="70" fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth="1" rx="3" />
              <text x="355" y="104" fill="#3B82F6" fontSize="10" fontWeight="bold" textAnchor="middle">HPC</text>
            </>
          )}

          {/* Combustor */}
          <rect x="430" y="70" width="50" height="60" fill="rgba(239, 68, 68, 0.25)" stroke="#EF4444" strokeWidth="1.5" rx="3" />
          <text x="455" y="104" fill="#EF4444" fontSize="10" fontWeight="bold" textAnchor="middle">CC</text>

          {mode !== 'ramjet' && (
            /* Turbine */
            <>
              <rect x="530" y="70" width="40" height="60" fill="rgba(245, 158, 11, 0.2)" stroke="#F59E0B" strokeWidth="1" rx="3" />
              <text x="550" y="104" fill="#F59E0B" fontSize="10" fontWeight="bold" textAnchor="middle">TURB</text>
            </>
          )}

          {/* Nozzle */}
          <polygon points="700,70 760,80 760,120 700,130" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <text x="730" y="104" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">NOZ</text>

          {/* Interactive Station Nodes */}
          {stationNodes.map((node) => {
            const data = getStationData(node.stNum);
            const color = getTempColor(data.tt);
            const isSelected = selectedStation?.stNum === node.stNum;

            return (
              <g
                key={node.id}
                onClick={() => setSelectedStation(node)}
                className="cursor-pointer group"
                tabIndex={0}
                role="button"
                aria-label={`Station ${node.label}`}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedStation(node)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 10 : 7}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter="url(#glow)"
                  className="transition-all duration-200 group-hover:scale-125"
                />
                <text
                  x={node.x}
                  y={node.y - 16}
                  fill="#FFFFFF"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="opacity-80 group-hover:opacity-100 transition-opacity"
                >
                  st.{node.stNum}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Station Details Inspector Modal */}
      {selectedStation && (
        <div className="mt-4 p-4 rounded-lg technical-card border border-accent-cyan/30 animate-in flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getTempColor(getStationData(selectedStation.stNum).tt) }}></span>
              <h4 className="text-xs font-bold uppercase text-white tracking-wider">
                Station {selectedStation.label}
              </h4>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-6">
              <div>
                <span className="text-[10px] text-white/50 uppercase font-mono block">Stagnation Temperature</span>
                <span className="text-sm font-bold font-mono text-accent-cyan">
                  {formatTemp(getStationData(selectedStation.stNum).tt, unitSystem)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/50 uppercase font-mono block">Stagnation Pressure</span>
                <span className="text-sm font-bold font-mono text-white">
                  {formatPressure(getStationData(selectedStation.stNum).pt, unitSystem)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/50 uppercase font-mono block">Relative Entropy (s)</span>
                <span className="text-sm font-bold font-mono text-white/80">
                  {getStationData(selectedStation.stNum).s ? `${getStationData(selectedStation.stNum).s.toFixed(1)} J/kg·K` : '—'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedStation(null)}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
