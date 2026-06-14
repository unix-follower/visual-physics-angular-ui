#include "atmospheric_core.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace visual_physics::atmospheric {
namespace {

constexpr double kGravityMetersPerSecondSquared = 9.81;

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double default_time_seconds(ScenarioId id) {
	switch (id) {
	case ScenarioId::BarometricFormula:
		return 0.2;
	case ScenarioId::AdiabaticLapseRate:
		return 0.3;
	case ScenarioId::ConvectionColumn:
		return 0.35;
	}
	throw std::runtime_error("Unknown atmospheric scenario id");
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::BarometricFormula:
		return "barometric-formula";
	case ScenarioId::AdiabaticLapseRate:
		return "adiabatic-lapse-rate";
	case ScenarioId::ConvectionColumn:
		return "convection-column";
	}
	throw std::runtime_error("Unknown atmospheric scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "barometric-formula") {
		return ScenarioId::BarometricFormula;
	}
	if (value == "adiabatic-lapse-rate") {
		return ScenarioId::AdiabaticLapseRate;
	}
	if (value == "convection-column") {
		return ScenarioId::ConvectionColumn;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::BarometricFormula:
		return {
			.id = id,
			.name = "Barometric Formula",
			.summary = "Estimate how hydrostatic pressure and relative density decrease with altitude in a simple atmospheric column.",
			.equation_summary = "P(z) = P0 exp(-z / H)",
			.status = "Validated vertical slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 12.0, 0.0, 105.0},
			.focus_area = "Hydrostatic pressure profile, scale-height intuition, and active altitude inspection.",
			.sea_level_pressure_kilopascals = 101.325,
			.scale_height_kilometers = 8.4,
		};
	case ScenarioId::AdiabaticLapseRate:
		return {
			.id = id,
			.name = "Adiabatic Lapse Rate",
			.summary = "Inspect how temperature decreases with altitude using a dry-lapse baseline and a comparison reference profile.",
			.equation_summary = "T(z) = T0 - Gamma z",
			.status = "Validated vertical slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 12.0, 190.0, 310.0},
			.focus_area = "Temperature-altitude structure, lapse-rate sensitivity, and tropopause context.",
			.surface_temperature_kelvin = 288.0,
			.lapse_rate_kelvin_per_kilometer = 9.8,
			.tropopause_height_kilometers = 11.0,
		};
	case ScenarioId::ConvectionColumn:
		return {
			.id = id,
			.name = "Convection Column",
			.summary = "Follow a warm parcel rising through an atmospheric column with buoyancy, updraft, and CAPE-style diagnostics.",
			.equation_summary = "a_b approx g * Delta T / T, w approx sqrt(2 * CAPE)",
			.status = "Validated vertical slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 10.0, 0.0, 22.0},
			.focus_area = "Parcel ascent, buoyancy acceleration, and updraft evolution across a convective column.",
			.surface_temperature_kelvin = 300.0,
			.environmental_lapse_rate_kelvin_per_kilometer = 6.5,
			.parcel_temperature_excess_kelvin = 3.5,
			.column_height_kilometers = 9.0,
		};
	}
	throw std::runtime_error("Unknown atmospheric scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	if (scenario.id == ScenarioId::AdiabaticLapseRate) {
		const auto altitude_kilometers = clamp(time_seconds, 0.0, 1.0) * 12.0;
		const auto surface_temperature_kelvin = std::max(scenario.surface_temperature_kelvin.value_or(288.0), 180.0);
		const auto lapse_rate_kelvin_per_kilometer = clamp(
			scenario.lapse_rate_kelvin_per_kilometer.value_or(9.8),
			2.0,
			12.0);
		const auto tropopause_height_kilometers = clamp(
			scenario.tropopause_height_kilometers.value_or(11.0),
			6.0,
			18.0);
		const auto temperature_kelvin =
			surface_temperature_kelvin - altitude_kilometers * lapse_rate_kelvin_per_kilometer;
		const auto reference_temperature_kelvin = surface_temperature_kelvin - altitude_kilometers * 6.5;
		return {
			.time_seconds = time_seconds,
			.altitude_kilometers = altitude_kilometers,
			.temperature_kelvin = temperature_kelvin,
			.reference_temperature_kelvin = reference_temperature_kelvin,
			.tropopause_height_kilometers = tropopause_height_kilometers,
			.stable = std::isfinite(temperature_kelvin),
		};
	}

