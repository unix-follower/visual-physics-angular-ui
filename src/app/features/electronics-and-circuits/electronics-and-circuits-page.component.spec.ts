import { TestBed } from "@angular/core/testing"
import { vi } from "vitest"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { ElectronicsAndCircuitsPageComponent } from "./electronics-and-circuits-page.component"
import { ElectronicsAndCircuitsStateService } from "./electronics-and-circuits-state.service"

describe("ElectronicsAndCircuitsPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElectronicsAndCircuitsPageComponent],
      providers: [
        ElectronicsAndCircuitsStateService,
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

  it("renders the Phase 11 RC transient shell", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Electronics and Circuits with Angular and WebGPU")
    expect(host.textContent).toContain("Phase 11 Scenario Set")
    expect(host.textContent).toContain("Scenario Summary")
    expect(host.textContent).toContain("RC Controls")
    expect(host.textContent).toContain("RC Readouts")
    expect(host.textContent).toContain("Time constant")
    expect(host.textContent).toContain("Source setpoint")
    expect(host.textContent).toContain("Phase 11 payloads use")
  })

  it("switches to the RL transient scenario and shows inductive transient diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "rl-transient"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("RL Controls")
    expect(host.textContent).toContain("RL Readouts")
    expect(host.textContent).toContain("Time (s)")
    expect(host.textContent).toContain("Flux linkage")
    expect(host.textContent).toContain("Magnetic energy")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "rl-transient"')
    expect(preview).toContain('"inductance"')
  })

  it("switches to the half-wave rectifier scenario and shows nonlinear waveform diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "half-wave-rectifier"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Half-Wave Rectifier Controls")
    expect(host.textContent).toContain("Half-Wave Rectifier Readouts")
    expect(host.textContent).toContain("Time (s)")
    expect(host.textContent).toContain("Rectified output")
    expect(host.textContent).toContain("Conduction state")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "half-wave-rectifier"')
  })

  it("switches to the full-wave rectifier scenario and shows bridge-rectifier diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "full-wave-rectifier"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Full-Wave Rectifier Controls")
    expect(host.textContent).toContain("Full-Wave Rectifier Readouts")
    expect(host.textContent).toContain("Time (s)")
    expect(host.textContent).toContain("Ripple frequency")
    expect(host.textContent).toContain("Bridge conduction")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "full-wave-rectifier"')
  })

  it("switches to the smoothed rectifier scenario and shows ripple-filter diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "smoothed-rectifier"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Smoothed Rectifier Controls")
    expect(host.textContent).toContain("Smoothed Rectifier Readouts")
    expect(host.textContent).toContain("Time (s)")
    expect(host.textContent).toContain("Ripple voltage")
    expect(host.textContent).toContain("RC time constant")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "smoothed-rectifier"')
  })

  it("switches to the resistor-network scenario and updates the export preview", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "resistor-network"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Resistor Network Controls")
    expect(host.textContent).toContain("Resistor Network Readouts")
    expect(host.textContent).toContain("Equivalent resistance")
    expect(host.textContent).toContain("Output target")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "resistor-network"')
    expect(preview).toContain('"secondaryResistance"')
  })

  it("switches to the RC low-pass scenario and shows frequency-response diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "rc-low-pass"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("RC Low-Pass Controls")
    expect(host.textContent).toContain("RC Low-Pass Readouts")
    expect(host.textContent).toContain("Frequency (Hz)")
    expect(host.textContent).toContain("Cutoff frequency")
    expect(host.textContent).toContain("Phase lag")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "rc-low-pass"')
  })

  it("switches to the RC high-pass scenario and shows complementary frequency-response diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "rc-high-pass"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("RC High-Pass Controls")
    expect(host.textContent).toContain("RC High-Pass Readouts")
    expect(host.textContent).toContain("Frequency (Hz)")
    expect(host.textContent).toContain("Cutoff frequency")
    expect(host.textContent).toContain("Phase lead")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "rc-high-pass"')
  })

  it("switches to the RL low-pass scenario and shows inductive frequency-response diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "rl-low-pass"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("RL Low-Pass Controls")
    expect(host.textContent).toContain("RL Low-Pass Readouts")
    expect(host.textContent).toContain("Frequency (Hz)")
    expect(host.textContent).toContain("Cutoff frequency")
    expect(host.textContent).toContain("Magnetic energy")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "rl-low-pass"')
    expect(preview).toContain('"inductance"')
  })

  it("switches to the RL high-pass scenario and shows inductive passband diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "rl-high-pass"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("RL High-Pass Controls")
    expect(host.textContent).toContain("RL High-Pass Readouts")
    expect(host.textContent).toContain("Frequency (Hz)")
    expect(host.textContent).toContain("Phase lead")
    expect(host.textContent).toContain("Magnetic energy")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "rl-high-pass"')
    expect(preview).toContain('"inductance"')
  })

  it("switches to the RLC scenario and exposes inductance in the export preview", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "rlc-response"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("RLC Controls")
    expect(host.textContent).toContain("RLC Readouts")
    expect(host.textContent).toContain("Damping regime")
    expect(host.textContent).toContain("Underdamped")
    expect(host.textContent).toContain("Settling time")
    expect(host.textContent).toContain("Peak overshoot")
    expect(host.textContent).toContain("Current zero")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "rlc-response"')
    expect(preview).toContain('"inductance"')
  })

  it("switches to the resonance scenario and shows frequency-sweep diagnostics", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "rlc-resonance"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("RLC Resonance Controls")
    expect(host.textContent).toContain("RLC Resonance Readouts")
    expect(host.textContent).toContain("Frequency (Hz)")
    expect(host.textContent).toContain("Resonant frequency")
    expect(host.textContent).toContain("Peak current frequency")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "rlc-resonance"')
    expect(preview).toContain('"inductance"')
  })

  it("updates overlay flags in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showChargeTrace": false')

    const chargeToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Charge trace"),
    ) as HTMLButtonElement | undefined

    if (!chargeToggle) {
      throw new Error("Charge trace toggle missing in test setup.")
    }

    chargeToggle.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showChargeTrace": true')
  })

  it("restores the RC scenario from JSON through the import UI", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    const scenario = service.selectedScenario()
    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        ...scenario,
        sourceVoltage: 12,
        resistance: 150,
        capacitance: 0.02,
      },
      snapshot: { timeSeconds: 1.5 },
      overlays: {
        showVoltageTrace: true,
        showCurrentTrace: false,
        showChargeTrace: true,
        showEnergyMarkers: true,
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

    expect(host.textContent).toContain("Electronics and Circuits scenario restored from JSON.")
    expect(host.textContent).toContain("1.50 s")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"sourceVoltage": 12')
    expect(preview).toContain('"showCurrentTrace": false')
  })

  it("restores the RC scenario from a JSON file input", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    const scenario = service.selectedScenario()
    const host = fixture.nativeElement as HTMLElement
    const input = host.querySelector('input[type="file"]') as HTMLInputElement

    const file = {
      text: async () =>
        JSON.stringify({
          scenario: {
            ...scenario,
            sourceVoltage: 6,
            resistance: 100,
          },
          snapshot: { timeSeconds: 0.75 },
          overlays: {
            showVoltageTrace: true,
            showCurrentTrace: true,
            showChargeTrace: true,
            showEnergyMarkers: false,
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

    expect(host.textContent).toContain("Electronics and Circuits scenario restored from JSON.")
    expect(host.textContent).toContain("0.75 s")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"sourceVoltage": 6')
    expect(preview).toContain('"showEnergyMarkers": false')
  })

  it("reports browser-only file export constraints when window is unavailable", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const windowSpy = vi
      .spyOn(globalThis, "window", "get")
      .mockReturnValue(undefined as unknown as Window & typeof globalThis)
    const host = fixture.nativeElement as HTMLElement
    const downloadButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download JSON",
    ) as HTMLButtonElement | undefined

    if (!downloadButton) {
      windowSpy.mockRestore()
      throw new Error("Download button missing in test setup.")
    }

    downloadButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("File export is only available in the browser.")
    windowSpy.mockRestore()
  })

  it("exports a CSV report for the active scenario", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const createObjectUrl = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:phase-11-report")
    const revokeObjectUrl = vi
      .spyOn(globalThis.URL, "revokeObjectURL")
      .mockImplementation(() => undefined)
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined)

    const host = fixture.nativeElement as HTMLElement
    const csvButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download CSV",
    ) as HTMLButtonElement | undefined

    if (!csvButton) {
      createObjectUrl.mockRestore()
      revokeObjectUrl.mockRestore()
      clickSpy.mockRestore()
      throw new Error("CSV button missing in test setup.")
    }

    csvButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Electronics and Circuits report exported as CSV.")
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)

    clickSpy.mockRestore()
    revokeObjectUrl.mockRestore()
    createObjectUrl.mockRestore()
  })

  it("shows a hovered plot readout for the nearest sampled point", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const svg = host.querySelector('svg[aria-label="Capacitor voltage plot"]') as SVGElement | null
    if (!svg) {
      throw new Error("Primary plot missing in test setup.")
    }

    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 320,
      bottom: 120,
      width: 320,
      height: 120,
      toJSON: () => ({}),
    } as DOMRect)

    svg.dispatchEvent(new MouseEvent("mousemove", { clientX: 160, clientY: 40, bubbles: true }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sampled time")
    expect(host.textContent).toContain("Charging current")
    expect(host.textContent).toContain("Charge:")

    svg.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Hover a plot or focus it to inspect a sampled time.")
  })

  it("supports keyboard navigation for plot readouts", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const svg = host.querySelector('svg[aria-label="Capacitor voltage plot"]') as SVGElement | null
    if (!svg) {
      throw new Error("Primary plot missing in test setup.")
    }

    svg.dispatchEvent(new FocusEvent("focus"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sampled time 0.00 s")

    svg.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sampled time 0.13 s")

    svg.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }))
    fixture.detectChanges()

    expect(host.textContent).toContain("Sampled time 6.00 s")

    svg.dispatchEvent(new FocusEvent("blur"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Hover a plot or focus it to inspect a sampled time.")
  })

  it("supports button-based plot sample navigation", async () => {
    const fixture = TestBed.createComponent(ElectronicsAndCircuitsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const buttons = Array.from(
      host.querySelectorAll(".electronics-plot-controls button"),
    ) as HTMLButtonElement[]
    const [firstButton, previousButton, nextButton, lastButton] = buttons

    if (!firstButton || !previousButton || !nextButton || !lastButton) {
      throw new Error("Plot navigation buttons missing in test setup.")
    }

    expect(nextButton.disabled).toBe(false)
    nextButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Sampled time 0.13 s")
    expect(previousButton.disabled).toBe(false)

    lastButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Sampled time 6.00 s")
    expect(lastButton.disabled).toBe(true)

    firstButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Sampled time 0.00 s")
    expect(firstButton.disabled).toBe(true)
  })
})
