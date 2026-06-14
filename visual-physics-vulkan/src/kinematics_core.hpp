#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::kinematics {

struct Vector2 {
	double x;
	double y;
};

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	ConstantVelocity,
	ConstantAcceleration,
	Projectile,
	RelativeMotion,
	UniformCircularMotion,
};

struct Scenario {
	ScenarioId id;
	std::string_view name;
	std::string_view summary;
	std::string_view equation_summary;
	double duration_seconds;
	ViewBounds view_bounds;
	Vector2 initial_position;
	Vector2 initial_velocity;
	Vector2 acceleration;
	std::optional<Vector2> observer_velocity;
	std::optional<double> radius;
	std::optional<double> angular_speed;
	std::optional<Vector2> center;
};

struct Snapshot {
	double time_seconds;
	Vector2 position;
	Vector2 velocity;
	Vector2 acceleration;
	double speed;
	double acceleration_magnitude;
	std::optional<Vector2> relative_position;
	std::optional<Vector2> relative_velocity;
};

struct Sample {
	double time_seconds;
	double x_position;
	double y_position;
	double speed;
	double acceleration_magnitude;
};

struct NormalizedVertex {
	float x;
	float y;
};

std::string_view to_string(ScenarioId id);
std::optional<ScenarioId> parse_scenario_id(std::string_view value);
Scenario make_default_scenario(ScenarioId id);
Snapshot sample_scenario(const Scenario& scenario, double time_seconds);
std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count = 48);
std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario);
std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio);
std::vector<NormalizedVertex> build_trajectory_vertices(
	const std::vector<Sample>& samples,
	const Scenario& scenario);

}  // namespace visual_physics::kinematics