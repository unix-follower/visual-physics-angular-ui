import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { AstrophysicsPageComponent } from "./astrophysics-page.component"
import { AstrophysicsStateService } from "./astrophysics-state.service"
import { AstrophysicsWebGpuRenderer } from "./astrophysics-webgpu-renderer"

describe("AstrophysicsPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AstrophysicsPageComponent],
      providers: [
        AstrophysicsStateService,
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

  it("renders the initial planetary-orbit slice with export workflow controls", async () => {
    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host: HTMLElement = fixture.nativeElement
    expect(host.textContent).toContain("Astrophysics")
    expect(host.textContent).toContain("Phase 25")
    expect(host.textContent).toContain(
      "Phase 25 now ships a live Angular and WebGPU Astrophysics surface",
    )
    expect(host.textContent).toContain("Planetary Orbit Explorer")
    expect(host.textContent).toContain("WebGPU unavailable in tests.")
    expect(host.textContent).toContain("Current focus: Planetary Orbit Explorer.")
    expect(host.textContent).toContain(
      "Completion status: Phase 25 Astrophysics Angular slice complete.",
    )
    expect(host.textContent).toContain(
      "Prepare the Vulkan follow-on by mirroring the completed Angular orbit diagnostics",
    )
    expect(host.textContent).toContain("Controls")
    expect(host.textContent).toContain("Copy JSON")
    expect(host.textContent).toContain("Download CSV")
    expect(host.textContent).toContain("Viewport context")
    expect(host.textContent).toContain("Sample orbit position")
    expect(host.textContent).toContain("Vertical position: 0.96 AU")
    expect(host.textContent).toContain("Orbital speed: 29.79 km/s")
    expect(host.textContent).toContain("Orbital-axis guides")
    expect(host.querySelectorAll(".astrophysics-page__plot-cursor").length).toBe(1)
    expect(host.textContent).toContain("Orbital-axis guides on")
    expect(host.textContent).toContain("Active orbital marker on")
    expect(host.textContent).toContain("Circular-orbit comparison on")
    expect(host.textContent).toContain("Orbital period")
    expect(host.textContent).toContain("current orbital position used by the sampled trajectory")
    expect(host.querySelector("pre")?.textContent ?? "").toContain('"id": "planetary-orbit"')

    const buttons = Array.from(host.querySelectorAll("button"))
    const previousSampleButton = buttons.find(
      (button) => button.textContent?.trim() === "Previous sample",
    )
    if (!previousSampleButton) {
      throw new Error("Previous sample button missing in test setup.")
    }
    expect(previousSampleButton.hasAttribute("disabled")).toBe(false)
  })

  it("initializes the Astrophysics WebGPU renderer when support is available", async () => {
    const destroySpy = vi.fn()
    const createSpy = vi.spyOn(AstrophysicsWebGpuRenderer, "create").mockResolvedValue({
      render: vi.fn(),
      destroy: destroySpy,
    } as unknown as AstrophysicsWebGpuRenderer)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host: HTMLElement = fixture.nativeElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Astrophysics WebGPU viewport ready.")

    fixture.destroy()
    expect(destroySpy).toHaveBeenCalled()

    createSpy.mockRestore()
  })

  it("reports an Astrophysics renderer initialization failure when setup succeeds but renderer creation fails", async () => {
    const createSpy = vi.spyOn(AstrophysicsWebGpuRenderer, "create").mockResolvedValue(null)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host: HTMLElement = fixture.nativeElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("WebGPU renderer initialization failed.")

    createSpy.mockRestore()
  })

  it("updates the orbit slice when the orbital radius control changes", async () => {
    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host: HTMLElement = fixture.nativeElement
    const radiusInput = Array.from(host.querySelectorAll("input")).find((input) =>
      input.previousElementSibling?.textContent?.includes("Orbital radius"),
    )

    if (!radiusInput) {
      throw new Error("Orbital radius input missing in test setup.")
    }

    radiusInput.value = "1.5"
    radiusInput.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Orbital period")
    expect(host.querySelector("pre")?.textContent ?? "").toContain(
      '"orbitalRadiusAstronomicalUnits": 1.5',
    )
  })

  it("toggles viewport overlays and reflects the change in the export preview", async () => {
    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host: HTMLElement = fixture.nativeElement
    expect(host.querySelectorAll(".astrophysics-page__plot-guide").length).toBeGreaterThan(0)

    const guideToggle = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Orbital-axis guides on",
    )

    if (!guideToggle) {
      throw new Error("Viewport guide toggle missing in test setup.")
    }

    guideToggle.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Orbital-axis guides off")
    expect(host.querySelectorAll(".astrophysics-page__plot-guide").length).toBe(0)
    expect(host.querySelector("pre")?.textContent ?? "").toContain('"showReferenceGuides": false')
  })

  it("shows snapshot time in readouts after restoring the hubble slice", async () => {
    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host: HTMLElement = fixture.nativeElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "hubble-expansion",
        name: "Hubble Expansion",
        summary: "Imported cosmology summary",
        equationSummary: "Imported equation",
        status: "Imported slice",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 2000, minY: 0, maxY: 160000 },
        focusArea: "Imported cosmology focus",
        distanceMegaparsecs: 250,
        hubbleConstantKilometersPerSecondPerMegaparsec: 67,
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

    expect(host.textContent).toContain("Snapshot time")
    expect(host.textContent).toContain("0.40 s")
    expect(host.querySelectorAll("pre")[1]?.textContent ?? "").toContain("snapshot_time_s")
    expect(host.querySelectorAll("pre")[1]?.textContent ?? "").toContain('"0.400000"')

    const plot = host.querySelector('[aria-label="Hubble-law profile"]')
    if (!plot) {
      throw new Error("Hubble plot missing in test setup.")
    }

    plot.dispatchEvent(new Event("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Active distance: 203.125 Mpc")
    expect(host.textContent).toContain("Active recession speed: 13609.375 km/s")
    expect(host.textContent).toContain("Sample distance 203 Mpc")
  })

  it("restores a hubble-expansion scenario from json and updates overlays", async () => {
    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host: HTMLElement = fixture.nativeElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "hubble-expansion",
        name: "Hubble Expansion",
        summary: "Imported cosmology summary",
        equationSummary: "Imported equation",
        status: "Imported slice",
        durationSeconds: 0,
        viewBounds: { minX: 0, maxX: 2000, minY: 0, maxY: 160000 },
        focusArea: "Imported cosmology focus",
        distanceMegaparsecs: 250,
        hubbleConstantKilometersPerSecondPerMegaparsec: 67,
      },
      snapshot: { timeSeconds: 0 },
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

    expect(host.textContent).toContain("Astrophysics scenario restored from JSON.")
    expect(host.textContent).toContain("Hubble Expansion")
    expect(host.textContent).toContain("Imported cosmology focus")
    expect(host.textContent).toContain("Distance and zero-velocity guides on")
    expect(host.textContent).toContain("Active galaxy marker off")
    expect(host.textContent).toContain("Light-travel comparison off")
    expect(host.querySelector("pre")?.textContent ?? "").toContain('"distanceMegaparsecs": 250')
  })

  it("rejects malformed payloads through the Astrophysics import workflow", async () => {
    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host: HTMLElement = fixture.nativeElement
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
    expect(host.textContent).toContain("Planetary Orbit Explorer")
  })

  it("focuses the plot to expose a sampled astrophysics readout", async () => {
    const fixture = TestBed.createComponent(AstrophysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host: HTMLElement = fixture.nativeElement
    const plot = host.querySelector('[aria-label="Orbital plane"]')
    if (!plot) {
      throw new Error("Astrophysics plot missing in test setup.")
    }

    plot.dispatchEvent(new Event("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample orbit position")
    expect(host.textContent).toContain("Orbital speed: 29.79 km/s")
    expect(host.textContent).toContain("Vertical position: 0.96 AU")
    expect(host.textContent).toContain("Viewport context")
  })
})
