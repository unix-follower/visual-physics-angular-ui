#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::solid_state {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	CrystalElasticity,
	PhononDispersion,
	ElectronicStructure,
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
	std::optional<double> max_strain_percent;
	std::optional<double> youngs_modulus_gigapascals;
	std::optional<double> yield_strength_megapascals;
	std::optional<double> lattice_spacing_nanometers;
	std::optional<double> spring_constant_newtons_per_meter;
	std::optional<double> atomic_mass_amu;
	std::optional<double> band_gap_electron_volts;
	std::optional<double> effective_mass_ratio;
	std::optional<double> dopant_density_per_cubic_centimeter;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> strain_percent;
	std::optional<double> stress_megapascals;
	std::optional<double> elastic_energy_density_megajoules_per_cubic_meter;
	std::optional<double> wave_vector_fraction;
	std::optional<double> acoustic_frequency_terahertz;
	std::optional<double> optical_frequency_terahertz;
	std::optional<double> group_velocity_kilometers_per_second;
	std::optional<double> energy_electron_volts;
	std::optional<double> density_of_states_arbitrary_units;
	std::optional<double> occupation_probability;
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
	std::size_t sample_count = 32);
std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count = 32);

}  // namespace visual_physics::solid_state