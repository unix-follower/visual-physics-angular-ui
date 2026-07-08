import { TestBed } from "@angular/core/testing"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { OpticsPageComponent } from "./optics-page.component"
import { OpticsStateService } from "./optics-state.service"

describe("OpticsPageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpticsPageComponent],
      providers: [
        OpticsStateService,
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

  it("renders the initial optics slice and controls", async () => {
    const fixture = TestBed.createComponent(OpticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    expect(host.textContent).toContain(
      "Phase 17 now ships a complete shared Angular Optics feature",
    )
    expect(host.textContent).toContain("Optics Viewport")
    expect(host.textContent).toContain("Snell Refraction Controls")
    expect(host.textContent).toContain("Incident angle (deg)")
    expect(host.textContent).toContain("Snell Refraction at a Flat Interface")
  })

  it("updates overlay flags in the export preview JSON", async () => {
    const fixture = TestBed.createComponent(OpticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    let preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showIncidentGuide": true')

    const toggle = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Incident ray"),
    )
    if (!toggle) {
      throw new Error("Incident-ray toggle missing in test setup.")
    }

    toggle.click()
    fixture.detectChanges()

    preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"showIncidentGuide": false')
  })

  it("switches to thin-lens controls and export payload", async () => {
    const fixture = TestBed.createComponent(OpticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select")
    expect(select).toBeInstanceOf(HTMLSelectElement)
    if (!(select instanceof HTMLSelectElement)) {
      return
    }

    select.value = "thin-lens-imaging"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Thin Lens Image Formation")
    expect(host.textContent).toContain("Thin Lens Imaging Controls")
    expect(host.textContent).toContain("Focal length (cm)")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "thin-lens-imaging"')
    expect(preview).toContain('"focalLengthCentimeters": 18')
  })

  it("switches to single-slit controls and export payload", async () => {
    const fixture = TestBed.createComponent(OpticsPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()

    const host = fixture.nativeElement as HTMLElement
    const select = host.querySelector("select")
    expect(select).toBeInstanceOf(HTMLSelectElement)
    if (!(select instanceof HTMLSelectElement)) {
      return
    }

    select.value = "single-slit-diffraction"
    select.dispatchEvent(new Event("change"))
    fixture.detectChanges()

    expect(host.textContent).toContain("Single Slit Diffraction Pattern")
    expect(host.textContent).toContain("Single Slit Diffraction Controls")
    expect(host.textContent).toContain("Slit width (um)")

    const preview = host.querySelector("pre")?.textContent ?? ""
    expect(preview).toContain('"id": "single-slit-diffraction"')
    expect(preview).toContain('"slitWidthMicrometers": 40')
  })
})
