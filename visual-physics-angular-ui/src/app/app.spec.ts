import { TestBed } from "@angular/core/testing"
import { provideRouter } from "@angular/router"

import { App } from "./app"

describe("App", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents()
  })

  it("should create the app", () => {
    const fixture = TestBed.createComponent(App)
    const app = fixture.componentInstance
    expect(app).toBeTruthy()
  })

  it("should render the shell title and navigation", async () => {
    const fixture = TestBed.createComponent(App)
    await fixture.whenStable()
    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.querySelector("h1")?.textContent).toContain("Visual Physics")
    const navLinks = Array.from(compiled.querySelectorAll("a")).map((link) =>
      link.textContent?.trim(),
    )
    expect(navLinks).toContain("Kinematics")
    expect(navLinks).toContain("Dynamics")
    expect(navLinks).toContain("Statics")
    expect(navLinks).toContain("Fluid Mechanics")
  })
})
