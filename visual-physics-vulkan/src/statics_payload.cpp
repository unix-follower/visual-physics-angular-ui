#include "statics_payload.hpp"

#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::statics {
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

Vector2 parse_vector2(const Json& value, std::string_view field_name) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid vector field: " + std::string(field_name));
	}
	require_number_field(value, "x");
	require_number_field(value, "y");
	return {
		value.at("x").get<double>(),
		value.at("y").get<double>(),
	};
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

std::optional<double> parse_optional_number(const Json& value, std::string_view field_name) {
	if (!value.contains(field_name) || value.at(field_name).is_null()) {
		return std::nullopt;
	}
	if (!value.at(field_name).is_number()) {
		throw std::runtime_error("Invalid numeric field: " + std::string(field_name));
	}
	return value.at(field_name).get<double>();
}

std::optional<Vector2> parse_optional_vector2(const Json& value, std::string_view field_name) {
	if (!value.contains(field_name) || value.at(field_name).is_null()) {
		return std::nullopt;
	}
	return parse_vector2(value.at(field_name), field_name);
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
	scenario.initial_position = parse_vector2(value.at("initialPosition"), "initialPosition");
	scenario.applied_force = parse_vector2(value.at("appliedForce"), "appliedForce");
	scenario.anchor_point = parse_optional_vector2(value, "anchorPoint");
	scenario.secondary_point = parse_optional_vector2(value, "secondaryPoint");
	scenario.mass = parse_optional_number(value, "mass");
	scenario.secondary_mass = parse_optional_number(value, "secondaryMass");
	scenario.angle_degrees = parse_optional_number(value, "angleDegrees");
	scenario.friction_coefficient = parse_optional_number(value, "frictionCoefficient");
	scenario.load_position = parse_optional_number(value, "loadPosition");
	scenario.load_magnitude = parse_optional_number(value, "loadMagnitude");
	return scenario;
}

OverlayOptions parse_overlay_options(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid overlays object");
	}
	require_boolean_field(value, "showAppliedForce");
	require_boolean_field(value, "showReactionForces");
	require_boolean_field(value, "showResidualGuides");
	return {
		value.at("showAppliedForce").get<bool>(),
		value.at("showReactionForces").get<bool>(),
		value.at("showResidualGuides").get<bool>(),
	};
}

Json serialize_vector2(const Vector2& value) {
	return Json{{"x", value.x}, {"y", value.y}};
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
		{"initialPosition", serialize_vector2(scenario.initial_position)},
		{"appliedForce", serialize_vector2(scenario.applied_force)},
	};
	if (scenario.anchor_point.has_value()) {
		scenario_json["anchorPoint"] = serialize_vector2(*scenario.anchor_point);
	}
	if (scenario.secondary_point.has_value()) {
		scenario_json["secondaryPoint"] = serialize_vector2(*scenario.secondary_point);
	}
	if (scenario.mass.has_value()) {
		scenario_json["mass"] = *scenario.mass;
	}
	if (scenario.secondary_mass.has_value()) {
		scenario_json["secondaryMass"] = *scenario.secondary_mass;
	}
	if (scenario.angle_degrees.has_value()) {
		scenario_json["angleDegrees"] = *scenario.angle_degrees;
	}
	if (scenario.friction_coefficient.has_value()) {
		scenario_json["frictionCoefficient"] = *scenario.friction_coefficient;
	}
	if (scenario.load_position.has_value()) {
		scenario_json["loadPosition"] = *scenario.load_position;
	}
	if (scenario.load_magnitude.has_value()) {
		scenario_json["loadMagnitude"] = *scenario.load_magnitude;
	}

	Json snapshot_json{
		{"timeSeconds", snapshot.time_seconds},
		{"position", serialize_vector2(snapshot.position)},
		{"appliedForce", serialize_vector2(snapshot.applied_force)},
		{"primaryReactionForce", serialize_vector2(snapshot.primary_reaction_force)},
		{"residualForce", serialize_vector2(snapshot.residual_force)},
		{"residualTorque", snapshot.residual_torque},
		{"stable", snapshot.stable},
	};
	if (snapshot.secondary_reaction_force.has_value()) {
		snapshot_json["secondaryReactionForce"] =
			serialize_vector2(*snapshot.secondary_reaction_force);
	}

	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		samples_json.push_back({
			{"timeSeconds", sample.time_seconds},
			{"residualForceMagnitude", sample.residual_force_magnitude},
			{"residualTorque", sample.residual_torque},
			{"stable", sample.stable},
		});
	}

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{{"showAppliedForce", overlays.show_applied_force},
			 {"showReactionForces", overlays.show_reaction_forces},
			 {"showResidualGuides", overlays.show_residual_guides}}},
		{"samples", samples_json},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::statics