"""
Propulsion Analysis Platform — FastAPI Backend
All physical quantities in SI units unless explicitly labelled.
"""

import os, sys
import json
from pathlib import Path
from typing import Any
import math
from datetime import datetime, timezone
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("propulsion-api")

def _load_app_metadata() -> dict[str, str]:
    """Load shared release metadata used by backend and frontend."""
    version_path = Path(__file__).resolve().parents[1] / "app_version.json"
    try:
        with version_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        logger.warning("Failed to load app_version.json: %s", exc)
        data = {}
    return {
        "version": str(data.get("version", "0.0.0")),
        "build_date": str(data.get("build_date", "unknown")),
        "status": str(data.get("status", "operational")),
    }


APP_METADATA = _load_app_metadata()
APP_VERSION = APP_METADATA["version"]
APP_BUILD_DATE = APP_METADATA["build_date"]
APP_STATUS = APP_METADATA["status"]

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

# Local analytical modules
from core.units import isa_atmosphere
from core.gas_turbine.cycle import CycleAnalyzer
from core.gas_turbine.off_design import OffDesignSolver
from core.rocket.analyzer import RocketAnalyzer
from core.rocket.moc import MoCNozzle
from core.gas_turbine.mission import MissionAnalyzer
from core.diagnostics import DiagnosticsAnalyzer
from core.presets import ENGINE_PRESETS, ROCKET_PRESETS, MISSION_PRESETS, DIAGNOSTIC_PRESETS

# Pydantic request models
from backend.models import (
    AircraftData,
    MissionConstraint,
    MissionConstraintRequest,
    CycleRequest,
    TurbofanRequest,
    CycleSweepRequest,
    OffDesignMapRequest,
    ThrottleSweepRequest,
    RocketRequest,
    AltitudeRequest,
    SizingRequest,
    MoCRequest,
    SensitivityRequest,
    MultispoolRequest,
    DiagnosticsRequest,
    RamjetRequest,
    BreguetRequest,
    _VALID_PROPELLANTS,
)

app = FastAPI(
    title="Propulsion Architecture API",
    description="High-fidelity aerospace solver core for gas turbines and rockets.",
    version=APP_VERSION
)


def _sanitize(obj: Any) -> Any:
    """Recursively replace non-finite floats (inf, -inf, nan) with None for JSON compliance."""
    if isinstance(obj, float):
        return None if not math.isfinite(obj) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


