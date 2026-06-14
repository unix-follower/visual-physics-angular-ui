#include "quantum_payload.hpp"

#include <cmath>
#include <stdexcept>

#include <nlohmann/json.hpp>

namespace visual_physics::quantum {
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
	if (!value.is_object() || !has_boolean(value, "showProbabilityGuide") ||
		!has_boolean(value, "showPotentialGuide") || !has_boolean(value, "showPhaseGuide")) {
		throw std::runtime_error("Invalid payload");
	}
	return {
		.show_probability_guide = value.at("showProbabilityGuide").get<bool>(),
		.show_potential_guide = value.at("showPotentialGuide").get<bool>(),
		.show_phase_guide = value.at("showPhaseGuide").get<bool>(),
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
	if (*parsed_id == ScenarioId::ParticleInBox) {
		if (!has_finite_number(value, "boxLengthNanometers") || !has_finite_number(value, "quantumNumber")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.box_length_nanometers = value.at("boxLengthNanometers").get<double>();
		scenario.quantum_number = value.at("quantumNumber").get<double>();
	} else if (*parsed_id == ScenarioId::FinitePotentialWellTunneling) {
		if (!has_finite_number(value, "particleEnergyEv") || !has_finite_number(value, "barrierHeightEv") ||
			!has_finite_number(value, "barrierWidthNanometers")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.particle_energy_ev = value.at("particleEnergyEv").get<double>();
		scenario.barrier_height_ev = value.at("barrierHeightEv").get<double>();
		scenario.barrier_width_nanometers = value.at("barrierWidthNanometers").get<double>();
	} else {
		if (!has_finite_number(value, "wavelengthNanometers") || !has_finite_number(value, "slitSeparationMicrometers") ||
			!has_finite_number(value, "slitWidthMicrometers") || !has_finite_number(value, "screenDistanceMeters")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.wavelength_nanometers = value.at("wavelengthNanometers").get<double>();
		scenario.slit_separation_micrometers = value.at("slitSeparationMicrometers").get<double>();
		scenario.slit_width_micrometers = value.at("slitWidthMicrometers").get<double>();
		scenario.screen_distance_meters = value.at("screenDistanceMeters").get<double>();
	}
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
	if (scenario.box_length_nanometers.has_value()) {
		payload["boxLengthNanometers"] = *scenario.box_length_nanometers;
	}
	if (scenario.quantum_number.has_value()) {
		payload["quantumNumber"] = *scenario.quantum_number;
	}
	if (scenario.particle_energy_ev.has_value()) {
		payload["particleEnergyEv"] = *scenario.particle_energy_ev;
	}
	if (scenario.barrier_height_ev.has_value()) {
		payload["barrierHeightEv"] = *scenario.barrier_height_ev;
	}
	if (scenario.barrier_width_nanometers.has_value()) {
		payload["barrierWidthNanometers"] = *scenario.barrier_width_nanometers;
	}
	if (scenario.wavelength_nanometers.has_value()) {
		payload["wavelengthNanometers"] = *scenario.wavelength_nanometers;
	}
	if (scenario.slit_separation_micrometers.has_value()) {
		payload["slitSeparationMicrometers"] = *scenario.slit_separation_micrometers;
	}
	if (scenario.slit_width_micrometers.has_value()) {
		payload["slitWidthMicrometers"] = *scenario.slit_width_micrometers;
	}
	if (scenario.screen_distance_meters.has_value()) {
		payload["screenDistanceMeters"] = *scenario.screen_distance_meters;
	}
	return payload;
}

template <typename Value>
void add_optional(json& object, std::string_view key, const std::optional<Value>& value) {
	if (value.has_value()) {
		object[std::string(key)] = *value;
	}
}

json serialize_snapshot(const Snapshot& snapshot) {
	json payload = {{"timeSeconds", snapshot.time_seconds}, {"stable", snapshot.stable}};
	add_optional(payload, "boxLengthNanometers", snapshot.box_length_nanometers);
	add_optional(payload, "quantumNumber", snapshot.quantum_number);
	add_optional(payload, "energyLevelEv", snapshot.energy_level_ev);
	add_optional(payload, "deBroglieWavelengthNanometers", snapshot.de_broglie_wavelength_nanometers);
	add_optional(payload, "nodeCount", snapshot.node_count);
	add_optional(payload, "firstAntinodeNanometers", snapshot.first_antinode_nanometers);
	add_optional(payload, "particleEnergyEv", snapshot.particle_energy_ev);
	add_optional(payload, "barrierHeightEv", snapshot.barrier_height_ev);
	add_optional(payload, "barrierWidthNanometers", snapshot.barrier_width_nanometers);
	add_optional(payload, "transmissionProbability", snapshot.transmission_probability);
	add_optional(payload, "reflectionProbability", snapshot.reflection_probability);
	add_optional(payload, "decayLengthNanometers", snapshot.decay_length_nanometers);
	add_optional(payload, "wavelengthNanometers", snapshot.wavelength_nanometers);
	add_optional(payload, "slitSeparationMicrometers", snapshot.slit_separation_micrometers);
	add_optional(payload, "slitWidthMicrometers", snapshot.slit_width_micrometers);
	add_optional(payload, "screenDistanceMeters", snapshot.screen_distance_meters);
	add_optional(payload, "fringeSpacingMillimeters", snapshot.fringe_spacing_millimeters);
	add_optional(payload, "centralMaximumWidthMillimeters", snapshot.central_maximum_width_millimeters);
	add_optional(payload, "coherenceEstimate", snapshot.coherence_estimate);
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
			{"showProbabilityGuide", overlays.show_probability_guide},
			{"showPotentialGuide", overlays.show_potential_guide},
			{"showPhaseGuide", overlays.show_phase_guide},
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

}  // namespace visual_physics::quantum