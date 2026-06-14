#include "optics_overlay.hpp"

#include <algorithm>

namespace visual_physics::optics {
namespace {

float normalize_x(double x, const ViewBounds& bounds) {
	const auto span = std::max(bounds.max_x - bounds.min_x, 1e-6);
	return static_cast<float>(((x - bounds.min_x) / span) * 2.0 - 1.0);
}

float normalize_y(double y, const ViewBounds& bounds) {
	const auto span = std::max(bounds.max_y - bounds.min_y, 1e-6);
	return static_cast<float>(((y - bounds.min_y) / span) * 2.0 - 1.0);
}

void append_line(
	std::vector<OverlayVertex>& vertices,
	const ViewBounds& bounds,
	double start_x,
	double start_y,
	double end_x,
	double end_y,
	float r,
	float g,
	float b,
	float a) {
	vertices.push_back({normalize_x(start_x, bounds), normalize_y(start_y, bounds), r, g, b, a});
	vertices.push_back({normalize_x(end_x, bounds), normalize_y(end_y, bounds), r, g, b, a});
}

void append_cross(
	std::vector<OverlayVertex>& vertices,
	const ViewBounds& bounds,
	double x,
	double y,
	double half_size,
	float r,
	float g,
	float b,
	float a) {
	append_line(vertices, bounds, x - half_size, y, x + half_size, y, r, g, b, a);
	append_line(vertices, bounds, x, y - half_size, x, y + half_size, r, g, b, a);
}

}  // namespace

std::vector<OverlayVertex> build_overlay_line_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	if (scenario.id == ScenarioId::SnellRefraction) {
		if (overlays.show_normal_guide) {
			append_line(vertices, scenario.view_bounds, 5.0, 1.2, 5.0, 8.8, 0.80F, 0.86F, 0.95F, 1.0F);
		}
		if (overlays.show_incident_guide) {
			const auto samples = build_samples(scenario, 3);
			if (!samples.empty()) {
				append_line(vertices, scenario.view_bounds, samples[0].start_x, samples[0].start_y, samples[0].end_x, samples[0].end_y, 0.58F, 0.83F, 0.96F, 1.0F);
			}
		}
		if (overlays.show_secondary_guide) {
			const auto samples = build_samples(scenario, 3);
			if (samples.size() >= 3 && samples[2].active) {
				append_line(vertices, scenario.view_bounds, samples[2].start_x, samples[2].start_y, samples[2].end_x, samples[2].end_y, 0.97F, 0.77F, 0.42F, 1.0F);
			}
		}
	} else if (scenario.id == ScenarioId::ThinLensImaging) {
		append_line(vertices, scenario.view_bounds, 5.0, 1.5, 5.0, 8.5, 0.72F, 0.87F, 0.97F, 1.0F);
		if (overlays.show_incident_guide || overlays.show_normal_guide || overlays.show_secondary_guide) {
			const auto samples = build_samples(scenario, 5);
			for (const auto& sample : samples) {
				if (!sample.active) {
					continue;
				}
				if (sample.ray_label == "parallel-ray" && overlays.show_incident_guide) {
					append_line(vertices, scenario.view_bounds, sample.start_x, sample.start_y, sample.end_x, sample.end_y, 0.58F, 0.83F, 0.96F, 1.0F);
				}
				if (sample.ray_label == "center-ray" && overlays.show_normal_guide) {
					append_line(vertices, scenario.view_bounds, sample.start_x, sample.start_y, sample.end_x, sample.end_y, 0.78F, 0.84F, 0.90F, 1.0F);
				}
				if (sample.ray_label == "focus-ray" && overlays.show_secondary_guide) {
					append_line(vertices, scenario.view_bounds, sample.start_x, sample.start_y, sample.end_x, sample.end_y, 0.97F, 0.77F, 0.42F, 1.0F);
				}
			}
		}
	} else {
		append_line(vertices, scenario.view_bounds, 8.2, 1.5, 8.2, 8.5, 0.72F, 0.87F, 0.97F, 1.0F);
		if (overlays.show_incident_guide) {
			append_line(vertices, scenario.view_bounds, 3.1, 2.2, 3.1, 4.6, 0.58F, 0.83F, 0.96F, 1.0F);
			append_line(vertices, scenario.view_bounds, 3.1, 5.4, 3.1, 7.8, 0.58F, 0.83F, 0.96F, 1.0F);
		}
		if (overlays.show_normal_guide) {
			append_line(vertices, scenario.view_bounds, 3.1, 5.0, 8.2, 5.0, 0.80F, 0.86F, 0.95F, 1.0F);
		}
		if (overlays.show_secondary_guide) {
			const auto minimum_offset = std::min(2.2, snapshot.first_minimum_offset_millimeters.value_or(0.0) / 8.0);
			append_line(vertices, scenario.view_bounds, 3.1, 5.0, 8.2, 5.0 - minimum_offset, 0.97F, 0.77F, 0.42F, 1.0F);
			append_line(vertices, scenario.view_bounds, 3.1, 5.0, 8.2, 5.0 + minimum_offset, 0.97F, 0.77F, 0.42F, 1.0F);
		}
	}
	return vertices;
}

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float,
	const OverlayOptions&) {
	std::vector<OverlayVertex> vertices;
	if (scenario.id == ScenarioId::SnellRefraction) {
		append_cross(vertices, scenario.view_bounds, 5.0, 5.0, 0.10, 0.98F, 0.75F, 0.42F, 1.0F);
	} else if (scenario.id == ScenarioId::ThinLensImaging) {
		append_cross(vertices, scenario.view_bounds, 5.0, 5.0, 0.10, 0.98F, 0.75F, 0.42F, 1.0F);
		append_cross(
			vertices,
			scenario.view_bounds,
			5.0 + (snapshot.image_distance_centimeters.value_or(0.0) / 12.0),
			5.0 - snapshot.image_height_centimeters.value_or(0.0) * 0.35,
			0.10,
			0.98F,
			0.75F,
			0.42F,
			1.0F);
	} else {
		const auto minimum_offset = std::min(2.2, snapshot.first_minimum_offset_millimeters.value_or(0.0) / 8.0);
		append_cross(vertices, scenario.view_bounds, 8.2, 5.0, 0.10, 0.98F, 0.75F, 0.42F, 1.0F);
		append_cross(vertices, scenario.view_bounds, 8.2, 5.0 - minimum_offset, 0.08, 0.98F, 0.75F, 0.42F, 1.0F);
		append_cross(vertices, scenario.view_bounds, 8.2, 5.0 + minimum_offset, 0.08, 0.98F, 0.75F, 0.42F, 1.0F);
	}
	return vertices;
}

}  // namespace visual_physics::optics