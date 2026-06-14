#include "relativity_payload.hpp"

#include <cmath>
#include <stdexcept>

#include <nlohmann/json.hpp>

namespace visual_physics::relativity {
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
		!has_boolean(value, "showComparisonCurve") || !has_boolean(value, "showActiveMarker")) {
		throw std::runtime_error("Invalid payload");
	}
	return {
		.show_reference_guides = value.at("showReferenceGuides").get<bool>(),
		.show_comparison_curve = value.at("showComparisonCurve").get<bool>(),
		.show_active_marker = value.at("showActiveMarker").get<bool>(),
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
	if (*parsed_id == ScenarioId::RelativisticDoppler) {
		if (!has_finite_number(value, "emittedFrequencyHertz") ||
			!has_finite_number(value, "sourceVelocityFractionOfLight") ||
			!has_finite_number(value, "observerVelocityFractionOfLight")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.emitted_frequency_hertz = value.at("emittedFrequencyHertz").get<double>();
		scenario.source_velocity_fraction_of_light =
			value.at("sourceVelocityFractionOfLight").get<double>();
		scenario.observer_velocity_fraction_of_light =
			value.at("observerVelocityFractionOfLight").get<double>();
		return scenario;
	}
	if (*parsed_id == ScenarioId::GravitationalTimeDilation) {
		if (!has_finite_number(value, "centralMassSolarMasses") ||
			!has_finite_number(value, "orbitalRadiusSchwarzschildRadii") ||
			!has_finite_number(value, "coordinateTimeSeconds")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.central_mass_solar_masses = value.at("centralMassSolarMasses").get<double>();
		scenario.orbital_radius_schwarzschild_radii =
			value.at("orbitalRadiusSchwarzschildRadii").get<double>();
		scenario.coordinate_time_seconds = value.at("coordinateTimeSeconds").get<double>();
		return scenario;
	}
	if (!has_finite_number(value, "relativeVelocityFractionOfLight") ||
		!has_finite_number(value, "properTimeSeconds")) {
		throw std::runtime_error("Invalid payload");
	}
	scenario.relative_velocity_fraction_of_light =
		value.at("relativeVelocityFractionOfLight").get<double>();
	scenario.proper_time_seconds = value.at("properTimeSeconds").get<double>();
	return scenario;
}

json serialize_view_bounds(const ViewBounds& bounds) {
	return json{{"minX", bounds.min_x}, {"maxX", bounds.max_x}, {"minY", bounds.min_y}, {"maxY", bounds.max_y}};
}

template <typename Value>
void add_optional(json& object, std::string_view key, const std::optional<Value>& value) {
	if (value.has_value()) {
		object[std::string(key)] = *value;
	}
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
	add_optional(payload, "relativeVelocityFractionOfLight", scenario.relative_velocity_fraction_of_light);
	add_optional(payload, "properTimeSeconds", scenario.proper_time_seconds);
	add_optional(payload, "emittedFrequencyHertz", scenario.emitted_frequency_hertz);
	add_optional(payload, "sourceVelocityFractionOfLight", scenario.source_velocity_fraction_of_light);
	add_optional(payload, "observerVelocityFractionOfLight", scenario.observer_velocity_fraction_of_light);
	add_optional(payload, "centralMassSolarMasses", scenario.central_mass_solar_masses);
	add_optional(payload, "orbitalRadiusSchwarzschildRadii", scenario.orbital_radius_schwarzschild_radii);
	add_optional(payload, "coordinateTimeSeconds", scenario.coordinate_time_seconds);
	return payload;
}

json serialize_snapshot(const Snapshot& snapshot) {
	json payload = {
		{"timeSeconds", snapshot.time_seconds},
		{"stable", snapshot.stable},
	};
	add_optional(payload, "relativeVelocityFractionOfLight", snapshot.relative_velocity_fraction_of_light);
	add_optional(payload, "properTimeSeconds", snapshot.proper_time_seconds);
	add_optional(payload, "lorentzFactorGamma", snapshot.lorentz_factor_gamma);
	add_optional(payload, "dilatedTimeSeconds", snapshot.dilated_time_seconds);
	add_optional(payload, "timeDifferenceSeconds", snapshot.time_difference_seconds);
	add_optional(payload, "emittedFrequencyHertz", snapshot.emitted_frequency_hertz);
	add_optional(payload, "sourceVelocityFractionOfLight", snapshot.source_velocity_fraction_of_light);
	add_optional(payload, "observerVelocityFractionOfLight", snapshot.observer_velocity_fraction_of_light);
	add_optional(payload, "observedFrequencyHertz", snapshot.observed_frequency_hertz);
	add_optional(payload, "classicalObservedFrequencyHertz", snapshot.classical_observed_frequency_hertz);
	add_optional(payload, "shiftRatio", snapshot.shift_ratio);
	add_optional(payload, "redshift", snapshot.redshift);
	add_optional(payload, "centralMassSolarMasses", snapshot.central_mass_solar_masses);
	add_optional(payload, "orbitalRadiusSchwarzschildRadii", snapshot.orbital_radius_schwarzschild_radii);
	add_optional(payload, "schwarzschildRadiusKilometers", snapshot.schwarzschild_radius_kilometers);
	add_optional(payload, "gravitationalTimeFactor", snapshot.gravitational_time_factor);
	add_optional(payload, "localElapsedTimeSeconds", snapshot.local_elapsed_time_seconds);
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
			{"showComparisonCurve", overlays.show_comparison_curve},
			{"showActiveMarker", overlays.show_active_marker},
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

}  // namespace visual_physics::relativity
