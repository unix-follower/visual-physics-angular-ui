#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::statics {

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
	BeamSupport,
	InclinedPlane,
	PulleyEquilibrium,
};

struct Scenario {
	ScenarioId id;
	std::string name;
	std::string summary;
	std::string equation_summary;
	std::string status;
	double duration_seconds;
	ViewBounds view_bounds;
	std::string focus_area;
	Vector2 initial_position;
	Vector2 applied_force;
	std::optional<Vector2> anchor_point;
	std::optional<Vector2> secondary_point;
	std::optional<double> mass;
	std::optional<double> secondary_mass;
	std::optional<double> angle_degrees;
	std::optional<double> friction_coefficient;
	std::optional<double> load_position;
	std::optional<double> load_magnitude;
};

struct Snapshot {
	double time_seconds;
	Vector2 position;
	Vector2 applied_force;
	Vector2 primary_reaction_force;
	std::optional<Vector2> secondary_reaction_force;
	Vector2 residual_force;
	double residual_torque;
	bool stable;
};

struct Sample {
	double time_seconds;
	double residual_force_magnitude;
	double residual_torque;
	bool stable;
};

struct NormalizedVertex {
	float x;
	float y;
};

std::string_view to_string(ScenarioId id);
std::optional<ScenarioId> parse_scenario_id(std::string_view value);
Scenario make_default_scenario(ScenarioId id);
Snapshot sample_scenario(const Scenario& scenario, double time_seconds = 0.0);
std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count = 48);
std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario);
std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio);
std::vector<NormalizedVertex> build_scenario_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario);

}  // namespace visual_physics::statics