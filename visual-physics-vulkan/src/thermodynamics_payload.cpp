#include "thermodynamics_payload.hpp"

#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::thermodynamics {
namespace {

using Json = nlohmann::json;

void require_number_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_number()) {
		throw std::runtime_error("Invalid or missing numeric field: " + std::string(field_name));
	}
}

void require_string_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_string()) {
		throw std::runtime_error("Invalid or missing string field: " + std::string(field_name));
	}
}

void require_boolean_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_boolean()) {
		throw std::runtime_error("Invalid or missing boolean field: " + std::string(field_name));
	}
}

ViewBounds parse_view_bounds(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid viewBounds");
	}
	require_number_field(value, "minX");
	require_number_field(value, "maxX");
	require_number_field(value, "minY");
	require_number_field(value, "maxY");
	return {
		value.at("minX").get<double>(),
		value.at("maxX").get<double>(),
		value.at("minY").get<double>(),
		value.at("maxY").get<double>(),
	};
}

Scenario parse_scenario(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid scenario object");
	}
	require_string_field(value, "id");
	const auto scenario_id_text = value.at("id").get<std::string>();
	const auto parsed_id = parse_scenario_id(scenario_id_text);
	if (!parsed_id.has_value()) {
		throw std::runtime_error("Unknown scenario id: " + scenario_id_text);
	}
	require_string_field(value, "name");
	require_string_field(value, "summary");
	require_string_field(value, "equationSummary");
	require_string_field(value, "status");
	require_string_field(value, "focusArea");
	require_number_field(value, "durationSeconds");
	Scenario scenario = make_default_scenario(*parsed_id);
	scenario.name = value.at("name").get<std::string>();
	scenario.summary = value.at("summary").get<std::string>();
	scenario.equation_summary = value.at("equationSummary").get<std::string>();
	scenario.status = value.at("status").get<std::string>();
	scenario.duration_seconds = value.at("durationSeconds").get<double>();
	scenario.view_bounds = parse_view_bounds(value.at("viewBounds"));
	scenario.focus_area = value.at("focusArea").get<std::string>();
	if (*parsed_id == ScenarioId::HeatConductionSlab) {
		require_number_field(value, "slabThicknessMeters");
		require_number_field(value, "thermalConductivityWPerMK");
		require_number_field(value, "thermalDiffusivityM2PerS");
		require_number_field(value, "initialTemperatureCelsius");
		require_number_field(value, "boundaryTemperatureCelsius");
		scenario.gas_constant = 0.0;
		scenario.molar_amount = 0.0;
		scenario.temperature_kelvin = 0.0;
		scenario.volume_cubic_meters = 0.0;
		scenario.molar_mass_kg_per_mol = 0.0;
		scenario.degrees_of_freedom = 0.0;
		scenario.slab_thickness_meters = value.at("slabThicknessMeters").get<double>();
		scenario.thermal_conductivity_w_per_mk = value.at("thermalConductivityWPerMK").get<double>();
		scenario.thermal_diffusivity_m2_per_s = value.at("thermalDiffusivityM2PerS").get<double>();
		scenario.initial_temperature_celsius = value.at("initialTemperatureCelsius").get<double>();
		scenario.boundary_temperature_celsius = value.at("boundaryTemperatureCelsius").get<double>();
	} else if (*parsed_id == ScenarioId::CarnotCycle) {
		require_number_field(value, "gasConstant");
		require_number_field(value, "molarAmount");
		require_number_field(value, "hotReservoirTemperatureKelvin");
		require_number_field(value, "coldReservoirTemperatureKelvin");
		require_number_field(value, "cycleMinVolumeCubicMeters");
		require_number_field(value, "cycleVolumeRatio");
		scenario.gas_constant = value.at("gasConstant").get<double>();
		scenario.molar_amount = value.at("molarAmount").get<double>();
		scenario.temperature_kelvin = 0.0;
		scenario.volume_cubic_meters = 0.0;
		scenario.molar_mass_kg_per_mol = 0.0;
		scenario.degrees_of_freedom = 0.0;
		scenario.hot_reservoir_temperature_kelvin = value.at("hotReservoirTemperatureKelvin").get<double>();
		scenario.cold_reservoir_temperature_kelvin = value.at("coldReservoirTemperatureKelvin").get<double>();
		scenario.cycle_min_volume_cubic_meters = value.at("cycleMinVolumeCubicMeters").get<double>();
		scenario.cycle_volume_ratio = value.at("cycleVolumeRatio").get<double>();
	} else {
		require_number_field(value, "gasConstant");
		require_number_field(value, "molarAmount");
		require_number_field(value, "temperatureKelvin");
		require_number_field(value, "volumeCubicMeters");
		require_number_field(value, "molarMassKgPerMol");
		require_number_field(value, "degreesOfFreedom");
		scenario.gas_constant = value.at("gasConstant").get<double>();
		scenario.molar_amount = value.at("molarAmount").get<double>();
		scenario.temperature_kelvin = value.at("temperatureKelvin").get<double>();
		scenario.volume_cubic_meters = value.at("volumeCubicMeters").get<double>();
		scenario.molar_mass_kg_per_mol = value.at("molarMassKgPerMol").get<double>();
		scenario.degrees_of_freedom = value.at("degreesOfFreedom").get<double>();
	}
	return scenario;
}

