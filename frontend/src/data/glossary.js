/**
 * Propulsion engineering glossary used by <HelpTooltip>.
 * Each entry: { term, definition, unit? }
 */
export const glossary = {
  'surge margin': {
    term: 'Surge Margin',
    definition: 'Distance from the compressor operating point to the surge line, expressed as a percentage of design flow. Below ~10% the compressor becomes unstable.',
    unit: '%',
  },
  bpr: {
    term: 'Bypass Ratio (BPR)',
    definition: 'Mass flow through the fan bypass duct divided by core mass flow. High BPR (>5) improves propulsive efficiency for subsonic cruise.',
    unit: '—',
  },
  fpr: {
    term: 'Fan Pressure Ratio (FPR)',
    definition: 'Total-to-total pressure ratio across the fan. Typically 1.3–1.8 for high-BPR turbofans, 3–4 for military low-BPR.',
    unit: '—',
  },
  opr: {
    term: 'Overall Pressure Ratio (OPR)',
    definition: 'Total pressure ratio from freestream to combustor inlet. Higher OPR improves thermal efficiency but increases component temperatures.',
    unit: '—',
  },
  t4: {
    term: 'Turbine Inlet Temperature (TIT / T4)',
    definition: 'Total temperature at combustor exit / turbine entry. The primary driver of specific thrust; limited by blade material (~1800–2000 K uncooled).',
    unit: 'K',
  },
  'induced drag factor': {
    term: 'Induced Drag Factor (k)',
    definition: 'Oswald span efficiency factor in the drag polar CD = CD0 + k·CL². Typical values: 0.04–0.12 for clean wings.',
    unit: '—',
  },
  k: {
    term: 'Induced Drag Factor (k)',
    definition: 'Oswald span efficiency factor in the drag polar CD = CD0 + k·CL². Typical values: 0.04–0.12 for clean wings.',
    unit: '—',
  },
  cl_max: {
    term: 'Max Lift Coefficient (CL_max)',
    definition: 'Maximum achievable lift coefficient before stall. Drives stall speed and takeoff/landing field length. Typically 1.5–2.5 clean, up to 3.5 with flaps.',
    unit: '—',
  },
  epsilon: {
    term: 'Area Ratio (ε)',
    definition: 'Nozzle exit area divided by throat area. Determines the exit Mach number and vacuum Isp. Higher ε is beneficial in vacuum; optimum at sea level depends on ambient pressure.',
    unit: '—',
  },
  'area ratio': {
    term: 'Area Ratio (ε)',
    definition: 'Nozzle exit area divided by throat area. Determines the exit Mach number and vacuum Isp.',
    unit: '—',
  },
  shifting: {
    term: 'Shifting Equilibrium',
    definition: 'Combustion products continuously re-equilibrate as gas expands through the nozzle. Gives higher Isp than frozen flow — used for upper-stage performance estimation.',
    unit: null,
  },
  frozen: {
    term: 'Frozen Equilibrium',
    definition: 'Combustion product composition freezes at the throat and does not change downstream. Conservative (lower Isp) — used for early design and verification.',
    unit: null,
  },
  'l*': {
    term: 'Characteristic Length (L*)',
    definition: 'Chamber volume divided by throat area. Governs residence time for combustion completeness. Typical range: 0.7–1.5 m for liquid propellants.',
    unit: 'm',
  },
  tsfc: {
    term: 'Thrust-Specific Fuel Consumption (TSFC)',
    definition: 'Fuel mass flow per unit thrust. Lower is better. Typical values: 15–20 mg/N/s cruise for turbofans, 40–60 for turbojets.',
    unit: 'mg/N/s',
  },
  isp: {
    term: 'Specific Impulse (Isp)',
    definition: 'Thrust per unit weight flow of propellant — the rocket equivalent of fuel efficiency. H2/O2 vacuum Isp ≈ 450 s; RP-1/O2 ≈ 310 s.',
    unit: 's',
  },
  'c*': {
    term: 'Characteristic Velocity (c*)',
    definition: 'Chamber pressure × throat area / mass flow rate. Measures combustion chamber efficiency independent of nozzle geometry.',
    unit: 'm/s',
  },
};

export default glossary;
