import { OpticsSample, OpticsScenario, OpticsStateSnapshot } from "./optics.models"

export interface OpticsReportSummaryRow {
  metric: string
  label: string
  displayValue: string
  csvValue: string
  detail: string
}

export function buildOpticsReportSummaryRows(
  scenario: OpticsScenario,
  snapshot: OpticsStateSnapshot,
  _samples: readonly OpticsSample[],
): OpticsReportSummaryRow[] {
  if (scenario.id === "thin-lens-imaging") {
    return [
      {
        metric: "focal_length_cm",
        label: "Focal length",
        displayValue: `${(snapshot.focalLengthCentimeters ?? 0).toFixed(3)} cm`,
        csvValue: (snapshot.focalLengthCentimeters ?? 0).toFixed(6),
        detail: "Converging lens focal length used in the thin-lens equation.",
      },
      {
        metric: "image_distance_cm",
        label: "Image distance",
        displayValue: `${(snapshot.imageDistanceCentimeters ?? 0).toFixed(3)} cm`,
        csvValue: (snapshot.imageDistanceCentimeters ?? 0).toFixed(6),
        detail: "Solved image position relative to the lens center.",
      },
      {
        metric: "magnification",
        label: "Magnification",
        displayValue: `${(snapshot.magnification ?? 0).toFixed(3)}x`,
        csvValue: (snapshot.magnification ?? 0).toFixed(6),
        detail: "Signed image-to-object size ratio from the thin-lens model.",
      },
      {
        metric: "real_image",
        label: "Real image",
        displayValue: snapshot.realImage ? "Yes" : "No",
        csvValue: snapshot.realImage ? "true" : "false",
        detail: "Flags whether the image forms on the outgoing side of the lens.",
      },
    ]
  }

  if (scenario.id === "single-slit-diffraction") {
    return [
      {
        metric: "slit_width_um",
        label: "Slit width",
        displayValue: `${(snapshot.slitWidthMicrometers ?? 0).toFixed(3)} um`,
        csvValue: (snapshot.slitWidthMicrometers ?? 0).toFixed(6),
        detail: "Single-slit aperture width driving the diffraction envelope.",
      },
      {
        metric: "wavelength_nm",
        label: "Wavelength",
        displayValue: `${(snapshot.wavelengthNanometers ?? 0).toFixed(3)} nm`,
        csvValue: (snapshot.wavelengthNanometers ?? 0).toFixed(6),
        detail: "Monochromatic source wavelength used for the diffraction estimate.",
      },
      {
        metric: "first_minimum_offset_mm",
        label: "First minimum offset",
        displayValue: `${(snapshot.firstMinimumOffsetMillimeters ?? 0).toFixed(3)} mm`,
        csvValue: (snapshot.firstMinimumOffsetMillimeters ?? 0).toFixed(6),
        detail: "Screen-plane offset to the first dark fringe from the optical axis.",
      },
      {
        metric: "central_maximum_width_mm",
        label: "Central maximum width",
        displayValue: `${(snapshot.centralMaximumWidthMillimeters ?? 0).toFixed(3)} mm`,
        csvValue: (snapshot.centralMaximumWidthMillimeters ?? 0).toFixed(6),
        detail: "Full width of the central bright diffraction lobe.",
      },
    ]
  }

  return [
    {
      metric: "incident_angle_deg",
      label: "Incident angle",
      displayValue: `${(snapshot.incidentAngleDegrees ?? 0).toFixed(3)} deg`,
      csvValue: (snapshot.incidentAngleDegrees ?? 0).toFixed(6),
      detail: "Incident ray angle measured from the interface normal.",
    },
    {
      metric: "refracted_angle_deg",
      label: "Refracted angle",
      displayValue: snapshot.totalInternalReflection
        ? "No transmitted ray"
        : `${(snapshot.refractedAngleDegrees ?? 0).toFixed(3)} deg`,
      csvValue: snapshot.totalInternalReflection
        ? "NaN"
        : (snapshot.refractedAngleDegrees ?? 0).toFixed(6),
      detail: "Transmitted ray angle from Snell's law for the active medium pair.",
    },
    {
      metric: "critical_angle_deg",
      label: "Critical angle",
      displayValue:
        snapshot.criticalAngleDegrees === undefined
          ? "Not applicable"
          : `${snapshot.criticalAngleDegrees.toFixed(3)} deg`,
      csvValue:
        snapshot.criticalAngleDegrees === undefined
          ? "NaN"
          : snapshot.criticalAngleDegrees.toFixed(6),
      detail:
        "Threshold incident angle beyond which total internal reflection begins for a high-to-low index transition.",
    },
    {
      metric: "total_internal_reflection",
      label: "Total internal reflection",
      displayValue: snapshot.totalInternalReflection ? "Yes" : "No",
      csvValue: snapshot.totalInternalReflection ? "true" : "false",
      detail:
        "Flags whether the transmitted ray exists for the current incident angle and refractive-index pair.",
    },
  ]
}

export function buildOpticsReportCsv(
  scenario: OpticsScenario,
  snapshot: OpticsStateSnapshot,
  samples: readonly OpticsSample[],
): string {
  const summaryRows = buildOpticsReportSummaryRows(scenario, snapshot, samples)
  const lines = [
    "category,metric,label,value,detail",
    ...summaryRows.map(
      (row) =>
        `summary,${row.metric},${escapeCsv(row.label)},${row.csvValue},${escapeCsv(row.detail)}`,
    ),
    "",
    "sample_ray,sample_start_x,sample_start_y,sample_end_x,sample_end_y,sample_angle_deg,active",
    ...samples.map((sample) =>
      [
        escapeCsv(sample.rayLabel),
        sample.startX.toFixed(6),
        sample.startY.toFixed(6),
        sample.endX.toFixed(6),
        sample.endY.toFixed(6),
        sample.angleDegrees.toFixed(6),
        sample.active ? "true" : "false",
      ].join(","),
    ),
  ]

  return lines.join("\n")
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}
