import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { NuclearAndParticlePhysicsPageComponent } from "./nuclear-and-particle-physics-page.component"
import { NuclearAndParticlePhysicsWebGpuRenderer } from "./nuclear-and-particle-physics-webgpu-renderer"

describe("NuclearAndParticlePhysicsPageComponent", () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    })

    await TestBed.configureTestingModule({
      imports: [NuclearAndParticlePhysicsPageComponent],
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

  it("renders the validated Phase 31 surface with the locked scenario trio", async () => {
    const fixture = TestBed.createComponent(NuclearAndParticlePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Nuclear and Particle Physics with Angular and WebGPU")
    expect(host.textContent).toContain(
      "Validated Phase 31 Nuclear and Particle Physics unifies radioactive decay",
    )
    expect(host.textContent).toContain("Validated Phase 31 Nuclear surface")
    expect(host.textContent).toContain("Radioactive Decay")
    expect(host.textContent).toContain("Binding Energy Curve")
    expect(host.textContent).toContain("Proton-Proton Collision")
    expect(host.textContent).toContain("Validated Scenario Set")
    expect(host.textContent).toContain("Validated WebGPU Viewport")
    expect(host.textContent).toContain("The shared Nuclear and Particle Physics surface validates")
    expect(host.textContent).toContain("WebGPU unavailable in tests.")
    expect(host.textContent).toContain("Half-life")
    expect(host.textContent).toContain("Initial population")
    expect(host.textContent).toContain("JSON Payload Preview")
    expect(host.textContent).toContain("CSV Report Preview")
    expect(host.textContent).toContain("Copy JSON")
    expect(host.textContent).toContain("Download JSON")
    expect(host.textContent).toContain("Download CSV")
    expect(host.textContent).toContain("Restore JSON Payload")
    expect(host.textContent).toContain("Insight Cards")
    expect(host.textContent).toContain("Sampled Radioactive Decay Curve")
    expect(host.textContent).toContain("First sampled state")
    expect(host.textContent).toContain("Remaining population: 2.46 T")
    expect(host.textContent).toContain("Decay readout focus: the active live snapshot tracks")
    expect(host.textContent).toContain(
      "Preview focus: the active decay export pairs a scenario-scoped JSON payload",
    )
    expect(host.textContent).toContain(
      "The sampled decay plot tracks 25 deterministic elapsed-time samples",
    )
  })

  it("reports a ready nuclear viewport and tears the renderer down on destroy when WebGPU setup succeeds", async () => {
    const destroySpy = vi.fn()
    const rendererStub = Object.create(
      NuclearAndParticlePhysicsWebGpuRenderer.prototype,
    ) as NuclearAndParticlePhysicsWebGpuRenderer
    vi.spyOn(rendererStub, "render").mockImplementation(() => undefined)
    vi.spyOn(rendererStub, "destroy").mockImplementation(destroySpy)
    const createSpy = vi
      .spyOn(NuclearAndParticlePhysicsWebGpuRenderer, "create")
      .mockResolvedValue(rendererStub)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(NuclearAndParticlePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Nuclear and Particle Physics WebGPU viewport ready.")

    fixture.destroy()
    expect(destroySpy).toHaveBeenCalled()

    createSpy.mockRestore()
  })

  it("reports a nuclear renderer initialization failure when WebGPU setup succeeds but renderer creation fails", async () => {
    const createSpy = vi
      .spyOn(NuclearAndParticlePhysicsWebGpuRenderer, "create")
      .mockResolvedValue(null)

    TestBed.overrideProvider(WebGpuSupportService, {
      useValue: {
        getStatus: async () => ({
          supported: true,
          message: "WebGPU adapter acquired.",
        }),
      },
    })

    const fixture = TestBed.createComponent(NuclearAndParticlePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain(
      "Nuclear and Particle Physics WebGPU viewport initialization failed.",
    )

    createSpy.mockRestore()
  })

  it("switches to the proton-proton collision starter slice", async () => {
    const fixture = TestBed.createComponent(NuclearAndParticlePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const collisionCard = Array.from(host.querySelectorAll(".nuclear-scenario")).find((card) =>
      card.textContent?.includes("Proton-Proton Collision"),
    )
    if (!collisionCard) {
      throw new TypeError("Collision scenario card missing in test setup.")
    }

    collisionCard.dispatchEvent(new Event("click"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Beam energy")
    expect(host.textContent).toContain("Scattering angle")
    expect(host.textContent).toContain("Invariant mass")
    expect(host.textContent).toContain("Sampled Collision Event Curve")
    expect(host.textContent).toContain("Invariant mass:")
    expect(host.textContent).toContain("Transverse momentum:")
    expect(host.textContent).toContain("Collision readout focus: the active live snapshot tracks")
    expect(host.textContent).toContain(
      "Preview focus: the active collider export pairs a scenario-scoped JSON payload",
    )
    expect(host.textContent).toContain(
      "The sampled collision plot tracks 25 deterministic scattering angles",
    )
    expect(host.querySelector(".nuclear-scenario--active")?.textContent).toContain(
      "Proton-Proton Collision",
    )
  })

  it("steps through sampled plot states with keyboard navigation", async () => {
    const fixture = TestBed.createComponent(NuclearAndParticlePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    const nextButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Next sampled state"),
    )
    if (!(nextButton instanceof HTMLButtonElement)) {
      throw new TypeError("Next sampled state button missing in test setup.")
    }

    nextButton.dispatchEvent(new FocusEvent("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample elapsed time 24.0 h")
    expect(host.textContent).toContain("Remaining population: 2.46 T")

    nextButton.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample elapsed time 27.0 h")
    expect(host.textContent).toContain("Remaining population: 2.19 T")

    nextButton.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sample elapsed time 0.0 h")
    expect(host.textContent).toContain("Remaining population: 6.20 T")
  })

  it("restores a binding-energy payload from json input", async () => {
    const fixture = TestBed.createComponent(NuclearAndParticlePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new TypeError("Restore textarea missing in test setup.")
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "binding-energy-curve",
        name: "Imported binding curve",
        summary: "Imported structure slice",
        equationSummary: "Imported relation",
        status: "Imported",
        durationSeconds: 1,
        focusArea: "Imported focus",
        massNumber: 62,
        protonCount: 28,
        bindingEnergyPerNucleonMeV: 8.7,
      },
      snapshot: { timeSeconds: 0.4 },
      overlays: { showReferenceGuides: true, showActiveMarker: false, showComparisonBand: true },
    })
    textarea.dispatchEvent(new Event("input"))

    const restoreButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Restore JSON Payload"),
    )
    if (!(restoreButton instanceof HTMLButtonElement)) {
      throw new TypeError("Restore button missing in test setup.")
    }

    restoreButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Imported binding curve")
    expect(host.textContent).toContain("Nuclear and Particle Physics scenario restored from JSON.")
  })

  it("copies the current nuclear payload to the clipboard", async () => {
    const fixture = TestBed.createComponent(NuclearAndParticlePhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const copyButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Copy JSON"),
    )
    if (!(copyButton instanceof HTMLButtonElement)) {
      throw new TypeError("Copy JSON button missing in test setup.")
    }

    copyButton.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    expect(clipboardWriteText.mock.calls[0]?.[0]).toContain('"id": "radioactive-decay"')
    expect(host.textContent).toContain("Nuclear and Particle Physics scenario copied to clipboard.")
  })

  it("downloads JSON and CSV exports through browser file actions", async () => {
    const fixture = TestBed.createComponent(NuclearAndParticlePhysicsPageComponent)
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
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:nuclear")
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
    expect(host.textContent).toContain("Nuclear and Particle Physics scenario exported as JSON.")

    downloadCsvButton.click()
    fixture.detectChanges()
    expect(anchorClick).toHaveBeenCalledTimes(2)
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(2)
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(2)
    expect(host.textContent).toContain("Nuclear and Particle Physics report exported as CSV.")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })
})
