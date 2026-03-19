"""
Propulsion Analysis Platform — FastAPI Backend
All physical quantities in SI units unless explicitly labelled.

Endpoints
---------
GET  /                          — health ping
GET  /health                    — structured health check

POST /analyze/mission           — T/W vs W/S constraint diagram
POST /analyze/cycle             — on-design gas turbine cycle (turbojet or turbofan)
POST /analyze/cycle/sweep       — pressure ratio sweep (sensitivity)
POST /analyze/cycle/turbofan    — turbofan specific on-design
POST /analyze/offdesign/map     — compressor map data (full speed + surge lines)
POST /analyze/offdesign/throttle — throttle sweep at fixed ambient/Mach

POST /analyze/rocket            — chemical equilibrium rocket analysis
POST /analyze/rocket/sweep      — OF ratio sweep
POST /analyze/rocket/moc        — Method of Characteristics nozzle contour
POST /analyze/rocket/altitude   — altitude Isp/Cf performance table
POST /analyze/rocket/sizing     — engine sizing from thrust target
"""

import os, sys
from typing import List, Dict, Any, Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.gas_turbine.mission import MissionAnalyzer
from core.gas_turbine.cycle import CycleAnalyzer
from core.gas_turbine.off_design import OffDesignSolver
from core.rocket.analyzer import RocketAnalyzer
from core.rocket.moc import MoCNozzle
from core.units import isa_atmosphere

