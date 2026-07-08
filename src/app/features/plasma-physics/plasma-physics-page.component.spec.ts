import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { PlasmaPhysicsPageComponent } from "./plasma-physics-page.component"
import { PlasmaPhysicsWebGpuRenderer } from "./plasma-physics-webgpu-renderer"

describe("PlasmaPhysicsPageComponent", () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    })

    await TestBed.configureTestingModule({
      imports: [PlasmaPhysicsPageComponent],
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

  it("renders the validated Phase 33 Plasma surface with the locked scenario trio", async () => {
    const fixture = TestBed.createComponent(PlasmaPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Plasma Physics with Angular and WebGPU")
    expect(host.textContent).toContain(
      "Validated Phase 33 Plasma Physics unifies plasma oscillation",
    )
    expect(host.textContent).toContain("Validated Phase 33 Plasma surface")
    expect(host.textContent).toContain("Implementation Status")
    expect(host.textContent).toContain(
      "The validated Plasma Physics Angular surface unifies the Phase 33 scenario set",
    )
    expect(host.textContent).toContain("Plasma Oscillation")
    expect(host.textContent).toContain("Debye Screening")
    expect(host.textContent).toContain("Magnetic Confinement")
    expect(host.textContent).toContain("Validated Scenario Set")
    expect(host.textContent).toContain(
      "The shared Plasma Physics surface validates plasma oscillation",
    )
    expect(host.textContent).toContain("Insight Cards")
    expect(host.textContent).toContain("Sampled Plasma Oscillation Profile")
    expect(host.textContent).toContain("Validated WebGPU Viewport")
    expect(host.textContent).toContain(
      "The shared Plasma Physics viewport now renders the active oscillation",
    )
    expect(host.textContent).toContain("JSON Payload Preview")
    expect(host.textContent).toContain("CSV Report Preview")
    expect(host.textContent).toContain(
      "Preview focus: the active oscillation export pairs a scenario-scoped JSON payload",
    )
    expect(host.textContent).toContain("Download JSON")
    expect(host.textContent).toContain("Download CSV")
    expect(host.textContent).toContain("Restore JSON Payload")
    expect(host.textContent).toContain(
      "Restore focus: import a Plasma JSON payload exported from this workspace",
    )
    expect(host.textContent).toContain("WebGPU unavailable in tests.")
  })

  it("reports a ready plasma viewport and tears the renderer down on destroy when WebGPU setup succeeds", async () => {
    const destroySpy = vi.fn()
    const rendererStub = Object.create(
      PlasmaPhysicsWebGpuRenderer.prototype,
    ) as PlasmaPhysicsWebGpuRenderer
    vi.spyOn(rendererStub, "render").mockImplementation(() => undefined)
    vi.spyOn(rendererStub, "destroy").mockImplementation(destroySpy)
    const createSpy = vi
      .spyOn(PlasmaPhysicsWebGpuRenderer, "create")
      .mockResolvedValue(rendererStub)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(PlasmaPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Plasma Physics WebGPU viewport ready.")

    fixture.destroy()
    expect(destroySpy).toHaveBeenCalled()

    createSpy.mockRestore()
  })

  it("reports a plasma renderer initialization failure when WebGPU setup succeeds but renderer creation fails", async () => {
    const createSpy = vi.spyOn(PlasmaPhysicsWebGpuRenderer, "create").mockResolvedValue(null)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(PlasmaPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Plasma Physics WebGPU viewport initialization failed.")

    createSpy.mockRestore()
  })

  it("switches to the magnetic-confinement starter slice", async () => {
    const fixture = TestBed.createComponent(PlasmaPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    const confinementCard = Array.from(host.querySelectorAll(".plasma-scenario")).find((card) =>
      card.textContent?.includes("Magnetic Confinement"),
    )
    if (!confinementCard) {
      throw new TypeError("Magnetic confinement card missing in test setup.")
    }

    confinementCard.dispatchEvent(new Event("click"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Magnetic field")
    expect(host.textContent).toContain("Plasma current")
    expect(host.textContent).toContain("Safety factor")
    expect(host.textContent).toContain("Sampled Magnetic Confinement Profile")
  })

  it("restores an imported Debye screening payload", async () => {
    const fixture = TestBed.createComponent(PlasmaPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    const textareas = host.querySelectorAll("textarea")
    const restoreTextarea = textareas.item(textareas.length - 1)
    if (!(restoreTextarea instanceof HTMLTextAreaElement)) {
      throw new TypeError("Restore textarea missing in test setup.")
    }

    restoreTextarea.value = JSON.stringify({
      scenario: {
        id: "debye-screening",
        name: "Imported Debye Screening",
        summary: "Imported plasma shielding slice",
        equationSummary: "Imported shielding relation",
        status: "Imported",
        durationSeconds: 1,
        focusArea: "Imported focus",
        electronDensityPerCubicMeter: 2.4e18,
        electronTemperatureElectronVolts: 12,
        probePotentialVolts: 22,
      },
      snapshot: { timeSeconds: 0.4 },
      overlays: {
        showReferenceGuides: false,
        showActiveMarker: true,
        showComparisonBand: false,
      },
    })
    restoreTextarea.dispatchEvent(new Event("input"))
    fixture.detectChanges()

    const restoreButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Restore Plasma Payload"),
    )
    if (!(restoreButton instanceof HTMLButtonElement)) {
      throw new TypeError("Restore button missing in test setup.")
    }

    restoreButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Imported Debye Screening")
    expect(host.textContent).toContain("Plasma scenario restored from JSON.")
    expect(host.textContent).toContain("Sampled Debye Screening Profile")
  })

  it("steps through sampled plasma states with keyboard navigation", async () => {
    const fixture = TestBed.createComponent(PlasmaPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    const plot = host.querySelector('svg[role="img"]')
    if (!(plot instanceof SVGElement)) {
      throw new TypeError("Sampled plot surface missing in test setup.")
    }

    plot.dispatchEvent(new FocusEvent("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample phase 0.33")
    expect(host.textContent).toContain("Density response")

    plot.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample phase 0.38")

    plot.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample phase 0.00")
  })

  it("downloads the current plasma payload and csv report", async () => {
    const fixture = TestBed.createComponent(PlasmaPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    const anchorClick = vi.fn()
    const nativeCreateElement = document.createElement.bind(document)
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

        return nativeCreateElement(tagName)
      })
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:plasma")
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
      throw new TypeError("Download buttons missing in test setup.")
    }

    downloadJsonButton.click()
    fixture.detectChanges()
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain("Plasma scenario exported as JSON.")

    downloadCsvButton.click()
    fixture.detectChanges()
    expect(anchorClick).toHaveBeenCalledTimes(2)
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(2)
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(2)
    expect(host.textContent).toContain("Plasma report exported as CSV.")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })
})
