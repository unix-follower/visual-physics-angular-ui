#include "waves_payload.hpp"

#include <cmath>
#include <stdexcept>

#include <nlohmann/json.hpp>

namespace visual_physics::waves {
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
	if (!value.is_object() || !has_boolean(value, "showWaveGuides") ||
		!has_boolean(value, "showNodeMarkers") || !has_boolean(value, "showReferenceCurve")) {
		throw std::runtime_error("Invalid payload");
	}
	return {
		.show_wave_guides = value.at("showWaveGuides").get<bool>(),
		.show_node_markers = value.at("showNodeMarkers").get<bool>(),
		.show_reference_curve = value.at("showReferenceCurve").get<bool>(),
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
	if (*parsed_id == ScenarioId::StandingWave) {
		if (!has_finite_number(value, "stringLengthMeters") ||
			!has_finite_number(value, "waveSpeedMetersPerSecond") ||
			!has_finite_number(value, "amplitudeMillimeters") ||
			!has_finite_number(value, "harmonicNumber")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.string_length_meters = value.at("stringLengthMeters").get<double>();
		scenario.wave_speed_meters_per_second = value.at("waveSpeedMetersPerSecond").get<double>();
		scenario.amplitude_millimeters = value.at("amplitudeMillimeters").get<double>();
		scenario.harmonic_number = value.at("harmonicNumber").get<double>();
	} else if (*parsed_id == ScenarioId::TravelingWave) {
		if (!has_finite_number(value, "waveSpeedMetersPerSecond") ||
			!has_finite_number(value, "amplitudeMillimeters") ||
			!has_finite_number(value, "frequencyHertz")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.wave_speed_meters_per_second = value.at("waveSpeedMetersPerSecond").get<double>();
		scenario.amplitude_millimeters = value.at("amplitudeMillimeters").get<double>();
		scenario.frequency_hertz = value.at("frequencyHertz").get<double>();
	} else {
		if (!has_finite_number(value, "waveSpeedMetersPerSecond") ||
			!has_finite_number(value, "emittedFrequencyHertz") ||
			!has_finite_number(value, "sourceSpeedMetersPerSecond") ||
			!has_finite_number(value, "observerSpeedMetersPerSecond")) {
			throw std::runtime_error("Invalid payload");
		}
		scenario.wave_speed_meters_per_second = value.at("waveSpeedMetersPerSecond").get<double>();
		scenario.emitted_frequency_hertz = value.at("emittedFrequencyHertz").get<double>();
		scenario.source_speed_meters_per_second = value.at("sourceSpeedMetersPerSecond").get<double>();
		scenario.observer_speed_meters_per_second = value.at("observerSpeedMetersPerSecond").get<double>();
	}
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
	add_optional(payload, "stringLengthMeters", scenario.string_length_meters);
	add_optional(payload, "waveSpeedMetersPerSecond", scenario.wave_speed_meters_per_second);
	add_optional(payload, "amplitudeMillimeters", scenario.amplitude_millimeters);
	add_optional(payload, "harmonicNumber", scenario.harmonic_number);
	add_optional(payload, "frequencyHertz", scenario.frequency_hertz);
	add_optional(payload, "emittedFrequencyHertz", scenario.emitted_frequency_hertz);
	add_optional(payload, "sourceSpeedMetersPerSecond", scenario.source_speed_meters_per_second);
	add_optional(payload, "observerSpeedMetersPerSecond", scenario.observer_speed_meters_per_second);
	return payload;
}

json serialize_snapshot(const Snapshot& snapshot) {
	json payload = {
		{"timeSeconds", snapshot.time_seconds},
		{"stable", snapshot.stable},
	};
	add_optional(payload, "stringLengthMeters", snapshot.string_length_meters);
	add_optional(payload, "waveSpeedMetersPerSecond", snapshot.wave_speed_meters_per_second);
	add_optional(payload, "amplitudeMillimeters", snapshot.amplitude_millimeters);
	add_optional(payload, "harmonicNumber", snapshot.harmonic_number);
	add_optional(payload, "wavelengthMeters", snapshot.wavelength_meters);
	add_optional(payload, "frequencyHertz", snapshot.frequency_hertz);
	add_optional(payload, "emittedFrequencyHertz", snapshot.emitted_frequency_hertz);
	add_optional(payload, "sourceSpeedMetersPerSecond", snapshot.source_speed_meters_per_second);
	add_optional(payload, "observerSpeedMetersPerSecond", snapshot.observer_speed_meters_per_second);
	add_optional(payload, "apparentFrequencyHertz", snapshot.apparent_frequency_hertz);
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
			{"showWaveGuides", overlays.show_wave_guides},
			{"showNodeMarkers", overlays.show_node_markers},
			{"showReferenceCurve", overlays.show_reference_curve},
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

}  // namespace visual_physics::waves