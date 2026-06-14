#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::plasma_physics {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	PlasmaOscillation,
	DebyeScreening,
	MagneticConfinement,
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
	std::optional<double> electron_density_per_cubic_meter;
	std::optional<double> electron_temperature_electron_volts;
	std::optional<double> perturbation_amplitude_percent;
	std::optional<double> probe_potential_volts;
	std::optional<double> magnetic_field_tesla;
	std::optional<double> plasma_current_mega_amperes;
	std::optional<double> major_radius_meters;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> plasma_frequency_gigahertz;
	std::optional<double> oscillation_period_nanoseconds;
	std::optional<double> restoring_field_kilovolts_per_meter;
	std::optional<double> debye_length_millimeters;
	std::optional<double> shielding_fraction;
	std::optional<double> screened_potential_volts;
	std::optional<double> larmor_radius_millimeters;
	std::optional<double> beta_percent;
	std::optional<double> safety_factor;
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

}  // namespace visual_physics::plasma_physics