#include "atmospheric_payload.hpp"

#include <cmath>
#include <stdexcept>

#include <nlohmann/json.hpp>

namespace visual_physics::atmospheric {
namespace {

using nlohmann::json;

bool is_finite_number(const json& value) {
	return value.is_number() && std::isfinite(value.get<double>());
}

bool has_finite_number(const json& object, std::string_view field_name) {
	return object.contains(field_name) && is_finite_number(object.at(field_name));
}

bool has_boolean(const json& object, std::string_view field_name) {
	return object.contains(field_name) && object.at(field_name).is_boolean();
}

bool has_string(const json& object, std::string_view field_name) {
	return object.contains(field_name) && object.at(field_name).is_string();
}

template <typename Value>
void add_optional(json& object, std::string_view key, const std::optional<Value>& value) {
	if (value.has_value()) {
		object[std::string(key)] = *value;
	}
}

ViewBounds parse_view_bounds(const json& value) {
	if (!value.is_object() || !has_finite_number(value, "minX") || !has_finite_number(value, "maxX") ||
		!has_finite_number(value, "minY") || !has_finite_number(value, "maxY")) {
		throw std::runtime_error("Invalid payload");
	}
	return {
		.min_x = value.at("minX").get<double>(),
		.max_x = value.at("maxX").get<double>(),
		.min_y = value.at("minY").get<double>(),
		.max_y = value.at("maxY").get<double>(),
	};
}

OverlayOptions parse_overlays(const json& value) {
	if (!value.is_object() || !has_boolean(value, "showReferenceGuides") ||
		!has_boolean(value, "showActiveMarker") || !has_boolean(value, "showComparisonBand")) {
		throw std::runtime_error("Invalid payload");
	}
	return {
		.show_reference_guides = value.at("showReferenceGuides").get<bool>(),
		.show_active_marker = value.at("showActiveMarker").get<bool>(),
		.show_comparison_band = value.at("showComparisonBand").get<bool>(),
	};
}

Scenario parse_scenario(const json& value) {
	if (!value.is_object() || !has_string(value, "id") || !has_string(value, "name") ||
		!has_string(value, "summary") || !has_string(value, "equationSummary") ||
		!has_string(value, "status") || !has_finite_number(value, "durationSeconds") ||
		!has_string(value, "focusArea") || !value.contains("viewBounds")) {
		throw std::runtime_error("Invalid payload");
	}

	const auto parsed_id = parse_scenario_id(value.at("id").get<std::string>());
	if (!parsed_id.has_value()) {
		throw std::runtime_error("Invalid payload");
	}

	Scenario scenario{
		.id = *parsed_id,
		.name = value.at("name").get<std::string>(),
		.summary = value.at("summary").get<std::string>(),
		.equation_summary = value.at("equationSummary").get<std::string>(),
		.status = value.at("status").get<std::string>(),
		.duration_seconds = value.at("durationSeconds").get<double>(),
		.view_bounds = parse_view_bounds(value.at("viewBounds")),
		.focus_area = value.at("focusArea").get<std::string>(),
	};

	if (*parsed_id == ScenarioId::BarometricFormula) {
		if (!has_finite_number(value, "seaLevelPressureKilopascals") ||
			!has_finite_number(value, "scaleHeightKilometers")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.sea_level_pressure_kilopascals = value.at("seaLevelPressureKilopascals").get<double>();
		scenario.scale_height_kilometers = value.at("scaleHeightKilometers").get<double>();
		return scenario;
	}

	if (*parsed_id == ScenarioId::AdiabaticLapseRate) {
		if (!has_finite_number(value, "surfaceTemperatureKelvin") ||
			!has_finite_number(value, "lapseRateKelvinPerKilometer") ||
			!has_finite_number(value, "tropopauseHeightKilometers")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.surface_temperature_kelvin = value.at("surfaceTemperatureKelvin").get<double>();
		scenario.lapse_rate_kelvin_per_kilometer = value.at("lapseRateKelvinPerKilometer").get<double>();
		scenario.tropopause_height_kilometers = value.at("tropopauseHeightKilometers").get<double>();
		return scenario;
	}

	if (!has_finite_number(value, "surfaceTemperatureKelvin") ||
		!has_finite_number(value, "environmentalLapseRateKelvinPerKilometer") ||
		!has_finite_number(value, "parcelTemperatureExcessKelvin") ||
		!has_finite_number(value, "columnHeightKilometers")) {
		throw std::runtime_error("Invalid payload");
	}
	scenario.surface_temperature_kelvin = value.at("surfaceTemperatureKelvin").get<double>();
	scenario.environmental_lapse_rate_kelvin_per_kilometer =
		value.at("environmentalLapseRateKelvinPerKilometer").get<double>();
	scenario.parcel_temperature_excess_kelvin = value.at("parcelTemperatureExcessKelvin").get<double>();
	scenario.column_height_kilometers = value.at("columnHeightKilometers").get<double>();
	return scenario;
}

json serialize_view_bounds(const ViewBounds& bounds) {
	return json{{"minX", bounds.min_x}, {"maxX", bounds.max_x}, {"minY", bounds.min_y}, {"maxY", bounds.max_y}};
}

json serialize_scenario(const Scenario& scenario) {
	json payload = {
		{"id", to_string(scenario.id)},
		{"name", scenario.name},
		{"summary", scenario.summary},
		{"equationSummary", scenario.equation_summary},
		{"status", scenario.status},
		{"durationSeconds", scenario.duration_seconds},
		{"viewBounds", serialize_view_bounds(scenario.view_bounds)},
		{"focusArea", scenario.focus_area},
	};
	add_optional(payload, "seaLevelPressureKilopascals", scenario.sea_level_pressure_kilopascals);
	add_optional(payload, "scaleHeightKilometers", scenario.scale_height_kilometers);
	add_optional(payload, "surfaceTemperatureKelvin", scenario.surface_temperature_kelvin);
	add_optional(payload, "lapseRateKelvinPerKilometer", scenario.lapse_rate_kelvin_per_kilometer);
	add_optional(payload, "tropopauseHeightKilometers", scenario.tropopause_height_kilometers);
	add_optional(payload, "environmentalLapseRateKelvinPerKilometer", scenario.environmental_lapse_rate_kelvin_per_kilometer);
	add_optional(payload, "parcelTemperatureExcessKelvin", scenario.parcel_temperature_excess_kelvin);
	add_optional(payload, "columnHeightKilometers", scenario.column_height_kilometers);
	return payload;
}

json serialize_snapshot(const Snapshot& snapshot) {
	json payload = {
		{"timeSeconds", snapshot.time_seconds},
		{"stable", snapshot.stable},
	};
	add_optional(payload, "altitudeKilometers", snapshot.altitude_kilometers);
	add_optional(payload, "pressureKilopascals", snapshot.pressure_kilopascals);
	add_optional(payload, "relativeDensity", snapshot.relative_density);
	add_optional(payload, "temperatureKelvin", snapshot.temperature_kelvin);
	add_optional(payload, "referenceTemperatureKelvin", snapshot.reference_temperature_kelvin);
	add_optional(payload, "tropopauseHeightKilometers", snapshot.tropopause_height_kilometers);
	add_optional(payload, "parcelAltitudeKilometers", snapshot.parcel_altitude_kilometers);
	add_optional(payload, "buoyancyAccelerationMetersPerSecondSquared", snapshot.buoyancy_acceleration_meters_per_second_squared);
	add_optional(payload, "updraftVelocityMetersPerSecond", snapshot.updraft_velocity_meters_per_second);
	add_optional(payload, "convectiveAvailablePotentialEnergyKilojoulesPerKilogram", snapshot.convective_available_potential_energy_kilojoules_per_kilogram);
	return payload;
}

}  // namespace

ImportedScenarioState parse_import_payload(std::string_view source) {
	try {
		const auto payload = json::parse(source);
		if (!payload.is_object() || !payload.contains("scenario") || !payload.at("scenario").is_object() ||
			!payload.contains("snapshot") || !payload.at("snapshot").is_object() ||
			!has_finite_number(payload.at("snapshot"), "timeSeconds")) {
			throw std::runtime_error("Invalid payload");
		}

		ImportedScenarioState imported{
			.scenario = parse_scenario(payload.at("scenario")),
			.time_seconds = payload.at("snapshot").at("timeSeconds").get<double>(),
			.overlays = std::nullopt,
		};
		if (payload.contains("overlays") && !payload.at("overlays").is_null()) {
			imported.overlays = parse_overlays(payload.at("overlays"));
		}
		return imported;
	} catch (const json::exception&) {
		throw std::runtime_error("Invalid payload");
	}
}

std::string serialize_export_payload(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const OverlayOptions& overlays,
	const std::vector<Sample>& samples,
	std::string_view exported_at) {
	json payload = {
		{"exportedAt", exported_at},
		{"scenario", serialize_scenario(scenario)},
		{"snapshot", serialize_snapshot(snapshot)},
		{"overlays", {
			{"showReferenceGuides", overlays.show_reference_guides},
			{"showActiveMarker", overlays.show_active_marker},
			{"showComparisonBand", overlays.show_comparison_band},
		}},
		{"samples", json::array()},
	};
	for (const auto& sample : samples) {
		json sample_json = {
			{"position", sample.position},
			{"primaryValue", sample.primary_value},
			{"label", sample.label},
			{"active", sample.active},
		};
		if (sample.secondary_value.has_value()) {
			sample_json["secondaryValue"] = *sample.secondary_value;
		}
		payload["samples"].push_back(sample_json);
	}
	return payload.dump(2);
}

}  // namespace visual_physics::atmospheric