# ── Security & Policy ────────────────────────────────────────────────────────
_cors_origins_env = os.environ.get("CORS_ORIGINS", "")
_cors_origins = (
    [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    if _cors_origins_env
    else ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

@app.get("/")
def read_root():
    """Returns the API status and versioning."""
    return {"message": f"Propulsion Analysis API v{APP_VERSION} is running"}


@app.get("/version")
def get_version():
    """Returns the structured version info."""
    return {
        "version": APP_VERSION,
        "build_date": APP_BUILD_DATE,
        "status": APP_STATUS
    }


@app.get("/health")
def health_check():
    """System health audit endpoint for frontend status badges."""
    return {"status": "healthy", "version": APP_VERSION, "timestamp": datetime.now().isoformat()}


@app.get("/health/diagnostics")
def get_diagnostics():
    """Detailed system telemetry — actually probes Cantera and core imports."""
    import importlib

    # Probe Cantera
    cantera_status = "unknown"
    cantera_version = "unknown"
    try:
        import cantera as ct
        ct.Solution('gri30.yaml')   # fast ~0.3 ms, confirms mechanism file accessible
        cantera_version = ct.__version__
        cantera_status = "connected"
    except Exception as e:
        cantera_status = f"error: {e}"

    # Probe core modules
    core_modules = {
        "gas_turbine_core": "core.gas_turbine.cycle",
        "off_design": "core.gas_turbine.off_design",
        "mission": "core.gas_turbine.mission",
        "rocket_cea_engine": "core.rocket.analyzer",
        "moc_nozzle": "core.rocket.moc",
    }
    component_status = {}
    for label, module_path in core_modules.items():
        try:
            importlib.import_module(module_path)
            component_status[label] = "active"
        except Exception as e:
            component_status[label] = f"error: {e}"

    component_status["cantera_interface"] = cantera_status

    overall = "operational" if all(
        v in ("active", "connected") for v in component_status.values()
    ) else "degraded"

    return {
        "status": overall,
        "version": APP_VERSION,
        "cantera_version": cantera_version,
        "components": component_status,
        "system_time": datetime.now().isoformat(),
    }


@app.get("/analyze/presets")
async def get_presets():
    """Returns authoritative real-world engine and mission presets."""
    return {
        "engine_presets": ENGINE_PRESETS,
        "rocket_presets": ROCKET_PRESETS,
        "mission_presets": MISSION_PRESETS,
        "diagnostic_presets": DIAGNOSTIC_PRESETS,
    }


# ════════════════════════════════════════════════════════════════════════════
# Mission Analysis
# ════════════════════════════════════════════════════════════════════════════

@app.post("/analyze/mission")
async def analyze_mission(request: MissionConstraintRequest):
    """
    Synthesizes the feasible design space for aircraft mission requirements.
    Calculates operational envelopes for stall, takeoff, landing, and cruise.
    """
    try:
        analyzer  = MissionAnalyzer(request.aircraft_data.model_dump())
        ws_range  = [
            request.ws_min + i * (request.ws_max - request.ws_min) / request.ws_steps
            for i in range(request.ws_steps + 1)
        ]
        constraints = [c.model_dump() for c in request.constraints]
        result = analyzer.generate_constraint_data(ws_range, constraints)
        return _sanitize(result)
    except Exception as e:
        logger.error("Mission analysis error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Mission analysis computation failed.")


@app.post("/analyze/mission/breguet")
async def calculate_breguet_range(request: BreguetRequest):
    """Calculates Breguet payload-range equation metrics."""
    try:
        analyzer = MissionAnalyzer({})
        result = analyzer.calculate_breguet_range(
            mach=request.mach,
            altitude_m=request.alt,
            sfc_1_per_s=request.sfc_1_per_s,
            l_over_d=request.l_over_d,
            w_initial=request.w_initial,
            w_final=request.w_final,
        )
        return _sanitize(result)
    except Exception as e:
        logger.error("Breguet range calculation error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Breguet range calculation failed.")


# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — On-Design (Turbojet, Turbofan & Ramjet)
# ════════════════════════════════════════════════════════════════════════════

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
        return _sanitize(result)
    except Exception as e:
        logger.error("Turbojet cycle error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Cycle analysis computation failed.")


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
            bpr=request.bpr, fpr=request.fpr, opr=request.prc, tit=request.tit,
            eta_fan=request.eta_fan, eta_c=request.eta_c, eta_t=request.eta_t,
            eta_ab=request.eta_ab, h_fuel=request.h_fuel,
            ab_enabled=request.ab_enabled, ab_temp=request.ab_temp,
            inlet_recovery=request.inlet_recovery,
            burner_eta=request.burner_eta,
            burner_dp_frac=request.burner_dp_frac,
            nozzle_dp_frac=request.nozzle_dp_frac,
            phi_inlet=request.phi_inlet,
            eta_install_nozzle=request.eta_install_nozzle,
            mixed_exhaust=request.mixed_exhaust,
            eta_mech_hp=request.eta_mech_hp,
            eta_mech_lp=request.eta_mech_lp,
            lpc_pr=request.lpc_pr,
        )
        return _sanitize(result)
    except Exception as e:
        logger.error("Turbofan cycle error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Turbofan cycle computation failed.")


@app.post("/analyze/cycle/ramjet")
async def analyze_ramjet(request: RamjetRequest):
    """Calculates high-speed ramjet thermodynamic cycle performance."""
    try:
        p0, t0, _ = isa_atmosphere(request.alt)
        analyzer = CycleAnalyzer(p0_pa=p0, t0_k=t0, mach=request.mach)
        result = analyzer.solve_ramjet(
            t4=request.t4,
            eta_b=request.eta_b,
            burner_dp_frac=request.burner_dp_frac,
            nozzle_dp_frac=request.nozzle_dp_frac,
        )
        return _sanitize(result)
    except Exception as e:
        logger.error("Ramjet cycle analysis error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ramjet computation failed: {str(e)}")


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
        return _sanitize(results)
    except Exception as e:
        logger.error("Cycle sweep error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Cycle sweep computation failed.")


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
        return _sanitize(map_data)
    except Exception as e:
        logger.error("Off-design map error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Compressor map computation failed.")


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
        return _sanitize(results)
    except Exception as e:
        logger.error("Throttle sweep error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Throttle sweep computation failed.")


# ════════════════════════════════════════════════════════════════════════════
# Rocket — On-Design (CEA & Equilibrium)
# ════════════════════════════════════════════════════════════════════════════

@app.post("/analyze/rocket")
async def analyze_rocket(request: RocketRequest):
    """
    Performs high-fidelity rocket combustion equilibrium (CEA).
    Calculates ISP, delivered thrust, and thermal loads via Bartz.
    """
    if request.propellant not in _VALID_PROPELLANTS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown propellant '{request.propellant}'. Valid: {sorted(_VALID_PROPELLANTS)}"
        )
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
        return _sanitize(result)
    except Exception as e:
        logger.error("Rocket equilibrium error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Rocket equilibrium computation failed.")


