#include "optics_payload.hpp"

#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::optics {
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
	require_number_field(value, "durationSeconds");
	require_string_field(value, "focusArea");

	Scenario scenario = make_default_scenario(*parsed_id);
	scenario.name = value.at("name").get<std::string>();
	scenario.summary = value.at("summary").get<std::string>();
	scenario.equation_summary = value.at("equationSummary").get<std::string>();
	scenario.status = value.at("status").get<std::string>();
	scenario.duration_seconds = value.at("durationSeconds").get<double>();
	scenario.focus_area = value.at("focusArea").get<std::string>();
	scenario.view_bounds = parse_view_bounds(value.at("viewBounds"));

	if (*parsed_id == ScenarioId::SnellRefraction) {
		require_number_field(value, "incidentAngleDegrees");
		require_number_field(value, "mediumARefractiveIndex");
		require_number_field(value, "mediumBRefractiveIndex");
		scenario.incident_angle_degrees = value.at("incidentAngleDegrees").get<double>();
		scenario.medium_a_refractive_index = value.at("mediumARefractiveIndex").get<double>();
		scenario.medium_b_refractive_index = value.at("mediumBRefractiveIndex").get<double>();
	} else if (*parsed_id == ScenarioId::ThinLensImaging) {
		require_number_field(value, "focalLengthCentimeters");
		require_number_field(value, "objectDistanceCentimeters");
		require_number_field(value, "objectHeightCentimeters");
		scenario.focal_length_centimeters = value.at("focalLengthCentimeters").get<double>();
		scenario.object_distance_centimeters = value.at("objectDistanceCentimeters").get<double>();
		scenario.object_height_centimeters = value.at("objectHeightCentimeters").get<double>();
	} else {
		require_number_field(value, "slitWidthMicrometers");
		require_number_field(value, "wavelengthNanometers");
		require_number_field(value, "screenDistanceMeters");
		scenario.slit_width_micrometers = value.at("slitWidthMicrometers").get<double>();
		scenario.wavelength_nanometers = value.at("wavelengthNanometers").get<double>();
		scenario.screen_distance_meters = value.at("screenDistanceMeters").get<double>();
	}

	return scenario;
}

OverlayOptions parse_overlay_options(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid overlays object");
	}
	require_boolean_field(value, "showIncidentGuide");
	require_boolean_field(value, "showNormalGuide");
	require_boolean_field(value, "showSecondaryGuide");
	return {
		value.at("showIncidentGuide").get<bool>(),
		value.at("showNormalGuide").get<bool>(),
		value.at("showSecondaryGuide").get<bool>(),
	};
}

