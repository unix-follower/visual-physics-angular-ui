import { TestBed } from "@angular/core/testing"
import { vi } from "vitest"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { ComputationalPhysicsPageComponent } from "./computational-physics-page.component"
import { ComputationalPhysicsStateService } from "./computational-physics-state.service"

describe("ComputationalPhysicsPageComponent", () => {
  let createObjectUrlSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectUrlSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:computational-physics-test")
    revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

    await TestBed.configureTestingModule({
      imports: [ComputationalPhysicsPageComponent],
      providers: [
        ComputationalPhysicsStateService,
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
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })

  it("renders the Phase 9 solver-comparison shell and updates the preview when solver focus changes", async () => {
    const fixture = TestBed.createComponent(ComputationalPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Computational / Numerical Physics with Angular and WebGPU")
    expect(host.textContent).toContain("Projectile Solver Comparison")

    const eulerButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Focus Euler"),
    ) as HTMLButtonElement | undefined

    if (!eulerButton) {
      throw new Error("Euler focus button missing in test setup.")
    }

    eulerButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Active solver EULER")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"solverMethod": "euler"')
    expect(host.textContent).toContain("Symplectic on")
    expect(host.textContent).toContain("Timestep Convergence")
    expect(host.textContent).toContain("Best stable solver")
    expect(host.querySelector('svg[aria-label="Timestep convergence plot"]')).not.toBeNull()
    expect(host.textContent).toContain("Download Convergence CSV")
    expect(host.textContent).toContain("Order from Δt")
    expect(host.textContent).toContain("recommended Δt")
    expect(host.textContent).toContain("Best recommended Δt")
    expect(host.textContent).toContain("Best stability recommendation")
    expect(host.textContent).toContain("Stability rank 1")
  })

  it("restores scenario state from imported JSON through the page UI", async () => {
    const fixture = TestBed.createComponent(ComputationalPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(ComputationalPhysicsStateService)
    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      solverMethod: "symplectic",
      scenario: {
        ...service.selectedScenario(),
        comparisonStepSeconds: 0.08,
      },
      snapshot: { timeSeconds: 1.5 },
      overlays: {
        showReferenceTrajectory: true,
        showEulerTrajectory: false,
        showSymplecticTrajectory: true,
        showRk4Trajectory: true,
        showErrorBars: false,
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

    expect(host.textContent).toContain("Computational Physics scenario restored from JSON.")
    expect(host.textContent).toContain("1.50 s")
    expect(host.textContent).toContain("Active solver SYMPLECTIC")
    expect(host.textContent).toContain("Δt 0.080")
    expect(host.textContent).toContain("Order from Δt 0.080")
    expect(host.textContent).toContain("recommended Δt for tolerance")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"comparisonStepSeconds": 0.08')
    expect(preview).toContain('"convergenceSamples"')
    expect(preview).toContain('"showEulerTrajectory": false')
    expect(preview).toContain('"showSymplecticTrajectory": true')
  })

  it("switches to the orbital solver-comparison scenario and shows orbital controls", async () => {
    const fixture = TestBed.createComponent(ComputationalPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "orbital-solver-comparison"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Orbital Solver Comparison")
    expect(host.textContent).toContain("Orbital Controls")
    expect(host.textContent).toContain("Focus Symplectic")
    expect(host.textContent).toContain("Euler energy error")
    expect(host.textContent).toContain("Symplectic angular momentum error")
    expect(host.textContent).toContain("Invariant Drift History")
    expect(host.textContent).toContain("Energy Drift Plot")
    expect(host.textContent).toContain("Angular Momentum Drift Plot")
    expect(host.textContent).toContain("Orbital Energy Convergence")
    expect(host.textContent).toContain("Orbital Angular Momentum Convergence")
    expect(host.textContent).toContain("recommended orbital energy Δt")
    expect(host.textContent).toContain("recommended orbital angularMomentum Δt")
    expect(host.textContent).toContain("Orbital energy order from Δt")
    expect(host.textContent).toContain("Orbital angular momentum order from Δt")
    expect(host.textContent).toContain("Best stability recommendation")
    expect(host.textContent).toContain("limited by")
    expect(host.querySelector('svg[aria-label="Orbital energy convergence plot"]')).not.toBeNull()
    expect(
      host.querySelector('svg[aria-label="Orbital angular momentum convergence plot"]'),
    ).not.toBeNull()
    expect(host.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3)
    expect(host.textContent).toContain("Download Invariant CSV")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"gravitationalParameter": 20')
    expect(preview).toContain('"orbitalCenter"')
    expect(preview).toContain('"orbitalInvariantHistory"')
    expect(preview).toContain('"convergencePlotGuides"')
  })

  it("switches to the spring oscillator scenario and shows spring controls", async () => {
    const fixture = TestBed.createComponent(ComputationalPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "spring-oscillator-comparison"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Spring Oscillator Comparison")
    expect(host.textContent).toContain("Spring Controls")
    expect(host.textContent).toContain("Spring anchor x")
    expect(host.textContent).toContain("Spring constant")
    expect(host.textContent).toContain("Damping coefficient")
    expect(host.textContent).toContain("Euler spring energy error")
    expect(host.textContent).toContain("RK4 amplitude error")
    expect(host.textContent).toContain("RK4 phase error")
    expect(host.textContent).toContain("Oscillator Drift History")
    expect(host.textContent).toContain("Spring Energy Drift Plot")
    expect(host.textContent).toContain("Amplitude Drift Plot")
    expect(host.textContent).toContain("Phase Drift Plot")
    expect(host.textContent).toContain("Spring Energy Convergence")
    expect(host.textContent).toContain("Spring Phase Convergence")
    expect(host.textContent).toContain("recommended spring energy Δt")
    expect(host.textContent).toContain("recommended spring phase Δt")
    expect(host.textContent).toContain("Spring energy order from Δt")
    expect(host.textContent).toContain("Spring phase order from Δt")
    expect(host.textContent).toContain("Best stability recommendation")
    expect(host.textContent).toContain("Stability rank 1")
    expect(host.querySelector('svg[aria-label="Spring energy convergence plot"]')).not.toBeNull()
    expect(host.querySelector('svg[aria-label="Spring phase convergence plot"]')).not.toBeNull()
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"springConstant": 4.2')
    expect(preview).toContain('"dampingCoefficient": 0.08')
    expect(preview).toContain('"springAnchor"')
    expect(preview).toContain('"springInvariantHistory"')
    expect(preview).toContain('"convergencePlotGuides"')
  })

  it("exports convergence and invariant CSV reports through the page actions", async () => {
    const fixture = TestBed.createComponent(ComputationalPhysicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "orbital-solver-comparison"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const convergenceButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download Convergence CSV",
    ) as HTMLButtonElement | undefined
    const invariantButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download Invariant CSV",
    ) as HTMLButtonElement | undefined

    if (!convergenceButton || !invariantButton) {
      throw new Error("CSV export buttons missing in test setup.")
    }

    convergenceButton.click()
    fixture.detectChanges()
    expect(host.textContent).toContain("Computational Physics convergence report exported as CSV.")

    invariantButton.click()
    fixture.detectChanges()
    expect(host.textContent).toContain("Computational Physics invariant report exported as CSV.")
    expect(createObjectUrlSpy).toHaveBeenCalled()
    expect(revokeObjectUrlSpy).toHaveBeenCalled()
  })
})