@app.post("/analyze/rocket/sweep")
async def analyze_rocket_sweep(request: RocketRequest):
    """Generates an O/F ratio sweep for performance optimization."""
    if request.propellant not in _VALID_PROPELLANTS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown propellant '{request.propellant}'. Valid: {sorted(_VALID_PROPELLANTS)}"
        )
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
        return _sanitize(results)
    except Exception as e:
        logger.error("Rocket sweep error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="O/F sweep computation failed.")


# ── Altitude Performance ───────────────────────────────────────────────────

@app.post("/analyze/rocket/altitude")
async def analyze_rocket_altitude(request: AltitudeRequest):
    """
    Calculates rocket engine performance (Isp, Cf) as a function of altitude.
    Utilizes ISA atmosphere model for ambient pressure variation.
    """
    if request.propellant not in _VALID_PROPELLANTS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown propellant '{request.propellant}'. Valid: {sorted(_VALID_PROPELLANTS)}"
        )
    try:
        altitudes = [i * request.alt_max_km * 1000.0 / (request.n_points - 1)
                     for i in range(request.n_points)]
        analyzer  = RocketAnalyzer(request.pc)
        return _sanitize(analyzer.altitude_performance(request.propellant, request.of_ratio, altitudes, request.mode))
    except Exception as e:
        logger.error("Altitude performance error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Altitude performance computation failed.")


# ── Engine Sizing from Thrust Target ──────────────────────────────────────

@app.post("/analyze/rocket/sizing")
async def analyze_sizing(request: SizingRequest):
    """
    Calculates throat/exit dimensions and mass flow rates for a specific thrust.
    Provides key sizing parameters for engine design.
    """
    if request.propellant not in _VALID_PROPELLANTS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown propellant '{request.propellant}'. Valid: {sorted(_VALID_PROPELLANTS)}"
        )
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
        return _sanitize({
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
        })
    except Exception as e:
        logger.error("Engine sizing error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Engine sizing computation failed.")


# ── Method of Characteristics ─────────────────────────────────────────────

@app.post("/analyze/rocket/moc")
async def analyze_rocket_moc(request: MoCRequest):
    try:
        designer = MoCNozzle(request.gamma, request.mach_exit, request.throat_radius)
        x, y     = designer.solve_contour()
        mesh     = designer.get_mesh_data()
        return _sanitize({"x": x, "y": y, "mesh": mesh})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/rocket/export/csv")
