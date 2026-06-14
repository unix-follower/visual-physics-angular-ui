#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::electronics {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	RcTransient,
	ResistorNetwork,
	RlTransient,
	RcLowPass,
	RcHighPass,
	RlLowPass,
	RlHighPass,
	RlcResonance,
	HalfWaveRectifier,
	FullWaveRectifier,
	SmoothedRectifier,
	RlcResponse,
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
	double source_voltage;
	double resistance_ohms;
	double capacitance_farads;
	double initial_capacitor_voltage;
	std::optional<double> inductance_henrys;
	std::optional<double> upper_resistance_ohms;
	std::optional<double> lower_resistance_ohms;
};

struct Snapshot {
	double time_seconds;
	double source_voltage;
	double resistor_voltage;
	double capacitor_voltage;
	double current_amps;
	double charge_coulombs;
	double stored_energy_joules;
	double time_constant_seconds;
	std::optional<double> flux_linkage_webers;
	std::optional<double> output_voltage;
	std::optional<double> branch_current_amps;
	std::optional<double> equivalent_resistance_ohms;
	std::optional<double> lower_branch_power_watts;
};

struct Sample {
	double time_seconds;
	double source_voltage;
	double capacitor_voltage;
	double current_amps;
	double charge_coulombs;
	double stored_energy_joules;
	std::optional<double> flux_linkage_webers;
	std::optional<double> output_voltage;
	std::optional<double> branch_current_amps;
	std::optional<double> lower_branch_power_watts;
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
	const std::vector<Sample>& samples,
	const Scenario& scenario);
std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio);

}  // namespace visual_physics::electronics