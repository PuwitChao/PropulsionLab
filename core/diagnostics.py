"""
Thermodynamic diagnostics analyzer.
Computes component isentropic efficiencies and combustor pressure loss
from engine station sensor telemetry to isolate mechanical/aerodynamic faults.
"""

import math
from typing import Any, Dict
from .errors import InputValidationError, PhysicalInfeasibilityError
from .solver_result import assurance
from .diagnostic_uncertainty import propagate_telemetry_covariance


class DiagnosticsAnalyzer:
    """
    Reverse-thermodynamic diagnostics engine.
    Analyzes measurements at various engine stations to compute component efficiencies
    and isolate engine health faults.
    """

    def analyze(
        self,
        pt2: float,
        tt2: float,
        pt3: float,
        tt3: float,
        pt4: float,
        tt4: float,
        pt5: float,
        tt5: float,
        gamma_c: float = 1.4,
        gamma_t: float = 1.33,
        input_covariance: list | None = None,
    ) -> Dict[str, Any]:
        """
        Runs the reverse cycle diagnostic analysis.

        Args:
            pt2: Inlet stagnation pressure [Pa].
            tt2: Inlet stagnation temperature [K].
            pt3: Compressor exit stagnation pressure [Pa].
            tt3: Compressor exit stagnation temperature [K].
            pt4: Turbine inlet stagnation pressure [Pa].
            tt4: Turbine inlet stagnation temperature [K].
            pt5: Turbine exit stagnation pressure [Pa].
            tt5: Turbine exit stagnation temperature [K].
            gamma_c: Ratio of specific heats for compressor.
            gamma_t: Ratio of specific heats for turbine.

        Returns:
            dict: Diagnostic analysis results containing efficiencies, status, alerts, and messages.
        """
        inputs = dict(pt2=pt2, tt2=tt2, pt3=pt3, tt3=tt3, pt4=pt4, tt4=tt4,
                      pt5=pt5, tt5=tt5, gamma_c=gamma_c, gamma_t=gamma_t)
        for field, value in inputs.items():
            if not math.isfinite(value) or value <= 0:
                raise InputValidationError('Telemetry must be finite and positive.', field=field)
        if gamma_c <= 1 or gamma_t <= 1:
            raise InputValidationError('Specific heat ratios must exceed one.')
        if not (pt3 > pt2 and tt3 > tt2):
            raise PhysicalInfeasibilityError('Compressor pressure and temperature must rise.')
        if pt4 > pt3 or tt4 <= tt3:
            raise PhysicalInfeasibilityError('The combustor must heat the flow without a pressure gain.')
        if not (pt5 < pt4 and tt5 < tt4):
            raise PhysicalInfeasibilityError('Turbine pressure and temperature must fall.')
        math_trace = []
        alerts = []
        messages = []

        math_trace.append("Diagnostics sensor telemetry received.")
        math_trace.append(f"Inlet conditions: Pt2={pt2/1e3:.1f} kPa, Tt2={tt2:.1f} K")
        math_trace.append(f"Compressor exit: Pt3={pt3/1e3:.1f} kPa, Tt3={tt3:.1f} K")
        math_trace.append(f"Turbine inlet: Pt4={pt4/1e3:.1f} kPa, Tt4={tt4:.1f} K")
        math_trace.append(f"Turbine exit: Pt5={pt5/1e3:.1f} kPa, Tt5={tt5:.1f} K")

        # 1. Compressor Isentropic Efficiency
        exp_c = (gamma_c - 1.0) / gamma_c
        tt3_ideal = tt2 * (pt3 / pt2) ** exp_c
        eta_c = (tt3_ideal - tt2) / (tt3 - tt2)
        math_trace.append(f"Compressor Isentropic Efficiency: {eta_c*100:.2f}% (ideal Tt3={tt3_ideal:.1f} K)")

        # 2. Combustor Pressure Loss
        dp_b = ((pt3 - pt4) / pt3) * 100.0
        math_trace.append(f"Combustor Total Pressure Loss Fraction: {dp_b:.2f}%")

        # 3. Turbine Isentropic Efficiency
        exp_t = (gamma_t - 1.0) / gamma_t
        tt5_ideal = tt4 * (pt5 / pt4) ** exp_t
        eta_t = (tt4 - tt5) / (tt4 - tt5_ideal)
        math_trace.append(f"Turbine Isentropic Efficiency: {eta_t*100:.2f}% (ideal Tt5={tt5_ideal:.1f} K)")

        if not (0 < eta_c <= 1 + 1e-9 and 0 < eta_t <= 1 + 1e-9):
            raise PhysicalInfeasibilityError('Telemetry implies an efficiency outside (0, 1].', eta_c=eta_c, eta_t=eta_t)

        # Screening boundaries:
        # eta_c >= 84%
        # eta_t >= 86%
        # dp_b <= 6.0%

        if eta_c < 0.84:
            alerts.append("F01: LOW_COMPRESSOR_EFFICIENCY")
            messages.append("Compressor efficiency is below the 84% screening threshold. Check sensors and operating conditions before assessment of component damage.")

        if eta_t < 0.86:
            alerts.append("F02: LOW_TURBINE_EFFICIENCY")
            messages.append("Turbine efficiency is below the 86% screening threshold. This observation does not identify a mechanical cause.")

        if dp_b > 6.0:
            alerts.append("F03: HIGH_COMBUSTOR_PRESSURE_LOSS")
            messages.append("Combustor pressure loss exceeds the 6% screening threshold. Check telemetry and operating conditions before assessment of restriction.")

        status = "WITHIN_THRESHOLDS" if len(alerts) == 0 else "THRESHOLD_EXCEEDED"
        if status == "WITHIN_THRESHOLDS":
            messages.append("The calculated metrics are within the configured screening thresholds. This is not a safety or fault-isolation verdict.")

        result = {
            "eta_c": eta_c,
            "eta_t": eta_t,
            "dp_b": dp_b,
            "status": "OUTSIDE_VALIDATED_DOMAIN",
            "diagnostic_status": status,
            "assurance": assurance('diagnostics', inputs,
                warnings=['Thresholds are uncalibrated. Sensor uncertainty and operating-point baselines are unavailable.'],
                assumptions=['Adiabatic components and constant supplied specific heat ratios.', 'Telemetry represents simultaneous stagnation states.']),
            "alerts": alerts,
            "messages": messages,
            "math_trace": math_trace
        }

        if input_covariance is not None:
            result['measurement_uncertainty']=propagate_telemetry_covariance(inputs,input_covariance)
            result['assurance']['warnings']=['Thresholds are uncalibrated. Supplied measurement covariance excludes model-form uncertainty and operating-point baselines.']
        return result
