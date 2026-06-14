import {
  ThermodynamicsSample,
  ThermodynamicsScenario,
  ThermodynamicsStateSnapshot,
} from "./thermodynamics.models"

export interface ThermodynamicsReportSummaryRow {
  metric: string
  label: string
  displayValue: string
  csvValue: string
  detail: string
}

export function buildThermodynamicsReportSummaryRows(
  scenario: ThermodynamicsScenario,
  snapshot: ThermodynamicsStateSnapshot,
  _samples: readonly ThermodynamicsSample[],
): ThermodynamicsReportSummaryRow[] {
  if (scenario.id === "carnot-cycle") {
    return [
      {
        metric: "thermal_efficiency",
        label: "Thermal efficiency",
        displayValue: `${((snapshot.thermalEfficiency ?? 0) * 100).toFixed(3)}%`,
        csvValue: (snapshot.thermalEfficiency ?? 0).toFixed(6),
        detail: "Ideal Carnot efficiency set by the active hot and cold reservoir temperatures.",
      },
      {
        metric: "absorbed_heat_kj",
        label: "Absorbed heat",
        displayValue: `${(snapshot.absorbedHeatKj ?? 0).toFixed(3)} kJ`,
        csvValue: (snapshot.absorbedHeatKj ?? 0).toFixed(6),
        detail:
          "Reversible heat absorbed from the hot reservoir during the isothermal expansion leg.",
      },
      {
        metric: "rejected_heat_kj",
        label: "Rejected heat",
        displayValue: `${(snapshot.rejectedHeatKj ?? 0).toFixed(3)} kJ`,
        csvValue: (snapshot.rejectedHeatKj ?? 0).toFixed(6),
        detail:
          "Reversible heat rejected to the cold reservoir during the isothermal compression leg.",
      },
      {
        metric: "net_work_kj",
        label: "Net work",
        displayValue: `${(snapshot.netWorkKj ?? 0).toFixed(3)} kJ`,
        csvValue: (snapshot.netWorkKj ?? 0).toFixed(6),
        detail: "Net work enclosed by the ideal pressure-volume loop.",
      },
    ]
  }

  if (scenario.id === "heat-conduction-slab") {
    return [
      {
        metric: "center_temperature_c",
        label: "Center temperature",
        displayValue: `${(snapshot.centerTemperatureCelsius ?? 0).toFixed(3)} degC`,
        csvValue: (snapshot.centerTemperatureCelsius ?? 0).toFixed(6),
        detail: "Transient centerline temperature for the current slab time cursor.",
      },
      {
        metric: "surface_temperature_c",
        label: "Surface temperature",
        displayValue: `${(snapshot.surfaceTemperatureCelsius ?? 0).toFixed(3)} degC`,
        csvValue: (snapshot.surfaceTemperatureCelsius ?? 0).toFixed(6),
        detail: "Fixed boundary temperature applied at both slab surfaces.",
      },
      {
        metric: "heat_flux_w_m2",
        label: "Boundary heat flux",
        displayValue: `${(snapshot.heatFluxWPerM2 ?? 0).toFixed(3)} W/m^2`,
        csvValue: (snapshot.heatFluxWPerM2 ?? 0).toFixed(6),
        detail:
          "Approximate inward boundary flux derived from the current center-to-surface gradient.",
      },
      {
        metric: "fourier_number",
        label: "Fourier number",
        displayValue: (snapshot.fourierNumber ?? 0).toFixed(4),
        csvValue: (snapshot.fourierNumber ?? 0).toFixed(6),
        detail:
          "Non-dimensional transient conduction progress based on diffusivity, time, and slab half-thickness.",
      },
    ]
  }

  return [
    {
      metric: "pressure_kpa",
      label: "Pressure",
      displayValue: `${(snapshot.pressureKpa ?? 0).toFixed(3)} kPa`,
      csvValue: (snapshot.pressureKpa ?? 0).toFixed(6),
      detail:
        "Equation-of-state pressure derived from the selected gas amount, temperature, and chamber volume.",
    },
    {
      metric: "density_kg_m3",
      label: "Density",
      displayValue: `${(snapshot.densityKgPerM3 ?? 0).toFixed(4)} kg/m^3`,
      csvValue: (snapshot.densityKgPerM3 ?? 0).toFixed(6),
      detail: "Mass density of the selected ideal gas inside the active chamber volume.",
    },
    {
      metric: "internal_energy_kj",
      label: "Internal energy proxy",
      displayValue: `${(snapshot.internalEnergyKj ?? 0).toFixed(4)} kJ`,
      csvValue: (snapshot.internalEnergyKj ?? 0).toFixed(6),
      detail: "Translational ideal-gas internal-energy proxy for the current state.",
    },
    {
      metric: "rms_speed_m_s",
      label: "RMS speed",
      displayValue: `${(snapshot.rmsSpeedMs ?? 0).toFixed(2)} m/s`,
      csvValue: (snapshot.rmsSpeedMs ?? 0).toFixed(6),
      detail: "Root-mean-square molecular speed implied by the current temperature and molar mass.",
    },
  ]
}

