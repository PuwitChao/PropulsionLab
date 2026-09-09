# Primary Reference Register

Verified for EA-05. Local reference PDFs remain in ignored scratch storage. They are not required to execute frozen comparisons.
The frozen numerical transcriptions and locators are in `REFERENCE_CASES.json`. PDF SHA-256 values identify the inspected editions.

| ID | Publication | Version and locator |
| --- | --- | --- |
| REF-NACA1135 | [NACA Report 1135: Equations, Tables, and Charts for Compressible Flow](https://www.nasa.gov/wp-content/uploads/2023/03/equations-tables-charts-compressibleflow-report-1135.pdf) | 1953. Table II, printed page 634, PDF page 23 |
| REF-US1976 | [U.S. Standard Atmosphere, 1976](https://www.ngdc.noaa.gov/stp/space-weather/online-publications/miscellaneous/us-standard-atmosphere-1976/us-standard-atmosphere_st76-1562_noaa.pdf) | NOAA-S/T 76-1562. Table I, printed pages 52, 56, 57, 62, 63; PDF pages 67, 71, 72, 77, 78 |
| REF-CEA8 | [NASA CEA RP-1311 Example 8](https://nasa.github.io/cea/examples/rocket/example8.html) | CEA documentation 3.3.4, retrieved 2026-09-07. Reactant definition and printed terminal output |
| REF-THRUST | [NASA rocket thrust equations](https://www.grc.nasa.gov/WWW/K-12/BGP/rktthsum.html) | Retrieved 2026-09-07. Thrust equation |
| REF-TSFC | [NASA specific fuel consumption](https://www.grc.nasa.gov/www/k-12/airplane/sfc.html) | Updated 2021-05-13. TSFC = fuel mass flow divided by thrust |
| REF-TAKEOFF | [Marchman, Aerodynamics and Aircraft Performance, Chapter 7](https://pressbooks.lib.vt.edu/aerodynamics/chapter/chapter-7-accelerated-performance-takeoff-and-landing/) | Third edition. Ground acceleration and separate takeoff segments |
| REF-RANGE | [Marchman, Aerodynamics and Aircraft Performance, Chapter 6](https://pressbooks.lib.vt.edu/aerodynamics/chapter/chapter-6-range-and-endurance/) | Third edition. Range and endurance; SFC units |
| REF-CONSTRAINTS | [Marchman, Aerodynamics and Aircraft Performance, Chapter 9](https://pressbooks.lib.vt.edu/aerodynamics/chapter/chapter-9-the-role-of-performance-in-aircraft-design-constraint-analysis/) | Third edition. Thrust-to-weight master constraint equation |

The NACA table page and standard-atmosphere table rows were visually inspected.
Atmosphere pressure values in millibars were multiplied by 100 to obtain pascals.
Temperature uses kelvins. Density uses kg/m3. NACA angles use degrees.
The NASA CEA example uses liquid H2 at 20.27 K and liquid O2 at 90.17 K. Its product-state outputs are not matched targets.

No reviewed numerical source is yet assigned to the thermal correlation constants, structural material model, generic maps, or diagnostic thresholds.
These gaps remain explicit in MODEL_REGISTRY.json. General textbook names in code comments are not evidence of calibration or validation.
