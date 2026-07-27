# Task List: UI Review & Accessibility (a11y) Audit

- [x] 1. Design System & CSS Focus Audit (`frontend/src/index.css`)
  - [x] Add global `:focus-visible` high-contrast cyan focus rings for keyboard navigation
  - [x] Refactor low-contrast muted copy to meet WCAG AA contrast standards
  - [x] Refactor interactive hover/active states for smooth micro-animations

- [x] 2. App Shell & Landmarks Audit (`frontend/src/App.jsx`)
  - [x] Convert main layout regions to semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`)
  - [x] Add `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` for sidebar navigation
  - [x] Add `aria-label="Main Navigation"` to nav sidebar

- [x] 3. Components Accessibility Audit (`frontend/src/components/`)
  - [x] Refactor `SliderControl.jsx` with input `id`, `<label htmlFor>`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
  - [x] Refactor `StatPanel.jsx` with `<article>` semantic metric markup and screen-reader `aria-label`
  - [x] Refactor `ErrorBanner.jsx` with `role="alert"` and `aria-live="assertive"`
  - [x] Refactor `HelpTooltip.jsx` with keyboard focus triggers, `aria-expanded`, `role="tooltip"`, and Escape key dismiss

- [x] 4. Page Views & Interactive Elements Audit (`frontend/src/pages/`)
  - [x] Audit `ParametricCycle.jsx` (SVG blueprint diagram `role="img"` & `aria-label`, button accessibility)
  - [x] Audit `PerformanceMap.jsx` (Speed line view toggles & CSV export button accessibility)
  - [x] Audit `RocketAnalysis.jsx` (MoC visualization `aria-label`, STL/CSV export buttons accessibility)
  - [x] Audit `MissionAnalysis.jsx` (Constraint curve controls accessibility)
  - [x] Audit `Diagnostics.jsx` (Sensor controls region accessibility)
  - [x] Audit `Settings.jsx` (Theme choice `<fieldset>` and `<legend>` accessibility, `aria-pressed`)

- [x] 5. Verification & Build Confirmation
  - [x] Run `npm run lint` in `frontend/` (0 errors)
  - [x] Run `npm run build` in `frontend/` (built in 1.61s)
  - [x] Run `pytest tests/ -v` (123/123 passed)
  - [x] Document audit and accessibility refactoring in `walkthrough.md`
