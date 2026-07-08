import { TestBed } from "@angular/core/testing"
import { vi } from "vitest"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { QuantumMechanicsPageComponent } from "./quantum-mechanics-page.component"
import { QuantumMechanicsStateService } from "./quantum-mechanics-state.service"
import { QuantumMechanicsWebGpuRenderer } from "./quantum-mechanics-webgpu-renderer"

describe("QuantumMechanicsPageComponent", () => {
  let getStatusMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    getStatusMock = vi.fn().mockResolvedValue({
      supported: false,
      message: "WebGPU unavailable in tests.",
    })

    await TestBed.configureTestingModule({
      imports: [QuantumMechanicsPageComponent],
      providers: [
        QuantumMechanicsStateService,
        {
          provide: WebGpuSupportService,
          useValue: {
            getStatus: getStatusMock,
          },
        },
      ],
    }).compileComponents()
  })

  it("renders the initial particle-in-a-box slice and controls", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain(
      "Phase 19 delivers a shared Angular Quantum Mechanics feature",
    )
    expect(host.textContent).toContain("Phase 19 implementation complete")
    expect(host.textContent).toContain("Quantum Viewport")
    expect(host.textContent).toContain("Particle-in-a-Box Controls")
    expect(host.textContent).toContain("Box length (nm)")
    expect(host.textContent).toContain("Particle in a One-Dimensional Box")
  })

  it("initializes the WebGPU renderer when support is available", async () => {
    getStatusMock.mockResolvedValue({
      supported: true,
      message: "WebGPU adapter acquired.",
    })
    const renderSpy = vi.fn()
    const destroySpy = vi.fn()
    const createSpy = vi.spyOn(QuantumMechanicsWebGpuRenderer, "create").mockResolvedValue({
      render: renderSpy,
      destroy: destroySpy,
    } as unknown as QuantumMechanicsWebGpuRenderer)

    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Quantum Mechanics viewport ready.")

    fixture.destroy()
    expect(destroySpy).toHaveBeenCalled()
    createSpy.mockRestore()
  })

  it("reports a renderer initialization failure when WebGPU setup succeeds but renderer creation fails", async () => {
    getStatusMock.mockResolvedValue({
      supported: true,
      message: "WebGPU adapter acquired.",
    })
    const createSpy = vi.spyOn(QuantumMechanicsWebGpuRenderer, "create").mockResolvedValue(null)

    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    fixture.detectChanges()

    const host = fixture.nativeElement as HTMLElement
    expect(createSpy).toHaveBeenCalled()
    expect(host.textContent).toContain("Quantum Mechanics viewport initialization failed.")

    createSpy.mockRestore()
  })

  it("updates overlay flags in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showProbabilityGuide": true')

    const toggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Probability guide"),
    )
    if (!toggle) {
      throw new Error("Probability-guide toggle missing in test setup.")
    }

    toggle.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showProbabilityGuide": false')
  })

  it("switches to tunneling controls and export payload", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select")
    expect(select).toBeInstanceOf(HTMLSelectElement)
    if (!(select instanceof HTMLSelectElement)) {
      return
    }

    select.value = "finite-potential-well-tunneling"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Finite Barrier Tunneling")
    expect(host.textContent).toContain("Finite Barrier Controls")
    expect(host.textContent).toContain("Particle energy (eV)")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "finite-potential-well-tunneling"')
    expect(preview).toContain('"barrierHeightEv": 3.8')
  })

  it("switches to double-slit controls and export payload", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select")
    expect(select).toBeInstanceOf(HTMLSelectElement)
    if (!(select instanceof HTMLSelectElement)) {
      return
    }

    select.value = "double-slit-interference"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Double-Slit Interference Pattern")
    expect(host.textContent).toContain("Double-Slit Controls")
    expect(host.textContent).toContain("Wavelength (nm)")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "double-slit-interference"')
    expect(preview).toContain('"screenDistanceMeters": 1.8')
  })

  it("restores a particle-in-a-box payload through the page import workflow", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "particle-in-a-box",
        name: "Particle in a One-Dimensional Box",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        boxLengthNanometers: 2.4,
        quantumNumber: 3,
      },
      snapshot: { timeSeconds: 0.5 },
      overlays: {
        showProbabilityGuide: false,
        showPotentialGuide: true,
        showPhaseGuide: false,
      },
    })
    textarea.dispatchEvent(new Event("input"))

    const importButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Import JSON"),
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Quantum Mechanics scenario restored from JSON.")
    expect(host.textContent).toContain("Particle in a One-Dimensional Box")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"timeSeconds": 0.5')
    expect(preview).toContain('"boxLengthNanometers": 2.4')
    expect(preview).toContain('"quantumNumber": 3')
    expect(preview).toContain('"showProbabilityGuide": false')
  })

  it("drops cross-scenario fields from imported payloads before rendering the export preview", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "particle-in-a-box",
        name: "Particle in a One-Dimensional Box",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        boxLengthNanometers: 1.9,
        quantumNumber: 2,
        barrierHeightEv: 9.9,
        barrierWidthNanometers: 4.2,
      },
      snapshot: { timeSeconds: 0.2 },
      overlays: {
        showProbabilityGuide: true,
        showPotentialGuide: true,
        showPhaseGuide: true,
      },
    })
    textarea.dispatchEvent(new Event("input"))

    const importButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Import JSON"),
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "particle-in-a-box"')
    expect(preview).toContain('"boxLengthNanometers": 1.9')
    expect(preview).not.toContain('"barrierHeightEv": 9.9')
    expect(preview).not.toContain('"barrierWidthNanometers": 4.2')
  })

  it("normalizes invalid imported view bounds before rendering the export preview", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "double-slit-interference",
        name: "Double-Slit Interference Pattern",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 8, maxX: 2, minY: 3, maxY: 3 },
        focusArea: "Focus",
        wavelengthNanometers: 610,
        slitSeparationMicrometers: 160,
        slitWidthMicrometers: 55,
        screenDistanceMeters: 2.4,
      },
      snapshot: { timeSeconds: 0.75 },
      overlays: {
        showProbabilityGuide: true,
        showPotentialGuide: true,
        showPhaseGuide: false,
      },
    })
    textarea.dispatchEvent(new Event("input"))

    const importButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Import JSON"),
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "double-slit-interference"')
    expect(preview).toContain('"viewBounds": {')
    expect(preview).toContain('"minX": 0')
    expect(preview).toContain('"maxX": 10')
    expect(preview).toContain('"minY": 0')
    expect(preview).toContain('"maxY": 10')
  })

  it("resets overlays to defaults when an imported payload omits overlay settings", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const probabilityToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Probability guide"),
    )
    if (!probabilityToggle) {
      throw new Error("Probability-guide toggle missing in test setup.")
    }

    probabilityToggle.click()
    fixture.detectChanges()

    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showProbabilityGuide": false')

    const textarea = host.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "particle-in-a-box",
        name: "Particle in a One-Dimensional Box",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        boxLengthNanometers: 1.4,
        quantumNumber: 2,
      },
      snapshot: { timeSeconds: 0.4 },
    })
    textarea.dispatchEvent(new Event("input"))

    const importButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Import JSON"),
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showProbabilityGuide": true')
    expect(preview).toContain('"showPotentialGuide": true')
    expect(preview).toContain('"showPhaseGuide": true')
  })

  it("restores a tunneling payload through the page import workflow", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "finite-potential-well-tunneling",
        name: "Finite Barrier Tunneling",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        particleEnergyEv: 1.7,
        barrierHeightEv: 4.4,
        barrierWidthNanometers: 0.7,
      },
      snapshot: { timeSeconds: 0.25 },
      overlays: {
        showProbabilityGuide: true,
        showPotentialGuide: false,
        showPhaseGuide: true,
      },
    })
    textarea.dispatchEvent(new Event("input"))

    const importButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Import JSON"),
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Finite Barrier Tunneling")
    expect(host.textContent).toContain("Finite Barrier Controls")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"timeSeconds": 0.25')
    expect(preview).toContain('"particleEnergyEv": 1.7')
    expect(preview).toContain('"barrierHeightEv": 4.4')
    expect(preview).toContain('"showPotentialGuide": false')
  })

  it("restores a double-slit payload through the page import workflow", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "double-slit-interference",
        name: "Double-Slit Interference Pattern",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        wavelengthNanometers: 610,
        slitSeparationMicrometers: 160,
        slitWidthMicrometers: 55,
        screenDistanceMeters: 2.4,
      },
      snapshot: { timeSeconds: 0.75 },
      overlays: {
        showProbabilityGuide: true,
        showPotentialGuide: true,
        showPhaseGuide: false,
      },
    })
    textarea.dispatchEvent(new Event("input"))

    const importButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Import JSON"),
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("Double-Slit Interference Pattern")
    expect(host.textContent).toContain("Double-Slit Controls")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"timeSeconds": 0.75')
    expect(preview).toContain('"wavelengthNanometers": 610')
    expect(preview).toContain('"screenDistanceMeters": 2.4')
    expect(preview).toContain('"showPhaseGuide": false')
  })

  it("reports an error for an invalid imported payload", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.value = '{"scenario":{}}'
    textarea.dispatchEvent(new Event("input"))

    const importButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Import JSON"),
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain(
      "Import failed. Use a JSON payload exported from this workspace.",
    )
  })

  it("rejects non-finite numeric values through the page import workflow", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea")
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement)
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return
    }

    textarea.value = JSON.stringify({
      scenario: {
        id: "finite-potential-well-tunneling",
        name: "Finite Barrier Tunneling",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        particleEnergyEv: 2.1,
        barrierHeightEv: 3.8,
        barrierWidthNanometers: 1e309,
      },
      snapshot: { timeSeconds: 0 },
    })
    textarea.dispatchEvent(new Event("input"))

    const importButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Import JSON"),
    )
    if (!importButton) {
      throw new Error("Import button missing in test setup.")
    }

    importButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain(
      "Import failed. Use a JSON payload exported from this workspace.",
    )
  })

  it("copies the active scenario export payload to the clipboard", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    const host = fixture.nativeElement as HTMLElement
    const copyButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Copy JSON",
    ) as HTMLButtonElement | undefined

    if (!copyButton) {
      throw new Error("Copy JSON button missing in test setup.")
    }

    copyButton.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(writeText).toHaveBeenCalledTimes(1)
    const firstClipboardCall = writeText.mock.calls[0]
    expect(firstClipboardCall).toBeDefined()
    const copiedPayload = firstClipboardCall?.[0]
    expect(typeof copiedPayload).toBe("string")
    expect(copiedPayload).toContain('"id": "particle-in-a-box"')
    expect(copiedPayload).toContain('"showProbabilityGuide": true')
    expect(host.textContent).toContain("Quantum Mechanics scenario copied to clipboard.")
  })

  it("shows a failure message when clipboard export is unavailable", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    })

    const host = fixture.nativeElement as HTMLElement
    const copyButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Copy JSON",
    ) as HTMLButtonElement | undefined

    if (!copyButton) {
      throw new Error("Copy JSON button missing in test setup.")
    }

    copyButton.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(host.textContent).toContain("Clipboard export is unavailable in this browser context.")
  })

  it("exports the active scenario as a downloadable JSON file", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const originalCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    const createObjectUrlSpy = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:quantum-mechanics-json-test")
    const revokeObjectUrlSpy = vi
      .spyOn(globalThis.URL, "revokeObjectURL")
      .mockImplementation(() => undefined)
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
    ) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === "a") {
        ;(element as HTMLAnchorElement).click = clickSpy
      }
      return element
    }) as typeof document.createElement)

    const host = fixture.nativeElement as HTMLElement
    const exportButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download JSON",
    ) as HTMLButtonElement | undefined

    if (!exportButton) {
      throw new Error("Download JSON button missing in test setup.")
    }

    exportButton.click()
    fixture.detectChanges()

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectUrlSpy.mock.calls[0]?.[0] as Blob
    const exportedPayload = await exportedBlob.text()
    expect(exportedBlob.type).toBe("application/json")
    expect(exportedPayload).toContain('"id": "particle-in-a-box"')
    expect(exportedPayload).toContain('"showProbabilityGuide": true')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:quantum-mechanics-json-test")
    expect(host.textContent).toContain("Quantum Mechanics scenario exported as JSON.")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })

  it("exports the active scenario report as a downloadable CSV file", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const originalCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    const createObjectUrlSpy = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:quantum-mechanics-csv-test")
    const revokeObjectUrlSpy = vi
      .spyOn(globalThis.URL, "revokeObjectURL")
      .mockImplementation(() => undefined)
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
    ) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === "a") {
        ;(element as HTMLAnchorElement).click = clickSpy
      }
      return element
    }) as typeof document.createElement)

    const host = fixture.nativeElement as HTMLElement
    const exportButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download CSV",
    ) as HTMLButtonElement | undefined

    if (!exportButton) {
      throw new Error("Download CSV button missing in test setup.")
    }

    exportButton.click()
    fixture.detectChanges()

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectUrlSpy.mock.calls[0]?.[0] as Blob
    const exportedPayload = await exportedBlob.text()
    expect(exportedBlob.type).toBe("text/csv")
    expect(exportedPayload).toContain("category,metric,label,value,detail")
    expect(exportedPayload).toContain("energy_level")
    expect(exportedPayload).toContain("probability-density")
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:quantum-mechanics-csv-test")
    expect(host.textContent).toContain("Quantum Mechanics report exported as CSV.")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })

  it("round-trips a customized tunneling scenario through downloadable export and file import", async () => {
    const fixture = TestBed.createComponent(QuantumMechanicsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const originalCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    const createObjectUrlSpy = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:quantum-mechanics-roundtrip")
    const revokeObjectUrlSpy = vi
      .spyOn(globalThis.URL, "revokeObjectURL")
      .mockImplementation(() => undefined)
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
    ) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === "a") {
        ;(element as HTMLAnchorElement).click = clickSpy
      }
      return element
    }) as typeof document.createElement)

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "finite-potential-well-tunneling"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const numberInputs = Array.from(
      host.querySelectorAll('input[type="number"]'),
    ) as HTMLInputElement[]
    const particleEnergyInput = numberInputs[0]
    const barrierHeightInput = numberInputs[1]
    const barrierWidthInput = numberInputs[2]

    particleEnergyInput.value = "1.55"
    particleEnergyInput.dispatchEvent(new Event("input"))
    barrierHeightInput.value = "4.2"
    barrierHeightInput.dispatchEvent(new Event("input"))
    barrierWidthInput.value = "0.68"
    barrierWidthInput.dispatchEvent(new Event("input"))

    const barrierProfileToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Barrier profile"),
    ) as HTMLButtonElement | undefined

    if (!barrierProfileToggle) {
      throw new Error("Barrier-profile toggle missing in test setup.")
    }

    barrierProfileToggle.click()
    fixture.detectChanges()

    const exportButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Download JSON",
    ) as HTMLButtonElement | undefined

    if (!exportButton) {
      throw new Error("Download JSON button missing in test setup.")
    }

    exportButton.click()
    fixture.detectChanges()

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectUrlSpy.mock.calls[0]?.[0] as Blob
    const exportedPayload = await exportedBlob.text()
    expect(exportedPayload).toContain('"id": "finite-potential-well-tunneling"')
    expect(exportedPayload).toContain('"particleEnergyEv": 1.55')
    expect(exportedPayload).toContain('"barrierHeightEv": 4.2')
    expect(exportedPayload).toContain('"showPotentialGuide": false')

    select.value = "particle-in-a-box"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const fileInput = host.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([exportedPayload], "quantum-roundtrip.json", {
      type: "application/json",
    })
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    })

    fileInput.dispatchEvent(new Event("change"))
    await fixture.whenStable()
    fixture.detectChanges()

    expect(host.textContent).toContain("Quantum Mechanics scenario restored from JSON.")
    expect(host.textContent).toContain("Finite Barrier Tunneling")
    expect(host.textContent).toContain("Finite Barrier Controls")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "finite-potential-well-tunneling"')
    expect(preview).toContain('"timeSeconds": 0')
    expect(preview).toContain('"particleEnergyEv": 1.55')
    expect(preview).toContain('"barrierHeightEv": 4.2')
    expect(preview).toContain('"showPotentialGuide": false')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:quantum-mechanics-roundtrip")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })
})
