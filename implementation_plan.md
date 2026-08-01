# Implementation Plan: Major UI & Functional Overhaul

Full app audit and major UI/UX and functional overhaul for the Propulsion Analysis Suite. The goal is to elevate the application to a polished, professional, state-of-the-art engineering platform ready for public deployment and rigorous use, featuring expanded physics solvers, engine presets, interactive SVG blueprint heatmaps, MoC Prandtl-Meyer nozzle characteristics, dynamic constraint envelope visualization, robust error handling, and comprehensive stability verification.

## User Review Required

> [!IMPORTANT]
> This overhaul includes:
> 1. **Physics & Core Expansion**: Addition of Turbofan with Reheat/Afterburner cycle mode, Ramjet cycle mode, Method of Characteristics (MoC) Prandtl-Meyer characteristic net solver, and aircraft mission constraint synthesis with payload-range estimation.
> 2. **Real-World Engine & Rocket Presets**: Built-in instant configuration presets for CFM56-7B, GE90-115B, F100-PW-229, Olympus 593, Merlin 1D, RS-25, Raptor 2, F-16 Falcon, and Concorde.
> 3. **Interactive Station Heatmap & MoC Visualizations**: Dynamic SVG engine schematic with temperature/pressure heat map gradients and interactive station inspection; 3D MoC nozzle mesh and Mach characteristic lines.
> 4. **Units System Toggle**: Seamless UI-level toggle between Standard International (SI) and Imperial units for all displays, cards, and tooltips.
> 5. **Stability & Error Recovery**: Global error boundaries, toast notifications, offline resilience, and input range guardrails.

## Proposed Changes

### Core Physics & Backend Solver Extensions

#### [MODIFY] [cycle.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/cycle.py)
#### [MODIFY] [moc.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/rocket/moc.py)
#### [MODIFY] [analyzer.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/rocket/analyzer.py)
#### [MODIFY] [mission.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/mission.py)
#### [MODIFY] [main.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/main.py)
- Extend `CycleAnalyzer` to support afterburner reheat combustion and high-speed Ramjet cycle thermodynamics.
- Extend `MoCNozzle` in `core/rocket/moc.py` to calculate Prandtl-Meyer expansion characteristic waves, exit wall turn angle, and generate STL/OBJ geometry export buffers.
- Add preset data provider endpoint `/analyze/presets` in `backend/main.py` serving real-world turbofan, rocket, and mission specs.
- Enhance input parameter validation and edge-case numerical fallback logic.

---

### Presets & Data Layer

#### [NEW] [presets.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/presets.py)
#### [NEW] [presets.js](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/data/presets.js)
- Define authoritative preset profiles for gas turbines (CFM56-7B, GE90-115B, F100-PW-229, Olympus 593), rocket engines (Merlin 1D, RS-25, Raptor 2, RL10), aircraft missions (F-16 Falcon, Commercial Jetliner, Concorde, U-2 Recon), and fault scenarios.

---

### App Shell, Global Controls & Units Conversion

#### [MODIFY] [index.css](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/index.css)
#### [MODIFY] [App.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/App.jsx)
#### [NEW] [unitConversion.js](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/utils/unitConversion.js)
#### [NEW] [KeyboardShortcutsModal.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/components/KeyboardShortcutsModal.jsx)
#### [NEW] [PresetSelectorModal.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/components/PresetSelectorModal.jsx)
- Implement global SI / Imperial unit display converter.
- Add top header controls: backend ping latency badge, unit toggle pill, Quick Presets modal, keyboard shortcuts dialog (`?`).
- Polish dark/light glassmorphic UI design tokens and animation curves.

---

### Interactive Page Views & Visualizations

#### [MODIFY] [ParametricCycle.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/ParametricCycle.jsx)
#### [NEW] [EngineBlueprintDiagram.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/components/EngineBlueprintDiagram.jsx)
- Build an interactive SVG Engine Blueprint Schematic featuring real-time temperature/pressure station heat-map color gradients, flow direction animation, and click-to-inspect station modal.
- Add preset loader selector, afterburner and ramjet cycle mode toggles, and calculation report export.

#### [MODIFY] [PerformanceMap.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/PerformanceMap.jsx)
- Enhance compressor map with operating line path, surge line warning zone shading, efficiency contours, and corrected throttle deck export.

#### [MODIFY] [RocketAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/RocketAnalysis.jsx)
- Enhance MoC nozzle view with 2D Prandtl-Meyer characteristic line mesh and 3D surface plot viewer, STL 3D model export button, propellant equilibrium summary, and rocket presets.

#### [MODIFY] [MissionAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/MissionAnalysis.jsx)
- Render filled polygon envelope for feasible T/W vs W/S operating domain, design point target marker, payload-range estimate, and aircraft mission presets.

#### [MODIFY] [Diagnostics.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Diagnostics.jsx)
- Radar spider chart for component fault signature visual diagnosis, telemetry gauge meters, and fault injector presets.

#### [MODIFY] [Settings.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Settings.jsx)
- System diagnostic status panel, default units settings, cache management, and API URL config.

---

### Verification, Tests & Systems Engineering Traceability

#### [MODIFY] [test_api.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/tests/test_api.py)
#### [MODIFY] [test_core.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/tests/test_core.py)
#### [MODIFY] [functional_breakdown_diagram.md](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/functional_breakdown_diagram.md)
#### [MODIFY] [walkthrough.md](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/walkthrough.md)
- Add backend unit/integration tests for afterburner, ramjet, MoC characteristic net, presets, and error edge cases.
- Execute full backend `pytest tests/ -v` and frontend `npm run lint; npm run build`.
- Maintain zero line-crossing Systems Engineering FBD diagram in `functional_breakdown_diagram.md`.

## Recommended Skills

- **`orchestrate`**: Task decomposition and tracking.
- **`refactor`**: Internal code structure, cleanliness, and readability.
- **`system_integrator`**: REST API endpoints, Pydantic schemas, React hooks, unit conversion layer.
- **`ui_review`**: Anti-AI-Slop visual aesthetics, glassmorphic layout, font hierarchy, active state indicators.
- **`error_handling`**: Toast alerts, boundary fallbacks, numerical solver recovery.
- **`verify`**: Automated test suite and build verification.

## Verification Plan

### Automated Tests
- Backend pytest suite: `pytest tests/ -v`
- Frontend linter: `cd frontend && npm run lint`
- Frontend production bundle build: `cd frontend && npm run build`

### Manual Verification
- Test interactive SVG station blueprint diagram hover & station modal.
- Test SI <-> Imperial unit toggle across all page metrics and Plotly charts.
- Test loading presets (CFM56-7B, Merlin 1D, F-16, etc.) on each analysis page.
- Test STL 3D export for MoC rocket nozzle geometry.
- Test keyboard shortcuts (`?` key overlay).