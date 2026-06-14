#include "thermodynamics_core.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace visual_physics::thermodynamics {
namespace {

constexpr double kPi = 3.14159265358979323846;

const std::array<Scenario, 3> kDefaultScenarios{{
	{
		ScenarioId::IdealGasState,
		"Ideal Gas State",
		"Track an isothermal ideal-gas compression and expansion path with density and internal-energy diagnostics.",
		"pV = nRT, rho = nM / V, U = (f / 2) nRT",
		"Implemented",
		6.0,
		{0.04, 0.14, 60000.0, 280000.0},
		"Pressure-volume path, density shift, and internal-energy baseline for a closed gas parcel",
		8.314462618,
		4.0,
		320.0,
		0.095,
		0.02897,
		5.0,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::HeatConductionSlab,
		"Transient Heat Conduction in a Slab",
		"Track the centerline temperature, inward heat flux, and transient diffusion state for a plane wall under fixed boundary temperature.",
		"Fo = alpha t / L_c^2, theta/theta_i ~= exp(-pi^2 Fo), q\" = k (T_b - T_c) / L_c",
		"Implemented",
		240.0,
		{0.0, 0.08, 20.0, 150.0},
		"Transient centerline diffusion, Fourier-number progress, boundary-driven heating, and slab temperature-profile cues",
		0.0,
		0.0,
		0.0,
		0.0,
		0.0,
		0.0,
		0.08,
		1.35,
		0.0000012,
		25.0,
		145.0,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
	},
	{
		ScenarioId::CarnotCycle,
		"Carnot Cycle",
		"Follow the idealized reversible heat-engine loop across hot isotherm, adiabatic expansion, cold isotherm, and adiabatic compression stages.",
		"eta = 1 - T_c/T_h, Q_h = nRT_h ln r, Q_c = nRT_c ln r, W = Q_h - Q_c",
		"Implemented",
		400.0,
		{0.01, 0.08, 40000.0, 420000.0},
		"Carnot efficiency, reversible heat transfer, cycle-stage diagnostics, and sampled pressure-volume loop geometry",
		8.314462618,
		1.2,
		0.0,
		0.0,
		0.0,
		0.0,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		600.0,
		320.0,
		0.015,
		2.2,
	},
}};

constexpr double kHeatCapacityRatio = 1.4;

struct CarnotDerivedValues {
	double amount_moles;
	double hot_reservoir_temperature_kelvin;
	double cold_reservoir_temperature_kelvin;
	double minimum_volume_cubic_meters;
	double maximum_isothermal_volume_cubic_meters;
	double adiabatic_factor;
	double hot_end_volume_cubic_meters;
	double cold_start_volume_cubic_meters;
	double cold_end_volume_cubic_meters;
	double thermal_efficiency;
	double absorbed_heat_kj;
	double rejected_heat_kj;
	double net_work_kj;
	double entropy_transfer_kj_per_k;
	double isochoric_heat_capacity;
};

CarnotDerivedValues build_carnot_derived_values(const Scenario& scenario) {
	const double amount_moles = std::max(scenario.molar_amount, 1e-6);
	const double hot_reservoir_temperature_kelvin =
		std::max(scenario.hot_reservoir_temperature_kelvin.value_or(0.0), 1.0);
	const double cold_reservoir_temperature_kelvin = std::clamp(
		scenario.cold_reservoir_temperature_kelvin.value_or(hot_reservoir_temperature_kelvin * 0.5),
		1.0,
		hot_reservoir_temperature_kelvin - 1.0);
	const double minimum_volume_cubic_meters =
		std::max(scenario.cycle_min_volume_cubic_meters.value_or(0.0), 0.001);
	const double cycle_volume_ratio = std::max(scenario.cycle_volume_ratio.value_or(0.0), 1.05);
	const double maximum_isothermal_volume_cubic_meters =
		minimum_volume_cubic_meters * cycle_volume_ratio;
	const double adiabatic_factor = std::pow(
		hot_reservoir_temperature_kelvin / cold_reservoir_temperature_kelvin,
		1.0 / (kHeatCapacityRatio - 1.0));
	const double hot_end_volume_cubic_meters = maximum_isothermal_volume_cubic_meters;
	const double cold_start_volume_cubic_meters = hot_end_volume_cubic_meters * adiabatic_factor;
	const double cold_end_volume_cubic_meters = minimum_volume_cubic_meters * adiabatic_factor;
	const double absorbed_heat_kj =
		(amount_moles * scenario.gas_constant * hot_reservoir_temperature_kelvin * std::log(cycle_volume_ratio)) /
		1000.0;
	const double rejected_heat_kj =
		(amount_moles * scenario.gas_constant * cold_reservoir_temperature_kelvin * std::log(cycle_volume_ratio)) /
		1000.0;
	const double thermal_efficiency =
		1.0 - cold_reservoir_temperature_kelvin / hot_reservoir_temperature_kelvin;
	const double net_work_kj = absorbed_heat_kj - rejected_heat_kj;
	const double entropy_transfer_kj_per_k = absorbed_heat_kj / hot_reservoir_temperature_kelvin;
	const double isochoric_heat_capacity = scenario.gas_constant / (kHeatCapacityRatio - 1.0);

	return {
		.amount_moles = amount_moles,
		.hot_reservoir_temperature_kelvin = hot_reservoir_temperature_kelvin,
		.cold_reservoir_temperature_kelvin = cold_reservoir_temperature_kelvin,
		.minimum_volume_cubic_meters = minimum_volume_cubic_meters,
		.maximum_isothermal_volume_cubic_meters = maximum_isothermal_volume_cubic_meters,
		.adiabatic_factor = adiabatic_factor,
		.hot_end_volume_cubic_meters = hot_end_volume_cubic_meters,
		.cold_start_volume_cubic_meters = cold_start_volume_cubic_meters,
		.cold_end_volume_cubic_meters = cold_end_volume_cubic_meters,
		.thermal_efficiency = thermal_efficiency,
		.absorbed_heat_kj = absorbed_heat_kj,
		.rejected_heat_kj = rejected_heat_kj,
		.net_work_kj = net_work_kj,
		.entropy_transfer_kj_per_k = entropy_transfer_kj_per_k,
		.isochoric_heat_capacity = isochoric_heat_capacity,
	};
}

double clamp(double value, double minimum, double maximum) {
	return std::min(std::max(value, minimum), maximum);
}

double oscillating_volume(const Scenario& scenario, double time_seconds) {
	const double phase = scenario.duration_seconds <= 1e-6
		? 0.0
		: (2.0 * kPi * time_seconds) / scenario.duration_seconds;
	const double modulation = 1.0 + 0.18 * std::sin(phase);
	return std::max(scenario.volume_cubic_meters * modulation, 1e-4);
}

Snapshot build_snapshot(const Scenario& scenario, double time_seconds) {
	if (scenario.id == ScenarioId::CarnotCycle) {
		const auto derived = build_carnot_derived_values(scenario);
		const double cycle_progress =
			clamp(time_seconds / std::max(scenario.duration_seconds, 1e-6), 0.0, 1.0);
		const double segment_progress = cycle_progress * 4.0;
		double local_progress = 0.0;
		double temperature_kelvin = derived.hot_reservoir_temperature_kelvin;
		double volume_cubic_meters = derived.minimum_volume_cubic_meters;
		std::string cycle_stage_label;

		if (segment_progress < 1.0) {
			local_progress = segment_progress;
			volume_cubic_meters =
				derived.minimum_volume_cubic_meters +
				(derived.hot_end_volume_cubic_meters - derived.minimum_volume_cubic_meters) * local_progress;
			temperature_kelvin = derived.hot_reservoir_temperature_kelvin;
			cycle_stage_label = "Isothermal expansion";
		} else if (segment_progress < 2.0) {
			local_progress = segment_progress - 1.0;
			volume_cubic_meters =
				derived.hot_end_volume_cubic_meters +
				(derived.cold_start_volume_cubic_meters - derived.hot_end_volume_cubic_meters) * local_progress;
			temperature_kelvin =
				derived.hot_reservoir_temperature_kelvin *
				std::pow(derived.hot_end_volume_cubic_meters / volume_cubic_meters, kHeatCapacityRatio - 1.0);
			cycle_stage_label = "Adiabatic expansion";
		} else if (segment_progress < 3.0) {
			local_progress = segment_progress - 2.0;
			volume_cubic_meters =
				derived.cold_start_volume_cubic_meters +
				(derived.cold_end_volume_cubic_meters - derived.cold_start_volume_cubic_meters) * local_progress;
			temperature_kelvin = derived.cold_reservoir_temperature_kelvin;
			cycle_stage_label = "Isothermal compression";
		} else {
			local_progress = segment_progress - 3.0;
			volume_cubic_meters =
				derived.cold_end_volume_cubic_meters +
				(derived.minimum_volume_cubic_meters - derived.cold_end_volume_cubic_meters) * local_progress;
			temperature_kelvin =
				derived.cold_reservoir_temperature_kelvin *
				std::pow(derived.cold_end_volume_cubic_meters / volume_cubic_meters, kHeatCapacityRatio - 1.0);
			cycle_stage_label = "Adiabatic compression";
		}

		const double pressure_pascals =
			(derived.amount_moles * scenario.gas_constant * temperature_kelvin) / volume_cubic_meters;
		const double internal_energy_joules =
			derived.amount_moles * derived.isochoric_heat_capacity * temperature_kelvin;

		return {
			.time_seconds = time_seconds,
			.pressure_pascals = pressure_pascals,
			.density_kg_m3 = 0.0,
			.internal_energy_joules = internal_energy_joules,
			.temperature_kelvin = temperature_kelvin,
			.volume_cubic_meters = volume_cubic_meters,
			.center_temperature_celsius = std::nullopt,
			.surface_temperature_celsius = std::nullopt,
			.heat_flux_w_per_m2 = std::nullopt,
			.fourier_number = std::nullopt,
			.normalized_temperature = std::nullopt,
			.thermal_efficiency = derived.thermal_efficiency,
			.absorbed_heat_kj = derived.absorbed_heat_kj,
			.rejected_heat_kj = derived.rejected_heat_kj,
			.net_work_kj = derived.net_work_kj,
			.entropy_transfer_kj_per_k = derived.entropy_transfer_kj_per_k,
			.cycle_stage_label = cycle_stage_label,
			.stable = true,
		};
	}

	if (scenario.id == ScenarioId::HeatConductionSlab) {
		const double slab_thickness_meters =
			std::max(scenario.slab_thickness_meters.value_or(0.0), 0.001);
		const double thermal_conductivity =
			std::max(scenario.thermal_conductivity_w_per_mk.value_or(0.0), 0.001);
		const double thermal_diffusivity =
			std::max(scenario.thermal_diffusivity_m2_per_s.value_or(0.0), 1e-9);
		const double initial_temperature = scenario.initial_temperature_celsius.value_or(20.0);
		const double boundary_temperature = scenario.boundary_temperature_celsius.value_or(100.0);
		const double half_thickness = slab_thickness_meters * 0.5;
		const double fourier_number =
			(thermal_diffusivity * time_seconds) / std::max(half_thickness * half_thickness, 1e-9);
		const double normalized_temperature = std::exp(-(kPi * kPi) * fourier_number);
		const double center_temperature =
			boundary_temperature +
			(initial_temperature - boundary_temperature) * normalized_temperature;
		const double heat_flux =
			(thermal_conductivity * std::abs(boundary_temperature - center_temperature)) /
			std::max(half_thickness, 1e-6);

		return {
			.time_seconds = time_seconds,
			.pressure_pascals = 0.0,
			.density_kg_m3 = 0.0,
			.internal_energy_joules = 0.0,
			.temperature_kelvin = 0.0,
			.volume_cubic_meters = 0.0,
			.center_temperature_celsius = center_temperature,
			.surface_temperature_celsius = boundary_temperature,
			.heat_flux_w_per_m2 = heat_flux,
			.fourier_number = fourier_number,
			.normalized_temperature = normalized_temperature,
			.thermal_efficiency = std::nullopt,
			.absorbed_heat_kj = std::nullopt,
			.rejected_heat_kj = std::nullopt,
			.net_work_kj = std::nullopt,
			.entropy_transfer_kj_per_k = std::nullopt,
			.cycle_stage_label = std::nullopt,
			.stable = normalized_temperature < 0.05,
		};
	}

	const double volume = oscillating_volume(scenario, time_seconds);
	const double pressure =
		(scenario.molar_amount * scenario.gas_constant * scenario.temperature_kelvin) / volume;
	const double density =
		(scenario.molar_amount * scenario.molar_mass_kg_per_mol) / volume;
	const double internal_energy =
		0.5 * scenario.degrees_of_freedom * scenario.molar_amount * scenario.gas_constant *
		scenario.temperature_kelvin;

	return {
		.time_seconds = time_seconds,
		.pressure_pascals = pressure,
		.density_kg_m3 = density,
		.internal_energy_joules = internal_energy,
		.temperature_kelvin = scenario.temperature_kelvin,
		.volume_cubic_meters = volume,
		.center_temperature_celsius = std::nullopt,
		.surface_temperature_celsius = std::nullopt,
		.heat_flux_w_per_m2 = std::nullopt,
		.fourier_number = std::nullopt,
		.normalized_temperature = std::nullopt,
		.thermal_efficiency = std::nullopt,
		.absorbed_heat_kj = std::nullopt,
		.rejected_heat_kj = std::nullopt,
		.net_work_kj = std::nullopt,
		.entropy_transfer_kj_per_k = std::nullopt,
		.cycle_stage_label = std::nullopt,
		.stable = pressure > 0.0 && density > 0.0 && internal_energy > 0.0,
	};
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

void append_marker_quad(
	std::vector<NormalizedVertex>& vertices,
	const NormalizedVertex& center,
	float aspect_ratio) {
	const float half_width = 0.012F;
	const float safe_aspect = std::max(aspect_ratio, 0.001F);
	const float half_height = aspect_ratio >= 1.0F ? half_width * aspect_ratio : half_width / safe_aspect;
	vertices.push_back({center.x - half_width, center.y - half_height});
	vertices.push_back({center.x + half_width, center.y - half_height});
	vertices.push_back({center.x - half_width, center.y + half_height});
	vertices.push_back({center.x - half_width, center.y + half_height});
	vertices.push_back({center.x + half_width, center.y - half_height});
	vertices.push_back({center.x + half_width, center.y + half_height});
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::IdealGasState:
		return "ideal-gas-state";
	case ScenarioId::HeatConductionSlab:
		return "heat-conduction-slab";
	case ScenarioId::CarnotCycle:
		return "carnot-cycle";
	}

	throw std::runtime_error("Unknown thermodynamics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "ideal-gas-state") {
		return ScenarioId::IdealGasState;
	}
	if (value == "heat-conduction-slab") {
		return ScenarioId::HeatConductionSlab;
	}
	if (value == "carnot-cycle") {
		return ScenarioId::CarnotCycle;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	const auto match = std::find_if(
		kDefaultScenarios.begin(),
		kDefaultScenarios.end(),
		[id](const Scenario& scenario) { return scenario.id == id; });
	if (match == kDefaultScenarios.end()) {
		throw std::runtime_error("Unsupported thermodynamics scenario id");
	}
	return *match;
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	return build_snapshot(scenario, time_seconds);
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	if (scenario.id == ScenarioId::CarnotCycle) {
		const std::size_t resolved_sample_count = std::max<std::size_t>(sample_count, 2);
		std::vector<Sample> samples;
		samples.reserve(resolved_sample_count);
		for (std::size_t index = 0; index < resolved_sample_count; index += 1) {
			const double alpha = resolved_sample_count == 1
				? 0.0
				: static_cast<double>(index) / static_cast<double>(resolved_sample_count - 1);
			const double time_seconds = alpha * scenario.duration_seconds;
			const auto snapshot = sample_scenario(scenario, time_seconds);
			samples.push_back({
				.time_seconds = time_seconds,
				.volume_cubic_meters = snapshot.volume_cubic_meters,
				.pressure_pascals = snapshot.pressure_pascals,
				.temperature_kelvin = snapshot.temperature_kelvin,
				.internal_energy_joules = snapshot.internal_energy_joules,
				.position_meters = std::nullopt,
				.temperature_celsius = std::nullopt,
				.heat_flux_w_per_m2 = std::nullopt,
				.normalized_temperature = std::nullopt,
				.entropy_transfer_kj_per_k = snapshot.entropy_transfer_kj_per_k,
				.stage_label = snapshot.cycle_stage_label,
				.stable = snapshot.stable,
			});
		}
		return samples;
	}

	if (scenario.id == ScenarioId::HeatConductionSlab) {
		const std::size_t resolved_sample_count = std::max<std::size_t>(sample_count, 2);
		const double slab_thickness_meters =
			std::max(scenario.slab_thickness_meters.value_or(0.0), 0.001);
		const auto snapshot = sample_scenario(scenario, scenario.duration_seconds * 0.5);
		const double boundary_temperature = scenario.boundary_temperature_celsius.value_or(100.0);
		const double initial_temperature = scenario.initial_temperature_celsius.value_or(20.0);
		const double center_temperature = snapshot.center_temperature_celsius.value_or(boundary_temperature);
		std::vector<Sample> samples;
		samples.reserve(resolved_sample_count);
		for (std::size_t index = 0; index < resolved_sample_count; index += 1) {
			const double alpha = resolved_sample_count == 1
				? 0.0
				: static_cast<double>(index) / static_cast<double>(resolved_sample_count - 1);
			const double position = slab_thickness_meters * alpha;
			const double shape = std::cos((kPi * (position - slab_thickness_meters * 0.5)) / slab_thickness_meters);
			const double temperature =
				boundary_temperature +
				(center_temperature - boundary_temperature) * std::max(0.0, shape);
			const double denominator = boundary_temperature - initial_temperature;
			samples.push_back({
				.time_seconds = snapshot.time_seconds,
				.volume_cubic_meters = 0.0,
				.pressure_pascals = 0.0,
				.temperature_kelvin = 0.0,
				.internal_energy_joules = 0.0,
				.position_meters = position,
				.temperature_celsius = temperature,
				.heat_flux_w_per_m2 = snapshot.heat_flux_w_per_m2,
				.normalized_temperature = std::abs(denominator) > 1e-9
					? (boundary_temperature - temperature) / denominator
					: 0.0,
				.entropy_transfer_kj_per_k = std::nullopt,
				.stage_label = std::nullopt,
				.stable = snapshot.stable,
			});
		}
		return samples;
	}

	const std::size_t resolved_sample_count = std::max<std::size_t>(sample_count, 2);
	std::vector<Sample> samples;
	samples.reserve(resolved_sample_count);
	for (std::size_t index = 0; index < resolved_sample_count; index += 1) {
		const double alpha = resolved_sample_count == 1
			? 0.0
			: static_cast<double>(index) / static_cast<double>(resolved_sample_count - 1);
		const double time_seconds = alpha * scenario.duration_seconds;
		const auto snapshot = sample_scenario(scenario, time_seconds);
		samples.push_back({
			.time_seconds = time_seconds,
			.volume_cubic_meters = snapshot.volume_cubic_meters,
			.pressure_pascals = snapshot.pressure_pascals,
			.temperature_kelvin = snapshot.temperature_kelvin,
			.internal_energy_joules = snapshot.internal_energy_joules,
			.position_meters = std::nullopt,
			.temperature_celsius = std::nullopt,
			.heat_flux_w_per_m2 = std::nullopt,
			.normalized_temperature = std::nullopt,
			.entropy_transfer_kj_per_k = std::nullopt,
			.stage_label = std::nullopt,
			.stable = snapshot.stable,
		});
	}
	return samples;
}

std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario) {
	return {
		to_ndc_point(scenario.view_bounds.min_x, scenario.view_bounds.min_y, scenario),
		to_ndc_point(scenario.view_bounds.max_x, scenario.view_bounds.min_y, scenario),
		to_ndc_point(scenario.view_bounds.min_x, scenario.view_bounds.min_y, scenario),
		to_ndc_point(scenario.view_bounds.min_x, scenario.view_bounds.max_y, scenario),
	};
}

std::vector<NormalizedVertex> build_scenario_vertices(
	const Scenario& scenario,
	std::size_t sample_count) {
	const auto samples = build_samples(scenario, sample_count);
	std::vector<NormalizedVertex> vertices;
	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		if (scenario.id == ScenarioId::HeatConductionSlab) {
			vertices.push_back(to_ndc_point(
				samples[index - 1].position_meters.value_or(0.0),
				samples[index - 1].temperature_celsius.value_or(0.0),
				scenario));
			vertices.push_back(to_ndc_point(
				samples[index].position_meters.value_or(0.0),
				samples[index].temperature_celsius.value_or(0.0),
				scenario));
		} else {
			vertices.push_back(to_ndc_point(
				samples[index - 1].volume_cubic_meters,
				samples[index - 1].pressure_pascals,
				scenario));
			vertices.push_back(to_ndc_point(
				samples[index].volume_cubic_meters,
				samples[index].pressure_pascals,
				scenario));
		}
	}
	return vertices;
}

std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio) {
	std::vector<NormalizedVertex> vertices;
	if (scenario.id == ScenarioId::HeatConductionSlab) {
		append_marker_quad(
			vertices,
			to_ndc_point(
				scenario.slab_thickness_meters.value_or(0.0) * 0.5,
				snapshot.center_temperature_celsius.value_or(0.0),
				scenario),
			aspect_ratio);
	} else {
		append_marker_quad(
			vertices,
			to_ndc_point(snapshot.volume_cubic_meters, snapshot.pressure_pascals, scenario),
			aspect_ratio);
	}
	return vertices;
}

}  // namespace visual_physics::thermodynamics