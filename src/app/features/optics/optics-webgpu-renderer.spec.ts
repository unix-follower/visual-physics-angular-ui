import { buildOpticsViewportGeometry } from "./optics-webgpu-renderer"

describe("optics-webgpu-renderer", () => {
  it("builds viewport geometry for the Snell-refraction slice", () => {
    const geometry = buildOpticsViewportGeometry(
      {
        timeSeconds: 0,
        incidentAngleDegrees: 32,
        reflectedAngleDegrees: 32,
        refractedAngleDegrees: 20.5,
        relativeRefractiveIndex: 0.6579,
        totalInternalReflection: false,
        stable: true,
      },
      {
        id: "snell-refraction",
        name: "Snell Refraction at a Flat Interface",
        summary: "Summary",
        equationSummary: "n1 sin(theta1) = n2 sin(theta2)",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        incidentAngleDegrees: 32,
        mediumARefractiveIndex: 1,
        mediumBRefractiveIndex: 1.52,
      },
      {
        showIncidentGuide: true,
        showNormalGuide: true,
        showSecondaryGuide: true,
      },
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("builds viewport geometry for the thin-lens slice", () => {
    const geometry = buildOpticsViewportGeometry(
      {
        timeSeconds: 0,
        focalLengthCentimeters: 18,
        objectDistanceCentimeters: 42,
        objectHeightCentimeters: 4,
        imageDistanceCentimeters: 31.5,
        imageHeightCentimeters: -3,
        magnification: -0.75,
        realImage: true,
        invertedImage: true,
        stable: true,
      },
      {
        id: "thin-lens-imaging",
        name: "Thin Lens Image Formation",
        summary: "Summary",
        equationSummary: "1 / f = 1 / d_o + 1 / d_i",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        focalLengthCentimeters: 18,
        objectDistanceCentimeters: 42,
        objectHeightCentimeters: 4,
      },
      {
        showIncidentGuide: true,
        showNormalGuide: true,
        showSecondaryGuide: true,
      },
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("builds viewport geometry for the single-slit slice", () => {
    const geometry = buildOpticsViewportGeometry(
      {
        timeSeconds: 0,
        slitWidthMicrometers: 40,
        wavelengthNanometers: 520,
        screenDistanceMeters: 1.6,
        firstMinimumOffsetMillimeters: 20.8,
        centralMaximumWidthMillimeters: 41.6,
        fringeSpacingMillimeters: 20.8,
        stable: true,
      },
      {
        id: "single-slit-diffraction",
        name: "Single Slit Diffraction Pattern",
        summary: "Summary",
        equationSummary: "a sin(theta) = m lambda",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        slitWidthMicrometers: 40,
        wavelengthNanometers: 520,
        screenDistanceMeters: 1.6,
      },
      {
        showIncidentGuide: true,
        showNormalGuide: true,
        showSecondaryGuide: true,
      },
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })
})
