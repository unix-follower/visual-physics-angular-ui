import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { ThermodynamicsPageComponent } from "./thermodynamics-page.component"
import { ThermodynamicsStateService } from "./thermodynamics-state.service"

describe("ThermodynamicsPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThermodynamicsPageComponent],
      providers: [
        ThermodynamicsStateService,
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

  it("renders the initial thermodynamics slice and controls", async () => {
    const fixture = TestBed.createComponent(ThermodynamicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain(
      "Phase 15 now includes ideal-gas state, transient heat-conduction, and Carnot-cycle slices",
    )
    expect(host.textContent).toContain("Thermodynamics Viewport")
    expect(host.textContent).toContain("Ideal Gas Controls")
    expect(host.textContent).toContain("Amount of gas (mol)")
    expect(host.textContent).toContain("Ideal Gas State Evolution")
    expect(host.textContent).toContain("Transient Heat Conduction in a Slab")
    expect(host.textContent).toContain("Carnot Cycle")
  })

  it("updates overlay flags in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(ThermodynamicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showPressureCurve": true')

    const toggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Pressure curve"),
    )
    if (!toggle) {
      throw new Error("Pressure-curve toggle missing in test setup.")
    }

    toggle.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showPressureCurve": false')
  })

  it("switches to the heat-conduction slice and renders transient controls", async () => {
    const fixture = TestBed.createComponent(ThermodynamicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select")
    if (!select) {
      throw new Error("Scenario select missing in test setup.")
    }

    select.value = "heat-conduction-slab"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(host.textContent).toContain("Heat Conduction Controls")
    expect(host.textContent).toContain("Slab thickness (m)")
    expect(host.textContent).toContain("Current time:")
    expect(preview).toContain('"id": "heat-conduction-slab"')
    expect(preview).toContain('"slabThicknessMeters": 0.08')
  })

  it("switches to the Carnot-cycle slice and renders cycle controls", async () => {
    const fixture = TestBed.createComponent(ThermodynamicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select")
    if (!select) {
      throw new Error("Scenario select missing in test setup.")
    }

    select.value = "carnot-cycle"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(host.textContent).toContain("Carnot Cycle Controls")
    expect(host.textContent).toContain("Hot reservoir (K)")
    expect(host.textContent).toContain("Isothermal volume ratio")
    expect(preview).toContain('"id": "carnot-cycle"')
    expect(preview).toContain('"hotReservoirTemperatureKelvin": 600')
  })

  it("restores a modified ideal-gas scenario from JSON", async () => {
    const fixture = TestBed.createComponent(ThermodynamicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(ThermodynamicsStateService)
    const scenario = service.selectedScenario()
    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        ...scenario,
        temperatureKelvin: 410,
        volumeCubicMeters: 0.03,
      },
      snapshot: { timeSeconds: 0 },
      overlays: {
        showPressureCurve: true,
        showParticleGuide: false,
        showEnergyGuide: true,
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

    expect(host.textContent).toContain("Thermodynamics scenario restored from JSON.")
    expect(service.selectedScenario().temperatureKelvin).toBe(410)
    expect(service.selectedScenario().volumeCubicMeters).toBe(0.03)
  })

  it("restores a heat-conduction scenario and time cursor from JSON", async () => {
    const fixture = TestBed.createComponent(ThermodynamicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "heat-conduction-slab",
        name: "Transient Heat Conduction in a Slab",
        summary: "Summary",
        equationSummary: "Fo = alpha t / L_c^2",
        status: "Implemented",
        durationSeconds: 240,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        slabThicknessMeters: 0.09,
        thermalConductivityWPerMK: 1.6,
        thermalDiffusivityM2PerS: 0.0000014,
        initialTemperatureCelsius: 30,
        boundaryTemperatureCelsius: 160,
      },
      snapshot: { timeSeconds: 180 },
      overlays: {
        showPressureCurve: true,
        showParticleGuide: false,
        showEnergyGuide: true,
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

    expect(host.textContent).toContain("Thermodynamics scenario restored from JSON.")
    expect(host.textContent).toContain("Current time:")
    expect(host.textContent).toContain("180 s")
  })

  it("restores a Carnot-cycle scenario and time cursor from JSON", async () => {
    const fixture = TestBed.createComponent(ThermodynamicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        id: "carnot-cycle",
        name: "Carnot Cycle",
        summary: "Summary",
        equationSummary: "eta = 1 - T_c/T_h",
        status: "Implemented",
        durationSeconds: 400,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        amountMoles: 1.4,
        hotReservoirTemperatureKelvin: 650,
        coldReservoirTemperatureKelvin: 330,
        cycleMinVolumeCubicMeters: 0.018,
        cycleVolumeRatio: 2.4,
      },
      snapshot: { timeSeconds: 250 },
      overlays: {
        showPressureCurve: true,
        showParticleGuide: true,
        showEnergyGuide: false,
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

    expect(host.textContent).toContain("Thermodynamics scenario restored from JSON.")
    expect(host.textContent).toContain("250 s")
    expect(host.textContent).toContain("Carnot Cycle Controls")
  })
})
