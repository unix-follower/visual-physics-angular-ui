Current implementation status:
- Phase 33. Plasma Physics. Angular with WebGPU: complete.
- Phase 34. Plasma Physics. Vulkan: complete.
- Phase 1. Kinematics. Angular with WebGPU: complete.
- Phase 2. Kinematics. Vulkan: complete.
- Phase 3. Dynamics. Angular with WebGPU: complete.
- Phase 4. Dynamics. Vulkan: complete.
- Phase 5. Statics. Angular with WebGPU: complete.
- Phase 6. Statics. Vulkan: complete.
- Phase 7. Electromagnetism. Angular with WebGPU: complete.
- Phase 8. Electromagnetism. Vulkan: complete.
- Phase 9. Computational / Numerical Physics. Angular with WebGPU: complete.
- Phase 10. Computational / Numerical Physics. Vulkan: complete.
- Phase 11. Electronics and circuits. Angular with WebGPU: complete.
- Phase 12. Electronics and circuits. Vulkan: complete.
- Phase 13. Fluid mechanics. Angular with WebGPU: complete.
- Phase 14. Fluid mechanics. Vulkan: complete.
- Phase 15. Thermodynamics. Angular with WebGPU: complete.
- Phase 16. Thermodynamics. Vulkan: complete.
- Phase 17. Optics and light. Angular with WebGPU: complete.
- Phase 18. Optics and light. Vulkan: complete.
- Phase 19. Quantum mechanics. Angular with WebGPU: complete.
- Phase 20. Quantum mechanics. Vulkan: complete.
- Phase 21. Waves and Acoustics. Angular with WebGPU: complete.
- Phase 25. Astrophysics. Angular with WebGPU: complete.
- Phase 26. Astrophysics. Vulkan: complete.
- Phase 27. Atmospheric physics. Angular with WebGPU: complete.
- Phase 28. Atmospheric physics. Vulkan: complete.
- Phase 29. Solid State / Materials Physics. Angular with WebGPU: complete.
- Phase 30. Solid State / Materials Physics. Vulkan: complete.
- Phase 31. Nuclear and Particle Physics. Angular with WebGPU: complete.
- Phase 32. Nuclear and Particle Physics. Vulkan: complete.

Phase 30 delivered so far:
- Added the initial Solid State Vulkan domain modules in `visual-physics-vulkan` with dedicated `solid_state_core`, `solid_state_payload`, and `solid_state_report` files following the established multi-domain executable pattern.
- Implemented the locked Solid State scenario trio `crystal-elasticity`, `phonon-dispersion`, and `electronic-structure`, including deterministic snapshots, sampled profiles, strict Angular-compatible JSON import or export payload handling, and summary-first CSV report generation.
- Wired the Vulkan executable to recognize `--domain solid-state-physics` and list the Solid State scenarios through `--list-scenarios`, establishing the first validated Phase 30 executable surface.
- Extended the Vulkan executable with full Solid State direct and imported render or export or report flow, including `--export-solid-state-report-csv`, overlay-sensitive headless plot geometry, roundtrip verification, compact stdout summaries, and imported time or overlay override handling.
- Added scenario-aware Solid State numeric CLI overrides for direct and imported executable flow, covering crystal elasticity material parameters, phonon dispersion lattice parameters, and electronic structure carrier parameters with explicit invalid-flag rejection for cross-scenario misuse.
- Added focused Vulkan executable, core, payload, and report coverage for the initial Solid State slice, including scenario listing, scenario diagnostics, payload roundtrips, malformed-payload rejection, and summary-first CSV generation.
- Added focused executable regression coverage for direct Solid State render or export or report flow, imported overlay or time override flow, and wrong-domain Solid State report export rejection.
- Added focused executable regression coverage for direct Solid State numeric overrides, imported numeric overrides, and scenario-specific invalid override rejection.
- Expanded the Solid State executable override coverage toward scenario symmetry by adding focused phonon direct or imported override regressions, direct electronic override regression, and imported phonon invalid-flag rejection coverage on top of the earlier crystal and electronic cases.
- Expanded the Solid State imported-path coverage toward scenario symmetry by adding imported crystal numeric override regression plus imported invalid-flag rejection coverage for crystal and electronic scenarios on top of the earlier phonon imported guard.
- Closed the remaining direct invalid-flag symmetry gap by adding explicit electronic-scenario rejection coverage for a phonon-only override flag, so all three Solid State scenarios now have direct invalid-flag executable guard coverage.
- Added the remaining executable guard-rail regressions around the Solid State path by proving that Solid State numeric override flags are rejected on non-Solid-State domains and that `--scenario` is rejected when combined with imported Solid State payloads.
- Extended direct Solid State report-export executable coverage beyond electronic-structure by adding a phonon-dispersion render or roundtrip or report regression, proving the direct phonon scenario emits the expected payload fields, CSV summary rows, and stdout report summary through the executable path.
- Completed direct scenario-level Solid State report-export parity by adding a crystal-elasticity render or roundtrip or report regression, so all three Solid State scenarios now have direct executable coverage for payload export, report CSV generation, and stdout summary emission.
- Completed imported scenario-level Solid State report-export parity by extending the imported electronic-structure and phonon-dispersion executable regressions to assert CSV export and stdout report-summary output, so all three Solid State scenarios now also prove the imported report path through the executable.
- Extended the direct override-aware Solid State executable regressions so crystal-elasticity, phonon-dispersion, and electronic-structure override flows now also assert report CSV export and stdout report-summary output instead of stopping at payload export and snapshot summary.
- Completed imported override-aware Solid State executable report-export parity by extending the imported crystal-elasticity override regression to assert report CSV export and stdout report-summary output, which closes the last remaining override-path report gap across the crystal, phonon, and electronic trio.
- Extended the override-heavy Solid State executable regressions so both the direct and imported crystal, phonon, and electronic override flows now also assert `--roundtrip-check`, proving override-aware payload verification on both sides of the executable path instead of only export and report output.
- Extended the imported override-heavy Solid State regressions so crystal-elasticity, phonon-dispersion, and electronic-structure now also assert CLI overlay override application alongside imported numeric overrides, report export, and roundtrip verification, instead of leaving overlay-aware imported override behavior pinned to the older crystal-only smoke path.
- Extended the direct override-heavy Solid State regressions so crystal-elasticity, phonon-dispersion, and electronic-structure now also assert CLI overlay override application alongside direct numeric overrides, report export, and roundtrip verification, bringing direct and imported override-aware overlay handling to the same parity level.
- Extended the Solid State payload unit slice so phonon-dispersion and electronic-structure now roundtrip scenario fields, snapshot time, overlays, sampled curves, and key derived diagnostics too, completing payload roundtrip parity across crystal, phonon, and electronic scenarios instead of leaving that lower-layer proof crystal-only.
- Added the missing Solid State payload malformed-input guard for non-finite snapshot time, aligning the Solid State parser regression matrix with the neighboring domains that already proved `snapshot.timeSeconds` rejection instead of leaving that shared validation path unpinned.
- Added the missing Solid State payload malformed-overlay guard so non-boolean overlay fields are now explicitly rejected in tests too, covering the parser branch that validates `showReferenceGuides`, `showActiveMarker`, and `showComparisonBand` instead of leaving overlay decoding implied by the happy-path roundtrips.
- Added the missing Solid State payload required-field guards for crystal-elasticity and phonon-dispersion, so all three Solid State scenario branches now explicitly reject malformed imports missing their scenario-specific numeric fields instead of only proving that behavior for electronic-structure.
- Added the missing Solid State report regressions for phonon-dispersion and electronic-structure summary-first CSV generation, so crystal, phonon, and electronic now each have dedicated report CSV coverage instead of only crystal having the full summary-first report proof.
- Added a dedicated Solid State crystal report-summary regression for the `yield_margin_mpa` branch, so the crystal-specific summary-row path is now asserted directly instead of being covered only indirectly through full CSV output and executable report strings.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 36/36 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 233/233 tests.
- Extended the Solid State phonon and electronic core regressions so they also assert the default-time `build_samples()` wrapper path, directly pinning the scenario-specific active-sample index and default cursor position instead of only covering those scenarios through explicit `build_samples_at_time(...)` calls.
- Revalidated the same focused Solid State Vulkan slice at 36/36 tests and the full Vulkan `ctest --preset=vcpkg --output-on-failure` preset at 233/233 tests after the new default-time core assertions.
- Tightened the Solid State report summary-row coverage so the electronic branch is now asserted directly through `build_report_summary_rows(...)`, rather than only indirectly through summary-first CSV text checks, bringing crystal, phonon, and electronic summary-row branches to the same direct coverage level.
- Revalidated the same focused Solid State Vulkan slice at 36/36 tests and the full Vulkan `ctest --preset=vcpkg --output-on-failure` preset at 233/233 tests after the direct electronic report-row assertions.
- Added a focused Solid State payload regression proving imported payloads still parse when `overlays` is omitted entirely or set to `null`, directly pinning the optional-overlay import branch instead of only the populated-overlay happy path.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 37/37 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 234/234 tests.
- Added the missing Solid State payload malformed-input guard for an absent `snapshot.timeSeconds`, so imported Solid State payloads now explicitly reject a missing snapshot-time field instead of only the non-finite snapshot-time branch.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 38/38 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 235/235 tests.
- Added the missing Solid State payload malformed-input guard for non-finite `viewBounds`, so imported Solid State payloads now explicitly reject invalid scenario bounds instead of leaving that shared parser branch implied by other domains.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 39/39 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 236/236 tests.
- Added the missing Solid State payload malformed-input guard for non-finite scenario-specific numeric fields, so imported Solid State payloads now explicitly reject invalid crystal, phonon, or electronic parameter values instead of only missing-field cases.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 40/40 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 237/237 tests.
- Added the missing Solid State payload malformed-input guard for unknown scenario ids, so imported Solid State payloads now explicitly reject unsupported scenario names instead of relying only on the executable-level scenario list.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 41/41 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 238/238 tests.
- Added the missing Solid State payload malformed-input guard for absent `focusArea` metadata, so imported Solid State payloads now explicitly reject incomplete shared scenario descriptors instead of only missing scenario-specific numeric fields.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 42/42 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 239/239 tests.
- Added the missing Solid State payload malformed-input guard for absent `viewBounds` metadata, so imported Solid State payloads now explicitly reject incomplete shared scenario descriptors before scenario-specific parsing begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 43/43 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 240/240 tests.
- Added the missing Solid State payload malformed-input guard for non-finite `durationSeconds`, so imported Solid State payloads now explicitly reject invalid shared scenario timing metadata instead of only malformed snapshot time.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 44/44 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 241/241 tests.
- Added the missing Solid State payload malformed-input guard for absent `status` metadata, so imported Solid State payloads now explicitly reject incomplete shared scenario descriptors before scenario-specific parsing begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 45/45 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 242/242 tests.
- Added the missing Solid State payload malformed-input guard for absent `equationSummary` metadata, so imported Solid State payloads now explicitly reject incomplete shared scenario descriptors before scenario-specific parsing begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 46/46 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 243/243 tests.
- Added the missing Solid State payload malformed-input guard for absent `summary` metadata, so imported Solid State payloads now explicitly reject incomplete shared scenario descriptors before scenario-specific parsing begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 47/47 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 244/244 tests.
- Added the missing Solid State payload malformed-input guard for absent `name` metadata, so imported Solid State payloads now explicitly reject incomplete shared scenario descriptors before scenario-specific parsing begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 48/48 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 245/245 tests.
- Added the missing Solid State payload malformed-input guard for non-object `scenario` payloads, so imported Solid State payloads now explicitly reject top-level shape mismatches before attempting shared scenario parsing.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 49/49 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 246/246 tests.
- Added the missing Solid State payload malformed-input guard for non-object `snapshot` payloads, so imported Solid State payloads now explicitly reject top-level shape mismatches before snapshot-time validation begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 50/50 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 247/247 tests.
- Added the missing Solid State payload malformed-input guard for absent top-level `scenario` payloads, so imported Solid State payloads now explicitly reject incomplete import containers before shared scenario parsing begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 51/51 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 248/248 tests.
- Added the missing Solid State payload malformed-input guard for absent top-level `snapshot` payloads, so imported Solid State payloads now explicitly reject incomplete import containers before snapshot-time validation begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 52/52 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 249/249 tests.
- Added the missing Solid State payload malformed-input guard for non-object root payloads, so imported Solid State payloads now explicitly reject top-level non-object containers before checking `scenario` or `snapshot`.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 53/53 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 250/250 tests.
- Added the missing Solid State payload malformed-input guard for invalid JSON text, so imported Solid State payloads now explicitly convert JSON parse failures into the same `std::runtime_error` path used for other invalid payload shapes.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 54/54 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 251/251 tests.
- Added the missing Solid State payload malformed-input guard for non-object `overlays`, so imported Solid State payloads now explicitly reject present overlay containers that are not JSON objects before boolean flag validation begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 55/55 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 252/252 tests.
- Added the missing Solid State payload malformed-input guard for non-object `viewBounds`, so imported Solid State payloads now explicitly reject present bounds containers that are not JSON objects before finite-range validation begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 56/56 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 253/253 tests.
- Added the missing Solid State payload malformed-input guard for absent `viewBounds.minX`, so imported Solid State payloads now explicitly reject incomplete bounds objects instead of only malformed container shape or non-finite values.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 57/57 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 254/254 tests.
- Added the missing Solid State payload malformed-input guard for absent `viewBounds.maxX`, so imported Solid State payloads now explicitly reject incomplete bounds objects across both lower and upper horizontal range fields.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 58/58 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 255/255 tests.
- Added the missing Solid State payload malformed-input guard for absent `viewBounds.minY`, so imported Solid State payloads now explicitly reject incomplete bounds objects across both horizontal and lower vertical range fields.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 59/59 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 256/256 tests.
- Added the missing Solid State payload malformed-input guard for absent `viewBounds.maxY`, so imported Solid State payloads now explicitly reject incomplete bounds objects across the full min/max horizontal and vertical range matrix.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 60/60 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 257/257 tests.
- Added the missing Solid State payload malformed-input guard for absent overlay booleans, so imported Solid State payloads now explicitly reject incomplete `overlays` objects instead of only non-object or non-boolean overlay payloads.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 61/61 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 258/258 tests.
- Added the missing Solid State payload malformed-input guard for absent `overlays.showReferenceGuides`, so imported Solid State payloads now explicitly reject incomplete overlay objects across both comparison-band and reference-guide branches.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 62/62 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 259/259 tests.
- Added the missing Solid State payload malformed-input guard for absent `overlays.showActiveMarker`, so imported Solid State payloads now explicitly reject incomplete overlay objects across reference-guide, active-marker, and comparison-band branches.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 63/63 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 260/260 tests.
- Added the missing Solid State payload malformed-input guard for absent `overlays.showComparisonBand`, so imported Solid State payloads now explicitly reject incomplete overlay objects across the full reference-guide, active-marker, and comparison-band boolean matrix.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 64/64 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 261/261 tests.
- Added the missing Solid State payload malformed-input guard for absent `scenario.id`, so imported Solid State payloads now explicitly reject scenario objects that omit the parser's required scenario identifier before any scenario-specific numeric decoding runs.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 65/65 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 262/262 tests.
- Added direct Solid State JSON export parity coverage for the phonon scenario, so the serialized payload shape now explicitly proves Angular-compatible `exportedAt`, snapshot `stable`, overlay booleans, and sampled `secondaryValue` fields instead of leaving those export-only fields implied by roundtrip reconstruction.
- Added the missing Solid State payload malformed-input guard for non-string `scenario.id`, so imported Solid State payloads now explicitly reject scenario objects that fail the parser's required id-type check before scenario-id decoding begins.
- Validated the current Phase 30 checkpoint with a green focused Solid State Vulkan run at 67/67 tests after rebuilding `tests`, plus a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 264/264 tests.

