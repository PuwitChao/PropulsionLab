
## core/__init__.py

## core/diagnostics.py
- Function L17: `analyze`

## core/gas_turbine/__init__.py

## core/gas_turbine/cycle.py
- Function L22: `_new_gas`
- Function L26: `get_gas_props`
- Function L65: `__init__`
- Function L71: `get_entropy`
- Function L110: `__init__`
- Function L135: `_poly_to_isen_comp`
- Function L139: `_poly_to_isen_turb`
- Function L143: `_nozzle_exit`
- Function L150: `solve_turbojet`
- Function L288: `solve_turbofan`
- Function L519: `solve_multispool`
- Function L698: `solve_ramjet`
- Control L618: `for _ in range(8):`
- Conditioning L48: `max(0.0, min(phi, 1.2))`
- Conditioning L220: `max(f, 0.0)`
- Conditioning L369: `max(hpc_pr, 1.0)`
- Conditioning L388: `max(f, 0.0)`
- Conditioning L589: `max(opr / (fpr * lpc_pr), 1.0)`
- Conditioning L604: `max(f, 0.0)`
- Conditioning L727: `max(1.0, self.m0)`
- Conditioning L747: `max(f, 0.0)`
- Conditioning L48: `min(phi, 1.2)`
- Conditioning L251: `max(f_ab, 0.0)`
- Conditioning L270: `max(0.0, 2.0 * cpn * tt9_in * (1.0 - (self.p0 / pt9_in) ** ((gn - 1.0) / gn)))`
- Conditioning L672: `max(0.0, 2.0 * cpn_c * tt5 * (1.0 - (self.p0 / pt9_in) ** ((gn_c - 1.0) / gn_c)))`
- Conditioning L764: `max(0.0, 2.0 * cpn * tt4 * (1.0 - (self.p0 / pt9_in) ** ((gn - 1.0) / gn)))`
- Conditioning L234: `max(pt5_ratio, 1e-4)`
- Conditioning L397: `max( (1.0 - (1.0-tau_hpt)/eta_isen_hpt), 1e-4)`
- Conditioning L409: `max( (1.0 - (1.0-tau_lpt)/eta_isen_lpt), 1e-4)`
- Conditioning L433: `min(pt5, pt21)`
- Conditioning L436: `min(pt5, pt21)`
- Conditioning L443: `max(f_ab, 0.0)`
- Conditioning L463: `max(0.0, delta_ke_m / q_in_m)`
- Conditioning L465: `max(0.0, min(thrust_power_m / max(delta_ke_m, 1.0), 1.0))`
- Conditioning L500: `max(0.0, delta_ke_s / q_in_s)`
- Conditioning L502: `max(0.0, min(thrust_power_s / max(delta_ke_s, 1.0), 1.0))`
- Conditioning L632: `abs(tt45_new - tt45)`
- Conditioning L632: `max(abs(tt45), 1.0)`
- Conditioning L633: `abs(tt5_new - tt5)`
- Conditioning L633: `max(abs(tt5), 1.0)`
- Conditioning L643: `max((1.0 - (1.0 - tau_lpt) / eta_isen_lpt), 1e-4)`
- Conditioning L233: `abs(1-tau_t)`
- Conditioning L263: `max(v9, 1.0)`
- Conditioning L465: `min(thrust_power_m / max(delta_ke_m, 1.0), 1.0)`
- Conditioning L502: `min(thrust_power_s / max(delta_ke_s, 1.0), 1.0)`
- Conditioning L624: `max((1.0 - (1.0 - tau_hpt) / eta_isen_hpt), 1e-4)`
- Conditioning L632: `abs(tt45)`
- Conditioning L633: `abs(tt5)`
- Conditioning L664: `max(v9, 1.0)`
- Conditioning L665: `max(v19, 1.0)`
- Conditioning L759: `max(v9, 1.0)`
- Conditioning L453: `max(v9, 1.0)`
- Conditioning L489: `max(v9, 1.0)`
- Conditioning L490: `max(v19, 1.0)`
- Conditioning L465: `max(delta_ke_m, 1.0)`
- Conditioning L502: `max(delta_ke_s, 1.0)`

## core/gas_turbine/mission.py
- Function L9: `__init__`
- Function L14: `calculate_dynamic_pressure`
- Function L23: `tw_level_flight`
- Function L30: `tw_ps`
- Function L37: `tw_sustained_turn`
- Function L44: `tw_service_ceiling`
- Function L51: `tw_climb`
- Function L59: `tw_takeoff`
- Function L71: `generate_constraint_data`
- Function L117: `calculate_breguet_range`
- Control L78: `for c in constraints:`
- Control L83: `for ws in ws_range:`
- Conditioning L106: `max(points)`
- Conditioning L110: `min(finite_pairs, key=lambda x: x[0])`

