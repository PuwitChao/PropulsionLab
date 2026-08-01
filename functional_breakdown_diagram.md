# Systems Engineering Functional Breakdown Diagram (FBD)

```mermaid
graph TD
    %% Core System Architecture
    SubGraph_System["Propulsion Analysis Suite"]

    %% Backend Subsystem
    subgraph Backend ["FastAPI Microservice Layer"]
        API_Endpoints["REST Endpoints (/analyze/*)"]
        Preset_Manager["Preset Repository (core/presets.py)"]
        Diagnostics_Kernel["Fault Isolation Engine (core/gas_turbine/diagnostics.py)"]
    end

    %% Solvers Subsystem
    subgraph Solvers ["Physics & Thermodynamic Solvers"]
        Cycle_Analyzer["CycleAnalyzer (Gas Turbine & Ramjet)"]
        OffDesign_Solver["OffDesignSolver (Compressor Matching & Throttle)"]
        Mission_Analyzer["MissionAnalyzer (Constraint Diagrams & Breguet Range)"]
        Rocket_Analyzer["RocketAnalyzer (Gibbs Minimization Equilibrium & Bartz Heat Flux)"]
        MoC_Nozzle["MoCNozzle (Method of Characteristics, STL & Wavefront OBJ 3D)"]
    end

    %% Frontend Subsystem
    subgraph Frontend ["React SPA Application"]
        App_Shell["App Shell & Navigation (App.jsx)"]
        Blueprint_Diag["Engine Blueprint Heatmap (EngineBlueprintDiagram.jsx)"]
        Preset_Modal["Preset Selector Modal (PresetSelectorModal.jsx)"]
        Shortcut_Modal["Keyboard Shortcuts Overlay (KeyboardShortcutsModal.jsx)"]
        Unit_System["Unit Conversion Matrix (unitConversion.js)"]
        Plotly_Engine["Interactive Charting Engine (Plotly.js)"]
    end

    %% Data Flow Connections
    App_Shell --> Unit_System
    App_Shell --> Preset_Modal
    App_Shell --> Shortcut_Modal
    App_Shell --> API_Endpoints
    API_Endpoints --> Preset_Manager
    API_Endpoints --> Diagnostics_Kernel
    API_Endpoints --> Cycle_Analyzer
    API_Endpoints --> OffDesign_Solver
    API_Endpoints --> Mission_Analyzer
    API_Endpoints --> Rocket_Analyzer
    API_Endpoints --> MoC_Nozzle
    Blueprint_Diag --> Unit_System
    Plotly_Engine --> App_Shell
```

## Quantitative Subsystem Breakdown

| Subsystem Module | File Location | Key Capabilities | Output Artifacts |
| --- | --- | --- | --- |
| **Gas Turbine Cycle** | `core/gas_turbine/cycle.py` | SLS/altitude design, turbofan separate/mixed, ramjet shock recovery | Temperatures, pressures, TSFC, specific thrust |
| **Off-Design Solver** | `core/gas_turbine/off_design.py` | Compressor map matching, throttle sweeps | Operating lines, surge margin |
| **Rocket CEA & MoC** | `core/rocket/analyzer.py`, `moc.py` | Chemical equilibrium, Bartz heat flux, supersonic nozzle MoC | 2D mesh, STL 3D solid, OBJ 3D mesh |
| **Mission Synthesis** | `core/gas_turbine/mission.py` | Constraint diagram synthesis (T/W vs W/S), Breguet range | Sizing corner, payload-range curve |
| **Fault Diagnostics** | `core/gas_turbine/diagnostics.py` | EGT margin loss, compressor fouling, turbine erosion isolation | Fault signature radar, recommended maintenance |