app = FastAPI(
    title="Propulsion Analysis Web Platform API",
    description="High-fidelity gas turbine and rocket propulsion analysis.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ════════════════════════════════════════════════════════════════════════════
# Health
# ════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "Propulsion Analysis API v2.0 is running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "2.0.0"}


# ════════════════════════════════════════════════════════════════════════════
# Mission Analysis
# ════════════════════════════════════════════════════════════════════════════

class MissionConstraintRequest(BaseModel):
    aircraft_data: Dict[str, Any]
    constraints:   List[Dict[str, Any]]
    ws_min:   float = 1000.0
    ws_max:   float = 8000.0
    ws_steps: int   = 50

@app.post("/analyze/mission")
async def analyze_mission(request: MissionConstraintRequest):
    try:
        analyzer  = MissionAnalyzer(request.aircraft_data)
        ws_range  = [
            request.ws_min + i * (request.ws_max - request.ws_min) / request.ws_steps
            for i in range(request.ws_steps + 1)
        ]
        return analyzer.generate_constraint_data(ws_range, request.constraints)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — On-Design (Turbojet)
# ════════════════════════════════════════════════════════════════════════════

class CycleRequest(BaseModel):
    alt:        float = Field(...,  ge=0,    le=50000, description="Altitude [m]")
    mach:       float = Field(...,  ge=0,    le=4.0,   description="Flight Mach number")
    prc:        float = Field(...,  ge=1.1,  le=80.0,  description="Compressor Pressure Ratio")
    tit:        float = Field(...,  ge=300,  le=2500,  description="Turbine Inlet Temperature [K]")
    eta_c:      float = Field(0.88, ge=0.6,  le=0.97)
    eta_t:      float = Field(0.92, ge=0.6,  le=0.97)
    eta_ab:     float = Field(0.95, ge=0.5,  le=1.0)
    h_fuel:     float = Field(42.8e6)
    ab_enabled: bool  = False
    ab_temp:    float = Field(2000.0, ge=1000, le=2500)
    inlet_recovery:  float = Field(0.98,  ge=0.8,  le=1.0)
    burner_eta:      float = Field(0.99,  ge=0.8,  le=1.0)
    burner_dp_frac:  float = Field(0.04,  ge=0.0,  le=0.15)
    nozzle_dp_frac:  float = Field(0.02,  ge=0.0,  le=0.10)
    phi_inlet:       float = Field(0.0,   ge=0.0,  le=0.10)
    eta_install_nozzle: float = Field(1.0, ge=0.8, le=1.0)

@app.post("/analyze/cycle")
async def analyze_cycle(request: CycleRequest):
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        analyzer  = CycleAnalyzer(p0, t0, request.mach)
        result    = analyzer.solve_turbojet(
            prc=request.prc, tit=request.tit,
            eta_c=request.eta_c, eta_t=request.eta_t,
            eta_ab=request.eta_ab, h_fuel=request.h_fuel,
            ab_enabled=request.ab_enabled, ab_temp=request.ab_temp,
            inlet_recovery=request.inlet_recovery,
            burner_eta=request.burner_eta,
            burner_dp_frac=request.burner_dp_frac,
            nozzle_dp_frac=request.nozzle_dp_frac,
            phi_inlet=request.phi_inlet,
            eta_install_nozzle=request.eta_install_nozzle,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Turbofan On-Design ─────────────────────────────────────────────────────

class TurbofanRequest(BaseModel):
    alt:   float = Field(..., ge=0,   le=50000)
    mach:  float = Field(..., ge=0,   le=4.0)
    bpr:   float = Field(..., ge=0.5, le=15.0,  description="Bypass Ratio")
    fpr:   float = Field(..., ge=1.1, le=3.0,   description="Fan Pressure Ratio")
    opr:   float = Field(..., ge=5.0, le=60.0,  description="Overall Pressure Ratio")
    tit:   float = Field(..., ge=800, le=2500,   description="Turbine Inlet Temperature [K]")
    eta_fan: float = Field(0.90, ge=0.6, le=0.97)
    eta_c:   float = Field(0.87, ge=0.6, le=0.97)
    eta_t:   float = Field(0.91, ge=0.6, le=0.97)
    eta_ab:  float = Field(0.95)
    h_fuel:  float = Field(42.8e6)
    ab_enabled: bool  = False
    ab_temp:    float = Field(2000.0)
    inlet_recovery:  float = Field(0.98)
    burner_eta:      float = Field(0.99)
    burner_dp_frac:  float = Field(0.04)
    phi_inlet:       float = Field(0.0)
    eta_install_nozzle: float = Field(1.0, ge=0.8, le=1.0)
    mixed_exhaust: bool = False

@app.post("/analyze/cycle/turbofan")
async def analyze_turbofan(request: TurbofanRequest):
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        analyzer  = CycleAnalyzer(p0, t0, request.mach)
        result    = analyzer.solve_turbofan(
            bpr=request.bpr, fpr=request.fpr, opr=request.opr, tit=request.tit,
            eta_fan=request.eta_fan, eta_c=request.eta_c, eta_t=request.eta_t,
            eta_ab=request.eta_ab, h_fuel=request.h_fuel,
            ab_enabled=request.ab_enabled, ab_temp=request.ab_temp,
            inlet_recovery=request.inlet_recovery,
            burner_eta=request.burner_eta,
            burner_dp_frac=request.burner_dp_frac,
            phi_inlet=request.phi_inlet,
            eta_install_nozzle=request.eta_install_nozzle,
            mixed_exhaust=request.mixed_exhaust,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Parametric Sweep (pressure ratio) ─────────────────────────────────────

class CycleSweepRequest(BaseModel):
    alt:     float = 10000.0
    mach:    float = 0.8
    tit:     float = 1600.0
    prc_min: float = 2.0
    prc_max: float = 50.0
    steps:   int   = 25

@app.post("/analyze/cycle/sweep")
async def analyze_cycle_sweep(request: CycleSweepRequest):
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        results   = []
        prc_range = [
            request.prc_min + i * (request.prc_max - request.prc_min) / request.steps
            for i in range(request.steps + 1)
        ]
        for prc in prc_range:
            ca  = CycleAnalyzer(p0, t0, request.mach)
            res = ca.solve_turbojet(prc, request.tit)
            results.append({
                "prc":          prc,
                "spec_thrust":  res["spec_thrust"],
                "tsfc":         res["tsfc"],
                "eta_thermal":  res.get("eta_thermal", 0),
                "eta_overall":  res.get("eta_overall", 0),
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Off-Design
# ════════════════════════════════════════════════════════════════════════════

class OffDesignMapRequest(BaseModel):
    n_speed_lines: int = Field(7,  ge=3, le=12)
    n_flow_points: int = Field(20, ge=8, le=50)
    # Design-point params used to anchor the map
    alt:  float = Field(0.0,  ge=0, le=20000)
    mach: float = Field(0.0,  ge=0, le=1.5)
    prc:  float = Field(20.0, ge=2, le=60)
    tit:  float = Field(1500, ge=600, le=2500)

@app.post("/analyze/offdesign/map")
async def offdesign_map(request: OffDesignMapRequest):
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        ca = CycleAnalyzer(p0, t0, request.mach)
        dp = ca.solve_turbojet(request.prc, request.tit)

        solver = OffDesignSolver(dp)
        map_data = solver.generate_compressor_map(
            n_speed_lines=request.n_speed_lines,
            n_flow_points=request.n_flow_points,
        )
        return map_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ThrottleSweepRequest(BaseModel):
    alt:   float = Field(0.0,  ge=0, le=20000)
    mach:  float = Field(0.0,  ge=0, le=1.5)
    prc:   float = Field(20.0, ge=2, le=60)
    tit:   float = Field(1500, ge=600, le=2500)
    h_fuel: float = Field(42.8e6)
    n_points: int = Field(20, ge=5, le=50)

@app.post("/analyze/offdesign/throttle")
async def offdesign_throttle(request: ThrottleSweepRequest):
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        ca = CycleAnalyzer(p0, t0, request.mach)
        dp = ca.solve_turbojet(request.prc, request.tit)

        solver  = OffDesignSolver(dp)
        results = solver.sweep_throttle(p0, t0, request.mach, request.h_fuel, request.n_points)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════
# Rocket — On-Design
# ════════════════════════════════════════════════════════════════════════════

class RocketRequest(BaseModel):
    pc:                   float = Field(..., ge=1e5,  le=50e6)
    of_ratio:             float = Field(..., ge=0.5,  le=20.0)
    pe:                   float = Field(101325.0, ge=0, le=1e6)
    propellant:           str   = Field("H2/O2")
    mode:                 str   = Field("shifting")
    exit_half_angle_deg:  float = Field(15.0, ge=1, le=45)
    thrust_target_N:      Optional[float] = Field(None, ge=100, le=10e6)
    compute_heat_transfer: bool = True
    impurity_species:      Optional[str]   = Field(None)
    impurity_mass_frac:    float           = Field(0.0, ge=0.0, le=0.5)

@app.post("/analyze/rocket")
async def analyze_rocket(request: RocketRequest):
    try:
        analyzer = RocketAnalyzer(request.pc)
        result   = analyzer.solve_equilibrium(
            propellant_name=request.propellant,
            of_ratio=request.of_ratio,
            p_exit_pa=request.pe,
            mode=request.mode,
            exit_half_angle_deg=request.exit_half_angle_deg,
            thrust_target_N=request.thrust_target_N,
            compute_heat_transfer=request.compute_heat_transfer,
            impurity_species=request.impurity_species,
            impurity_mass_frac=request.impurity_mass_frac,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/rocket/sweep")
async def analyze_rocket_sweep(request: RocketRequest):
    try:
        analyzer  = RocketAnalyzer(request.pc)
        of_range  = [0.5 + i * 0.25 for i in range(60)]   # 0.5 to 15.25
        results   = []
        for of in of_range:
            try:
                res = analyzer.solve_equilibrium(
                    request.propellant, of, request.pe, request.mode,
                    request.exit_half_angle_deg, compute_heat_transfer=False,
                )
                results.append({
                    "of_ratio"      : of,
                    "isp"           : res["isp_delivered"],
                    "isp_vac"       : res["isp_vac"],
                    "t_chamber"     : res["t_chamber"],
                    "c_star"        : res["c_star"],
                    "cf_delivered"  : res["cf_delivered"],
                    "epsilon"       : res["epsilon"],
                    "gamma"         : res.get("gamma"),
                    "mw_chamber"    : res.get("mw_chamber"),
                })
            except Exception:
                pass
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Altitude Performance ───────────────────────────────────────────────────

class AltitudeRequest(BaseModel):
    pc:         float = Field(..., ge=1e5, le=50e6)
    of_ratio:   float = Field(..., ge=0.5, le=20.0)
    propellant: str   = Field("H2/O2")
    mode:       str   = Field("shifting")
    alt_max_km: float = Field(100.0, ge=0, le=500)
    n_points:   int   = Field(20, ge=5, le=50)

@app.post("/analyze/rocket/altitude")
async def analyze_rocket_altitude(request: AltitudeRequest):
    try:
        altitudes = [i * request.alt_max_km * 1000.0 / (request.n_points - 1)
                     for i in range(request.n_points)]
        analyzer  = RocketAnalyzer(request.pc)
        return analyzer.altitude_performance(request.propellant, request.of_ratio, altitudes, request.mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Engine Sizing from Thrust Target ──────────────────────────────────────

class SizingRequest(BaseModel):
    thrust_N:   float = Field(..., ge=100, le=10e6, description="Target vacuum thrust [N]")
    pc:         float = Field(..., ge=1e5, le=50e6)
    of_ratio:   float = Field(..., ge=0.5, le=20.0)
    pe:         float = Field(101325.0)
    propellant: str   = Field("H2/O2")
    mode:       str   = Field("shifting")

@app.post("/analyze/rocket/sizing")
async def analyze_sizing(request: SizingRequest):
    try:
        analyzer = RocketAnalyzer(request.pc)
        result   = analyzer.solve_equilibrium(
            propellant_name=request.propellant,
            of_ratio=request.of_ratio,
            p_exit_pa=request.pe,
            mode=request.mode,
            thrust_target_N=request.thrust_N,
            compute_heat_transfer=True,
        )
        # Return only sizing-relevant fields
        return {
            'thrust_N'    : request.thrust_N,
            'propellant'  : request.propellant,
            'pc_MPa'      : request.pc / 1e6,
            'of_ratio'    : request.of_ratio,
            'isp_vac'     : result['isp_vac'],
            'isp_sl'      : result['isp_sl'],
            'c_star'      : result['c_star'],
            'cf_delivered': result['cf_delivered'],
            'epsilon'     : result['epsilon'],
            'A_throat_m2' : result['A_throat'],
            'A_exit_m2'   : result['A_exit'],
            'r_throat_m'  : result['r_throat'],
            'r_exit_m'    : result['r_exit'],
            'mdot_kg_s'   : result['mdot_total'],
            'mdot_fuel'   : result['mdot_fuel'],
            'mdot_ox'     : result['mdot_ox'],
            'mass_engine_kg': result['mass_est'],
            'nozzle_dims' : result['nozzle_dims'],
            'heat_transfer': result.get('heat_transfer'),
            'math_trace': result.get('math_trace'),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Method of Characteristics ─────────────────────────────────────────────

class MoCRequest(BaseModel):
    gamma:         float = Field(1.2,  ge=1.1, le=1.67)
    mach_exit:     float = Field(3.0,  ge=1.5, le=6.0)
    throat_radius: float = Field(0.1,  ge=0.001, le=2.0)

@app.post("/analyze/rocket/moc")
async def analyze_rocket_moc(request: MoCRequest):
    try:
        designer = MoCNozzle(request.gamma, request.mach_exit, request.throat_radius)
        x, y     = designer.solve_contour()
        mesh     = designer.get_mesh_data()
        return {"x": x, "y": y, "mesh": mesh}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