Phase 29 delivered so far:
- Added the Angular route and shell navigation entry for `/solid-state-physics`, and updated the application shell copy to include the new Solid State / Materials Physics phase scope.
- Added the initial `solid-state-physics` Angular feature scaffold in `visual-physics-angular-ui` with locked scenario ids `crystal-elasticity`, `phonon-dispersion`, and `electronic-structure`.
- Added a signal-driven Solid State state service with deterministic scenario defaults, normalized field updates, scenario switching, imported-state restore, and deterministic sampled data generation for the locked starter trio.
- Added strict Solid State JSON payload parsing, summary-first report-row and CSV generation, reusable insight and sampled-plot helpers, and a lightweight viewport renderer scaffold for the first Angular slice.
- Added the first Solid State page surface with scenario cards, scenario-aware controls, live readouts, insight cards, sampled SVG plot, JSON preview, CSV preview, JSON restore workflow, overlay toggles, and WebGPU readiness messaging.
- Hardened the Solid State JSON restore workflow so malformed payloads now fail gracefully with user-visible status messaging instead of throwing through the page, and added focused restore regressions for valid electronic-structure restore plus invalid restore rejection.
- Added interactive sampled-plot inspection to the Solid State page with hover or focus-driven sample readouts, keyboard navigation, plot cursor feedback, and scenario-aware sampled diagnostics for the crystal-elasticity, phonon-dispersion, and electronic-structure starter trio.
- Added browser-style Solid State export workflow parity so the page now supports clipboard copy, downloadable JSON scenario export, and downloadable CSV report export with user-visible success and fallback messaging.
- Deepened the Solid State viewport renderer with dedicated scenario-aware geometry for crystal elasticity, phonon dispersion, and electronic structure, including overlay-sensitive guides, active markers, and distinct per-scenario viewport cues instead of the earlier generic line pass.
- Added dedicated Solid State renderer regressions for non-empty default geometry, scenario-aware geometry differences, and overlay reduction, and validated the current slice with a green focused Solid State run at 14/14 tests plus a green Angular build.
- Added Solid State renderer lifecycle coverage at the page level so supported WebGPU setup now proves viewport-ready messaging and teardown, while failed renderer creation proves the initialization-failure path, and validated the current slice with a green focused Solid State run at 16/16 tests plus a green Angular build.
- Broadened the Solid State scenario controls with scenario-aware control-focus summaries and dynamic guidance so the active crystal, phonon, and electronic parameter sets now explain what the current knobs are tuning, while focused page coverage proves the control copy switches with the active scenario and the current slice remains green at 16/16 tests plus a green Angular build.
- Deepened the Solid State report layer with richer scenario-aware summary rows and CSV report-stat exports so the crystal, phonon, and electronic slices now capture active transport or occupation context alongside sampled ranges, and added dedicated report-helper regressions while validating the current slice with a green focused Solid State run at 19/19 tests plus a green Angular build.
- Refined the Solid State status card with scenario-aware operating diagnostics and summary messaging so the crystal, phonon, and electronic slices now report yield margin, transport, or carrier state context instead of only generic flags, while focused page coverage proves the status copy switches with the active scenario and the current slice remains green at 19/19 tests plus a green Angular build.
- Refined the Solid State preview surface with scenario-aware preview metadata and preview-focus messaging so the JSON and CSV panels now expose scenario scope, sample count, and preview footprint instead of only raw dumps, while focused page coverage proves the preview copy switches with the active scenario and the current slice remains green at 19/19 tests plus a green Angular build.
- Refined the Solid State insight surface with scenario-aware summary messaging so the crystal, phonon, and electronic insight cards now end with a shared explanation of the active material, transport, or carrier interpretation, while focused page coverage proves the insight copy switches with the active scenario and the current slice remains green at 19/19 tests plus a green Angular build.
- Refined the Solid State live-readout surface with scenario-aware snapshot summaries so the crystal, phonon, and electronic readout rows now end with a single operating snapshot for the active material, transport, or carrier state, while focused page coverage proves the live-readout copy switches with the active scenario and the current slice remains green at 19/19 tests plus a green Angular build.
- Refined the Solid State summary-row surface with a scenario-aware takeaway so the crystal, phonon, and electronic summary cards now end with a single deterministic interpretation of the active material, transport, or carrier slice, while focused page coverage proves the summary copy switches with the active scenario and the current slice remains green at 19/19 tests plus a green Angular build.
- Polished the Solid State shell copy so the hero, implementation status, scenario-set note, viewport heading, completion-status line, and viewport ready-state messaging now read as a validated shared surface instead of an initial scaffold, while focused page coverage proves the updated shell wording and the current slice remains green at 19/19 tests plus a green Angular build.
- Polished the Solid State scenario-state copy at the source-of-truth level so the default crystal, phonon, and electronic scenario labels now read as validated material, transport, and carrier slices instead of initial placeholders, while focused page coverage proves the updated state labels surface in the shared page and the current slice remains green at 19/19 tests plus a green Angular build.
- Polished the Solid State scenario-set copy so the scenario panel now reads as a validated study set rather than a phase-tracking list, while focused page coverage proves the updated scenario-set wording and the current slice remains green at 19/19 tests plus a green Angular build.

