/**
 * Client-side presets database for instant offline preset loading.
 */

export const ENGINE_PRESETS = [
  {
    id: "turbofan_cfm56_7b",
    name: "CFM56-7B",
    subtitle: "Commercial Turbofan (Boeing 737NG)",
    category: "gas_turbine",
    engineType: "turbofan",
    description: "High-bypass ratio turbofan engine widely used on single-aisle commercial aircraft.",
    params: {
      alt: 11000,
      mach: 0.78,
      bpr: 5.1,
      prc: 32.8,
      fpr: 1.65,
      tit: 1650,
      eta_c: 0.89,
      eta_f: 0.91,
      eta_t: 0.92,
      mixed_exhaust: false,
    }
  },
  {
    id: "turbofan_ge90_115b",
    name: "GE90-115B",
    subtitle: "Ultra-High Thrust Turbofan (Boeing 777-300ER)",
    category: "gas_turbine",
    engineType: "turbofan",
    description: "Highest thrust turbofan engine in commercial service with a 9:1 bypass ratio.",
    params: {
      alt: 10600,
      mach: 0.84,
      bpr: 9.0,
      prc: 42.0,
      fpr: 1.58,
      tit: 1750,
      eta_c: 0.90,
      eta_f: 0.93,
      eta_t: 0.93,
      mixed_exhaust: false,
    }
  },
  {
    id: "afterburner_f100_pw_229",
    name: "F100-PW-229",
    subtitle: "Fighter Low-Bypass w/ Reheat (F-15E / F-16)",
    category: "gas_turbine",
    engineType: "turbofan_afterburner",
    description: "Low-bypass tactical fighter turbofan with afterburner for supersonic acceleration.",
    params: {
      alt: 9144,
      mach: 1.4,
      bpr: 0.36,
      prc: 32.0,
      fpr: 3.8,
      tit: 1670,
      ab_enabled: true,
      ab_temp: 2050,
      mixed_exhaust: true,
    }
  },
  {
    id: "turbojet_olympus_593",
    name: "Olympus 593",
    subtitle: "Supersonic Turbojet (Concorde)",
    category: "gas_turbine",
    engineType: "turbojet",
    description: "Twin-spool turbojet designed for sustained Mach 2.0 transatlantic cruise.",
    params: {
      alt: 15000,
      mach: 2.0,
      prc: 15.5,
      tit: 1420,
      eta_c: 0.86,
      eta_t: 0.90,
    }
  },
  {
    id: "ramjet_mach3",
    name: "Ramjet Mach 3.2",
    subtitle: "High-Speed Supersonic Airbreathing Engine",
    category: "gas_turbine",
    engineType: "ramjet",
    description: "Compressorless engine operating via shockwave ram compression at M > 3.",
    params: {
      alt: 20000,
      mach: 3.2,
      t4: 2200,
      eta_b: 0.98,
      burner_dp_frac: 0.06,
    }
  }
];

export const ROCKET_PRESETS = [
  {
    id: "merlin_1d",
    name: "SpaceX Merlin 1D",
    subtitle: "LOX / RP-1 Booster Engine",
    description: "Gas-generator cycle engine powering Falcon 9 first stage.",
    params: {
      pc_bar: 97.0,
      pe_bar: 1.01325,
      area_ratio: 16.0,
      of_ratio: 2.36,
      propellant: "RP1/O2",
      mode: "shifting",
      throat_radius: 0.125
    }
  },
  {
    id: "rs_25_ssme",
    name: "RS-25 SSME",
    subtitle: "LOX / LH2 Staged Combustion Engine",
    description: "High-Isp engine powering Space Shuttle and Space Launch System (SLS).",
    params: {
      pc_bar: 206.4,
      pe_bar: 0.18,
      area_ratio: 77.5,
      of_ratio: 6.0,
      propellant: "H2/O2",
      mode: "shifting",
      throat_radius: 0.134
    }
  },
  {
    id: "raptor_2",
    name: "SpaceX Raptor 2",
    subtitle: "LOX / CH4 Full-Flow Staged Combustion",
    description: "High-pressure methalox engine powering Starship.",
    params: {
      pc_bar: 300.0,
      pe_bar: 1.01325,
      area_ratio: 34.0,
      of_ratio: 3.6,
      propellant: "CH4/O2",
      mode: "shifting",
      throat_radius: 0.110
    }
  }
];

export const MISSION_PRESETS = [
  {
    id: "f16_fighting_falcon",
    name: "F-16C Fighting Falcon",
    subtitle: "Multirole Supersonic Fighter",
    params: {
      k: 0.09,
      cd0: 0.018,
      cl_max: 2.1,
      mach_max: 2.0,
      ceiling_km: 15.2,
      ws_min: 1000,
      ws_max: 7000
    }
  },
  {
    id: "commercial_jetliner",
    name: "Boeing 737 / Airbus A320",
    subtitle: "Commercial Subsonic Jetliner",
    params: {
      k: 0.045,
      cd0: 0.02,
      cl_max: 2.4,
      mach_max: 0.82,
      ceiling_km: 12.5,
      ws_min: 2000,
      ws_max: 8000
    }
  }
];
