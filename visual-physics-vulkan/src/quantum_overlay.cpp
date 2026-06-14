#include "quantum_overlay.hpp"

#include <algorithm>

namespace visual_physics::quantum {
namespace {

float normalize_x(double x, const ViewBounds& bounds) {
	const auto span = std::max(bounds.max_x - bounds.min_x, 1e-6);
	return static_cast<float>(((x - bounds.min_x) / span) * 2.0 - 1.0);
}

float normalize_y(double y, const ViewBounds& bounds) {
	const auto span = std::max(bounds.max_y - bounds.min_y, 1e-6);
	return static_cast<float>(((y - bounds.min_y) / span) * 2.0 - 1.0);
}

void append_segment(
	std::vector<OverlayVertex>& vertices,
	float x1,
	float y1,
	float x2,
	float y2,
	float r,
	float g,
	float b) {
	vertices.push_back({x1, y1, r, g, b, 1.0F});
	vertices.push_back({x2, y2, r, g, b, 1.0F});
}

}  // namespace

std::vector<OverlayVertex> build_overlay_line_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	const auto& bounds = scenario.view_bounds;
	if (scenario.id == ScenarioId::ParticleInBox && overlays.show_potential_guide) {
		append_segment(vertices, normalize_x(bounds.min_x, bounds), normalize_y(0.0, bounds), normalize_x(bounds.min_x, bounds), normalize_y(1.0, bounds), 0.9F, 0.78F, 0.35F);
		append_segment(vertices, normalize_x(bounds.max_x, bounds), normalize_y(0.0, bounds), normalize_x(bounds.max_x, bounds), normalize_y(1.0, bounds), 0.9F, 0.78F, 0.35F);
	}
	if (scenario.id == ScenarioId::FinitePotentialWellTunneling && overlays.show_potential_guide) {
		const auto width = snapshot.barrier_width_nanometers.value_or(0.45);
		const auto height = snapshot.barrier_height_ev.value_or(0.0);
		append_segment(vertices, normalize_x(width, bounds), normalize_y(0.0, bounds), normalize_x(width, bounds), normalize_y(height, bounds), 0.9F, 0.78F, 0.35F);
		append_segment(vertices, normalize_x(width * 2.0, bounds), normalize_y(0.0, bounds), normalize_x(width * 2.0, bounds), normalize_y(height, bounds), 0.9F, 0.78F, 0.35F);
		append_segment(vertices, normalize_x(width, bounds), normalize_y(height, bounds), normalize_x(width * 2.0, bounds), normalize_y(height, bounds), 0.9F, 0.78F, 0.35F);
	}
	if (scenario.id == ScenarioId::DoubleSlitInterference && overlays.show_potential_guide) {
		append_segment(vertices, normalize_x(bounds.min_x, bounds), normalize_y(0.0, bounds), normalize_x(bounds.max_x, bounds), normalize_y(0.0, bounds), 0.6F, 0.72F, 0.88F);
	}
	return vertices;
}

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays) {
	static_cast<void>(snapshot);
	static_cast<void>(scenario);
	static_cast<void>(aspect_ratio);
	static_cast<void>(overlays);
	return {};
}

}  // namespace visual_physics::quantum