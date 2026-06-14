#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::waves {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	StandingWave,
	TravelingWave,
	DopplerEffect,
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
	std::optional<double> string_length_meters;
	std::optional<double> wave_speed_meters_per_second;
	std::optional<double> amplitude_millimeters;
	std::optional<double> harmonic_number;
	std::optional<double> frequency_hertz;
	std::optional<double> emitted_frequency_hertz;
	std::optional<double> source_speed_meters_per_second;
	std::optional<double> observer_speed_meters_per_second;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> string_length_meters;
	std::optional<double> wave_speed_meters_per_second;
	std::optional<double> amplitude_millimeters;
	std::optional<double> harmonic_number;
	std::optional<double> wavelength_meters;
	std::optional<double> frequency_hertz;
	std::optional<double> emitted_frequency_hertz;
	std::optional<double> source_speed_meters_per_second;
	std::optional<double> observer_speed_meters_per_second;
	std::optional<double> apparent_frequency_hertz;
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

}  // namespace visual_physics::waves