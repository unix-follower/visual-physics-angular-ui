#include "fluid_mechanics_core.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace visual_physics::fluid_mechanics {
namespace {

constexpr double kPi = 3.14159265358979323846;

const std::array<Scenario, 3> kDefaultScenarios{{
	{
		ScenarioId::BuoyancyBlock,
		"Buoyancy of a Floating Block",
		"Estimate floating equilibrium for a rectangular block submerged in a fluid.",
		"rho_f g V_disp = rho_b g V_block",
		"Implemented",
		1.0,
		{0.0, 10.0, 0.0, 8.0},
		"Buoyant force, displaced volume, immersion ratio, and equilibrium depth",
		9.81,
		1000.0,
		600.0,
		1.2,
		0.6,
		0.5,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::PoiseuillePipe,
		"Laminar Pipe Flow",
		"Estimate steady laminar flow through a circular pipe under a pressure drop.",
		"Q = pi R^4 DeltaP / (8 mu L), v_avg = Q / (pi R^2), Re = 2 rho v_avg R / mu",
		"Implemented",
		1.0,
		{0.0, 12.0, 0.0, 10.0},
		"Poiseuille flow rate, average velocity, centerline velocity, and laminar Reynolds-number diagnostics",
		9.81,
		998.0,
		0.0,
		0.0,
		0.0,
		0.0,
		0.045,
		12.0,
		100.0,
		0.01,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::OpenChannelFlow,
		"Uniform Open-Channel Flow",
		"Estimate steady uniform flow in a rectangular channel with Manning-type roughness diagnostics.",
		"Q = (1 / n) A R_h^(2/3) S^(1/2), Fr = V / sqrt(g y)",
		"Implemented",
		1.0,
		{0.0, 18.0, 0.0, 10.0},
		"Rectangular-channel discharge, hydraulic radius, subcritical Froude behavior, and bed-slope guidance",
		9.81,
		1000.0,
		0.0,
		0.0,
		0.0,
		0.0,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		3.0,
		1.2,
		0.0015,
		0.03,
		30.0,
	},
}};

double clamp(double value, double min, double max) {
	return std::min(std::max(value, min), max);
}

bool nearly_equal(double left, double right, double tolerance = 1e-6) {
	return std::abs(left - right) <= tolerance;
}

double block_volume(const Scenario& scenario) {
	return std::max(scenario.block_width, 1e-6) *
		std::max(scenario.block_height, 1e-6) *
		std::max(scenario.block_depth, 1e-6);
}

double displacement_volume(const Scenario& scenario, double submersion_depth) {
	return std::max(scenario.block_width, 1e-6) *
		std::max(scenario.block_depth, 1e-6) *
		clamp(submersion_depth, 0.0, std::max(scenario.block_height, 1e-6));
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

Snapshot build_snapshot(const Scenario& scenario, double time_seconds, double submersion_depth) {
	if (scenario.id == ScenarioId::OpenChannelFlow) {
		const double gravity = std::max(scenario.gravity, 1e-6);
		const double channel_width = std::max(scenario.channel_width.value_or(0.0), 1e-6);
		const double channel_depth = std::max(scenario.channel_depth.value_or(0.0), 1e-6);
		const double channel_slope = std::max(scenario.channel_slope.value_or(0.0), 1e-8);
		const double roughness = std::max(scenario.roughness_coefficient.value_or(0.0), 1e-6);
		const double area = channel_width * channel_depth;
		const double wetted_perimeter = channel_width + 2.0 * channel_depth;
		const double hydraulic_radius = area / wetted_perimeter;
		const double discharge =
			(1.0 / roughness) * area * std::pow(hydraulic_radius, 2.0 / 3.0) * std::sqrt(channel_slope);
		const double average_velocity = discharge / area;
		const double froude_number = average_velocity / std::sqrt(gravity * channel_depth);

		return {
			.time_seconds = time_seconds,
			.equilibrium_depth = 0.0,
			.immersion_ratio = 0.0,
			.displaced_volume = 0.0,
			.buoyant_force = 0.0,
			.weight_force = 0.0,
			.net_force = 0.0,
			.volumetric_flow_rate = std::nullopt,
			.average_velocity = average_velocity,
			.centerline_velocity = std::nullopt,
			.reynolds_number = std::nullopt,
			.pressure_gradient = std::nullopt,
			.discharge = discharge,
			.hydraulic_radius = hydraulic_radius,
			.froude_number = froude_number,
			.stable = froude_number < 1.0,
		};
	}

	if (scenario.id == ScenarioId::PoiseuillePipe) {
		const double fluid_density = std::max(scenario.fluid_density, 1e-6);
		const double pipe_radius = std::max(scenario.pipe_radius.value_or(0.0), 1e-6);
		const double pipe_length = std::max(scenario.pipe_length.value_or(0.0), 1e-6);
		const double pressure_drop = std::max(scenario.pressure_drop.value_or(0.0), 1e-6);
		const double dynamic_viscosity = std::max(scenario.dynamic_viscosity.value_or(0.0), 1e-6);
		const double volumetric_flow_rate =
			(kPi * std::pow(pipe_radius, 4) * pressure_drop) /
			(8.0 * dynamic_viscosity * pipe_length);
		const double average_velocity = volumetric_flow_rate / (kPi * pipe_radius * pipe_radius);
		const double centerline_velocity = average_velocity * 2.0;
		const double reynolds_number =
			(2.0 * fluid_density * average_velocity * pipe_radius) / dynamic_viscosity;
		const double pressure_gradient = pressure_drop / pipe_length;

		return {
			.time_seconds = time_seconds,
			.equilibrium_depth = 0.0,
			.immersion_ratio = 0.0,
			.displaced_volume = 0.0,
			.buoyant_force = 0.0,
			.weight_force = 0.0,
			.net_force = 0.0,
			.volumetric_flow_rate = volumetric_flow_rate,
			.average_velocity = average_velocity,
			.centerline_velocity = centerline_velocity,
			.reynolds_number = reynolds_number,
			.pressure_gradient = pressure_gradient,
			.discharge = std::nullopt,
			.hydraulic_radius = std::nullopt,
			.froude_number = std::nullopt,
			.stable = reynolds_number < 2300.0,
		};
	}

	const double safe_gravity = std::max(scenario.gravity, 1e-6);
	const double safe_fluid_density = std::max(scenario.fluid_density, 1e-6);
	const double safe_block_density = std::max(scenario.block_density, 1e-6);
	const double safe_block_height = std::max(scenario.block_height, 1e-6);
	const double equilibrium_ratio = clamp(safe_block_density / safe_fluid_density, 0.0, 1.0);
	const double equilibrium_depth = equilibrium_ratio * safe_block_height;
	const double active_submersion_depth =
		submersion_depth < 0.0 ? equilibrium_depth : clamp(submersion_depth, 0.0, safe_block_height);
	const double displaced_volume = displacement_volume(scenario, active_submersion_depth);
	const double buoyant_force = safe_fluid_density * safe_gravity * displaced_volume;
	const double weight_force = safe_block_density * safe_gravity * block_volume(scenario);
	const double net_force = buoyant_force - weight_force;

	return {
		.time_seconds = time_seconds,
		.equilibrium_depth = equilibrium_depth,
		.immersion_ratio = clamp(active_submersion_depth / safe_block_height, 0.0, 1.0),
		.displaced_volume = displaced_volume,
		.buoyant_force = buoyant_force,
		.weight_force = weight_force,
		.net_force = net_force,
		.volumetric_flow_rate = std::nullopt,
		.average_velocity = std::nullopt,
		.centerline_velocity = std::nullopt,
		.reynolds_number = std::nullopt,
		.pressure_gradient = std::nullopt,
		.discharge = std::nullopt,
		.hydraulic_radius = std::nullopt,
		.froude_number = std::nullopt,
		.stable = safe_block_density <= safe_fluid_density && nearly_equal(net_force, 0.0, 1e-4),
	};
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::BuoyancyBlock:
		return "buoyancy-block";
	case ScenarioId::PoiseuillePipe:
		return "poiseuille-pipe";
	case ScenarioId::OpenChannelFlow:
		return "open-channel-flow";
	}

	throw std::runtime_error("Unknown fluid mechanics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "buoyancy-block") {
		return ScenarioId::BuoyancyBlock;
	}
	if (value == "poiseuille-pipe") {
		return ScenarioId::PoiseuillePipe;
	}
	if (value == "open-channel-flow") {
		return ScenarioId::OpenChannelFlow;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	const auto match = std::find_if(
		kDefaultScenarios.begin(),
		kDefaultScenarios.end(),
		[id](const Scenario& scenario) { return scenario.id == id; });
	if (match == kDefaultScenarios.end()) {
		throw std::runtime_error("Unsupported fluid mechanics scenario id");
	}
	return *match;
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	return build_snapshot(scenario, time_seconds, -1.0);
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	const std::size_t resolved_sample_count = std::max<std::size_t>(sample_count, 2);
	if (scenario.id == ScenarioId::PoiseuillePipe) {
		const double pipe_length = std::max(scenario.pipe_length.value_or(0.0), 1e-6);
		const double pressure_drop = std::max(scenario.pressure_drop.value_or(0.0), 1e-6);
		const auto snapshot = sample_scenario(scenario, 0.0);
		std::vector<Sample> samples;
		samples.reserve(resolved_sample_count);
		for (std::size_t index = 0; index < resolved_sample_count; index += 1) {
			const double alpha = resolved_sample_count == 1
				? 0.0
				: static_cast<double>(index) / static_cast<double>(resolved_sample_count - 1);
			samples.push_back({
				.time_seconds = alpha * scenario.duration_seconds,
				.submersion_depth = 0.0,
				.displaced_volume = 0.0,
				.buoyant_force = 0.0,
				.weight_force = 0.0,
				.net_force = 0.0,
				.immersion_ratio = 0.0,
				.axial_position = pipe_length * alpha,
				.pressure = pressure_drop * (1.0 - alpha),
				.average_velocity = snapshot.average_velocity,
				.reynolds_number = snapshot.reynolds_number,
				.stable = snapshot.stable,
			});
		}
		return samples;
	}
	if (scenario.id == ScenarioId::OpenChannelFlow) {
		const double channel_length = std::max(scenario.channel_length.value_or(0.0), 1e-6);
		const double channel_depth = std::max(scenario.channel_depth.value_or(0.0), 1e-6);
		const double channel_slope = std::max(scenario.channel_slope.value_or(0.0), 1e-8);
		const auto snapshot = sample_scenario(scenario, 0.0);
		std::vector<Sample> samples;
		samples.reserve(resolved_sample_count);
		for (std::size_t index = 0; index < resolved_sample_count; index += 1) {
			const double alpha = resolved_sample_count == 1
				? 0.0
				: static_cast<double>(index) / static_cast<double>(resolved_sample_count - 1);
			const double axial_position = channel_length * alpha;
			const double bed_elevation = -channel_slope * axial_position;
			samples.push_back({
				.time_seconds = alpha * scenario.duration_seconds,
				.submersion_depth = 0.0,
				.displaced_volume = 0.0,
				.buoyant_force = 0.0,
				.weight_force = 0.0,
				.net_force = 0.0,
				.immersion_ratio = 0.0,
				.axial_position = axial_position,
				.pressure = std::nullopt,
				.average_velocity = snapshot.average_velocity,
				.reynolds_number = std::nullopt,
				.bed_elevation = bed_elevation,
				.water_surface_elevation = bed_elevation + channel_depth,
				.discharge = snapshot.discharge,
				.froude_number = snapshot.froude_number,
				.stable = snapshot.stable,
			});
		}
		return samples;
	}

	std::vector<Sample> samples;
	samples.reserve(resolved_sample_count);
	for (std::size_t index = 0; index < resolved_sample_count; index += 1) {
		const double alpha = resolved_sample_count == 1
			? 0.0
			: static_cast<double>(index) / static_cast<double>(resolved_sample_count - 1);
		const double submersion_depth = scenario.block_height * alpha;
		const auto snapshot = build_snapshot(scenario, alpha * scenario.duration_seconds, submersion_depth);
		samples.push_back({
			.time_seconds = snapshot.time_seconds,
			.submersion_depth = submersion_depth,
			.displaced_volume = snapshot.displaced_volume,
			.buoyant_force = snapshot.buoyant_force,
			.weight_force = snapshot.weight_force,
			.net_force = snapshot.net_force,
			.immersion_ratio = snapshot.immersion_ratio,
			.axial_position = std::nullopt,
			.pressure = std::nullopt,
			.average_velocity = std::nullopt,
			.reynolds_number = std::nullopt,
			.bed_elevation = std::nullopt,
			.water_surface_elevation = std::nullopt,
			.discharge = std::nullopt,
			.froude_number = std::nullopt,
			.stable = snapshot.stable,
		});
	}
	return samples;
}

std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario) {
	return {
		to_ndc_point(scenario.view_bounds.min_x, 0.0, scenario),
		to_ndc_point(scenario.view_bounds.max_x, 0.0, scenario),
		to_ndc_point(0.0, scenario.view_bounds.min_y, scenario),
		to_ndc_point(0.0, scenario.view_bounds.max_y, scenario),
	};
}

std::vector<NormalizedVertex> build_scenario_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario) {
	std::vector<NormalizedVertex> vertices;
	auto append_line = [&](double start_x, double start_y, double end_x, double end_y) {
		vertices.push_back(to_ndc_point(start_x, start_y, scenario));
		vertices.push_back(to_ndc_point(end_x, end_y, scenario));
	};

	if (scenario.id == ScenarioId::PoiseuillePipe) {
		const double pipe_left = 1.2;
		const double pipe_right = 10.8;
		const double center_y = 5.0;
		const double pipe_half_height = 1.0 + std::min(scenario.pipe_radius.value_or(0.0) * 12.0, 0.9);

		append_line(pipe_left, center_y - pipe_half_height, pipe_right, center_y - pipe_half_height);
		append_line(pipe_left, center_y + pipe_half_height, pipe_right, center_y + pipe_half_height);
		append_line(pipe_left, center_y - pipe_half_height, pipe_left, center_y + pipe_half_height);
		append_line(pipe_right, center_y - pipe_half_height, pipe_right, center_y + pipe_half_height);
		return vertices;
	}
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

		append_line(channel_left, upstream_bed_y, channel_right, downstream_bed_y);
		append_line(channel_left, upstream_bed_y, channel_left, left_bank_top);
		append_line(channel_right, downstream_bed_y, channel_right, right_bank_top);
		append_line(channel_left, upstream_water_y, channel_right, downstream_water_y);
		return vertices;
	}

	const double tank_left = 2.0;
	const double tank_right = 8.0;
	const double tank_bottom = 1.0;
	const double tank_top = 6.6;
	const double waterline_y = 5.0;
	const double block_left = 4.4;
	const double block_right = block_left + scenario.block_width;
	const double block_bottom = waterline_y - snapshot.equilibrium_depth;
	const double block_top = block_bottom + scenario.block_height;

	append_line(tank_left, tank_bottom, tank_left, tank_top);
	append_line(tank_right, tank_bottom, tank_right, tank_top);
	append_line(tank_left, tank_bottom, tank_right, tank_bottom);
	append_line(tank_left, waterline_y, tank_right, waterline_y);
	append_line(block_left, block_bottom, block_right, block_bottom);
	append_line(block_left, block_top, block_right, block_top);
	append_line(block_left, block_bottom, block_left, block_top);
	append_line(block_right, block_bottom, block_right, block_top);

	return vertices;
}

