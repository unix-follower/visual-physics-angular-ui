#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::relativity {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	TimeDilation,
	RelativisticDoppler,
	GravitationalTimeDilation,
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
	std::optional<double> relative_velocity_fraction_of_light;
	std::optional<double> proper_time_seconds;
	std::optional<double> emitted_frequency_hertz;
	std::optional<double> source_velocity_fraction_of_light;
	std::optional<double> observer_velocity_fraction_of_light;
	std::optional<double> central_mass_solar_masses;
	std::optional<double> orbital_radius_schwarzschild_radii;
	std::optional<double> coordinate_time_seconds;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> relative_velocity_fraction_of_light;
	std::optional<double> proper_time_seconds;
	std::optional<double> lorentz_factor_gamma;
	std::optional<double> dilated_time_seconds;
	std::optional<double> time_difference_seconds;
	std::optional<double> emitted_frequency_hertz;
	std::optional<double> source_velocity_fraction_of_light;
	std::optional<double> observer_velocity_fraction_of_light;
	std::optional<double> observed_frequency_hertz;
	std::optional<double> classical_observed_frequency_hertz;
	std::optional<double> shift_ratio;
	std::optional<bool> redshift;
	std::optional<double> central_mass_solar_masses;
	std::optional<double> orbital_radius_schwarzschild_radii;
	std::optional<double> schwarzschild_radius_kilometers;
	std::optional<double> gravitational_time_factor;
	std::optional<double> local_elapsed_time_seconds;
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
	std::size_t sample_count = 48);
std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count = 48);

}  // namespace visual_physics::relativity
