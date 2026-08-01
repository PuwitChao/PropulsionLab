"""
Propulsion Analysis Platform — Pydantic Request Validation Models
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

# ── Validation Helpers & Constants ──────────────────────────────────────────
_VALID_MODES = {'shifting', 'frozen'}
_VALID_PROPELLANTS = {
    'H2/O2', 'CH4/O2', 'RP1/O2', 'Propane/O2', 'Ethanol/O2', 'Methanol/O2',
    'Ammonia/O2', 'C2H2/O2', 'C2H4/O2', 'C2H6/O2', 'CH4/N2O', 'C3H8/N2O',
    'UDMH/N2O4', 'MMH/N2O4',
}

# ── Mission Analysis Models ──────────────────────────────────────────────────
class AircraftData(BaseModel):
    """Aircraft aerodynamic and geometry parameters for mission analysis."""
    k:      float = Field(0.1,  ge=0.01, le=1.0,  description="Induced drag factor")
    cd0:    float = Field(0.02, ge=0.0,  le=0.5,  description="Zero-lift drag coefficient")
    cl_max: float = Field(2.0,  ge=0.5,  le=5.0,  description="Max lift coefficient")


class MissionConstraint(BaseModel):
    """A single T/W-vs-W/S constraint curve."""
    type:      str = Field(..., pattern="^(level|ps|turn|takeoff|ceiling|climb)$")
    label:     str
    alt:       Optional[float] = Field(None, ge=0, le=30000)
    mach:      Optional[float] = Field(None, ge=0, le=4.0)
    ps:        Optional[float] = Field(None, ge=0, le=500)
    n:         Optional[float] = Field(None, ge=1, le=12)
    sto:       Optional[float] = Field(None, ge=100, le=10000)
    cl_max:    Optional[float] = Field(None, ge=0.5, le=5.0)
    angle_deg: Optional[float] = Field(None, ge=0, le=89)

    @model_validator(mode='after')
    def validate_required_for_type(self):
        needed = {
            'level':   ('alt', 'mach'),
            'ps':      ('alt', 'mach', 'ps'),
            'turn':    ('alt', 'mach', 'n'),
            'takeoff': ('sto', 'cl_max'),
            'ceiling': ('alt', 'mach'),
            'climb':   ('alt', 'mach', 'angle_deg'),
        }[self.type]
        missing = [f for f in needed if getattr(self, f) is None]
        if missing:
            raise ValueError(f"constraint type '{self.type}' requires: {', '.join(missing)}")
        return self


class MissionConstraintRequest(BaseModel):
    """Data model for mission matching charts (T/W vs W/S)."""
    aircraft_data: AircraftData
    constraints:   List[MissionConstraint]
    ws_min:   float = Field(1000.0, ge=100,   le=20000)
    ws_max:   float = Field(8000.0, ge=200,   le=50000)
    ws_steps: int   = Field(50,     ge=5,     le=200)

    @model_validator(mode='after')
    def validate_ws_range(self):
        if self.ws_min >= self.ws_max:
            raise ValueError("ws_min must be less than ws_max")
        return self

# ── Gas Turbine On-Design Models ─────────────────────────────────────────────
class CycleRequest(BaseModel):
    """Thermodynamic parameters for gas turbine cycle synthesis."""
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
    eta_mech_hp: float = Field(0.99, ge=0.9, le=1.0)
    eta_mech_lp: float = Field(0.99, ge=0.9, le=1.0)


class TurbofanRequest(CycleRequest):
    """Extended parameters for multi-stream turbofan analysis."""
    bpr:      float = Field(..., ge=0,   le=20.0, description="Bypass Ratio")
    fpr:      float = Field(..., ge=1.1, le=4.0,  description="Fan Pressure Ratio")
    eta_fan: float = Field(0.90, ge=0.6, le=0.97)
    mixed_exhaust: bool = False
    lpc_pr:   float = Field(1.0, ge=1.0, le=5.0)


class CycleSweepRequest(BaseModel):
    """Parameters for a parametric sweep of compressor pressure ratio."""
    alt:     float = Field(10000.0, ge=0,   le=47000)
    mach:    float = Field(0.8,     ge=0,   le=4.0)
    tit:     float = Field(1600.0,  ge=300, le=2500)
    prc_min: float = Field(2.0,     ge=1.1, le=79.0)
    prc_max: float = Field(50.0,    ge=1.2, le=80.0)
    steps:   int   = Field(25,      ge=2,   le=100)

    @model_validator(mode='after')
    def validate_sweep(self):
        if self.prc_min >= self.prc_max:
            raise ValueError("prc_min must be less than prc_max")
        return self

# ── Gas Turbine Off-Design Models ────────────────────────────────────────────
class OffDesignMapRequest(BaseModel):
    """Config for generating scaled compressor performance maps."""
    n_speed_lines: int = Field(7,  ge=3, le=12)
    n_flow_points: int = Field(20, ge=8, le=50)
    alt:  float = Field(0.0,  ge=0, le=20000)
    mach: float = Field(0.0,  ge=0, le=1.5)
    prc:  float = Field(20.0, ge=2, le=60)
    tit:  float = Field(1500, ge=600, le=2500)


class ThrottleSweepRequest(BaseModel):
    """Simulation parameters for throttle transient performance."""
    alt:   float = Field(0.0,  ge=0, le=20000)
    mach:  float = Field(0.0,  ge=0, le=1.5)
    prc:   float = Field(20.0, ge=2, le=60)
    tit:   float = Field(1500, ge=600, le=2500)
    h_fuel: float = Field(42.8e6)
    n_points: int = Field(20, ge=5, le=50)

# ── Rocket Models ────────────────────────────────────────────────────────────
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

    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v: str) -> str:
        if v not in _VALID_MODES:
            raise ValueError(f"mode must be one of {sorted(_VALID_MODES)}, got '{v}'")
        return v


class AltitudeRequest(BaseModel):
    """Inputs for generating rocket performance across an altitude range."""
    pc:         float = Field(..., ge=1e5, le=50e6)
    of_ratio:   float = Field(..., ge=0.5, le=20.0)
    propellant: str   = Field("H2/O2")
    mode:       str   = Field("shifting")
    alt_max_km: float = Field(100.0, ge=0, le=500)
    n_points:   int   = Field(20, ge=5, le=50)

    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v: str) -> str:
        if v not in _VALID_MODES:
            raise ValueError(f"mode must be one of {sorted(_VALID_MODES)}, got '{v}'")
        return v


class SizingRequest(BaseModel):
    """Inputs for sizing a rocket engine based on thrust targets."""
    thrust_N:   float = Field(..., ge=100, le=10e6, description="Target vacuum thrust [N]")
    pc:         float = Field(..., ge=1e5, le=50e6)
    of_ratio:   float = Field(..., ge=0.5, le=20.0)
    pe:         float = Field(101325.0)
    propellant: str   = Field("H2/O2")
    mode:       str   = Field("shifting")

    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v: str) -> str:
        if v not in _VALID_MODES:
            raise ValueError(f"mode must be one of {sorted(_VALID_MODES)}, got '{v}'")
        return v


class MoCRequest(BaseModel):
    """Inputs for method of characteristics contour generation."""
    gamma:         float = Field(1.2,  ge=1.1, le=1.67)
    mach_exit:     float = Field(3.0,  ge=1.5, le=6.0)
    throat_radius: float = Field(0.1,  ge=0.001, le=2.0)

# ── Sensitivity & Multi-spool Models ──────────────────────────────────────────
class SensitivityRequest(BaseModel):
    """Multi-parameter sensitivity sweep for gas turbine cycle analysis."""
    sweep_type: str   = Field("t4", description="'t4', 'alt', or 'opr'")
    alt:        float = Field(10000.0, ge=0,   le=50000)
    mach:       float = Field(0.8,     ge=0,   le=4.0)
    prc:        float = Field(20.0,    ge=1.1, le=80.0)
    tit:        float = Field(1600.0,  ge=300, le=2500)
    sweep_min:  float = Field(800.0)
    sweep_max:  float = Field(2200.0)
    steps:      int   = Field(20, ge=5, le=60)

    @field_validator('sweep_type')
    @classmethod
    def validate_sweep_type(cls, v: str) -> str:
        _VALID_SWEEP_TYPES = {'t4', 'alt', 'opr'}
        if v not in _VALID_SWEEP_TYPES:
            raise ValueError(f"sweep_type must be one of {sorted(_VALID_SWEEP_TYPES)}, got '{v}'")
        return v


class MultispoolRequest(BaseModel):
    """Request model for high-fidelity multi-spool turbofan work matching."""
    alt:    float = Field(0.0,    ge=0,   le=30000)
    mach:   float = Field(0.0,   ge=0,   le=3.0)
    opr:    float = Field(32.0,  ge=5,   le=80.0)
    bpr:    float = Field(0.3,   ge=0,   le=12.0)
    fpr:    float = Field(3.5,   ge=1.1, le=6.0)
    lpc_pr: float = Field(4.0,   ge=1.0, le=10.0)
    tit:    float = Field(1850.0, ge=800, le=2500)
    nozzle_dp_frac: float = Field(0.02, ge=0.0, le=0.10)

# ── Fault Diagnostics Models ─────────────────────────────────────────────────
class DiagnosticsRequest(BaseModel):
    """Telemetry parameters for reverse-cycle thermodynamic fault diagnostics."""
    pt2: float = Field(..., ge=1000.0, le=1e6)
    tt2: float = Field(..., ge=100.0, le=500.0)
    pt3: float = Field(..., ge=10000.0, le=1e7)
    tt3: float = Field(..., ge=200.0, le=1500.0)
    pt4: float = Field(..., ge=10000.0, le=1e7)
    tt4: float = Field(..., ge=500.0, le=2500.0)
    pt5: float = Field(..., ge=1000.0, le=1e6)
    tt5: float = Field(..., ge=300.0, le=1800.0)
    gamma_c: float = Field(1.4, ge=1.1, le=1.67)
    gamma_t: float = Field(1.33, ge=1.1, le=1.67)


class RamjetRequest(BaseModel):
    """Request model for high-speed Ramjet cycle analysis."""
    alt:            float = Field(20000.0, ge=0,   le=50000)
    mach:           float = Field(3.0,     ge=1.0, le=5.0)
    t4:             float = Field(2000.0,  ge=1000, le=2800)
    eta_b:          float = Field(0.98,    ge=0.8, le=1.0)
    burner_dp_frac: float = Field(0.06,    ge=0.0, le=0.2)
    nozzle_dp_frac: float = Field(0.02,    ge=0.0, le=0.1)


class BreguetRequest(BaseModel):
    """Request model for Breguet payload-range calculation."""
    mach:         float = Field(0.78,   ge=0.1, le=4.0)
    alt:          float = Field(11000.0, ge=0,   le=30000)
    sfc_1_per_s:  float = Field(1.6e-5,  ge=1e-7, le=1e-3)
    l_over_d:     float = Field(16.0,    ge=1.0, le=40.0)
    w_initial:    float = Field(70000.0, ge=100, le=1e7)
    w_final:      float = Field(45000.0, ge=100, le=1e7)

    @model_validator(mode='after')
    def validate_weights(self):
        if self.w_final >= self.w_initial:
            raise ValueError("w_final must be strictly less than w_initial")
        return self

