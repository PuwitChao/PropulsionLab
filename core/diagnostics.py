"""
Thermodynamic diagnostics analyzer.
Computes component isentropic efficiencies and combustor pressure loss
from engine station sensor telemetry to isolate mechanical/aerodynamic faults.
"""

from typing import Any, List, Dict


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
        eta_c = (tt3_ideal - tt2) / (tt3 - tt2) if (tt3 > tt2) else 0.0
        math_trace.append(f"Compressor Isentropic Efficiency: {eta_c*100:.2f}% (ideal Tt3={tt3_ideal:.1f} K)")

        # 2. Combustor Pressure Loss
        dp_b = ((pt3 - pt4) / pt3) * 100.0
        math_trace.append(f"Combustor Total Pressure Loss Fraction: {dp_b:.2f}%")

        # 3. Turbine Isentropic Efficiency
        exp_t = (gamma_t - 1.0) / gamma_t
        tt5_ideal = tt4 * (pt5 / pt4) ** exp_t
        eta_t = (tt4 - tt5) / (tt4 - tt5_ideal) if (tt4 > tt5_ideal and tt4 > tt5) else 0.0
        math_trace.append(f"Turbine Isentropic Efficiency: {eta_t*100:.2f}% (ideal Tt5={tt5_ideal:.1f} K)")

        # Nominal boundaries:
        # eta_c >= 84%
        # eta_t >= 86%
        # dp_b <= 6.0%

        if eta_c < 0.84:
            alerts.append("F01: COMPRESSOR_FOULING")
            messages.append("Compressor efficiency has degraded below nominal 84% threshold, indicating stator/rotor fouling, blade surface roughness increase, or tip clearance distress.")

        if eta_t < 0.86:
            alerts.append("F02: TURBINE_EROSION")
            messages.append("Turbine expansion work efficiency shows a loss below nominal 86%, indicating high-pressure turbine blade erosion, thermal coating degradation, or excessive tip clearance.")

        if dp_b > 6.0:
            alerts.append("F03: COMBUSTOR_RESTRICTION")
            messages.append("Combustor total pressure drop fraction exceeds safe limit of 6.0%, indicating potential thermal liner distortion, blockage in air diluent swirlers, or fuel nozzle misalignment.")

        status = "NOMINAL" if len(alerts) == 0 else "FAULT_DETECTED"
        if status == "NOMINAL":
            messages.append("All mechanical and aerodynamic components are operating within safe isentropic limits.")

        return {
            "eta_c": eta_c,
            "eta_t": eta_t,
            "dp_b": dp_b,
            "status": status,
            "alerts": alerts,
            "messages": messages,
            "math_trace": math_trace
        }
