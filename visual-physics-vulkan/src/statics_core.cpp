#include "statics_core.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace visual_physics::statics {
namespace {

constexpr double kGravity = 9.81;
constexpr double kPi = 3.14159265358979323846;

const std::array<Scenario, 3> kDefaultScenarios{{
	{
		ScenarioId::BeamSupport,
		"Beam Support Equilibrium",
		"Solve support reactions for a loaded beam using force and torque balance.",
		"Sigma F = 0, Sigma tau = 0",
		"Implemented",
		1.0,
		{-1.0, 11.0, -4.0, 4.0},
		"Reaction forces, support locations, moment balance",
		{5.0, 0.0},
		{0.0, -12.0},
		Vector2{1.0, 0.0},
		Vector2{9.0, 0.0},
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		5.0,
		12.0,
	},
	{
		ScenarioId::InclinedPlane,
		"Inclined Plane Equilibrium",
		"Resolve weight, normal force, and friction on a static incline.",
		"Sigma F_parallel = 0, Sigma F_normal = 0",
		"Implemented",
		1.0,
		{-2.0, 8.0, -2.0, 6.0},
		"Force decomposition, contact forces, friction threshold",
		{3.0, 2.0},
		{0.0, -9.8},
		Vector2{0.0, 0.0},
		std::nullopt,
		2.0,
		std::nullopt,
		30.0,
		0.7,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::PulleyEquilibrium,
		"Pulley Equilibrium",
		"Compare paired loads and tension constraints in a static pulley system.",
		"T_left = T_right, Sigma F = 0",
		"Implemented",
		1.0,
		{-4.0, 4.0, -8.0, 4.0},
		"Tension, suspended loads, constraint symmetry",
		{0.0, -2.0},
		{0.0, -8.0},
		Vector2{-2.0, -4.0},
		Vector2{2.0, -4.0},
		1.0,
		1.0,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
}};

double clamp(double value, double min, double max) {
	return std::min(std::max(value, min), max);
}

NormalizedVertex to_ndc_point(double x, double y, const Scenario& scenario) {
	const auto& bounds = scenario.view_bounds;
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;

	return {
		static_cast<float>(clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(clamp(normalized_y, -0.96, 0.96)),
	};
}

double magnitude(const Vector2& value) {
	return std::hypot(value.x, value.y);
}

bool nearly_equal(double left, double right, double tolerance = 1e-6) {
	return std::abs(left - right) <= tolerance;
}

Snapshot build_beam_support_snapshot(const Scenario& scenario, double time_seconds) {
	const double left_support_x = scenario.anchor_point.value_or(Vector2{1.0, 0.0}).x;
	const double right_support_x = scenario.secondary_point.value_or(Vector2{9.0, 0.0}).x;
	const double support_span = std::max(right_support_x - left_support_x, 0.5);
	const double load_magnitude = std::max(scenario.load_magnitude.value_or(0.0), 0.0);
	const double clamped_load_position = clamp(
		scenario.load_position.value_or(scenario.initial_position.x),
		left_support_x,
		right_support_x);
	const double distance_from_left = clamped_load_position - left_support_x;
	const double right_reaction = load_magnitude * (distance_from_left / support_span);
	const double left_reaction = load_magnitude - right_reaction;
	const double residual_force_y = left_reaction + right_reaction - load_magnitude;
	const double residual_torque = right_reaction * support_span - load_magnitude * distance_from_left;

	return {
		.time_seconds = time_seconds,
		.position = {clamped_load_position, 0.0},
		.applied_force = {0.0, -load_magnitude},
		.primary_reaction_force = {0.0, left_reaction},
		.secondary_reaction_force = Vector2{0.0, right_reaction},
		.residual_force = {0.0, residual_force_y},
		.residual_torque = residual_torque,
		.stable =
			left_reaction >= 0.0 &&
			right_reaction >= 0.0 &&
			nearly_equal(residual_force_y, 0.0) &&
			nearly_equal(residual_torque, 0.0),
	};
}

Snapshot build_inclined_plane_snapshot(const Scenario& scenario, double time_seconds) {
	const double mass = std::max(scenario.mass.value_or(0.0), 0.0);
	const double angle_radians = (scenario.angle_degrees.value_or(0.0) * kPi) / 180.0;
	const double friction_coefficient = std::max(scenario.friction_coefficient.value_or(0.0), 0.0);
	const double weight_magnitude = mass * kGravity;
	const Vector2 tangent{std::cos(angle_radians), std::sin(angle_radians)};
	const Vector2 normal{-std::sin(angle_radians), std::cos(angle_radians)};
	const double normal_magnitude = weight_magnitude * std::cos(angle_radians);
	const double required_friction_magnitude = weight_magnitude * std::sin(angle_radians);
	const double max_friction_magnitude = friction_coefficient * normal_magnitude;
	const double friction_magnitude = std::min(required_friction_magnitude, max_friction_magnitude);
	const Vector2 applied_force{0.0, -weight_magnitude};
	const Vector2 primary_reaction_force{
		normal.x * normal_magnitude,
		normal.y * normal_magnitude,
	};
	const Vector2 secondary_reaction_force{
		tangent.x * friction_magnitude,
		tangent.y * friction_magnitude,
	};
	const Vector2 residual_force{
		applied_force.x + primary_reaction_force.x + secondary_reaction_force.x,
		applied_force.y + primary_reaction_force.y + secondary_reaction_force.y,
	};
	const bool stable =
		required_friction_magnitude <= max_friction_magnitude + 1e-6 &&
		nearly_equal(residual_force.x, 0.0) &&
		nearly_equal(residual_force.y, 0.0);

	return {
		.time_seconds = time_seconds,
		.position = scenario.initial_position,
		.applied_force = applied_force,
		.primary_reaction_force = primary_reaction_force,
		.secondary_reaction_force = secondary_reaction_force,
		.residual_force = residual_force,
		.residual_torque = 0.0,
		.stable = stable,
	};
}

Snapshot build_pulley_snapshot(const Scenario& scenario, double time_seconds) {
	const double left_mass = std::max(scenario.mass.value_or(0.0), 0.0);
	const double right_mass = std::max(
		scenario.secondary_mass.value_or(
			scenario.load_magnitude.value_or(left_mass)),
		0.0);
	const double left_weight = left_mass * kGravity;
	const double right_weight = right_mass * kGravity;
	const double tension = std::min(left_weight, right_weight);
	const double total_applied = left_weight + right_weight;
	const double total_reaction = tension * 2.0;
	const double residual_force_y = total_reaction - total_applied;

	return {
		.time_seconds = time_seconds,
		.position = scenario.initial_position,
		.applied_force = {0.0, -total_applied},
		.primary_reaction_force = {0.0, tension},
		.secondary_reaction_force = Vector2{0.0, tension},
		.residual_force = {0.0, residual_force_y},
		.residual_torque = 0.0,
		.stable = nearly_equal(left_weight, right_weight) && nearly_equal(residual_force_y, 0.0),
	};
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::BeamSupport:
		return "beam-support";
	case ScenarioId::InclinedPlane:
		return "inclined-plane";
	case ScenarioId::PulleyEquilibrium:
		return "pulley-equilibrium";
	}

	throw std::runtime_error("Unknown statics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "beam-support") {
		return ScenarioId::BeamSupport;
	}
	if (value == "inclined-plane") {
		return ScenarioId::InclinedPlane;
	}
	if (value == "pulley-equilibrium") {
		return ScenarioId::PulleyEquilibrium;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	const auto match = std::find_if(
		kDefaultScenarios.begin(),
		kDefaultScenarios.end(),
		[id](const Scenario& scenario) { return scenario.id == id; });
	if (match == kDefaultScenarios.end()) {
		throw std::runtime_error("Unsupported statics scenario id");
	}
	return *match;
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	switch (scenario.id) {
	case ScenarioId::BeamSupport:
		return build_beam_support_snapshot(scenario, time_seconds);
	case ScenarioId::InclinedPlane:
		return build_inclined_plane_snapshot(scenario, time_seconds);
	case ScenarioId::PulleyEquilibrium:
		return build_pulley_snapshot(scenario, time_seconds);
	}

	throw std::runtime_error("Unsupported statics scenario id");
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	const std::size_t resolved_sample_count = std::max<std::size_t>(sample_count, 2);
	const Snapshot snapshot = sample_scenario(scenario, 0.0);
	std::vector<Sample> samples;
	samples.reserve(resolved_sample_count);
	for (std::size_t index = 0; index < resolved_sample_count; index += 1) {
		const double alpha = resolved_sample_count == 1
			? 0.0
			: static_cast<double>(index) / static_cast<double>(resolved_sample_count - 1);
		samples.push_back({
			.time_seconds = alpha * scenario.duration_seconds,
			.residual_force_magnitude = magnitude(snapshot.residual_force),
			.residual_torque = snapshot.residual_torque,
			.stable = snapshot.stable,
		});
	}
	return samples;
}

std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario) {
	return {
		to_ndc_point(scenario.view_bounds.min_x, 0.0, scenario),
		to_ndc_point(scenario.view_bounds.max_x, 0.0, scenario),
		to_ndc_point(0.0, scenario.view_bounds.min_y, scenario),
		to_ndc_point(0.0, scenario.view_bounds.max_y, scenario),
	};
}

std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio) {
	const auto center = to_ndc_point(snapshot.position.x, snapshot.position.y, scenario);
	const float half_width = 0.022F;
	const float safe_aspect = std::max(aspect_ratio, 0.001F);
	const float half_height = aspect_ratio >= 1.0F
		? half_width * aspect_ratio
		: half_width / safe_aspect;

	return {
		{center.x - half_width, center.y - half_height},
		{center.x + half_width, center.y - half_height},
		{center.x - half_width, center.y + half_height},
		{center.x - half_width, center.y + half_height},
		{center.x + half_width, center.y - half_height},
		{center.x + half_width, center.y + half_height},
	};
}

std::vector<NormalizedVertex> build_scenario_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario) {
	std::vector<NormalizedVertex> vertices;
	static_cast<void>(snapshot);
	auto append_line = [&](const Vector2& start, const Vector2& end) {
		vertices.push_back(to_ndc_point(start.x, start.y, scenario));
		vertices.push_back(to_ndc_point(end.x, end.y, scenario));
	};

	if (scenario.id == ScenarioId::BeamSupport) {
		const Vector2 left_support = scenario.anchor_point.value_or(Vector2{1.0, 0.0});
		const Vector2 right_support = scenario.secondary_point.value_or(Vector2{9.0, 0.0});
		append_line({left_support.x, 0.0}, {right_support.x, 0.0});
		append_line({left_support.x, -0.8}, left_support);
		append_line({right_support.x, -0.8}, right_support);
		return vertices;
	}

	if (scenario.id == ScenarioId::InclinedPlane) {
		const Vector2 plane_origin = scenario.anchor_point.value_or(Vector2{0.0, 0.0});
		const double angle_radians = (scenario.angle_degrees.value_or(30.0) * kPi) / 180.0;
		const Vector2 plane_end{
			plane_origin.x + 5.0 * std::cos(angle_radians),
			plane_origin.y + 5.0 * std::sin(angle_radians),
		};
		const Vector2 block_base_left{snapshot.position.x - 0.45, snapshot.position.y - 0.25};
		const Vector2 block_base_right{snapshot.position.x + 0.45, snapshot.position.y - 0.25};
		const Vector2 block_top_left{snapshot.position.x - 0.45, snapshot.position.y + 0.25};
		const Vector2 block_top_right{snapshot.position.x + 0.45, snapshot.position.y + 0.25};
		append_line(plane_origin, plane_end);
		append_line({plane_origin.x, plane_origin.y}, {plane_end.x, plane_origin.y});
		append_line(block_base_left, block_base_right);
		append_line(block_base_right, block_top_right);
		append_line(block_top_right, block_top_left);
		append_line(block_top_left, block_base_left);
		return vertices;
	}

	const Vector2 left_anchor = scenario.anchor_point.value_or(Vector2{-2.0, -4.0});
	const Vector2 right_anchor = scenario.secondary_point.value_or(Vector2{2.0, -4.0});
	const Vector2 pulley_top{0.0, 0.0};
	const Vector2 left_mass_bottom{left_anchor.x, left_anchor.y - 2.0};
	const Vector2 right_mass_bottom{right_anchor.x, right_anchor.y - 2.0};
	append_line(left_anchor, pulley_top);
	append_line(pulley_top, right_anchor);
	append_line(left_anchor, left_mass_bottom);
	append_line(right_anchor, right_mass_bottom);
	append_line({-0.7, 0.0}, {0.7, 0.0});
	append_line({0.7, 0.0}, {0.0, 0.7});
	append_line({0.0, 0.7}, {-0.7, 0.0});
	append_line({left_mass_bottom.x - 0.4, left_mass_bottom.y}, {left_mass_bottom.x + 0.4, left_mass_bottom.y});
	append_line({left_mass_bottom.x + 0.4, left_mass_bottom.y}, {left_mass_bottom.x + 0.4, left_mass_bottom.y - 0.7});
	append_line({left_mass_bottom.x + 0.4, left_mass_bottom.y - 0.7}, {left_mass_bottom.x - 0.4, left_mass_bottom.y - 0.7});
	append_line({left_mass_bottom.x - 0.4, left_mass_bottom.y - 0.7}, {left_mass_bottom.x - 0.4, left_mass_bottom.y});
	append_line({right_mass_bottom.x - 0.4, right_mass_bottom.y}, {right_mass_bottom.x + 0.4, right_mass_bottom.y});
	append_line({right_mass_bottom.x + 0.4, right_mass_bottom.y}, {right_mass_bottom.x + 0.4, right_mass_bottom.y - 0.7});
	append_line({right_mass_bottom.x + 0.4, right_mass_bottom.y - 0.7}, {right_mass_bottom.x - 0.4, right_mass_bottom.y - 0.7});
	append_line({right_mass_bottom.x - 0.4, right_mass_bottom.y - 0.7}, {right_mass_bottom.x - 0.4, right_mass_bottom.y});
	return vertices;
}

}  // namespace visual_physics::statics