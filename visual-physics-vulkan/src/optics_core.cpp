#include "optics_core.hpp"

#include <algorithm>
#include <cmath>
#include <numbers>
#include <stdexcept>

namespace visual_physics::optics {
namespace {

constexpr double kPi = std::numbers::pi_v<double>;

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double to_radians(double angle_degrees) {
	return angle_degrees * kPi / 180.0;
}

double to_degrees(double angle_radians) {
	return angle_radians * 180.0 / kPi;
}

float normalize_x(double x, const ViewBounds& bounds) {
	const auto span = std::max(bounds.max_x - bounds.min_x, 1e-6);
	return static_cast<float>(((x - bounds.min_x) / span) * 2.0 - 1.0);
}

float normalize_y(double y, const ViewBounds& bounds) {
	const auto span = std::max(bounds.max_y - bounds.min_y, 1e-6);
	return static_cast<float>(((y - bounds.min_y) / span) * 2.0 - 1.0);
}

Snapshot build_snell_snapshot(const Scenario& scenario, double time_seconds) {
	const auto incident_angle_degrees = clamp(scenario.incident_angle_degrees.value_or(32.0), 0.0, 89.5);
	const auto medium_a_refractive_index = std::max(scenario.medium_a_refractive_index.value_or(1.0), 1.0);
	const auto medium_b_refractive_index = std::max(scenario.medium_b_refractive_index.value_or(1.52), 1.0);
	const auto incident_radians = to_radians(incident_angle_degrees);
	const auto sine_ratio = (medium_a_refractive_index / medium_b_refractive_index) * std::sin(incident_radians);
	const auto total_internal_reflection = std::abs(sine_ratio) > 1.0;
	const auto refracted_angle_degrees = total_internal_reflection
		? std::optional<double>{}
		: std::optional<double>{to_degrees(std::asin(clamp(sine_ratio, -1.0, 1.0)))};
	const auto critical_angle_degrees = medium_a_refractive_index > medium_b_refractive_index
		? std::optional<double>{to_degrees(std::asin(medium_b_refractive_index / medium_a_refractive_index))}
		: std::optional<double>{};

	return {
		.time_seconds = time_seconds,
		.incident_angle_degrees = incident_angle_degrees,
		.reflected_angle_degrees = incident_angle_degrees,
		.refracted_angle_degrees = refracted_angle_degrees,
		.critical_angle_degrees = critical_angle_degrees,
		.relative_refractive_index = medium_a_refractive_index / medium_b_refractive_index,
		.total_internal_reflection = total_internal_reflection,
		.stable = std::isfinite(sine_ratio),
	};
}

Snapshot build_thin_lens_snapshot(const Scenario& scenario, double time_seconds) {
	const auto focal_length_centimeters = std::max(scenario.focal_length_centimeters.value_or(18.0), 1.0);
	const auto object_distance_centimeters = std::max(scenario.object_distance_centimeters.value_or(42.0), 1.1);
	const auto object_height_centimeters = std::max(scenario.object_height_centimeters.value_or(4.0), 0.25);
	const auto denominator = (1.0 / focal_length_centimeters) - (1.0 / object_distance_centimeters);
	const auto stable = std::abs(denominator) > 1e-6;
	const auto image_distance_centimeters = stable ? std::optional<double>{1.0 / denominator} : std::optional<double>{};
	const auto magnification = image_distance_centimeters.has_value()
		? std::optional<double>{-image_distance_centimeters.value() / object_distance_centimeters}
		: std::optional<double>{};
	const auto image_height_centimeters = magnification.has_value()
		? std::optional<double>{magnification.value() * object_height_centimeters}
		: std::optional<double>{};
	const auto real_image = image_distance_centimeters.has_value()
		? std::optional<bool>{image_distance_centimeters.value() > 0.0}
		: std::optional<bool>{};
	const auto inverted_image = image_height_centimeters.has_value()
		? std::optional<bool>{image_height_centimeters.value() < 0.0}
		: std::optional<bool>{};

	return {
		.time_seconds = time_seconds,
		.focal_length_centimeters = focal_length_centimeters,
		.object_distance_centimeters = object_distance_centimeters,
		.object_height_centimeters = object_height_centimeters,
		.image_distance_centimeters = image_distance_centimeters,
		.image_height_centimeters = image_height_centimeters,
		.magnification = magnification,
		.real_image = real_image,
		.inverted_image = inverted_image,
		.stable = stable,
	};
}

Snapshot build_single_slit_snapshot(const Scenario& scenario, double time_seconds) {
	const auto slit_width_micrometers = std::max(scenario.slit_width_micrometers.value_or(40.0), 1.0);
	const auto wavelength_nanometers = std::max(scenario.wavelength_nanometers.value_or(520.0), 100.0);
	const auto screen_distance_meters = std::max(scenario.screen_distance_meters.value_or(1.6), 0.1);
	const auto slit_width_meters = slit_width_micrometers * 1e-6;
	const auto wavelength_meters = wavelength_nanometers * 1e-9;
	const auto first_minimum_offset_millimeters =
		(screen_distance_meters * wavelength_meters * 1000.0) / slit_width_meters;
	const auto central_maximum_width_millimeters = first_minimum_offset_millimeters * 2.0;

	return {
		.time_seconds = time_seconds,
		.slit_width_micrometers = slit_width_micrometers,
		.wavelength_nanometers = wavelength_nanometers,
		.screen_distance_meters = screen_distance_meters,
		.first_minimum_offset_millimeters = first_minimum_offset_millimeters,
		.central_maximum_width_millimeters = central_maximum_width_millimeters,
		.fringe_spacing_millimeters = first_minimum_offset_millimeters,
		.stable = std::isfinite(first_minimum_offset_millimeters),
	};
}

std::vector<Sample> build_snell_samples(const Snapshot& snapshot) {
	const auto origin_x = 5.0;
	const auto origin_y = 5.0;
	const auto ray_length = 3.2;
	const auto incident_angle_degrees = snapshot.incident_angle_degrees.value_or(0.0);
	const auto reflected_angle_degrees = snapshot.reflected_angle_degrees.value_or(0.0);
	const auto incident_radians = to_radians(incident_angle_degrees);
	const auto reflected_radians = to_radians(reflected_angle_degrees);
	const auto refracted_radians = to_radians(snapshot.refracted_angle_degrees.value_or(0.0));

	return {
		{snapshot.time_seconds, "incident", origin_x - std::sin(incident_radians) * ray_length, origin_y + std::cos(incident_radians) * ray_length, origin_x, origin_y, incident_angle_degrees, true, snapshot.stable},
		{snapshot.time_seconds, "reflected", origin_x, origin_y, origin_x + std::sin(reflected_radians) * ray_length, origin_y + std::cos(reflected_radians) * ray_length, reflected_angle_degrees, true, snapshot.stable},
		{snapshot.time_seconds, "refracted", origin_x, origin_y, origin_x + std::sin(refracted_radians) * ray_length, origin_y - std::cos(refracted_radians) * ray_length, snapshot.refracted_angle_degrees.value_or(0.0), !snapshot.total_internal_reflection.value_or(false), snapshot.stable},
	};
}

std::vector<Sample> build_thin_lens_samples(const Snapshot& snapshot) {
	const auto lens_x = 5.0;
	const auto axis_y = 5.0;
	const auto object_distance = snapshot.object_distance_centimeters.value_or(42.0);
	const auto image_distance = snapshot.image_distance_centimeters.value_or(0.0);
	const auto object_height = snapshot.object_height_centimeters.value_or(4.0);
	const auto image_height = snapshot.image_height_centimeters.value_or(0.0);
	const auto object_x = clamp(lens_x - (object_distance / 12.0), 1.1, 4.2);
	const auto image_x = clamp(lens_x + (image_distance / 12.0), 1.4, 8.9);
	const auto object_top_y = axis_y - object_height * 0.35;
	const auto image_top_y = axis_y - image_height * 0.35;

	return {
		{snapshot.time_seconds, "object", object_x, axis_y, object_x, object_top_y, 90.0, true, snapshot.stable},
		{snapshot.time_seconds, "parallel-ray", object_x, object_top_y, lens_x, object_top_y, 0.0, true, snapshot.stable},
		{snapshot.time_seconds, "focus-ray", lens_x, object_top_y, image_x, axis_y, 0.0, snapshot.stable, snapshot.stable},
		{snapshot.time_seconds, "center-ray", object_x, object_top_y, image_x, image_top_y, 0.0, snapshot.stable, snapshot.stable},
		{snapshot.time_seconds, "image", image_x, axis_y, image_x, image_top_y, 90.0, snapshot.stable, snapshot.stable},
	};
}

std::vector<Sample> build_single_slit_samples(const Snapshot& snapshot) {
	const auto slit_x = 3.1;
	const auto screen_x = 8.2;
	const auto axis_y = 5.0;
	const auto first_minimum_offset = std::min(2.2, snapshot.first_minimum_offset_millimeters.value_or(0.0) / 8.0);

	return {
		{snapshot.time_seconds, "aperture-upper-edge", slit_x, 2.2, slit_x, axis_y - 0.4, 90.0, true, snapshot.stable},
		{snapshot.time_seconds, "aperture-lower-edge", slit_x, axis_y + 0.4, slit_x, 7.8, 90.0, true, snapshot.stable},
		{snapshot.time_seconds, "screen-center", screen_x, axis_y - 0.35, screen_x, axis_y + 0.35, 90.0, true, snapshot.stable},
		{snapshot.time_seconds, "screen-upper-minimum", screen_x, axis_y - first_minimum_offset - 0.18, screen_x, axis_y - first_minimum_offset + 0.18, 90.0, true, snapshot.stable},
		{snapshot.time_seconds, "screen-lower-minimum", screen_x, axis_y + first_minimum_offset - 0.18, screen_x, axis_y + first_minimum_offset + 0.18, 90.0, true, snapshot.stable},
	};
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::SnellRefraction:
		return "snell-refraction";
	case ScenarioId::ThinLensImaging:
		return "thin-lens-imaging";
	case ScenarioId::SingleSlitDiffraction:
		return "single-slit-diffraction";
	}
	throw std::runtime_error("Unknown optics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "snell-refraction") {
		return ScenarioId::SnellRefraction;
	}
	if (value == "thin-lens-imaging") {
		return ScenarioId::ThinLensImaging;
	}
	if (value == "single-slit-diffraction") {
		return ScenarioId::SingleSlitDiffraction;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::SnellRefraction:
		return {
			.id = id,
			.name = "Snell Refraction at a Flat Interface",
			.summary = "Track the incident, reflected, and refracted ray geometry for a light ray crossing a flat material boundary.",
			.equation_summary = "n_1 sin(theta_1) = n_2 sin(theta_2)",
			.status = "Implemented",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 10.0, 0.0, 10.0},
			.focus_area = "Refraction angle, total internal reflection, critical angle threshold, and deterministic ray geometry.",
			.incident_angle_degrees = 32.0,
			.medium_a_refractive_index = 1.0,
			.medium_b_refractive_index = 1.52,
		};
	case ScenarioId::ThinLensImaging:
		return {
			.id = id,
			.name = "Thin Lens Image Formation",
			.summary = "Solve the image distance, magnification, and image orientation for a thin converging lens with a single object.",
			.equation_summary = "1 / f = 1 / d_o + 1 / d_i, m = -d_i / d_o",
			.status = "Implemented",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 10.0, 0.0, 10.0},
			.focus_area = "Image distance, upright versus inverted images, magnification, and principal-ray geometry across a converging lens.",
			.focal_length_centimeters = 18.0,
			.object_distance_centimeters = 42.0,
			.object_height_centimeters = 4.0,
		};
	case ScenarioId::SingleSlitDiffraction:
		return {
			.id = id,
			.name = "Single Slit Diffraction Pattern",
			.summary = "Estimate the central diffraction envelope and first-minimum offsets for monochromatic light passing through a single narrow slit.",
			.equation_summary = "a sin(theta) = m lambda, y_1 ~= L lambda / a",
			.status = "Implemented",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 10.0, 0.0, 10.0},
			.focus_area = "Central maximum width, first-minimum positions, wavelength and slit-width scaling, and screen-plane diffraction markers.",
			.slit_width_micrometers = 40.0,
			.wavelength_nanometers = 520.0,
			.screen_distance_meters = 1.6,
		};
	}
	throw std::runtime_error("Unknown optics scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	switch (scenario.id) {
	case ScenarioId::SnellRefraction:
		return build_snell_snapshot(scenario, time_seconds);
	case ScenarioId::ThinLensImaging:
		return build_thin_lens_snapshot(scenario, time_seconds);
	case ScenarioId::SingleSlitDiffraction:
		return build_single_slit_snapshot(scenario, time_seconds);
	}
	throw std::runtime_error("Unknown optics scenario id");
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t) {
	const auto snapshot = sample_scenario(scenario, 0.0);
	switch (scenario.id) {
	case ScenarioId::SnellRefraction:
		return build_snell_samples(snapshot);
	case ScenarioId::ThinLensImaging:
		return build_thin_lens_samples(snapshot);
	case ScenarioId::SingleSlitDiffraction:
		return build_single_slit_samples(snapshot);
	}
	throw std::runtime_error("Unknown optics scenario id");
}