## core/gas_turbine/off_design.py
- Function L23: `_compressor_map`
- Function L71: `_turbine_map`
- Function L86: `_turbine_pr_from_work_balance`
- Function L137: `__init__`
- Function L148: `sweep_throttle`
- Function L243: `generate_compressor_map`
- Conditioning L41: `max(0.4, min(N_corr_norm, 1.15))`
- Conditioning L42: `max(0.05, min(mdot_corr_norm, 1.10))`
- Conditioning L53: `min(W / w_choke, 1.0)`
- Conditioning L57: `max(1.0, pr)`
- Conditioning L63: `max(0.50, min(eta, 0.92))`
- Conditioning L80: `abs(N_corr_norm - 1.0)`
- Conditioning L82: `max(0.60, min(eta, 0.93))`
- Conditioning L113: `max(0.40, min(eta_c, 0.95))`
- Conditioning L114: `max(0.50, min(eta_t, 0.95))`
- Conditioning L126: `max(1.0, (1.0 - drop_ratio) ** (-1.0 / gt_exp))`
- Conditioning L127: `min(pi_t, 50.0)`
- Control L168: `for i in range(n_points):`
- Control L260: `for N in N_values:`
- Conditioning L41: `min(N_corr_norm, 1.15)`
- Conditioning L42: `min(mdot_corr_norm, 1.10)`
- Conditioning L63: `min(eta, 0.92)`
- Conditioning L82: `min(eta, 0.93)`
- Conditioning L113: `min(eta_c, 0.95)`
- Conditioning L114: `min(eta_t, 0.95)`
- Conditioning L119: `max(1.0, enthalpy_drop_avail)`
- Control L187: `for _ in range(3):`
- Control L267: `for j in range(n_flow_points + 1):`
- Conditioning L81: `max(0, 1.0 - pr / pr_design)`
- Conditioning L117: `max(0.5, eta_mech)`
- Control L228: `except Exception as exc:`
- Conditioning L116: `max(1.0, pr_compressor)`
- Conditioning L117: `max(0.0, f)`
- Conditioning L197: `abs(eta_t_new - eta_t)`
- Conditioning L169: `max(n_points - 1, 1)`
- Conditioning L189: `max(1.0, pr)`
- Conditioning L206: `max(1.5, pr)`

## core/gas_turbine/thermo.py
- Function L8: `poly_to_isen_comp`
- Function L26: `poly_to_isen_turb`
- Function L48: `nozzle_exit`
- Control L44: `except Exception:`
- Conditioning L38: `abs(1.0 - tau_t)`

## core/presets.py

## core/rocket/__init__.py

## core/rocket/analyzer.py
- Function L33: `_new_gas`
- Function L37: `__init__`
- Function L73: `_bartz_heat_flux`
- Function L174: `solve_equilibrium`
- Function L459: `altitude_performance`
- Control L133: `for i in range(stations_n):`
- Control L317: `for _name, _val in [('isp_delivered', isp_delivered), ('isp_vac', isp_vac), ('c_star', c_star)]:`
- Control L482: `for alt in altitudes_m:`
- Conditioning L113: `max(pr, 0.3)`
- Conditioning L355: `max(r_throat * 2.0, 0.05)`
- Conditioning L160: `max(h_local * (t_aw - t_wall), 0.0)`
- Control L260: `except Exception as exc:`
- Conditioning L274: `max(0.0, 2.0 * (h_chamber - h_exit))`
- Control L297: `except Exception as exc:`
- Conditioning L304: `max(0.0, 2.0 * (h_chamber - gas.h))`
- Control L380: `except Exception:`
- Conditioning L397: `max(0.1, gn_exit * rn_exit * t_exit)`
- Control L497: `except Exception as e:`
- Conditioning L134: `max(stations_n - 1, 1)`

## core/rocket/moc.py
- Function L5: `_face_normal`
- Function L38: `__init__`
- Function L49: `prandtl_meyer`
- Function L58: `_inv_prandtl_meyer`
- Function L72: `_mach_angle`
- Function L76: `_state`
- Function L83: `_axis_point`
- Function L92: `_field_point`
- Function L121: `_wall_point`
- Function L141: `_solve_net`
- Function L187: `solve_contour`
- Function L218: `get_mesh_data`
- Function L224: `generate_stl_mesh`
- Function L267: `generate_obj_mesh`
- Control L63: `for _ in range(100):`
- Control L107: `for _ in range(2):`
- Control L152: `for i in range(n):`
- Control L161: `for k in range(n):`
- Control L234: `for i in range(len(self.wall_x) - 1):`
- Control L280: `for i in range(len(self.wall_x)):`
- Control L286: `for v in vertices:`
- Control L291: `for i in range(num_x - 1):`
- Conditioning L73: `min(max(m, 1.0 + 1e-9), 60.0)`
- Control L164: `for j in range(n_field):`
- Conditioning L193: `max(12, int(subdivisions))`
- Control L238: `for j in range(num_theta - 1):`
- Control L283: `for t in thetas:`
- Control L292: `for j in range(num_theta - 1):`
- Conditioning L73: `max(m, 1.0 + 1e-9)`
- Conditioning L133: `abs(denom)`
- Conditioning L89: `abs(slope)`
- Conditioning L111: `abs(denom)`

## core/units.py
- Function L13: `kts_to_ms`
- Function L16: `ms_to_kts`
- Function L19: `ft_to_m`
- Function L22: `m_to_ft`
- Function L25: `lbf_to_n`
- Function L28: `n_to_lbf`
- Function L32: `isa_atmosphere`
- Conditioning L89: `min(h, 47000.0)`
