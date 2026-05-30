# Implementation Plan - UI/UX Overhaul & Monochromatic Light Theme

This plan outlines the design, technical details, and changes required to perform a comprehensive UI/UX audit and overhaul of the **Propulsion Analysis Suite**. 
The goal is to ensure high-contrast legibility, complete accessibility (WCAG AA/AAA contrast), clean spacing, dynamic data visualization theme adaptability, and the implementation of the previously placeholder **Monochromatic Light** (`MONO_LIGHT`) mode.

---

## User Review Required

> [!IMPORTANT]
> **Dynamic CSS Inversion for Monochromatic Design**:
> Rather than manually swapping tailwind classnames in dozens of JSX files (which is error-prone and dilutes the semantic code design), we will use Tailwind CSS v4's custom theme capability. By mapping `--color-white` and `--color-black` inside `html[data-theme="light"]`, we can automatically invert all white text, white borders, and white fills to high-contrast dark slate (`#0F172A`), and black backgrounds/surfaces to bright white paper backgrounds (`#FFFFFF`) or slate-tints.
>
> This enables seamless light-mode rendering of custom inline SVGs (like the `StationDiagram` in `ParametricCycle.jsx`) and custom utility classes.

---

## Professional Spacing & Design Principles

To ensure a clean, authoritative, and accessible interface suitable for professional aerospace telemetry analysis, we will adhere to the following core guidelines:

1. **The 8-Pixel Grid System**:
   - All component padding, margins, gaps, and structural heights will strictly align to multiples of `4` or `8` pixels to maintain an orderly visual rhythm.
   - Standard padding sizes: `p-12` (48px) for large technical cards, `p-8` (32px) for mid-size panels, and `p-5` (20px) for compact sidebar control groups.
   - Card grid layout spacing: `gap-12` (48px) or `gap-8` (32px) grid gaps to prevent visual crowding of metrics.

2. **Accessible Interaction & Touch Targets**:
   - Every clickable element (buttons, tabs, inputs) must maintain a minimum target size of `44 × 44` CSS pixels or provide appropriate touch buffers.
   - Range input slider thumbs are expanded to `w-5 h-5` (20px) with no default scale down, surrounded by generous vertical padding (`py-4`) to optimize adjustment accuracy.
   - Inline SVG station interactive nodes will feature explicit cursor-pointers and circular target rings of at least `24px` diameter with interactive mouseover glows.

3. **WCAG 2.1 Contrast Standards**:
   - Body copy, labels, values, and solver outputs will meet **WCAG 2.1 Level AAA** contrast criteria (7:1 contrast ratio) against backgrounds.
   - Muted helper text or category headers will meet **Level AA** contrast criteria (minimum 4.5:1 ratio) to ensure ease of reading on standard monitors.
   - Inactive states (navigation tabs, unselected toggle controls) will avoid drop opacities below 50% (`text-white/60` minimum) to preserve layout hierarchy without sacrificing readability.

4. **Negative Space & Telemetry Density Balance**:
   - Large metric charts (Plotly canvas) will have explicit top/bottom/left/right margin padding (minimum 60px) to prevent chart labels from overlapping titles, legends, or adjacent cards.
   - Multi-column tables will use explicit column spacing and sticky high-contrast headers to remain readable during vertical scrolling.

---

## Proposed Changes

### 1. Style System and Design Tokens

#### [MODIFY] [index.css](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/index.css)
- Implement a fully featured `MONO_LIGHT` theme in `@layer base` by overriding CSS custom properties when `html[data-theme="light"]` is active.
- Redefine custom theme colors:
  - `--color-white`: `#0F172A` (Deep Slate in light mode)
  - `--color-black`: `#FFFFFF` (Pure white background)
  - `--color-surface`: `#F8FAFC` (Slate Tint)
  - `--color-on-surface`: `#0F172A`
  - `--color-surface-container`: `#FFFFFF`
  - `--color-surface-container-lowest`: `#F1F5F9`
  - `--color-surface-container-low`: `#F8FAFC`
  - `--color-surface-container-high`: `#E2E8F0`
  - `--color-surface-container-highest`: `#CBD5E1`
  - `--color-surface-bright`: `#CBD5E1`
  - `--color-primary`: `#0F172A`
  - `--color-on-primary`: `#FFFFFF`
  - `--color-outline`: `#CBD5E1`
  - `--color-outline-variant`: `#E2E8F0`
  - `--color-on-surface-variant`: `#64748B`