async def export_rocket_csv(request: MoCRequest):
    """
    Exports the MoC nozzle wall contour as a CSV file.
    Returns (X [m], R [m]) coordinate pairs for CFD meshing or CAD import.
    """
    try:
        designer = MoCNozzle(request.gamma, request.mach_exit, request.throat_radius)
        x_vals, y_vals = designer.solve_contour()

        # Rich metadata header: tools (Excel, MATLAB, pandas, numpy.loadtxt) all
        # accept comment lines starting with '#'. Provides timestamp + design
        # params + solver version so exported files are self-describing.
        header_lines = [
            f"# PropulsionLab nozzle contour export",
            f"# generated_at = {datetime.now(timezone.utc).isoformat()}",
            f"# solver = PropulsionLab v{APP_VERSION}",
            f"# gamma = {request.gamma}",
            f"# mach_exit = {request.mach_exit}",
            f"# throat_radius_m = {request.throat_radius}",
            f"# points = {len(x_vals)}",
            "X_m,R_m",
        ]
        for x, r in zip(x_vals, y_vals):
            header_lines.append(f"{x:.8f},{r:.8f}")
        csv_content = "\n".join(header_lines)

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
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/rocket/export/obj", response_class=PlainTextResponse)
async def export_moc_obj(request: MoCRequest):
    """Exports Method of Characteristics nozzle geometry as a Wavefront OBJ mesh file."""
    try:
        solver = MoCNozzle(gamma=request.gamma, mach_exit=request.mach_exit, throat_radius=request.throat_radius)
        obj_text = solver.generate_obj_mesh()
        filename = f"nozzle_moc_m{request.mach_exit:.1f}_g{request.gamma:.2f}.obj"
        return PlainTextResponse(content=obj_text, headers={"Content-Disposition": f'attachment; filename="{filename}"'})
    except Exception as e:
        logger.error("MoC OBJ export error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate OBJ mesh.")



# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Sensitivity Sweeps
# ════════════════════════════════════════════════════════════════════════════

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

        _sweep_labels = {"t4": "TIT [K]", "alt": "Altitude [m]", "opr": "OPR [-]"}
        return _sanitize({
            "sweep_type"   : request.sweep_type,
            "sweep_label"  : _sweep_labels.get(request.sweep_type, request.sweep_type),
            "fixed_params" : {"alt": request.alt, "mach": request.mach, "prc": request.prc, "tit": request.tit},
            "data"         : results,
        })
    except Exception as e:
        logger.error("Sensitivity sweep error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Sensitivity sweep computation failed.")


# ════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Multi-Spool
# ════════════════════════════════════════════════════════════════════════════

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
            nozzle_dp_frac=request.nozzle_dp_frac,
        )
        return _sanitize(result)
    except Exception as e:
        logger.error("Multispool cycle error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Multi-spool computation failed.")


# ════════════════════════════════════════════════════════════════════════════
# Diagnostics
# ════════════════════════════════════════════════════════════════════════════

@app.post("/analyze/diagnostics")
async def analyze_diagnostics(request: DiagnosticsRequest):
    """
    Reverse-thermodynamic diagnostics engine for turbofan/turbojet spools.
    Determines component isentropic efficiencies and combustor pressure loss
    from sensor measurements to isolate faults.
    """
    try:
        analyzer = DiagnosticsAnalyzer()
        result = analyzer.analyze(
            pt2=request.pt2,
            tt2=request.tt2,
            pt3=request.pt3,
            tt3=request.tt3,
            pt4=request.pt4,
            tt4=request.tt4,
            pt5=request.pt5,
            tt5=request.tt5,
            gamma_c=request.gamma_c,
            gamma_t=request.gamma_t,
        )
        return _sanitize(result)
    except Exception as e:
        logger.error("Diagnostics engine failure: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Diagnostics calculations failed: {str(e)}")


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
