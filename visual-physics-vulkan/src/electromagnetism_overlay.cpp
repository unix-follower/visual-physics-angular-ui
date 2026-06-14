#include "electromagnetism_overlay.hpp"

#include <algorithm>
#include <cmath>

namespace visual_physics::electromagnetism {
namespace {

double clamp(double value, double min, double max) {
	return std::min(std::max(value, min), max);
}

double magnitude(const Vector2& value) {
	return std::hypot(value.x, value.y);
}

OverlayVertex to_overlay_vertex(
	const Scenario& scenario,
	double x,
	double y,
	float r,
	float g,
	float b,
	float a) {
	const double normalized_x =
		((x - scenario.view_bounds.min_x) /
		 std::max(scenario.view_bounds.max_x - scenario.view_bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - scenario.view_bounds.min_y) /
		 std::max(scenario.view_bounds.max_y - scenario.view_bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(clamp(normalized_y, -0.96, 0.96)),
		r,
		g,
		b,
		a,
	};
}

void append_line(
	std::vector<OverlayVertex>& vertices,
	const Scenario& scenario,
	const Vector2& start,
	const Vector2& end,
	float r,
	float g,
	float b,
	float a) {
	vertices.push_back(to_overlay_vertex(scenario, start.x, start.y, r, g, b, a));
	vertices.push_back(to_overlay_vertex(scenario, end.x, end.y, r, g, b, a));
}

void append_vector(
	std::vector<OverlayVertex>& vertices,
	const Scenario& scenario,
	const Vector2& origin,
	const Vector2& vector,
	double scale,
	float r,
	float g,
	float b,
	float a) {
	const double vector_magnitude = magnitude(vector);
	if (vector_magnitude < 1e-6) {
		return;
	}

	const Vector2 tip{origin.x + vector.x * scale, origin.y + vector.y * scale};
	append_line(vertices, scenario, origin, tip, r, g, b, a);
	const Vector2 direction{vector.x / vector_magnitude, vector.y / vector_magnitude};
	const double head_length = std::min(std::max(scale * 0.28, 0.14), 0.42);
	const double wing_scale = 0.45;
	const Vector2 left_wing{
		tip.x - (direction.x + direction.y * wing_scale) * head_length,
		tip.y - (direction.y - direction.x * wing_scale) * head_length,
	};
	const Vector2 right_wing{
		tip.x - (direction.x - direction.y * wing_scale) * head_length,
		tip.y - (direction.y + direction.x * wing_scale) * head_length,
	};
	append_line(vertices, scenario, tip, left_wing, r, g, b, a);
	append_line(vertices, scenario, tip, right_wing, r, g, b, a);
}

void append_marker(
	std::vector<OverlayVertex>& vertices,
	const Scenario& scenario,
	const Vector2& center,
	float aspect_ratio,
	float radius,
	float r,
	float g,
	float b,
	float a) {
	const float safe_aspect = std::max(aspect_ratio, 0.001F);
	const float half_width = radius;
	const float half_height = aspect_ratio >= 1.0F ? radius * aspect_ratio : radius / safe_aspect;
	const auto top = to_overlay_vertex(scenario, center.x, center.y + half_height, r, g, b, a);
	const auto right = to_overlay_vertex(scenario, center.x + half_width, center.y, r, g, b, a);
	const auto bottom = to_overlay_vertex(scenario, center.x, center.y - half_height, r, g, b, a);
	const auto left = to_overlay_vertex(scenario, center.x - half_width, center.y, r, g, b, a);
	vertices.push_back(top);
	vertices.push_back(right);
	vertices.push_back(bottom);
	vertices.push_back(top);
	vertices.push_back(bottom);
	vertices.push_back(left);
}

}  // namespace

std::vector<OverlayVertex> build_overlay_line_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;

	if (scenario.id == ScenarioId::PointChargeElectrostatics) {
		const Vector2 first_source = scenario.source_point.value_or(Vector2{-2.0, 0.0});
		const Vector2 second_source = scenario.secondary_source_point.value_or(Vector2{2.0, 0.0});
		append_line(vertices, scenario, first_source, snapshot.position, 0.93F, 0.73F, 0.29F, 1.0F);
		append_line(vertices, scenario, second_source, snapshot.position, 0.93F, 0.73F, 0.29F, 1.0F);
		if (overlays.show_potential_guides) {
			append_line(vertices, scenario, {-4.8, -2.6}, {4.8, -2.6}, 0.54F, 0.79F, 0.96F, 0.9F);
			append_line(vertices, scenario, {4.8, -2.6}, {4.8, 2.6}, 0.54F, 0.79F, 0.96F, 0.9F);
			append_line(vertices, scenario, {4.8, 2.6}, {-4.8, 2.6}, 0.54F, 0.79F, 0.96F, 0.9F);
			append_line(vertices, scenario, {-4.8, 2.6}, {-4.8, -2.6}, 0.54F, 0.79F, 0.96F, 0.9F);
		}
		if (overlays.show_field_vectors) {
			append_vector(vertices, scenario, snapshot.position, snapshot.electric_field, 0.5, 0.38F, 0.91F, 0.98F, 1.0F);
		}
		if (overlays.show_force_vectors) {
			append_vector(vertices, scenario, snapshot.position, snapshot.force, 0.35, 0.99F, 0.46F, 0.37F, 1.0F);
		}
		return vertices;
	}

