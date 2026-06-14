import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { FluidMechanicsPageComponent } from "./fluid-mechanics-page.component"
import { FluidMechanicsStateService } from "./fluid-mechanics-state.service"

describe("FluidMechanicsPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FluidMechanicsPageComponent],
      providers: [
        FluidMechanicsStateService,
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

  it("renders the initial buoyancy slice and controls", async () => {
    const fixture = TestBed.createComponent(FluidMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain(
      "Phase 13 now includes buoyancy equilibrium, laminar pipe flow, and uniform open-channel flow",
    )
    expect(host.textContent).toContain("Fluid Mechanics Viewport")
    expect(host.textContent).toContain("Buoyancy Controls")
    expect(host.textContent).toContain("Fluid density (kg/m^3)")
    expect(host.textContent).toContain("Buoyancy of a Floating Block")
    expect(host.textContent).toContain("Laminar Pipe Flow")
    expect(host.textContent).toContain("Uniform Open-Channel Flow")
    expect(host.textContent).toContain("Implemented")
  })

  it("updates overlay flags in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(FluidMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"fluidDensity": 1000')
    expect(preview).toContain('"showForceGuides": true')

    const toggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Force guides"),
    )
    if (!toggle) {
      throw new Error("Force-guides toggle missing in test setup.")
    }

    toggle.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showForceGuides": false')
  })

  it("switches to the pipe-flow slice and renders the pipe controls", async () => {
    const fixture = TestBed.createComponent(FluidMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select")
    if (!select) {
      throw new Error("Scenario select missing in test setup.")
    }

    select.value = "poiseuille-pipe"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(host.textContent).toContain("Pipe Flow Controls")
    expect(host.textContent).toContain("Dynamic viscosity (Pa*s)")
    expect(preview).toContain('"id": "poiseuille-pipe"')
    expect(preview).toContain('"pipeRadius": 0.045')
  })

  it("switches to the open-channel slice and renders the channel controls", async () => {
    const fixture = TestBed.createComponent(FluidMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select")
    if (!select) {
      throw new Error("Scenario select missing in test setup.")
    }

    select.value = "open-channel-flow"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(host.textContent).toContain("Open Channel Controls")
    expect(host.textContent).toContain("Channel width (m)")
    expect(host.textContent).toContain("Roughness coefficient")
    expect(preview).toContain('"id": "open-channel-flow"')
    expect(preview).toContain('"channelSlope": 0.0015')
  })

  it("restores a modified buoyancy scenario from JSON", async () => {
    const fixture = TestBed.createComponent(FluidMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(FluidMechanicsStateService)
    const scenario = service.selectedScenario()
    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        ...scenario,
        fluidDensity: 1025,
        blockDensity: 550,
      },
      snapshot: { timeSeconds: 0 },
      overlays: {
        showForceGuides: true,
        showWaterline: true,
        showEquilibriumGuide: false,
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

    expect(host.textContent).toContain("Fluid mechanics scenario restored from JSON.")
    expect(service.selectedScenario().fluidDensity).toBe(1025)
    expect(service.selectedScenario().blockDensity).toBe(550)
  })
})
