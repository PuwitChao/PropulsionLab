"""
Prescription and authoritative data profiles for real-world gas turbine engines,
rocket propulsion systems, aircraft mission constraints, and engine fault diagnostics.
"""

ENGINE_PRESETS = {
    "turbofan_cfm56_7b": {
        "id": "turbofan_cfm56_7b",
        "name": "CFM56-7B (Commercial Turbofan)",
        "category": "gas_turbine",
        "engine_type": "turbofan",
        "description": "High-bypass turbofan powering Boeing 737 Next Gen. Optimized for subsonic cruise efficiency.",
        "params": {
            "alt": 11000.0,
            "mach": 0.78,
            "bpr": 5.1,
            "pr_c": 32.8,
            "pr_f": 1.65,
            "t4": 1650.0,
            "eta_c": 0.89,
            "eta_f": 0.91,
            "eta_t": 0.92,
            "eta_b": 0.995,
            "eta_n": 0.98,
            "dp_b": 0.04
        }
    },
    "turbofan_ge90_115b": {
        "id": "turbofan_ge90_115b",
        "name": "GE90-115B (Ultra-High Thrust Turbofan)",
        "category": "gas_turbine",
        "engine_type": "turbofan",
        "description": "High-bypass turbofan powering the Boeing 777-300ER with record thrust output.",
        "params": {
            "alt": 10600.0,
            "mach": 0.84,
            "bpr": 9.0,
            "pr_c": 42.0,
            "pr_f": 1.58,
            "t4": 1750.0,
            "eta_c": 0.90,
            "eta_f": 0.93,
            "eta_t": 0.93,
            "eta_b": 0.996,
            "eta_n": 0.985,
            "dp_b": 0.035
        }
    },
    "afterburner_f100_pw_229": {
        "id": "afterburner_f100_pw_229",
        "name": "F100-PW-229 (Low-Bypass Fighter Turbofan w/ Reheat)",
        "category": "gas_turbine",
        "engine_type": "turbofan_afterburner",
        "description": "Low-bypass military turbofan w/ afterburner powering F-15E and F-16 fighters.",
        "params": {
            "alt": 9144.0,
            "mach": 1.4,
            "bpr": 0.36,
            "pr_c": 32.0,
            "pr_f": 3.8,
            "t4": 1670.0,
            "t7": 2050.0,
            "eta_c": 0.86,
            "eta_f": 0.88,
            "eta_t": 0.90,
            "eta_ab": 0.95,
            "eta_b": 0.99,
            "eta_n": 0.96,
            "dp_b": 0.05
        }
    },
    "turbojet_olympus_593": {
        "id": "turbojet_olympus_593",
        "name": "Olympus 593 (Concorde Supersonic Turbojet)",
        "category": "gas_turbine",
        "engine_type": "turbojet",
        "description": "Twin-spool turbojet w/ reheat designed for sustained Mach 2.0 Concorde cruise.",
        "params": {
            "alt": 15000.0,
            "mach": 2.0,
            "pr_c": 15.5,
            "t4": 1420.0,
            "eta_c": 0.86,
            "eta_t": 0.90,
            "eta_b": 0.985,
            "eta_n": 0.97,
            "dp_b": 0.05
        }
    },
    "ramjet_mach3": {
        "id": "ramjet_mach3",
        "name": "High-Speed Ramjet (Mach 3.2 Supersonic Cruise)",
        "category": "gas_turbine",
        "engine_type": "ramjet",
        "description": "Compressorless airbreathing engine relying on ram compression at Mach > 3.",
        "params": {
            "alt": 20000.0,
            "mach": 3.2,
            "t4": 2200.0,
            "eta_b": 0.98,
            "eta_n": 0.96,
            "dp_b": 0.06
        }
    }
}

