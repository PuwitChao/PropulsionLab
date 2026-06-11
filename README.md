# 🚀 Propulsion Analysis Suite (v2.1.0-STABLE)
 It provides an integrated environment for thermodynamic cycle analysis, chemical equilibrium combustion modeling, and mission-level design synthesis.

[![Python Version](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![React Version](https://img.shields.io/badge/react-18.0+-61dafb.svg)](https://reactjs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Key Features


### 1. Gas Turbine Analysis

- **Cantera-Driven Cycle Solver**: High-fidelity thermodynamic analysis using temperature-dependent gas properties and chemical kinetics.
- **On-Design & Off-Design**: Comprehensive sizing and performance mapping for Turbojet and Turbofan architectures.
- **Mixed-Exhaust Augmentation**: Advanced modeling for augmented turbofans with momentum-preserving mixers.

### 2. Rocket Propulsion

- **Chemical Equilibrium (CEA)**: Cantera-based Gibbs minimization for Isp and species optimization across 20+ propellant combinations.
- **3D Nozzle Synthesis**: Nozzle contour design using Method of Characteristics (MoC) with interactive 3D surface visualization.
- **CAD Integration**: Direct export of optimized nozzle geometries to STL format for 3D printing and CFD validation.
- **Bartz Heat Flux**: Distributed convective heat transfer modeling along the nozzle liner.

### 3. Mission Constraint Synthesis

- **Constraint Diagrams**: synthesis of design point requirements (T/W vs W/S) for military and civil aircraft.
- **Workspace Persistence**: Automatic saving of design configurations via local storage.

---

## Technology Stack

- **Frontend**: React 19, Vite, Plotly.js (Dual-axis interactive charts), Tailwind CSS (Premium Monochromatic UI).
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

   The API serves on `http://127.0.0.1:8000`. Confirm it is up with
   `curl http://127.0.0.1:8000/health`.

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev          # dev server at http://localhost:5173
   ```

   The frontend reads the API base URL from `VITE_API_URL` (see
   `frontend/.env.example`); it falls back to `http://127.0.0.1:8000` for
   local development.

### Running Tests & Checks

```bash
# Backend unit + API tests (matches CI)
pytest tests/ -v

# Frontend lint + production build (matches CI)
cd frontend && npm run lint && npm run build
```

### Troubleshooting

If port 8000 is held by a stale process, free it on any OS with:

```bash
python scripts/kill_port_8000.py        # defaults to 8000; pass a port to override
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
