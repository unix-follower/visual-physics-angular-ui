#include "plasma_physics_core.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace visual_physics::plasma_physics {
namespace {

constexpr double kPi = 3.14159265358979323846;

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double default_time_seconds(ScenarioId id) {
	switch (id) {
	case ScenarioId::PlasmaOscillation:
		return 0.35;
	case ScenarioId::DebyeScreening:
		return 0.45;
	case ScenarioId::MagneticConfinement:
		return 0.55;
	}

	throw std::runtime_error("Unknown plasma-physics scenario id");
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::PlasmaOscillation:
		return "plasma-oscillation";
	case ScenarioId::DebyeScreening:
		return "debye-screening";
	case ScenarioId::MagneticConfinement:
		return "magnetic-confinement";
	}

	throw std::runtime_error("Unknown plasma-physics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "plasma-oscillation") {
		return ScenarioId::PlasmaOscillation;
	}
	if (value == "debye-screening") {
		return ScenarioId::DebyeScreening;
	}
	if (value == "magnetic-confinement") {
		return ScenarioId::MagneticConfinement;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::PlasmaOscillation:
		return {
			.id = id,
			.name = "Plasma Oscillation",
			.summary = "Follow a density perturbation, collective restoring field, and plasma-frequency estimate in a starter plasma slice.",
			.equation_summary = "omega_p ~ sqrt(n_e), E_restore ~ delta n * T_e",
			.status = "Starter collective slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 1.0, 0.0, 18.0},
			.focus_area = "Density-driven collective oscillation, restoring-field strength, and frequency intuition in one shared view.",
			.electron_density_per_cubic_meter = 3.2e18,
			.electron_temperature_electron_volts = 6.0,
			.perturbation_amplitude_percent = 12.0,
		};
	case ScenarioId::DebyeScreening:
		return {
			.id = id,
			.name = "Debye Screening",
			.summary = "Inspect shielding length, screened potential, and charge screening strength around a probe in a plasma.",
			.equation_summary = "lambda_D ~ sqrt(T_e / n_e), phi(r) ~ phi0 exp(-r / lambda_D)",
			.status = "Starter shielding slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 3.0, 0.0, 18.0},
			.focus_area = "Debye length intuition, screened-potential rolloff, and shielding fraction around an inserted probe.",
			.electron_density_per_cubic_meter = 1.8e18,
			.electron_temperature_electron_volts = 9.0,
			.probe_potential_volts = 18.0,
		};
	case ScenarioId::MagneticConfinement:
		return {
			.id = id,
			.name = "Magnetic Confinement",
			.summary = "Estimate confinement quality, gyroradius, and safety-factor trends for a simplified toroidal plasma column.",
			.equation_summary = "rho_L ~ 1 / B, q ~ BR / I_p, beta ~ p / B^2",
			.status = "Starter confinement slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 1.0, 0.0, 12.0},
			.focus_area = "Magnetic-field strength, plasma current, and confinement quality in a first tokamak-style view.",
			.magnetic_field_tesla = 3.6,
			.plasma_current_mega_amperes = 1.4,
			.major_radius_meters = 2.8,
		};
	}

