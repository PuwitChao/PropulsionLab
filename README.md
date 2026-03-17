# PropulsionLab

**PropulsionLab** is a computationally rigorous engineering suite for aerospace propulsion systems. It provides an integrated environment for thermodynamic cycle analysis, chemical equilibrium combustion modeling, and mission-level design synthesis.

[![Python Version](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![React Version](https://img.shields.io/badge/react-18.0+-61dafb.svg)](https://reactjs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Key Features

### 1. Gas Turbine Analysis
- **On-Design Parametric Cycle**: Evaluate Turbojet and Turbofan performance across varying altitudes, Mach numbers, and TIT.
- **Off-Design Mapping**: Generate compressor maps and throttle performance curves.
- **Station Audit**: Detailed thermodynamic state tracking (Tt, Pt, s) across all engine stations.

### 2. Rocket Propulsion
- **Chemical Equilibrium (CEA)**: minimized Gibbs free energy solver for ISP and flame temperature estimation.
- **Nozzle Analysis**: Shifting/Frozen flow isp estimation.
- **Heat Transfer**: Bartz-correlation based heat flux analysis and cooling requirements.
- **Engine Sizing**: Structural and mass estimation for chamber and nozzle assemblies.

### 3. Mission Constraint Synthesis
- **T/W vs W/S Diagrams**: multi-point constraint analysis for takeoff, climb, cruise, and sustained maneuvers.
- **Design Point Optimization**: Identification of optimal wing loading and thrust-to-weight ratios.

---

## Technology Stack

- **Frontend**: React 18, Plotly.js (Dual-axis interactive charts), Vanilla CSS (Premium Monochromatic UI).
- **Backend**: FastAPI (Asynchronous Python), Pydantic.
- **Physics Engine**: [Cantera](https://cantera.org/) (Chemical kinetics and thermodynamics).
- **Architecture**: Decoupled client-server design with RESTful API communication.

---

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+
- Cantera (`pip install cantera`)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/PuwitChao/PropulsionLab.git
   cd PropulsionLab
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Documentation & Wiki

Detailed technical methodology and system architecture are available in the repository:
- [User Documentation Guide](DOCUMENTATION.md)
- [Technical Architecture Wiki](ARCHITECTURE_WIKI.md)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Created for Aerospace Engineers and Students.*
