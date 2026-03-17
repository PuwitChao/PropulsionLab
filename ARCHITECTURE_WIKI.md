# System Architecture & Technical Wiki

## High-Level Architecture

The platform follows a decoupled client-server architecture.

```mermaid
graph TD
    subgraph "Frontend (React + Vite)"
        UI[User Interface]
        State[React State - Hooks]
        Ctx[Settings Context]
        Plot[Plotly.js Visualization]
    end

    subgraph "Backend (FastAPI)"
        API[FastAPI Endpoints]
        GT[Gas Turbine Core]
        RC[Rocket Core]
        MS[Mission Solver]
        CT[Cantera / Thermo]
    end

    UI --> State
    State --> API
    API --> RC
    API --> GT
    API --> MS
    RC --> CT
    GT --> State
    API --> UI
```

## Data Flow & Processing Logic

### 1. Rocket Analysis Flow

When parameters are updated in the Rocket Analysis tab:

1. **Frontend**: Triggers `runAll()` which sends requests to `/analyze/rocket`, `/sweep`, and `/altitude`.
2. **Backend**: Instantiates a `RocketAnalyzer`.
   - **Equilibrium Solver**: Uses `Cantera` to minimize Gibbs free energy at chamber pressure ($P_c$).
   - **Nozzle Flow**: Propagates properties to the throat (isentropic Mach 1) and exit pressure ($P_e$).
   - **Bartz Heat Flux**: Computes $h_{gas}$ using the Bartz correlation based on local Reynolds and Mach numbers.
3. **Frontend**: Receives data and updates state. The `MetricCard` components compute $\Delta$ values if a baseline is active.

### 2. Gas Turbine Cycle Logic

- **Station Numbering**: Follows standard aerospace numbering (S0: Freestream, S2: Inlet, S3: Compressor Exit, S4: Turbine Inlet, etc.).
- **Isentropic vs Polytropic**: The solver converts user-specified polytropic efficiencies ($\eta_p$) into isentropic efficiencies ($\eta_{isen}$) using the pressure ratio to ensure thermodynamic consistency.
- **Off-Design**: Uses a Newton-Raphson solver to match mass flow and work between the compressor and turbine on parametric maps.

## Component Hierarchy & State Management

### Settings Context

Provides global access to:

- **Theme**: `dark` | `light`.
- **Text Size**: Scaling factor (0.8 - 1.5).
- Shared CSS variables in `index.css`.

### Plotting System

- Built on **react-plotly.js**.
- **Revision Control**: Uses a `plotRevision` state to force UI updates during parameter shifts.
- **Theming**: Integrated with `getLayout()` helper to switch between dark/light layout tokens.

## Mathematical Models

### Bartz Heat Flux

Calculates convective heat transfer coefficient $h_g$:

$$h_g = \left[\frac{0.026}{D_t^{0.2}} \frac{\mu^{0.2} C_p}{Pr^{0.6}}\right] \left(\frac{P_c}{c^*}\right)^{0.8} \sigma$$

Where $\sigma$ is a correction for boundary layer properties.

### Method of Characteristics (MoC)

- Solves the compatibility equations along characteristic lines ($C^+$ and $C^-$).
- Generates a shock-free supersonic nozzle contour for maximum thrust extraction.
- Maps internal expansion nodes to a grid for visualization.

## Future Extensibility

- **User Authentication**: Hooks already exist in `Settings.jsx` for cloud sync.
- **Mission Storage**: Planned persistence for aircraft configuration JSONs.
- **Multi-Propellant Comparison**: Extension of the current baseline logic to support N-way propellant overlays.