Phase 31 delivered so far:
- Added the Angular route and shell navigation entry for `/nuclear-and-particle-physics`, so Nuclear and Particle Physics is now reachable as a first-class Phase 31 feature instead of remaining roadmap-only.
- Added the initial `nuclear-and-particle-physics` Angular feature scaffold in `visual-physics-angular-ui` with locked starter scenario ids `radioactive-decay`, `binding-energy-curve`, and `proton-proton-collision`.
- Added a signal-driven Nuclear and Particle Physics state service with deterministic scenario defaults, scenario-aware numeric normalization, scenario switching, and derived live snapshots for decay, nuclear-structure, and collider starter slices.
- Added the first Nuclear and Particle Physics page surface with starter implementation messaging, scenario cards, WebGPU readiness reporting, scenario-aware live metrics, and scenario-specific parameter controls.
- Validated the current Phase 31 checkpoint with a green focused Angular run at 4/4 Nuclear and Particle Physics specs via `npm test -- --watch=false --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-state.service.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-page.component.spec.ts`, plus a green Angular production build via `npm run build`.
- Added the first Nuclear and Particle Physics payload and report layer with strict JSON import or export helpers, summary-first CSV generation, deterministic sampled-state export content, and page-level JSON preview, CSV preview, and restore workflow support for the locked starter trio.
- Validated the current Phase 31 checkpoint with a green focused Angular run at 9/9 Nuclear and Particle Physics specs via `npm test -- --watch=false --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-state.service.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-page.component.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-payload.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-report.spec.ts`, plus a green Angular production build via `npm run build`.
- Added the first scenario-aware Nuclear and Particle Physics analytics layer on the Angular page with per-scenario insight cards plus preview and live readout summaries, so the existing deterministic sampled-state slice now surfaces directly in the UI instead of only through JSON and CSV previews.
- Added the first lightweight Nuclear and Particle Physics sampled plot on the Angular page with scenario-aware SVG curves, comparison traces, guide overlays, and active markers for the locked starter trio, so the deterministic sampled-state slice now has a direct chart surface before any dedicated WebGPU viewport lands.
- Added hover and keyboard inspection for the Nuclear and Particle Physics sampled plot with live sample readouts and button-driven navigation controls, so the first SVG chart surface now supports direct sampled-state inspection instead of remaining static.
- Validated the current Phase 31 checkpoint with a green focused Angular run at 10/10 Nuclear and Particle Physics specs via `npm test -- --watch=false --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-state.service.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-page.component.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-payload.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-report.spec.ts`, plus a green Angular production build via `npm run build`.
- Added browser-facing Nuclear and Particle Physics export actions for clipboard copy plus JSON and CSV download, so the existing preview payload and report pipeline now has a first real export workflow instead of remaining preview-only.
- Validated the current Phase 31 checkpoint with a green focused Angular run at 12/12 Nuclear and Particle Physics specs via `npm test -- --watch=false --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-state.service.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-page.component.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-payload.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-report.spec.ts`, plus a green Angular production build via `npm run build`.
- Added the first dedicated Nuclear and Particle Physics viewport renderer on the Angular page with canvas-backed scenario rendering, overlay toggles, ready or failure lifecycle messaging, and destroy cleanup for the locked starter trio, so the Phase 31 feature now has a true viewport surface instead of only readiness messaging and SVG previews.
- Polished the Nuclear and Particle Physics shell copy so the hero summary, implementation-status card, validated scenario-set note, viewport heading, completion-status line, and viewport-ready messaging now read as an established shared Phase 31 surface instead of a starter scaffold.
- Revalidated the current Phase 31 checkpoint with a green focused Angular run at 14/14 Nuclear and Particle Physics specs via `npm test -- --watch=false --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-state.service.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-page.component.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-payload.spec.ts --include src/app/features/nuclear-and-particle-physics/nuclear-and-particle-physics-report.spec.ts`, plus a green Angular production build via `npm run build`.
- Phase 31 Angular implementation is complete for the planned Nuclear and Particle Physics scope.

Phase 32 delivered so far:
- Added the initial Nuclear and Particle Physics Vulkan domain modules in `visual-physics-vulkan` with dedicated `nuclear_and_particle_physics_core`, `nuclear_and_particle_physics_payload`, and `nuclear_and_particle_physics_report` files following the established multi-domain executable pattern.
- Implemented the locked Nuclear and Particle Physics scenario trio `radioactive-decay`, `binding-energy-curve`, and `proton-proton-collision`, including deterministic snapshots, sampled profiles, strict Angular-compatible JSON import or export payload handling, and summary-first CSV report generation.
- Wired the Vulkan executable to recognize `--domain nuclear-and-particle-physics`, list the Nuclear scenarios through `--list-scenarios`, and execute direct or imported Nuclear render or export or roundtrip or report flow, including `--export-nuclear-report-csv`, overlay-sensitive headless plot geometry, shared overlay-flag handling, and compact Nuclear stdout summaries.
- Expanded Nuclear executable coverage to direct render or export or report parity across `radioactive-decay`, `binding-energy-curve`, and `proton-proton-collision`, then extended imported executable symmetry across all three scenarios with override-aware decay, binding, and collider payload flows plus the shared `--scenario` with `--import` rejection.
- Added scenario-aware numeric CLI override support for direct and imported Nuclear execution, including half-life or population controls for `radioactive-decay`, mass-number or proton-count or binding-energy controls for `binding-energy-curve`, beam-energy or scattering-angle or detector-radius controls for `proton-proton-collision`, plus explicit invalid-flag rejection and non-Nuclear domain guard coverage.
- Completed the current Nuclear payload-parser hardening pass with a malformed-input matrix covering top-level payload shape, invalid JSON text, required shared scenario metadata, non-finite duration or bounds, invalid or mistyped scenario identifiers, missing scenario-specific fields, and malformed overlay objects or missing overlay booleans.
- Added focused Vulkan executable, core, payload, and report coverage for the current Nuclear slice, including scenario listing, direct and imported render or export or report execution, scenario diagnostics, payload roundtrips, malformed-payload rejection, shared import-conflict rejection, wrong-domain guard coverage, and imported invalid-flag rejection across the Nuclear trio.
- Validated the completed Phase 32 checkpoint with a green focused Nuclear Vulkan run at 50/50 tests after rebuilding `tests`, a green nuclear-scoped `ctest --preset=vcpkg --output-on-failure -R 'Nuclear|ListsNuclearAndParticlePhysicsScenarios'` pass at 50/50, a green full Vulkan `ctest --preset=vcpkg --output-on-failure` pass at 314/314, plus a successful direct `visual_physics_vulkan --domain nuclear-and-particle-physics --scenario radioactive-decay --half-life-hours 12 --initial-population-trillions 8.4 --export-state ...` override-aware render or export run.
- Phase 32 Vulkan implementation is complete for the planned Nuclear and Particle Physics scope.

Phase 33 delivered so far:
- Added the Angular route and shell navigation entry for `/plasma-physics`, so Plasma Physics is now reachable as a first-class Phase 33 feature instead of remaining roadmap-only.
- Added the initial `plasma-physics` Angular feature scaffold in `visual-physics-angular-ui` with the locked starter scenario ids `plasma-oscillation`, `debye-screening`, and `magnetic-confinement`.
- Added a signal-driven Plasma Physics state service with deterministic defaults, scenario switching, clamped numeric updates, strict imported-state restore, and deterministic sampled diagnostics for the locked starter trio.
- Added strict Plasma Physics JSON payload helpers, summary-first report-row and CSV helpers, and focused unit coverage for the new contract layer.
- Added the first Plasma Physics page surface with scenario cards, scenario-aware controls, overlay toggles, WebGPU readiness messaging, live summary rows, JSON payload preview, CSV report preview, and JSON restore workflow.
- Validated the current Phase 33 checkpoint with a green focused Angular run at 9/9 Plasma Physics specs via `npm test -- --watch=false --include src/app/features/plasma-physics/plasma-physics-state.service.spec.ts --include src/app/features/plasma-physics/plasma-physics-payload.spec.ts --include src/app/features/plasma-physics/plasma-physics-report.spec.ts --include src/app/features/plasma-physics/plasma-physics-page.component.spec.ts`, plus a green Angular production build via `npm run build`.
- Added the first scenario-aware Plasma analytics layer with insight cards for `plasma-oscillation`, `debye-screening`, and `magnetic-confinement`, so the deterministic Plasma diagnostics now surface directly in the page instead of only through summary rows and export previews.
- Added the first sampled Plasma SVG plot surface with scenario-aware primary and comparison traces, guide overlays, and active markers for the locked starter trio, so Phase 33 now has direct visual sampled diagnostics before the dedicated Plasma WebGPU renderer lands.
- Validated the current Phase 33 checkpoint with a green focused Angular run at 13/13 Plasma Physics specs via `npm test -- --watch=false --include src/app/features/plasma-physics/plasma-physics-state.service.spec.ts --include src/app/features/plasma-physics/plasma-physics-payload.spec.ts --include src/app/features/plasma-physics/plasma-physics-report.spec.ts --include src/app/features/plasma-physics/plasma-physics-analytics.spec.ts --include src/app/features/plasma-physics/plasma-physics-plot.spec.ts --include src/app/features/plasma-physics/plasma-physics-page.component.spec.ts`, plus a green Angular production build via `npm run build`.
- Added the first dedicated Plasma viewport renderer with canvas-backed scenario rendering, overlay-aware ready-state messaging, and teardown-safe page lifecycle wiring for `plasma-oscillation`, `debye-screening`, and `magnetic-confinement`, so the Phase 33 page now has a real validated viewport instead of a readiness placeholder.
- Added focused Plasma page coverage for the supported renderer path, renderer-creation failure path, and destroy-time teardown, so the viewport lifecycle is pinned alongside the existing state, payload, report, analytics, and sampled-plot coverage.
- Validated the current Phase 33 checkpoint with a green focused Angular run at 15/15 Plasma Physics specs via `npm test -- --watch=false --include src/app/features/plasma-physics/plasma-physics-state.service.spec.ts --include src/app/features/plasma-physics/plasma-physics-payload.spec.ts --include src/app/features/plasma-physics/plasma-physics-report.spec.ts --include src/app/features/plasma-physics/plasma-physics-analytics.spec.ts --include src/app/features/plasma-physics/plasma-physics-plot.spec.ts --include src/app/features/plasma-physics/plasma-physics-page.component.spec.ts`, plus a green Angular production build via `npm run build`.
- Added interactive Plasma sampled-plot inspection with focusable SVG navigation, keyboard stepping, cursor guides, aria-live sampled announcements, and scenario-aware readout rows for `plasma-oscillation`, `debye-screening`, and `magnetic-confinement`, so the existing sampled diagnostics are now directly inspectable instead of remaining static traces.
- Added focused Plasma page coverage for sampled-plot keyboard navigation, proving the active inspection cursor can step across deterministic Plasma samples on the shared page surface.
- Validated the current Phase 33 checkpoint with a green focused Angular run at 16/16 Plasma Physics specs via `npm test -- --watch=false --include src/app/features/plasma-physics/plasma-physics-state.service.spec.ts --include src/app/features/plasma-physics/plasma-physics-payload.spec.ts --include src/app/features/plasma-physics/plasma-physics-report.spec.ts --include src/app/features/plasma-physics/plasma-physics-analytics.spec.ts --include src/app/features/plasma-physics/plasma-physics-plot.spec.ts --include src/app/features/plasma-physics/plasma-physics-page.component.spec.ts`, plus a green Angular production build via `npm run build`.
- Added browser-style Plasma export workflow parity so the shared page now supports downloadable JSON state export and downloadable CSV report export alongside the existing clipboard copy and JSON restore flow, instead of leaving the validated previews as read-only text panels.
- Added focused Plasma page coverage for JSON and CSV download actions, proving the page emits browser file exports and user-visible status messaging for both Plasma handoff formats on the validated shared surface.
- Validated the current Phase 33 checkpoint with a green focused Angular run at 17/17 Plasma Physics specs via `npm test -- --watch=false --include src/app/features/plasma-physics/plasma-physics-state.service.spec.ts --include src/app/features/plasma-physics/plasma-physics-payload.spec.ts --include src/app/features/plasma-physics/plasma-physics-report.spec.ts --include src/app/features/plasma-physics/plasma-physics-analytics.spec.ts --include src/app/features/plasma-physics/plasma-physics-plot.spec.ts --include src/app/features/plasma-physics/plasma-physics-page.component.spec.ts`, plus a green Angular production build via `npm run build`.
- Polished the Plasma page copy so the hero, implementation-status card, validated scenario-set note, preview messaging, and restore guidance now read as a validated shared Phase 33 surface instead of a staged scaffold, while keeping the existing Plasma route, renderer, sampled diagnostics, and export workflow intact.
- Validated the completed Phase 33 checkpoint with a green focused Angular run at 17/17 Plasma Physics specs via `npm test -- --watch=false --include src/app/features/plasma-physics/plasma-physics-state.service.spec.ts --include src/app/features/plasma-physics/plasma-physics-payload.spec.ts --include src/app/features/plasma-physics/plasma-physics-report.spec.ts --include src/app/features/plasma-physics/plasma-physics-analytics.spec.ts --include src/app/features/plasma-physics/plasma-physics-plot.spec.ts --include src/app/features/plasma-physics/plasma-physics-page.component.spec.ts`, plus a green Angular production build via `npm run build`.
- Phase 33 Angular implementation is complete for the planned Plasma Physics scope.

