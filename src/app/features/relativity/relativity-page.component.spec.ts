import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { RelativityPageComponent } from "./relativity-page.component"
import { RelativityStateService } from "./relativity-state.service"
import { RelativityWebGpuRenderer } from "./relativity-webgpu-renderer"

describe("RelativityPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelativityPageComponent],
      providers: [
        RelativityStateService,
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

  it("renders the initial time-dilation slice", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Relativity")
    expect(host.textContent).toContain("Phase 23")
    expect(host.textContent).toContain(
      "Phase 23 now ships a complete Relativity surface covering time dilation, relativistic Doppler shift, and gravitational time dilation through one shared Angular workflow.",
    )
    expect(host.textContent).toContain("Inertial Time Dilation")
    expect(host.textContent).toContain("Current focus: Inertial Time Dilation.")
    expect(host.textContent).toContain(
      "Completion status: Phase 23 relativity scenario set complete.",
    )
    expect(host.textContent).toContain("Phase 23 Scenario Set")
    expect(host.textContent).toContain(
      "Current implementation includes validated `time-dilation`, `relativistic-doppler`, and `gravitational-time-dilation` slices on one shared Angular page.",
    )
    expect(host.textContent).toContain("Proper-time guides on")
    expect(host.textContent).toContain("Coordinate-time comparison on")
    expect(host.textContent).toContain("Dilated-clock marker on")
    expect(host.textContent).toContain("Reset scenario")
    expect(host.textContent).toContain(
      "Velocity and proper-time inputs currently stretch the moving clock to 1.667 s in the observer frame.",
    )
    expect(host.textContent).toContain("Proper-time baseline: 1.000 s")
    expect(host.textContent).toContain("Active beta: 0.800 c")
    expect(host.textContent).toContain("Time-dilation curve")
    expect(host.textContent).toContain("Readouts")
    expect(host.textContent).toContain("Coordinate time1.667 s")
    expect(host.textContent).toContain("Samples49")
    expect(host.textContent).toContain("Status")
    expect(host.textContent).toContain("Initial analytic slice")
    expect(host.textContent).toContain(
      "Lorentz-factor growth, elapsed-time separation, and nonlinear relativistic scaling as velocity approaches c.",
    )
    expect(host.textContent).toContain("Lorentz factor")
    expect(host.textContent).toContain(
      "Relativistic scaling factor linking proper and coordinate time.",
    )
    expect(host.textContent).toContain("Insight Cards")
    expect(host.textContent).toContain(
      "Time-dilation insight focus: gamma 1.6667 sets a 0.6667 s separation between proper and coordinate time.",
    )
    expect(host.textContent).toContain("Copy JSON")
    expect(host.textContent).toContain("Download CSV")
  })

  it("initializes the relativity WebGPU renderer when support is available", async () => {
    const destroySpy = vi.fn()
    const createSpy = vi.spyOn(RelativityWebGpuRenderer, "create").mockResolvedValue({
      render: vi.fn(),
      destroy: destroySpy,
    } as unknown as RelativityWebGpuRenderer)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Relativity WebGPU viewport ready.")

    fixture.destroy()
    expect(destroySpy).toHaveBeenCalled()

    createSpy.mockRestore()
  })

  it("reports a relativity renderer initialization failure when WebGPU setup succeeds but renderer creation fails", async () => {
    const createSpy = vi.spyOn(RelativityWebGpuRenderer, "create").mockResolvedValue(null)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("WebGPU renderer initialization failed.")

    createSpy.mockRestore()
  })

  it("switches to the gravitational slice and updates the export preview", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "gravitational-time-dilation"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Gravitational Time Dilation")
    expect(host.textContent).toContain("Schwarzschild and unity guides on")
    expect(host.textContent).toContain("Weak-field comparison on")
    expect(host.textContent).toContain("Orbital clock marker on")
    expect(host.textContent).toContain(
      "Clock-rate suppression close to the Schwarzschild radius and recovery toward the far-field limit.",
    )
    expect(host.textContent).toContain(
      "Radius and central-mass inputs hold the local clock at 0.9129 of the far-field rate.",
    )
    expect(host.textContent).toContain(
      "Gravitational insight focus: the local clock keeps 0.9129 of the far-field rate at 6.00 r_s.",
    )
    expect(host.textContent).toContain("Active radius6.00 r_s")
    expect(host.textContent).toContain("Schwarzschild radius2.95 km")
    expect(host.textContent).toContain("Characteristic radius for the chosen central mass.")
    expect(host.querySelector("pre")?.textContent ?? "").toContain(
      '"id": "gravitational-time-dilation"',
    )
    expect(host.textContent).toContain("Radius (Schwarzschild radii)")
  })

  it("focuses the plot to expose a sampled readout", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const plot = host.querySelector('svg[aria-label="Time-dilation curve"]')
    if (!plot) {
      throw new Error("Relativity plot missing in test setup.")
    }

    plot.dispatchEvent(new Event("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample position 0.000 c")
    expect(host.textContent).toContain("Lorentz factor: 1.0000")
  })

  it("restores a doppler scenario from json", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "relativistic-doppler",
        name: "Relativistic Doppler Shift",
        summary: "Imported summary",
        equationSummary: "Equation",
        status: "Imported slice",
        durationSeconds: 0,
        viewBounds: { minX: -0.95, maxX: 0.95, minY: 0, maxY: 1200 },
        focusArea: "Focus",
        emittedFrequencyHertz: 600,
        sourceVelocityFractionOfLight: 0.2,
        observerVelocityFractionOfLight: -0.1,
      },
      snapshot: { timeSeconds: 0 },
      overlays: {
        showReferenceGuides: true,
        showComparisonCurve: false,
        showActiveMarker: true,
      },
    })
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const importButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Import JSON",
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Relativity scenario restored from JSON.")
    expect(host.textContent).toContain("Relativistic Doppler Shift")
    expect(host.textContent).toContain("Emission and velocity guides on")
    expect(host.textContent).toContain("Classical Doppler comparison off")
    expect(host.textContent).toContain("Observed-frequency marker on")
    expect(host.textContent).toContain(
      "Source and observer velocity inputs resolve to relative beta 0.294 c for the active Doppler shift.",
    )
    expect(host.textContent).toContain("Observed frequency443.13 Hz")
    expect(host.textContent).toContain("Shift ratio0.7385")
    expect(host.textContent).toContain(
      "Relativistic Doppler insight focus: redshift remains anchored by the observed-to-emitted ratio 0.7385.",
    )
    expect(textarea.value).toContain('"showComparisonCurve": false')
    expect(host.querySelector("pre")?.textContent ?? "").toContain('"showComparisonCurve": false')
  })

  it("restores a gravitational scenario from a JSON file input", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const input = host.querySelector('input[type="file"]') as HTMLInputElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    const file = {
      text: async () =>
        JSON.stringify({
          scenario: {
            id: "gravitational-time-dilation",
            name: "Gravitational Time Dilation",
            summary: "Imported gravitational summary",
            equationSummary: "Imported equation",
            status: "Imported slice",
            durationSeconds: 1,
            viewBounds: { minX: 1, maxX: 12, minY: 0, maxY: 1.1 },
            focusArea: "Imported gravitational focus",
            centralMassSolarMasses: 3,
            orbitalRadiusSchwarzschildRadii: 4.5,
            coordinateTimeSeconds: 2,
          },
          snapshot: { timeSeconds: 2 },
          overlays: {
            showReferenceGuides: true,
            showComparisonCurve: true,
            showActiveMarker: false,
          },
        }),
    } as File

    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    })

    input.dispatchEvent(new Event("change"))
    await fixture.whenStable()
    fixture.detectChanges()

    expect(host.textContent).toContain("Relativity scenario restored from JSON.")
    expect(host.textContent).toContain("Gravitational Time Dilation")
    expect(host.textContent).toContain("Imported gravitational focus")
    expect(host.textContent).toContain("Radius and central-mass inputs hold the local clock at")
    expect(textarea.value).toContain('"centralMassSolarMasses": 3')
    expect(textarea.value).toContain('"showActiveMarker": false')
    expect(input.value).toBe("")
  })

  it("drops cross-scenario fields from imported relativity payloads before rendering the export preview", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "time-dilation",
        name: "Inertial Time Dilation",
        summary: "Imported summary",
        equationSummary: "Imported equation",
        status: "Imported slice",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 0.98, minY: 0, maxY: 6 },
        focusArea: "Imported focus",
        relativeVelocityFractionOfLight: 0.6,
        properTimeSeconds: 2,
        emittedFrequencyHertz: 999,
        sourceVelocityFractionOfLight: 0.3,
        observerVelocityFractionOfLight: -0.1,
      },
      snapshot: { timeSeconds: 2 },
      overlays: {
        showReferenceGuides: true,
        showComparisonCurve: true,
        showActiveMarker: true,
      },
    })
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const importButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Import JSON",
    ) as HTMLButtonElement | undefined

    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "time-dilation"')
    expect(preview).toContain('"relativeVelocityFractionOfLight": 0.6')
    expect(preview).toContain('"properTimeSeconds": 2')
    expect(preview).not.toContain('"emittedFrequencyHertz": 999')
    expect(preview).not.toContain('"sourceVelocityFractionOfLight": 0.3')
    expect(preview).not.toContain('"observerVelocityFractionOfLight": -0.1')
  })

  it("resets relativity overlays to defaults when an imported payload omits overlay settings", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const comparisonToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Coordinate-time comparison"),
    ) as HTMLButtonElement | undefined

    if (!comparisonToggle) {
      throw new Error("Comparison toggle missing in test setup.")
    }

    comparisonToggle.click()
    fixture.detectChanges()
    expect(host.textContent).toContain("Coordinate-time comparison off")

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "time-dilation",
        name: "Inertial Time Dilation",
        summary: "Imported summary",
        equationSummary: "Imported equation",
        status: "Imported slice",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 0.98, minY: 0, maxY: 6 },
        focusArea: "Imported focus",
        relativeVelocityFractionOfLight: 0.5,
        properTimeSeconds: 1.5,
      },
      snapshot: { timeSeconds: 1.5 },
    })
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const importButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Import JSON",
    ) as HTMLButtonElement | undefined

    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(host.textContent).toContain("Relativity scenario restored from JSON.")
    expect(host.textContent).toContain("Coordinate-time comparison on")
    expect(preview).toContain('"showReferenceGuides": true')
    expect(preview).toContain('"showComparisonCurve": true')
    expect(preview).toContain('"showActiveMarker": true')
  })

  it("normalizes invalid imported relativity view bounds before rendering the export preview", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "gravitational-time-dilation",
        name: "Gravitational Time Dilation",
        summary: "Imported summary",
        equationSummary: "Imported equation",
        status: "Imported slice",
        durationSeconds: 1,
        viewBounds: { minX: 9, maxX: 2, minY: 4, maxY: 4 },
        focusArea: "Imported focus",
        centralMassSolarMasses: 2,
        orbitalRadiusSchwarzschildRadii: 5,
        coordinateTimeSeconds: 1.5,
      },
      snapshot: { timeSeconds: 1.5 },
      overlays: {
        showReferenceGuides: true,
        showComparisonCurve: true,
        showActiveMarker: true,
      },
    })
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const importButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Import JSON",
    ) as HTMLButtonElement | undefined

    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "gravitational-time-dilation"')
    expect(preview).toContain('"viewBounds": {')
    expect(preview).toContain('"minX": 1')
    expect(preview).toContain('"maxX": 12')
    expect(preview).toContain('"minY": 0')
    expect(preview).toContain('"maxY": 1.1')
  })

  it("rejects non-finite numeric values through the relativity page import workflow", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = `{
			"scenario": {
				"id": "gravitational-time-dilation",
				"name": "Gravitational Time Dilation",
				"summary": "Imported summary",
				"equationSummary": "Imported equation",
				"status": "Imported slice",
				"durationSeconds": 1,
				"viewBounds": { "minX": 1, "maxX": 12, "minY": 0, "maxY": 1.1 },
				"focusArea": "Imported focus",
				"centralMassSolarMasses": 1,
				"orbitalRadiusSchwarzschildRadii": 1e309,
				"coordinateTimeSeconds": 1
			},
			"snapshot": { "timeSeconds": 1 }
		}`
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const importButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Import JSON",
    ) as HTMLButtonElement | undefined

    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain(
      "Import failed. Use a JSON payload exported from this workspace.",
    )
    expect(host.textContent).toContain("Inertial Time Dilation")
  })

  it("copies the active relativity scenario export payload to the clipboard", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    const host = fixture.nativeElement as HTMLElement
    const copyButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Copy JSON",
    ) as HTMLButtonElement | undefined

    if (!copyButton) {
      throw new Error("Copy JSON button missing in test setup.")
    }

    copyButton.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(writeText).toHaveBeenCalledTimes(1)
    const copiedPayload = writeText.mock.calls[0]?.[0]
    expect(typeof copiedPayload).toBe("string")
    expect(copiedPayload).toContain('"id": "time-dilation"')
    expect(copiedPayload).toContain('"showComparisonCurve": true')
    expect(host.textContent).toContain("Relativity scenario copied to clipboard.")
  })

  it("shows a failure message when relativity clipboard export is unavailable", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    })

    const host = fixture.nativeElement as HTMLElement
    const copyButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Copy JSON",
    ) as HTMLButtonElement | undefined

    if (!copyButton) {
      throw new Error("Copy JSON button missing in test setup.")
    }

    copyButton.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(host.textContent).toContain("Clipboard export is unavailable in this browser context.")
  })

  it("exports the active relativity scenario as a downloadable JSON file", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const originalCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    const createObjectUrlSpy = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:relativity-json-test")
    const revokeObjectUrlSpy = vi
      .spyOn(globalThis.URL, "revokeObjectURL")
      .mockImplementation(() => undefined)
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
    ) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === "a") {
        ;(element as HTMLAnchorElement).click = clickSpy
      }
      return element
    }) as typeof document.createElement)

    const host = fixture.nativeElement as HTMLElement
    const exportButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download JSON",
    ) as HTMLButtonElement | undefined

    if (!exportButton) {
      throw new Error("Download JSON button missing in test setup.")
    }

    exportButton.click()
    fixture.detectChanges()

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectUrlSpy.mock.calls[0]?.[0] as Blob
    const exportedPayload = await exportedBlob.text()
    expect(exportedBlob.type).toBe("application/json")
    expect(exportedPayload).toContain('"id": "time-dilation"')
    expect(exportedPayload).toContain('"showActiveMarker": true')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:relativity-json-test")
    expect(host.textContent).toContain("Relativity scenario exported as JSON.")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })

  it("exports the active relativity report as a downloadable CSV file", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const originalCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    const createObjectUrlSpy = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:relativity-csv-test")
    const revokeObjectUrlSpy = vi
      .spyOn(globalThis.URL, "revokeObjectURL")
      .mockImplementation(() => undefined)
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
    ) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === "a") {
        ;(element as HTMLAnchorElement).click = clickSpy
      }
      return element
    }) as typeof document.createElement)

    const host = fixture.nativeElement as HTMLElement
    const exportButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download CSV",
    ) as HTMLButtonElement | undefined

    if (!exportButton) {
      throw new Error("Download CSV button missing in test setup.")
    }

    exportButton.click()
    fixture.detectChanges()

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectUrlSpy.mock.calls[0]?.[0] as Blob
    const exportedPayload = await exportedBlob.text()
    expect(exportedBlob.type).toBe("text/csv")
    expect(exportedPayload).toContain("category,metric,label,value,detail")
    expect(exportedPayload).toContain('"summary","time_gap_s"')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:relativity-csv-test")
    expect(host.textContent).toContain("Relativity report exported as CSV.")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })

  it("resets the active relativity scenario state, overlays, and import textarea", async () => {
    const fixture = TestBed.createComponent(RelativityPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "relativistic-doppler",
        name: "Relativistic Doppler Shift",
        summary: "Imported summary",
        equationSummary: "Equation",
        status: "Imported slice",
        durationSeconds: 0,
        viewBounds: { minX: -0.95, maxX: 0.95, minY: 0, maxY: 1200 },
        focusArea: "Focus",
        emittedFrequencyHertz: 600,
        sourceVelocityFractionOfLight: 0.2,
        observerVelocityFractionOfLight: -0.1,
      },
      snapshot: { timeSeconds: 0 },
      overlays: {
        showReferenceGuides: true,
        showComparisonCurve: false,
        showActiveMarker: false,
      },
    })
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const importButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Import JSON",
    ) as HTMLButtonElement | undefined
    const resetButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Reset",
    ) as HTMLButtonElement | undefined

    if (!importButton || !resetButton) {
      throw new Error("Import or reset button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()
    resetButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Relativistic Doppler Shift")
    expect(host.textContent).toContain("Classical Doppler comparison on")
    expect(host.textContent).toContain("Observed-frequency marker on")
    expect(host.textContent).toContain(
      "Source and observer velocity inputs resolve to relative beta 0.350 c for the active Doppler shift.",
    )
    expect(textarea.value).toBe("")
    expect(host.textContent).not.toContain("Relativity scenario restored from JSON.")
  })
})