	if (scenario.id == ScenarioId::ConvectionColumn) {
		const auto column_height_kilometers = clamp(scenario.column_height_kilometers.value_or(9.0), 3.0, 14.0);
		const auto surface_temperature_kelvin = std::max(scenario.surface_temperature_kelvin.value_or(300.0), 200.0);
		const auto environmental_lapse_rate_kelvin_per_kilometer = clamp(
			scenario.environmental_lapse_rate_kelvin_per_kilometer.value_or(6.5),
			2.0,
			11.0);
		const auto parcel_temperature_excess_kelvin = clamp(
			scenario.parcel_temperature_excess_kelvin.value_or(3.5),
			0.2,
			8.0);
		const auto parcel_altitude_kilometers = clamp(time_seconds, 0.0, 1.0) * column_height_kilometers;
		const auto temperature_kelvin = surface_temperature_kelvin -
			parcel_altitude_kilometers * environmental_lapse_rate_kelvin_per_kilometer;
		const auto buoyancy_acceleration_meters_per_second_squared =
			kGravityMetersPerSecondSquared * (parcel_temperature_excess_kelvin / surface_temperature_kelvin);
		const auto updraft_velocity_meters_per_second =
			std::max(0.0, std::sin(clamp(time_seconds, 0.0, 1.0) * 3.14159265358979323846)) * 14.0 +
			buoyancy_acceleration_meters_per_second_squared * 3.0;
		const auto convective_available_potential_energy_kilojoules_per_kilogram =
			0.5 * updraft_velocity_meters_per_second * updraft_velocity_meters_per_second / 1000.0;
		return {
			.time_seconds = time_seconds,
			.temperature_kelvin = temperature_kelvin,
			.parcel_altitude_kilometers = parcel_altitude_kilometers,
			.buoyancy_acceleration_meters_per_second_squared = buoyancy_acceleration_meters_per_second_squared,
			.updraft_velocity_meters_per_second = updraft_velocity_meters_per_second,
			.convective_available_potential_energy_kilojoules_per_kilogram = convective_available_potential_energy_kilojoules_per_kilogram,
			.stable = std::isfinite(updraft_velocity_meters_per_second) &&
				std::isfinite(convective_available_potential_energy_kilojoules_per_kilogram),
		};
	}

	const auto altitude_kilometers = clamp(time_seconds, 0.0, 1.0) * 12.0;
	const auto sea_level_pressure_kilopascals =
		std::max(scenario.sea_level_pressure_kilopascals.value_or(101.325), 10.0);
	const auto scale_height_kilometers = std::max(scenario.scale_height_kilometers.value_or(8.4), 1.0);
	const auto pressure_kilopascals =
		sea_level_pressure_kilopascals * std::exp(-altitude_kilometers / scale_height_kilometers);
	return {
		.time_seconds = time_seconds,
		.altitude_kilometers = altitude_kilometers,
		.pressure_kilopascals = pressure_kilopascals,
		.relative_density = pressure_kilopascals / sea_level_pressure_kilopascals,
		.stable = std::isfinite(pressure_kilopascals),
	};
}

std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count) {
	const auto active_index = static_cast<std::size_t>(
		std::round(clamp(time_seconds, 0.0, 1.0) * static_cast<double>(sample_count)));
	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);

	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto normalized = static_cast<double>(index) / static_cast<double>(sample_count);

		if (scenario.id == ScenarioId::AdiabaticLapseRate) {
			const auto altitude = normalized * 12.0;
			const auto surface_temperature_kelvin = std::max(scenario.surface_temperature_kelvin.value_or(288.0), 180.0);
			const auto lapse_rate_kelvin_per_kilometer = clamp(
				scenario.lapse_rate_kelvin_per_kilometer.value_or(9.8),
				2.0,
				12.0);
			samples.push_back({
				.position = altitude,
				.primary_value = surface_temperature_kelvin - altitude * lapse_rate_kelvin_per_kilometer,
				.secondary_value = surface_temperature_kelvin - altitude * 6.5,
				.label = "adiabatic-temperature-profile",
				.active = index == active_index,
			});
			continue;
		}

		if (scenario.id == ScenarioId::ConvectionColumn) {
			const auto column_height_kilometers = clamp(scenario.column_height_kilometers.value_or(9.0), 3.0, 14.0);
			const auto altitude = normalized * column_height_kilometers;
			const auto surface_temperature_kelvin = std::max(scenario.surface_temperature_kelvin.value_or(300.0), 200.0);
			const auto parcel_temperature_excess_kelvin = clamp(
				scenario.parcel_temperature_excess_kelvin.value_or(3.5),
				0.2,
				8.0);
			const auto buoyancy = kGravityMetersPerSecondSquared *
				(parcel_temperature_excess_kelvin / surface_temperature_kelvin);
			const auto updraft = std::max(0.0, std::sin(normalized * 3.14159265358979323846)) * 14.0 + buoyancy * 3.0;
			samples.push_back({
				.position = altitude,
				.primary_value = updraft,
				.secondary_value = buoyancy,
				.label = "convection-updraft-profile",
				.active = index == active_index,
			});
			continue;
		}

		const auto sea_level_pressure_kilopascals =
			std::max(scenario.sea_level_pressure_kilopascals.value_or(101.325), 10.0);
		const auto scale_height_kilometers = std::max(scenario.scale_height_kilometers.value_or(8.4), 1.0);
		const auto altitude = normalized * 12.0;
		const auto pressure =
			sea_level_pressure_kilopascals * std::exp(-altitude / scale_height_kilometers);
		samples.push_back({
			.position = altitude,
			.primary_value = pressure,
			.secondary_value = pressure / sea_level_pressure_kilopascals,
			.label = "barometric-pressure-profile",
			.active = index == active_index,
		});
	}

	return samples;
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	return build_samples_at_time(scenario, default_time_seconds(scenario.id), sample_count);
}

}  // namespace visual_physics::atmospheric