Phase 34 delivered so far:
- Added the initial Plasma Vulkan domain modules in `visual-physics-vulkan` with dedicated `plasma_physics_core`, `plasma_physics_payload`, and `plasma_physics_report` files following the established multi-domain executable pattern.
- Implemented the locked Plasma scenario trio `plasma-oscillation`, `debye-screening`, and `magnetic-confinement`, including deterministic diagnostics, sampled profiles, Angular-compatible JSON import or export payload handling, and summary-first CSV report generation for the first Vulkan slice.
- Wired the Vulkan executable to recognize `--domain plasma-physics` and list the Plasma scenarios through `--list-scenarios`, establishing the first validated Phase 34 executable surface.
- Extended the Vulkan executable with direct and imported Plasma render or export or report flow, including `--export-plasma-report-csv`, overlay-sensitive sampled-plot geometry, roundtrip verification, compact stdout summaries, imported time or overlay override handling, and wrong-domain Plasma report-export rejection.
- Added scenario-aware Plasma numeric CLI override support for direct and imported executable flow, covering oscillation density or temperature or perturbation controls, Debye density or temperature or probe controls, and confinement field or current or major-radius controls with explicit invalid-flag rejection for cross-scenario misuse.
- Extended the Plasma executable stdout so override-heavy runs now report the active scenario-specific Plasma parameters instead of falling back to `Overrides: none`, bringing the override path closer to the established neighboring-domain CLI output shape.
- Added the next Plasma executable parity slice by pinning direct Debye override flow plus the shared Plasma guard rails for wrong-domain override rejection and `--scenario` with imported payload rejection.
- Extended the Plasma override-symmetry slice again by pinning direct confinement override flow, imported Debye override flow, and Debye invalid-flag rejection for an oscillation-only control.
- Added focused Vulkan executable, core, payload, and report coverage for the initial Plasma slice, including scenario listing, scenario diagnostics, payload roundtrips, malformed-payload rejection, and summary-first CSV generation.
- Added focused executable Plasma regressions for direct Debye render or export or report flow, imported oscillation overlay or time override flow, and wrong-domain Plasma report export rejection.
- Added focused executable Plasma override regressions for direct oscillation overrides, imported confinement overrides, and invalid confinement-only flag rejection on the oscillation scenario.
- Added focused executable Plasma parity regressions for direct Debye overrides, wrong-domain Plasma override rejection, and Plasma scenario-import conflict rejection.
- Added focused executable Plasma symmetry regressions for direct confinement overrides, imported Debye overrides, and invalid oscillation-only flag rejection on the Debye scenario.
- Added focused executable Plasma symmetry regressions for imported oscillation numeric overrides, proving that imported Plasma payloads now have positive override coverage across oscillation, Debye, and confinement scenarios.
- Added focused executable Plasma guard coverage for invalid imported magnetic-confinement CLI flags, proving the imported confinement path rejects Debye-only overrides after payload resolution.
- Added focused executable Plasma guard coverage for invalid direct magnetic-confinement CLI flags, completing direct invalid-flag executable coverage across oscillation, Debye, and confinement scenarios.
- Added focused executable Plasma guard coverage for invalid imported plasma-oscillation CLI flags, extending the imported invalid-flag executable matrix beyond magnetic-confinement.
- Added focused executable Plasma guard coverage for invalid imported Debye CLI flags, completing imported invalid-flag executable coverage across oscillation, Debye, and confinement scenarios.
- Added focused Plasma payload roundtrip coverage for the oscillation scenario, proving the lower-layer import or export payload path now preserves oscillation defaults, snapshot time, overlay flags, and sampled-state count in addition to the earlier Debye payload slice.
- Added focused Plasma payload roundtrip coverage for the magnetic-confinement scenario, completing lower-layer payload roundtrip parity across oscillation, Debye, and confinement for scenario metadata, snapshot time, overlays, and sampled-state count.
- Added focused Plasma payload hardening for non-finite `snapshot.timeSeconds`, pinning the shared import-parser guard that neighboring recent domains already assert.
- Added focused Plasma payload hardening for missing `snapshot.timeSeconds`, pinning the adjacent import-parser guard for absent snapshot time on malformed payloads.
- Added focused Plasma payload hardening for non-finite `viewBounds`, pinning the next shared import-parser guard around malformed scenario bounds.
- Added focused Plasma payload hardening for missing `viewBounds`, pinning the adjacent parser guard for absent scenario bounds on malformed imports.
- Added focused Plasma payload hardening for non-object `viewBounds`, pinning the malformed-bounds shape guard before field-level validation.
- Added focused Plasma payload hardening for missing `viewBounds.minX`, extending the malformed-bounds slice from whole-object rejection into individual required-field rejection.
- Added focused Plasma payload hardening for missing `viewBounds.maxX`, extending the required-field bounds-parser matrix past the first field-level rejection case.
- Added focused Plasma payload hardening for missing `viewBounds.minY`, extending the required-field bounds-parser matrix into the vertical-axis half of the scenario bounds.
- Added focused Plasma payload hardening for missing `viewBounds.maxY`, completing the required-field `viewBounds` parser matrix after the earlier whole-object, shape, and finite-value guards.
- Added focused Plasma payload hardening for missing overlay fields, pinning the adjacent `parse_overlays(...)` rejection path for partial overlay payloads instead of relying only on happy-path roundtrips.
- Added focused Plasma payload hardening for missing `showReferenceGuides` inside `overlays`, proving the parser rejects field-specific partial overlay payloads in addition to the earlier generic missing-overlay regression.
- Added Phase 34 Plasma CLI documentation to `visual-physics-vulkan/README.md`, covering scenario listing, direct and imported render or export or report flow, scenario-specific override usage, invalid-flag behavior, and Plasma report CSV export for the completed runtime surface.
- Validated the completed Phase 34 Plasma Vulkan scope with a green focused Plasma run at 38/38 tests via `cmake --build --preset vcpkg --target visual_physics_vulkan tests && ./build/tests --gtest_filter='VisualPhysicsVulkanExecutable.*Plasma*:PlasmaPhysicsCore.*:PlasmaPhysicsPayload.*:PlasmaPhysicsReport.*'`, plus a green full Vulkan preset run at 352/352 via `ctest --preset=vcpkg --output-on-failure`.
- Phase 34 Vulkan implementation is complete for the planned Plasma Physics scope.

Phase 28 delivered:
- Added the new Atmospheric Vulkan domain modules in `visual-physics-vulkan` with dedicated `atmospheric_core`, `atmospheric_payload`, and `atmospheric_report` files following the established multi-domain executable pattern.
- Implemented the validated Atmospheric scenario trio `barometric-formula`, `adiabatic-lapse-rate`, and `convection-column`, including deterministic snapshots, sampled profiles, Angular-compatible JSON import or export, and summary-first CSV report generation.
- Wired the Vulkan executable to recognize `--domain atmospheric-physics`, list Atmospheric scenarios, render or export both direct and imported scenarios, round-trip payloads, emit Atmospheric-specific summary, overlay, and report-summary stdout output, and reject `--scenario` combined with `--import`.
- Added validated Atmospheric report export support through `--export-atmospheric-report-csv`, including domain misuse rejection and summary-first CSV generation for all three scenarios on both direct and imported executable paths.
- Added validated Atmospheric CLI override support for direct and imported state resolution, including scenario-aware numeric overrides for barometric, adiabatic, and convection scenarios plus explicit rejection of incompatible flags for all three scenarios on both direct and imported paths.
- Added focused Vulkan executable coverage for Atmospheric scenario listing, direct render or export or report flow, imported overlay or time override flow, imported numeric override flow, wrong-domain report export rejection, scenario-import conflict rejection, and scenario-specific invalid-flag rejection on both direct and imported paths, with full direct or imported symmetry across the three Atmospheric scenarios.
- Added standalone Atmospheric core, payload, and report regression coverage so the domain now has direct tests for scenario diagnostics, JSON roundtrips and malformed payload rejection, and summary-first CSV plus scenario-summary row generation.
- Documented the completed Atmospheric Vulkan CLI workflow in `visual-physics-vulkan/README.md`, including scenario listing, direct render or export or report usage, imported override plus roundtrip plus report usage, and explicit invalid-flag behavior.
- Validated the completed Phase 28 Atmospheric Vulkan scope with a green focused Atmospheric test run at 28/28 and a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 197/197 tests.

- Phase 28 Vulkan implementation is complete for the planned Atmospheric Physics scope.

Phase 27 delivered so far:
- Added the Angular route and shell navigation entry for `/atmospheric-physics`.
- Started the Atmospheric Physics Angular feature scaffold with locked initial scenario ids `barometric-formula`, `adiabatic-lapse-rate`, and `convection-column`, plus a time-aware state service, summary-first export preview, CSV report preview, and a first page shell.
- Added the first real Atmospheric Physics WebGPU viewport slice with scenario-aware renderer geometry, runtime readiness messaging, and destroy-safe page lifecycle wiring.
- Added focused Angular page coverage for the initial Atmospheric Physics scaffold plus supported and failed WebGPU renderer initialization paths.
- Added Atmospheric analytics helpers, insight cards, an interactive sampled SVG plot with hover and keyboard sample inspection, and focused Angular coverage for the new readout flow.
- Added Atmospheric JSON workflow parity with strict payload parsing, normalized scenario restore, copy or download JSON actions, summary-first CSV download, reset support, and focused Angular coverage for successful and failed import paths.
- Hardened Atmospheric import normalization so invalid view bounds fall back to scenario defaults and cross-scenario fields are dropped before future exports, with dedicated payload, state-service, and page regression coverage.
- Added dedicated Atmospheric WebGPU renderer regression coverage to prove non-empty default geometry, scenario-specific geometry differences, and reduced geometry when overlays are disabled.
- Refreshed the Atmospheric page and scenario-status messaging so the Phase 27 surface now reads as a validated multi-scenario domain instead of an initial scaffold.
- Added a persistent Atmospheric live-readout card so each scenario now exposes always-visible snapshot metrics alongside the sampled plot readout, with focused page coverage and a green Angular build.
- Added scenario-specific control and insight summaries to the Atmospheric page so the current inputs and stability state are explained in the same shared Angular surface as the readouts, plot, report, and export workflow.
- Added file-based Atmospheric JSON restore and split JSON or CSV previews to the shared export workflow, with focused file-import page coverage and a green Angular build.
- Added a dedicated Atmospheric status panel for the selected scenario and removed the remaining scaffold-oriented copy from page and insight text so the Phase 27 surface reads consistently as a validated domain.
- Highlighted the active Atmospheric scenario inside the Phase 27 scenario-set panel so selection state is visible without relying only on the dropdown, with focused page coverage and a green Angular build.
- Made the Atmospheric scenario-set cards directly selectable with click and keyboard support so the highlighted Phase 27 trio is also an interaction surface, with focused page coverage and a green Angular build.
- Tightened Atmospheric scenario-card accessibility with an explicit keyboard-selection handler and regression coverage for Space-key selection, keeping the shared scenario-set panel accessible as it drives active state.
- Replaced the Atmospheric scenario-card button emulation with native button semantics, preserving active-state signaling while removing the last custom keyboard handling from the Phase 27 scenario-set interaction path.

- Phase 27 Angular implementation is complete for the planned Atmospheric Physics scope.

