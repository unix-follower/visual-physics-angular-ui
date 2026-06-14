#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::optics {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	SnellRefraction,
	ThinLensImaging,
	SingleSlitDiffraction,
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
	std::optional<double> incident_angle_degrees;
	std::optional<double> medium_a_refractive_index;
	std::optional<double> medium_b_refractive_index;
	std::optional<double> focal_length_centimeters;
	std::optional<double> object_distance_centimeters;
	std::optional<double> object_height_centimeters;
	std::optional<double> slit_width_micrometers;
	std::optional<double> wavelength_nanometers;
	std::optional<double> screen_distance_meters;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> incident_angle_degrees;
	std::optional<double> reflected_angle_degrees;
	std::optional<double> refracted_angle_degrees;
	std::optional<double> critical_angle_degrees;
	std::optional<double> relative_refractive_index;
	std::optional<bool> total_internal_reflection;
	std::optional<double> focal_length_centimeters;
	std::optional<double> object_distance_centimeters;
	std::optional<double> object_height_centimeters;
	std::optional<double> image_distance_centimeters;
	std::optional<double> image_height_centimeters;
	std::optional<double> magnification;
	std::optional<bool> real_image;
	std::optional<bool> inverted_image;
	std::optional<double> slit_width_micrometers;
	std::optional<double> wavelength_nanometers;
	std::optional<double> screen_distance_meters;
	std::optional<double> first_minimum_offset_millimeters;
	std::optional<double> central_maximum_width_millimeters;
	std::optional<double> fringe_spacing_millimeters;
	bool stable;
};

struct Sample {
	double time_seconds;
	std::string ray_label;
	double start_x;
	double start_y;
	double end_x;
	double end_y;
	double angle_degrees;
	bool active;
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

}  // namespace visual_physics::optics