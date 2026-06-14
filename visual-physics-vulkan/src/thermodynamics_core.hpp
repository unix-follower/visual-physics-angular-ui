#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::thermodynamics {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	IdealGasState,
	HeatConductionSlab,
	CarnotCycle,
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
	double gas_constant;
	double molar_amount;
	double temperature_kelvin;
	double volume_cubic_meters;
	double molar_mass_kg_per_mol;
	double degrees_of_freedom;
	std::optional<double> slab_thickness_meters;
	std::optional<double> thermal_conductivity_w_per_mk;
	std::optional<double> thermal_diffusivity_m2_per_s;
	std::optional<double> initial_temperature_celsius;
	std::optional<double> boundary_temperature_celsius;
	std::optional<double> hot_reservoir_temperature_kelvin;
	std::optional<double> cold_reservoir_temperature_kelvin;
	std::optional<double> cycle_min_volume_cubic_meters;
	std::optional<double> cycle_volume_ratio;
};

struct Snapshot {
	double time_seconds;
	double pressure_pascals;
	double density_kg_m3;
	double internal_energy_joules;
	double temperature_kelvin;
	double volume_cubic_meters;
	std::optional<double> center_temperature_celsius;
	std::optional<double> surface_temperature_celsius;
	std::optional<double> heat_flux_w_per_m2;
	std::optional<double> fourier_number;
	std::optional<double> normalized_temperature;
	std::optional<double> thermal_efficiency;
	std::optional<double> absorbed_heat_kj;
	std::optional<double> rejected_heat_kj;
	std::optional<double> net_work_kj;
	std::optional<double> entropy_transfer_kj_per_k;
	std::optional<std::string> cycle_stage_label;
	bool stable;
};

struct Sample {
	double time_seconds;
	double volume_cubic_meters;
	double pressure_pascals;
	double temperature_kelvin;
	double internal_energy_joules;
	std::optional<double> position_meters;
	std::optional<double> temperature_celsius;
	std::optional<double> heat_flux_w_per_m2;
	std::optional<double> normalized_temperature;
	std::optional<double> entropy_transfer_kj_per_k;
	std::optional<std::string> stage_label;
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
	const Scenario& scenario,
	std::size_t sample_count = 24);
std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio);

}  // namespace visual_physics::thermodynamics