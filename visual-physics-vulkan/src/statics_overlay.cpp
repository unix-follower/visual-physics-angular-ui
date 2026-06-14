#include "statics_overlay.hpp"

#include <algorithm>
#include <array>
#include <cmath>

namespace visual_physics::statics {
namespace {

NormalizedVertex to_ndc_point(double x, double y, const Scenario& scenario) {
	const auto& bounds = scenario.view_bounds;
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;

	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
	};
}

void append_overlay_line(
	std::vector<OverlayVertex>& vertices,
	const Scenario& scenario,
	const Vector2& start,
	const Vector2& end,
	std::array<float, 4> color) {
	const auto ndc_start = to_ndc_point(start.x, start.y, scenario);
	const auto ndc_end = to_ndc_point(end.x, end.y, scenario);
	vertices.push_back({ndc_start.x, ndc_start.y, color[0], color[1], color[2], color[3]});
	vertices.push_back({ndc_end.x, ndc_end.y, color[0], color[1], color[2], color[3]});
}

bool is_nearly_zero_vector(const Vector2& vector) {
	return std::hypot(vector.x, vector.y) <= 1e-6;
}

float overlay_marker_half_width(const Scenario& scenario) {
	switch (scenario.id) {
	case ScenarioId::BeamSupport:
		return 0.010F;
	case ScenarioId::InclinedPlane:
		return 0.012F;
	case ScenarioId::PulleyEquilibrium:
		return 0.014F;
	}

	return 0.012F;
}

void append_overlay_marker(
	std::vector<OverlayVertex>& vertices,
	const Scenario& scenario,
	double x,
	double y,
	float aspect_ratio,
	float half_width,
	std::array<float, 4> color) {
	const auto center = to_ndc_point(x, y, scenario);
	const float safe_aspect = std::max(aspect_ratio, 0.001F);
	const float half_height = aspect_ratio >= 1.0F
		? half_width * aspect_ratio
		: half_width / safe_aspect;
	vertices.push_back({center.x - half_width, center.y - half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x + half_width, center.y - half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x - half_width, center.y + half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x - half_width, center.y + half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x + half_width, center.y - half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x + half_width, center.y + half_height, color[0], color[1], color[2], color[3]});
}

}  // namespace

