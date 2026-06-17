# Implementation Plan — Sprint 6: Comprehensive UI/UX Polishing & Test Readiness

This plan outlines the objectives, design strategies, and code changes to transform the Propulsion Analysis Suite into a professional, test-ready aerospace workspace with outstanding user experience and visual aesthetics.

---

## User Review Required

> [!IMPORTANT]
> **Complete Fault Isolation Terminal Implementation**:
> The `Diagnostics` page (`Diagnostics.jsx`) currently exists in the frontend as a dead page because:
> 1. It is unlinked in the mainframe navigation (`App.jsx` sidebar).
> 2. The backend has **no** `/analyze/diagnostics` endpoint.
>
> We propose **fully implementing this model-based thermodynamic diagnostics engine** on the backend using deterministic reverse-cycle equations (compressor isentropic efficiency, combustor pressure loss, and turbine expansion efficiency). We will officially wire it to the sidebar under a **⚡ FAULT_ISOLATION** terminal.

> [!TIP]
> **Dynamic Aerospace Blueprints**:
> Rather than a static turbojet SVG for all cycle analyses, we will upgrade the `StationDiagram` in `ParametricCycle.jsx` to render a **dynamic SVG blueprint** that adapts to the selected engine type:
> - **Turbojet**: Single-spool axial compressor, primary burner, core turbine, exit nozzle.
> - **Turbofan & Multi-Spool**: Added bypass stream conduits, low-pressure fan, LPC booster, and dual HP/LP shaft lines.
> - **Mixed-Flow Turbofan**: Displays bypass streams merging into a mixer confluence zone before entering the afterburner.

---

## Proposed Changes

### 1. Backend Diagnostics Engine

#### [MODIFY] [backend/main.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/main.py)
- **Data Model**:
  - Implement `DiagnosticsRequest` BaseModel validating sensor telemetry:
    - `pt2` [Pa], `tt2` [K] (compressor inlet)
    - `pt3` [Pa], `tt3` [K] (compressor exit)
    - `pt4` [Pa], `tt4` [K] (turbine inlet)
    - `pt5` [Pa], `tt5` [K] (turbine exit)
    - `gamma_c` [-] (ratio of specific heats for compressor, default `1.4`)
    - `gamma_t` [-] (ratio of specific heats for turbine, default `1.33`)
- **Diagnostic Solver Endpoint `POST /analyze/diagnostics`**:
  - Calculate **Compressor Isentropic Efficiency**:
    $$\eta_c = \frac{T_{t2} \cdot ((P_{t3}/P_{t2})^{(\gamma_c-1)/\gamma_c} - 1)}{T_{t3} - T_{t2}}$$
  - Calculate **Combustor Pressure Loss Fraction**:
    $$\Delta P_b = \frac{P_{t3} - P_{t4}}{P_{t3}} \cdot 100$$
  - Calculate **Turbine Expansion Isentropic Efficiency**:
    $$\eta_t = \frac{T_{t4} - T_{t5}}{T_{t4} \cdot (1 - (P_{t5}/P_{t4})^{(\gamma_t-1)/\gamma_t})}$$
  - **Fault Logic**:
    - Nominal limits: $\eta_c \ge 84\%$, $\eta_t \ge 86\%$, $\Delta P_b \le 6.0\%$.
    - If any limit is violated, set `status = "FAULT_DETECTED"`.
    - Generate specific codes and instructions:
      - `F01: COMPRESSOR_FOULING` (stator rotor degradation).
      - `F02: TURBINE_EROSION` (HP turbine tip wear/clearance loss).
      - `F03: COMBUSTOR_RESTRICTION` (thermal liner distress/blockage).
  - Return `{ eta_c, eta_t, dp_b, status, alerts, messages, math_trace }`.

---

### 2. Mainframe Sidebar & Dashboard Integration

#### [MODIFY] [frontend/src/App.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/App.jsx)
- **Import Diagnostics**: Import the `<Diagnostics />` component from `./pages/Diagnostics`.
- **Add Sidebar Nav Item**:
  - Add `{ id: 'diagnostics', label: 'Fault_Isolation', icon: 'biotech', category: 'PROPULSION' }` to `navItems`.
- **Map Content Switcher**:
  - Add `case 'diagnostics': return <Diagnostics />` to `renderContent()`.
- **Dashboard Grid Update**:
  - Integrate a fifth interactive grid card in the `Dashboard` for the diagnostics node, balancing the layout.

---

### 3. Dynamic Station Blueprints

#### [MODIFY] [frontend/src/pages/ParametricCycle.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/ParametricCycle.jsx)
- **Dynamic `StationDiagram` Component**:
  - Update `StationDiagram` to accept `activeEngine`.
  - Conditional SVG rendering:
    - **Turbojet**: Clean single-spool path.
    - **Turbofan / Multi-Spool**: Split flow channels displaying LPC booster, bypass streams, HP/LP shafts.
    - **Mixed-Flow**: Merged bypass stream and exhaust confluence.
  - Implement premium monochromatic strokes and fills that dynamically invert when in Light/Dark themes.

---

### 4. Interactive Polish & WCAG Contrast Audit
- Review all metric cards and tables in both Light and Dark themes to ensure a premium, sleek contrast ratio meeting WCAG Level AAA standards (7:1).
- Add gentle, professional transition delays (`transition-all duration-300`) and glowing hover states on interactive slider tracks to enrich micro-animations.

---

## Verification Plan

### Automated Regression Tests
- Create a new unit test suite `tests/test_diagnostics.py` testing the reverse diagnostics endpoints.
- Execute:
  ```powershell
  pytest tests/test_diagnostics.py
  ```

### Manual Visual Telemetry Verification
1. **Diagnostics Node**:
   - Click **Fault_Isolation** tab in sidebar.
   - Adjust compressor output temperature to 800 K (degrading efficiency).
   - Verify the fault indicator shifts to **FAULT_DETECTED** with a diagnostic alert and detailed remediation instructions.
2. **Station Blueprint**:
   - Switch between **Turbojet**, **Turbofan**, and **Mixed-Flow** cycle views.
   - Confirm the blueprint blueprint SVG instantly updates its mechanical architecture.
