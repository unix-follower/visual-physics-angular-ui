import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { SolidStatePhysicsPageComponent } from "./solid-state-physics-page.component"
import { SolidStatePhysicsWebGpuRenderer } from "./solid-state-physics-webgpu-renderer"

describe("SolidStatePhysicsPageComponent", () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    })

    await TestBed.configureTestingModule({
      imports: [SolidStatePhysicsPageComponent],
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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the Phase 29 surface with the locked scenario trio", async () => {
    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Solid State Physics with Angular and WebGPU")
    expect(host.textContent).toContain(
      "Validated Phase 29 Solid State Physics unifies crystal elasticity",
    )
    expect(host.textContent).toContain(
      "The validated Solid State Physics Angular surface unifies the Phase 29 scenario set",
    )
    expect(host.textContent).toContain("Validated Phase 29 Solid State surface")
    expect(host.textContent).toContain("Crystal Elasticity")
    expect(host.textContent).toContain("Phonon Dispersion")
    expect(host.textContent).toContain("Electronic Structure")
    expect(host.textContent).toContain("Validated material slice")
    expect(host.textContent).toContain("Validated Scenario Set")
    expect(host.textContent).toContain("The shared Solid State Physics surface validates")
    expect(host.textContent).toContain("Validated WebGPU Viewport")
    expect(host.textContent).toMatch(/Checking WebGPU capability...|WebGPU unavailable in tests\./)
    expect(host.textContent).toContain("Validated Payload Review")
    expect(host.textContent).toContain("JSON Payload Preview")
    expect(host.textContent).toContain("CSV Report Preview")
    expect(host.textContent).toContain("Restore JSON Payload")
    expect(host.textContent).toContain("Strain envelope")
    expect(host.textContent).toContain(
      "Max strain, Young's modulus, and yield strength keep the active crystal slice",
    )
    expect(host.textContent).toContain("Yield margin")
    expect(host.textContent).toContain(
      "Crystal status focus: the active material sweep remains at the yield threshold",
    )
    expect(host.textContent).toContain("Preview scenario")
    expect(host.textContent).toContain("crystal-elasticity")
    expect(host.textContent).toContain(
      "Preview focus: the active crystal export pairs a scenario-scoped JSON payload",
    )
    expect(host.textContent).toContain(
      "Crystal insight focus: the active material slice keeps stress at",
    )
    expect(host.textContent).toContain("Crystal readout focus: the active live snapshot tracks")
    expect(host.textContent).toContain(
      "deterministic material samples support the active summary rows",
    )
    expect(host.textContent).toContain(
      "The shared WebGPU viewport renders the active material, transport, or carrier slice",
    )
    expect(host.textContent).toContain(
      "The shared restore workflow normalizes imported bounds and overlay flags before the validated material, transport, or carrier slice is applied.",
    )
    expect(host.textContent).toContain(
      "Use hover, focus, or arrow keys to step through the validated sample set.",
    )
  })

  it("reports a ready solid-state viewport and tears the renderer down on destroy when WebGPU setup succeeds", async () => {
    const destroySpy = vi.fn()
    const createSpy = vi.spyOn(SolidStatePhysicsWebGpuRenderer, "create").mockResolvedValue({
      render: vi.fn(),
      destroy: destroySpy,
    } as unknown as SolidStatePhysicsWebGpuRenderer)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Solid State Physics WebGPU viewport ready.")

    fixture.destroy()
    expect(destroySpy).toHaveBeenCalled()

    createSpy.mockRestore()
  })

  it("reports a solid-state renderer initialization failure when WebGPU setup succeeds but renderer creation fails", async () => {
    const createSpy = vi.spyOn(SolidStatePhysicsWebGpuRenderer, "create").mockResolvedValue(null)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Solid State Physics WebGPU viewport initialization failed.")

    createSpy.mockRestore()
  })

  it("switches to phonon dispersion and updates the active scenario state", async () => {
    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const phononCard = Array.from(host.querySelectorAll(".solid-state-scenario")).find((card) =>
      card.textContent?.includes("Phonon Dispersion"),
    )
    if (!phononCard) {
      throw new Error("Phonon scenario card missing in test setup.")
    }

    phononCard.dispatchEvent(new Event("click"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Dispersion profile")
    expect(host.textContent).toContain("Wave vector")
    expect(host.textContent).toContain("Acoustic frequency")
    expect(host.textContent).toContain("Validated transport slice")
    expect(host.textContent).toContain("Lattice sweep")
    expect(host.textContent).toContain(
      "Lattice spacing, spring stiffness, and atomic mass keep the active phonon slice",
    )
    expect(host.textContent).toContain("Zone position")
    expect(host.textContent).toContain(
      "Phonon status focus: the active dispersion slice remains stable",
    )
    expect(host.textContent).toContain("phonon-dispersion")
    expect(host.textContent).toContain(
      "Preview focus: the active phonon export pairs a scenario-scoped JSON payload",
    )
    expect(host.textContent).toContain(
      "Phonon insight focus: the active dispersion slice keeps the acoustic branch at",
    )
    expect(host.textContent).toContain("Phonon readout focus: the active live snapshot tracks k =")
    expect(host.textContent).toContain(
      "deterministic phonon samples support the active summary rows",
    )
    expect(host.querySelector(".solid-state-scenario--active")?.textContent).toContain(
      "Phonon Dispersion",
    )
  })

  it("restores an electronic-structure payload from json input", async () => {
    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("Restore textarea missing in test setup.")
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "electronic-structure",
        name: "Electronic Structure",
        summary: "Imported electronic structure view",
        equationSummary: "g(E) approx sqrt(E - Ec)",
        status: "Imported slice",
        durationSeconds: 1,
        viewBounds: { minX: 3, maxX: -2, minY: 8, maxY: 1 },
        focusArea: "Imported carrier focus",
        bandGapElectronVolts: 1.4,
        effectiveMassRatio: 0.31,
        dopantDensityPerCubicCentimeter: 4e16,
      },
      snapshot: { timeSeconds: 0.35 },
      overlays: {
        showReferenceGuides: false,
        showActiveMarker: true,
        showComparisonBand: false,
      },
    })
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const restoreButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Apply Validated JSON Restore"),
    )
    if (!(restoreButton instanceof HTMLButtonElement)) {
      throw new Error("Restore button missing in test setup.")
    }

    restoreButton.dispatchEvent(new Event("click"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Imported Electronic Structure payload.")
    expect(host.textContent).toContain("Energy marker on")
    expect(host.textContent).toContain("Band-edge guides off")
    expect(host.textContent).toContain("Imported slice")
    expect(host.querySelector(".solid-state-scenario--active")?.textContent).toContain(
      "Electronic Structure",
    )
  })

  it("reports an invalid restore payload instead of throwing", async () => {
    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error("Restore textarea missing in test setup.")
    }

    textarea.value = "{bad json"
    textarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const restoreButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Apply Validated JSON Restore"),
    )
    if (!(restoreButton instanceof HTMLButtonElement)) {
      throw new Error("Restore button missing in test setup.")
    }

    expect(() => restoreButton.dispatchEvent(new Event("click"))).not.toThrow()
    fixture.detectChanges()

    expect(host.textContent).toContain("Invalid payload.")
    expect(host.querySelector(".solid-state-scenario--active")?.textContent).toContain(
      "Crystal Elasticity",
    )
  })

  it("supports keyboard sample inspection on the phonon plot", async () => {
    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const phononCard = Array.from(host.querySelectorAll(".solid-state-scenario")).find((card) =>
      card.textContent?.includes("Phonon Dispersion"),
    )
    if (!phononCard) {
      throw new Error("Phonon scenario card missing in test setup.")
    }

    phononCard.dispatchEvent(new Event("click"))
    fixture.detectChanges()

    const plotSurface = host.querySelector(".solid-state-plot__surface")
    if (!(plotSurface instanceof HTMLDivElement)) {
      throw new Error("Plot surface missing in test setup.")
    }

    plotSurface.dispatchEvent(new Event("focus"))
    plotSurface.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample reduced wave vector")
    expect(host.textContent).toContain("Acoustic branch")
    expect(host.textContent).toContain("Optical branch")
    expect(host.textContent).toContain("First sampled state")
    expect(host.textContent).toContain("Last sampled state")
  })

  it("copies the current solid-state payload to the clipboard", async () => {
    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const copyButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Copy JSON"),
    )
    if (!(copyButton instanceof HTMLButtonElement)) {
      throw new Error("Copy JSON button missing in test setup.")
    }

    copyButton.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    expect(clipboardWriteText.mock.calls[0]?.[0]).toContain('"id": "crystal-elasticity"')
    expect(host.textContent).toContain("Solid State Physics scenario copied to clipboard.")
  })

  it("downloads JSON and CSV exports through browser file actions", async () => {
    const fixture = TestBed.createComponent(SolidStatePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const anchorClick = vi.fn()
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "a") {
          return {
            click: anchorClick,
            href: "",
            download: "",
          } as unknown as HTMLAnchorElement
        }

        return document.createElement(tagName)
      })
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:solid-state")
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)

    const buttons = Array.from(host.querySelectorAll("button"))
    const downloadJsonButton = buttons.find((button) =>
      button.textContent?.includes("Download JSON"),
    )
    const downloadCsvButton = buttons.find((button) => button.textContent?.includes("Download CSV"))
    if (
      !(downloadJsonButton instanceof HTMLButtonElement) ||
      !(downloadCsvButton instanceof HTMLButtonElement)
    ) {
      throw new Error("Download buttons missing in test setup.")
    }

    downloadJsonButton.click()
    fixture.detectChanges()
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain("Solid State Physics scenario exported as JSON.")

    downloadCsvButton.click()
    fixture.detectChanges()
    expect(anchorClick).toHaveBeenCalledTimes(2)
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(2)
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(2)
    expect(host.textContent).toContain("Solid State Physics report exported as CSV.")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })
})
