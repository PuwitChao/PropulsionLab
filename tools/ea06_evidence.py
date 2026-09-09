"""Reproduce selected EA-06 numerical evidence without promoting model validation."""
from pathlib import Path
import sys,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from tools.validate_references import build_report
from core.gas_turbine.turbofan import methane_turbofan
from core.rocket.analyzer import RocketAnalyzer
from core.solver_result import require_finite


def build_evidence():
    gt={}
    for model in ('methane_turbofan_research','methane_mixed_turbofan_research','methane_multispool_research'):
        r=methane_turbofan(101325,288.15,0,1800,model=model)
        gt[model]={'inputs':r['assurance']['inputs_si'],'status':r['status'],'specific_thrust_n_per_kg_per_s_air':r['spec_thrust'],
            'shaft_residuals_j_per_kg_core_air':{k:v['residual_j_per_kg_core_air'] for k,v in r['shafts'].items()},
            'mass_balance_residual':sum(n['mass_per_core_air'] for n in r['nozzles'].values())-r['inlet_mass_per_core_air']-r['f_total_per_core_air'],
            'efficiency_available':False}
    rocket={}
    for mode in ('frozen','shifting'):
        r=RocketAnalyzer(1e7).solve_equilibrium('H2/O2',6.,mode=mode,compute_heat_transfer=False)
        rocket[mode]={'inputs':{'pc_pa':1e7,'propellants':'H2/O2','of_ratio':6,'mode':mode},'c_star':r['c_star'],
            'constant_gamma_c_star':r['c_star_constant_gamma'],'throat':r['throat'],
            'exit_mass_residual_kg_s':r['rho_exit']*r['v_exit_ideal']*r['A_exit']-r['mdot_total']}
    paths=list((ROOT/'core').rglob('*.py'))+[ROOT/'backend/main.py',ROOT/'backend/models.py',ROOT/'tools/ea06_evidence.py']
    report={'purpose':'Numerical verification and frozen reference comparisons only. No independently validated model domain.',
        'independent_comparisons':build_report(),'gt_architectures':gt,'rocket_throats':rocket,
        'source_sha256':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}}
    require_finite(report)
    return report


if __name__=='__main__':
    report=build_evidence()
    target=ROOT/'docs/engineering/EA06_FINAL_EVIDENCE.json'
    target.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(report['independent_comparisons']['summary'])
    print(target)
    if any(r['status'] in {'DIFFERENCE','ERROR'} for r in report['independent_comparisons']['results']):raise SystemExit(1)