std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio) {
	if (scenario.id == ScenarioId::PoiseuillePipe) {
		const auto center = to_ndc_point(6.0, 5.0, scenario);
		const float half_width = 0.03F;
		const float safe_aspect = std::max(aspect_ratio, 0.001F);
		const float half_height = aspect_ratio >= 1.0F ? half_width * aspect_ratio : half_width / safe_aspect;

		return {
			{center.x - half_width, center.y - half_height},
			{center.x + half_width, center.y - half_height},
			{center.x - half_width, center.y + half_height},
			{center.x - half_width, center.y + half_height},
			{center.x + half_width, center.y - half_height},
			{center.x + half_width, center.y + half_height},
		};
	}
	if (scenario.id == ScenarioId::OpenChannelFlow) {
		const double channel_left = 1.2;
		const double channel_right = 16.2;
		const double upstream_bed_y = 2.2;
		const double channel_length = std::max(scenario.channel_length.value_or(0.0), 1e-6);
		const double channel_slope = std::max(scenario.channel_slope.value_or(0.0), 1e-6);
		const double channel_depth = std::max(scenario.channel_depth.value_or(0.0), 1e-6);
		const double bed_drop = std::min(channel_length * channel_slope * 1.2, 2.2);
		const double downstream_bed_y = upstream_bed_y - bed_drop;
		const double water_offset = std::min(channel_depth * 0.85, 2.6);
		const auto center = to_ndc_point(
			(channel_left + channel_right) * 0.5,
			(upstream_bed_y + water_offset + downstream_bed_y) * 0.5,
			scenario);
		const float half_width = 0.03F;
		const float safe_aspect = std::max(aspect_ratio, 0.001F);
		const float half_height = aspect_ratio >= 1.0F ? half_width * aspect_ratio : half_width / safe_aspect;

		return {
			{center.x - half_width, center.y - half_height},
			{center.x + half_width, center.y - half_height},
			{center.x - half_width, center.y + half_height},
			{center.x - half_width, center.y + half_height},
			{center.x + half_width, center.y - half_height},
			{center.x + half_width, center.y + half_height},
		};
	}

	const double waterline_y = 5.0;
	const double block_center_x = 5.0;
	const double block_center_y = waterline_y - snapshot.equilibrium_depth + scenario.block_height * 0.5;
	const auto center = to_ndc_point(block_center_x, block_center_y, scenario);
	const float half_width = 0.02F;
	const float safe_aspect = std::max(aspect_ratio, 0.001F);
	const float half_height = aspect_ratio >= 1.0F ? half_width * aspect_ratio : half_width / safe_aspect;

	return {
		{center.x - half_width, center.y - half_height},
		{center.x + half_width, center.y - half_height},
		{center.x - half_width, center.y + half_height},
		{center.x - half_width, center.y + half_height},
		{center.x + half_width, center.y - half_height},
		{center.x + half_width, center.y + half_height},
	};
}

}  // namespace visual_physics::fluid_mechanics