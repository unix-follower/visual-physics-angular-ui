#include "astrophysics_payload.hpp"

#include <cmath>
#include <stdexcept>

#include <nlohmann/json.hpp>

namespace visual_physics::astrophysics {
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
	if (*parsed_id == ScenarioId::PlanetaryOrbit) {
		if (!has_finite_number(value, "centralMassSolarMasses") ||
			!has_finite_number(value, "orbitalRadiusAstronomicalUnits") ||
			!has_finite_number(value, "orbitalEccentricity")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.central_mass_solar_masses = value.at("centralMassSolarMasses").get<double>();
		scenario.orbital_radius_astronomical_units = value.at("orbitalRadiusAstronomicalUnits").get<double>();
		scenario.orbital_eccentricity = value.at("orbitalEccentricity").get<double>();
		return scenario;
	}
	if (*parsed_id == ScenarioId::StellarLuminosity) {
		if (!has_finite_number(value, "stellarMassSolarMasses") ||
			!has_finite_number(value, "stellarRadiusSolarRadii") ||
			!has_finite_number(value, "surfaceTemperatureKelvin")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.stellar_mass_solar_masses = value.at("stellarMassSolarMasses").get<double>();
		scenario.stellar_radius_solar_radii = value.at("stellarRadiusSolarRadii").get<double>();
		scenario.surface_temperature_kelvin = value.at("surfaceTemperatureKelvin").get<double>();
		return scenario;
	}
	if (!has_finite_number(value, "distanceMegaparsecs") ||
		!has_finite_number(value, "hubbleConstantKilometersPerSecondPerMegaparsec")) {
		throw std::runtime_error("Invalid payload");
	}
	scenario.distance_megaparsecs = value.at("distanceMegaparsecs").get<double>();
	scenario.hubble_constant_kilometers_per_second_per_megaparsec =
		value.at("hubbleConstantKilometersPerSecondPerMegaparsec").get<double>();
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
	add_optional(payload, "centralMassSolarMasses", scenario.central_mass_solar_masses);
	add_optional(payload, "orbitalRadiusAstronomicalUnits", scenario.orbital_radius_astronomical_units);
	add_optional(payload, "orbitalEccentricity", scenario.orbital_eccentricity);
	add_optional(payload, "stellarMassSolarMasses", scenario.stellar_mass_solar_masses);
	add_optional(payload, "stellarRadiusSolarRadii", scenario.stellar_radius_solar_radii);
	add_optional(payload, "surfaceTemperatureKelvin", scenario.surface_temperature_kelvin);
	add_optional(payload, "distanceMegaparsecs", scenario.distance_megaparsecs);
	add_optional(payload, "hubbleConstantKilometersPerSecondPerMegaparsec", scenario.hubble_constant_kilometers_per_second_per_megaparsec);
	return payload;
}

json serialize_snapshot(const Snapshot& snapshot) {
	json payload = {
		{"timeSeconds", snapshot.time_seconds},
		{"stable", snapshot.stable},
	};
	add_optional(payload, "centralMassSolarMasses", snapshot.central_mass_solar_masses);
	add_optional(payload, "orbitalRadiusAstronomicalUnits", snapshot.orbital_radius_astronomical_units);
	add_optional(payload, "orbitalEccentricity", snapshot.orbital_eccentricity);
	add_optional(payload, "orbitalPeriodDays", snapshot.orbital_period_days);
	add_optional(payload, "orbitalSpeedKilometersPerSecond", snapshot.orbital_speed_kilometers_per_second);
	add_optional(payload, "escapeSpeedKilometersPerSecond", snapshot.escape_speed_kilometers_per_second);
	add_optional(payload, "specificOrbitalEnergyMegajoulesPerKilogram", snapshot.specific_orbital_energy_megajoules_per_kilogram);
	add_optional(payload, "stellarMassSolarMasses", snapshot.stellar_mass_solar_masses);
	add_optional(payload, "stellarRadiusSolarRadii", snapshot.stellar_radius_solar_radii);
	add_optional(payload, "surfaceTemperatureKelvin", snapshot.surface_temperature_kelvin);
	add_optional(payload, "luminositySolarUnits", snapshot.luminosity_solar_units);
	add_optional(payload, "habitableZoneInnerAstronomicalUnits", snapshot.habitable_zone_inner_astronomical_units);
	add_optional(payload, "habitableZoneOuterAstronomicalUnits", snapshot.habitable_zone_outer_astronomical_units);
	add_optional(payload, "distanceMegaparsecs", snapshot.distance_megaparsecs);
	add_optional(payload, "hubbleConstantKilometersPerSecondPerMegaparsec", snapshot.hubble_constant_kilometers_per_second_per_megaparsec);
	add_optional(payload, "recessionVelocityKilometersPerSecond", snapshot.recession_velocity_kilometers_per_second);
	add_optional(payload, "lightTravelTimeBillionYears", snapshot.light_travel_time_billion_years);
	add_optional(payload, "redshift", snapshot.redshift);
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

}  // namespace visual_physics::astrophysics