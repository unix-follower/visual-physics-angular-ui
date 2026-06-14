import { TestBed } from "@angular/core/testing"
import { vi } from "vitest"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { ElectromagnetismPageComponent } from "./electromagnetism-page.component"
import { ElectromagnetismStateService } from "./electromagnetism-state.service"

describe("ElectromagnetismPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElectromagnetismPageComponent],
      providers: [
        ElectromagnetismStateService,
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

  it("renders current-loop controls after switching scenarios", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain("Electromagnetism with Angular and WebGPU")
    expect(host.textContent).toContain("Phase 7 Scenario Set")
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "current-loop-magnetic-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Current Loop Controls")
    expect(host.textContent).toContain("Current Loop Readouts")
    expect(host.textContent).toContain("current-loop-magnetic-field")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"current"')
    expect(preview).toContain('"loopRadius"')
    expect(preview).toContain('"probePoint"')
    expect(host.textContent).toContain("Current-loop payloads use")
  })

  it("renders capacitor controls and export preview fields after switching scenarios", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "capacitor-potential-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Capacitor Controls")
    expect(host.textContent).toContain("Capacitor Readouts")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"plateSeparation"')
    expect(preview).toContain('"potentialDifference"')
    expect(host.textContent).toContain("Capacitor payloads use")
  })

  it("restores an induction scenario from JSON through the page import UI", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(ElectromagnetismStateService)
    const inductionScenario = service
      .listScenarios()
      .find((scenario) => scenario.id === "electromagnetic-induction")

    if (!inductionScenario) {
      throw new Error("Induction scenario missing in test setup.")
    }

    const host = fixture.nativeElement as HTMLElement
    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        ...inductionScenario,
        fluxRate: 3.4,
        inductance: 1.8,
      },
      snapshot: { timeSeconds: 2.5 },
      overlays: {
        showFieldVectors: true,
        showMagneticField: false,
        showForceVectors: true,
        showPotentialGuides: true,
        showTrajectory: false,
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

    expect(host.textContent).toContain("Electromagnetism scenario restored from JSON.")
    expect(host.textContent).toContain("Induction Controls")
    expect(host.textContent).toContain("Induction Readouts")
    expect(host.textContent).toContain("2.5 s")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showMagneticField": false')
    expect(preview).toContain('"fluxRate": 3.4')
    expect(preview).toContain('"timeSeconds": 2.5')
    expect(host.textContent).toContain("Induction payloads use")
  })

  it("updates overlay flags in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "moving-charge-magnetic-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showMagneticField": true')

    const magneticToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Magnetic field"),
    ) as HTMLButtonElement | undefined

    if (!magneticToggle) {
      throw new Error("Magnetic-field toggle missing in test setup.")
    }

    magneticToggle.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showMagneticField": false')
  })

  it("disables irrelevant overlay toggles and removes them from the effective export preview", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "capacitor-potential-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const magneticToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Magnetic field"),
    ) as HTMLButtonElement | undefined
    const trajectoryToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Trajectory"),
    ) as HTMLButtonElement | undefined

    if (!magneticToggle || !trajectoryToggle) {
      throw new Error("Overlay toggles missing in test setup.")
    }

    expect(magneticToggle.disabled).toBe(true)
    expect(trajectoryToggle.disabled).toBe(true)
    expect(host.textContent).toContain("Magnetic field off")
    expect(host.textContent).toContain("Trajectory off")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showMagneticField": false')
    expect(preview).toContain('"showTrajectory": false')
  })

  it("re-enables supported overlays when switching back to a magnetic-motion scenario", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "capacitor-potential-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    select.value = "moving-charge-magnetic-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const magneticToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Magnetic field"),
    ) as HTMLButtonElement | undefined
    const trajectoryToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Trajectory"),
    ) as HTMLButtonElement | undefined

    if (!magneticToggle || !trajectoryToggle) {
      throw new Error("Overlay toggles missing in test setup.")
    }

    expect(magneticToggle.disabled).toBe(false)
    expect(trajectoryToggle.disabled).toBe(false)
    expect(host.textContent).toContain("Magnetic field on")
    expect(host.textContent).toContain("Trajectory on")
  })

  it("restores a moving-charge scenario from a JSON file through the page import flow", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(ElectromagnetismStateService)
    const movingScenario = service
      .listScenarios()
      .find((scenario) => scenario.id === "moving-charge-magnetic-field")

    if (!movingScenario) {
      throw new Error("Moving-charge scenario missing in test setup.")
    }

    const host = fixture.nativeElement as HTMLElement
    const fileInput = host.querySelector('input[type="file"]') as HTMLInputElement
    const payload = JSON.stringify({
      scenario: {
        ...movingScenario,
        magneticFieldStrength: 2.2,
        mass: 1.4,
      },
      snapshot: { timeSeconds: 1.5 },
      overlays: {
        showFieldVectors: true,
        showMagneticField: true,
        showForceVectors: false,
        showPotentialGuides: true,
        showTrajectory: true,
      },
    })
    const file = new File([payload], "moving-charge.json", { type: "application/json" })
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    })

    fileInput.dispatchEvent(new Event("change"))
    await fixture.whenStable()
    fixture.detectChanges()

    expect(host.textContent).toContain("Electromagnetism scenario restored from JSON.")
    expect(host.textContent).toContain("Magnetic Motion Controls")
    expect(host.textContent).toContain("1.5 s")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"magneticFieldStrength": 2.2')
    expect(preview).toContain('"timeSeconds": 1.5')
    expect(preview).toContain('"showForceVectors": false')
  })

  it("preserves imported overlay intent across scenario switches while filtering unsupported overlays", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const service = TestBed.inject(ElectromagnetismStateService)
    const inductionScenario = service
      .listScenarios()
      .find((scenario) => scenario.id === "electromagnetic-induction")

    if (!inductionScenario) {
      throw new Error("Induction scenario missing in test setup.")
    }

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select") as HTMLSelectElement
    select.value = "moving-charge-magnetic-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const magneticToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Magnetic field"),
    ) as HTMLButtonElement | undefined
    const trajectoryToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Trajectory"),
    ) as HTMLButtonElement | undefined

    if (!magneticToggle || !trajectoryToggle) {
      throw new Error("Overlay toggles missing in test setup.")
    }

    magneticToggle.click()
    trajectoryToggle.click()
    fixture.detectChanges()

    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showMagneticField": false')
    expect(preview).toContain('"showTrajectory": false')

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement
    textarea.value = JSON.stringify({
      scenario: {
        ...inductionScenario,
        fluxRate: 4.1,
        inductance: 2.2,
      },
      snapshot: { timeSeconds: 4.2 },
      overlays: {
        showFieldVectors: true,
        showMagneticField: true,
        showForceVectors: true,
        showPotentialGuides: false,
        showTrajectory: false,
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
    await fixture.whenStable()
    fixture.detectChanges()

    expect(host.textContent).toContain("Induction Controls")
    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "electromagnetic-induction"')
    expect(preview).toContain('"fluxRate": 4.1')
    expect(preview).toContain('"inductance": 2.2')
    expect(preview).toContain('"showMagneticField": true')
    expect(preview).toContain('"showTrajectory": false')
    expect(preview).toContain('"showPotentialGuides": false')

    select.value = "capacitor-potential-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(magneticToggle.disabled).toBe(true)
    expect(trajectoryToggle.disabled).toBe(true)
    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "capacitor-potential-field"')
    expect(preview).toContain('"showMagneticField": false')
    expect(preview).toContain('"showTrajectory": false')
    expect(preview).toContain('"showPotentialGuides": false')

    select.value = "electromagnetic-induction"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(magneticToggle.disabled).toBe(false)
    expect(trajectoryToggle.disabled).toBe(false)
    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "electromagnetic-induction"')
    expect(preview).toContain('"fluxRate": 4.1')
    expect(preview).toContain('"showMagneticField": true')
    expect(preview).toContain('"showTrajectory": false')
    expect(preview).toContain('"showPotentialGuides": false')
  })

  it("copies the active scenario export payload to the clipboard", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
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
      throw new Error("Copy button missing in test setup.")
    }

    copyButton.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(writeText).toHaveBeenCalledTimes(1)
    const firstClipboardCall = writeText.mock.calls[0]
    expect(firstClipboardCall).toBeDefined()
    const copiedPayload = firstClipboardCall?.[0]
    expect(typeof copiedPayload).toBe("string")
    expect(copiedPayload).toContain('"id": "point-charge-electrostatics"')
    expect(copiedPayload).toContain('"showMagneticField": false')
    expect(host.textContent).toContain("Electromagnetism scenario copied to clipboard.")
  })

  it("shows a failure message when clipboard export is unavailable", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
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
      throw new Error("Copy button missing in test setup.")
    }

    copyButton.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(host.textContent).toContain("Clipboard export is unavailable in this browser context.")
  })

  it("exports the active scenario as a downloadable JSON file", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const originalCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    const createObjectUrlSpy = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:electromagnetism-test")
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
      (button) => button.textContent?.trim() === "Export JSON",
    ) as HTMLButtonElement | undefined

    if (!exportButton) {
      throw new Error("Export button missing in test setup.")
    }

    exportButton.click()
    fixture.detectChanges()

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectUrlSpy.mock.calls[0]?.[0] as Blob
    const exportedPayload = await exportedBlob.text()
    expect(exportedBlob.type).toBe("application/json")
    expect(exportedPayload).toContain('"id": "point-charge-electrostatics"')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:electromagnetism-test")
    expect(host.textContent).toContain("Electromagnetism scenario exported as JSON.")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })

  it("shows a failure message when downloadable export is unavailable", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    vi.stubGlobal("window", undefined)

    const host = fixture.nativeElement as HTMLElement
    const exportButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Export JSON",
    ) as HTMLButtonElement | undefined

    if (!exportButton) {
      throw new Error("Export button missing in test setup.")
    }

    exportButton.click()
    fixture.detectChanges()

    expect(host.textContent).toContain("File export is only available in the browser.")
    expect(host.textContent).not.toContain("Electromagnetism scenario exported as JSON.")

    vi.unstubAllGlobals()
  })

  it("round-trips a customized capacitor scenario through downloadable export and file import", async () => {
    const fixture = TestBed.createComponent(ElectromagnetismPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const originalCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    const createObjectUrlSpy = vi
      .spyOn(globalThis.URL, "createObjectURL")
      .mockReturnValue("blob:electromagnetism-roundtrip")
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
    select.value = "capacitor-potential-field"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const numberInputs = Array.from(
      host.querySelectorAll('input[type="number"]'),
    ) as HTMLInputElement[]
    const plateSeparationInput = numberInputs[0]
    const potentialDifferenceInput = numberInputs[1]
    const probeXInput = numberInputs[2]
    const probeYInput = numberInputs[3]

    plateSeparationInput.value = "3.5"
    plateSeparationInput.dispatchEvent(new Event("input"))
    potentialDifferenceInput.value = "18"
    potentialDifferenceInput.dispatchEvent(new Event("input"))
    probeXInput.value = "1.1"
    probeXInput.dispatchEvent(new Event("input"))
    probeYInput.value = "-0.8"
    probeYInput.dispatchEvent(new Event("input"))

    const potentialGuidesToggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Potential guides"),
    ) as HTMLButtonElement | undefined

    if (!potentialGuidesToggle) {
      throw new Error("Potential-guides toggle missing in test setup.")
    }

    potentialGuidesToggle.click()
    fixture.detectChanges()

    const exportButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Export JSON",
    ) as HTMLButtonElement | undefined

    if (!exportButton) {
      throw new Error("Export button missing in test setup.")
    }

    exportButton.click()
    fixture.detectChanges()

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    const exportedBlob = createObjectUrlSpy.mock.calls[0]?.[0] as Blob
    const exportedPayload = await exportedBlob.text()
    expect(exportedPayload).toContain('"id": "capacitor-potential-field"')
    expect(exportedPayload).toContain('"plateSeparation": 3.5')
    expect(exportedPayload).toContain('"potentialDifference": 18')
    expect(exportedPayload).toContain('"showPotentialGuides": false')

    select.value = "point-charge-electrostatics"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    const fileInput = host.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([exportedPayload], "capacitor-roundtrip.json", {
      type: "application/json",
    })
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    })

    fileInput.dispatchEvent(new Event("change"))
    await fixture.whenStable()
    fixture.detectChanges()

    expect(host.textContent).toContain("Electromagnetism scenario restored from JSON.")
    expect(host.textContent).toContain("Capacitor Controls")
    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "capacitor-potential-field"')
    expect(preview).toContain('"plateSeparation": 3.5')
    expect(preview).toContain('"potentialDifference": 18')
    expect(preview).toContain('"probePoint"')
    expect(preview).toContain('"showPotentialGuides": false')
    expect(preview).toContain('"showMagneticField": false')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:electromagnetism-roundtrip")

    createElementSpy.mockRestore()
    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
  })
})
