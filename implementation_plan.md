# Implementation Plan: UI Review & Accessibility (a11y) Audit & Refactoring

Perform a comprehensive UI design review and WCAG 2.1 AA accessibility audit across PropulsionLab, refactoring styles, markup semantics, focus rings, screen reader labels, and visual components to achieve a premium, Anti-AI-Slop, fully accessible web interface.

## User Review Required

> [!NOTE]
> This plan audits and refactor frontend CSS and React components to enforce WCAG 2.1 AA standards (keyboard focus, ARIA landmarks, contrast ratios, slider accessibility) and Anti-AI-Slop UI guidelines (typography hierarchy, selected state polish, layout symmetry).

## Proposed Changes

### 1. Styles & Design System ([index.css](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/index.css))
- Add global `:focus-visible` focus rings across all interactive elements (`button`, `input`, `select`, `a`) for keyboard navigation.
- Audit and increase text contrast ratios for muted copy (raising `text-white/20` / `text-white/30` to compliant contrast levels where readability is required).
- Enforce smooth transitions, rounded corners consistency, backdrop blur, and custom active tab/button styling.

### 2. App Shell & Navigation ([App.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/App.jsx))
- Wrap top header, sidebar navigation, main content, and status footer in HTML5 semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`).
- Implement `role="tablist"`, `role="tab"`, `aria-selected`, and `aria-controls` for sidebar navigation buttons.
- Add `aria-live="polite"` for background API status indicators.

### 3. Reusable UI Components ([frontend/src/components/](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/components/))
- **`SliderControl.jsx`**: Add explicit `<label htmlFor="...">`, `id`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-label` for screen reader readability.
- **`StatPanel.jsx`**: Ensure metric cards have clear semantic hierarchy (`<article>` or `<dl>/<dt>/<dd>`), high-contrast text, and screen-reader labels.
- **`ErrorBanner.jsx`**: Add `role="alert"` and `aria-live="assertive"` for error feedback.
- **`HelpTooltip.jsx`**: Add keyboard support (trigger tooltip on focus/blur and keyboard press) with `aria-describedby`.

### 4. Page View Accessibility & Layout Polish ([frontend/src/pages/](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/))
- Audit and add semantic landmarks (`<section>`, `<fieldset>`, `<legend>`), accessible button labels, and high-contrast typography across:
  - `ParametricCycle.jsx` (Add `aria-label` to SVG blueprint diagram)
  - `PerformanceMap.jsx` (Add `aria-label` to compressor map view toggle and engine deck export)
  - `RocketAnalysis.jsx` (Add accessible labels to 2D/3D MoC visualization, propellant selectors, and export buttons)
  - `MissionAnalysis.jsx` (Add accessible labels to constraint settings and envelope compliance indicators)
  - `Diagnostics.jsx` (Add `role="region"` to sensor telemetry section)
  - `Settings.jsx` (Add `fieldset`/`legend` for theme and text size choices)

## Recommended Skills

- **`ui_review`**: Audit against Anti-AI-Slop guidelines, typography, selected states, and visual polish.
- **`accessibility`**: Audit against WCAG 2.1 AA standards, semantic HTML, keyboard focus, and screen reader compatibility.
- **`verify`**: Run frontend linter and production build (`npm run lint; npm run build`).

## Verification Plan

### Automated Tests
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `pytest tests/ -v`

### Manual & UI Verification
- Verify focus rings are clearly visible on tab key navigation.
- Verify screen reader accessibility attributes (`aria-label`, `aria-selected`, `role="tab"`).
- Verify dark/light mode visual contrast and layout symmetry.