Phase 26 delivered so far:
- Added validated Astrophysics Vulkan executable wiring for the `astrophysics` domain, including scenario listing for `planetary-orbit`, `stellar-luminosity`, and `hubble-expansion`.
- Wired Astrophysics payload export, payload roundtrip validation, and summary-first CSV report export into the Vulkan executable flow.
- Added sample-plot-based Astrophysics headless rendering in the Vulkan executable, including reference-guide, comparison-band, and active-marker overlay handling.
- Added validated Astrophysics CLI scenario overrides for the current Vulkan executable flow, including planetary-orbit parameter overrides for central mass, orbital radius, and eccentricity plus imported stellar-luminosity and Hubble-expansion overrides for their scenario-specific fields.
- Added validated Astrophysics scenario-specific CLI rejection rules so incompatible planetary, stellar-luminosity, and Hubble-expansion override flags now fail on both direct and imported executable flows instead of silently crossing scenario boundaries.
- Added focused Vulkan executable coverage for Astrophysics scenario listing, direct render/export execution, imported override execution across planetary, stellar, and Hubble slices, and exact planetary/stellar/Hubble summary plus report-row assertions, and validated the current slice with a green focused Astrophysics Vulkan test run.
- Documented the current Astrophysics Vulkan CLI workflow in `visual-physics-vulkan/README.md`, including scenario listing, direct render/export/report usage, imported Hubble override usage, and explicit invalid-flag behavior.
- Added focused Astrophysics executable guard-rail coverage for the remaining CLI edge cases, including `--export-astrophysics-report-csv` on the wrong domain and `--scenario` combined with `--import`, and validated the current slice with a green focused Astrophysics Vulkan test run.
- Validated the completed Phase 26 Vulkan scope with a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 169/169 tests.

- Phase 26 Vulkan implementation is complete for the planned Astrophysics scope.

Phase 25 delivered so far:
- Added a new Angular Astrophysics route at `/astrophysics` and updated the shared Angular shell copy so the new domain is reachable from the main navigation.
- Added the first Phase 25 feature scaffold in `visual-physics-angular-ui` with dedicated models, state service, analytics helpers, payload helpers, report helpers, page UI, and viewport renderer modules.
- Implemented three validated Astrophysics scenarios: `planetary-orbit`, `stellar-luminosity`, and `hubble-expansion`, each with shared state normalization, deterministic sampled diagnostics, scenario-specific readouts, JSON export/import, summary-first CSV export, and reusable insight cards through one Angular page.
- Added a WebGPU-backed Astrophysics viewport for all three current slices, with deterministic scenario-aware geometry, supported and unsupported initialization handling, and focused renderer lifecycle coverage.
- Added sampled SVG plot inspection with hover, focus, keyboard stepping, synchronized viewport-context readouts, and direct overlay toggle controls so the Astrophysics page now exposes the same scenario state through the plot, WebGPU viewport, JSON export, and CSV report workflows, with guide, marker, and comparison layers now toggling consistently across the sampled plot and viewport.
- Added snapshot-time parity across the current Astrophysics scenarios, so stellar-luminosity and Hubble slices now preserve, display, and export their active time cursor through the shared state, live readouts, imported payloads, and summary-first CSV workflow instead of collapsing back to zero.
- Made the Astrophysics time cursor drive the active sampled point for stellar-luminosity and Hubble slices, and aligned focused plot inspection with that active sample so viewport context, plot readouts, and active marker cues now follow the selected time position instead of always opening on a fixed sample.
- Added snapshot-time insight cards across the Astrophysics analytics deck, so the active time cursor is now summarized directly in the scenario insights instead of only in controls, readouts, exports, and plot focus behavior.
- Aligned the Astrophysics sampled-plot guide annotations with the active time-driven sample for stellar-luminosity and Hubble slices, so guide labels now follow the same inspected position as the active marker, focused readout, and viewport context instead of staying pinned to stale static values.
- Made the Astrophysics viewport context block default to the active sampled point even before plot hover or focus, so the WebGPU-facing readout now reflects the current renderer marker and time cursor by default instead of falling back to generic summary copy.
- Made the Astrophysics sampled-plot readout default to the active sampled point as well, so the page now opens with synchronized plot, viewport, and time-cursor readouts instead of requiring an initial hover or focus before any per-sample diagnostics appear.
- Aligned the Astrophysics plot navigation controls with the active sampled point on initial render, so previous and next stepping now begin from the same time-driven sample used by the default readouts and viewport context instead of incorrectly behaving as if the first sample were already selected.
- Added scenario-aware overlay labels, renderer-ready status copy, and focused Angular coverage for Astrophysics state, payload parsing, analytics, report generation, viewport geometry, plot inspection, and page interactions, and validated the current slice with a green focused 24/24 Astrophysics feature test run plus a green Angular build.

- Phase 25 Angular implementation is complete for the planned Astrophysics scope.

Phase 21 delivered so far:
- Added a new Angular Waves and Acoustics route at `/waves-and-acoustics` and updated the shared Angular shell copy so the new domain is reachable from the main navigation.
- Added the first Phase 21 feature scaffold in `visual-physics-angular-ui` with dedicated models, state service, payload helpers, report helpers, page UI, and viewport renderer modules.
- Implemented three validated Waves scenarios: `standing-wave`, `traveling-wave`, and `doppler-effect`, each with shared state normalization, deterministic sampled diagnostics, and scenario-specific readouts through one Angular page.
- Added JSON export/import scaffolding plus summary-first CSV report export for the shared Waves page, including clipboard copy, JSON download, CSV download, textarea restore, and file-based JSON restore.
- Added a dedicated Waves analytics helper with scenario-specific insight cards, so standing-wave resonance cues, traveling-wave propagation metrics, and Doppler shift interpretation now surface as reusable page diagnostics instead of only raw readouts.
- Added an inline sampled SVG plot for the shared Waves page, so the existing sampled waveform or Doppler-profile data now renders as a deterministic chart alongside the WebGPU viewport and export previews.
- Added scenario-specific guide overlays and labels for the sampled Waves chart, so equilibrium lines, wavelength spacing, and emitted versus observed Doppler references are visible directly on the page instead of only implied by the raw trace.
- Added interactive sample inspection for the sampled Waves chart, so hover, focus, and keyboard stepping now expose per-sample displacement or frequency readouts without opening the JSON export.
- Wired the sampled Waves chart to the same overlay state as the WebGPU viewport and exports, so guide lines, markers, and reference cues now toggle consistently across all three feature surfaces.
- Added implementation-status and scenario-set sections to the shared Waves page, so the active Phase 21 scope, current focus, and validated scenario trio are summarized in the same layout style used by the more complete Angular domains.
- Added scenario-aware overlay labels on the Waves page, so the existing overlay toggles describe node spacing, wavelength guides, source-observer markers, and Doppler baselines in terms of the currently selected slice instead of generic labels.
- Added a shared snapshot-time control and readout to the Waves page, so the selected slice can scrub exported and plotted time-dependent state directly from the UI instead of only restoring `snapshot.timeSeconds` through JSON import.
- Made the standing-wave slice time-dependent, so the shared snapshot-time control now advances the resonant oscillation profile in sampled exports and viewport guides instead of leaving the standing-wave shape static.
- Made the Doppler slice time-dependent, so the shared snapshot-time control now shifts the source-observer frequency transition and viewport actor positions instead of leaving the Doppler profile static.
- Added snapshot-time parity to the Waves report layer, so on-page summary cards and exported CSV now include the active time cursor alongside the live time-dependent waveform and Doppler slices.
- Added snapshot-time insight cards on the Waves page, so the active time cursor is summarized directly in the analytics deck instead of only in controls, readouts, and exports.
- Added source and observer position guides to the Doppler plot, so the moving slice now explains the active source-observer geometry in the same chart legend as the emitted and observed frequency references.
- Enhanced the Doppler plot readout to include frequency shift, so interactive sample inspection now exposes both the local observed frequency and its delta from the emitted tone.
- Added a WebGPU-backed Waves viewport for all three current slices: standing-wave renders the string baseline, mode profile, and nodes; traveling-wave renders propagated waveform guides and wavelength references; and Doppler renders source-observer cues with frequency-shift geometry through the same renderer path.
- Added a live scenario-summary panel driven by the same report-summary rows used by the CSV export, so on-page diagnostics and exported metadata remain synchronized.
- Added focused Angular coverage for Phase 21 across Waves analytics, sampled-plot helpers, chart guides, overlay parity, interactive sample inspection, state, payload parsing, report generation, viewport geometry, and page interactions, and validated the completed slice with a green focused 32/32 Waves feature test run plus a green Angular build.

Phase 20 delivered so far:
- Added a new Vulkan Quantum domain scaffold in `visual-physics-vulkan` with dedicated core, payload, overlay, and report modules following the established multi-domain executable pattern.
- Implemented three validated Quantum scenarios: `particle-in-a-box`, `finite-potential-well-tunneling`, and `double-slit-interference`, each with scenario-specific diagnostics, shared render/export/import support, and deterministic viewport geometry.
- Wired the Vulkan executable to recognize `--domain quantum`, list all three Quantum scenarios, render/export/import each slice, and emit Quantum-specific snapshot, overlay, override, and report-summary output.
- Added Quantum CLI overrides for box length, quantum number, barrier energy and width controls, and double-slit wavelength and geometry controls, with scenario-specific validation for incompatible flags.
- Added Angular-aligned Quantum JSON import/export handling with roundtrip verification, strict malformed-payload rejection, and normalized handling for missing and non-finite numeric values.
- Added reusable Quantum report CSV builders plus direct CLI export through `--export-quantum-report-csv`, and surfaced compact Quantum report summaries in stdout when that export path is used.
- Added focused Vulkan coverage for Quantum scenario listing, render/export behavior for all three scenarios, import-precedence behavior for all three scenarios, invalid flag rejection, payload roundtrips and malformed-payload rejection, direct report-module coverage, report CSV executable coverage for all three scenarios, and invalid-domain rejection for the Quantum report flag.
- Validated the completed Phase 20 Quantum Vulkan scope with a green focused Quantum suite and a green full Vulkan `ctest --preset=vcpkg --output-on-failure` run at 134/134 passing tests.

Phase 15 delivered so far:
- Added a new Angular Thermodynamics route at `/thermodynamics` and updated the shared Angular shell copy so the new domain is reachable from the main navigation.
- Added the first Phase 15 feature scaffold in `visual-physics-angular-ui` with dedicated models, state service, analytics helpers, payload helpers, report helpers, page UI, and viewport renderer modules.
- Implemented an initial `ideal-gas-state` scenario that now computes equation-of-state pressure, gas density, a translational internal-energy proxy, compressibility-factor closure, RMS molecular speed diagnostics, and a sampled pressure-volume trend from the shared Thermodynamics page.
- Added a second `heat-conduction-slab` scenario that models transient slab diffusion with editable thickness, conductivity, diffusivity, initial temperature, boundary temperature, and time cursor, and now reports centerline temperature, boundary heat flux, Fourier number, normalized thermal settling, and sampled slab temperature profiles from the same shared Thermodynamics page.
- Added a third `carnot-cycle` scenario that models an ideal reversible heat-engine loop with editable working-gas amount, hot and cold reservoir temperatures, minimum volume, isothermal volume ratio, and time cursor, and now reports thermal efficiency, absorbed heat, rejected heat, net work, active cycle stage, and sampled pressure-volume loop points from the same shared Thermodynamics page.
- Added JSON export/import scaffolding plus summary-first CSV report export for the ideal-gas slice, so the active Thermodynamics scenario, overlay flags, sampled states, and diagnostics can round-trip through the Angular page and external analysis tools.
- Extended the shared Thermodynamics JSON payload, CSV report, page controls, insight cards, import restore flow, and WebGPU viewport so the same Phase 15 feature now switches cleanly between ideal-gas, transient heat-conduction, and Carnot-cycle diagnostics through one shared Angular surface.
- Added a WebGPU-backed Thermodynamics viewport for all three current slices: ideal-gas renders chamber geometry, a piston-position cue, and pressure or particle or energy guides; heat conduction renders slab geometry, centerline cues, temperature-profile guides, boundary markers, and heat-flux overlays; and Carnot cycle renders a pressure-volume loop, isotherm guides, a work cue, and the active cycle-state marker through the same shared renderer path.
- Added focused Angular coverage for Phase 15 across Thermodynamics state, payload parsing, analytics, report generation, viewport geometry, and page interactions for all three implemented slices, and validated the completed feature with a green focused 25/25 Thermodynamics feature test run plus a green Angular build.