Json serialize_view_bounds(const ViewBounds& bounds) {
	return {
		{"minX", bounds.min_x},
		{"maxX", bounds.max_x},
		{"minY", bounds.min_y},
		{"maxY", bounds.max_y},
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
		{"viewBounds", serialize_view_bounds(scenario.view_bounds)},
		{"focusArea", scenario.focus_area},
	};
	if (scenario.id == ScenarioId::SnellRefraction) {
		scenario_json["incidentAngleDegrees"] = scenario.incident_angle_degrees.value_or(0.0);
		scenario_json["mediumARefractiveIndex"] = scenario.medium_a_refractive_index.value_or(0.0);
		scenario_json["mediumBRefractiveIndex"] = scenario.medium_b_refractive_index.value_or(0.0);
	} else if (scenario.id == ScenarioId::ThinLensImaging) {
		scenario_json["focalLengthCentimeters"] = scenario.focal_length_centimeters.value_or(0.0);
		scenario_json["objectDistanceCentimeters"] = scenario.object_distance_centimeters.value_or(0.0);
		scenario_json["objectHeightCentimeters"] = scenario.object_height_centimeters.value_or(0.0);
	} else {
		scenario_json["slitWidthMicrometers"] = scenario.slit_width_micrometers.value_or(0.0);
		scenario_json["wavelengthNanometers"] = scenario.wavelength_nanometers.value_or(0.0);
		scenario_json["screenDistanceMeters"] = scenario.screen_distance_meters.value_or(0.0);
	}

	Json snapshot_json{
		{"timeSeconds", snapshot.time_seconds},
		{"stable", snapshot.stable},
	};
	if (snapshot.incident_angle_degrees.has_value()) {
		snapshot_json["incidentAngleDegrees"] = snapshot.incident_angle_degrees.value();
	}
	if (snapshot.reflected_angle_degrees.has_value()) {
		snapshot_json["reflectedAngleDegrees"] = snapshot.reflected_angle_degrees.value();
	}
	if (snapshot.refracted_angle_degrees.has_value()) {
		snapshot_json["refractedAngleDegrees"] = snapshot.refracted_angle_degrees.value();
	}
	if (snapshot.critical_angle_degrees.has_value()) {
		snapshot_json["criticalAngleDegrees"] = snapshot.critical_angle_degrees.value();
	}
	if (snapshot.relative_refractive_index.has_value()) {
		snapshot_json["relativeRefractiveIndex"] = snapshot.relative_refractive_index.value();
	}
	if (snapshot.total_internal_reflection.has_value()) {
		snapshot_json["totalInternalReflection"] = snapshot.total_internal_reflection.value();
	}
	if (snapshot.focal_length_centimeters.has_value()) {
		snapshot_json["focalLengthCentimeters"] = snapshot.focal_length_centimeters.value();
	}
	if (snapshot.object_distance_centimeters.has_value()) {
		snapshot_json["objectDistanceCentimeters"] = snapshot.object_distance_centimeters.value();
	}
	if (snapshot.object_height_centimeters.has_value()) {
		snapshot_json["objectHeightCentimeters"] = snapshot.object_height_centimeters.value();
	}
	if (snapshot.image_distance_centimeters.has_value()) {
		snapshot_json["imageDistanceCentimeters"] = snapshot.image_distance_centimeters.value();
	}
	if (snapshot.image_height_centimeters.has_value()) {
		snapshot_json["imageHeightCentimeters"] = snapshot.image_height_centimeters.value();
	}
	if (snapshot.magnification.has_value()) {
		snapshot_json["magnification"] = snapshot.magnification.value();
	}
	if (snapshot.real_image.has_value()) {
		snapshot_json["realImage"] = snapshot.real_image.value();
	}
	if (snapshot.inverted_image.has_value()) {
		snapshot_json["invertedImage"] = snapshot.inverted_image.value();
	}
	if (snapshot.slit_width_micrometers.has_value()) {
		snapshot_json["slitWidthMicrometers"] = snapshot.slit_width_micrometers.value();
	}
	if (snapshot.wavelength_nanometers.has_value()) {
		snapshot_json["wavelengthNanometers"] = snapshot.wavelength_nanometers.value();
	}
	if (snapshot.screen_distance_meters.has_value()) {
		snapshot_json["screenDistanceMeters"] = snapshot.screen_distance_meters.value();
	}
	if (snapshot.first_minimum_offset_millimeters.has_value()) {
		snapshot_json["firstMinimumOffsetMillimeters"] = snapshot.first_minimum_offset_millimeters.value();
	}
	if (snapshot.central_maximum_width_millimeters.has_value()) {
		snapshot_json["centralMaximumWidthMillimeters"] = snapshot.central_maximum_width_millimeters.value();
	}
	if (snapshot.fringe_spacing_millimeters.has_value()) {
		snapshot_json["fringeSpacingMillimeters"] = snapshot.fringe_spacing_millimeters.value();
	}

	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		samples_json.push_back({
			{"timeSeconds", sample.time_seconds},
			{"rayLabel", sample.ray_label},
			{"startX", sample.start_x},
			{"startY", sample.start_y},
			{"endX", sample.end_x},
			{"endY", sample.end_y},
			{"angleDegrees", sample.angle_degrees},
			{"active", sample.active},
			{"stable", sample.stable},
		});
	}

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{{"showIncidentGuide", overlays.show_incident_guide},
			 {"showNormalGuide", overlays.show_normal_guide},
			 {"showSecondaryGuide", overlays.show_secondary_guide}}},
		{"samples", samples_json},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::optics