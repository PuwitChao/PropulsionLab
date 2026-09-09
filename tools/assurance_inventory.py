"""Print a source inventory for the engineering assurance audit."""

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def inventory():
    for path in sorted((ROOT / 'core').rglob('*.py')):
        source = path.read_text(encoding='utf-8-sig')
        tree = ast.parse(source)
        print(f'\n## {path.relative_to(ROOT).as_posix()}')
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                print(f'- Function L{node.lineno}: `{node.name}`')
            elif isinstance(node, (ast.For, ast.While, ast.ExceptHandler)):
                print(f'- Control L{node.lineno}: `{ast.get_source_segment(source, node).splitlines()[0]}`')
            elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {'max', 'min', 'abs'}:
                print(f'- Conditioning L{node.lineno}: `{ast.get_source_segment(source, node)}`')


if __name__ == '__main__':
    inventory()