Phase 14 delivered so far:
- Added a new Vulkan Fluid Mechanics domain scaffold in `visual-physics-vulkan` with dedicated core, payload, overlay, and report modules following the existing multi-domain executable pattern.
- Implemented an initial `buoyancy-block` scenario that models a rectangular block floating in a fluid and now reports equilibrium depth, immersion ratio, displaced volume, buoyant force, weight force, and net force through the shared Phase 14 executable flow.
- Extended the shared Fluid Mechanics path with a validated `poiseuille-pipe` slice that now computes laminar volumetric flow rate, average velocity, centerline velocity, Reynolds number, pressure gradient, axial pressure samples, and matching deterministic viewport cues.
- Extended the shared Fluid Mechanics path with a validated `open-channel-flow` slice that now computes Manning-style discharge, average velocity, hydraulic radius, Froude number, axial bed and water-surface samples, and matching deterministic viewport cues.
- Wired the Vulkan executable to recognize `--domain fluid-mechanics`, list all three validated Fluid Mechanics scenarios, render/export/import each slice, and emit scenario-specific Fluid Mechanics overlay and snapshot output.
- Added focused Vulkan coverage for Fluid Mechanics scenario listing, buoyancy/Poiseuille/open-channel render-export-roundtrip behavior, and core slice diagnostics, and validated the completed Phase 14 state with a green `cmake --preset=vcpkg && cmake --build --preset=vcpkg` run plus a green `ctest --preset=vcpkg --output-on-failure` run at 97/97 tests.

Phase 13 delivered so far:
- Added a new Angular Fluid Mechanics route at `/fluid-mechanics` and updated the shared Angular shell copy so the new domain is reachable from the main navigation.
- Added the first Phase 13 feature scaffold in `visual-physics-angular-ui` with dedicated models, state service, analytics helpers, payload helpers, report helpers, page UI, and viewport renderer modules.
- Implemented an initial `buoyancy-block` scenario that models a rectangular block floating in a fluid and now reports equilibrium depth, immersion ratio, displaced volume, buoyant force, weight, and net force from the shared Fluid Mechanics page.
- Added a second `poiseuille-pipe` scenario that models steady laminar flow through a circular pipe and now reports volumetric flow rate, average velocity, centerline velocity, Reynolds number, and pressure gradient from the same shared Phase 13 page shell.
- Added a third `open-channel-flow` scenario that models steady uniform rectangular-channel flow and now reports discharge, average velocity, hydraulic radius, Froude number, and bed-slope behavior from the same shared Phase 13 page shell.
- Added JSON export/import scaffolding plus summary-first CSV report export for the buoyancy slice, so the active scenario, overlay flags, sampled states, and diagnostics can round-trip through the Angular page and external analysis tools.
- Extended the shared JSON payload, CSV report, page controls, insight cards, and WebGPU viewport flow so the same Phase 13 feature now switches cleanly between buoyancy, laminar pipe-flow, and uniform open-channel diagnostics through one shared Angular surface.
- Added a WebGPU-backed viewport for all current Phase 13 slices: buoyancy renders tank geometry, waterline, block fill, equilibrium guide, and force-guide overlays; pipe flow renders pipe walls, centerline, flow arrows, and pressure-drop cues; and open-channel flow renders the sloped bed, water surface, flow arrows, and slope guidance through the same shared renderer path.
- Added focused Angular coverage for Phase 13 across state, payload parsing, analytics, report generation, viewport geometry, and page interactions for all three implemented scenarios, and validated the completed slice set with a green focused 25/25 feature test run plus a green Angular build.

Phase 12 delivered so far:
- Added a new Vulkan Electronics and Circuits domain with dedicated core, payload, overlay, and report modules in `visual-physics-vulkan`.
- Implemented an initial `rc-transient` scenario that models capacitor charging from a DC source with headless render/export, JSON roundtrip support, transient diagnostics, and shared viewport geometry.
- Added a second `resistor-network` scenario that models a two-resistor divider with source voltage plus upper and lower resistances, and now reports output voltage, branch current, equivalent resistance, and lower-branch power through the shared Phase 12 executable flow.
- Added a third `rl-transient` scenario that models first-order RL step response in time, and now reports inductor voltage decay, current rise, flux linkage, magnetic energy, and time constant through the same shared Phase 12 executable flow.
- Added a fourth `rc-low-pass` scenario that sweeps frequency through a first-order RC filter at the capacitor output, and now reports cutoff frequency, output amplitude, charge, stored energy, and shared frequency-domain render/export behavior through the same Phase 12 executable flow.
- Added a fifth `rc-high-pass` scenario that sweeps frequency through the complementary first-order RC filter at the resistor output, and now reports cutoff frequency, passband output amplitude, capacitor residual voltage, branch power, and shared frequency-domain render/export behavior through the same Phase 12 executable flow.
- Added a sixth `rl-low-pass` scenario that sweeps frequency through a first-order RL filter at the resistor output, and now reports cutoff frequency, output amplitude, inductor voltage, flux linkage, stored magnetic energy, and shared frequency-domain render/export behavior through the same Phase 12 executable flow.
- Added a seventh `rl-high-pass` scenario that sweeps frequency through the complementary first-order RL filter at the inductor output, and now reports cutoff frequency, passband output amplitude, resistor residual voltage, flux linkage, stored magnetic energy, and shared frequency-domain render/export behavior through the same Phase 12 executable flow.
- Added an eighth `rlc-resonance` scenario that sweeps frequency through a driven series RLC circuit and now reports resonant frequency, bandwidth, capacitor-side output amplitude, branch current, dissipated power, and shared frequency-domain render/export behavior through the same Phase 12 executable flow.
- Added a ninth `half-wave-rectifier` scenario that models a diode-clipped sinusoidal source driving a resistive load and now reports source waveform, rectified output voltage, load current, branch power, and shared time-domain render/export behavior through the same Phase 12 executable flow.
- Added a tenth `full-wave-rectifier` scenario that models a bridge-rectified sinusoidal source driving a resistive load and now reports source waveform, rectified output voltage, load current, branch power, ripple period, and shared time-domain render/export behavior through the same Phase 12 executable flow.
- Added an eleventh `smoothed-rectifier` scenario that models a bridge rectifier feeding a reservoir capacitor and resistive load and now reports source waveform, smoothed output voltage, capacitor charge, stored energy, ripple behavior, and shared time-domain render/export behavior through the same Phase 12 executable flow.
- Added a twelfth `rlc-response` scenario that models the damped step response of a driven series RLC circuit and now reports capacitor voltage, resistor voltage drop, current, charge, stored energy, and shared time-domain render/export behavior through the same Phase 12 executable flow.
- Wired the Vulkan executable to recognize `--domain electronics-and-circuits`, list the validated Electronics scenarios, render/export/import those scenarios, and emit Electronics-specific summary output.
- Added focused Vulkan executable coverage for Electronics scenario listing plus render/export/roundtrip behavior for `rc-transient`, `half-wave-rectifier`, `full-wave-rectifier`, `smoothed-rectifier`, `resistor-network`, `rl-transient`, `rc-low-pass`, `rc-high-pass`, `rl-low-pass`, `rl-high-pass`, `rlc-response`, and `rlc-resonance`, and validated the completed Phase 12 scope with a green `cmake --build --preset=vcpkg && ctest --preset=vcpkg --output-on-failure` run at 90/90 tests.

