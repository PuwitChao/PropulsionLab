# Codex Handover

Date: 2026-06-05

## Goal

Polish the Propulsion Analysis Suite UI for partial internal testing. The intended direction is a professional monochrome lab interface with clean technical copy, no corrupted glyphs, good responsive behavior, and passing frontend gates.

## Current Worktree State

Changes already made in this session:

- Added `AGENTS.md` for Codex project instructions.
- Updated `.github/workflows/ci.yml` so CI also runs on `codex/**` branches.
- Normalized corrupted mojibake in `frontend/src` user-visible strings:
  - Replaced broken em dashes with ASCII `-`.
  - Replaced broken eta glyphs with `eta`.
  - Replaced broken square-meter text with `m^2`.
  - Fixed `<=` JSX text in `MissionAnalysis.jsx`.
- Converted red warning/error accents to monochrome warning styles:
  - Added `.warning-panel`, `.warning-panel-soft`, `.warning-text`, `.warning-text-muted`, and `.warning-marker` in `frontend/src/index.css`.
  - Updated app status, error banners, diagnostics alerts, rocket thermal warnings, settings status, and performance map surge markers to grayscale.
- Added responsive shell CSS for screens below `1023px`:
  - Sidebar/header/footer become static full-width blocks.
  - Main content loses fixed left margin/viewport-height scroll trap.
  - Sidebar sections flow into a responsive grid.
- Removed unused `getLayout` imports from `ParametricCycle.jsx` and `PerformanceMap.jsx`.

## Validation Completed

Commands run from `frontend/`:

```bash
npm.cmd run lint
npm.cmd run build
```

Result:

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- Build warning remains: generated JS chunk is large because Plotly is bundled. This is not a new failure, but should be tracked later for code splitting/lazy loading.

Local server:

- Vite dev server was started on `http://127.0.0.1:5173`.
- `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173` returned HTTP `200`.
- `netstat` earlier showed port `5173` listening on PID `49308`.

## Browser QA Status

Rendered in-app Browser validation was attempted but blocked:

- Browser plugin bootstrap failed when loading the Browser runtime through the JavaScript runtime.
- Error summary: `windows sandbox failed: spawn setup refresh`.
- Repo does not include Playwright, and no Chrome automation tool was exposed through tool search.

Because of that, visual QA is still incomplete. The next agent should prioritize a manual/in-app browser check if the Browser runtime works in the next session.

## Recommended Next Steps

1. Inspect the current diff carefully:
   ```bash
   git status --short
   git diff -- frontend/src
   ```
2. Open `http://127.0.0.1:5173` and visually check:
   - Dashboard first viewport.
   - Sidebar/header/footer on desktop and below 1023px.
   - Cycle Solver, Map Matching, Chamber CEA, Size Synth, Fault Isolation, and Environment tabs.
   - Dark and light modes.
   - Error/offline backend states if backend is not running.
3. Confirm no remaining visible corrupted text:
   ```bash
   rg "â|Î|Â|red-|bg-red|text-red|border-red|239,|68, 68|---" frontend/src
   ```
4. If visual QA passes, consider the next UX polish layer:
   - Standardize compact table empty states.
   - Improve chart loading/empty states across pages.
   - Track Plotly bundle size for later lazy-loading.

## Important Notes

- Do not mark the full UI polish goal complete yet. Browser/visual QA is still not proven.
- The frontend gates pass, but this is not sufficient for release-readiness because the goal is UX polish.
- There may be a running Vite process on port `5173`; reuse it if available or restart with:
  ```bash
  cd frontend
  npm.cmd run dev -- --host 127.0.0.1
  ```

