# Propulsion Analysis Suite Documentation

## Overview

The Propulsion Analysis Suite is a professional-grade engineering platform designed for high-fidelity modeling of aerospace propulsion systems. It integrates mission requirement synthesis, gas turbine cycle analysis, and chemical equilibrium rocket performance solvers within a unified SI framework.

## Key Features

### 1. Mission Matching & Constraint Analysis

- **Constraint Synthesis**: Evaluates thrust-to-weight (T/W) and wing-loading (W/S) requirements.
- **Mission Profiles**: Supports cruise, sustained turns, takeoff, and service ceiling constraints.
- **Optimum Design Corner**: Identifies the minimum weight aircraft configuration satisfying all requirements.

### 2. Gas Turbine On-Design

- **Cantera Real-Gas Core**: Integrates temperature and composition-dependent gas properties (GRI 3.0) for high-fidelity thermodynamic modeling.
- **Mixed & Separate Flow**: Supports both military mixed-exhaust and civil separate-exhaust turbofans.
- **Afterburner Integration**: Accounts for fuel-air ratio shifts and momentum energy balance in augmented cycles.
- **Parametric Sweeps**: Analyzes performance sensitivity to bypass ratio (BPR), fan pressure ratio (FPR), and overall pressure ratio (OPR).

### 3. Gas Turbine Off-Design

- **Performance Fishhooks**: Correlates specific thrust vs. TSFC for identifying optimal cruise throttle points.
- **Compressor/Turbine Matching**: Uses parametric maps to predict engine performance at part-power.
- **Throttle Sweep**: Evaluates real-gas TSFC, thrust, and surge margin across the entire throttle range.

### 4. Rocket Propulsion Analysis

- **Chemical Equilibrium (CEA)**: Uses Gibbs free energy minimization (via Cantera) for species concentration and Isp prediction.
- **3D Nozzle Design (MoC)**: Generates Method of Characteristics supersonic contours for bell-shaped nozzles with 3D Surface visualization.
- **CAD/STL Export**: Generates printable STL mesh files of nozzle contours directly from design points.
- **Bartz Heat Transfer**: Predicts convective heat flux and gas-side film coefficients along the nozzle.

## Getting Started

### Prerequisites

- **Python 3.9+** (Backend)
- **Node.js 16+** (Frontend)
- **Cantera** (Python library)

### Backend Setup

1. Navigate to `/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Run the server: `python -m uvicorn main:app --reload`.

### Frontend Setup

1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Start the dev server: `npm run dev`.

## Units & Standards

- All calculations are performed in **SI Units**.
- Pressures in Pascals [Pa], Temperatures in Kelvin [K], Mass flows in [kg/s].
- Atmosphere model follows **ISA 1976**.
