#include "dynamics_core.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace visual_physics::dynamics {
namespace {

const std::array<Scenario, 5> kDefaultScenarios{{
	{
		ScenarioId::ConstantForce,
		"Constant Force Motion",
		"A body moves under a fixed net force with acceleration determined by F = ma.",
		"m x\" = F_net",
		10.0,
		{-2.0, 44.0, -4.0, 16.0},
		2.0,
		{0.0, 0.0},
		{1.2, 0.4},
		Vector2{4.0, 1.0},
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::DragProjectile,
		"Projectile With Drag",
		"A launched body experiences gravity and linear air resistance.",
		"m x\" = m g - c v",
		4.0,
		{-2.0, 24.0, -4.0, 14.0},
		1.0,
		{0.0, 0.0},
		{8.5, 11.0},
		std::nullopt,
		Vector2{0.0, -9.81},
		0.45,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::SpringOscillator,
		"Spring Oscillator",
		"A mass oscillates about an anchor under Hooke's law with optional damping.",
		"m x\" = -k(x - x_eq) - c v",
		12.0,
		{-8.0, 8.0, -6.0, 6.0},
		1.5,
		{4.0, 0.0},
		{0.0, 1.2},
		std::nullopt,
		std::nullopt,
		std::nullopt,
		Vector2{0.0, 0.0},
		3.6,
		0.0,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::OrbitalMotion,
		"Orbital Motion",
		"A body follows a gravity-driven orbit around a central mass.",
		"m x\" = -mu m r / |r|^3",
		16.0,
		{-8.0, 8.0, -8.0, 8.0},
		1.0,
		{5.0, 0.0},
		{0.0, 2.0},
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		Vector2{0.0, 0.0},
		20.0,
	},
	{
		ScenarioId::ElasticCollision,
		"Elastic Boundary Collision",
		"A body travels freely and reflects off the viewport boundaries with configurable restitution.",
		"x\" = 0, v_after = -e v_before at boundary contact",
		10.0,
		{-6.0, 6.0, -4.0, 4.0},
		1.2,
		{-4.5, -1.8},
		{4.8, 2.6},
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		1.0,
	},
}};

constexpr double kDefaultTimeStepSeconds = 1.0 / 120.0;

struct Derivative {
	Vector2 position_derivative;
	Vector2 velocity_derivative;
};

double clamp(double value, double min, double max) {
	return std::min(std::max(value, min), max);
}

Vector2 add(const Vector2& left, const Vector2& right) {
	return {left.x + right.x, left.y + right.y};
}

Vector2 subtract(const Vector2& left, const Vector2& right) {
	return {left.x - right.x, left.y - right.y};
}

Vector2 scale(const Vector2& value, double factor) {
	return {value.x * factor, value.y * factor};
}

Vector2 add_many(
	const Vector2& first,
	const Vector2& second,
	const Vector2& third,
	const Vector2& fourth) {
	return {
		first.x + second.x + third.x + fourth.x,
		first.y + second.y + third.y + fourth.y,
	};
}

double squared_magnitude(const Vector2& value) {
	return value.x * value.x + value.y * value.y;
}

double magnitude(const Vector2& value) {
	return std::hypot(value.x, value.y);
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

Vector2 compute_net_force(
	const Scenario& scenario,
	const Vector2& position,
	const Vector2& velocity) {
	if (scenario.id == ScenarioId::ConstantForce) {
		return scenario.net_force.value_or(Vector2{0.0, 0.0});
	}

	if (scenario.id == ScenarioId::DragProjectile) {
		const Vector2 gravity = scenario.gravity.value_or(Vector2{0.0, -9.81});
		const double drag_coefficient = scenario.drag_coefficient.value_or(0.0);
		return {
			scenario.mass * gravity.x - drag_coefficient * velocity.x,
			scenario.mass * gravity.y - drag_coefficient * velocity.y,
		};
	}

	if (scenario.id == ScenarioId::OrbitalMotion) {
		const Vector2 center = scenario.orbital_center.value_or(Vector2{0.0, 0.0});
		const Vector2 offset = subtract(position, center);
		const double distance_squared = std::max(squared_magnitude(offset), 0.25);
		const double distance = std::sqrt(distance_squared);
		const double scale_factor =
			-((scenario.gravitational_parameter.value_or(0.0)) * scenario.mass) /
			(distance_squared * distance);
		return scale(offset, scale_factor);
	}

	if (scenario.id == ScenarioId::ElasticCollision) {
		return {0.0, 0.0};
	}

	const Vector2 spring_anchor = scenario.spring_anchor.value_or(Vector2{0.0, 0.0});
	const double spring_constant = scenario.spring_constant.value_or(0.0);
	const double damping_coefficient = scenario.damping_coefficient.value_or(0.0);
	const Vector2 displacement = subtract(position, spring_anchor);

	return {
		-spring_constant * displacement.x - damping_coefficient * velocity.x,
		-spring_constant * displacement.y - damping_coefficient * velocity.y,
	};
}

double compute_potential_energy(const Scenario& scenario, const Vector2& position) {
	if (scenario.id == ScenarioId::ConstantForce) {
		const Vector2 force = scenario.net_force.value_or(Vector2{0.0, 0.0});
		const Vector2 displacement = subtract(position, scenario.initial_position);
		return -(force.x * displacement.x + force.y * displacement.y);
	}

	if (scenario.id == ScenarioId::DragProjectile) {
		const Vector2 gravity = scenario.gravity.value_or(Vector2{0.0, -9.81});
		return -scenario.mass * (gravity.x * position.x + gravity.y * position.y);
	}

	if (scenario.id == ScenarioId::OrbitalMotion) {
		const Vector2 center = scenario.orbital_center.value_or(Vector2{0.0, 0.0});
		const double distance = std::max(magnitude(subtract(position, center)), 0.5);
		return -(scenario.gravitational_parameter.value_or(0.0)) * scenario.mass / distance;
	}

	if (scenario.id == ScenarioId::ElasticCollision) {
		return 0.0;
	}

	const Vector2 anchor = scenario.spring_anchor.value_or(Vector2{0.0, 0.0});
	const double spring_constant = scenario.spring_constant.value_or(0.0);
	const Vector2 extension = subtract(position, anchor);
	return 0.5 * spring_constant * squared_magnitude(extension);
}

Derivative evaluate_derivative(
	const Scenario& scenario,
	const Vector2& position,
	const Vector2& velocity) {
	const Vector2 net_force = compute_net_force(scenario, position, velocity);
	return {
		velocity,
		scale(net_force, 1.0 / std::max(scenario.mass, 0.1)),
	};
}

struct IntegratedState {
	Vector2 position;
	Vector2 velocity;
};

IntegratedState integrate_step(
	const Scenario& scenario,
	const Vector2& position,
	const Vector2& velocity,
	double delta_seconds) {
	const Derivative k1 = evaluate_derivative(scenario, position, velocity);
	const Derivative k2 = evaluate_derivative(
		scenario,
		add(position, scale(k1.position_derivative, delta_seconds * 0.5)),
		add(velocity, scale(k1.velocity_derivative, delta_seconds * 0.5)));
	const Derivative k3 = evaluate_derivative(
		scenario,
		add(position, scale(k2.position_derivative, delta_seconds * 0.5)),
		add(velocity, scale(k2.velocity_derivative, delta_seconds * 0.5)));
	const Derivative k4 = evaluate_derivative(
		scenario,
		add(position, scale(k3.position_derivative, delta_seconds)),
		add(velocity, scale(k3.velocity_derivative, delta_seconds)));

	return {
		add(
			position,
			scale(
				add_many(
					k1.position_derivative,
					scale(k2.position_derivative, 2.0),
					scale(k3.position_derivative, 2.0),
					k4.position_derivative),
				delta_seconds / 6.0)),
		add(
			velocity,
			scale(
				add_many(
					k1.velocity_derivative,
					scale(k2.velocity_derivative, 2.0),
					scale(k3.velocity_derivative, 2.0),
					k4.velocity_derivative),
				delta_seconds / 6.0)),
	};
}

IntegratedState resolve_collision(
	const Scenario& scenario,
	const Vector2& position,
	const Vector2& velocity) {
	if (scenario.id != ScenarioId::ElasticCollision) {
		return {position, velocity};
	}

	const double restitution = clamp(scenario.restitution_coefficient.value_or(1.0), 0.0, 1.0);
	Vector2 next_position = position;
	Vector2 next_velocity = velocity;
	const ViewBounds& bounds = scenario.view_bounds;

	if (next_position.x < bounds.min_x) {
		next_position.x = bounds.min_x + (bounds.min_x - next_position.x);
		next_velocity.x = std::abs(next_velocity.x) * restitution;
	} else if (next_position.x > bounds.max_x) {
		next_position.x = bounds.max_x - (next_position.x - bounds.max_x);
		next_velocity.x = -std::abs(next_velocity.x) * restitution;
	}

	if (next_position.y < bounds.min_y) {
		next_position.y = bounds.min_y + (bounds.min_y - next_position.y);
		next_velocity.y = std::abs(next_velocity.y) * restitution;
	} else if (next_position.y > bounds.max_y) {
		next_position.y = bounds.max_y - (next_position.y - bounds.max_y);
		next_velocity.y = -std::abs(next_velocity.y) * restitution;
	}

	return {next_position, next_velocity};
}

IntegratedState integrate_scenario(const Scenario& scenario, double time_seconds) {
	if (time_seconds <= 0.0) {
		return {scenario.initial_position, scenario.initial_velocity};
	}

	Vector2 position = scenario.initial_position;
	Vector2 velocity = scenario.initial_velocity;
	double elapsed = 0.0;

	while (elapsed < time_seconds) {
		const double dt = std::min(kDefaultTimeStepSeconds, time_seconds - elapsed);
		const IntegratedState next = integrate_step(scenario, position, velocity, dt);
		const IntegratedState resolved = resolve_collision(scenario, next.position, next.velocity);
		position = resolved.position;
		velocity = resolved.velocity;
		elapsed += dt;
	}

	return {position, velocity};
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
		case ScenarioId::ConstantForce:
			return "constant-force";
		case ScenarioId::DragProjectile:
			return "drag-projectile";
		case ScenarioId::SpringOscillator:
			return "spring-oscillator";
		case ScenarioId::OrbitalMotion:
			return "orbital-motion";
		case ScenarioId::ElasticCollision:
			return "elastic-collision";
	}

	throw std::invalid_argument("Unsupported dynamics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "constant-force") {
		return ScenarioId::ConstantForce;
	}
	if (value == "drag-projectile") {
		return ScenarioId::DragProjectile;
	}
	if (value == "spring-oscillator") {
		return ScenarioId::SpringOscillator;
	}
	if (value == "orbital-motion") {
		return ScenarioId::OrbitalMotion;
	}
	if (value == "elastic-collision") {
		return ScenarioId::ElasticCollision;
	}

	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	const auto match = std::find_if(
		kDefaultScenarios.begin(),
		kDefaultScenarios.end(),
		[id](const Scenario& scenario) { return scenario.id == id; });

	if (match == kDefaultScenarios.end()) {
		throw std::invalid_argument("Unknown dynamics scenario id");
	}

	return *match;
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	const double clamped_time = clamp(time_seconds, 0.0, scenario.duration_seconds);
	const IntegratedState state = integrate_scenario(scenario, clamped_time);
	const Vector2 net_force = compute_net_force(scenario, state.position, state.velocity);
	const Vector2 acceleration = scale(net_force, 1.0 / std::max(scenario.mass, 0.1));
	const double kinetic_energy = 0.5 * scenario.mass * squared_magnitude(state.velocity);
	const double potential_energy = compute_potential_energy(scenario, state.position);

	return {
		clamped_time,
		state.position,
		state.velocity,
		acceleration,
		net_force,
		scale(state.velocity, scenario.mass),
		magnitude(state.velocity),
		kinetic_energy,
		potential_energy,
		kinetic_energy + potential_energy,
	};
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	std::vector<Sample> samples;
	samples.reserve(sample_count);

	for (std::size_t index = 0; index < sample_count; ++index) {
		const double normalized = sample_count <= 1
			? 0.0
			: static_cast<double>(index) / static_cast<double>(sample_count - 1);
		const Snapshot snapshot = sample_scenario(
			scenario,
			scenario.duration_seconds * normalized);
		samples.push_back({
			snapshot.time_seconds,
			snapshot.position.x,
			snapshot.position.y,
			snapshot.speed,
			snapshot.total_energy,
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

}  // namespace visual_physics::dynamics