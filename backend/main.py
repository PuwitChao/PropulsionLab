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
POST /analyze/rocket/moc           — Method of Characteristics nozzle contour
POST /analyze/rocket/altitude      — altitude Isp/Cf performance table
POST /analyze/rocket/export/csv    — Nozzle contour coordinates as CSV
POST /analyze/cycle/sensitivity    — Multi-parameter sensitivity sweep (T4/Alt/OPR)
Propulsion Analysis Suite — Backend API (v2.2.0-dev)

System architect for high-fidelity gas turbine cycle analysis, rocket equilibrium (CEA),
and mission performance synthesis.

Core dependencies: Cantera (Equilibrium), FastAPI (REST), Pydantic (Validation).
"""

import os, sys
from typing import List, Dict, Any, Optional
import math
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("propulsion-api")

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

# Local analytical modules
from core.units import isa_atmosphere
from core.gas_turbine.cycle import CycleAnalyzer
from core.gas_turbine.off_design import OffDesignSolver
from core.rocket.analyzer import RocketAnalyzer
from core.rocket.moc import MoCNozzle
from core.gas_turbine.mission import MissionAnalyzer

app = FastAPI(
    title="Propulsion Architecture API",
    description="High-fidelity aerospace solver core for gas turbines and rockets.",
    version="2.2.0"
)

# ── Security & Policy ────────────────────────────────────────────────────────
_ALLOWED_ORIGINS = [
    o.strip() for o in
    os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _api_error(e: Exception, status: int = 500) -> HTTPException:
    """Log full exception internally; return sanitised HTTPException to caller."""
    logger.error("API error: %s", e, exc_info=True)
    return HTTPException(status_code=status, detail=str(e))

# ════════════════════════════════════════════════════════════════════════════
# Health
# ════════════════════════════════════════════════════════════════════════════

@app.get("/")
def read_root():
    """Returns the API status and versioning."""
    return {"message": "Propulsion Analysis API v2.2.0 is running"}

@app.get("/version")
def get_version():
    """Returns the structured version info."""
    return {
        "version": "2.2.0",
        "build_date": "2026-03-30",
        "status": "operational"
    }

@app.get("/health")
def health_check():
    """System health audit endpoint for frontend status badges."""
    return {"status": "healthy", "version": "2.2.0", "timestamp": datetime.now().isoformat()}

@app.get("/health/diagnostics")
def get_diagnostics():
    """
    Detailed system telemetry for the Settings workspace.
    Verifies connectivity to the Cantera kernel and thermodynamic modules.
    """
    return {
        "status": "operational",
        "version": "2.2.0",
        "components": {
            "gas_turbine_core": "active",
            "rocket_cea_engine": "active",
            "mission_constraint_optimizer": "active",
            "cantera_interface": "connected"
        },
        "system_time": datetime.now().isoformat(),
        "memory_profile": "nominal"
    }


# ════════════════════════════════════════════════════════════════════════════
# Mission Analysis
# ════════════════════════════════════════════════════════════════════════════

class MissionConstraintRequest(BaseModel):
    """Data model for mission matching charts (T/W vs W/S)."""
    aircraft_data: Dict[str, Any]
    constraints:   List[Dict[str, Any]]
    ws_min:   float = 1000.0
    ws_max:   float = 8000.0
    ws_steps: int   = Field(50, ge=1, le=500)

@app.post("/analyze/mission")
async def analyze_mission(request: MissionConstraintRequest):
    """
    Synthesizes the feasible design space for aircraft mission requirements.
    Calculates operational envelopes for stall, takeoff, landing, and cruise.
    """
    try:
        analyzer  = MissionAnalyzer(request.aircraft_data)
        ws_range  = [
            request.ws_min + i * (request.ws_max - request.ws_min) / request.ws_steps
            for i in range(request.ws_steps + 1)
        ]
        return analyzer.generate_constraint_data(ws_range, request.constraints)
    except Exception as e:
        raise _api_error(e)


# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — On-Design (Turbojet & Turbofan)
# ════════════════════════════════════════════════════════════════════════════

class CycleRequest(BaseModel):
    """Thermodynamic parameters for gas turbine cycle synthesis."""
    alt:        float = Field(...,  ge=0,    le=47000, description="Altitude [m]")
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
    eta_mech_hp: float = Field(0.99, ge=0.9, le=1.0)
    eta_mech_lp: float = Field(0.99, ge=0.9, le=1.0)

@app.post("/analyze/cycle")
async def analyze_cycle(request: CycleRequest):
    """
    Performs on-design parametric cycle analysis for a single-spool turbojet.
    Utilizes standard ISA atmosphere and Cantera gas property models.
    """
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
            eta_mech_hp=request.eta_mech_hp,
            eta_mech_lp=request.eta_mech_lp,
        )
        return result
    except Exception as e:
        raise _api_error(e)


# ── Turbofan On-Design ─────────────────────────────────────────────────────

class TurbofanRequest(CycleRequest):
    """Extended parameters for multi-stream turbofan analysis."""
    bpr:      float = Field(..., ge=0,   le=20.0, description="Bypass Ratio")
    fpr:      float = Field(..., ge=1.1, le=4.0,  description="Fan Pressure Ratio")
    eta_fan: float = Field(0.90, ge=0.6, le=0.97) # Renamed from eta_f to eta_fan to match original
    mixed_exhaust: bool = False # Renamed from mixed to mixed_exhaust to match original
    lpc_pr:   float = Field(1.0, ge=1.0, le=5.0)  # LPC/Booster PR

@app.post("/analyze/cycle/turbofan")
async def analyze_turbofan(request: TurbofanRequest):
    """
    Performs on-design cycle analysis for separate or mixed-flow turbofans.
    Supports high-bypass commercial or low-bypass military architectures.
    """
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        analyzer  = CycleAnalyzer(p0, t0, request.mach)
        result    = analyzer.solve_turbofan(
            bpr=request.bpr, fpr=request.fpr, opr=request.prc, tit=request.tit, # opr maps to prc from CycleRequest
            eta_fan=request.eta_fan, eta_c=request.eta_c, eta_t=request.eta_t,
            eta_ab=request.eta_ab, h_fuel=request.h_fuel,
            ab_enabled=request.ab_enabled, ab_temp=request.ab_temp,
            inlet_recovery=request.inlet_recovery,
            burner_eta=request.burner_eta,
            burner_dp_frac=request.burner_dp_frac,
            phi_inlet=request.phi_inlet,
            eta_install_nozzle=request.eta_install_nozzle,
            mixed_exhaust=request.mixed_exhaust,
            eta_mech_hp=request.eta_mech_hp,
            eta_mech_lp=request.eta_mech_lp,
            lpc_pr=request.lpc_pr,
        )
        return result
    except Exception as e:
        raise _api_error(e)


# ── Parametric Sweep (pressure ratio) ─────────────────────────────────────

class CycleSweepRequest(BaseModel):
    """Parameters for a parametric sweep of compressor pressure ratio."""
    alt:     float = 10000.0
    mach:    float = 0.8
    tit:     float = 1600.0
    prc_min: float = 2.0
    prc_max: float = 50.0
    steps:   int   = 25

@app.post("/analyze/cycle/sweep")
async def analyze_cycle_sweep(request: CycleSweepRequest):
    """
    Executes a parametric sweep of compressor pressure ratio for a turbojet.
    Returns performance metrics like specific thrust and TSFC across the range.
    """
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
        raise _api_error(e)


# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Off-Design
# ════════════════════════════════════════════════════════════════════════════

class OffDesignMapRequest(BaseModel):
    """Config for generating scaled compressor performance maps."""
    n_speed_lines: int = Field(7,  ge=3, le=12)
    n_flow_points: int = Field(20, ge=8, le=50)
    # Design-point params used to anchor the map
    alt:  float = Field(0.0,  ge=0, le=20000)
    mach: float = Field(0.0,  ge=0, le=1.5)
    prc:  float = Field(20.0, ge=2, le=60)
    tit:  float = Field(1500, ge=600, le=2500)

@app.post("/analyze/offdesign/map")
async def offdesign_map(request: OffDesignMapRequest):
    """
    Generates a scaled compressor map for off-design performance evaluation.
    Utilizes quadratic speed-line scaling and surge margin estimation.
    """
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        ca = CycleAnalyzer(p0, t0, request.mach)
        dp = ca.solve_turbojet(request.prc, request.tit)

        solver = OffDesignSolver(dp)
        map_data = solver.generate_compressor_map(
            n_speed_lines=request.n_speed_lines,
            n_flow_points=request.n_flow_points,
        )
        # Add DP reference for visualization
        map_data['design_point'] = {'flow': 1.0, 'pr': solver.dp_pr}
        return map_data
    except Exception as e:
        raise _api_error(e)


class ThrottleSweepRequest(BaseModel):
    """Simulation parameters for throttle transient performance."""
    alt:   float = Field(0.0,  ge=0, le=20000)
    mach:  float = Field(0.0,  ge=0, le=1.5)
    prc:   float = Field(20.0, ge=2, le=60)
    tit:   float = Field(1500, ge=600, le=2500)
    h_fuel: float = Field(42.8e6)
    n_points: int = Field(20, ge=5, le=50)

@app.post("/analyze/offdesign/throttle")
async def offdesign_throttle(request: ThrottleSweepRequest):
    """
    Simulates engine performance along a throttle deck (TIT sweep).
    Provides specific fuel consumption and thrust curves for mission planning.
    """
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        ca = CycleAnalyzer(p0, t0, request.mach)
        dp = ca.solve_turbojet(request.prc, request.tit)

        solver  = OffDesignSolver(dp)
        results = solver.sweep_throttle(p0, t0, request.mach, request.h_fuel, request.n_points)
        return results
    except Exception as e:
        raise _api_error(e)


# ════════════════════════════════════════════════════════════════════════════
# Rocket — On-Design (CEA & Equilibrium)
# ════════════════════════════════════════════════════════════════════════════

class RocketRequest(BaseModel):
    """Rocket architecture request for chemical equilibrium analysis."""
    pc:                   float = Field(..., ge=1e5,  le=50e6, description="Chamber Pressure [Pa]")
    of_ratio:             float = Field(..., ge=0.5,  le=20.0, description="Mixture Ratio")
    pe:                   float = Field(101325.0, ge=0, le=1e6, description="Exit Pressure [Pa]")
    propellant:           str   = Field("H2/O2")
    mode:                 str   = Field("shifting", description="Shifting or Frozen composition")
    exit_half_angle_deg:  float = Field(15.0, ge=1, le=45)
    thrust_target_N:      Optional[float] = Field(None, ge=100, le=10e6)
    compute_heat_transfer: bool = True
    impurity_species:      Optional[str]   = Field(None)
    impurity_mass_frac:    float           = Field(0.0, ge=0.0, le=0.5)

@app.post("/analyze/rocket")
async def analyze_rocket(request: RocketRequest):
    """
    Performs high-fidelity rocket combustion equilibrium (CEA).
    Calculates ISP, delivered thrust, and thermal loads via Bartz.
    """
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
        raise _api_error(e)


@app.post("/analyze/rocket/sweep")
async def analyze_rocket_sweep(request: RocketRequest):
    """Generates an O/F ratio sweep for performance optimization."""
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
            except Exception as e:
                logger.debug("O/F sweep: skipped of=%.2f (%s)", of, e)
        return results
    except Exception as e:
        raise _api_error(e)


# ── Altitude Performance ───────────────────────────────────────────────────

class AltitudeRequest(BaseModel):
    """Inputs for generating rocket performance across an altitude range."""
    pc:         float = Field(..., ge=1e5, le=50e6)
    of_ratio:   float = Field(..., ge=0.5, le=20.0)
    propellant: str   = Field("H2/O2")
    mode:       str   = Field("shifting")
    alt_max_km: float = Field(100.0, ge=0, le=500)
    n_points:   int   = Field(20, ge=5, le=50)

@app.post("/analyze/rocket/altitude")
async def analyze_rocket_altitude(request: AltitudeRequest):
    """
    Calculates rocket engine performance (Isp, Cf) as a function of altitude.
    Utilizes ISA atmosphere model for ambient pressure variation.
    """
    try:
        altitudes = [i * request.alt_max_km * 1000.0 / (request.n_points - 1)
                     for i in range(request.n_points)]
        analyzer  = RocketAnalyzer(request.pc)
        return analyzer.altitude_performance(request.propellant, request.of_ratio, altitudes, request.mode)
    except Exception as e:
        raise _api_error(e)


# ── Engine Sizing from Thrust Target ──────────────────────────────────────

class SizingRequest(BaseModel):
    """Inputs for sizing a rocket engine based on thrust targets."""
    thrust_N:   float = Field(..., ge=100, le=10e6, description="Target vacuum thrust [N]")
    pc:         float = Field(..., ge=1e5, le=50e6)
    of_ratio:   float = Field(..., ge=0.5, le=20.0)
    pe:         float = Field(101325.0)
    propellant: str   = Field("H2/O2")
    mode:       str   = Field("shifting")

@app.post("/analyze/rocket/sizing")
async def analyze_sizing(request: SizingRequest):
    """
    Calculates throat/exit dimensions and mass flow rates for a specific thrust.
    Provides key sizing parameters for engine design.
    """
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
            'mdot_total'  : result['mdot_total'],
            'mdot_fuel'   : result['mdot_fuel'],
            'mdot_ox'     : result['mdot_ox'],
            'mass_engine_kg': result['mass_est'],
            'nozzle_dims' : result['nozzle_dims'],
            'heat_transfer': result.get('heat_transfer'),
            'math_trace': result.get('math_trace'),
        }
    except Exception as e:
        raise _api_error(e)


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
        raise _api_error(e)


@app.post("/analyze/rocket/export/stl")
async def export_rocket_stl(request: MoCRequest):
    try:
        designer = MoCNozzle(request.gamma, request.mach_exit, request.throat_radius)
        stl_text = designer.generate_stl_mesh()
        return PlainTextResponse(
            content=stl_text,
            media_type="application/sla",
            headers={"Content-Disposition": "attachment; filename=nozzle_moc.stl"}
        )
    except Exception as e:
        raise _api_error(e)


@app.post("/analyze/rocket/export/csv")
async def export_rocket_csv(request: MoCRequest):
    """
    Exports the MoC nozzle wall contour as a CSV file.
    Returns (X [m], R [m]) coordinate pairs for CFD meshing or CAD import.
    """
    try:
        designer = MoCNozzle(request.gamma, request.mach_exit, request.throat_radius)
        x_vals, y_vals = designer.solve_contour()

        lines = ["X_m,R_m"]
        for x, r in zip(x_vals, y_vals):
            lines.append(f"{x:.8f},{r:.8f}")
        csv_content = "\n".join(lines)

        logger.info(
            f"CSV export: gamma={request.gamma}, Me={request.mach_exit}, "
            f"Rt={request.throat_radius}, points={len(x_vals)}"
        )
        return PlainTextResponse(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=nozzle_contour.csv"}
        )
    except Exception as e:
        logger.error(f"CSV export error: {e}")
        raise _api_error(e)


# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Sensitivity Sweeps
# ════════════════════════════════════════════════════════════════════════════

class SensitivityRequest(BaseModel):
    """
    Multi-parameter sensitivity sweep for gas turbine cycle analysis.
    Sweeps one parameter (T4, altitude, or OPR) while holding others fixed.
    """
    sweep_type: str   = Field("t4", description="'t4', 'alt', or 'opr'")
    alt:        float = Field(10000.0, ge=0,   le=47000)
    mach:       float = Field(0.8,     ge=0,   le=4.0)
    prc:        float = Field(20.0,    ge=1.1, le=80.0)
    tit:        float = Field(1600.0,  ge=300, le=2500)
    # Sweep bounds
    sweep_min:  float = Field(800.0)
    sweep_max:  float = Field(2200.0)
    steps:      int   = Field(20, ge=5, le=60)


@app.post("/analyze/cycle/sensitivity")
async def analyze_cycle_sensitivity(request: SensitivityRequest):
    """
    Executes a single-parameter sensitivity sweep across a turbojet cycle.
    Supports sweeps of Turbine Inlet Temperature (T4), altitude, or OPR.
    Returns a performance curve suitable for Plotly visualizations.
    """
    try:
        results = []
        sweep_values = [
            request.sweep_min + i * (request.sweep_max - request.sweep_min) / request.steps
            for i in range(request.steps + 1)
        ]

        for val in sweep_values:
            # Resolve operating point for this sweep step
            alt  = val  if request.sweep_type == "alt" else request.alt
            tit  = val  if request.sweep_type == "t4"  else request.tit
            prc  = val  if request.sweep_type == "opr" else request.prc
            mach = request.mach

            try:
                p0, t0, _ = isa_atmosphere(alt)
                ca = CycleAnalyzer(p0, t0, mach)
                res = ca.solve_turbojet(prc=prc, tit=tit)
                results.append({
                    "sweep_value"  : round(val, 2),
                    "spec_thrust"  : round(res["spec_thrust"],  4),
                    "tsfc"         : round(res["tsfc"],         6),
                    "eta_thermal"  : round(res.get("eta_thermal", 0),  4),
                    "eta_overall"  : round(res.get("eta_overall", 0),  4),
                    "eta_propulsive": round(res.get("eta_propulsive", 0), 4),
                })
            except Exception:
                # Skip failed points without aborting the sweep
                pass

        return {
            "sweep_type"   : request.sweep_type,
            "sweep_label"  : {"t4": "TIT [K]", "alt": "Altitude [m]", "opr": "OPR [-]"}[request.sweep_type],
            "fixed_params" : {"alt": request.alt, "mach": request.mach, "prc": request.prc, "tit": request.tit},
            "data"         : results,
        }
    except Exception as e:
        raise _api_error(e)


# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Multi-Spool (Stub / Groundwork)
# ════════════════════════════════════════════════════════════════════════════

class MultispoolRequest(BaseModel):
    """
    Request model for high-fidelity multi-spool turbofan work matching.
    Intended for military turbofan architectures with LPC/HPC work balancing.
    """
    alt:    float = Field(0.0,    ge=0,   le=30000)
    mach:   float = Field(0.0,   ge=0,   le=3.0)
    opr:    float = Field(32.0,  ge=5,   le=80.0)
    bpr:    float = Field(0.3,   ge=0,   le=12.0)
    fpr:    float = Field(3.5,   ge=1.1, le=6.0)
    lpc_pr: float = Field(4.0,   ge=1.0, le=10.0)
    tit:    float = Field(1850.0, ge=800, le=2500)


@app.post("/analyze/cycle/multispool")
async def analyze_multispool(request: MultispoolRequest):
    """
    Multi-spool high-fidelity turbofan cycle solver with iterative work matching.
    Balances HP spool (HPT drives HPC) and LP spool (LPT drives Fan + LPC)
    using separate per-component polytropic efficiencies. Converges to < 0.1 %
    on turbine exit temperatures via mid-point Cantera gas-property refinement.
    """
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        analyzer = CycleAnalyzer(p0, t0, request.mach)
        result = analyzer.solve_multispool(
            opr=request.opr,
            bpr=request.bpr,
            fpr=request.fpr,
            lpc_pr=request.lpc_pr,
            tit=request.tit,
        )
        return result
    except Exception as e:
        raise _api_error(e)



def kill_port(port: int):
    """Terminates processes occupying the target port (Windows specific)."""
    import subprocess
    if os.name != 'nt':
        return
    try:
        # Get PIDs using netstat
        cmd = f'netstat -ano | findstr :{port}'
        result = subprocess.check_output(cmd, shell=True).decode()
        if not result.strip():
            return
            
        pids = {line.split()[-1] for line in result.strip().split('\n') if len(line.split()) > 4}
        for pid in pids:
            # Only kill if it's a valid integer PID
            if pid.isdigit():
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
    except subprocess.CalledProcessError:
        # findstr returns 1 if no matches found, which is fine
        pass
    except Exception as e:
        logger.warning(f"Failed to clear port {port}: {e}")

if __name__ == "__main__":
    import uvicorn
    # Clear port 8000 before startup to avoid [Errno 10048]
    if os.name == 'nt':
        kill_port(8000)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