	throw std::runtime_error("Unknown plasma-physics scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	const auto clamped_time = clamp(time_seconds, 0.0, scenario.duration_seconds);

	if (scenario.id == ScenarioId::DebyeScreening) {
		const auto electron_density_per_cubic_meter =
			scenario.electron_density_per_cubic_meter.value_or(1.8e18);
		const auto electron_temperature_electron_volts =
			scenario.electron_temperature_electron_volts.value_or(9.0);
		const auto probe_potential_volts = scenario.probe_potential_volts.value_or(18.0);
		const auto density_units = std::max(electron_density_per_cubic_meter / 1e18, 0.05);
		const auto debye_length_millimeters =
			0.23 * std::sqrt(electron_temperature_electron_volts / density_units);
		const auto active_radius_millimeters = debye_length_millimeters * (0.5 + clamped_time);
		const auto shielding_fraction = clamp(
			1.0 - std::exp(-active_radius_millimeters / std::max(debye_length_millimeters, 0.001)),
			0.0,
			1.0);
		const auto screened_potential_volts =
			probe_potential_volts *
			std::exp(-active_radius_millimeters / std::max(debye_length_millimeters, 0.001));
		return {
			.time_seconds = clamped_time,
			.debye_length_millimeters = debye_length_millimeters,
			.shielding_fraction = shielding_fraction,
			.screened_potential_volts = screened_potential_volts,
			.stable = screened_potential_volts <= probe_potential_volts,
		};
	}

	if (scenario.id == ScenarioId::MagneticConfinement) {
		const auto magnetic_field_tesla = scenario.magnetic_field_tesla.value_or(3.6);
		const auto plasma_current_mega_amperes =
			scenario.plasma_current_mega_amperes.value_or(1.4);
		const auto major_radius_meters = scenario.major_radius_meters.value_or(2.8);
		const auto larmor_radius_millimeters =
			(4.6 / magnetic_field_tesla) * (0.8 + 0.4 * clamped_time);
		const auto beta_percent = clamp(
			(plasma_current_mega_amperes * 9.6) / (magnetic_field_tesla * major_radius_meters),
			0.5,
			14.0);
		const auto safety_factor =
			(5.0 * magnetic_field_tesla * major_radius_meters) /
			std::max(plasma_current_mega_amperes, 0.1);
		return {
			.time_seconds = clamped_time,
			.larmor_radius_millimeters = larmor_radius_millimeters,
			.beta_percent = beta_percent,
			.safety_factor = safety_factor,
			.stable = safety_factor >= 1.0 && safety_factor <= 7.0 && beta_percent <= 9.5,
		};
	}

	const auto electron_density_per_cubic_meter =
		scenario.electron_density_per_cubic_meter.value_or(3.2e18);
	const auto electron_temperature_electron_volts =
		scenario.electron_temperature_electron_volts.value_or(6.0);
	const auto perturbation_amplitude_percent =
		scenario.perturbation_amplitude_percent.value_or(12.0);
	const auto density_scale = std::sqrt(electron_density_per_cubic_meter / 1e18);
	const auto phase = clamped_time * kPi * 2.0;
	const auto plasma_frequency_gigahertz = 8.98 * density_scale;
	const auto oscillation_period_nanoseconds = 1.0 / std::max(plasma_frequency_gigahertz, 0.01);
	const auto restoring_field_kilovolts_per_meter =
		(perturbation_amplitude_percent / 100.0) * electron_temperature_electron_volts *
		density_scale * (0.85 + 0.15 * std::cos(phase));
	return {
		.time_seconds = clamped_time,
		.plasma_frequency_gigahertz = plasma_frequency_gigahertz,
		.oscillation_period_nanoseconds = oscillation_period_nanoseconds,
		.restoring_field_kilovolts_per_meter = restoring_field_kilovolts_per_meter,
		.stable = std::isfinite(plasma_frequency_gigahertz) &&
			std::isfinite(oscillation_period_nanoseconds) &&
			restoring_field_kilovolts_per_meter > 0.0,
	};
}

std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count) {
	if (sample_count < 2) {
		sample_count = 2;
	}

	std::vector<Sample> samples;
	samples.reserve(sample_count);

	if (scenario.id == ScenarioId::DebyeScreening) {
		const auto snapshot = sample_scenario(scenario, time_seconds);
		const auto probe_potential_volts = scenario.probe_potential_volts.value_or(18.0);
		const auto debye_length_millimeters = snapshot.debye_length_millimeters.value_or(1.0);
		const auto active_radius_millimeters = debye_length_millimeters * (0.5 + clamp(time_seconds, 0.0, 1.0));
		const auto max_radius_millimeters = debye_length_millimeters * 3.0;
		for (std::size_t index = 0; index < sample_count; index += 1) {
			const auto position =
				(static_cast<double>(index) / static_cast<double>(sample_count - 1)) *
				max_radius_millimeters;
			const auto primary_value =
				probe_potential_volts *
				std::exp(-position / std::max(debye_length_millimeters, 0.001));
			const auto secondary_value = clamp(
				1.0 - std::exp(-position / std::max(debye_length_millimeters, 0.001)),
				0.0,
				1.0);
			samples.push_back({
				.position = position,
				.primary_value = primary_value,
				.secondary_value = secondary_value,
				.label = "debye-screening-profile",
				.active = std::abs(position - active_radius_millimeters) <=
					(max_radius_millimeters / static_cast<double>(sample_count)),
			});
		}
		return samples;
	}

	if (scenario.id == ScenarioId::MagneticConfinement) {
		const auto snapshot = sample_scenario(scenario, time_seconds);
		const auto beta_percent = snapshot.beta_percent.value_or(0.0);
		const auto safety_factor = snapshot.safety_factor.value_or(0.0);
		const auto active_radius_fraction = clamp(time_seconds, 0.0, 1.0);
		for (std::size_t index = 0; index < sample_count; index += 1) {
			const auto position =
				static_cast<double>(index) / static_cast<double>(sample_count - 1);
			const auto primary_value = beta_percent * (1.0 - 0.65 * position * position);
			const auto secondary_value = safety_factor * (0.82 + 0.18 * position);
			samples.push_back({
				.position = position,
				.primary_value = primary_value,
				.secondary_value = secondary_value,
				.label = "magnetic-confinement-profile",
				.active = std::abs(position - active_radius_fraction) <=
					(1.0 / static_cast<double>(sample_count)),
			});
		}
		return samples;
	}

	const auto snapshot = sample_scenario(scenario, time_seconds);
	const auto perturbation_amplitude_percent =
		scenario.perturbation_amplitude_percent.value_or(12.0);
	const auto electron_temperature_electron_volts =
		scenario.electron_temperature_electron_volts.value_or(6.0);
	const auto density_scale =
		std::sqrt(scenario.electron_density_per_cubic_meter.value_or(3.2e18) / 1e18);
	for (std::size_t index = 0; index < sample_count; index += 1) {
		const auto position = static_cast<double>(index) / static_cast<double>(sample_count - 1);
		const auto phase = position * kPi * 2.0;
		const auto primary_value =
			1.0 + (perturbation_amplitude_percent / 100.0) * std::cos(phase);
		const auto secondary_value =
			electron_temperature_electron_volts * density_scale * (0.85 + 0.15 * std::cos(phase));
		samples.push_back({
			.position = position,
			.primary_value = primary_value,
			.secondary_value = secondary_value,
			.label = "plasma-oscillation-profile",
			.active = std::abs(position - snapshot.time_seconds) <=
				(1.0 / static_cast<double>(sample_count)),
		});
	}
	return samples;
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	return build_samples_at_time(scenario, default_time_seconds(scenario.id), sample_count);
}

}  // namespace visual_physics::plasma_physics