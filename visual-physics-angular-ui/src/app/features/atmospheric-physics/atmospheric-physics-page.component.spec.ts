import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { AtmosphericPhysicsPageComponent } from "./atmospheric-physics-page.component"
import { AtmosphericPhysicsWebGpuRenderer } from "./atmospheric-physics-webgpu-renderer"

describe("AtmosphericPhysicsPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtmosphericPhysicsPageComponent],
      providers: [
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

  it("renders the current Phase 27 atmospheric surface and scenario set", async () => {
    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Atmospheric Physics with Angular and WebGPU")
    expect(host.textContent).toContain("Phase 27 atmospheric scenario set in progress")
    expect(host.textContent).toContain(
      "Phase 27 now ships a validated Atmospheric Physics surface covering barometric formula",
    )
    expect(host.textContent).toContain(
      "The Atmospheric Physics Angular surface now covers the active Phase 27 scenario set",
    )
    expect(host.textContent).toContain("Barometric Formula")
    expect(host.textContent).toContain("Adiabatic Lapse Rate")
    expect(host.textContent).toContain("Convection Column")
    expect(host.textContent).toContain("Validated vertical slice • Active")
    expect(host.textContent).toContain("Validated vertical slice")
    expect(host.textContent).toContain("Current implementation includes validated")
    expect(host.textContent).toContain("WebGPU unavailable in tests.")
    expect(host.textContent).toContain("Live Readouts")
    expect(host.textContent).toContain("Status")
    expect(host.textContent).toContain("Pressure")
    expect(host.textContent).toContain("76.14 kPa")
    expect(host.textContent).toContain("Scale height")
    expect(host.textContent).toContain("8.4 km")
    expect(host.textContent).toContain("Scenario status")
    expect(host.textContent).toContain("Numerical state")
    expect(host.textContent).toContain("Stable")
    expect(host.textContent).toContain("Viewport state")
    expect(host.textContent).toContain("WebGPU unavailable in tests.")
    expect(host.textContent).toContain("Reference guides")
    expect(host.textContent).toContain("Enabled")
    expect(host.textContent).toContain(
      "This slice now shares one normalized state, plot, report, export, and WebGPU viewport path",
    )
    expect(host.textContent).toContain(
      "Sea-level pressure and scale-height inputs keep the active column",
    )
    expect(host.textContent).toContain(
      "Barometric insight focus: the hydrostatic column remains numerically stable",
    )
    expect(host.textContent).toContain("Copy JSON")
    expect(host.textContent).toContain("Download CSV")
    expect(host.textContent).toContain("Export and Restore")
    expect(host.textContent).toContain("Import from file")
    expect(host.textContent).toContain("JSON Preview")
    expect(host.textContent).toContain("CSV Preview")
  })

  it("initializes the Atmospheric Physics WebGPU renderer when support is available", async () => {
    const destroySpy = vi.fn()
    const createSpy = vi.spyOn(AtmosphericPhysicsWebGpuRenderer, "create").mockResolvedValue({
      render: vi.fn(),
      destroy: destroySpy,
    } as unknown as AtmosphericPhysicsWebGpuRenderer)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Atmospheric Physics WebGPU viewport ready.")

    fixture.destroy()
    expect(destroySpy).toHaveBeenCalled()

    createSpy.mockRestore()
  })

  it("reports an Atmospheric renderer initialization failure when setup succeeds but renderer creation fails", async () => {
    const createSpy = vi.spyOn(AtmosphericPhysicsWebGpuRenderer, "create").mockResolvedValue(null)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("WebGPU renderer initialization failed.")

    createSpy.mockRestore()
  })

  it("switches scenarios and updates the export preview", async () => {
    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const convectionCard = Array.from(host.querySelectorAll(".atmospheric-scenario")).find((card) =>
      card.textContent?.includes("Convection Column"),
    )
    if (!convectionCard) {
      throw new Error("Convection scenario card missing in test setup.")
    }

    convectionCard.dispatchEvent(new Event("click"))
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    const activeScenario = host.querySelector(".atmospheric-scenario--active")
    expect(host.textContent).toContain("Convection Column")
    expect(host.textContent).toContain("Parcel altitude")
    expect(host.textContent).toContain("CAPE proxy")
    expect(host.textContent).toContain("active convective slice")
    expect(host.textContent).toContain(
      "Environmental lapse rate and parcel temperature excess keep the parcel",
    )
    expect(host.textContent).toContain(
      "Convection insight focus: parcel ascent remains numerically stable",
    )
    expect(activeScenario?.textContent).toContain("Convection Column")
    expect(activeScenario?.getAttribute("aria-pressed")).toBe("true")
    expect(host.textContent).toContain("Validated vertical slice • Active")
    expect(preview).toContain('"id": "convection-column"')
    expect(preview).toContain('"parcelTemperatureExcessKelvin": 3.5')
  })

  it("renders scenario cards as native buttons with pressed state", async () => {
    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const adiabaticCard = Array.from(host.querySelectorAll(".atmospheric-scenario")).find((card) =>
      card.textContent?.includes("Adiabatic Lapse Rate"),
    ) as HTMLElement | undefined
    if (!adiabaticCard) {
      throw new Error("Adiabatic scenario card missing in test setup.")
    }

    const activeScenario = host.querySelector(".atmospheric-scenario--active")
    expect(adiabaticCard.tagName).toBe("BUTTON")
    expect(adiabaticCard.getAttribute("aria-pressed")).toBe("false")
    expect(activeScenario?.textContent).toContain("Barometric Formula")
    expect(activeScenario?.getAttribute("aria-pressed")).toBe("true")
  })

  it("focuses the plot to expose a sampled readout", async () => {
    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const plot = host.querySelector('div[role="img"]')
    if (!plot) {
      throw new Error("Atmospheric plot missing in test setup.")
    }

    plot.dispatchEvent(new Event("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample altitude 2.25 km")
    expect(host.textContent).toContain("Pressure: 77.52 kPa")
    expect(host.textContent).toContain("Relative density: 0.765")
    expect(host.querySelectorAll(".atmospheric-plot__cursor").length).toBe(1)
  })

  it("restores a convection-column scenario from json and updates overlays", async () => {
    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "convection-column",
        name: "Convection Column",
        summary: "Imported convection summary",
        equationSummary: "Imported convection relation",
        status: "Imported slice",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 22 },
        focusArea: "Imported convective focus",
        surfaceTemperatureKelvin: 304,
        environmentalLapseRateKelvinPerKilometer: 7.1,
        parcelTemperatureExcessKelvin: 4.2,
        columnHeightKilometers: 10,
      },
      snapshot: { timeSeconds: 0.4 },
      overlays: {
        showReferenceGuides: true,
        showActiveMarker: false,
        showComparisonBand: false,
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

    expect(host.textContent).toContain("Atmospheric Physics scenario restored from JSON.")
    expect(host.textContent).toContain("Convection Column")
    expect(host.textContent).toContain("Imported convective focus")
    expect(host.textContent).toContain("Parcel guides on")
    expect(host.textContent).toContain("Parcel marker off")
    expect(host.textContent).toContain("Buoyancy comparison off")
    expect(host.querySelector("pre")?.textContent ?? "").toContain('"columnHeightKilometers": 10')
  })

  it("restores an atmospheric scenario from a JSON file input", async () => {
    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const input = host.querySelector('input[type="file"]') as HTMLInputElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    const file = {
      text: async () =>
        JSON.stringify({
          scenario: {
            id: "adiabatic-lapse-rate",
            name: "Adiabatic Lapse Rate",
            summary: "Imported adiabatic summary",
            equationSummary: "Imported lapse relation",
            status: "Imported slice",
            durationSeconds: 1,
            viewBounds: { minX: 180, maxX: 310, minY: 0, maxY: 12 },
            focusArea: "Imported lapse focus",
            surfaceTemperatureKelvin: 302,
            lapseRateKelvinPerKilometer: 8.2,
            tropopauseHeightKilometers: 9.5,
          },
          snapshot: { timeSeconds: 0.35 },
          overlays: {
            showReferenceGuides: false,
            showActiveMarker: true,
            showComparisonBand: true,
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

    expect(host.textContent).toContain("Atmospheric Physics scenario restored from JSON.")
    expect(host.textContent).toContain("Adiabatic Lapse Rate")
    expect(host.textContent).toContain("Imported lapse focus")
    expect(host.textContent).toContain(
      "Surface temperature and lapse-rate inputs keep the active layer",
    )
    expect(textarea.value).toContain('"lapseRateKelvinPerKilometer": 8.2')
    expect(textarea.value).toContain('"showReferenceGuides": false')
    expect(input.value).toBe("")
  })

  it("rejects malformed payloads through the Atmospheric import workflow", async () => {
    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = '{"scenario": 1}'
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

    expect(host.textContent).toContain(
      "Import failed. Use a JSON payload exported from this workspace.",
    )
    expect(host.textContent).toContain("Barometric Formula")
  })

  it("normalizes imported atmospheric payload fields before rendering the export preview", async () => {
    const fixture = TestBed.createComponent(AtmosphericPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "barometric-formula",
        name: "Barometric Formula",
        summary: "Imported mixed payload",
        equationSummary: "P(z) = P0 exp(-z / H)",
        status: "Imported",
        durationSeconds: 1,
        viewBounds: { minX: 10, maxX: 1, minY: 5, maxY: 5 },
        focusArea: "Imported normalization focus",
        seaLevelPressureKilopascals: 90,
        scaleHeightKilometers: 7,
        parcelTemperatureExcessKelvin: 4.4,
      },
      snapshot: { timeSeconds: 0.6 },
      overlays: {
        showReferenceGuides: false,
        showActiveMarker: true,
        showComparisonBand: true,
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

    const exportPreview = host.querySelector("pre")?.textContent ?? ""
    expect(exportPreview).toContain('"seaLevelPressureKilopascals": 90')
    expect(exportPreview).toContain('"scaleHeightKilometers": 7')
    expect(exportPreview).not.toContain("parcelTemperatureExcessKelvin")
    expect(exportPreview).toContain('"minX": 0')
    expect(exportPreview).toContain('"maxX": 12')
    expect(host.textContent).toContain("Scale-height guides off")
  })
})
