# Propulsion Analysis Suite Documentation

## Overview

The Propulsion Analysis Suite is a professional-grade engineering platform designed for high-fidelity modeling of aerospace propulsion systems. It integrates mission requirement synthesis, gas turbine cycle analysis, and chemical equilibrium rocket performance solvers within a unified SI framework.

## Key Features

### 1. Mission Matching & Constraint Analysis

- **Constraint Synthesis**: Evaluates thrust-to-weight (T/W) and wing-loading (W/S) requirements.
- **Mission Profiles**: Supports cruise, sustained turns, takeoff, and service ceiling constraints.
- **Optimum Design Corner**: Identifies the minimum weight aircraft configuration satisfying all requirements.

### 2. Gas Turbine On-Design

- **Turbojet & Turbofan**: Solves thermodynamic states at every engine station.
- **Parametric Sweeps**: Analyzes performance sensitivity to bypass ratio (BPR), fan pressure ratio (FPR), and overall pressure ratio (OPR).
- **Polytropic Efficiencies**: Accounts for aerodynamic losses using high-fidelity efficiency correlations.

### 3. Gas Turbine Off-Design

- **Compressor/Turbine Matching**: Uses parametric maps to predict engine performance at part-power.
- **Throttle Sweep**: Evaluates TSFC, thrust, and surge margin across the entire throttle range.
- **Engine Deck Export**: Generates standardized CSV decks for flight simulation integration.

### 4. Rocket Propulsion Analysis

- **Chemical Equilibrium**: Uses Gibbs free energy minimization (via Cantera) for species concentration and Isp prediction.
- **Bartz Heat Transfer**: Predicts convective heat flux and gas-side film coefficients along the nozzle.
- **Nozzle Design (MoC)**: Generates Method of Characteristics supersonic contours for bell-shaped nozzles.
- **Engine Sizing**: Back-calculates throat area, exit area, and mass flows from a specified thrust target.

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
