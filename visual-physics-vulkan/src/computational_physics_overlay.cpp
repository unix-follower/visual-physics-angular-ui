#include "computational_physics_overlay.hpp"

#include <algorithm>

namespace visual_physics::computational_physics {
namespace {

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

NormalizedVertex to_ndc_point(double x, double y, const Scenario& scenario) {
	const auto& bounds = scenario.view_bounds;
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(clamp(normalized_y, -0.96, 0.96)),
	};
}

void append_line(
	std::vector<OverlayVertex>& vertices,
	const NormalizedVertex& start,
	const NormalizedVertex& end,
	float r,
	float g,
	float b,
	float a) {
	vertices.push_back({start.x, start.y, r, g, b, a});
	vertices.push_back({end.x, end.y, r, g, b, a});
}

void append_square(
	std::vector<OverlayVertex>& vertices,
	const NormalizedVertex& center,
	float half_width,
	float half_height,
	float r,
	float g,
	float b,
	float a) {
	const OverlayVertex top_left{center.x - half_width, center.y + half_height, r, g, b, a};
	const OverlayVertex top_right{center.x + half_width, center.y + half_height, r, g, b, a};
	const OverlayVertex bottom_left{center.x - half_width, center.y - half_height, r, g, b, a};
	const OverlayVertex bottom_right{center.x + half_width, center.y - half_height, r, g, b, a};
	vertices.push_back(top_left);
	vertices.push_back(bottom_left);
	vertices.push_back(bottom_right);
	vertices.push_back(top_left);
	vertices.push_back(bottom_right);
	vertices.push_back(top_right);
}

}  // namespace

std::vector<OverlayVertex> build_overlay_line_vertices(
	const Snapshot& snapshot,
	const std::vector<TrajectorySample>& samples,
	const Scenario& scenario,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	if (samples.size() > 1) {
		for (std::size_t index = 1; index < samples.size(); index += 1) {
			if (overlays.show_euler_trajectory) {
				append_line(
					vertices,
					to_ndc_point(samples[index - 1].euler_x, samples[index - 1].euler_y, scenario),
					to_ndc_point(samples[index].euler_x, samples[index].euler_y, scenario),
					0.95F,
					0.49F,
					0.24F,
					1.0F);
			}
			if (overlays.show_symplectic_trajectory) {
				append_line(
					vertices,
					to_ndc_point(samples[index - 1].symplectic_x, samples[index - 1].symplectic_y, scenario),
					to_ndc_point(samples[index].symplectic_x, samples[index].symplectic_y, scenario),
					0.98F,
					0.90F,
					0.47F,
					1.0F);
			}
			if (overlays.show_rk4_trajectory) {
				append_line(
					vertices,
					to_ndc_point(samples[index - 1].rk4_x, samples[index - 1].rk4_y, scenario),
					to_ndc_point(samples[index].rk4_x, samples[index].rk4_y, scenario),
					0.52F,
					0.88F,
					0.71F,
					1.0F);
			}
		}
	}

	if (overlays.show_error_bars) {
		const auto reference = to_ndc_point(
			snapshot.reference_position.x,
			snapshot.reference_position.y,
			scenario);
		if (overlays.show_euler_trajectory) {
			append_line(
				vertices,
				reference,
				to_ndc_point(snapshot.euler.position.x, snapshot.euler.position.y, scenario),
				0.95F,
				0.49F,
				0.24F,
				0.8F);
		}
		if (overlays.show_symplectic_trajectory) {
			append_line(
				vertices,
				reference,
				to_ndc_point(snapshot.symplectic.position.x, snapshot.symplectic.position.y, scenario),
				0.98F,
				0.90F,
				0.47F,
				0.8F);
		}
		if (overlays.show_rk4_trajectory) {
			append_line(
				vertices,
				reference,
				to_ndc_point(snapshot.rk4.position.x, snapshot.rk4.position.y, scenario),
				0.52F,
				0.88F,
				0.71F,
				0.8F);
		}
	}

	return vertices;
}

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	const float half_width = 0.01F / std::max(aspect_ratio, 0.5F);
	const float half_height = 0.01F;
	if (overlays.show_euler_trajectory) {
		append_square(
			vertices,
			to_ndc_point(snapshot.euler.position.x, snapshot.euler.position.y, scenario),
			half_width,
			half_height,
			0.95F,
			0.49F,
			0.24F,
			1.0F);
	}
	if (overlays.show_symplectic_trajectory) {
		append_square(
			vertices,
			to_ndc_point(snapshot.symplectic.position.x, snapshot.symplectic.position.y, scenario),
			half_width,
			half_height,
			0.98F,
			0.90F,
			0.47F,
			1.0F);
	}
	if (overlays.show_rk4_trajectory) {
		append_square(
			vertices,
			to_ndc_point(snapshot.rk4.position.x, snapshot.rk4.position.y, scenario),
			half_width,
			half_height,
			0.52F,
			0.88F,
			0.71F,
			1.0F);
	}
	return vertices;
}

}  // namespace visual_physics::computational_physics