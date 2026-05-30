# Task Checklist — UI/UX Overhaul & Monochromatic Light Theme

This checklist tracks the implementation progress for auditing the Propulsion Analysis Suite, building the Monochromatic Light theme, resolving placeholders, and improving accessibility contrast.

---

## 1. Stylesheet & Range Sliders
- [x] Implement `data-theme="light"` overrides in [index.css](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/index.css)
- [x] Define inverted `--color-white` and `--color-black` mapping for automatic light-mode support
- [x] Upgrade range slider input tracks to `bg-white/20` and increase custom slider thumbs to `w-5 h-5` without default scale reduction for accessible interaction

---

## 2. Eliminate Settings Placeholders
- [x] Fully enable the `MONO_LIGHT` selection button in [Settings.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Settings.jsx)
- [x] Remove disabled states, cursor blocks, and the "Not yet implemented" warning labels

---

## 3. Sidebar & Text Contrast Accessibility (WCAG AA/AAA)
- [x] Increase Sidebar navigation link contrast (inactive items from `text-white/40` to `text-white/60`) in [App.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/App.jsx)
- [x] Increase Sidebar category header contrast (from `text-white/20` to `text-white/35`)
- [x] Audit tables and metric dashboards across pages to ensure excellent text contrast in both light and dark themes

---

## 4. Plotly Theme Adaptability
- [x] Retrieve active theme state in pages via `useSettings()`
- [x] Implement dynamic layout variables (gridlines, ticks, axes, hover outlines) in [ParametricCycle.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/ParametricCycle.jsx)
- [x] Implement dynamic layout and speed lines in [PerformanceMap.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/PerformanceMap.jsx)
- [x] Implement dynamic layout and mesh styling in [RocketAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/RocketAnalysis.jsx)
- [x] Implement dynamic layout and feasible envelope styling in [MissionAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/MissionAnalysis.jsx)

---

## 5. Verification & QA
- [x] Run production compilation build to verify zero compile warnings/errors
- [x] Run automated tests to check backend-frontend safety
- [x] Manually verify theme rendering, slider handling, and chart visibility across all pages
