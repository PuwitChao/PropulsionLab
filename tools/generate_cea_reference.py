"""Generate independent chamber references with NASA CEA, without application imports."""
from datetime import datetime, timezone
from importlib.metadata import version
import hashlib
import json
from pathlib import Path
import cea
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SPECIES = ['H2', 'H', 'O', 'O2', 'OH', 'H2O', 'HO2', 'H2O2']


def generate():
    rows = []
    reactants = cea.Mixture(['H2', 'O2'])
    products = cea.Mixture(SPECIES)
    solver = cea.EqSolver(products, reactants=reactants)
    for pressure, ratio in [(1e6, 2.0), (5e6, 4.0), (1e7, 6.0)]:
        weights = np.array([1.0, ratio]) / (1.0 + ratio)
        enthalpy = reactants.calc_property(cea.ENTHALPY, weights, 300.0) / cea.R
        solution = cea.EqSolution(solver)
        solver.solve(solution, cea.HP, enthalpy, pressure / 1e5, weights)
        if not solution.converged:
            raise RuntimeError(str(solution.last_error))
        rows.append({'pc_pa': pressure, 'of_ratio': ratio,
                     'temperature_k': float(solution.T), 'mw_kg_per_kmol': float(solution.MW)})
    package = Path(cea.__file__).parent
    artifacts = {str(p.relative_to(package)): hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in package.rglob('*') if p.is_file() and p.suffix in {'.pyd', '.so', '.lib'}}
    return {'generator': 'NASA CEA', 'version': version('cea'),
            'generated_utc': datetime.now(timezone.utc).isoformat(),
            'source': 'https://github.com/nasa/cea',
            'reactants': {'fuel': 'H2', 'oxidizer': 'O2', 'phase': 'gas', 'temperature_k': 300.0},
            'products': SPECIES, 'method': 'HP chamber only',
            'tolerance_basis': 'Preselected 1 percent code-comparison screen for distinct thermodynamic databases. Not an experimental accuracy bound.',
            'relative_tolerance': 0.01, 'artifact_sha256': artifacts, 'rows': rows}


if __name__ == '__main__':
    output = ROOT / 'docs/engineering/CEA_GAS_REFERENCE.json'
    output.write_text(json.dumps(generate(), indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(output)