Phase 11 delivered so far:
- Added a new Angular Electronics and Circuits route at `/electronics-and-circuits` and updated the shared Angular shell copy so the new domain is reachable from the main navigation.
- Added the first Phase 11 feature scaffold in `visual-physics-angular-ui` with dedicated models, state service, analytics helpers, payload helpers, page UI, and viewport renderer modules.
- Implemented an initial `rc-transient` scenario that models capacitor charging from a DC source with editable source voltage, resistance, capacitance, initial charge, time cursor, steady-state readouts, and time-constant diagnostics.
- Added a fifth `rc-low-pass` scenario that sweeps frequency through a first-order RC filter with shared source, resistance, and capacitance controls, and now reports cutoff frequency, gain, phase lag, stored charge, CSV export metadata, plot guides, and shared WebGPU viewport cues.
- Added a sixth `rc-high-pass` scenario that sweeps the complementary first-order RC filter at the resistor output, and now reports cutoff frequency, passband gain, phase lead, dissipated power, capacitor residual voltage, CSV export metadata, plot guides, and shared WebGPU viewport cues.
- Added a seventh `rl-low-pass` scenario that sweeps a first-order RL filter at the resistor output, and now reports cutoff frequency, gain, phase lag, magnetic energy, inductor voltage, CSV export metadata, plot guides, and shared WebGPU viewport cues.
- Added an eighth `rl-high-pass` scenario that sweeps the complementary first-order RL filter at the inductor output, and now reports cutoff frequency, passband gain, phase lead, magnetic energy, resistor residual voltage, CSV export metadata, plot guides, and shared WebGPU viewport cues.
- Added a ninth `rl-transient` scenario that models first-order RL step response in time, and now reports time constant, current rise, remaining inductor voltage, flux linkage, magnetic energy, CSV export metadata, plot guides, and shared WebGPU viewport cues.
- Added a tenth `half-wave-rectifier` scenario that models diode-clipped AC delivery into a resistive load, and now reports peak output voltage, average output voltage, conduction duty, peak current, CSV export metadata, plot guides, and shared WebGPU viewport cues.
- Added an eleventh `full-wave-rectifier` scenario that models bridge-rectified AC delivery into a resistive load, and now reports peak output voltage, average output voltage, RMS output voltage, ripple frequency, CSV export metadata, plot guides, and shared WebGPU viewport cues.
- Added a twelfth `smoothed-rectifier` scenario that models a bridge rectifier feeding a reservoir capacitor and resistive load in steady ripple operation, and now reports average DC output, minimum output voltage, ripple voltage, ripple factor, capacitor charge and stored energy, CSV export metadata, plot guides, and shared WebGPU viewport cues.
- Added a second `resistor-network` scenario that models a two-resistor divider with editable source voltage plus upper and lower resistances, and now reports output voltage, branch current, equivalent resistance, and lower-branch power in the shared Phase 11 page shell.
- Added a first `rlc-response` scenario that models a driven series RLC step response with editable source voltage, resistance, inductance, capacitance, time-evolving capacitor voltage and current, stored-energy diagnostics, and damped-oscillation insight cards.
- Added a fourth `rlc-resonance` scenario that sweeps drive frequency through a series RLC branch with the existing source, resistance, inductance, and capacitance controls, and now reports resonant frequency, quality factor, capacitor-voltage gain, current peak, dissipated power, shared summary rows, CSV export, plot guides, and WebGPU viewport cues.
- Upgraded the `rlc-response` slice with sampled-response diagnostics for damping regime, peak overshoot, settling time, and current reversals, so the page now explains the oscillatory behavior instead of showing only raw instantaneous values.
- Upgraded the shared WebGPU viewport for `rlc-response` so the renderer now adds settling-band guides, overshoot cues, and current-reversal markers instead of reusing only the generic transient trace treatment.
- Added JSON export/import scaffolding for the RC transient slice so the active scenario, time cursor, overlays, and sampled transient history can round-trip through the Angular page.
- Added file-based JSON import parity and explicit browser-only export messaging for the Phase 11 page, so the new Electronics and Circuits workflows now match the completed Angular domain export/import pattern instead of relying only on pasted JSON.
- Added report-friendly CSV export for the current Phase 11 scenarios, so RC transient, resistor-network, and RLC sampled circuit diagnostics can now be downloaded directly for spreadsheet or notebook analysis without re-parsing the JSON payload.
- Upgraded the `rlc-response` CSV export to prepend summary metadata for damping regime, damping ratio, overshoot, settling time, and current reversals before the sampled waveform rows, so downstream analysis does not need to recompute those diagnostics from scratch.
- Normalized the RC transient and resistor-network CSV exports to the same summary-first report shape, so all current Phase 11 scenarios now emit a compact diagnostics block before their sampled data rows.
- Added a shared scenario-summary panel to the Angular page that reuses the same report-summary rows as the CSV export, so the on-page diagnostics and downloadable report metadata now stay in sync across all current Phase 11 scenarios.
- Added labeled scenario-specific plot guides to the Angular SVG charts, so the summary diagnostics now have direct visual markers in the RC, resistor-network, RLC response, and resonance-sweep plots instead of living only in cards and export metadata.
- Added hover-driven plot readouts with a nearest-sample cursor across the shared Angular SVG charts, so the current RC, resistor-network, RLC response, and resonance-sweep traces can now be inspected directly instead of only through static labels and summary cards.
- Added keyboard-accessible plot inspection on top of the shared nearest-sample cursor, so the same RC, resistor-network, RLC response, and resonance-sweep readouts now work through plot focus plus arrow-key navigation instead of requiring pointer hover.
- Added explicit plot sample controls plus a live readout announcement on top of the shared cursor, so Phase 11 charts now support button-based sample stepping and screen-reader-friendly readout updates instead of relying only on hover or raw SVG focus behavior.
- Added a shared WebGPU renderer path for the current Phase 11 scenarios: RC transient uses sampled trace geometry with a live marker, resistor-network uses a deterministic divider schematic with measurement cues, RLC response adds sampled settling-band, overshoot, and current-reversal guides, and the resonance sweep now adds resonant-frequency plus active-frequency sweep cues on top of the shared trace rendering.
- Added focused Angular coverage for the completed Phase 11 scope across state, payload parsing, analytics, CSV report generation, half-wave, full-wave, and smoothed-rectifier plus RC and RL transient/filter scenarios, resonance and RLC diagnostics, page interactions, browser-style JSON workflows, multi-scenario switching, plot guides, hover readouts, keyboard plot inspection, live readout controls, and viewport geometry, and validated the feature with a green Angular build plus a focused 85/85 feature test run.

- Phase 11 Angular implementation is complete for the planned Electronics and Circuits scope.

Phase 10 delivered so far:
- Added a new Vulkan Computational Physics core module with a first `projectile-solver-comparison` scenario that compares Euler, symplectic, and RK4 integration against a high-resolution RK4 reference for a drag-projectile trajectory.
- Added a second Vulkan Computational Physics `orbital-solver-comparison` scenario that reuses the same solver stack under inverse-square gravity and now reports orbital specific-energy and angular-momentum drift for Euler, symplectic, and RK4 against the high-resolution reference orbit.
- Added a third Vulkan Computational Physics `spring-oscillator-comparison` scenario that reuses the same solver stack for a lightly damped 2D spring-mass oscillator and now reports total-energy drift, displacement-magnitude drift, and wrapped phase-angle drift for Euler, symplectic, and RK4 against the high-resolution reference trajectory.
- Added a Vulkan Computational Physics payload module covering Angular-aligned import/export for scenario state, snapshot metrics, sampled solver trajectories, convergence-study rows, and overlay flags for the new projectile solver-comparison slice.
- Extended the Vulkan Computational Physics export payload to include sampled `orbitalInvariantHistory` and `springInvariantHistory` arrays, so the long-horizon drift diagnostics already computed for the orbital and spring scenarios now survive JSON export alongside snapshot and convergence data.
- Added Angular-aligned Computational Physics export metadata in Vulkan for `solverRecommendation`, `solverRecommendationRanking`, `observedOrders`, and `convergencePlotGuides`, so exported convergence payloads now preserve timestep recommendations, tolerance guides, and observed-order estimates instead of only raw error tables.
- Added a Vulkan Computational Physics report module that builds Angular-aligned convergence CSV, orbital invariant-history CSV, and spring invariant-history CSV artifacts from the validated solver-comparison diagnostics, closing the reusable report-generation gap even before dedicated CLI export flags exist.
- Wired the Vulkan executable to export those Computational Physics CSV report artifacts directly with `--export-convergence-csv`, `--export-orbital-invariant-csv`, and `--export-spring-invariant-csv`, so Phase 10 now covers both reusable report builders and end-to-end CLI emission for the validated solver-comparison scenarios.
- Added a Vulkan Computational Physics overlay module for reference, Euler, symplectic, and RK4 trajectory rendering plus current-snapshot error bars and solver markers in the shared headless viewport.
- Wired the Vulkan executable to recognize `--domain computational-physics`, list all three validated Computational Physics scenarios, render/export/import those scenarios, and emit Computational Physics-specific overlay, error, orbital-invariant, and spring-drift summary output.
- Added Computational Physics CLI overrides for projectile initial position, initial velocity, gravity, drag coefficient, mass, orbital center, gravitational parameter, spring anchor, spring constant, damping coefficient, comparison timestep, reference timestep, and trajectory/error-bar overlay toggles, with scenario-specific validation for incompatible flags.
- Added focused Vulkan coverage for Computational Physics scenario listing, projectile/orbital/spring render-export roundtrip behavior, CSV artifact export, invalid orbital and spring CLI combinations, invalid non-Computational-Physics CSV export usage, and projectile/orbital/spring core convergence sampling, and validated the completed Phase 10 scope with a green `cmake --build --preset=vcpkg && ctest --preset=vcpkg --output-on-failure` run at 77/77 tests.

- Phase 10 Vulkan implementation is complete for the planned Computational / Numerical Physics scope.

Phase 9 delivered so far:
- Added a new Angular Computational / Numerical Physics route at `/computational-physics` and updated the Angular shell copy so the new domain is reachable from the shared navigation.
- Added the first Phase 9 feature scaffold in `visual-physics-angular-ui` with dedicated models, state service, analytics helpers, payload helpers, page UI, and viewport renderer modules.
- Implemented initial `projectile-solver-comparison` and `orbital-solver-comparison` scenarios that compare Euler and RK4 integration against high-resolution reference trajectories with deterministic drift and speed-error readouts.
- Expanded the solver-comparison stack to include a third `symplectic` integrator so orbital stability trade-offs are visible alongside Euler and RK4.
- Added a timestep-convergence study to the Angular Computational Physics page and export payload so each scenario now reports how Euler, symplectic, and RK4 final-position error change as the comparison step is refined.
- Added orbital-specific invariant diagnostics so the Angular Computational Physics page now reports energy drift and angular-momentum drift for Euler, symplectic, and RK4 during the orbital solver-comparison scenario.
- Added orbital-aware convergence recommendations for final energy and angular-momentum drift, so the timestep study now reports orbit-stability `Δt` guidance in the Angular UI and convergence CSV instead of relying only on final position error for the orbital case.
- Added a scenario-aware solver recommendation summary to the Angular Computational Physics convergence panel, so projectile, orbital, and spring runs now identify the solver that preserves all active stability tolerances at the coarsest supported `Δt` and explain the limiting metric.
- Added the same scenario-aware solver recommendation summary to the Angular Computational Physics convergence CSV and JSON export payload, so the best-solver decision and its limiting metric survive handoff outside the live page.
- Added a per-solver stability ranking to the Angular Computational Physics convergence panel, so Euler, symplectic, and RK4 are now ordered by the coarsest viable `Δt` for the active scenario and each solver names the metric that limits or disqualifies it.
- Added the full per-solver stability ranking to the Angular Computational Physics convergence CSV and JSON export payload, so handoff artifacts now preserve the complete ranking order, limiting metric, and eligibility status instead of only the winning solver.
- Added scenario-specific convergence plots to the Angular Computational Physics convergence panel, so orbital runs now visualize energy and angular-momentum drift versus `Δt` and spring runs now visualize energy and phase drift versus `Δt` instead of relying only on text recommendations.
- Added scenario-specific observed-order summaries to the Angular Computational Physics convergence panel, so orbital and spring runs now report how quickly their active drift metrics converge as `Δt` is refined instead of estimating order only from final position error.
- Added the same scenario-specific observed-order summaries to the Angular Computational Physics convergence CSV and JSON export payload, so orbital and spring convergence-rate diagnostics survive handoff outside the live page instead of staying UI-only.
- Added tolerance guide lines to the Angular Computational Physics convergence plots, so the shared position-error chart and the orbital/spring stability charts now show the exact visual cutoff used by the timestep recommendations instead of relying only on text thresholds.
- Added best-recommended `Δt` marker lines to the Angular Computational Physics convergence plots, so the shared and scenario-specific stability charts now expose both the admissible threshold and the winning timestep directly on the plot instead of leaving the recommendation only in text.
- Added structured convergence plot-guide metadata to the Angular Computational Physics JSON export payload, so the shared and scenario-specific tolerance lines plus best-`Δt` markers can be reconstructed outside the live page instead of being lost at export time.
- Added explicit convergence plot-guide columns to the Angular Computational Physics convergence CSV, so the shared and scenario-specific tolerance lines plus best-`Δt` markers now survive both CSV and JSON export paths instead of only the live UI.
- Added the best stable solver recommendation to the Angular Computational Physics insight cards, so the recommended solver and timestep now remain visible in the top summary deck instead of only inside the detailed convergence section.
- Added sampled orbital invariant history to the Angular Computational Physics page and JSON export payload so long-horizon energy and angular-momentum drift can be inspected across the full orbit, not only at the active time cursor.
- Replaced the Phase 9 text-only convergence and orbital invariant-history summaries with deterministic SVG plots, and added focused analytics coverage so those chart paths are regression-tested alongside the page behavior.
- Added report-friendly CSV exports for timestep convergence and orbital invariant history, so the current Phase 9 diagnostics can be downloaded directly for spreadsheet or notebook analysis without re-parsing the JSON payload.
- Added observed-order estimation for the timestep convergence study in both the Angular UI and CSV report export, so the current Phase 9 slice now reports empirical accuracy order in addition to raw refinement error.
- Added empirical timestep recommendations derived from the convergence study, so the Angular UI and convergence CSV now flag the coarsest sampled solver step that stays within a scenario-scaled position-error tolerance.
- Added a `spring-oscillator-comparison` scenario with spring-anchor, spring-constant, and damping controls, so Phase 9 now compares solver phase drift and numerical damping on repeated oscillatory motion in addition to projectile and orbital paths.
- Added spring-specific diagnostics for total-energy drift and displacement-amplitude error, so the oscillator scenario now exposes the same kind of solver-specific numerical readouts that the orbital scenario already exposes for conserved quantities.
- Added sampled spring drift history with deterministic energy and amplitude SVG plots, CSV export, and JSON payload export support, so the oscillator scenario now has a long-horizon stability view parallel to the orbital invariant-history flow.
- Added spring phase-angle drift diagnostics and history plotting, so the oscillator scenario now measures phase error directly in both the snapshot readouts and the long-horizon drift view instead of inferring it only from amplitude and path deviation.
- Added spring-aware convergence recommendations for final energy and phase drift, so the timestep study now reports spring-specific `Δt` guidance in the Angular UI and convergence CSV instead of ranking oscillatory stability only by final position error.
- Added scenario switching and scenario-specific controls for projectile and orbital solver-comparison flows, including orbital center and gravitational-parameter inputs for the long-horizon orbit case.
- Expanded scenario switching and scenario-specific controls to cover projectile, orbital, and spring-mass solver-comparison flows, including spring-anchor, spring-constant, and damping inputs for the oscillatory case.
- Added JSON export/import scaffolding for Phase 9 so the focused solver method, time cursor, scenario parameters, overlays, and sampled comparison paths can round-trip through the Angular page, including the new symplectic trajectory overlay.
- Replaced the initial temporary canvas fallback with the repo's standard WebGPU renderer path for the Phase 9 viewport.
- Added focused Angular coverage for the current Phase 9 slice across analytics, report generation, state, payload, page, and renderer behavior, and validated the new feature with a green Angular build plus a focused 37/37 feature test run.

