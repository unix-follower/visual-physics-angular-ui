import { buildOpticsReportCsv, buildOpticsReportSummaryRows } from "./optics-report"

describe("optics-report", () => {
  it("builds summary rows for the snell-refraction slice", () => {
    const rows = buildOpticsReportSummaryRows(
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
        timeSeconds: 0,
        incidentAngleDegrees: 32,
        reflectedAngleDegrees: 32,
        refractedAngleDegrees: 20.5,
        relativeRefractiveIndex: 0.6579,
        totalInternalReflection: false,
        stable: true,
      },
      [],
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "incident_angle_deg",
      "refracted_angle_deg",
      "critical_angle_deg",
      "total_internal_reflection",
    ])
  })

  it("builds a summary-first CSV export for optics", () => {
    const csv = buildOpticsReportCsv(
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
        timeSeconds: 0,
        incidentAngleDegrees: 32,
        reflectedAngleDegrees: 32,
        refractedAngleDegrees: 20.5,
        relativeRefractiveIndex: 0.6579,
        totalInternalReflection: false,
        stable: true,
      },
      [
        {
          rayLabel: "incident",
          startX: 3,
          startY: 8,
          endX: 5,
          endY: 5,
          angleDegrees: 32,
          active: true,
        },
      ],
    )

    expect(csv).toContain("category,metric,label,value,detail")
    expect(csv).toContain("sample_ray,sample_start_x,sample_start_y")
  })

  it("builds thin-lens summary rows", () => {
    const rows = buildOpticsReportSummaryRows(
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
      [],
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "focal_length_cm",
      "image_distance_cm",
      "magnification",
      "real_image",
    ])
  })

  it("builds single-slit summary rows", () => {
    const rows = buildOpticsReportSummaryRows(
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
        timeSeconds: 0,
        slitWidthMicrometers: 40,
        wavelengthNanometers: 520,
        screenDistanceMeters: 1.6,
        firstMinimumOffsetMillimeters: 20.8,
        centralMaximumWidthMillimeters: 41.6,
        fringeSpacingMillimeters: 20.8,
        stable: true,
      },
      [],
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "slit_width_um",
      "wavelength_nm",
      "first_minimum_offset_mm",
      "central_maximum_width_mm",
    ])
  })
})