std::vector<OverlayVertex> build_overlay_line_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	auto append_force = [&](const Vector2& start,
		const Vector2& vector,
		double scale,
		std::array<float, 4> color) {
		if (is_nearly_zero_vector(vector)) {
			return;
		}
		append_overlay_line(
			vertices,
			scenario,
			start,
			{start.x + vector.x * scale, start.y + vector.y * scale},
			color);
	};

	if (scenario.id == ScenarioId::BeamSupport) {
		const auto left_support = scenario.anchor_point.value_or(Vector2{1.0, 0.0});
		const auto right_support = scenario.secondary_point.value_or(Vector2{9.0, 0.0});
		if (overlays.show_applied_force) {
			append_force(snapshot.position, snapshot.applied_force, 0.08, {1.0F, 0.54F, 0.36F, 1.0F});
		}
		if (overlays.show_reaction_forces) {
			append_force(left_support, snapshot.primary_reaction_force, 0.08, {0.44F, 0.92F, 0.64F, 1.0F});
			if (snapshot.secondary_reaction_force.has_value()) {
				append_force(right_support, *snapshot.secondary_reaction_force, 0.08, {0.44F, 0.92F, 0.64F, 1.0F});
			}
		}
		if (overlays.show_residual_guides) {
			append_force(snapshot.position, snapshot.residual_force, 0.16, {0.98F, 0.9F, 0.47F, 1.0F});
		}
		return vertices;
	}

	if (scenario.id == ScenarioId::InclinedPlane) {
		if (overlays.show_applied_force) {
			append_force(snapshot.position, snapshot.applied_force, 0.05, {1.0F, 0.54F, 0.36F, 1.0F});
		}
		if (overlays.show_reaction_forces) {
			append_force(snapshot.position, snapshot.primary_reaction_force, 0.06, {0.44F, 0.92F, 0.64F, 1.0F});
			if (snapshot.secondary_reaction_force.has_value()) {
				append_force(snapshot.position, *snapshot.secondary_reaction_force, 0.06, {0.44F, 0.92F, 0.64F, 1.0F});
			}
		}
		if (overlays.show_residual_guides) {
			append_force(snapshot.position, snapshot.residual_force, 0.12, {0.98F, 0.9F, 0.47F, 1.0F});
		}
		return vertices;
	}

	const auto pulley_top = Vector2{0.0, 0.0};
	if (overlays.show_applied_force) {
		append_force(snapshot.position, snapshot.applied_force, 0.04, {1.0F, 0.54F, 0.36F, 1.0F});
	}
	if (overlays.show_reaction_forces) {
		append_force(pulley_top, snapshot.primary_reaction_force, 0.08, {0.44F, 0.92F, 0.64F, 1.0F});
		if (snapshot.secondary_reaction_force.has_value()) {
			append_force(pulley_top, *snapshot.secondary_reaction_force, 0.08, {0.44F, 0.92F, 0.64F, 1.0F});
		}
	}
	if (overlays.show_residual_guides) {
		append_force(pulley_top, snapshot.residual_force, 0.12, {0.98F, 0.9F, 0.47F, 1.0F});
	}
	return vertices;
}

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	auto append_force_marker = [&](const Vector2& start,
		const Vector2& vector,
		double scale,
		std::array<float, 4> color) {
		if (is_nearly_zero_vector(vector)) {
			return;
		}
		append_overlay_marker(
			vertices,
			scenario,
			start.x + vector.x * scale,
			start.y + vector.y * scale,
			aspect_ratio,
			overlay_marker_half_width(scenario),
			color);
	};

	if (scenario.id == ScenarioId::BeamSupport) {
		const auto left_support = scenario.anchor_point.value_or(Vector2{1.0, 0.0});
		const auto right_support = scenario.secondary_point.value_or(Vector2{9.0, 0.0});
		if (overlays.show_applied_force) {
			append_force_marker(snapshot.position, snapshot.applied_force, 0.08, {1.0F, 0.54F, 0.36F, 1.0F});
		}
		if (overlays.show_reaction_forces) {
			append_force_marker(left_support, snapshot.primary_reaction_force, 0.08, {0.44F, 0.92F, 0.64F, 1.0F});
			if (snapshot.secondary_reaction_force.has_value()) {
				append_force_marker(right_support, *snapshot.secondary_reaction_force, 0.08, {0.44F, 0.92F, 0.64F, 1.0F});
			}
		}
		if (overlays.show_residual_guides) {
			append_force_marker(snapshot.position, snapshot.residual_force, 0.16, {0.98F, 0.9F, 0.47F, 1.0F});
		}
		return vertices;
	}

	if (scenario.id == ScenarioId::InclinedPlane) {
		if (overlays.show_applied_force) {
			append_force_marker(snapshot.position, snapshot.applied_force, 0.05, {1.0F, 0.54F, 0.36F, 1.0F});
		}
		if (overlays.show_reaction_forces) {
			append_force_marker(snapshot.position, snapshot.primary_reaction_force, 0.06, {0.44F, 0.92F, 0.64F, 1.0F});
			if (snapshot.secondary_reaction_force.has_value()) {
				append_force_marker(snapshot.position, *snapshot.secondary_reaction_force, 0.06, {0.44F, 0.92F, 0.64F, 1.0F});
			}
		}
		if (overlays.show_residual_guides) {
			append_force_marker(snapshot.position, snapshot.residual_force, 0.12, {0.98F, 0.9F, 0.47F, 1.0F});
		}
		return vertices;
	}

	const auto pulley_top = Vector2{0.0, 0.0};
	if (overlays.show_applied_force) {
		append_force_marker(snapshot.position, snapshot.applied_force, 0.04, {1.0F, 0.54F, 0.36F, 1.0F});
	}
	if (overlays.show_reaction_forces) {
		append_force_marker(pulley_top, snapshot.primary_reaction_force, 0.08, {0.44F, 0.92F, 0.64F, 1.0F});
		if (snapshot.secondary_reaction_force.has_value()) {
			append_force_marker(pulley_top, *snapshot.secondary_reaction_force, 0.08, {0.44F, 0.92F, 0.64F, 1.0F});
		}
	}
	if (overlays.show_residual_guides) {
		append_force_marker(pulley_top, snapshot.residual_force, 0.12, {0.98F, 0.9F, 0.47F, 1.0F});
	}
	return vertices;
}

}  // namespace visual_physics::statics