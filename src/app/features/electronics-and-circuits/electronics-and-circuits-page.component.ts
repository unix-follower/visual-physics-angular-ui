import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import {
  buildGraphPath,
  buildInsightCards,
  buildPlotGuides,
} from "./electronics-and-circuits-analytics"
import {
  buildExportPayload,
  ElectronicsAndCircuitsOverlayOptions,
  parseImportPayload,
} from "./electronics-and-circuits-payload"
import {
  buildCircuitReportCsv,
  buildCircuitReportSummaryRows,
} from "./electronics-and-circuits-report"
import {
  EditableElectronicsAndCircuitsField,
  ElectronicsAndCircuitsStateService,
} from "./electronics-and-circuits-state.service"
import {
  ElectronicsAndCircuitsSample,
  ElectronicsAndCircuitsScenarioId,
} from "./electronics-and-circuits.models"
import { ElectronicsAndCircuitsWebGpuRenderer } from "./electronics-and-circuits-webgpu-renderer"

type OverlayKey = keyof ElectronicsAndCircuitsOverlayOptions

interface PlotReadoutRow {
  label: string
  value: string
}

@Component({
  selector: "app-electronics-and-circuits-page",
  templateUrl: "./electronics-and-circuits-page.component.html",
  styleUrl: "./electronics-and-circuits-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectronicsAndCircuitsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(ElectronicsAndCircuitsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: ElectronicsAndCircuitsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)
  private readonly hoveredSampleIndex = signal<number | null>(null)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly currentTimeSeconds = this.state.currentTimeSeconds
  protected readonly sampledStates = this.state.sampledStates
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly webGpuReady = signal(false)
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<ElectronicsAndCircuitsOverlayOptions>({
    showVoltageTrace: true,
    showCurrentTrace: true,
    showChargeTrace: false,
    showEnergyMarkers: true,
  })
  protected readonly rcTransientActive = computed(
    () => this.selectedScenario().id === "rc-transient",
  )
  protected readonly rlTransientActive = computed(
    () => this.selectedScenario().id === "rl-transient",
  )
  protected readonly halfWaveRectifierActive = computed(
    () => this.selectedScenario().id === "half-wave-rectifier",
  )
  protected readonly fullWaveRectifierActive = computed(
    () => this.selectedScenario().id === "full-wave-rectifier",
  )
  protected readonly smoothedRectifierActive = computed(
    () => this.selectedScenario().id === "smoothed-rectifier",
  )
  protected readonly rcLowPassActive = computed(() => this.selectedScenario().id === "rc-low-pass")
  protected readonly rcHighPassActive = computed(
    () => this.selectedScenario().id === "rc-high-pass",
  )
  protected readonly rlLowPassActive = computed(() => this.selectedScenario().id === "rl-low-pass")
  protected readonly rlHighPassActive = computed(
    () => this.selectedScenario().id === "rl-high-pass",
  )
  protected readonly resistorNetworkActive = computed(
    () => this.selectedScenario().id === "resistor-network",
  )
  protected readonly rlcResonanceActive = computed(
    () => this.selectedScenario().id === "rlc-resonance",
  )
  protected readonly rlcResponseActive = computed(
    () => this.selectedScenario().id === "rlc-response",
  )
  protected readonly showTimeControl = computed(() => !this.resistorNetworkActive())
  protected readonly frequencySweepActive = computed(
    () =>
      this.rcLowPassActive() ||
      this.rcHighPassActive() ||
      this.rlLowPassActive() ||
      this.rlHighPassActive() ||
      this.rlcResonanceActive(),
  )
  protected readonly lowPassGain = computed(() => {
    if (!this.rcLowPassActive()) {
      return 0
    }

    const sourceVoltage = Math.abs(this.selectedScenario().sourceVoltage)
    return sourceVoltage <= 1e-6 ? 0 : Math.abs(this.currentState().outputVoltage) / sourceVoltage
  })
  protected readonly lowPassPhaseLagDegrees = computed(() => {
    if (!this.rcLowPassActive()) {
      return 0
    }

    return (
      -(
        Math.atan(
          2 *
            Math.PI *
            this.currentState().timeSeconds *
            this.selectedScenario().resistance *
            this.selectedScenario().capacitance,
        ) * 180
      ) / Math.PI
    )
  })
  protected readonly highPassGain = computed(() => {
    if (!this.rcHighPassActive()) {
      return 0
    }

    const sourceVoltage = Math.abs(this.selectedScenario().sourceVoltage)
    return sourceVoltage <= 1e-6 ? 0 : Math.abs(this.currentState().outputVoltage) / sourceVoltage
  })
  protected readonly highPassPhaseLeadDegrees = computed(() => {
    if (!this.rcHighPassActive()) {
      return 0
    }

    return (
      (Math.atan(
        1 /
          Math.max(
            2 *
              Math.PI *
              this.currentState().timeSeconds *
              this.selectedScenario().resistance *
              this.selectedScenario().capacitance,
            1e-6,
          ),
      ) *
        180) /
      Math.PI
    )
  })
  protected readonly rlLowPassGain = computed(() => {
    if (!this.rlLowPassActive()) {
      return 0
    }

    const sourceVoltage = Math.abs(this.selectedScenario().sourceVoltage)
    return sourceVoltage <= 1e-6 ? 0 : Math.abs(this.currentState().outputVoltage) / sourceVoltage
  })
  protected readonly rlLowPassPhaseLagDegrees = computed(() => {
    if (!this.rlLowPassActive()) {
      return 0
    }

    return (
      -(
        Math.atan(
          (2 *
            Math.PI *
            this.currentState().timeSeconds *
            (this.selectedScenario().inductance ?? 0)) /
            Math.max(this.selectedScenario().resistance, 1e-6),
        ) * 180
      ) / Math.PI
    )
  })
  protected readonly rlHighPassGain = computed(() => {
    if (!this.rlHighPassActive()) {
      return 0
    }

    const sourceVoltage = Math.abs(this.selectedScenario().sourceVoltage)
    return sourceVoltage <= 1e-6 ? 0 : Math.abs(this.currentState().outputVoltage) / sourceVoltage
  })
  protected readonly rlHighPassPhaseLeadDegrees = computed(() => {
    if (!this.rlHighPassActive()) {
      return 0
    }

    return (
      (Math.atan(
        Math.max(this.selectedScenario().resistance, 1e-6) /
          Math.max(
            2 *
              Math.PI *
              this.currentState().timeSeconds *
              (this.selectedScenario().inductance ?? 0),
            1e-6,
          ),
      ) *
        180) /
      Math.PI
    )
  })
  protected readonly metrics = computed(() => ({
    sourceVoltage: this.selectedScenario().sourceVoltage,
    resistance: this.selectedScenario().resistance,
    secondaryResistance: this.selectedScenario().secondaryResistance ?? 0,
    capacitance: this.selectedScenario().capacitance,
    inductance: this.selectedScenario().inductance ?? 0,
    initialCharge: this.selectedScenario().initialCharge,
    timeConstant: this.currentState().timeConstant,
  }))
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly voltagePath = computed(() =>
    buildGraphPath(
      this.sampledStates(),
      this.resistorNetworkActive() ||
        this.rcHighPassActive() ||
        this.rlLowPassActive() ||
        this.rlHighPassActive() ||
        this.rlTransientActive() ||
        this.halfWaveRectifierActive() ||
        this.fullWaveRectifierActive() ||
        this.smoothedRectifierActive()
        ? "outputVoltage"
        : "capacitorVoltage",
    ),
  )
  protected readonly currentPath = computed(() => buildGraphPath(this.sampledStates(), "current"))
  protected readonly tertiaryPath = computed(() =>
    buildGraphPath(
      this.sampledStates(),
      this.resistorNetworkActive()
        ? "branchPower"
        : this.halfWaveRectifierActive()
          ? "branchPower"
          : this.fullWaveRectifierActive()
            ? "branchPower"
            : this.smoothedRectifierActive()
              ? "storedEnergy"
              : this.rlTransientActive()
                ? "storedEnergy"
                : this.rcLowPassActive()
                  ? "storedEnergy"
                  : this.rcHighPassActive()
                    ? "branchPower"
                    : this.rlLowPassActive()
                      ? "storedEnergy"
                      : this.rlHighPassActive()
                        ? "storedEnergy"
                        : this.rlcResponseActive()
                          ? "storedEnergy"
                          : this.rlcResonanceActive()
                            ? "branchPower"
                            : "charge",
    ),
  )
  protected readonly timeControlLabel = computed(() =>
    this.frequencySweepActive() ? "Frequency (Hz)" : "Time (s)",
  )
  protected readonly timeControlStep = computed(() =>
    this.frequencySweepActive()
      ? 0.1
      : this.halfWaveRectifierActive() ||
          this.fullWaveRectifierActive() ||
          this.smoothedRectifierActive()
        ? 0.0005
        : 0.05,
  )
  protected readonly timeControlValue = computed(() =>
    this.halfWaveRectifierActive() ||
    this.fullWaveRectifierActive() ||
    this.smoothedRectifierActive()
      ? this.currentState().timeSeconds.toFixed(4)
      : this.currentState().timeSeconds.toFixed(2),
  )
  protected readonly timeControlUnit = computed(() => (this.frequencySweepActive() ? "Hz" : "s"))
  protected readonly primaryPlotLabel = computed(() =>
    this.resistorNetworkActive()
      ? "Divider output voltage"
      : this.halfWaveRectifierActive()
        ? "Rectified output voltage"
        : this.fullWaveRectifierActive()
          ? "Full-wave output voltage"
          : this.smoothedRectifierActive()
            ? "Smoothed DC output"
            : this.rlTransientActive()
              ? "Inductor voltage"
              : this.rcLowPassActive()
                ? "Filter output voltage"
                : this.rcHighPassActive()
                  ? "High-pass output voltage"
                  : this.rlLowPassActive()
                    ? "RL output voltage"
                    : this.rlHighPassActive()
                      ? "Inductor output voltage"
                      : this.rlcResonanceActive()
                        ? "Capacitor voltage gain"
                        : "Capacitor voltage",
  )
  protected readonly secondaryPlotLabel = computed(() =>
    this.resistorNetworkActive()
      ? "Branch current"
      : this.halfWaveRectifierActive()
        ? "Load current"
        : this.fullWaveRectifierActive()
          ? "Load current"
          : this.smoothedRectifierActive()
            ? "Load current"
            : this.rlTransientActive()
              ? "RL branch current"
              : this.rcLowPassActive()
                ? "Filter branch current"
                : this.rcHighPassActive()
                  ? "High-pass branch current"
                  : this.rlLowPassActive()
                    ? "RL branch current"
                    : this.rlHighPassActive()
                      ? "RL high-pass current"
                      : this.rlcResonanceActive()
                        ? "Sweep current"
                        : this.rlcResponseActive()
                          ? "Circuit current"
                          : "Charging current",
  )
  protected readonly tertiaryPlotLabel = computed(() =>
    this.resistorNetworkActive()
      ? "Load power"
      : this.halfWaveRectifierActive()
        ? "Load power"
        : this.fullWaveRectifierActive()
          ? "Load power"
          : this.smoothedRectifierActive()
            ? "Capacitor energy"
            : this.rlTransientActive()
              ? "Magnetic energy"
              : this.rcLowPassActive()
                ? "Stored energy"
                : this.rcHighPassActive()
                  ? "Dissipated power"
                  : this.rlLowPassActive()
                    ? "Magnetic energy"
                    : this.rlHighPassActive()
                      ? "Magnetic energy"
                      : this.rlcResonanceActive()
                        ? "Dissipated power"
                        : this.rlcResponseActive()
                          ? "Stored energy"
                          : "Charge",
  )
  protected readonly plotGuides = computed(() =>
    buildPlotGuides(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly hoveredSample = computed(() => {
    const index = this.hoveredSampleIndex()
    if (index === null) {
      return null
    }

    return this.sampledStates()[index] ?? null
  })
  protected readonly hoveredCursorPath = computed(() => {
    const index = this.hoveredSampleIndex()
    const samples = this.sampledStates()
    if (index === null || samples.length <= 1) {
      return ""
    }

    const x = (index / Math.max(samples.length - 1, 1)) * 320
    return `M ${x.toFixed(2)} 0 L ${x.toFixed(2)} 120`
  })
  protected readonly hoveredSampleLabel = computed(() => {
    const sample = this.hoveredSample()
    if (sample === null) {
      return this.frequencySweepActive()
        ? "Hover a plot or focus it to inspect a sampled frequency."
        : "Hover a plot or focus it to inspect a sampled time."
    }

    return this.frequencySweepActive()
      ? `Sampled frequency ${sample.timeSeconds.toFixed(2)} Hz`
      : `Sampled time ${sample.timeSeconds.toFixed(2)} s`
  })
  protected readonly plotReadoutRows = computed<PlotReadoutRow[]>(() => {
    const sample = this.hoveredSample()
    if (sample === null) {
      return []
    }

    if (this.resistorNetworkActive()) {
      return [
        { label: "Output voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Branch current", value: `${sample.current.toFixed(4)} A` },
        { label: "Load power", value: `${sample.branchPower.toFixed(4)} W` },
      ]
    }

    if (this.rcLowPassActive()) {
      return [
        { label: "Output voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Branch current", value: `${sample.current.toFixed(4)} A` },
        { label: "Stored energy", value: `${sample.storedEnergy.toFixed(4)} J` },
      ]
    }

    if (this.halfWaveRectifierActive()) {
      return [
        { label: "Output voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Load current", value: `${sample.current.toFixed(4)} A` },
        { label: "Load power", value: `${sample.branchPower.toFixed(4)} W` },
      ]
    }

    if (this.fullWaveRectifierActive()) {
      return [
        { label: "Output voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Load current", value: `${sample.current.toFixed(4)} A` },
        { label: "Load power", value: `${sample.branchPower.toFixed(4)} W` },
      ]
    }

    if (this.smoothedRectifierActive()) {
      return [
        { label: "Output voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Load current", value: `${sample.current.toFixed(4)} A` },
        { label: "Capacitor energy", value: `${sample.storedEnergy.toFixed(4)} J` },
      ]
    }

    if (this.rcHighPassActive()) {
      return [
        { label: "Output voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Branch current", value: `${sample.current.toFixed(4)} A` },
        { label: "Dissipated power", value: `${sample.branchPower.toFixed(4)} W` },
      ]
    }

    if (this.rlLowPassActive()) {
      return [
        { label: "Output voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Branch current", value: `${sample.current.toFixed(4)} A` },
        { label: "Magnetic energy", value: `${sample.storedEnergy.toFixed(4)} J` },
      ]
    }

    if (this.rlHighPassActive()) {
      return [
        { label: "Output voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Branch current", value: `${sample.current.toFixed(4)} A` },
        { label: "Magnetic energy", value: `${sample.storedEnergy.toFixed(4)} J` },
      ]
    }

    if (this.rlcResponseActive()) {
      return [
        { label: "Capacitor voltage", value: `${sample.capacitorVoltage.toFixed(2)} V` },
        { label: "Circuit current", value: `${sample.current.toFixed(4)} A` },
        { label: "Stored energy", value: `${sample.storedEnergy.toFixed(4)} J` },
      ]
    }

    if (this.rlcResonanceActive()) {
      return [
        { label: "Capacitor voltage", value: `${sample.capacitorVoltage.toFixed(2)} V` },
        { label: "Sweep current", value: `${sample.current.toFixed(4)} A` },
        { label: "Dissipated power", value: `${sample.branchPower.toFixed(4)} W` },
      ]
    }

    if (this.rlTransientActive()) {
      return [
        { label: "Inductor voltage", value: `${sample.outputVoltage.toFixed(2)} V` },
        { label: "Branch current", value: `${sample.current.toFixed(4)} A` },
        { label: "Magnetic energy", value: `${sample.storedEnergy.toFixed(4)} J` },
      ]
    }

    return [
      { label: "Capacitor voltage", value: `${sample.capacitorVoltage.toFixed(2)} V` },
      { label: "Charging current", value: `${sample.current.toFixed(4)} A` },
      { label: "Charge", value: `${sample.charge.toFixed(4)} C` },
    ]
  })
  protected readonly hoveredSampleAnnouncement = computed(() => {
    const rows = this.plotReadoutRows()
    if (rows.length === 0) {
      return this.hoveredSampleLabel()
    }

    return `${this.hoveredSampleLabel()}. ${rows.map((row) => `${row.label} ${row.value}`).join(". ")}.`
  })
  protected readonly plotNavigationDisabled = computed(() => this.sampledStates().length === 0)
  protected readonly atFirstHoveredSample = computed(() => (this.hoveredSampleIndex() ?? 0) <= 0)
  protected readonly atLastHoveredSample = computed(() => {
    const samples = this.sampledStates()
    if (samples.length === 0) {
      return true
    }

    return (this.hoveredSampleIndex() ?? 0) >= samples.length - 1
  })
  protected readonly exportPreview = computed(() =>
    JSON.stringify(
      buildExportPayload(
        this.selectedScenario(),
        this.currentState(),
        this.overlays(),
        this.sampledStates(),
      ),
      null,
      2,
    ),
  )
  protected readonly reportCsv = computed(() =>
    buildCircuitReportCsv(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly reportSummaryRows = computed(() =>
    buildCircuitReportSummaryRows(
      this.selectedScenario(),
      this.currentState(),
      this.sampledStates(),
    ),
  )
  protected readonly viewportHint = computed(() => {
    if (!this.webGpuReady()) {
      return this.webGpuMessage()
    }

    if (this.resistorNetworkActive()) {
      return "The viewport renders a resistor-divider schematic with overlay cues for output voltage, branch current, and measurement guides."
    }

    if (this.halfWaveRectifierActive()) {
      return "The viewport renders a half-wave rectifier waveform with clipped output voltage, load-current, source-waveform, and active-power cues over the sampled AC cycle."
    }

    if (this.fullWaveRectifierActive()) {
      return "The viewport renders a full-wave bridge rectifier waveform with doubled-ripple output voltage, load-current, source-waveform, and active-power cues over the sampled AC cycle."
    }

    if (this.smoothedRectifierActive()) {
      return "The viewport renders a smoothed bridge-rectifier waveform with reservoir-capacitor output, load-current, source-waveform, and capacitor-energy cues over the sampled ripple window."
    }

    if (this.rlTransientActive()) {
      return "The viewport renders an RL step response with inductor-voltage decay, branch-current rise, magnetic-energy traces, and a time-constant cue across the active transient window."
    }

    if (this.rcLowPassActive()) {
      return "The viewport renders a first-order RC filter sweep with cutoff-frequency and -3 dB guides plus output and branch-current traces across the active frequency range."
    }

    if (this.rcHighPassActive()) {
      return "The viewport renders a first-order RC high-pass sweep with cutoff-frequency and -3 dB guides plus resistor-output, current, and capacitor-voltage cues across the active frequency range."
    }

    if (this.rlLowPassActive()) {
      return "The viewport renders a first-order RL low-pass sweep with cutoff-frequency and -3 dB guides plus resistor-output, current, inductor-voltage, and magnetic-energy cues across the active frequency range."
    }

    if (this.rlHighPassActive()) {
      return "The viewport renders a first-order RL high-pass sweep with cutoff-frequency and -3 dB guides plus inductor-output, current, resistor-voltage, and magnetic-energy cues across the active frequency range."
    }

    if (this.rlcResponseActive()) {
      return "The viewport renders damped RLC traces with settling-band guides, overshoot cues, and current-reversal markers so oscillatory behavior stays legible through time."
    }

    if (this.rlcResonanceActive()) {
      return "The viewport renders a resonance sweep with capacitor-gain, current, and power traces plus guides for the resonant frequency and active sweep point."
    }

    return "The viewport renders voltage, current, and optional charge traces over time with a live marker on the capacitor-voltage curve."
  })

  constructor() {
    afterNextRender(() => {
      void this.initializeRenderer()
    })

    effect(() => {
      if (!this.rendererReady()) {
        return
      }

      this.renderer?.render(
        this.currentState(),
        this.selectedScenario(),
        this.overlays(),
        this.sampledStates(),
      )
    })

    this.destroyRef.onDestroy(() => {
      this.renderer?.destroy()
    })
  }

  protected selectScenario(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.state.selectScenario(target.value as ElectronicsAndCircuitsScenarioId)
  }

  protected updateScenarioParameter(
    field: EditableElectronicsAndCircuitsField,
    event: Event,
  ): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected updateTimeSeconds(event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateTimeSeconds(Number(target.value))
  }

  protected toggleOverlay(key: OverlayKey): void {
    this.overlays.update((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  protected updateHoveredSample(event: MouseEvent): void {
    const target = event.currentTarget as SVGElement | null
    if (target === null) {
      return
    }

    const samples = this.sampledStates()
    if (samples.length === 0) {
      this.hoveredSampleIndex.set(null)
      return
    }

    const rect = target.getBoundingClientRect()
    const relativeX = rect.width <= 0 ? 0 : (event.clientX - rect.left) / rect.width
    const clamped = Math.min(Math.max(relativeX, 0), 1)
    const index = Math.round(clamped * Math.max(samples.length - 1, 0))
    this.hoveredSampleIndex.set(index)
  }

  protected clearHoveredSample(): void {
    this.hoveredSampleIndex.set(null)
  }

  protected focusPlotReadout(): void {
    if (this.hoveredSampleIndex() !== null) {
      return
    }

    const samples = this.sampledStates()
    if (samples.length === 0) {
      return
    }

    this.hoveredSampleIndex.set(0)
  }

  protected handlePlotKeydown(event: KeyboardEvent): void {
    const samples = this.sampledStates()
    if (samples.length === 0) {
      return
    }

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault()
      this.stepHoveredSample(1)
      return
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault()
      this.stepHoveredSample(-1)
      return
    }

    if (event.key === "Home") {
      event.preventDefault()
      this.selectFirstSample()
      return
    }

    if (event.key === "End") {
      event.preventDefault()
      this.selectLastSample()
    }
  }

  protected selectFirstSample(): void {
    if (this.sampledStates().length === 0) {
      return
    }

    this.hoveredSampleIndex.set(0)
  }

  protected selectLastSample(): void {
    const samples = this.sampledStates()
    if (samples.length === 0) {
      return
    }

    this.hoveredSampleIndex.set(samples.length - 1)
  }

  protected stepHoveredSample(delta: number): void {
    const samples = this.sampledStates()
    if (samples.length === 0) {
      return
    }

    const currentIndex = this.hoveredSampleIndex() ?? 0
    this.hoveredSampleIndex.set(Math.min(Math.max(currentIndex + delta, 0), samples.length - 1))
  }

  protected async copyScenarioState(): Promise<void> {
    if (globalThis.navigator?.clipboard === undefined) {
      this.exportMessage.set("Clipboard export is unavailable in this browser context.")
      return
    }

    await globalThis.navigator.clipboard.writeText(this.exportPreview())
    this.exportMessage.set("Electronics and Circuits scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    const exported = this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )

    if (exported) {
      this.exportMessage.set("Electronics and Circuits scenario exported as JSON.")
    }
  }

  protected downloadScenarioReport(): void {
    const exported = this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      this.reportCsv(),
      "text/csv",
    )

    if (exported) {
      this.exportMessage.set("Electronics and Circuits report exported as CSV.")
    }
  }

  protected updateImportPayload(event: Event): void {
    const target = event.target as HTMLTextAreaElement
    this.importPayloadText.set(target.value)
  }

  protected async importScenarioStateFromFile(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (file === undefined) {
      return
    }

    const content = await file.text()
    this.importPayloadText.set(content)
    this.importScenarioState()
    target.value = ""
  }

  protected importScenarioState(): void {
    try {
      const payload = parseImportPayload(this.importPayloadText())
      this.state.importScenario(payload.scenario, payload.snapshot.timeSeconds)
      if (payload.overlays !== undefined) {
        this.overlays.set(payload.overlays)
      }
      this.exportMessage.set("Electronics and Circuits scenario restored from JSON.")
    } catch {
      this.exportMessage.set("Electronics and Circuits JSON import failed.")
    }
  }

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuReady.set(status.supported)
    this.webGpuMessage.set(status.message)

    if (!status.supported) {
      return
    }

    const canvas = this.canvasRef().nativeElement
    this.renderer = await ElectronicsAndCircuitsWebGpuRenderer.create(canvas)
    this.rendererReady.set(this.renderer !== null)
    if (this.renderer === null) {
      this.webGpuReady.set(false)
      this.webGpuMessage.set("WebGPU canvas initialization failed.")
    }
  }

  private downloadTextFile(filename: string, content: string, contentType: string): boolean {
    if (globalThis.window === undefined) {
      this.exportMessage.set("File export is only available in the browser.")
      return false
    }

    const blob = new Blob([content], { type: contentType })
    const url = globalThis.URL.createObjectURL(blob)
    const anchor = globalThis.document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    globalThis.URL.revokeObjectURL(url)
    return true
  }
}
