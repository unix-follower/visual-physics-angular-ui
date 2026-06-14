#include "nuclear_and_particle_physics_payload.hpp"

#include <cmath>
#include <stdexcept>

#include <nlohmann/json.hpp>

namespace visual_physics::nuclear_and_particle_physics {
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

	if (*parsed_id == ScenarioId::RadioactiveDecay) {
		if (!has_finite_number(value, "halfLifeHours") ||
			!has_finite_number(value, "initialPopulationTrillions")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.half_life_hours = value.at("halfLifeHours").get<double>();
		scenario.initial_population_trillions = value.at("initialPopulationTrillions").get<double>();
		return scenario;
	}

	if (*parsed_id == ScenarioId::BindingEnergyCurve) {
		if (!has_finite_number(value, "massNumber") || !has_finite_number(value, "protonCount") ||
			!has_finite_number(value, "bindingEnergyPerNucleonMeV")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.mass_number = value.at("massNumber").get<double>();
		scenario.proton_count = value.at("protonCount").get<double>();
		scenario.binding_energy_per_nucleon_mev = value.at("bindingEnergyPerNucleonMeV").get<double>();
		return scenario;
	}

	if (!has_finite_number(value, "beamEnergyGeV") ||
		!has_finite_number(value, "scatteringAngleDegrees") ||
		!has_finite_number(value, "detectorRadiusMeters")) {
		throw std::runtime_error("Invalid payload");
	}
	scenario.beam_energy_gev = value.at("beamEnergyGeV").get<double>();
	scenario.scattering_angle_degrees = value.at("scatteringAngleDegrees").get<double>();
	scenario.detector_radius_meters = value.at("detectorRadiusMeters").get<double>();
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
	add_optional(payload, "halfLifeHours", scenario.half_life_hours);
	add_optional(payload, "initialPopulationTrillions", scenario.initial_population_trillions);
	add_optional(payload, "massNumber", scenario.mass_number);
	add_optional(payload, "protonCount", scenario.proton_count);
	add_optional(payload, "bindingEnergyPerNucleonMeV", scenario.binding_energy_per_nucleon_mev);
	add_optional(payload, "beamEnergyGeV", scenario.beam_energy_gev);
	add_optional(payload, "scatteringAngleDegrees", scenario.scattering_angle_degrees);
	add_optional(payload, "detectorRadiusMeters", scenario.detector_radius_meters);
	return payload;
}

json serialize_snapshot(const Snapshot& snapshot) {
	json payload = {
		{"timeSeconds", snapshot.time_seconds},
		{"stable", snapshot.stable},
	};
	add_optional(payload, "elapsedHours", snapshot.elapsed_hours);
	add_optional(payload, "remainingPopulationTrillions", snapshot.remaining_population_trillions);
	add_optional(payload, "remainingFraction", snapshot.remaining_fraction);
	add_optional(payload, "activityTerabecquerels", snapshot.activity_terabecquerels);
	add_optional(payload, "totalBindingEnergyMeV", snapshot.total_binding_energy_mev);
	add_optional(payload, "stabilityIndex", snapshot.stability_index);
	add_optional(payload, "invariantMassGeV", snapshot.invariant_mass_gev);
	add_optional(payload, "transverseMomentumGeV", snapshot.transverse_momentum_gev);
	add_optional(payload, "pseudorapidity", snapshot.pseudorapidity);
	return payload;
}

}  // namespace

ImportedScenarioState parse_import_payload(std::string_view source) {
	try {
		const auto payload = nlohmann::json::parse(source);
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
	} catch (const nlohmann::json::exception&) {
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

}  // namespace visual_physics::nuclear_and_particle_physics