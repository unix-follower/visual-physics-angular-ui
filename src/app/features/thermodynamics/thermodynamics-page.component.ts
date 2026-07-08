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
import { buildInsightCards } from "./thermodynamics-analytics"
import {
  buildExportPayload,
  parseImportPayload,
  ThermodynamicsOverlayOptions,
} from "./thermodynamics-payload"
import { buildThermodynamicsReportCsv } from "./thermodynamics-report"
import {
  EditableThermodynamicsField,
  ThermodynamicsStateService,
} from "./thermodynamics-state.service"
import { ThermodynamicsScenarioId } from "./thermodynamics.models"
import { ThermodynamicsWebGpuRenderer } from "./thermodynamics-webgpu-renderer"

@Component({
  selector: "app-thermodynamics-page",
  templateUrl: "./thermodynamics-page.component.html",
  styleUrl: "./thermodynamics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThermodynamicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(ThermodynamicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: ThermodynamicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly currentTimeSeconds = this.state.currentTimeSeconds
  protected readonly isIdealGasScenario = computed(
    () => this.selectedScenario().id === "ideal-gas-state",
  )
  protected readonly isConductionScenario = computed(
    () => this.selectedScenario().id === "heat-conduction-slab",
  )
  protected readonly isCarnotScenario = computed(
    () => this.selectedScenario().id === "carnot-cycle",
  )
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly webGpuReady = signal(false)
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<ThermodynamicsOverlayOptions>({
    showPressureCurve: true,
    showParticleGuide: true,
    showEnergyGuide: true,
  })
  protected readonly metrics = computed(() => ({
    amountMoles: this.selectedScenario().amountMoles ?? 0,
    temperatureKelvin: this.selectedScenario().temperatureKelvin ?? 0,
    volumeCubicMeters: this.selectedScenario().volumeCubicMeters ?? 0,
    molarMassKgPerMol: this.selectedScenario().molarMassKgPerMol ?? 0,
    slabThicknessMeters: this.selectedScenario().slabThicknessMeters ?? 0,
    thermalConductivityWPerMK: this.selectedScenario().thermalConductivityWPerMK ?? 0,
    thermalDiffusivityM2PerS: this.selectedScenario().thermalDiffusivityM2PerS ?? 0,
    initialTemperatureCelsius: this.selectedScenario().initialTemperatureCelsius ?? 0,
    boundaryTemperatureCelsius: this.selectedScenario().boundaryTemperatureCelsius ?? 0,
    hotReservoirTemperatureKelvin: this.selectedScenario().hotReservoirTemperatureKelvin ?? 0,
    coldReservoirTemperatureKelvin: this.selectedScenario().coldReservoirTemperatureKelvin ?? 0,
    cycleMinVolumeCubicMeters: this.selectedScenario().cycleMinVolumeCubicMeters ?? 0,
    cycleVolumeRatio: this.selectedScenario().cycleVolumeRatio ?? 0,
  }))
  protected readonly overlayLabels = computed(() => {
    if (this.isCarnotScenario()) {
      return {
        showPressureCurve: "Cycle loop",
        showParticleGuide: "Isotherm guides",
        showEnergyGuide: "Work guide",
      }
    }
    if (this.isConductionScenario()) {
      return {
        showPressureCurve: "Temperature profile",
        showParticleGuide: "Boundary guides",
        showEnergyGuide: "Heat-flux guides",
      }
    }

    return {
      showPressureCurve: "Pressure curve",
      showParticleGuide: "Particle guide",
      showEnergyGuide: "Energy guide",
    }
  })
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isCarnotScenario()) {
      return `Efficiency ${((snapshot.thermalEfficiency ?? 0) * 100).toFixed(1)}%, net work ${(snapshot.netWorkKj ?? 0).toFixed(3)} kJ during ${snapshot.cycleStageLabel ?? "the active stage"}.`
    }
    if (this.isConductionScenario()) {
      return `Center ${(snapshot.centerTemperatureCelsius ?? 0).toFixed(1)} degC, flux ${(snapshot.heatFluxWPerM2 ?? 0).toFixed(0)} W/m^2 at ${snapshot.timeSeconds.toFixed(0)} s.`
    }

    return `Pressure ${(snapshot.pressureKpa ?? 0).toFixed(1)} kPa, density ${(snapshot.densityKgPerM3 ?? 0).toFixed(3)} kg/m^3.`
  })
  protected readonly viewportHint = computed(() => {
    if (this.isCarnotScenario()) {
      return "A pressure-volume loop, isotherm guides, work cue, and the active Carnot-cycle state marker render here for the current heat-engine slice."
    }
    if (this.isConductionScenario()) {
      return "A slab cross-section, centerline, transient temperature profile cue, and optional boundary or heat-flux guides render here for the current conduction slice."
    }

    return "Chamber boundaries, a pressure-position piston cue, and density or energy guides render here for the current ideal-gas slice."
  })
  protected readonly residualSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isCarnotScenario()) {
      return `Heat in ${(snapshot.absorbedHeatKj ?? 0).toFixed(3)} kJ, heat out ${(snapshot.rejectedHeatKj ?? 0).toFixed(3)} kJ, entropy transfer ${(snapshot.entropyTransferKjPerK ?? 0).toFixed(4)} kJ/K`
    }
    if (this.isConductionScenario()) {
      return `Surface ${(snapshot.surfaceTemperatureCelsius ?? 0).toFixed(1)} degC, Fourier ${(snapshot.fourierNumber ?? 0).toFixed(3)}, normalized center ${(snapshot.normalizedTemperature ?? 0).toFixed(3)}`
    }

    return `Internal energy ${(snapshot.internalEnergyKj ?? 0).toFixed(3)} kJ, RMS speed ${(snapshot.rmsSpeedMs ?? 0).toFixed(1)} m/s, closure ${(snapshot.compressibilityFactor ?? 0).toFixed(3)}`
  })
  protected readonly controlTitle = computed(() => {
    if (this.isCarnotScenario()) {
      return "Carnot Cycle Controls"
    }
    if (this.isConductionScenario()) {
      return "Heat Conduction Controls"
    }

    return "Ideal Gas Controls"
  })
  protected readonly controlNote = computed(() => {
    if (this.isCarnotScenario()) {
      return "Carnot-cycle payloads use amountMoles, hotReservoirTemperatureKelvin, coldReservoirTemperatureKelvin, cycleMinVolumeCubicMeters, cycleVolumeRatio, and snapshot.timeSeconds."
    }
    if (this.isConductionScenario()) {
      return "Heat-conduction payloads use slabThicknessMeters, thermalConductivityWPerMK, thermalDiffusivityM2PerS, initialTemperatureCelsius, boundaryTemperatureCelsius, and snapshot.timeSeconds."
    }

    return "Ideal-gas payloads use amountMoles, temperatureKelvin, volumeCubicMeters, and molarMassKgPerMol."
  })
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
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

  constructor() {
    afterNextRender(() => {
      void this.initializeRenderer()
    })

    effect(() => {
      if (!this.rendererReady()) {
        return
      }

      this.renderer?.render(this.currentState(), this.selectedScenario(), this.overlays())
    })

    this.destroyRef.onDestroy(() => {
      this.renderer?.destroy()
    })
  }

  protected selectScenario(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.state.selectScenario(target.value as ThermodynamicsScenarioId)
    this.exportMessage.set("")
  }

  protected updateScenarioParameter(field: EditableThermodynamicsField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected updateTimeSeconds(event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateTimeSeconds(Number(target.value))
  }

  protected toggleOverlay(key: keyof ThermodynamicsOverlayOptions): void {
    this.overlays.update((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  protected async copyScenarioState(): Promise<void> {
    if (globalThis.navigator?.clipboard === undefined) {
      this.exportMessage.set("Clipboard export is unavailable in this browser context.")
      return
    }

    await globalThis.navigator.clipboard.writeText(this.exportPreview())
    this.exportMessage.set("Thermodynamics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Thermodynamics scenario exported as JSON.")
  }

  protected downloadReportCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      buildThermodynamicsReportCsv(
        this.selectedScenario(),
        this.currentState(),
        this.sampledStates(),
      ),
      "text/csv",
    )
    this.exportMessage.set("Thermodynamics report exported as CSV.")
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
      this.state.importScenarioState(payload.scenario, payload.snapshot.timeSeconds)
      this.overlays.set(payload.overlays ?? this.overlays())
      this.exportMessage.set("Thermodynamics scenario restored from JSON.")
    } catch {
      this.exportMessage.set("Import failed. Use a JSON payload exported from this workspace.")
    }
  }

  private downloadTextFile(filename: string, content: string, type: string): void {
    if (globalThis.window === undefined) {
      this.exportMessage.set("File export is only available in the browser.")
      return
    }

    const blob = new Blob([content], { type })
    const url = globalThis.URL.createObjectURL(blob)
    const link = globalThis.document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    globalThis.URL.revokeObjectURL(url)
  }

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    this.webGpuReady.set(status.supported)

    if (!status.supported) {
      return
    }

    this.renderer = await ThermodynamicsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set("WebGPU canvas initialization failed for the thermodynamics viewport.")
      this.webGpuReady.set(false)
      return
    }

    this.webGpuMessage.set("Thermodynamics viewport ready.")
    this.rendererReady.set(true)
    this.renderer.render(this.currentState(), this.selectedScenario(), this.overlays())
  }
}
