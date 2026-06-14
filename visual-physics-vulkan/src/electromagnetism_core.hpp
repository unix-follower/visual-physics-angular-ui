#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::electromagnetism {

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
	PointChargeElectrostatics,
	MovingChargeMagneticField,
	CurrentLoopMagneticField,
	CapacitorPotentialField,
	ElectromagneticInduction,
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
	std::optional<Vector2> initial_velocity;
	std::optional<Vector2> source_point;
	std::optional<Vector2> secondary_source_point;
	std::optional<Vector2> probe_point;
	std::optional<double> charge_magnitude;
	std::optional<double> secondary_charge_magnitude;
	std::optional<double> mass;
	std::optional<double> magnetic_field_strength;
	std::optional<double> current;
	std::optional<double> loop_radius;
	std::optional<double> plate_separation;
	std::optional<double> potential_difference;
	std::optional<double> flux_rate;
	std::optional<double> inductance;
};

struct Snapshot {
	double time_seconds;
	Vector2 position;
	Vector2 electric_field;
	Vector2 magnetic_field;
	Vector2 force;
	double potential;
	double field_magnitude;
	double force_magnitude;
	double energy;
	bool stable;
};

struct Sample {
	double time_seconds;
	double x_position;
	double y_position;
	double field_magnitude;
	double force_magnitude;
	double potential;
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

}  // namespace visual_physics::electromagnetism