export function buildThermodynamicsReportCsv(
  scenario: ThermodynamicsScenario,
  snapshot: ThermodynamicsStateSnapshot,
  samples: readonly ThermodynamicsSample[],
): string {
  const summaryRows = buildThermodynamicsReportSummaryRows(scenario, snapshot, samples)
  const lines = [
    "category,metric,label,value,detail",
    ...summaryRows.map(
      (row) =>
        `summary,${row.metric},${escapeCsv(row.label)},${row.csvValue},${escapeCsv(row.detail)}`,
    ),
    "",
    scenario.id === "heat-conduction-slab"
      ? "sample_time_seconds,sample_position_m,sample_temperature_c,sample_heat_flux_w_m2,sample_normalized_temperature,stable"
      : scenario.id === "carnot-cycle"
        ? "sample_time_seconds,sample_stage,sample_volume_m3,sample_pressure_kpa,sample_internal_energy_kj,sample_entropy_transfer_kj_k,stable"
        : "sample_time_seconds,sample_volume_m3,sample_pressure_kpa,sample_density_kg_m3,sample_internal_energy_kj,sample_rms_speed_m_s,stable",
    ...samples.map((sample) =>
      scenario.id === "heat-conduction-slab"
        ? [
            sample.timeSeconds.toFixed(6),
            (sample.positionMeters ?? 0).toFixed(6),
            (sample.temperatureCelsius ?? 0).toFixed(6),
            (sample.heatFluxWPerM2 ?? 0).toFixed(6),
            (sample.normalizedTemperature ?? 0).toFixed(6),
            sample.stable ? "true" : "false",
          ].join(",")
        : scenario.id === "carnot-cycle"
          ? [
              sample.timeSeconds.toFixed(6),
              escapeCsv(sample.stageLabel ?? ""),
              (sample.volumeCubicMeters ?? 0).toFixed(6),
              (sample.pressureKpa ?? 0).toFixed(6),
              (sample.internalEnergyKj ?? 0).toFixed(6),
              (sample.entropyTransferKjPerK ?? 0).toFixed(6),
              sample.stable ? "true" : "false",
            ].join(",")
          : [
              sample.timeSeconds.toFixed(6),
              (sample.volumeCubicMeters ?? 0).toFixed(6),
              (sample.pressureKpa ?? 0).toFixed(6),
              (sample.densityKgPerM3 ?? 0).toFixed(6),
              (sample.internalEnergyKj ?? 0).toFixed(6),
              (sample.rmsSpeedMs ?? 0).toFixed(6),
              sample.stable ? "true" : "false",
            ].join(","),
    ),
  ]

  return lines.join("\n")
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}
