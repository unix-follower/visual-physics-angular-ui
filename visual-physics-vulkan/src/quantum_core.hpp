#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::quantum {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	ParticleInBox,
	FinitePotentialWellTunneling,
	DoubleSlitInterference,
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
	std::optional<double> box_length_nanometers;
	std::optional<double> quantum_number;
	std::optional<double> particle_energy_ev;
	std::optional<double> barrier_height_ev;
	std::optional<double> barrier_width_nanometers;
	std::optional<double> wavelength_nanometers;
	std::optional<double> slit_separation_micrometers;
	std::optional<double> slit_width_micrometers;
	std::optional<double> screen_distance_meters;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> box_length_nanometers;
	std::optional<double> quantum_number;
	std::optional<double> energy_level_ev;
	std::optional<double> de_broglie_wavelength_nanometers;
	std::optional<double> node_count;
	std::optional<double> first_antinode_nanometers;
	std::optional<double> particle_energy_ev;
	std::optional<double> barrier_height_ev;
	std::optional<double> barrier_width_nanometers;
	std::optional<double> transmission_probability;
	std::optional<double> reflection_probability;
	std::optional<double> decay_length_nanometers;
	std::optional<double> wavelength_nanometers;
	std::optional<double> slit_separation_micrometers;
	std::optional<double> slit_width_micrometers;
	std::optional<double> screen_distance_meters;
	std::optional<double> fringe_spacing_millimeters;
	std::optional<double> central_maximum_width_millimeters;
	std::optional<double> coherence_estimate;
	bool stable;
};

struct Sample {
	double position;
	double primary_value;
	std::optional<double> secondary_value;
	std::string label;
	bool active;
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
	const Scenario& scenario,
	std::size_t sample_count = 48);
std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio);

}  // namespace visual_physics::quantum