	if (scenario.id == ScenarioId::MovingChargeMagneticField) {
		if (overlays.show_magnetic_field) {
			append_line(vertices, scenario, {-2.8, -2.8}, {2.8, -2.8}, 0.52F, 0.86F, 0.98F, 0.9F);
			append_line(vertices, scenario, {2.8, -2.8}, {2.8, 2.8}, 0.52F, 0.86F, 0.98F, 0.9F);
			append_line(vertices, scenario, {2.8, 2.8}, {-2.8, 2.8}, 0.52F, 0.86F, 0.98F, 0.9F);
			append_line(vertices, scenario, {-2.8, 2.8}, {-2.8, -2.8}, 0.52F, 0.86F, 0.98F, 0.9F);
		}
		if (overlays.show_trajectory) {
			append_line(vertices, scenario, scenario.initial_position, snapshot.position, 0.98F, 0.87F, 0.41F, 1.0F);
		}
		if (overlays.show_field_vectors) {
			append_vector(vertices, scenario, snapshot.position, snapshot.magnetic_field, 0.45, 0.38F, 0.91F, 0.98F, 1.0F);
		}
		if (overlays.show_force_vectors) {
			append_vector(vertices, scenario, snapshot.position, snapshot.force, 0.18, 0.99F, 0.46F, 0.37F, 1.0F);
		}
		return vertices;
	}

	if (scenario.id == ScenarioId::CurrentLoopMagneticField) {
		if (overlays.show_potential_guides) {
			append_line(vertices, scenario, {0.0, 0.0}, snapshot.position, 0.69F, 0.76F, 0.98F, 0.9F);
		}
		if (overlays.show_magnetic_field) {
			append_vector(vertices, scenario, snapshot.position, snapshot.magnetic_field, 1.4, 0.38F, 0.91F, 0.98F, 1.0F);
		}
		return vertices;
	}

	if (scenario.id == ScenarioId::CapacitorPotentialField) {
		const double half_gap = std::max(scenario.plate_separation.value_or(2.0) / 2.0, 0.4);
		append_line(vertices, scenario, {-half_gap, -2.5}, {-half_gap, 2.5}, 0.98F, 0.87F, 0.41F, 1.0F);
		append_line(vertices, scenario, {half_gap, -2.5}, {half_gap, 2.5}, 0.98F, 0.87F, 0.41F, 1.0F);
		if (overlays.show_potential_guides) {
			append_line(vertices, scenario, {-half_gap, snapshot.position.y}, {half_gap, snapshot.position.y}, 0.54F, 0.79F, 0.96F, 0.9F);
		}
		if (overlays.show_field_vectors) {
			append_vector(vertices, scenario, snapshot.position, snapshot.electric_field, 0.2, 0.38F, 0.91F, 0.98F, 1.0F);
		}
		if (overlays.show_force_vectors) {
			append_vector(vertices, scenario, snapshot.position, snapshot.force, 0.22, 0.99F, 0.46F, 0.37F, 1.0F);
		}
		return vertices;
	}

	if (overlays.show_potential_guides) {
		append_line(vertices, scenario, {-1.2, 0.0}, {1.2, 0.0}, 0.54F, 0.79F, 0.96F, 0.9F);
	}
	if (overlays.show_field_vectors) {
		append_vector(vertices, scenario, snapshot.position, snapshot.magnetic_field, 0.4, 0.38F, 0.91F, 0.98F, 1.0F);
	}
	if (overlays.show_force_vectors) {
		append_vector(vertices, scenario, snapshot.position, snapshot.force, 0.22, 0.99F, 0.46F, 0.37F, 1.0F);
	}
	if (overlays.show_trajectory) {
		append_line(vertices, scenario, {-4.6, -3.1}, {-1.4, -2.3}, 0.98F, 0.87F, 0.41F, 1.0F);
	}

	return vertices;
}

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	append_marker(vertices, scenario, snapshot.position, aspect_ratio, 0.018F, 0.99F, 0.87F, 0.41F, 1.0F);

	if (scenario.id == ScenarioId::PointChargeElectrostatics) {
		append_marker(vertices, scenario, scenario.source_point.value_or(Vector2{-2.0, 0.0}), aspect_ratio, 0.014F, 0.98F, 0.51F, 0.41F, 1.0F);
		append_marker(vertices, scenario, scenario.secondary_source_point.value_or(Vector2{2.0, 0.0}), aspect_ratio, 0.014F, 0.54F, 0.79F, 0.96F, 1.0F);
	} else if (scenario.id == ScenarioId::CurrentLoopMagneticField && overlays.show_magnetic_field) {
		append_marker(vertices, scenario, {0.0, 0.0}, aspect_ratio, 0.014F, 0.54F, 0.79F, 0.96F, 1.0F);
	} else if (scenario.id == ScenarioId::CapacitorPotentialField) {
		const double half_gap = std::max(scenario.plate_separation.value_or(2.0) / 2.0, 0.4);
		append_marker(vertices, scenario, {-half_gap, 0.0}, aspect_ratio, 0.012F, 0.98F, 0.87F, 0.41F, 1.0F);
		append_marker(vertices, scenario, {half_gap, 0.0}, aspect_ratio, 0.012F, 0.98F, 0.87F, 0.41F, 1.0F);
	} else if (scenario.id == ScenarioId::ElectromagneticInduction) {
		append_marker(vertices, scenario, {-1.8, 0.0}, aspect_ratio, 0.012F, 0.54F, 0.79F, 0.96F, 1.0F);
		append_marker(vertices, scenario, {1.8, 0.0}, aspect_ratio, 0.012F, 0.54F, 0.79F, 0.96F, 1.0F);
	}

	return vertices;
}

}  // namespace visual_physics::electromagnetism