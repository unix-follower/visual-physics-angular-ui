#include "kinematics_core.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace visual_physics::kinematics {
namespace {

constexpr std::array<Scenario, 5> kDefaultScenarios{{
	{
		ScenarioId::ConstantVelocity,
		"Constant Velocity",
		"Linear motion with fixed velocity and zero acceleration.",
		"x(t) = x0 + v t, a(t) = 0",
		10.0,
		{-2.0, 28.0, -4.0, 12.0},
		{0.0, 0.0},
		{2.4, 0.9},
		{0.0, 0.0},
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::ConstantAcceleration,
		"Constant Acceleration",
		"Planar motion with a uniform acceleration vector.",
		"x(t) = x0 + v0 t + 1/2 a t^2",
		8.0,
		{-2.0, 28.0, -4.0, 28.0},
		{0.0, 0.0},
		{1.5, 1.2},
		{0.45, 0.8},
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::Projectile,
		"Projectile Motion",
		"Launch motion with gravity acting along the vertical axis.",
		"x(t) = x0 + v0 t + 1/2 g t^2",
		2.8,
		{-2.0, 22.0, -2.0, 10.0},
		{0.0, 0.0},
		{7.2, 10.8},
		{0.0, -9.81},
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::RelativeMotion,
		"Relative Motion",
		"Object velocity observed from a moving frame.",
		"v_rel = v_object - v_observer",
		9.0,
		{-2.0, 32.0, -6.0, 12.0},
		{0.0, 0.0},
		{4.6, 1.4},
		{0.0, 0.0},
		Vector2{1.8, 0.4},
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::UniformCircularMotion,
		"Uniform Circular Motion",
		"Constant-speed rotation with centripetal acceleration.",
		"r(t) = c + R(cos wt, sin wt)",
		10.0,
		{-7.0, 7.0, -7.0, 7.0},
		{0.0, 0.0},
		{0.0, 0.0},
		{0.0, 0.0},
		std::nullopt,
		4.0,
		0.9,
		Vector2{0.0, 0.0},
	},
}};

double magnitude(const Vector2& value) {
	return std::hypot(value.x, value.y);
}

Vector2 subtract(const Vector2& left, const Vector2& right) {
	return {
		left.x - right.x,
		left.y - right.y,
	};
}

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

Snapshot sample_linear_motion(const Scenario& scenario, double time_seconds) {
	const Vector2 position{
		scenario.initial_position.x + scenario.initial_velocity.x * time_seconds +
			0.5 * scenario.acceleration.x * time_seconds * time_seconds,
		scenario.initial_position.y + scenario.initial_velocity.y * time_seconds +
			0.5 * scenario.acceleration.y * time_seconds * time_seconds,
	};

	const Vector2 velocity{
		scenario.initial_velocity.x + scenario.acceleration.x * time_seconds,
		scenario.initial_velocity.y + scenario.acceleration.y * time_seconds,
	};

	return {
		time_seconds,
		position,
		velocity,
		scenario.acceleration,
		magnitude(velocity),
		magnitude(scenario.acceleration),
		std::nullopt,
		std::nullopt,
	};
}

Snapshot sample_relative_motion(const Scenario& scenario, double time_seconds) {
	const Snapshot absolute_state = sample_linear_motion(scenario, time_seconds);
	const Vector2 observer_velocity = scenario.observer_velocity.value_or(Vector2{0.0, 0.0});
	const Vector2 relative_velocity = subtract(absolute_state.velocity, observer_velocity);
	const Vector2 relative_position{
		absolute_state.position.x - observer_velocity.x * time_seconds,
		absolute_state.position.y - observer_velocity.y * time_seconds,
	};

	return {
		absolute_state.time_seconds,
		absolute_state.position,
		absolute_state.velocity,
		absolute_state.acceleration,
		absolute_state.speed,
		absolute_state.acceleration_magnitude,
		relative_position,
		relative_velocity,
	};
}

Snapshot sample_uniform_circular_motion(const Scenario& scenario, double time_seconds) {
	const double radius = scenario.radius.value_or(1.0);
	const double angular_speed = scenario.angular_speed.value_or(1.0);
	const Vector2 center = scenario.center.value_or(Vector2{0.0, 0.0});
	const double angle = angular_speed * time_seconds;
	const double cos_angle = std::cos(angle);
	const double sin_angle = std::sin(angle);

	const Vector2 position{
		center.x + radius * cos_angle,
		center.y + radius * sin_angle,
	};
	const Vector2 velocity{
		-radius * angular_speed * sin_angle,
		radius * angular_speed * cos_angle,
	};
	const Vector2 acceleration{
		-radius * angular_speed * angular_speed * cos_angle,
		-radius * angular_speed * angular_speed * sin_angle,
	};

	return {
		time_seconds,
		position,
		velocity,
		acceleration,
		magnitude(velocity),
		magnitude(acceleration),
		std::nullopt,
		std::nullopt,
	};
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
		case ScenarioId::ConstantVelocity:
			return "constant-velocity";
		case ScenarioId::ConstantAcceleration:
			return "constant-acceleration";
		case ScenarioId::Projectile:
			return "projectile";
		case ScenarioId::RelativeMotion:
			return "relative-motion";
		case ScenarioId::UniformCircularMotion:
			return "uniform-circular-motion";
	}