OverlayOptions parse_overlay_options(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid overlays object");
	}
	require_boolean_field(value, "showPressureGuide");
	require_boolean_field(value, "showTemperatureBand");
	require_boolean_field(value, "showEnergyMarker");
	return {
		value.at("showPressureGuide").get<bool>(),
		value.at("showTemperatureBand").get<bool>(),
		value.at("showEnergyMarker").get<bool>(),
	};
}

}  // namespace

ImportedScenarioState parse_import_payload(std::string_view source) {
	const Json payload = Json::parse(source);
	if (!payload.is_object()) {
		throw std::runtime_error("Invalid payload root");
	}
	if (!payload.contains("scenario") || !payload.at("scenario").is_object()) {
		throw std::runtime_error("Invalid or missing scenario payload");
	}
	if (!payload.contains("snapshot") || !payload.at("snapshot").is_object()) {
		throw std::runtime_error("Invalid or missing snapshot payload");
	}
	const auto& snapshot = payload.at("snapshot");
	require_number_field(snapshot, "timeSeconds");

	return {
		.scenario = parse_scenario(payload.at("scenario")),
		.time_seconds = snapshot.at("timeSeconds").get<double>(),
		.overlays = payload.contains("overlays") && !payload.at("overlays").is_null()
			? std::optional<OverlayOptions>{parse_overlay_options(payload.at("overlays"))}
			: std::nullopt,
	};
}

