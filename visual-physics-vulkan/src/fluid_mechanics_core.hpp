#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::fluid_mechanics {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	BuoyancyBlock,
	PoiseuillePipe,
	OpenChannelFlow,
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
	double gravity;
	double fluid_density;
	double block_density;
	double block_width;
	double block_height;
	double block_depth;
	std::optional<double> pipe_radius;
	std::optional<double> pipe_length;
	std::optional<double> pressure_drop;
	std::optional<double> dynamic_viscosity;
	std::optional<double> channel_width;
	std::optional<double> channel_depth;
	std::optional<double> channel_slope;
	std::optional<double> roughness_coefficient;
	std::optional<double> channel_length;
};

struct Snapshot {
	double time_seconds;
	double equilibrium_depth;
	double immersion_ratio;
	double displaced_volume;
	double buoyant_force;
	double weight_force;
	double net_force;
	std::optional<double> volumetric_flow_rate;
	std::optional<double> average_velocity;
	std::optional<double> centerline_velocity;
	std::optional<double> reynolds_number;
	std::optional<double> pressure_gradient;
	std::optional<double> discharge;
	std::optional<double> hydraulic_radius;
	std::optional<double> froude_number;
	bool stable;
};

struct Sample {
	double time_seconds;
	double submersion_depth;
	double displaced_volume;
	double buoyant_force;
	double weight_force;
	double net_force;
	double immersion_ratio;
	std::optional<double> axial_position;
	std::optional<double> pressure;
	std::optional<double> average_velocity;
	std::optional<double> reynolds_number;
	std::optional<double> bed_elevation;
	std::optional<double> water_surface_elevation;
	std::optional<double> discharge;
	std::optional<double> froude_number;
	bool stable;
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
std::vector<NormalizedVertex> build_scenario_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario);
std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio);

}  // namespace visual_physics::fluid_mechanics