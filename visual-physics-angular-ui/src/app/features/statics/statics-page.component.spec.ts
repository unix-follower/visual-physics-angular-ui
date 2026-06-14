import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { StaticsPageComponent } from "./statics-page.component"
import { StaticsStateService } from "./statics-state.service"

describe("StaticsPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaticsPageComponent],
      providers: [
        StaticsStateService,
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

  it("renders inclined-plane controls after switching scenarios", async () => {
    const fixture = TestBed.createComponent(StaticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain(
      "The Angular Statics surface now covers beam support, inclined-plane equilibrium, and pulley balance",
    )
    expect(host.textContent).toContain("Phase 5 is complete for the Angular/WebGPU scope")
    expect(host.textContent).toContain(
      "Solver-backed scenarios, payload round-tripping, insight cards, and WebGPU viewports are active across the completed Statics Phase 5 slice",
    )
    expect(host.textContent).toContain("Phase 6 Statics Vulkan parity")
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "inclined-plane"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Inclined Plane Controls")
    expect(host.textContent).toContain("Plane angle (deg)")
    expect(host.textContent).toContain("Inclined Plane Viewport")
    expect(host.textContent).toContain("Inclined-plane payloads use")
    expect(host.textContent).toContain("Implemented")
  })

  it("renders pulley controls and readouts after switching scenarios", async () => {
    const fixture = TestBed.createComponent(StaticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "pulley-equilibrium"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Pulley Controls")
    expect(host.textContent).toContain("Left load mass (kg)")
    expect(host.textContent).toContain("Pulley Viewport")
    expect(host.textContent).toContain("Left tension:")
    expect(host.textContent).toContain("secondaryMass")
  })

  it("restores a pulley scenario from JSON through the page import UI", async () => {
    const fixture = TestBed.createComponent(StaticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(StaticsStateService)
    const pulleyScenario = service
      .listScenarios()
      .find((scenario) => scenario.id === "pulley-equilibrium")

    if (!pulleyScenario) {
      throw new Error("Pulley scenario missing in test setup.")
    }

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        ...pulleyScenario,
        mass: 1.2,
        secondaryMass: 1.8,
      },
      snapshot: { timeSeconds: 0 },
      overlays: {
        showAppliedForce: true,
        showReactionForces: true,
        showResidualGuides: false,
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

    expect(host.textContent).toContain("Statics scenario restored from JSON.")
    expect(host.textContent).toContain("Pulley Controls")
    expect(host.textContent).toContain("Imbalance:")
  })

  it("renders scenario-specific fields in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(StaticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement

    select.value = "inclined-plane"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"angleDegrees"')
    expect(preview).toContain('"frictionCoefficient"')

    select.value = "pulley-equilibrium"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"secondaryMass"')
    expect(preview).toContain('"mass"')
  })

  it("renders beam load fields and overlay toggles in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(StaticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"loadPosition"')
    expect(preview).toContain('"loadMagnitude"')
    expect(preview).toContain('"showResidualGuides": true')

    const residualToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Residual guides"),
    ) as HTMLButtonElement | undefined

    if (!residualToggle) {
      throw new Error("Residual-guides toggle missing in test setup.")
    }

    residualToggle.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showResidualGuides": false')
  })
})
