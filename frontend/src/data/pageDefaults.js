export const PAGE_DEFAULTS = {
  cycle: {
    alt: 10000, mach: 0.8, prc: 25, tit: 1650,
    bpr: 6.0, fpr: 1.6, lpc_pr: 3.0,
    eta_c: 0.88, eta_t: 0.92, burner_dp_frac: 0.04,
    inlet_recovery: 0.98, phi_inlet: 0.0, eta_install_nozzle: 1.0,
    ab_enabled: false, ab_temp: 2000
  },
  rocket: {
        pc: 7.5e6, of_ratio: 6.0, pe: 101325.0, pa: 101325.0,
        propellant: 'H2/O2', mode: 'shifting',
        thrust_target_N: 500000
    },
  map: {
        alt: 0,
        mach: 0.0,
        prc: 20,
        tit: 1550,
    },
  mission: { k: 0.1, cd0: 0.02, cl_max: 2.0 }
}