	throw std::invalid_argument("Unsupported scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "constant-velocity") {
		return ScenarioId::ConstantVelocity;
	}
	if (value == "constant-acceleration") {
		return ScenarioId::ConstantAcceleration;
	}
	if (value == "projectile") {
		return ScenarioId::Projectile;
	}
	if (value == "relative-motion") {
		return ScenarioId::RelativeMotion;
	}
	if (value == "uniform-circular-motion") {
		return ScenarioId::UniformCircularMotion;
	}

	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	const auto match = std::find_if(
		kDefaultScenarios.begin(),
		kDefaultScenarios.end(),
		[id](const Scenario& scenario) { return scenario.id == id; });

	if (match == kDefaultScenarios.end()) {
		throw std::invalid_argument("Unknown scenario id");
	}

	return *match;
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	const double clamped_time = clamp(time_seconds, 0.0, scenario.duration_seconds);

	switch (scenario.id) {
		case ScenarioId::UniformCircularMotion:
			return sample_uniform_circular_motion(scenario, clamped_time);
		case ScenarioId::RelativeMotion:
			return sample_relative_motion(scenario, clamped_time);
		case ScenarioId::ConstantVelocity:
		case ScenarioId::ConstantAcceleration:
		case ScenarioId::Projectile:
			return sample_linear_motion(scenario, clamped_time);
	}

	throw std::invalid_argument("Unsupported scenario id");
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	std::vector<Sample> samples;
	samples.reserve(sample_count);

	for (std::size_t index = 0; index < sample_count; ++index) {
		const double normalized = sample_count <= 1
			? 0.0
			: static_cast<double>(index) / static_cast<double>(sample_count - 1);
		const double time_seconds = scenario.duration_seconds * normalized;
		const Snapshot snapshot = sample_scenario(scenario, time_seconds);
		samples.push_back({
			time_seconds,
			snapshot.position.x,
			snapshot.position.y,
			snapshot.speed,
			snapshot.acceleration_magnitude,
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

std::vector<NormalizedVertex> build_trajectory_vertices(
	const std::vector<Sample>& samples,
	const Scenario& scenario) {
	if (samples.size() < 2) {
		return {};
	}

	std::vector<NormalizedVertex> vertices;
	vertices.reserve((samples.size() - 1) * 2);

	for (std::size_t index = 0; index + 1 < samples.size(); ++index) {
		const auto& current = samples[index];
		const auto& next = samples[index + 1];
		vertices.push_back(to_ndc_point(current.x_position, current.y_position, scenario));
		vertices.push_back(to_ndc_point(next.x_position, next.y_position, scenario));
	}

	return vertices;
}

}  // namespace visual_physics::kinematics