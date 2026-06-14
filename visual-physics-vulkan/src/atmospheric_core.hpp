#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::atmospheric {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	BarometricFormula,
	AdiabaticLapseRate,
	ConvectionColumn,
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
	std::optional<double> sea_level_pressure_kilopascals;
	std::optional<double> scale_height_kilometers;
	std::optional<double> surface_temperature_kelvin;
	std::optional<double> lapse_rate_kelvin_per_kilometer;
	std::optional<double> tropopause_height_kilometers;
	std::optional<double> environmental_lapse_rate_kelvin_per_kilometer;
	std::optional<double> parcel_temperature_excess_kelvin;
	std::optional<double> column_height_kilometers;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> altitude_kilometers;
	std::optional<double> pressure_kilopascals;
	std::optional<double> relative_density;
	std::optional<double> temperature_kelvin;
	std::optional<double> reference_temperature_kelvin;
	std::optional<double> tropopause_height_kilometers;
	std::optional<double> parcel_altitude_kilometers;
	std::optional<double> buoyancy_acceleration_meters_per_second_squared;
	std::optional<double> updraft_velocity_meters_per_second;
	std::optional<double> convective_available_potential_energy_kilojoules_per_kilogram;
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

}  // namespace visual_physics::atmospheric