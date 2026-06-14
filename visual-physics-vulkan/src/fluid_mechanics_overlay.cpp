#include "fluid_mechanics_overlay.hpp"

#include <algorithm>
#include <array>

namespace visual_physics::fluid_mechanics {
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
	if (scenario.id == ScenarioId::OpenChannelFlow) {
		const double channel_left = 1.2;
		const double channel_right = 16.2;
		const double upstream_bed_y = 2.2;
		const double channel_length = std::max(scenario.channel_length.value_or(0.0), 1e-6);
		const double channel_slope = std::max(scenario.channel_slope.value_or(0.0), 1e-6);
		const double channel_depth = std::max(scenario.channel_depth.value_or(0.0), 1e-6);
		const double bed_drop = std::min(channel_length * channel_slope * 1.2, 2.2);
		const double downstream_bed_y = upstream_bed_y - bed_drop;
		const double left_bank_top = 8.1;
		const double right_bank_top = 7.1;
		const double water_offset = std::min(channel_depth * 0.85, 2.6);
		const double upstream_water_y = upstream_bed_y + water_offset;
		const double downstream_water_y = downstream_bed_y + water_offset;

		if (overlays.show_waterline) {
			append_line(vertices, scenario, channel_left, upstream_water_y, channel_right, downstream_water_y, {0.42F, 0.78F, 1.0F, 1.0F});
		}
		if (overlays.show_equilibrium_guide) {
			append_line(vertices, scenario, channel_left + 0.6, left_bank_top - 0.4, channel_right - 0.6, right_bank_top - 1.2, {0.98F, 0.9F, 0.47F, 1.0F});
			append_line(vertices, scenario, channel_left + 0.6, left_bank_top - 0.4, channel_left + 0.6, upstream_bed_y + 0.2, {0.98F, 0.9F, 0.47F, 1.0F});
			append_line(vertices, scenario, channel_right - 0.6, right_bank_top - 1.2, channel_right - 0.6, downstream_bed_y + 0.2, {0.98F, 0.9F, 0.47F, 1.0F});
		}
		if (overlays.show_force_guides) {
			append_line(vertices, scenario, 3.2, upstream_water_y - 0.55, 5.1, upstream_water_y - 0.7, {0.44F, 0.92F, 0.64F, 1.0F});
			append_line(vertices, scenario, 7.1, (upstream_water_y + downstream_water_y) * 0.5 - 0.2, 9.2, (upstream_water_y + downstream_water_y) * 0.5 - 0.35, {0.44F, 0.92F, 0.64F, 1.0F});
			append_line(vertices, scenario, 11.4, downstream_water_y - 0.15, 13.7, downstream_water_y - 0.3, {0.44F, 0.92F, 0.64F, 1.0F});
		}
		if (snapshot.froude_number.value_or(0.0) < 1.0) {
			append_line(vertices, scenario, 4.6, upstream_water_y - 0.95, 12.4, downstream_water_y - 0.95, {1.0F, 0.54F, 0.36F, 1.0F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::PoiseuillePipe) {
		const double pipe_left = 1.2;
		const double pipe_right = 10.8;
		const double center_y = 5.0;
		const double pipe_half_height = 1.0 + std::min(scenario.pipe_radius.value_or(0.0) * 12.0, 0.9);
		const double inlet_x = pipe_left + 0.5;
		const double outlet_x = pipe_right - 0.5;

		if (overlays.show_waterline) {
			append_line(vertices, scenario, pipe_left + 0.2, center_y, pipe_right - 0.2, center_y, {0.42F, 0.78F, 1.0F, 1.0F});
		}
		if (overlays.show_equilibrium_guide) {
			append_line(vertices, scenario, inlet_x, 8.2, outlet_x, 7.1, {0.98F, 0.9F, 0.47F, 1.0F});
			append_line(vertices, scenario, inlet_x, 8.2, inlet_x, center_y + pipe_half_height + 0.2, {0.98F, 0.9F, 0.47F, 1.0F});
			append_line(vertices, scenario, outlet_x, 7.1, outlet_x, center_y + pipe_half_height + 0.2, {0.98F, 0.9F, 0.47F, 1.0F});
		}
		if (overlays.show_force_guides) {
			append_line(vertices, scenario, 2.4, center_y, 4.1, center_y, {0.44F, 0.92F, 0.64F, 1.0F});
			append_line(vertices, scenario, 5.1, center_y, 6.8, center_y, {0.44F, 0.92F, 0.64F, 1.0F});
			append_line(vertices, scenario, 7.8, center_y, 9.5, center_y, {0.44F, 0.92F, 0.64F, 1.0F});
		}
		if (snapshot.centerline_velocity.value_or(0.0) > snapshot.average_velocity.value_or(0.0)) {
			append_line(vertices, scenario, 3.2, center_y + 0.25, 8.8, center_y + 0.25, {1.0F, 0.54F, 0.36F, 1.0F});
		}
		return vertices;
	}

	const double waterline_y = 5.0;
	const double block_center_x = 5.0;
	const double block_center_y = waterline_y - snapshot.equilibrium_depth + scenario.block_height * 0.5;
	const double force_scale = 0.0004;

	if (overlays.show_waterline) {
		append_line(vertices, scenario, 2.0, waterline_y, 8.0, waterline_y, {0.42F, 0.78F, 1.0F, 1.0F});
	}
	if (overlays.show_equilibrium_guide) {
		append_line(vertices, scenario, 3.3, waterline_y, 3.3, waterline_y - snapshot.equilibrium_depth, {0.98F, 0.9F, 0.47F, 1.0F});
	}
	if (overlays.show_force_guides) {
		append_line(vertices, scenario, block_center_x, block_center_y, block_center_x, block_center_y + snapshot.buoyant_force * force_scale, {0.44F, 0.92F, 0.64F, 1.0F});
		append_line(vertices, scenario, block_center_x + 0.5, block_center_y, block_center_x + 0.5, block_center_y - snapshot.weight_force * force_scale, {1.0F, 0.54F, 0.36F, 1.0F});
	}

	return vertices;
}

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	if (scenario.id == ScenarioId::OpenChannelFlow) {
		const double channel_left = 1.2;
		const double channel_right = 16.2;
		const double upstream_bed_y = 2.2;
		const double channel_length = std::max(scenario.channel_length.value_or(0.0), 1e-6);
		const double channel_slope = std::max(scenario.channel_slope.value_or(0.0), 1e-6);
		const double channel_depth = std::max(scenario.channel_depth.value_or(0.0), 1e-6);
		const double bed_drop = std::min(channel_length * channel_slope * 1.2, 2.2);
		const double downstream_bed_y = upstream_bed_y - bed_drop;
		const double left_bank_top = 8.1;
		const double right_bank_top = 7.1;
		const double water_offset = std::min(channel_depth * 0.85, 2.6);
		const double upstream_water_y = upstream_bed_y + water_offset;
		const double downstream_water_y = downstream_bed_y + water_offset;

		if (overlays.show_equilibrium_guide) {
			append_marker(vertices, scenario, channel_left + 0.6, left_bank_top - 0.4, aspect_ratio, {0.98F, 0.9F, 0.47F, 1.0F});
			append_marker(vertices, scenario, channel_right - 0.6, right_bank_top - 1.2, aspect_ratio, {0.98F, 0.9F, 0.47F, 1.0F});
		}
		if (overlays.show_force_guides) {
			append_marker(vertices, scenario, 5.1, upstream_water_y - 0.7, aspect_ratio, {0.44F, 0.92F, 0.64F, 1.0F});
			append_marker(vertices, scenario, 9.2, (upstream_water_y + downstream_water_y) * 0.5 - 0.35, aspect_ratio, {0.44F, 0.92F, 0.64F, 1.0F});
			append_marker(vertices, scenario, 13.7, downstream_water_y - 0.3, aspect_ratio, {0.44F, 0.92F, 0.64F, 1.0F});
		}
		if (snapshot.froude_number.value_or(0.0) < 1.0) {
			append_marker(vertices, scenario, 12.4, downstream_water_y - 0.95, aspect_ratio, {1.0F, 0.54F, 0.36F, 1.0F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::PoiseuillePipe) {
		const double center_y = 5.0;
		if (overlays.show_equilibrium_guide) {
			append_marker(vertices, scenario, 1.7, 8.2, aspect_ratio, {0.98F, 0.9F, 0.47F, 1.0F});
			append_marker(vertices, scenario, 10.3, 7.1, aspect_ratio, {0.98F, 0.9F, 0.47F, 1.0F});
		}
		if (overlays.show_force_guides) {
			append_marker(vertices, scenario, 4.1, center_y, aspect_ratio, {0.44F, 0.92F, 0.64F, 1.0F});
			append_marker(vertices, scenario, 6.8, center_y, aspect_ratio, {0.44F, 0.92F, 0.64F, 1.0F});
			append_marker(vertices, scenario, 9.5, center_y, aspect_ratio, {0.44F, 0.92F, 0.64F, 1.0F});
		}
		if (snapshot.centerline_velocity.value_or(0.0) > snapshot.average_velocity.value_or(0.0)) {
			append_marker(vertices, scenario, 8.8, center_y + 0.25, aspect_ratio, {1.0F, 0.54F, 0.36F, 1.0F});
		}
		return vertices;
	}

	const double waterline_y = 5.0;
	const double block_center_x = 5.0;
	const double block_center_y = waterline_y - snapshot.equilibrium_depth + scenario.block_height * 0.5;
	const double force_scale = 0.0004;

	if (overlays.show_equilibrium_guide) {
		append_marker(vertices, scenario, 3.3, waterline_y - snapshot.equilibrium_depth, aspect_ratio, {0.98F, 0.9F, 0.47F, 1.0F});
	}
	if (overlays.show_force_guides) {
		append_marker(vertices, scenario, block_center_x, block_center_y + snapshot.buoyant_force * force_scale, aspect_ratio, {0.44F, 0.92F, 0.64F, 1.0F});
		append_marker(vertices, scenario, block_center_x + 0.5, block_center_y - snapshot.weight_force * force_scale, aspect_ratio, {1.0F, 0.54F, 0.36F, 1.0F});
	}

	return vertices;
}

}  // namespace visual_physics::fluid_mechanics