- Enhance range sliders (`input[type="range"]`):
  - Increase track visibility: change `bg-white/10` to `bg-white/20` or `bg-white/25` for improved track contrast.
  - Optimize hover and thumb sizes: increase webkit slider thumb from `w-4 h-4` to `w-5 h-5` and remove the default `scale(0.7)` reduction to make it a more accessible, click-friendly block (`16px-20px` surface area).
- Enhance default text visibility:
  - Apply `text-on-surface` by default, ensuring all standard headers and body texts automatically match the current theme context.

### 2. Frontend Configuration & Settings Overhaul

#### [MODIFY] [Settings.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Settings.jsx)
- Activate and fully implement the theme switch selector button for `MONO_LIGHT`.
- Remove all disabled stubs, `opacity-30`, `cursor-not-allowed` styles, and the placeholder `Not yet implemented` labels.
- Style the `MONO_LIGHT` button to look identically premium to the `MONO_DARK` selection button when active.

### 3. Accessible Sidebar & Page Spacing

#### [MODIFY] [App.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/App.jsx)
- Improve sidebar text legibility:
  - Increase sidebar navigation link text contrast: change inactive links from `text-white/40` to `text-white/60`.
  - Sidebar categories (like `_ROOT`, `THERMODYNAMICS`): increase from `text-white/20` to `text-white/35` to ensure WCAG compliance on dark background.
  - Side information panel and session timers: adjust text contrast to meet AA contrast standards.

### 4. Plotly Theme Adaptability (Multi-page Audit)

Plotly is canvas/SVG based, so it ignores global CSS styling. We must inject dynamic theme variables retrieved via `useSettings()` to ensure charts look beautiful and highly legible in both dark and light modes.

#### [MODIFY] [ParametricCycle.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/ParametricCycle.jsx)
- Retrieve theme state via `useSettings()`.
- Dynamically adjust `Plot` layout variables:
  - Gridlines: `#E2E8F0` (light) vs `rgba(255,255,255,0.05)` (dark)
  - Tick color / axis labels: `#64748B` (light) vs `rgba(255,255,255,0.4)` (dark)
  - Line traces: `#0F172A` (light) vs `#FFFFFF` (dark)
  - Layout background, legends, and annotation borders.
- Pass theme down or retrieve it inside `StationDiagram` to ensure any custom colors (like gradients or background panels) are perfectly tailored.

#### [MODIFY] [PerformanceMap.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/PerformanceMap.jsx)
- Retrieve `theme` via `useSettings()`.
- Dynamically style Plotly charts for **Compressor Recovery Plot**, **Fishhook Curve**, and **Surge Proximity Profile**:
  - Grid colors and coordinate texts.
  - Speed lines: adapt trace colors from `rgba(255,255,255,...)` to dynamic `rgba(15,23,42,...)` when light theme is active.
  - Design point star markers and surge line boundaries.

#### [MODIFY] [RocketAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/RocketAnalysis.jsx)
- Retrieve `theme` via `useSettings()`.
- Dynamically style Plotly charts for **Nozzle Expansion Mesh** (2D scatter plot and 3D surface mesh plot):
  - In 2D: Gridlines, center-lines, wave reflections, and nozzle walls.
  - In 3D: Background bounding grids, ambient lighting, coordinates, and mesh lines.

#### [MODIFY] [MissionAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/MissionAnalysis.jsx)
- Retrieve `theme` via `useSettings()`.
- Dynamically style Plotly charts for the **Performance Cloud Synthesis** envelope diagram:
  - Feasible region fills: adjust opacity and colors dynamically.
  - Sizing constraint lines: convert traces to high-contrast dark lines when in light mode.
  - Selected target crosshair circles.

---

## Verification Plan

### Automated Tests
- Run the full suite of backend and frontend tests to ensure no regressions:
  ```powershell
  pytest
  npm run lint
  npm run build
  ```

### Manual Verification
1. Launch both the backend FastAPI kernel and frontend Vite servers.
2. Navigate to the **Settings (Environment)** page.
3. Toggle the **MONO_LIGHT** theme button. Ensure the application instantly and completely updates its colors to a beautiful Slate-tinted light paper background.
4. Verify that:
   - Inline SVGs (Station Blueprint in Parametric Cycle) render with high-contrast charcoal lines.
   - Text remains fully readable (WCAG AA/AAA).
   - Sidebars, headers, and grid metrics are perfectly distinct.
5. Check all Plotly charts on each page (**Cycle_Solver**, **Map_Matching**, **Chamber_CEA**, **Size_Synth**, and **Diagnostics**). Verify that axes, gridlines, speed lines, wall curves, and tooltips are clearly visible and appropriately high-contrast in both dark and light modes.
6. Verify range input sliders have larger, more accessible thumbs and higher-contrast tracks in both themes.
