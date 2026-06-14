## Prerequisites:
- install [Vulkan SDK](https://vulkan.lunarg.com/sdk/home)

## Build and Run

Configure and build the project with the configured preset:

```sh
cmake --preset=vcpkg
cmake --build --preset=vcpkg
```

Run the full test suite:

```sh
ctest --preset=vcpkg --output-on-failure
```

Render the default kinematics scene:

```sh
./build/visual_physics_vulkan
```

List the available kinematics scenario ids:

```sh
./build/visual_physics_vulkan --list-scenarios
```

List the available dynamics scenario ids:

```sh
./build/visual_physics_vulkan --domain dynamics --list-scenarios
```

List the available statics scenario ids:

```sh
./build/visual_physics_vulkan --domain statics --list-scenarios
```

List the available Electromagnetism scenario ids:

```sh
./build/visual_physics_vulkan --domain electromagnetism --list-scenarios
```

List the available Computational Physics scenario ids:

```sh
./build/visual_physics_vulkan --domain computational-physics --list-scenarios
```

List the available Fluid Mechanics scenario ids:

```sh
./build/visual_physics_vulkan --domain fluid-mechanics --list-scenarios
```

List the available Quantum scenario ids:

```sh
./build/visual_physics_vulkan --domain quantum --list-scenarios
```

Render a selected kinematics scenario to a specific image path:

```sh
./build/visual_physics_vulkan --scenario relative-motion --time 3.0 --output build/phase2-relative-motion.ppm
```

Render a selected dynamics scenario to a specific image path:

```sh
./build/visual_physics_vulkan \
	--domain dynamics \
	--scenario orbital-motion \
	--time 1.2 \
	--output build/phase4-orbital-motion.ppm
```

Render a selected statics scenario to a specific image path:

```sh
./build/visual_physics_vulkan \
	--domain statics \
	--scenario beam-support \
	--load-position 7 \
	--load-magnitude 15 \
	--output build/phase6-beam-support.ppm
```

Render a selected Electromagnetism scenario to a specific image path:

```sh
./build/visual_physics_vulkan \
	--domain electromagnetism \
	--scenario capacitor-potential-field \
	--probe-point-x 0.6 \
	--probe-point-y -0.4 \
	--plate-separation 3.0 \
	--potential-difference 18 \
	--output build/phase8-capacitor.ppm
```

Render the current Computational Physics projectile solver-comparison slice:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--scenario projectile-solver-comparison \
	--comparison-step-seconds 0.2 \
	--reference-step-seconds 0.01 \
	--output build/phase10-projectile.ppm
```

Render the current Computational Physics orbital solver-comparison slice:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--scenario orbital-solver-comparison \
	--orbital-center-x 0 \
	--orbital-center-y 0 \
	--gravitational-parameter 20 \
	--comparison-step-seconds 0.2 \
	--reference-step-seconds 0.01 \
	--output build/phase10-orbital.ppm
```

Render the current Computational Physics spring oscillator slice:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--scenario spring-oscillator-comparison \
	--spring-anchor-x 0 \
	--spring-anchor-y 0 \
	--spring-constant 4.2 \
	--damping-coefficient 0.08 \
	--comparison-step-seconds 0.2 \
	--reference-step-seconds 0.01 \
	--output build/phase10-spring.ppm
```

Render the completed Fluid Mechanics buoyancy slice:

```sh
./build/visual_physics_vulkan \
	--domain fluid-mechanics \
	--scenario buoyancy-block \
	--time 0.5 \
	--output build/phase14-buoyancy.ppm
```

Render the completed Fluid Mechanics Poiseuille slice:

```sh
./build/visual_physics_vulkan \
	--domain fluid-mechanics \
	--scenario poiseuille-pipe \
	--time 0.0 \
	--output build/phase14-poiseuille.ppm
```

Render the completed Fluid Mechanics open-channel slice:

```sh
./build/visual_physics_vulkan \
	--domain fluid-mechanics \
	--scenario open-channel-flow \
	--time 0.0 \
	--output build/phase14-open-channel.ppm
```

Render a Quantum particle-in-a-box slice and export both JSON state plus the report CSV:

```sh
./build/visual_physics_vulkan \
	--domain quantum \
	--scenario particle-in-a-box \
	--time 0.25 \
	--roundtrip-check \
	--export-state build/phase20-quantum-box.json \
	--export-quantum-report-csv build/phase20-quantum-box-report.csv \
	--output build/phase20-quantum-box.ppm
```

Render a kinematics scene from an Angular-compatible exported payload:

```sh
./build/visual_physics_vulkan --import path/to/kinematics-state.json --output build/phase2-imported.ppm
```

Render a dynamics scene from an Angular-compatible exported payload:

```sh
./build/visual_physics_vulkan \
	--domain dynamics \
	--import path/to/dynamics-state.json \
	--output build/phase4-imported.ppm
```

Render a statics scene from an Angular-compatible exported payload:

```sh
./build/visual_physics_vulkan \
	--domain statics \
	--import path/to/statics-state.json \
	--output build/phase6-imported.ppm
```

Render an Electromagnetism scene from an Angular-compatible exported payload:

```sh
./build/visual_physics_vulkan \
	--domain electromagnetism \
	--import path/to/electromagnetism-state.json \
	--time 2.25 \
	--output build/phase8-imported.ppm
```

Render a Computational Physics scene from an exported payload:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--import path/to/computational-physics-state.json \
	--time 1.5 \
	--output build/phase10-imported.ppm
```

Render a Fluid Mechanics scene from an exported payload:

```sh
./build/visual_physics_vulkan \
	--domain fluid-mechanics \
	--import path/to/fluid-mechanics-state.json \
	--output build/phase14-imported.ppm
```

Export the current kinematics scenario state using the same JSON payload shape:

```sh
./build/visual_physics_vulkan \
	--scenario relative-motion \
	--time 3.0 \
	--export-state build/phase2-relative-motion.json \
	--output build/phase2-relative-motion.ppm
```

Export the current dynamics scenario state using the same JSON payload shape:

```sh
./build/visual_physics_vulkan \
	--domain dynamics \
	--scenario spring-oscillator \
	--time 1.0 \
	--export-state build/phase4-spring-oscillator.json \
	--output build/phase4-spring-oscillator.ppm
```

Export the current statics scenario state using the same JSON payload shape:

```sh
./build/visual_physics_vulkan \
	--domain statics \
	--scenario inclined-plane \
	--mass 2 \
	--angle-degrees 30 \
	--friction-coefficient 0.7 \
	--export-state build/phase6-inclined-plane.json \
	--output build/phase6-inclined-plane.ppm
```

Export the current Electromagnetism scenario state using the same JSON payload shape:

```sh
./build/visual_physics_vulkan \
	--domain electromagnetism \
	--scenario current-loop-magnetic-field \
	--current 5 \
	--loop-radius 2.1 \
	--probe-point-y 1.6 \
	--show-potential-guides false \
	--export-state build/phase8-current-loop.json \
	--output build/phase8-current-loop.ppm
```

Export the current Computational Physics scenario state using the same JSON payload shape:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--scenario projectile-solver-comparison \
	--initial-velocity-x 8.5 \
	--initial-velocity-y 11.0 \
	--drag-coefficient 0.45 \
	--comparison-step-seconds 0.2 \
	--reference-step-seconds 0.01 \
	--export-state build/phase10-projectile.json \
	--output build/phase10-projectile.ppm
```

Export the current Fluid Mechanics scenario state using the same JSON payload shape:

```sh
./build/visual_physics_vulkan \
	--domain fluid-mechanics \
	--scenario open-channel-flow \
	--time 0.0 \
	--roundtrip-check \
	--export-state build/phase14-open-channel.json \
	--output build/phase14-open-channel.ppm
```

The completed Fluid Mechanics domain currently supports these validated scenarios:

- `buoyancy-block`
- `poiseuille-pipe`
- `open-channel-flow`

The shared export/import path preserves scenario metadata, overlay flags, snapshots, and scenario-specific samples for all three slices. The current report module also emits summary-first CSV rows for buoyancy, Poiseuille pipe flow, and open-channel flow diagnostics.

Phase 20 currently exposes three Quantum scenarios:

- `particle-in-a-box` renders the bound-state probability density, node structure, and quantized energy level for a 1D rigid well.
- `finite-potential-well-tunneling` renders the barrier-decay envelope plus transmission and reflection diagnostics for a finite rectangular barrier.
- `double-slit-interference` renders the screen-intensity pattern, fringe spacing, and diffraction-envelope width for two coherent slits.
- Supported Quantum CLI overrides are `--box-length-nanometers`, `--quantum-number`, `--particle-energy-ev`, `--barrier-height-ev`, `--barrier-width-nanometers`, `--wavelength-nanometers`, `--slit-separation-micrometers`, `--slit-width-micrometers`, and `--screen-distance-meters`.
- Supported Quantum overlay flags are `--show-probability-guide`, `--show-potential-guide`, and `--show-phase-guide`.
- Supported Quantum report-export flag is `--export-quantum-report-csv`.
- Exported Quantum payloads preserve scenario metadata, overlay flags, snapshots, and scenario-specific samples for all three scenarios.
- When `--export-quantum-report-csv` is provided, the executable also prints a compact Quantum report summary to stdout using the same validated report rows that are written to the CSV file.

Export the current Computational Physics orbital scenario state using the same JSON payload shape:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--scenario orbital-solver-comparison \
	--orbital-center-x 0 \
	--orbital-center-y 0 \
	--gravitational-parameter 20 \
	--comparison-step-seconds 0.2 \
	--reference-step-seconds 0.01 \
	--roundtrip-check \
	--export-state build/phase10-orbital.json \
	--output build/phase10-orbital.ppm
```

Export the current Computational Physics spring scenario state using the same JSON payload shape:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--scenario spring-oscillator-comparison \
	--spring-anchor-x 0 \
	--spring-anchor-y 0 \
	--spring-constant 4.2 \
	--damping-coefficient 0.08 \
	--comparison-step-seconds 0.2 \
	--reference-step-seconds 0.01 \
	--roundtrip-check \
	--export-state build/phase10-spring.json \
	--output build/phase10-spring.ppm
```

Customize render dimensions and sample density at runtime:

```sh
./build/visual_physics_vulkan \
	--scenario relative-motion \
	--time 3.0 \
	--width 640 \
	--height 360 \
	--sample-count 12 \
	--export-state build/phase2-relative-motion-640x360.json \
	--output build/phase2-relative-motion-640x360.ppm
```

Verify export/import roundtrip stability for the current scenario state:

```sh
./build/visual_physics_vulkan \
	--scenario relative-motion \
	--time 3.0 \
	--sample-count 12 \
	--roundtrip-check \
	--export-state build/phase2-roundtrip.json \
	--output build/phase2-roundtrip.ppm
```

Verify export/import roundtrip stability for a dynamics scenario:

```sh
./build/visual_physics_vulkan \
	--domain dynamics \
	--scenario constant-force \
	--time 2.0 \
	--roundtrip-check \
	--export-state build/phase4-roundtrip.json \
	--output build/phase4-roundtrip.ppm
```

Verify export/import roundtrip stability for a statics scenario:

```sh
./build/visual_physics_vulkan \
	--domain statics \
	--scenario pulley-equilibrium \
	--mass 1.0 \
	--secondary-mass 1.5 \
	--roundtrip-check \
	--export-state build/phase6-roundtrip.json \
	--output build/phase6-roundtrip.ppm
```

Verify export/import roundtrip stability for an Electromagnetism scenario:

```sh
./build/visual_physics_vulkan \
	--domain electromagnetism \
	--scenario capacitor-potential-field \
	--probe-point-x 0.6 \
	--probe-point-y -0.4 \
	--plate-separation 3.0 \
	--potential-difference 18 \
	--roundtrip-check \
	--export-state build/phase8-roundtrip.json \
	--output build/phase8-roundtrip.ppm
```

Verify export/import roundtrip stability for a Computational Physics scenario:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--scenario projectile-solver-comparison \
	--comparison-step-seconds 0.2 \
	--reference-step-seconds 0.01 \
	--roundtrip-check \
	--export-state build/phase10-roundtrip.json \
	--output build/phase10-roundtrip.ppm
```

Phase 10 currently exposes three Computational Physics scenarios:

- `projectile-solver-comparison` compares Euler, symplectic, and RK4 trajectories against a high-resolution RK4 reference for a drag projectile.
- `orbital-solver-comparison` compares the same solvers against a high-resolution RK4 orbit and exports orbital specific-energy plus angular-momentum drift diagnostics.
- `spring-oscillator-comparison` compares the same solvers against a high-resolution RK4 oscillator and exports spring total-energy, displacement-magnitude, and wrapped phase-angle drift diagnostics.
- Supported Computational Physics CLI overrides are `--initial-position-x`, `--initial-position-y`, `--initial-velocity-x`, `--initial-velocity-y`, `--gravity-x`, `--gravity-y`, `--mass`, `--drag-coefficient`, `--orbital-center-x`, `--orbital-center-y`, `--gravitational-parameter`, `--spring-anchor-x`, `--spring-anchor-y`, `--spring-constant`, `--damping-coefficient`, `--comparison-step-seconds`, and `--reference-step-seconds`.
- Supported Computational Physics overlay flags are `--show-reference-trajectory`, `--show-euler-trajectory`, `--show-symplectic-trajectory`, `--show-rk4-trajectory`, and `--show-error-bars`.
- Supported Computational Physics report-export flags are `--export-convergence-csv`, `--export-orbital-invariant-csv`, and `--export-spring-invariant-csv`.
- Exported Computational Physics payloads now also include `orbitalInvariantHistory` for orbital runs and `springInvariantHistory` for spring runs, so long-horizon drift series are preserved alongside `snapshot`, `samples`, and `convergenceStudy`.
- Exported Computational Physics payloads also include Angular-style `solverRecommendation`, `solverRecommendationRanking`, `observedOrders`, and `convergencePlotGuides` metadata derived from the convergence study, so downstream consumers can reuse solver-selection, tolerance-band, and observed-order diagnostics without recomputing them.
- The core library now also exposes `build_convergence_csv(...)`, `build_invariant_history_csv(...)`, and `build_spring_invariant_history_csv(...)` in the Computational Physics report module, so the same validated diagnostics can be emitted as Angular-style CSV artifacts without re-deriving recommendations or drift histories in downstream tools.
- The completed Phase 10 Vulkan scope covers scenario rendering, JSON roundtrip import/export, Angular-aligned convergence metadata, invariant-history payloads, reusable CSV report builders, and direct CLI CSV export for the Computational Physics scenarios.
- Scenario-specific validation rejects orbital-only and spring-only flags on `projectile-solver-comparison`, projectile-only and spring-only flags on `orbital-solver-comparison`, and projectile-only plus orbital-only flags on `spring-oscillator-comparison`.

Example: export orbital JSON plus convergence and invariant CSV artifacts in one run:

```sh
./build/visual_physics_vulkan \
	--domain computational-physics \
	--scenario orbital-solver-comparison \
	--orbital-center-x 0 \
	--orbital-center-y 0 \
	--gravitational-parameter 20 \
	--comparison-step-seconds 0.2 \
	--reference-step-seconds 0.01 \
	--export-state build/phase10-orbital.json \
	--export-convergence-csv build/phase10-orbital-convergence.csv \
	--export-orbital-invariant-csv build/phase10-orbital-invariants.csv \
	--output build/phase10-orbital.ppm
```

Override editable kinematics parameters from the CLI:

```sh
./build/visual_physics_vulkan \
	--scenario projectile \
	--time 1.5 \
	--initial-velocity-y 12 \
	--acceleration-y -8 \
	--output build/phase2-projectile-overrides.ppm
```

Override editable dynamics parameters from the CLI:

```sh
./build/visual_physics_vulkan \
	--domain dynamics \
	--scenario constant-force \
	--time 2.0 \
	--mass 4 \
	--net-force-x 8 \
	--net-force-y 2 \
	--output build/phase4-constant-force-overrides.ppm
```

Toggle dynamics overlay visibility directly from the CLI:

```sh
./build/visual_physics_vulkan \
	--domain dynamics \
	--scenario spring-oscillator \
	--time 1.0 \
	--show-momentum-vector false \
	--show-velocity-vector false \
	--show-force-vector false \
	--show-scenario-guides false \
	--export-state build/phase4-overlays-off.json \
	--output build/phase4-overlays-off.ppm
```

Toggle statics overlay visibility directly from the CLI:

```sh
./build/visual_physics_vulkan \
	--domain statics \
	--scenario pulley-equilibrium \
	--show-applied-force false \
	--show-reaction-forces false \
	--show-residual-guides false \
	--export-state build/phase6-overlays-off.json \
	--output build/phase6-overlays-off.ppm
```

Toggle Electromagnetism overlay visibility directly from the CLI:

```sh
./build/visual_physics_vulkan \
	--domain electromagnetism \
	--scenario electromagnetic-induction \
	--time 2.25 \
	--show-magnetic-field true \
	--show-force-vectors false \
	--show-potential-guides true \
	--export-state build/phase8-induction-overlays.json \
	--output build/phase8-induction-overlays.ppm
```

Electromagnetism CLI override matrix:

- `point-charge-electrostatics`: `--source-point-x/y`, `--secondary-source-point-x/y`, `--probe-point-x/y`, `--charge-magnitude`, `--secondary-charge-magnitude`, `--show-field-vectors`, `--show-force-vectors`, `--show-potential-guides`
- `moving-charge-magnetic-field`: `--initial-position-x/y`, `--initial-velocity-x/y`, `--charge-magnitude`, `--mass`, `--magnetic-field-strength`, `--show-magnetic-field`, `--show-force-vectors`, `--show-trajectory`
- `current-loop-magnetic-field`: `--probe-point-x/y`, `--current`, `--loop-radius`, `--show-magnetic-field`, `--show-potential-guides`
- `capacitor-potential-field`: `--initial-position-x/y`, `--probe-point-x/y`, `--plate-separation`, `--potential-difference`, `--show-field-vectors`, `--show-force-vectors`, `--show-potential-guides`
- `electromagnetic-induction`: `--probe-point-x/y`, `--flux-rate`, `--inductance`, `--show-magnetic-field`, `--show-force-vectors`, `--show-potential-guides`

Invalid Electromagnetism overrides are rejected explicitly when a flag does not apply to the selected scenario, including overlay flags.
	--domain statics \
	--scenario pulley-equilibrium \
	--show-applied-force false \
	--show-reaction-forces false \
	--show-residual-guides false \
	--export-state build/phase6-overlays-off.json \
	--output build/phase6-overlays-off.ppm
```

The executable prints the resolved Dynamics overlay state in stdout, for example:

```text
Dynamics overlays: momentum=off, velocity=off, force=off, guides=off
```

The executable prints the resolved Statics overlay state in stdout, for example:

```text
Statics overlays: appliedForce=off, reactions=off, residualGuides=off
```

Visible statics overlay guides also render endpoint markers in the offscreen output so applied, reaction, and residual directions are easier to read in headless renders.

The executable also prints a statics equilibrium summary, for example:

```text
Statics equilibrium: stable=yes, residualForce=(0.00, 0.00), residualTorque=0.00, primaryReaction=(0.00, 3.75), secondaryReaction=(0.00, 11.25)
```

Kinematics-only override flags:

- `--import`
- `--export-state`
- `--width`
- `--height`
- `--sample-count`
- `--roundtrip-check`
- `--initial-position-x`
- `--initial-position-y`
- `--initial-velocity-x`
- `--initial-velocity-y`
- `--acceleration-x`
- `--acceleration-y`
- `--observer-velocity-x`
- `--observer-velocity-y`
- `--radius`
- `--angular-speed`

Dynamics-only override flags:

- `--mass`
- `--net-force-x`
- `--net-force-y`
- `--gravity-x`
- `--gravity-y`
- `--drag-coefficient`
- `--spring-anchor-x`
- `--spring-anchor-y`
- `--spring-constant`
- `--damping-coefficient`
- `--orbital-center-x`
- `--orbital-center-y`
- `--gravitational-parameter`
- `--restitution-coefficient`
- `--show-momentum-vector`
- `--show-velocity-vector`
- `--show-force-vector`
- `--show-scenario-guides`

Statics-only override flags:

- `--secondary-mass`
- `--angle-degrees`
- `--friction-coefficient`
- `--load-position`
- `--load-magnitude`
- `--show-applied-force`
- `--show-reaction-forces`
- `--show-residual-guides`

CLI validation rules:

- `--domain dynamics` rejects kinematics-only override flags.
- `--domain kinematics` rejects dynamics-only override flags.
- `--domain statics` rejects kinematics-only and dynamics-only override flags.
- Statics scenario overrides are scenario-specific:
- `beam-support` accepts `--load-position` and `--load-magnitude`, and rejects `--mass`, `--secondary-mass`, `--angle-degrees`, and `--friction-coefficient`.
- `inclined-plane` accepts `--mass`, `--angle-degrees`, and `--friction-coefficient`, and rejects `--secondary-mass`, `--load-position`, and `--load-magnitude`.
- `pulley-equilibrium` accepts `--mass` and `--secondary-mass`, and rejects `--angle-degrees`, `--friction-coefficient`, `--load-position`, and `--load-magnitude`.
- When `--import` is used with `--domain statics`, these same scenario-specific override rules are validated against the imported scenario id.
- `--scenario` cannot be combined with `--import`.

List the available Astrophysics scenario ids:

```sh
./build/visual_physics_vulkan --domain astrophysics --list-scenarios
```

Render a planetary Astrophysics slice, export the Angular-compatible JSON payload, and also write the summary-first report CSV:

```sh
./build/visual_physics_vulkan \
	--domain astrophysics \
	--scenario planetary-orbit \
	--time 0.35 \
	--central-mass-solar-masses 1.4 \
	--orbital-radius-astronomical-units 1.8 \
	--orbital-eccentricity 0.2 \
	--show-reference-guides true \
	--show-comparison-band true \
	--show-active-marker false \
	--roundtrip-check \
	--export-state build/phase26-planetary-orbit.json \
	--export-astrophysics-report-csv build/phase26-planetary-orbit-report.csv \
	--output build/phase26-planetary-orbit.ppm
```

Render an imported Astrophysics Hubble payload, override the imported scenario fields from the CLI, and export both the resolved state plus report CSV:

```sh
./build/visual_physics_vulkan \
	--domain astrophysics \
	--import path/to/astrophysics-hubble-state.json \
	--distance-megaparsecs 900 \
	--hubble-constant-kilometers-per-second-per-megaparsec 74 \
	--time 0.8 \
	--show-reference-guides false \
	--show-active-marker true \
	--show-comparison-band true \
	--export-state build/phase26-hubble-imported.json \
	--export-astrophysics-report-csv build/phase26-hubble-imported-report.csv \
	--output build/phase26-hubble-imported.ppm
```

Example: scenario-incompatible Astrophysics flags fail explicitly instead of being silently accepted:

```sh
./build/visual_physics_vulkan \
	--domain astrophysics \
	--scenario planetary-orbit \
	--stellar-mass-solar-masses 2.0 \
	--output build/phase26-invalid.ppm
```

Expected stderr message:

```text
--stellar-mass-solar-masses cannot be used with astrophysics scenario planetary-orbit
```

The completed Phase 26 Astrophysics scope exposes three Astrophysics scenarios:

- `planetary-orbit` renders deterministic sampled orbit geometry and reports orbital period, orbital speed, and escape-speed diagnostics.
- `stellar-luminosity` renders the irradiance profile and reports luminosity plus habitable-zone distance estimates.
- `hubble-expansion` renders the Hubble-law comparison curve and reports distance, recession velocity, and approximate redshift.

Astrophysics CLI override matrix:

- `planetary-orbit`: `--central-mass-solar-masses`, `--orbital-radius-astronomical-units`, `--orbital-eccentricity`
- `stellar-luminosity`: `--stellar-mass-solar-masses`, `--stellar-radius-solar-radii`, `--surface-temperature-kelvin`
- `hubble-expansion`: `--distance-megaparsecs`, `--hubble-constant-kilometers-per-second-per-megaparsec`

Supported Astrophysics overlay flags:

- `--show-reference-guides`
- `--show-active-marker`
- `--show-comparison-band`

Supported Astrophysics report-export flag:

- `--export-astrophysics-report-csv`

Astrophysics validation rules:

- Astrophysics-specific overrides are scenario-aware and reject flags from the other Astrophysics scenarios.
- When `--import` is used with `--domain astrophysics`, those same scenario-specific override rules are validated against the imported scenario id before rendering and export.
- The executable prints compact Astrophysics stdout summaries for the active scenario and, when `--export-astrophysics-report-csv` is provided, also prints the validated report-summary rows that were written to the CSV file.

List the available Atmospheric Physics scenario ids:

```sh
./build/visual_physics_vulkan --domain atmospheric-physics --list-scenarios
```

Render an adiabatic Atmospheric slice, export the Angular-compatible JSON payload, and also write the summary-first report CSV:

```sh
./build/visual_physics_vulkan \
	--domain atmospheric-physics \
	--scenario adiabatic-lapse-rate \
	--time 0.40 \
	--surface-temperature-kelvin 301 \
	--lapse-rate-kelvin-per-kilometer 8.1 \
	--tropopause-height-kilometers 13.2 \
	--show-reference-guides false \
	--show-comparison-band true \
	--show-active-marker true \
	--roundtrip-check \
	--export-state build/phase28-adiabatic-lapse-rate.json \
	--export-atmospheric-report-csv build/phase28-adiabatic-lapse-rate-report.csv \
	--output build/phase28-adiabatic-lapse-rate.ppm
```

Render an imported barometric Atmospheric payload, override the imported scenario fields from the CLI, and export the resolved state:

```sh
./build/visual_physics_vulkan \
	--domain atmospheric-physics \
	--import path/to/atmospheric-barometric-state.json \
	--time 0.75 \
	--sea-level-pressure-kilopascals 103.2 \
	--scale-height-kilometers 8.6 \
	--show-reference-guides true \
	--show-comparison-band true \
	--show-active-marker false \
	--export-state build/phase28-barometric-imported.json \
	--output build/phase28-barometric-imported.ppm
```

Render an imported adiabatic Atmospheric payload, validate the roundtrip, and also export the summary-first report CSV:

```sh
./build/visual_physics_vulkan \
	--domain atmospheric-physics \
	--import path/to/atmospheric-adiabatic-state.json \
	--time 0.70 \
	--surface-temperature-kelvin 301.5 \
	--lapse-rate-kelvin-per-kilometer 8.2 \
	--tropopause-height-kilometers 13.4 \
	--show-reference-guides true \
	--show-comparison-band true \
	--show-active-marker false \
	--roundtrip-check \
	--export-state build/phase28-adiabatic-imported.json \
	--export-atmospheric-report-csv build/phase28-adiabatic-imported-report.csv \
	--output build/phase28-adiabatic-imported.ppm
```

Example: scenario-incompatible Atmospheric flags fail explicitly instead of being silently accepted:

```sh
./build/visual_physics_vulkan \
	--domain atmospheric-physics \
	--scenario barometric-formula \
	--parcel-temperature-excess-kelvin 4.0 \
	--output build/phase28-invalid.ppm
```

Expected stderr message:

```text
--parcel-temperature-excess-kelvin cannot be used with atmospheric scenario barometric-formula
```

The current Phase 28 Atmospheric scope exposes three Atmospheric scenarios:

- `barometric-formula` renders a hydrostatic pressure profile and reports active-altitude pressure plus relative-density diagnostics.
- `adiabatic-lapse-rate` renders the dry-lapse temperature profile with a comparison reference curve and reports active-altitude temperature diagnostics.
- `convection-column` renders the parcel updraft profile and reports parcel altitude, buoyancy, updraft velocity, and CAPE-style diagnostics.

Atmospheric CLI override matrix:

- `barometric-formula`: `--sea-level-pressure-kilopascals`, `--scale-height-kilometers`
- `adiabatic-lapse-rate`: `--surface-temperature-kelvin`, `--lapse-rate-kelvin-per-kilometer`, `--tropopause-height-kilometers`
- `convection-column`: `--surface-temperature-kelvin`, `--environmental-lapse-rate-kelvin-per-kilometer`, `--parcel-temperature-excess-kelvin`, `--column-height-kilometers`

Supported Atmospheric overlay flags:

- `--show-reference-guides`
- `--show-active-marker`
- `--show-comparison-band`

Supported Atmospheric report-export flag:

- `--export-atmospheric-report-csv`

Atmospheric validation rules:

- Atmospheric-specific overrides are scenario-aware and reject flags from the other Atmospheric scenarios.
- When `--import` is used with `--domain atmospheric-physics`, those same scenario-specific override rules are validated against the imported scenario id before rendering and export.
- `--scenario` cannot be combined with `--import`.
- The executable prints compact Atmospheric stdout summaries for the active scenario and, when `--export-atmospheric-report-csv` is provided, also prints the validated report-summary rows that were written to the CSV file.
- The validated CLI surface now covers direct and imported render or export or report flows, scenario-specific overrides, explicit invalid-flag rejection, and roundtrip verification for all three Atmospheric scenarios.

List the available Solid State Physics scenario ids:

```sh
./build/visual_physics_vulkan --domain solid-state-physics --list-scenarios
```

Render an electronic Solid State slice, export the Angular-compatible JSON payload, and also write the summary-first report CSV:

```sh
./build/visual_physics_vulkan \
	--domain solid-state-physics \
	--scenario electronic-structure \
	--time 0.60 \
	--show-reference-guides true \
	--show-comparison-band true \
	--show-active-marker false \
	--roundtrip-check \
	--export-state build/phase30-electronic-structure.json \
	--export-solid-state-report-csv build/phase30-electronic-structure-report.csv \
	--output build/phase30-electronic-structure.ppm
```

Render an imported crystal-elasticity Solid State payload, override the imported time and overlays from the CLI, and export the resolved state plus report CSV:

```sh
./build/visual_physics_vulkan \
	--domain solid-state-physics \
	--import path/to/solid-state-crystal-state.json \
	--time 0.65 \
	--show-reference-guides true \
	--show-comparison-band true \
	--show-active-marker false \
	--roundtrip-check \
	--export-state build/phase30-crystal-imported.json \
	--export-solid-state-report-csv build/phase30-crystal-imported-report.csv \
	--output build/phase30-crystal-imported.ppm
```

Example: Solid State report export is rejected outside the Solid State domain:

```sh
./build/visual_physics_vulkan \
	--domain kinematics \
	--export-solid-state-report-csv build/phase30-invalid-solid-state-report.csv \
	--output build/phase30-invalid.ppm
```

Expected stderr message:

```text
Solid State report CSV export flag can only be used with --domain solid-state-physics
```

The current Phase 30 Solid State scope exposes three Solid State scenarios:

- `crystal-elasticity` renders a stress-strain profile and reports active strain, stress, and elastic-energy density diagnostics.
- `phonon-dispersion` renders an acoustic dispersion profile and reports active wave-vector, frequency, and group-velocity diagnostics.
- `electronic-structure` renders an electronic density-of-states profile and reports active carrier energy, density-of-states, and occupation diagnostics.

Solid State CLI override matrix:

- `crystal-elasticity`: `--max-strain-percent`, `--youngs-modulus-gigapascals`, `--yield-strength-megapascals`
- `phonon-dispersion`: `--lattice-spacing-nanometers`, `--spring-constant-newtons-per-meter`, `--atomic-mass-amu`
- `electronic-structure`: `--band-gap-electron-volts`, `--effective-mass-ratio`, `--dopant-density-per-cubic-centimeter`

Supported Solid State overlay flags:

- `--show-reference-guides`
- `--show-active-marker`
- `--show-comparison-band`

Supported Solid State report-export flag:

- `--export-solid-state-report-csv`

Solid State validation rules:

- Solid State render or export or report flow supports both direct `--scenario` execution and imported payload execution.
- When `--import` is used with `--domain solid-state-physics`, CLI time, overlay, and scenario-specific numeric override flags are applied to the imported Solid State payload before rendering and export.
- `--scenario` cannot be combined with `--import`.
- Solid State-specific numeric overrides are scenario-aware and reject flags from the other Solid State scenarios.
- The executable prints compact Solid State stdout summaries for the active scenario and, when `--export-solid-state-report-csv` is provided, also prints the validated report-summary rows that were written to the CSV file.
- `--export-solid-state-report-csv` is rejected for non-Solid-State domains.

List the available Plasma Physics scenario ids:

```sh
./build/visual_physics_vulkan --domain plasma-physics --list-scenarios
```

Render a Debye Plasma slice, export the Angular-compatible JSON payload, and also write the summary-first report CSV:

```sh
./build/visual_physics_vulkan \
	--domain plasma-physics \
	--scenario debye-screening \
	--time 0.45 \
	--electron-density-per-cubic-meter 2.1e18 \
	--electron-temperature-electron-volts 10.5 \
	--probe-potential-volts 21.0 \
	--show-reference-guides true \
	--show-comparison-band true \
	--show-active-marker false \
	--roundtrip-check \
	--export-state build/phase34-debye-screening.json \
	--export-plasma-report-csv build/phase34-debye-screening-report.csv \
	--output build/phase34-debye-screening.ppm
```

Render an imported oscillation Plasma payload, override the imported scenario fields from the CLI, and export the resolved state plus report CSV:

```sh
./build/visual_physics_vulkan \
	--domain plasma-physics \
	--import path/to/plasma-oscillation-state.json \
	--time 0.70 \
	--electron-density-per-cubic-meter 4.1e18 \
	--electron-temperature-electron-volts 7.4 \
	--perturbation-amplitude-percent 15.0 \
	--show-reference-guides false \
	--show-comparison-band true \
	--show-active-marker true \
	--roundtrip-check \
	--export-state build/phase34-oscillation-imported.json \
	--export-plasma-report-csv build/phase34-oscillation-imported-report.csv \
	--output build/phase34-oscillation-imported.ppm
```

Example: scenario-incompatible Plasma flags fail explicitly instead of being silently accepted:

```sh
./build/visual_physics_vulkan \
	--domain plasma-physics \
	--scenario magnetic-confinement \
	--probe-potential-volts 24.0 \
	--output build/phase34-invalid.ppm
```

Expected stderr message:

```text
--probe-potential-volts cannot be used with plasma-physics scenario magnetic-confinement
```

The current Phase 34 Plasma scope exposes three Plasma scenarios:

- `plasma-oscillation` renders a density-perturbation profile and reports plasma frequency, oscillation period, and restoring-field diagnostics.
- `debye-screening` renders the screening curve and reports Debye length, shielding fraction, and screened-potential diagnostics.
- `magnetic-confinement` renders the confinement profile and reports Larmor radius, beta percentage, and safety-factor diagnostics.

Plasma CLI override matrix:

- `plasma-oscillation`: `--electron-density-per-cubic-meter`, `--electron-temperature-electron-volts`, `--perturbation-amplitude-percent`
- `debye-screening`: `--electron-density-per-cubic-meter`, `--electron-temperature-electron-volts`, `--probe-potential-volts`
- `magnetic-confinement`: `--magnetic-field-tesla`, `--plasma-current-mega-amperes`, `--major-radius-meters`

Supported Plasma overlay flags:

- `--show-reference-guides`
- `--show-active-marker`
- `--show-comparison-band`

Supported Plasma report-export flag:

- `--export-plasma-report-csv`

Plasma validation rules:

- Plasma render or export or report flow supports both direct `--scenario` execution and imported payload execution.
- When `--import` is used with `--domain plasma-physics`, CLI time, overlay, and scenario-specific numeric override flags are applied to the imported Plasma payload before rendering and export.
- `--scenario` cannot be combined with `--import`.
- Plasma-specific numeric overrides are scenario-aware and reject flags from the other Plasma scenarios.
- The executable prints compact Plasma stdout summaries for the active scenario and, when `--export-plasma-report-csv` is provided, also prints the validated report-summary rows that were written to the CSV file.
- `--export-plasma-report-csv` is rejected for non-Plasma domains.
