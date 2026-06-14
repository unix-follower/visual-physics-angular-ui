#include "thermodynamics_overlay.hpp"

#include <algorithm>
#include <array>

namespace visual_physics::thermodynamics {
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

void append_line(
	std::vector<OverlayVertex>& vertices,
	const Scenario& scenario,
	double start_x,
	double start_y,
	double end_x,
	double end_y,
	std::array<float, 4> color) {
	const auto start = to_ndc_point(start_x, start_y, scenario);
	const auto end = to_ndc_point(end_x, end_y, scenario);
	vertices.push_back({start.x, start.y, color[0], color[1], color[2], color[3]});
	vertices.push_back({end.x, end.y, color[0], color[1], color[2], color[3]});
}

void append_marker(
	std::vector<OverlayVertex>& vertices,
	const Scenario& scenario,
	double x,
	double y,
	float aspect_ratio,
	std::array<float, 4> color) {
	const auto center = to_ndc_point(x, y, scenario);
	const float half_width = 0.012F;
	const float safe_aspect = std::max(aspect_ratio, 0.001F);
	const float half_height = aspect_ratio >= 1.0F ? half_width * aspect_ratio : half_width / safe_aspect;
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
	if (scenario.id == ScenarioId::CarnotCycle) {
		if (overlays.show_pressure_guide) {
			append_line(
				vertices,
				scenario,
				scenario.view_bounds.min_x,
				snapshot.pressure_pascals,
				scenario.view_bounds.max_x,
				snapshot.pressure_pascals,
				{0.42F, 0.78F, 1.0F, 1.0F});
		}
		if (overlays.show_temperature_band) {
			append_line(
				vertices,
				scenario,
				snapshot.volume_cubic_meters,
				scenario.view_bounds.min_y,
				snapshot.volume_cubic_meters,
				scenario.view_bounds.max_y,
				{0.98F, 0.9F, 0.47F, 1.0F});
		}
		if (overlays.show_energy_marker) {
			append_line(
				vertices,
				scenario,
				snapshot.volume_cubic_meters,
				snapshot.pressure_pascals,
				scenario.view_bounds.min_x,
				scenario.view_bounds.min_y,
				{1.0F, 0.54F, 0.36F, 1.0F});
		}
		return vertices;
	}

	if (scenario.id == ScenarioId::HeatConductionSlab) {
		const double slab_center = scenario.slab_thickness_meters.value_or(0.0) * 0.5;
		if (overlays.show_pressure_guide) {
			append_line(
				vertices,
				scenario,
				0.0,
				snapshot.surface_temperature_celsius.value_or(0.0),
				scenario.slab_thickness_meters.value_or(0.0),
				snapshot.surface_temperature_celsius.value_or(0.0),
				{0.42F, 0.78F, 1.0F, 1.0F});
		}
		if (overlays.show_temperature_band) {
			append_line(
				vertices,
				scenario,
				slab_center,
				scenario.view_bounds.min_y,
				slab_center,
				scenario.view_bounds.max_y,
				{0.98F, 0.9F, 0.47F, 1.0F});
		}
		if (overlays.show_energy_marker) {
			append_line(
				vertices,
				scenario,
				slab_center,
				snapshot.center_temperature_celsius.value_or(0.0),
				scenario.slab_thickness_meters.value_or(0.0),
				snapshot.surface_temperature_celsius.value_or(0.0),
				{1.0F, 0.54F, 0.36F, 1.0F});
		}
		return vertices;
	}

	if (overlays.show_pressure_guide) {
		append_line(
			vertices,
			scenario,
			scenario.view_bounds.min_x,
			snapshot.pressure_pascals,
			scenario.view_bounds.max_x,
			snapshot.pressure_pascals,
			{0.42F, 0.78F, 1.0F, 1.0F});
	}
	if (overlays.show_temperature_band) {
		append_line(
			vertices,
			scenario,
			scenario.volume_cubic_meters,
			scenario.view_bounds.min_y,
			scenario.volume_cubic_meters,
			scenario.view_bounds.max_y,
			{0.98F, 0.9F, 0.47F, 1.0F});
	}
	if (overlays.show_energy_marker) {
		append_line(
			vertices,
			scenario,
			snapshot.volume_cubic_meters,
			snapshot.pressure_pascals,
			scenario.volume_cubic_meters,
			snapshot.pressure_pascals,
			{1.0F, 0.54F, 0.36F, 1.0F});
	}
	return vertices;
}

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	if (scenario.id == ScenarioId::CarnotCycle) {
		if (overlays.show_pressure_guide) {
			append_marker(
				vertices,
				scenario,
				snapshot.volume_cubic_meters,
				snapshot.pressure_pascals,
				aspect_ratio,
				{0.42F, 0.78F, 1.0F, 1.0F});
		}
		if (overlays.show_temperature_band) {
			append_marker(
				vertices,
				scenario,
				snapshot.volume_cubic_meters,
				scenario.view_bounds.max_y * 0.86,
				aspect_ratio,
				{0.98F, 0.9F, 0.47F, 1.0F});
		}
		if (overlays.show_energy_marker) {
			append_marker(
				vertices,
				scenario,
				scenario.view_bounds.min_x,
				scenario.view_bounds.min_y,
				aspect_ratio,
				{1.0F, 0.54F, 0.36F, 1.0F});
		}
		return vertices;
	}

	if (scenario.id == ScenarioId::HeatConductionSlab) {
		const double slab_center = scenario.slab_thickness_meters.value_or(0.0) * 0.5;
		if (overlays.show_pressure_guide) {
			append_marker(
				vertices,
				scenario,
				slab_center,
				snapshot.surface_temperature_celsius.value_or(0.0),
				aspect_ratio,
				{0.42F, 0.78F, 1.0F, 1.0F});
		}
		if (overlays.show_temperature_band) {
			append_marker(
				vertices,
				scenario,
				slab_center,
				snapshot.center_temperature_celsius.value_or(0.0),
				aspect_ratio,
				{0.98F, 0.9F, 0.47F, 1.0F});
		}
		if (overlays.show_energy_marker) {
			append_marker(
				vertices,
				scenario,
				scenario.slab_thickness_meters.value_or(0.0),
				snapshot.surface_temperature_celsius.value_or(0.0),
				aspect_ratio,
				{1.0F, 0.54F, 0.36F, 1.0F});
		}
		return vertices;
	}

	if (overlays.show_pressure_guide) {
		append_marker(
			vertices,
			scenario,
			snapshot.volume_cubic_meters,
			snapshot.pressure_pascals,
			aspect_ratio,
			{0.42F, 0.78F, 1.0F, 1.0F});
	}
	if (overlays.show_temperature_band) {
		append_marker(
			vertices,
			scenario,
			scenario.volume_cubic_meters,
			snapshot.pressure_pascals,
			aspect_ratio,
			{0.98F, 0.9F, 0.47F, 1.0F});
	}
	if (overlays.show_energy_marker) {
		append_marker(
			vertices,
			scenario,
			snapshot.volume_cubic_meters,
			scenario.view_bounds.max_y * 0.92,
			aspect_ratio,
			{1.0F, 0.54F, 0.36F, 1.0F});
	}
	return vertices;
}

}  // namespace visual_physics::thermodynamics