#include "electromagnetism_payload.hpp"

#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::electromagnetism {
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
	return {value.at("x").get<double>(), value.at("y").get<double>()};
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
	scenario.initial_velocity = parse_optional_vector2(value, "initialVelocity");
	scenario.source_point = parse_optional_vector2(value, "sourcePoint");
	scenario.secondary_source_point = parse_optional_vector2(value, "secondarySourcePoint");
	scenario.probe_point = parse_optional_vector2(value, "probePoint");
	scenario.charge_magnitude = parse_optional_number(value, "chargeMagnitude");
	scenario.secondary_charge_magnitude = parse_optional_number(value, "secondaryChargeMagnitude");
	scenario.mass = parse_optional_number(value, "mass");
	scenario.magnetic_field_strength = parse_optional_number(value, "magneticFieldStrength");
	scenario.current = parse_optional_number(value, "current");
	scenario.loop_radius = parse_optional_number(value, "loopRadius");
	scenario.plate_separation = parse_optional_number(value, "plateSeparation");
	scenario.potential_difference = parse_optional_number(value, "potentialDifference");
	scenario.flux_rate = parse_optional_number(value, "fluxRate");
	scenario.inductance = parse_optional_number(value, "inductance");
	return scenario;
}

OverlayOptions parse_overlay_options(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid overlays object");
	}
	require_boolean_field(value, "showFieldVectors");
	require_boolean_field(value, "showMagneticField");
	require_boolean_field(value, "showForceVectors");
	require_boolean_field(value, "showPotentialGuides");
	require_boolean_field(value, "showTrajectory");
	return {
		value.at("showFieldVectors").get<bool>(),
		value.at("showMagneticField").get<bool>(),
		value.at("showForceVectors").get<bool>(),
		value.at("showPotentialGuides").get<bool>(),
		value.at("showTrajectory").get<bool>(),
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
		parse_scenario(payload.at("scenario")),
		snapshot.at("timeSeconds").get<double>(),
		payload.contains("overlays") && !payload.at("overlays").is_null()
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
	};
	if (scenario.initial_velocity.has_value()) {
		scenario_json["initialVelocity"] = serialize_vector2(*scenario.initial_velocity);
	}
	if (scenario.source_point.has_value()) {
		scenario_json["sourcePoint"] = serialize_vector2(*scenario.source_point);
	}
	if (scenario.secondary_source_point.has_value()) {
		scenario_json["secondarySourcePoint"] = serialize_vector2(*scenario.secondary_source_point);
	}
	if (scenario.probe_point.has_value()) {
		scenario_json["probePoint"] = serialize_vector2(*scenario.probe_point);
	}
	if (scenario.charge_magnitude.has_value()) {
		scenario_json["chargeMagnitude"] = *scenario.charge_magnitude;
	}
	if (scenario.secondary_charge_magnitude.has_value()) {
		scenario_json["secondaryChargeMagnitude"] = *scenario.secondary_charge_magnitude;
	}
	if (scenario.mass.has_value()) {
		scenario_json["mass"] = *scenario.mass;
	}
	if (scenario.magnetic_field_strength.has_value()) {
		scenario_json["magneticFieldStrength"] = *scenario.magnetic_field_strength;
	}
	if (scenario.current.has_value()) {
		scenario_json["current"] = *scenario.current;
	}
	if (scenario.loop_radius.has_value()) {
		scenario_json["loopRadius"] = *scenario.loop_radius;
	}
	if (scenario.plate_separation.has_value()) {
		scenario_json["plateSeparation"] = *scenario.plate_separation;
	}
	if (scenario.potential_difference.has_value()) {
		scenario_json["potentialDifference"] = *scenario.potential_difference;
	}
	if (scenario.flux_rate.has_value()) {
		scenario_json["fluxRate"] = *scenario.flux_rate;
	}
	if (scenario.inductance.has_value()) {
		scenario_json["inductance"] = *scenario.inductance;
	}

	Json snapshot_json{
		{"timeSeconds", snapshot.time_seconds},
		{"position", serialize_vector2(snapshot.position)},
		{"electricField", serialize_vector2(snapshot.electric_field)},
		{"magneticField", serialize_vector2(snapshot.magnetic_field)},
		{"force", serialize_vector2(snapshot.force)},
		{"potential", snapshot.potential},
		{"fieldMagnitude", snapshot.field_magnitude},
		{"forceMagnitude", snapshot.force_magnitude},
		{"energy", snapshot.energy},
		{"stable", snapshot.stable},
	};

	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		samples_json.push_back({
			{"timeSeconds", sample.time_seconds},
			{"xPosition", sample.x_position},
			{"yPosition", sample.y_position},
			{"fieldMagnitude", sample.field_magnitude},
			{"forceMagnitude", sample.force_magnitude},
			{"potential", sample.potential},
		});
	}

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{{"showFieldVectors", overlays.show_field_vectors},
			 {"showMagneticField", overlays.show_magnetic_field},
			 {"showForceVectors", overlays.show_force_vectors},
			 {"showPotentialGuides", overlays.show_potential_guides},
			 {"showTrajectory", overlays.show_trajectory}}},
		{"samples", samples_json},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::electromagnetism