std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario) {
	return {
		{normalize_x(scenario.view_bounds.min_x, scenario.view_bounds), normalize_y(5.0, scenario.view_bounds)},
		{normalize_x(scenario.view_bounds.max_x, scenario.view_bounds), normalize_y(5.0, scenario.view_bounds)},
	};
}

std::vector<NormalizedVertex> build_scenario_vertices(const Scenario& scenario, std::size_t sample_count) {
	const auto samples = build_samples(scenario, sample_count);
	std::vector<NormalizedVertex> vertices;
	vertices.reserve(samples.size() * 2);
	for (const auto& sample : samples) {
		vertices.push_back({normalize_x(sample.start_x, scenario.view_bounds), normalize_y(sample.start_y, scenario.view_bounds)});
		vertices.push_back({normalize_x(sample.end_x, scenario.view_bounds), normalize_y(sample.end_y, scenario.view_bounds)});
	}
	return vertices;
}

std::vector<NormalizedVertex> build_marker_vertices(const Snapshot& snapshot, const Scenario& scenario, float) {
	std::vector<NormalizedVertex> vertices;
	if (scenario.id == ScenarioId::SnellRefraction) {
		vertices.push_back({normalize_x(5.0, scenario.view_bounds), normalize_y(5.0, scenario.view_bounds)});
	} else if (scenario.id == ScenarioId::ThinLensImaging) {
		vertices.push_back({normalize_x(5.0, scenario.view_bounds), normalize_y(5.0, scenario.view_bounds)});
		vertices.push_back({normalize_x(5.0 + (snapshot.image_distance_centimeters.value_or(0.0) / 12.0), scenario.view_bounds), normalize_y(5.0 - snapshot.image_height_centimeters.value_or(0.0) * 0.35, scenario.view_bounds)});
	} else {
		vertices.push_back({normalize_x(8.2, scenario.view_bounds), normalize_y(5.0, scenario.view_bounds)});
		vertices.push_back({normalize_x(8.2, scenario.view_bounds), normalize_y(5.0 - std::min(2.2, snapshot.first_minimum_offset_millimeters.value_or(0.0) / 8.0), scenario.view_bounds)});
	}
	return vertices;
}

}  // namespace visual_physics::optics