#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::nuclear_and_particle_physics {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	RadioactiveDecay,
	BindingEnergyCurve,
	ProtonProtonCollision,
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
	std::optional<double> half_life_hours;
	std::optional<double> initial_population_trillions;
	std::optional<double> mass_number;
	std::optional<double> proton_count;
	std::optional<double> binding_energy_per_nucleon_mev;
	std::optional<double> beam_energy_gev;
	std::optional<double> scattering_angle_degrees;
	std::optional<double> detector_radius_meters;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> elapsed_hours;
	std::optional<double> remaining_population_trillions;
	std::optional<double> remaining_fraction;
	std::optional<double> activity_terabecquerels;
	std::optional<double> total_binding_energy_mev;
	std::optional<double> stability_index;
	std::optional<double> invariant_mass_gev;
	std::optional<double> transverse_momentum_gev;
	std::optional<double> pseudorapidity;
	bool stable;
};

struct Sample {
	double position;
	double primary_value;
	std::optional<double> secondary_value;
	std::string label;
	bool active;
};

std::string_view to_string(ScenarioId id);
std::optional<ScenarioId> parse_scenario_id(std::string_view value);
Scenario make_default_scenario(ScenarioId id);
Snapshot sample_scenario(const Scenario& scenario, double time_seconds);
std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count = 24);
std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count = 24);

}  // namespace visual_physics::nuclear_and_particle_physics