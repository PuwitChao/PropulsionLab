# UI Design Specification: Propulsion Analysis Suite

## 1. Project Overview & Vision
The **Propulsion Analysis Suite** is a high-fidelity engineering tool designed for aerospace propulsion systems analysis (Gas Turbines, Rockets, and Mission Analysis). The interface must convey **authority, precision, and technical rigor**.

**Primary Goal**: Transform complex thermodynamic data into intuitive, actionable engineering insights while maintaining a "professional-grade" aesthetic suitable for an academic or corporate research environment.

---

## 2. Design Aesthetic: "The Monochromatic Lab"
The platform follows a **pure monochromatic, high-contrast, minimalist** design language.

- **Tone**: Formal, Academic, Precise.
- **Atmosphere**: Dark, focused, with subtle glassmorphism and glow effects.
- **Constraints**: 
    - **NO EMOJIS**. Use technical icons (e.g., SVG path-based) or text-only labels.
    - **NO GENERIC COLORS**. Avoid standard blue, red, or green. Use grayscale gradients and line-weights to convey meaning.
    - **SI UNITS ONLY**. All inputs and outputs must strictly adhere to the International System of Units.

---

## 3. Visual Identity & Tokens

### 3.1 Color Palette
| Token | Dark Mode (Default) | Light Mode |
| :--- | :--- | :--- |
| **Background** | `#020202` (Deep Black) | `#F8FAFC` (Slate Tint) |
| **Surface** | `#0D0D0D` (Near Black) | `#FFFFFF` |
| **Border** | `#1A1A1A` (Charcoal) | `#E2E8F0` |
| **Accent Primary** | `#FFFFFF` (White) | `#0F172A` (Deep Slate) |
| **Accent Dim** | `#A0A0A0` (Silver) | `#475569` |
| **Text Primary** | `#FFFFFF` | `#0F172A` |
| **Text Muted** | `#94A3B8` (Blue-tinted Gray) | `#64748B` |

### 3.2 Typography
- **Primary Font**: `Inter` (Sans-serif) for general UI, navigation, and body.
- **Technical/Data Font**: `JetBrains Mono` or `Consolas` for calculation traces, equations, and code-like data outputs.
- **Heading Styles**: Case-sensitive uppercase with increased letter spacing (`0.1em` to `0.3em`) for a premium "technical blueprint" feel.

---

## 4. Key Components & Layout

### 4.1 Global Navigation (Sidebar)
- **Width**: `240px` fixed (collapsible).
- **Style**: Minimalist. Active links use a thin left-border (`2px`) and subtle background glow. 
- **Logo**: Text-based, uppercase, spaced out (e.g., `P R O P U L S I O N`).

### 4.2 Data Visualization (Plotly Integration)
- **Background**: Transparent or matching `--surface-color`.
- **Grid Lines**: Very subtle (`#1A1A1A`).
- **Trace Colors**: Primarily white, light gray, and dashed/dotted lines for differentiation.

### 4.3 Input Systems
- **Fields**: High-contrast borders, monochromatic focus states.
- **Sliders**: Custom-styled for precision. No bubbly/rounded handles; use sharp blocks or thin lines.
- **Labels**: Small, uppercase, bolded (`font-size: 0.75rem`).

### 4.4 Analytical Metrics (MetricCards)
- **Layout**: Large bold values (`font-size: 1.75rem`).
- **Units**: Display units next to values in a muted silver (`#94A3B8`).
- **Growth/Delta**: Indicate changes between baseline and current sweep using subtle +/- indicators, but maintain the grayscale palette.

---

## 5. Interactions & Motion
- **Entry Animations**: Subtle `translateY` and `opacity` fades for cards.
- **Hover Effects**: Borders should transition to `--accent-dim` or white. Add a micro-glow (`box-shadow: 0 0 15px rgba(255,255,255,0.08)`).
- **Loading State**: A minimal progress bar (`2px` height) or a "pulsing" text overlay (`ANALYZING...`).

---

## 6. Page-Specific Requirements

### 6.1 Rocket Analysis
- **3D Visualization**: A surface plot of the nozzle contour (MoC) that follows the monochromatic theme.
- **Export UI**: Clean buttons for "Export STL" or "Download CSV".

### 6.2 Gas Turbine Cycle
- **Station Diagram**: A schematic of the engine stations (S0 to S9) that updates based on selection (Turbojet vs Turbofan). Lines should be thin (`1px`) and white.

### 6.3 Calculation Traces
- A "How was this calculated?" section for every metric.
- Uses **LaTeX** (MathJax/KaTeX) formatting.
- Encased in a code-block style surface using `JetBrains Mono`.

---

## 7. Designer Checklist
- [ ] Is it strictly monochromatic? (Grayscale + white)
- [ ] Are all emojis removed?
- [ ] Is the tone formal/academic?
- [ ] Is the layout responsive for widescreen workstations?
- [ ] Are headings uppercase and spaced out?
- [ ] Do input fields look like precision instruments?
- [ ] Is `JetBrains Mono` used for all mathematical/technical data?
- [ ] Does the design feel "Premium" and "Expert-level"?
