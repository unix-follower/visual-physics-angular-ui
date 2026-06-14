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
import { buildInsightCards } from "./optics-analytics"
import { buildExportPayload, OpticsOverlayOptions, parseImportPayload } from "./optics-payload"
import { buildOpticsReportCsv } from "./optics-report"
import { EditableOpticsField, OpticsStateService } from "./optics-state.service"
import { OpticsScenarioId } from "./optics.models"
import { OpticsWebGpuRenderer } from "./optics-webgpu-renderer"

@Component({
  selector: "app-optics-page",
  templateUrl: "./optics-page.component.html",
  styleUrl: "./optics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpticsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(OpticsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: OpticsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<OpticsOverlayOptions>({
    showIncidentGuide: true,
    showNormalGuide: true,
    showSecondaryGuide: true,
  })
  protected readonly snellMetrics = computed(() => ({
    incidentAngleDegrees: this.selectedScenario().incidentAngleDegrees ?? 0,
    mediumARefractiveIndex: this.selectedScenario().mediumARefractiveIndex ?? 1,
    mediumBRefractiveIndex: this.selectedScenario().mediumBRefractiveIndex ?? 1,
  }))
  protected readonly thinLensMetrics = computed(() => ({
    focalLengthCentimeters: this.selectedScenario().focalLengthCentimeters ?? 0,
    objectDistanceCentimeters: this.selectedScenario().objectDistanceCentimeters ?? 0,
    objectHeightCentimeters: this.selectedScenario().objectHeightCentimeters ?? 0,
  }))
  protected readonly diffractionMetrics = computed(() => ({
    slitWidthMicrometers: this.selectedScenario().slitWidthMicrometers ?? 0,
    wavelengthNanometers: this.selectedScenario().wavelengthNanometers ?? 0,
    screenDistanceMeters: this.selectedScenario().screenDistanceMeters ?? 0,
  }))
  protected readonly isSnellScenario = computed(
    () => this.selectedScenario().id === "snell-refraction",
  )
  protected readonly isThinLensScenario = computed(
    () => this.selectedScenario().id === "thin-lens-imaging",
  )
  protected readonly isDiffractionScenario = computed(
    () => this.selectedScenario().id === "single-slit-diffraction",
  )
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.selectedScenario().id === "thin-lens-imaging") {
      return snapshot.realImage
        ? `The converging lens forms a real image ${(snapshot.imageDistanceCentimeters ?? 0).toFixed(1)} cm from the lens with magnification ${(snapshot.magnification ?? 0).toFixed(2)}x.`
        : `The object sits inside the focal length, so the lens forms a virtual upright image with magnification ${(snapshot.magnification ?? 0).toFixed(2)}x.`
    }

    if (this.selectedScenario().id === "single-slit-diffraction") {
      return `The first diffraction minimum lands ${(snapshot.firstMinimumOffsetMillimeters ?? 0).toFixed(2)} mm from the optical axis, setting a central maximum width of ${(snapshot.centralMaximumWidthMillimeters ?? 0).toFixed(2)} mm.`
    }

    return snapshot.totalInternalReflection
      ? `The incident ray exceeds the ${(snapshot.criticalAngleDegrees ?? 0).toFixed(1)} deg critical angle, so the transmitted ray vanishes into total internal reflection.`
      : `The transmitted ray bends to ${(snapshot.refractedAngleDegrees ?? 0).toFixed(1)} deg in the second medium for the current interface settings.`
  })
  protected readonly residualSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.selectedScenario().id === "thin-lens-imaging") {
      return `Object distance ${(snapshot.objectDistanceCentimeters ?? 0).toFixed(1)} cm, focal length ${(snapshot.focalLengthCentimeters ?? 0).toFixed(1)} cm, image height ${(snapshot.imageHeightCentimeters ?? 0).toFixed(2)} cm.`
    }

    if (this.selectedScenario().id === "single-slit-diffraction") {
      return `Slit width ${(snapshot.slitWidthMicrometers ?? 0).toFixed(1)} um, wavelength ${(snapshot.wavelengthNanometers ?? 0).toFixed(0)} nm, screen distance ${(snapshot.screenDistanceMeters ?? 0).toFixed(2)} m.`
    }

    return `Reflected angle ${(snapshot.reflectedAngleDegrees ?? 0).toFixed(1)} deg, relative index ${(snapshot.relativeRefractiveIndex ?? 0).toFixed(3)}, total internal reflection ${snapshot.totalInternalReflection ? "on" : "off"}.`
  })
  protected readonly viewportHint = computed(() => {
    const scenarioId = this.selectedScenario().id
    if (scenarioId === "single-slit-diffraction") {
      return "The viewport renders the slit opening, optical axis, observation screen, and first-minimum markers for the active single-slit diffraction estimate."
    }

    if (scenarioId === "thin-lens-imaging") {
      return "The viewport renders a principal axis, converging lens, focal markers, object, image, and principal-ray guides for the active thin-lens state."
    }

    if (this.currentState().totalInternalReflection) {
      return "The viewport renders the interface, normal, incident ray, reflected ray, and critical-angle cue for the current total-internal-reflection state."
    }

    return "The viewport renders the interface, normal, incident ray, reflected ray, and refracted ray for the current Snell-refraction state."
  })
  protected readonly controlsTitle = computed(() => {
    const scenarioId = this.selectedScenario().id
    if (scenarioId === "single-slit-diffraction") {
      return "Single Slit Diffraction Controls"
    }

    if (scenarioId === "thin-lens-imaging") {
      return "Thin Lens Imaging Controls"
    }

    return "Snell Refraction Controls"
  })
  protected readonly controlNote = computed(() => {
    const scenarioId = this.selectedScenario().id
    if (scenarioId === "single-slit-diffraction") {
      return "Single-slit payloads use slitWidthMicrometers, wavelengthNanometers, screenDistanceMeters, and snapshot.timeSeconds."
    }

    if (scenarioId === "thin-lens-imaging") {
      return "Thin-lens payloads use focalLengthCentimeters, objectDistanceCentimeters, objectHeightCentimeters, and snapshot.timeSeconds."
    }

    return "Snell-refraction payloads use incidentAngleDegrees, mediumARefractiveIndex, mediumBRefractiveIndex, and snapshot.timeSeconds."
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
    this.state.selectScenario(target.value as OpticsScenarioId)
    this.exportMessage.set("")
  }

  protected updateScenarioParameter(field: EditableOpticsField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected toggleOverlay(key: keyof OpticsOverlayOptions): void {
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
    this.exportMessage.set("Optics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Optics scenario exported as JSON.")
  }

  protected downloadReportCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      buildOpticsReportCsv(this.selectedScenario(), this.currentState(), this.sampledStates()),
      "text/csv",
    )
    this.exportMessage.set("Optics report exported as CSV.")
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
      this.exportMessage.set("Optics scenario restored from JSON.")
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

    if (!status.supported) {
      return
    }

    this.renderer = await OpticsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set("WebGPU canvas initialization failed for the optics viewport.")
      return
    }

    this.webGpuMessage.set("Optics viewport ready.")
    this.rendererReady.set(true)
    this.renderer.render(this.currentState(), this.selectedScenario(), this.overlays())
  }
}
