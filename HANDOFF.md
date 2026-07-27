# Handoff: Systems Engineering FBD Diagram

**Generated**: 2026-07-28 02:55
**Branch**: main
**Status**: Completed / Ready for Review

## Loop Telemetry
- **Active Subtask**: Systems Engineering Functional Breakdown Diagram (FBD) Creation & Audit
- **Current Iteration**: 4/4 (Completed)
- **Healing Actions Taken**: Converted diagram layout to Layered Rank Grouping (`BUS_LAYER` -> `ROW_1` -> `ROW_2`), added multiline `<br/>` breaks, updated `AGENTS.md` with mandatory FBD rule, and pushed to Git.

## Goal
Perform systems engineering functional decomposition of the Propulsion Analysis Suite using `/functional_breakdown_diagram` to generate a Draw.io-compatible FBD, Hierarchical Functional Tree, and Quantitative Breakdown Table, ensuring zero text overflow, no line crossings, and proper boundary definitions.

## Completed
- [x] Analyzed complete codebase architecture across backend FastAPI solvers (`CycleAnalyzer`, `OffDesignSolver`, `FaultDiagnosticSolver`, `RocketAnalyzer`, `MoCNozzle`, `MissionAnalyzer`) and frontend React components.
- [x] Generated comprehensive systems engineering artifact (`functional_breakdown_diagram.md`) featuring FBD, Hierarchical Functional Tree, and Quantitative Subsystem Breakdown Table.
- [x] Conducted full forensic audit of Draw.io rendering bugs (4-column squashing, double-nested subgraph text tag bugs, text overflow, and line crossings).
- [x] Resolved Draw.io rendering bugs by implementing Layered Rank Grouping (`BUS_LAYER` -> `ROW_1` -> `ROW_2`), explicit multiline `<br/>` label breaks, and zero line-crossing vertical signal flows.
- [x] Updated project `AGENTS.md` under Engineering Conventions to mandate checking and updating `functional_breakdown_diagram.md` whenever changes or features are implemented in the codebase.
- [x] Committed and pushed all changes to `main` branch (`https://github.com/PuwitChao/PropulsionLab.git`).

## Not Yet Done
- [ ] Future feature expansions (Turbofan Afterburner, Dynamic Transient Throttle Deck, Method of Characteristics Grid Solver, Hybrid-Electric Powertrain Slot) marked as expansion slots in diagram to be implemented in future sprints.

## Failed Approaches (Don't Repeat These)
- **Double-Nested Subgraphs (`BOUNDARY` -> `ROW` -> `PILLAR`)**: Caused Draw.io's Mermaid importer to generate floating dummy title text boxes at the top rank. Fixed by converting to single-level rank subgraphs (`BUS_LAYER` -> `ROW_1` -> `ROW_2`).
- **Simultaneous Bus Connections to 4 Pillars**: Connecting `BUS` to all 4 pillar inputs at once forced Draw.io to place all 4 pillars on the same horizontal rank, creating an ultra-wide 4-column squashed layout. Fixed by connecting `BUS` to `ROW_1` (Pillars 1 & 2) and routing `ROW_1` outputs down to `ROW_2` (Pillars 3 & 4).
- **Single-Line Long Labels (>35 chars)**: Caused text overflow outside Draw.io node boxes. Fixed by inserting explicit `<br/>` HTML breaks and normalizing line lengths to 15–20 characters.

## Key Decisions
| Decision | Rationale |
|---|---|
| Enforce Layered Rank Grouping | Forces Draw.io to stack pillars in a clean, balanced 2x2 grid layout without line crossings. |
| Add Mandatory FBD Rule to `AGENTS.md` | Ensures the Systems Engineering FBD diagram (`functional_breakdown_diagram.md`) is continuously updated as new features/modules are implemented. |

## Current State
- **Working**: Draw.io Mermaid code renders with zero text overflow, zero header collisions, clean 2x2 grid topology, and clear boundary styling.
- **Broken**: None.
- **Uncommitted Changes**: None (all committed and pushed to `main`).

## Files to Know
| File | Why It Matters |
|---|---|
| `functional_breakdown_diagram.md` | Main Systems Engineering report containing Draw.io FBD Mermaid code, Functional Tree, and Subsystem Breakdown Table. |
| `AGENTS.md` | Workspace guidance file updated with mandatory FBD maintenance rule. |

## Code Context
```mermaid
// Layered Rank Grouping pattern for Draw.io:
subgraph BUS_LAYER["SYSTEM BOUNDARY: Central Control & State Bus"]
    BUS["⚡ CENTRAL REST API ROUTER & STATE BUS"]
end
subgraph ROW_1["DOMAIN LAYER 1: Gas Turbine & Diagnostics"]
    // Pillar 1 & Pillar 2
end
subgraph ROW_2["DOMAIN LAYER 2: Rocket & Aircraft Missions"]
    // Pillar 3 & Pillar 4
end
BUS ==> P1_IN
BUS ==> P2_IN
P1_OUT ==> P3_IN
P2_OUT ==> P4_IN
```

## Resume Instructions
1. Open [Draw.io](https://app.diagrams.net/), select **Arrange -> Insert -> Advanced -> Mermaid**, and paste the updated Mermaid code from `functional_breakdown_diagram.md`.
2. When adding new features or backend endpoints in future coding sessions, update `functional_breakdown_diagram.md` per the new rule in `AGENTS.md`.

## Setup Required
- Standard Python & Node environment per `AGENTS.md`.

## Warnings & Caveats
- Do not use double-nested subgraphs when writing Mermaid diagrams for Draw.io, as Draw.io's parser creates floating text tag artifacts.
