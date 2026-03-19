# Design System Document: Precision Monochromatism

## 1. Overview & Creative North Star
**The Creative North Star: The Academic Monolith**

This design system is engineered for the high-stakes environment of propulsion analysis. It rejects the "app-like" playfulness of modern SaaS in favor of a brutalist, academic precision. The aesthetic is inspired by mid-century laboratory equipment and high-end technical journals.

We break the "template" look through **Extreme Contrast** and **Intentional Void**. The UI is not a collection of boxes, but a structured data field. We use intentional asymmetry—weighting technical readouts to the left while maintaining expansive "breathing room" to the right—to guide the eye through complex datasets without cognitive overload. Every pixel must feel calculated; every line must serve a mathematical purpose.

---

## 2. Colors & Tonal Depth
The palette is strictly monochromatic, utilizing a "Deep Ink" foundation to allow white data points to pierce the interface with maximum legibility.

### Surface Hierarchy & Nesting
Depth is achieved through **Luminance Layering** rather than traditional drop shadows. 
- **Base Layer:** `surface` (#141313) for the primary application canvas.
- **Structural Sections:** `surface_container_low` (#1C1B1B) for sidebars or global navigation.
- **Active Workspaces:** `surface_container_highest` (#353434) for focused analysis modules.

### The "No-Line" Rule
Standard 1px solid borders are prohibited for sectioning. To separate high-level functional areas, use a background shift (e.g., a `surface_container_lowest` panel nested within a `surface` background). If a visual break is required, use a 1px `outline_variant` (#474747) at 20% opacity.

### The Glass & Glow Rule
To signify "active" or "floating" states (like modals or tooltips), employ **Technical Glassmorphism**:
- **Background:** `surface_bright` (#3A3939) at 60% opacity.
- **Backdrop Blur:** 12px to 20px.
- **Micro-Glow:** `box-shadow: 0 0 15px rgba(255, 255, 255, 0.08)`. This mimics the phosphor hum of high-precision lab monitors.

---

## 3. Typography
The typographic system relies on the tension between the humanist clarity of **Inter** and the rigid, tabular nature of **JetBrains Mono**.

| Level | Font | Case | Letter Spacing | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | Inter | Uppercase | 0.3em | High-level system headers (e.g., THRUST METRICS) |
| **Headline** | Inter | Uppercase | 0.2em | Module titles / Phase indicators |
| **Title** | Inter | Sentence | 0.05em | Section labels |
| **Body** | Inter | Sentence | Normal | Qualitative descriptions and documentation |
| **Label/Data**| JetBrains Mono | Tabular | Normal | All SI units, coordinates, and telemetry values |

**Editorial Note:** For headers, use `on_primary_fixed` (#FFFFFF). For secondary technical data, use `on_surface_variant` (#C6C6C6). Never use pure black text.

---

## 4. Elevation & Depth
In this system, elevation is a factor of **Tonal Shift**, not physical height.

*   **The Layering Principle:** Stacking follows a "Lower is Deeper" logic. The most important interactive card should sit on `surface_container_highest`, making it appear closer to the user.
*   **Ambient Shadows:** Traditional shadows are replaced by "Light Bleed." When an element must float, use a wide-spread (40px+) shadow using the `primary` token at 4% opacity to create a subtle ambient lift.
*   **The Ghost Border:** Use `outline_variant` (#474747) only for input fields and interactive boundaries. It must be a "Ghost Border"—appearing only when the user hovers or focuses on the element.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#FFFFFF) fill with `on_primary` (#1A1C1C) text. 0px corner radius. No gradients.
*   **Secondary:** `outline` (#919191) 1px border. JetBrains Mono font for a "technical" feel.
*   **States:** Hovering a primary button triggers a `0 0 10px rgba(255,255,255,0.4)` outer glow.

### Input Fields
*   **Structure:** No background fill. Only a bottom border of 1px `outline_variant`.
*   **Data Entry:** Use JetBrains Mono for all numeric inputs. 
*   **Error State:** Use `error` (#FFB4AB) for the bottom border and label only.

### Cards & Lists
*   **Card Separation:** Forbid divider lines. Use `spacing.8` (1.75rem) of vertical white space to separate data groups. 
*   **Nesting:** Place a `surface_container_lowest` (#0E0E0E) data table inside a `surface` (#141313) container to create a "recessed" laboratory look.

### Telemetry Strips (Custom Component)
*   A horizontal layout using `body-sm` JetBrains Mono. 
*   Format: `[PARAMETER_NAME] : [VALUE][SI_UNIT]`. 
*   Example: `CORE_TEMP : 1450.45 K`.

---

## 6. Do’s and Don’ts

### Do
*   **Strict SI Units:** Every numerical value must have an SI unit (K, Pa, N, m/s²).
*   **Sharp Corners:** Every element must have a `0px` radius. Roundness is forbidden as it suggests "consumer" software.
*   **Technical Icons:** Use only 1px stroke SVG icons. Ensure they are geometric and devoid of "friendly" curves.

### Don't
*   **No Dividers:** Never use a horizontal rule `<hr>` to separate content. Use background tonal shifts.
*   **No Emojis:** Information must be conveyed through typography and technical iconography only.
*   **No Transitions:** Interactions should be near-instant (100ms or less) or use "step" timing functions to mimic digital machinery.