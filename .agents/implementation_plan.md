# Implementation Plan: UI/UX Compliance & Responsive Design Polish

This plan addresses layout, formatting, and responsive styling issues across the Propulsion Analysis Suite. The main objectives are:
1. Fix the responsive layout shell using native Tailwind classes instead of brittle custom overrides.
2. Resolve CSS specificity issues, including removing the globally forced `* { border-radius: 0 !important; }` rule that breaks circular elements (like help tooltips).
3. Prevent layout and text overlaps by converting absolute position patterns to flexible, relative flow layouts.
4. Make all parameters, charts, grids, and tables responsive for different screen sizes.

---

## Proposed Changes

### 1. Global Styles and Layout Shell

#### [MODIFY] [index.css](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/index.css)
- Remove `* { border-radius: 0 !important; }` to allow components (like tooltips and circles) to define custom shapes (e.g., `rounded-full`). Instead, define default reset style using `* { border-radius: var(--radius-default, 0px); }`.
- Remove the conflicting custom media query `@media (max-width: 1023px)` overrides for `.app-sidebar`, `.app-header`, `.app-footer`, and `.app-main`.
- Update range input styles to use `cursor-pointer` / `cursor-grab` instead of `cursor-crosshair`.

#### [MODIFY] [App.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/App.jsx)
- Update the layout shell elements to use Tailwind's responsive prefixes (e.g. `lg:fixed`, `lg:w-[280px]`, `hidden lg:flex`).
- Add a mobile navigation header with a hamburger button to toggle the sidebar menu.
- Ensure that the main viewport stretches and adjusts width smoothly across all screens.

---

### 2. Page & Component Layouts

#### [MODIFY] [Diagnostics.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Diagnostics.jsx)
- Convert the 3-column stats panel grid to a responsive grid: `grid-cols-1 sm:grid-cols-3 gap-6`.
- Improve right-column structure. Replace `justify-between` with natural spacing and margin helpers to prevent squeeze bugs.
- Make the diagnostic status report panel responsive.

#### [MODIFY] [PerformanceMap.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/PerformanceMap.jsx)
- Make the stats grid responsive: `grid-cols-2 md:grid-cols-4 gap-4`.
- Convert the fishhook chart and tabular audit view columns from `grid-cols-1 md:grid-cols-2` to a mobile-friendly stack layout.
- Make the side navigation / toggle tabs scale correctly.

#### [MODIFY] [ParametricCycle.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/ParametricCycle.jsx)
- Remove absolute positioning within the blueprint and chart cards. Use flex layouts where overlays stack above the chart on smaller screens.
- Make the station display rows and stats responsive.

#### [MODIFY] [RocketAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/RocketAnalysis.jsx)
- Make the propellant selector and combustion inputs adapt smoothly to narrow widths.
- Ensure the MoC visualization buttons and layout remain clear on smaller viewports.

---

## Verification Plan

### Automated Verification
- Run `npm run lint` and `npm run build` in the `frontend` workspace to verify correct bundling and syntax.

### Manual Verification
- Resize the browser window to test responsiveness across desktop, tablet, and mobile dimensions.
- Verify that the help tooltips render as rounded circles.
- Check light/dark mode compliance for readability and contrast.
