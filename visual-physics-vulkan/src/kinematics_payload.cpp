#include "kinematics_payload.hpp"

#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::kinematics {
namespace {

using Json = nlohmann::json;

void require_number_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_number()) {
		throw std::runtime_error("Invalid or missing numeric field: " + std::string(field_name));
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

Scenario parse_scenario(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid scenario object");
	}

	if (!value.contains("id") || !value.at("id").is_string()) {
		throw std::runtime_error("Invalid or missing string field: id");
	}
	const auto scenario_id_text = value.at("id").get<std::string>();
	const auto parsed_id = parse_scenario_id(scenario_id_text);
	if (!parsed_id.has_value()) {
		throw std::runtime_error("Unknown scenario id: " + scenario_id_text);
	}

	if (!value.contains("name") || !value.at("name").is_string()) {
		throw std::runtime_error("Invalid or missing string field: name");
	}
	if (!value.contains("summary") || !value.at("summary").is_string()) {
		throw std::runtime_error("Invalid or missing string field: summary");
	}
	if (!value.contains("equationSummary") || !value.at("equationSummary").is_string()) {
		throw std::runtime_error("Invalid or missing string field: equationSummary");
	}
	require_number_field(value, "durationSeconds");
	const auto view_bounds = parse_view_bounds(value.at("viewBounds"));
	const auto initial_position = parse_vector2(value.at("initialPosition"), "initialPosition");
	const auto initial_velocity = parse_vector2(value.at("initialVelocity"), "initialVelocity");
	const auto acceleration = parse_vector2(value.at("acceleration"), "acceleration");

	Scenario scenario = make_default_scenario(*parsed_id);
	scenario.duration_seconds = value.at("durationSeconds").get<double>();
	scenario.view_bounds = view_bounds;
	scenario.initial_position = initial_position;
	scenario.initial_velocity = initial_velocity;
	scenario.acceleration = acceleration;
	scenario.observer_velocity = std::nullopt;
	scenario.radius = std::nullopt;
	scenario.angular_speed = std::nullopt;
	scenario.center = std::nullopt;

	if (value.contains("observerVelocity") && !value.at("observerVelocity").is_null()) {
		scenario.observer_velocity = parse_vector2(value.at("observerVelocity"), "observerVelocity");
	}
	if (value.contains("radius") && !value.at("radius").is_null()) {
		if (!value.at("radius").is_number()) {
			throw std::runtime_error("Invalid radius");
		}
		scenario.radius = value.at("radius").get<double>();
	}
	if (value.contains("angularSpeed") && !value.at("angularSpeed").is_null()) {
		if (!value.at("angularSpeed").is_number()) {
			throw std::runtime_error("Invalid angularSpeed");
		}
		scenario.angular_speed = value.at("angularSpeed").get<double>();
	}
	if (value.contains("center") && !value.at("center").is_null()) {
		scenario.center = parse_vector2(value.at("center"), "center");
	}

	return scenario;
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
	};
}

std::string serialize_export_payload(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const VectorOverlayOptions& overlays,
	const std::vector<Sample>& samples,
	std::string_view exported_at) {
	Json scenario_json{
		{"id", to_string(scenario.id)},
		{"name", scenario.name},
		{"summary", scenario.summary},
		{"equationSummary", scenario.equation_summary},
		{"durationSeconds", scenario.duration_seconds},
		{"viewBounds",
			{
				{"minX", scenario.view_bounds.min_x},
				{"maxX", scenario.view_bounds.max_x},
				{"minY", scenario.view_bounds.min_y},
				{"maxY", scenario.view_bounds.max_y},
			}},
		{"initialPosition", {{"x", scenario.initial_position.x}, {"y", scenario.initial_position.y}}},
		{"initialVelocity", {{"x", scenario.initial_velocity.x}, {"y", scenario.initial_velocity.y}}},
		{"acceleration", {{"x", scenario.acceleration.x}, {"y", scenario.acceleration.y}}},
	};
	if (scenario.observer_velocity.has_value()) {
		scenario_json["observerVelocity"] = {
			{"x", scenario.observer_velocity->x},
			{"y", scenario.observer_velocity->y},
		};
	}
	if (scenario.radius.has_value()) {
		scenario_json["radius"] = *scenario.radius;
	}
	if (scenario.angular_speed.has_value()) {
		scenario_json["angularSpeed"] = *scenario.angular_speed;
	}
	if (scenario.center.has_value()) {
		scenario_json["center"] = {
			{"x", scenario.center->x},
			{"y", scenario.center->y},
		};
	}

	Json snapshot_json{
		{"timeSeconds", snapshot.time_seconds},
		{"position", {{"x", snapshot.position.x}, {"y", snapshot.position.y}}},
		{"velocity", {{"x", snapshot.velocity.x}, {"y", snapshot.velocity.y}}},
		{"acceleration", {{"x", snapshot.acceleration.x}, {"y", snapshot.acceleration.y}}},
		{"speed", snapshot.speed},
		{"accelerationMagnitude", snapshot.acceleration_magnitude},
	};
	if (snapshot.relative_position.has_value()) {
		snapshot_json["relativePosition"] = {
			{"x", snapshot.relative_position->x},
			{"y", snapshot.relative_position->y},
		};
	}
	if (snapshot.relative_velocity.has_value()) {
		snapshot_json["relativeVelocity"] = {
			{"x", snapshot.relative_velocity->x},
			{"y", snapshot.relative_velocity->y},
		};
	}

	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		samples_json.push_back({
			{"timeSeconds", sample.time_seconds},
			{"xPosition", sample.x_position},
			{"yPosition", sample.y_position},
			{"speed", sample.speed},
			{"accelerationMagnitude", sample.acceleration_magnitude},
		});
	}

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{
				{"showPositionVector", overlays.show_position_vector},
				{"showVelocityVector", overlays.show_velocity_vector},
				{"showAccelerationVector", overlays.show_acceleration_vector},
			}},
		{"samples", samples_json},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::kinematics