ROCKET_PRESETS = {
    "merlin_1d": {
        "id": "merlin_1d",
        "name": "SpaceX Merlin 1D (LOX / RP-1)",
        "category": "rocket",
        "propellant": "LOX/RP-1",
        "description": "Gas-generator cycle booster engine powering Falcon 9 first stage.",
        "params": {
            "pc_bar": 97.0,
            "pe_bar": 1.01325,
            "area_ratio": 16.0,
            "of_ratio": 2.36,
            "mode": "shifting",
            "throat_radius": 0.125
        }
    },
    "rs_25_ssme": {
        "id": "rs_25_ssme",
        "name": "Aerojet RS-25 SSME (LOX / LH2)",
        "category": "rocket",
        "propellant": "LOX/LH2",
        "description": "Staged combustion high-performance engine powering Space Shuttle / SLS.",
        "params": {
            "pc_bar": 206.4,
            "pe_bar": 0.18,
            "area_ratio": 77.5,
            "of_ratio": 6.0,
            "mode": "shifting",
            "throat_radius": 0.134
        }
    },
    "raptor_2": {
        "id": "raptor_2",
        "name": "SpaceX Raptor 2 (LOX / CH4)",
        "category": "rocket",
        "propellant": "LOX/CH4",
        "description": "Full-flow staged combustion engine powering Starship.",
        "params": {
            "pc_bar": 300.0,
            "pe_bar": 1.01325,
            "area_ratio": 34.0,
            "of_ratio": 3.6,
            "mode": "shifting",
            "throat_radius": 0.110
        }
    },
    "rl10_c1": {
        "id": "rl10_c1",
        "name": "Aerojet RL10-C-1 (LOX / LH2 Upper Stage)",
        "category": "rocket",
        "propellant": "LOX/LH2",
        "description": "Expander cycle high-Isp vacuum engine for Vulcan / Atlas upper stage.",
        "params": {
            "pc_bar": 44.0,
            "pe_bar": 0.02,
            "area_ratio": 130.0,
            "of_ratio": 5.8,
            "mode": "shifting",
            "throat_radius": 0.075
        }
    }
}

MISSION_PRESETS = {
    "f16_fighting_falcon": {
        "id": "f16_fighting_falcon",
        "name": "F-16C Fighting Falcon (Multi-role Fighter)",
        "description": "Lightweight supersonic multirole fighter aircraft constraint envelope.",
        "params": {
            "mach_max": 2.0,
            "ceiling_km": 15.2,
            "wing_loading": 430.0,
            "turn_g": 9.0,
            "climb_rate_mps": 250.0
        }
    },
    "commercial_jetliner": {
        "id": "commercial_jetliner",
        "name": "Boeing 737-800 / Airbus A320 (Commercial Jetliner)",
        "description": "Subsonic transport aircraft constraint envelope.",
        "params": {
            "mach_max": 0.82,
            "ceiling_km": 12.5,
            "wing_loading": 580.0,
            "turn_g": 2.5,
            "climb_rate_mps": 15.0
        }
    },
    "concorde_sst": {
        "id": "concorde_sst",
        "name": "Concorde Supersonic Transport (SST)",
        "description": "Supersonic commercial transport envelope.",
        "params": {
            "mach_max": 2.04,
            "ceiling_km": 18.0,
            "wing_loading": 410.0,
            "turn_g": 2.0,
            "climb_rate_mps": 25.0
        }
    }
}

DIAGNOSTIC_PRESETS = {
    "nominal": {
        "id": "nominal",
        "name": "Nominal Engine Baseline",
        "deltas": {"eta_c": 0.0, "w_c": 0.0, "eta_t": 0.0, "capacity_t": 0.0}
    },
    "compressor_fouling": {
        "id": "compressor_fouling",
        "name": "Compressor Fouling",
        "deltas": {"eta_c": -0.035, "w_c": -0.025, "eta_t": 0.0, "capacity_t": 0.0}
    },
    "turbine_erosion": {
        "id": "turbine_erosion",
        "name": "Turbine Blade Erosion",
        "deltas": {"eta_c": 0.0, "w_c": 0.0, "eta_t": -0.028, "capacity_t": 0.018}
    },
    "combustor_hotspot": {
        "id": "combustor_hotspot",
        "name": "Combustor Hotspot / Nozzle Distortion",
        "deltas": {"eta_c": -0.01, "w_c": -0.01, "eta_t": -0.015, "capacity_t": -0.02}
    }
}
