#include "dynamics_payload.hpp"

#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::dynamics {
namespace {

using Json = nlohmann::json;

void require_number_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_number()) {
		throw std::runtime_error("Invalid or missing numeric field: " + std::string(field_name));
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
	require_number_field(value, "mass");

	Scenario scenario = make_default_scenario(*parsed_id);
	scenario.name = value.at("name").get<std::string>();
	scenario.summary = value.at("summary").get<std::string>();
	scenario.equation_summary = value.at("equationSummary").get<std::string>();
	scenario.duration_seconds = value.at("durationSeconds").get<double>();
	scenario.view_bounds = parse_view_bounds(value.at("viewBounds"));
	scenario.mass = value.at("mass").get<double>();
	scenario.initial_position = parse_vector2(value.at("initialPosition"), "initialPosition");
	scenario.initial_velocity = parse_vector2(value.at("initialVelocity"), "initialVelocity");
	scenario.net_force = parse_optional_vector2(value, "netForce");
	scenario.gravity = parse_optional_vector2(value, "gravity");
	scenario.drag_coefficient = parse_optional_number(value, "dragCoefficient");
	scenario.spring_anchor = parse_optional_vector2(value, "springAnchor");
	scenario.spring_constant = parse_optional_number(value, "springConstant");
	scenario.damping_coefficient = parse_optional_number(value, "dampingCoefficient");
	scenario.orbital_center = parse_optional_vector2(value, "orbitalCenter");
	scenario.gravitational_parameter = parse_optional_number(value, "gravitationalParameter");
	scenario.restitution_coefficient = parse_optional_number(value, "restitutionCoefficient");
	return scenario;
}

OverlayOptions parse_overlay_options(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid overlays object");
	}
	require_boolean_field(value, "showMomentumVector");
	require_boolean_field(value, "showVelocityVector");
	require_boolean_field(value, "showForceVector");
	require_boolean_field(value, "showScenarioGuides");
	return {
		value.at("showMomentumVector").get<bool>(),
		value.at("showVelocityVector").get<bool>(),
		value.at("showForceVector").get<bool>(),
		value.at("showScenarioGuides").get<bool>(),
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
		{"durationSeconds", scenario.duration_seconds},
		{"viewBounds",
			{
				{"minX", scenario.view_bounds.min_x},
				{"maxX", scenario.view_bounds.max_x},
				{"minY", scenario.view_bounds.min_y},
				{"maxY", scenario.view_bounds.max_y},
			}},
		{"mass", scenario.mass},
		{"initialPosition", {{"x", scenario.initial_position.x}, {"y", scenario.initial_position.y}}},
		{"initialVelocity", {{"x", scenario.initial_velocity.x}, {"y", scenario.initial_velocity.y}}},
	};
	if (scenario.net_force.has_value()) {
		scenario_json["netForce"] = {{"x", scenario.net_force->x}, {"y", scenario.net_force->y}};
	}
	if (scenario.gravity.has_value()) {
		scenario_json["gravity"] = {{"x", scenario.gravity->x}, {"y", scenario.gravity->y}};
	}
	if (scenario.drag_coefficient.has_value()) {
		scenario_json["dragCoefficient"] = *scenario.drag_coefficient;
	}
	if (scenario.spring_anchor.has_value()) {
		scenario_json["springAnchor"] = {{"x", scenario.spring_anchor->x}, {"y", scenario.spring_anchor->y}};
	}
	if (scenario.spring_constant.has_value()) {
		scenario_json["springConstant"] = *scenario.spring_constant;
	}
	if (scenario.damping_coefficient.has_value()) {
		scenario_json["dampingCoefficient"] = *scenario.damping_coefficient;
	}
	if (scenario.orbital_center.has_value()) {
		scenario_json["orbitalCenter"] = {{"x", scenario.orbital_center->x}, {"y", scenario.orbital_center->y}};
	}
	if (scenario.gravitational_parameter.has_value()) {
		scenario_json["gravitationalParameter"] = *scenario.gravitational_parameter;
	}
	if (scenario.restitution_coefficient.has_value()) {
		scenario_json["restitutionCoefficient"] = *scenario.restitution_coefficient;
	}

	Json snapshot_json{
		{"timeSeconds", snapshot.time_seconds},
		{"position", {{"x", snapshot.position.x}, {"y", snapshot.position.y}}},
		{"velocity", {{"x", snapshot.velocity.x}, {"y", snapshot.velocity.y}}},
		{"acceleration", {{"x", snapshot.acceleration.x}, {"y", snapshot.acceleration.y}}},
		{"netForce", {{"x", snapshot.net_force.x}, {"y", snapshot.net_force.y}}},
		{"momentum", {{"x", snapshot.momentum.x}, {"y", snapshot.momentum.y}}},
		{"speed", snapshot.speed},
		{"kineticEnergy", snapshot.kinetic_energy},
		{"potentialEnergy", snapshot.potential_energy},
		{"totalEnergy", snapshot.total_energy},
	};

	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		samples_json.push_back({
			{"timeSeconds", sample.time_seconds},
			{"xPosition", sample.x_position},
			{"yPosition", sample.y_position},
			{"speed", sample.speed},
			{"totalEnergy", sample.total_energy},
		});
	}

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{
				{"showMomentumVector", overlays.show_momentum_vector},
				{"showVelocityVector", overlays.show_velocity_vector},
				{"showForceVector", overlays.show_force_vector},
				{"showScenarioGuides", overlays.show_scenario_guides},
			}},
		{"samples", samples_json},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::dynamics