import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { WavesAndAcousticsPageComponent } from "./waves-and-acoustics-page.component"
import { WavesAndAcousticsStateService } from "./waves-and-acoustics-state.service"

describe("WavesAndAcousticsPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WavesAndAcousticsPageComponent],
      providers: [
        WavesAndAcousticsStateService,
        {
          provide: WebGpuSupportService,
          useValue: {
            getStatus: async () => ({
              supported: false,
              message: "WebGPU unavailable in tests.",
            }),
          },
        },
      ],
    }).compileComponents()
  })

  it("renders the initial standing-wave slice and export actions", async () => {
    const fixture = TestBed.createComponent(WavesAndAcousticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Waves and Acoustics")
    expect(host.textContent).toContain(
      "Phase 21 now ships a complete shared Waves and Acoustics surface",
    )
    expect(host.textContent).toContain("Implementation Status")
    expect(host.textContent).toContain("Phase 21 waves scenario set complete")
    expect(host.textContent).toContain("Phase 21 Scenario Set")
    expect(host.textContent).toContain("Viewport")
    expect(host.textContent).toContain("Scenario Summary")
    expect(host.textContent).toContain("Insight Cards")
    expect(host.textContent).toContain("Standing-wave displacement")
    expect(host.textContent).toContain("Equilibrium line")
    expect(host.textContent).toContain(
      "Hover the plot or focus it to inspect sampled wave positions.",
    )
    expect(host.textContent).toContain("Copy JSON")
    expect(host.textContent).toContain("Standing Wave on a String")
    expect(host.textContent).toContain("Harmonic number")
    expect(host.textContent).toContain("Snapshot time")
    expect(host.textContent).toContain("0.00 s")
    expect(host.textContent).toContain("0.000 s")
    expect(host.textContent).toContain("Validated shared slice")
    expect(host.textContent).toContain("Resonant mode")
    expect(host.textContent).toContain("Node-spacing guides on")
    expect(host.textContent).toContain("Traveling Wave Pulse Train")
    expect(host.textContent).toContain("One-Dimensional Doppler Shift")
  })

  it("updates snapshot time in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(WavesAndAcousticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const timeInput = Array.from(host.querySelectorAll("input")).find((input) => {
      const label = input.closest("label")
      return label?.textContent?.includes("Snapshot time")
    }) as HTMLInputElement | undefined
    if (!timeInput) {
      throw new Error("Snapshot-time input missing in test setup.")
    }

    timeInput.value = "0.4"
    timeInput.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const previews = host.querySelectorAll("pre")
    const jsonPreview = previews[0]?.textContent ?? ""
    const csvPreview = previews[1]?.textContent ?? ""
    expect(jsonPreview).toContain('"timeSeconds": 0.4')
    expect(csvPreview).toContain("snapshot_time_s")
    expect(csvPreview).toContain('"0.400000"')
    expect(host.textContent).toContain("0.40 s")
  })

  it("updates overlay flags in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(WavesAndAcousticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showWaveGuides": true')

    const toggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Node-spacing guides"),
    )
    if (!toggle) {
      throw new Error("Wave-guides toggle missing in test setup.")
    }

    toggle.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showWaveGuides": false')
    expect(host.textContent).not.toContain("Equilibrium line")
  })

  it("focuses the plot to expose a sampled readout", async () => {
    const fixture = TestBed.createComponent(WavesAndAcousticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const plot = host.querySelector('svg[aria-label="Standing-wave displacement"]')
    if (!plot) {
      throw new Error("Standing-wave plot missing in test setup.")
    }

    plot.dispatchEvent(new Event("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample position 0.000 m")
    expect(host.textContent).toContain("Displacement: 0.00 mm")
  })

  it("restores a modified traveling-wave scenario from JSON", async () => {
    const fixture = TestBed.createComponent(WavesAndAcousticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "traveling-wave",
        name: "Traveling Wave Pulse Train",
        summary: "Imported summary",
        equationSummary: "Equation",
        status: "Scenario contract locked",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 2.4, minY: -1.2, maxY: 1.2 },
        focusArea: "Focus",
        waveSpeedMetersPerSecond: 22,
        amplitudeMillimeters: 5,
        frequencyHertz: 8,
      },
      snapshot: { timeSeconds: 0.5 },
      overlays: {
        showWaveGuides: true,
        showNodeMarkers: false,
        showReferenceCurve: true,
      },
    })
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const importButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Import JSON",
    )
    if (!importButton) {
      throw new Error("Import JSON button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    const service = TestBed.inject(WavesAndAcousticsStateService)
    expect(host.textContent).toContain("Waves and Acoustics scenario restored from JSON.")
    expect(service.selectedScenario().id).toBe("traveling-wave")
    expect(service.selectedScenario().waveSpeedMetersPerSecond).toBe(22)
    expect(service.selectedScenario().frequencyHertz).toBe(8)
    expect(host.textContent).toContain("Propagation speed")
    expect(host.textContent).toContain("Wave speed")
    expect(host.textContent).toContain("Traveling-wave displacement")
    expect(host.textContent).toContain("One wavelength")
    expect(host.textContent).toContain("Wavelength guides on")
    expect(host.querySelector("pre")?.textContent ?? "").toContain('"showNodeMarkers": false')
  })

  it("restores a doppler scenario and exposes source-observer plot guides", async () => {
    const fixture = TestBed.createComponent(WavesAndAcousticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "doppler-effect",
        name: "One-Dimensional Doppler Shift",
        summary: "Imported summary",
        equationSummary: "Equation",
        status: "Scenario contract locked",
        durationSeconds: 1,
        viewBounds: { minX: -20, maxX: 20, minY: -1.2, maxY: 1.2 },
        focusArea: "Focus",
        waveSpeedMetersPerSecond: 343,
        emittedFrequencyHertz: 440,
        sourceSpeedMetersPerSecond: 18,
        observerSpeedMetersPerSecond: 4,
      },
      snapshot: { timeSeconds: 0.5 },
      overlays: {
        showWaveGuides: true,
        showNodeMarkers: true,
        showReferenceCurve: true,
      },
    })
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const importButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Import JSON",
    )
    if (!importButton) {
      throw new Error("Import JSON button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Frequency profile")
    expect(host.textContent).toContain("Source position")
    expect(host.textContent).toContain("Observer position")
    expect(host.textContent).toContain("Propagation guides on")

    const plot = host.querySelector('svg[aria-label="Frequency profile"]')
    if (!plot) {
      throw new Error("Doppler plot missing in test setup.")
    }

    plot.dispatchEvent(new Event("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Frequency: 440.00 Hz")
    expect(host.textContent).toContain("Shift: +0.00 Hz")
  })
})
