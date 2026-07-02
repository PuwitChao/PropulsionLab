# Agent Rules & Heuristics

## PowerShell Command Chaining on Windows
- Always chain multiple commands using the semicolon `;` separator (e.g., `npm run lint; npm run build`) instead of the bash-like `&&` operator, which is unsupported in default Windows PowerShell (5.x) and throws a syntax parser error.
- Alternatively, run commands as separate tool calls sequentially.