Phase 8 delivered so far:
- Added a new Vulkan Electromagnetism core module with solver-backed `point-charge-electrostatics`, `moving-charge-magnetic-field`, `current-loop-magnetic-field`, `capacitor-potential-field`, and `electromagnetic-induction` scenario contracts.
- Added an Angular-compatible Vulkan Electromagnetism payload module covering import/export, scenario-specific fields, overlay flags, and preserved `snapshot.timeSeconds` round-trips.
- Added a Vulkan Electromagnetism overlay module for field, force, potential-guide, trajectory, and marker geometry generation.
- Wired the Vulkan executable to recognize `--domain electromagnetism`, list all five Electromagnetism scenarios, render/export/import those scenarios, and emit Electromagnetism-specific summary output.
- Added Electromagnetism CLI overrides for probe/source positions, charge values, magnetic-field strength, current-loop controls, capacitor spacing and voltage, and induction flux/inductance controls.
- Tightened Electromagnetism CLI validation so domain-inapplicable flags and scenario-inapplicable overlay or parameter flags now fail explicitly instead of being silently accepted.
- Strengthened Vulkan Electromagnetism roundtrip verification from parse-only smoke checks to structural scenario/snapshot/sample/overlay validation, and added executable regressions that pin exact current-loop and induction summary output.
- Added focused Vulkan coverage for Electromagnetism core sampling, payload parsing, overlay geometry, scenario listing, exact executable render/export checks for all five scenarios, import/export overlay preservation, induction time restoration, and scenario-specific CLI rejection behavior.
- Updated the Vulkan project README with the initial Electromagnetism command examples, roundtrip flow, overlay toggles, and scenario-specific override matrix.

Phase 7 delivered so far:
- Added the Angular application shell wiring for Electromagnetism, including the `/electromagnetism` route, navigation entry, and updated phase header wording.
- Added the new Electromagnetism feature foundation with shared scenario models, a signal-driven state service, analytics helpers, and JSON import/export payload contracts.
- Implemented the first solver-backed Phase 7 scenarios for `point-charge-electrostatics` and `moving-charge-magnetic-field`, while scaffolding the remaining requested scenarios in the same domain architecture.
- Added the initial Electromagnetism page with scenario switching, parameter controls for the first two scenarios, insight cards, and JSON round-trip UI.
- Wired the first Electromagnetism WebGPU viewport slice for `point-charge-electrostatics` and `moving-charge-magnetic-field`, including rendered field/force guides, sampled trajectory rendering, and a shared time slider for the moving-charge scenario.
- Added focused Angular specs for the Electromagnetism state service time path and the new viewport geometry builder.
- Activated the remaining planned Phase 7 scenarios in the Angular page and renderer: `current-loop-magnetic-field`, `capacitor-potential-field`, and `electromagnetic-induction` now have dedicated controls, readouts, viewport geometry, and focused state/renderer test coverage.
- Added focused Angular coverage for the Electromagnetism page, payload helpers, and analytics helpers, including scenario switching, overlay export-preview updates, JSON restore, payload validation, and scenario-specific insight-card behavior.
- Refined the later Electromagnetism scenarios so they behave less like placeholders: current-loop and capacitor now use an editable probe position, while electromagnetic induction now evolves over time with a real Phase 7 time slider and time-varying flux / emf behavior.
- Added richer renderer detail for the later Electromagnetism scenarios: current-loop now shows probe-relative field cues and contour rings, capacitor now renders interior field guides tied to the probe, and induction now renders a waveform-style time-history cue alongside the coil geometry.
- Fixed the Electromagnetism import path so `snapshot.timeSeconds` now restores correctly for time-evolving scenarios, and extended focused import/export coverage to assert scenario-specific fields such as `probePoint`, `loopRadius`, `plateSeparation`, and induction restore time.
- Added file-based JSON export/import support to the Electromagnetism page so the feature now matches the completed Statics round-trip workflow instead of relying only on clipboard copy and pasted JSON.
- Increased Electromagnetism renderer fidelity by adding arrowheaded field/force vectors and denser later-scenario sampling guides, especially for current-loop contours, capacitor field lanes, and induction field cross-guides.
- Tightened Electromagnetism overlay semantics so unsupported toggles are disabled per scenario and excluded from the effective render/export path, which makes magnetic-field and trajectory controls behave consistently across scenario switches.
- Added a broader Electromagnetism page regression sequence that combines import/restore, overlay intent, and repeated scenario switching in one focused test flow instead of only isolated assertions.
- Added browser-style export coverage for the Electromagnetism page, including clipboard copy and downloadable JSON export assertions, and fixed success reporting so file export only reports success when the browser export path actually runs.
- Added Electromagnetism export failure-path coverage for unavailable clipboard and unavailable browser file export, so the page now reports those browser constraints explicitly instead of only exercising the successful export paths.
- Added a full component-level Electromagnetism round-trip regression that exports a customized scenario, switches away, restores from the exported file, and verifies the restored scenario state and overlays.

Phase 7 completion summary:
- The Angular Electromagnetism feature is now functionally complete for the current roadmap scope, with focused coverage across solver behavior, renderer geometry, payload parsing, scenario switching, overlay semantics, JSON import/export success and failure paths, and full component-level round-trip restore flows.

Phase 6 delivered so far:
- Added a new Vulkan statics core module with solver-backed `beam-support`, `inclined-plane`, and `pulley-equilibrium` scenario contracts.
- Added an Angular-compatible Vulkan statics payload module covering import/export, overlay flags, and explicit `secondaryMass` support.
- Wired the Vulkan executable to recognize `--domain statics` and list the three statics scenarios.
- Implemented a validated Vulkan statics executable path for render/export/roundtrip flows, with direct coverage for beam-support and import/overlay coverage across the statics domain.
- Added statics-specific overlay toggles for applied force, reaction forces, and residual guides, with import-preservation and all-off CLI coverage.
- Tightened CLI validation so scenario-inapplicable statics overrides now fail explicitly instead of being silently accepted.
- Added direct executable render/export coverage for `inclined-plane` and `pulley-equilibrium`, so all three planned Statics scenarios now execute through the Vulkan binary with focused tests.
- Improved the base Vulkan statics viewport geometry for incline and pulley scenes so the scenario silhouettes are clearer in headless renders.
- Added statics-specific equilibrium summary output in the Vulkan executable stdout, including stability, residual force/torque, and resolved reaction-force values.
- Added pure statics geometry regression coverage for axes, marker placement, beam-support geometry, inclined-plane geometry, and pulley geometry so viewport-shape regressions are caught below the executable layer.
- Extracted Vulkan statics overlay-line generation into a reusable module and added pure overlay regression coverage for beam, incline, pulley, and all-off overlay states.
- Cleaned up statics overlay rendering so stable scenarios no longer emit zero-length residual-guide geometry.
- Extended the statics render path to populate overlay endpoint markers for visible force guides, improving readability in headless renders.
- Added focused beam-support, inclined-plane, and pulley-equilibrium regression coverage for the statics overlay-marker path at both the pure geometry and executable levels.
- Applied a final statics render-polish pass with scenario-aware overlay marker sizing so beam, incline, and pulley guides read more clearly in the shared viewport.
- Expanded focused Vulkan coverage for statics solver behavior, payload roundtrip, statics scenario listing, overlay persistence, and scenario-specific CLI rejection behavior.
- Tightened executable statics summary coverage so the beam-support, inclined-plane, and pulley-equilibrium regressions now assert exact residual-force and reaction values, not just the stability flag.
- Updated the Vulkan project README so the statics CLI docs now spell out the exact per-scenario override matrix and imported-scenario validation behavior.

Phase 6 remaining slices:
- Phase 6 Vulkan statics implementation is complete for the planned scope.

Phase 5 delivered so far:
- Beam-support equilibrium solver with editable support positions, load position, and load magnitude.
- Inclined-plane equilibrium solver with editable mass, angle, and friction coefficient.
- Pulley-equilibrium solver with explicit left and right masses.
- Shared Statics JSON export/import payload flow with restore support.
- Shared Statics insight cards and residual summaries across all three scenarios.
- WebGPU viewport rendering for beam-support, inclined-plane, and pulley-equilibrium.
- Focused Angular coverage for Statics state, payload parsing, analytics, page interactions, and renderer geometry.

Phase 5 remaining slices:
- Angular Statics implementation is complete for the planned Phase 5 scope.
- Next implementation target: continue Phase 6 Statics Vulkan parity from the validated beam-support slice.

Phase 5 completion checklist:
- Done: beam-support solver, controls, and viewport.
- Done: inclined-plane solver, controls, and viewport.
- Done: pulley-equilibrium solver, controls, and viewport.
- Done: Statics JSON export/import round-trip support.
- Done: focused Angular coverage for state, analytics, payloads, page interactions, and viewport geometry.
- Done: final wording and exported payload examples for end-user clarity.
- Next: Phase 6 Vulkan parity planning and implementation.

Phase 5 payload field guide:
- Beam-support exports use `loadPosition` and `loadMagnitude` for the applied beam load.
- Inclined-plane exports use `mass`, `angleDegrees`, and `frictionCoefficient` for the contact-force solve.
- Pulley-equilibrium exports use `mass` for the left load and `secondaryMass` for the right load.

Example Phase 5 scenario fragments:

```json
{
	"id": "beam-support",
	"loadPosition": 5,
	"loadMagnitude": 12
}
```

```json
{
	"id": "inclined-plane",
	"mass": 2,
	"angleDegrees": 30,
	"frictionCoefficient": 0.7
}
```

```json
{
	"id": "pulley-equilibrium",
	"mass": 1,
	"secondaryMass": 1.5
}
```
