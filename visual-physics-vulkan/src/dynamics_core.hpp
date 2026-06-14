#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::dynamics {

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
	ConstantForce,
	DragProjectile,
	SpringOscillator,
	OrbitalMotion,
	ElasticCollision,
};

struct Scenario {
	ScenarioId id;
	std::string name;
	std::string summary;
	std::string equation_summary;
	double duration_seconds;
	ViewBounds view_bounds;
	double mass;
	Vector2 initial_position;
	Vector2 initial_velocity;
	std::optional<Vector2> net_force;
	std::optional<Vector2> gravity;
	std::optional<double> drag_coefficient;
	std::optional<Vector2> spring_anchor;
	std::optional<double> spring_constant;
	std::optional<double> damping_coefficient;
	std::optional<Vector2> orbital_center;
	std::optional<double> gravitational_parameter;
	std::optional<double> restitution_coefficient;
};

struct Snapshot {
	double time_seconds;
	Vector2 position;
	Vector2 velocity;
	Vector2 acceleration;
	Vector2 net_force;
	Vector2 momentum;
	double speed;
	double kinetic_energy;
	double potential_energy;
	double total_energy;
};

struct Sample {
	double time_seconds;
	double x_position;
	double y_position;
	double speed;
	double total_energy;
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

}  // namespace visual_physics::dynamics