std::string serialize_export_payload(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const OverlayOptions& overlays,
	const std::vector<Sample>& samples,
	std::string_view exported_at) {
	Json scenario_json{
		{"id", to_string(scenario.id)},
		{"name", scenario.name},
		{"summary", scenario.summary},
		{"equationSummary", scenario.equation_summary},
		{"status", scenario.status},
		{"durationSeconds", scenario.duration_seconds},
		{"viewBounds",
			{{"minX", scenario.view_bounds.min_x},
			 {"maxX", scenario.view_bounds.max_x},
			 {"minY", scenario.view_bounds.min_y},
			 {"maxY", scenario.view_bounds.max_y}}},
		{"focusArea", scenario.focus_area},
		{"gasConstant", scenario.gas_constant},
		{"molarAmount", scenario.molar_amount},
		{"temperatureKelvin", scenario.temperature_kelvin},
		{"volumeCubicMeters", scenario.volume_cubic_meters},
		{"molarMassKgPerMol", scenario.molar_mass_kg_per_mol},
		{"degreesOfFreedom", scenario.degrees_of_freedom},
	};
	if (scenario.id == ScenarioId::HeatConductionSlab) {
		scenario_json["slabThicknessMeters"] = scenario.slab_thickness_meters.value_or(0.0);
		scenario_json["thermalConductivityWPerMK"] = scenario.thermal_conductivity_w_per_mk.value_or(0.0);
		scenario_json["thermalDiffusivityM2PerS"] = scenario.thermal_diffusivity_m2_per_s.value_or(0.0);
		scenario_json["initialTemperatureCelsius"] = scenario.initial_temperature_celsius.value_or(0.0);
		scenario_json["boundaryTemperatureCelsius"] = scenario.boundary_temperature_celsius.value_or(0.0);
	} else if (scenario.id == ScenarioId::CarnotCycle) {
		scenario_json["hotReservoirTemperatureKelvin"] = scenario.hot_reservoir_temperature_kelvin.value_or(0.0);
		scenario_json["coldReservoirTemperatureKelvin"] = scenario.cold_reservoir_temperature_kelvin.value_or(0.0);
		scenario_json["cycleMinVolumeCubicMeters"] = scenario.cycle_min_volume_cubic_meters.value_or(0.0);
		scenario_json["cycleVolumeRatio"] = scenario.cycle_volume_ratio.value_or(0.0);
	}

	Json snapshot_json{
		{"timeSeconds", snapshot.time_seconds},
		{"pressurePascals", snapshot.pressure_pascals},
		{"densityKgPerM3", snapshot.density_kg_m3},
		{"internalEnergyJoules", snapshot.internal_energy_joules},
		{"temperatureKelvin", snapshot.temperature_kelvin},
		{"volumeCubicMeters", snapshot.volume_cubic_meters},
		{"stable", snapshot.stable},
	};
	if (scenario.id == ScenarioId::HeatConductionSlab) {
		snapshot_json["centerTemperatureCelsius"] = snapshot.center_temperature_celsius.value_or(0.0);
		snapshot_json["surfaceTemperatureCelsius"] = snapshot.surface_temperature_celsius.value_or(0.0);
		snapshot_json["heatFluxWPerM2"] = snapshot.heat_flux_w_per_m2.value_or(0.0);
		snapshot_json["fourierNumber"] = snapshot.fourier_number.value_or(0.0);
		snapshot_json["normalizedTemperature"] = snapshot.normalized_temperature.value_or(0.0);
	} else if (scenario.id == ScenarioId::CarnotCycle) {
		snapshot_json["thermalEfficiency"] = snapshot.thermal_efficiency.value_or(0.0);
		snapshot_json["absorbedHeatKj"] = snapshot.absorbed_heat_kj.value_or(0.0);
		snapshot_json["rejectedHeatKj"] = snapshot.rejected_heat_kj.value_or(0.0);
		snapshot_json["netWorkKj"] = snapshot.net_work_kj.value_or(0.0);
		snapshot_json["entropyTransferKjPerK"] = snapshot.entropy_transfer_kj_per_k.value_or(0.0);
		snapshot_json["cycleStageLabel"] = snapshot.cycle_stage_label.value_or(std::string{});
	}

	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		if (scenario.id == ScenarioId::HeatConductionSlab) {
			samples_json.push_back({
				{"timeSeconds", sample.time_seconds},
				{"positionMeters", sample.position_meters.value_or(0.0)},
				{"temperatureCelsius", sample.temperature_celsius.value_or(0.0)},
				{"heatFluxWPerM2", sample.heat_flux_w_per_m2.value_or(0.0)},
				{"normalizedTemperature", sample.normalized_temperature.value_or(0.0)},
				{"stable", sample.stable},
			});
		} else if (scenario.id == ScenarioId::CarnotCycle) {
			samples_json.push_back({
				{"timeSeconds", sample.time_seconds},
				{"volumeCubicMeters", sample.volume_cubic_meters},
				{"pressurePascals", sample.pressure_pascals},
				{"internalEnergyJoules", sample.internal_energy_joules},
				{"entropyTransferKjPerK", sample.entropy_transfer_kj_per_k.value_or(0.0)},
				{"stageLabel", sample.stage_label.value_or(std::string{})},
				{"stable", sample.stable},
			});
		} else {
			samples_json.push_back({
				{"timeSeconds", sample.time_seconds},
				{"volumeCubicMeters", sample.volume_cubic_meters},
				{"pressurePascals", sample.pressure_pascals},
				{"temperatureKelvin", sample.temperature_kelvin},
				{"internalEnergyJoules", sample.internal_energy_joules},
				{"stable", sample.stable},
			});
		}
	}

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{{"showPressureGuide", overlays.show_pressure_guide},
			 {"showTemperatureBand", overlays.show_temperature_band},
			 {"showEnergyMarker", overlays.show_energy_marker}}},
		{"samples", samples_json},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::thermodynamics