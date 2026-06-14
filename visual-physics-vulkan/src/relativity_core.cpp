#include "relativity_core.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace visual_physics::relativity {
namespace {

constexpr double kSpeedOfLightMetersPerSecond = 299792458.0;
constexpr double kGravitationalConstant = 6.6743e-11;
constexpr double kSolarMassKilograms = 1.98847e30;

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double clamp_beta(double value) {
	return clamp(value, -0.95, 0.95);
}

double default_time_seconds(const Scenario& scenario) {
	return std::max(scenario.proper_time_seconds.value_or(1.0), 0.01);
}

double lorentz_gamma(double beta) {
	return 1.0 / std::sqrt(std::max(1.0 - beta * beta, 1e-9));
}

double relative_beta(double source_beta, double observer_beta) {
	return clamp_beta(
		(source_beta - observer_beta) /
		std::max(1.0 - source_beta * observer_beta, 1e-9));
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::TimeDilation:
		return "time-dilation";
	case ScenarioId::RelativisticDoppler:
		return "relativistic-doppler";
	case ScenarioId::GravitationalTimeDilation:
		return "gravitational-time-dilation";
	}
	throw std::runtime_error("Unknown relativity scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "time-dilation") {
		return ScenarioId::TimeDilation;
	}
	if (value == "relativistic-doppler") {
		return ScenarioId::RelativisticDoppler;
	}
	if (value == "gravitational-time-dilation") {
		return ScenarioId::GravitationalTimeDilation;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::TimeDilation:
		return {
			.id = id,
			.name = "Inertial Time Dilation",
			.summary = "Compare proper time to coordinate time for a moving clock using the Lorentz factor.",
			.equation_summary = "gamma = 1 / sqrt(1 - beta^2), t = gamma tau",
			.status = "Initial analytic slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 0.98, 0.0, 6.0},
			.focus_area = "Lorentz-factor growth, elapsed-time separation, and nonlinear relativistic scaling as velocity approaches c.",
			.relative_velocity_fraction_of_light = 0.8,
			.proper_time_seconds = 1.0,
		};
	case ScenarioId::RelativisticDoppler:
		return {
			.id = id,
			.name = "Relativistic Doppler Shift",
			.summary = "Compare relativistic and classical longitudinal Doppler predictions for high-speed source and observer motion.",
			.equation_summary = "f_obs = f_emit sqrt((1 - beta_rel) / (1 + beta_rel))",
			.status = "Initial analytic slice",
			.duration_seconds = 0.0,
			.view_bounds = {-0.95, 0.95, 0.0, 1200.0},
			.focus_area = "Relative-motion redshift and blueshift, plus the growing gap between classical and relativistic predictions.",
			.emitted_frequency_hertz = 440.0,
			.source_velocity_fraction_of_light = 0.35,
			.observer_velocity_fraction_of_light = 0.0,
		};
	case ScenarioId::GravitationalTimeDilation:
		return {
			.id = id,
			.name = "Gravitational Time Dilation",
			.summary = "Estimate clock-rate slowdown near a compact spherical mass using the Schwarzschild time-dilation factor.",
			.equation_summary = "d tau = d t sqrt(1 - r_s / r)",
			.status = "Initial analytic slice",
			.duration_seconds = 1.0,
			.view_bounds = {1.0, 12.0, 0.0, 1.1},
			.focus_area = "Clock-rate suppression close to the Schwarzschild radius and recovery toward the far-field limit.",
			.central_mass_solar_masses = 1.0,
			.orbital_radius_schwarzschild_radii = 6.0,
			.coordinate_time_seconds = 1.0,
		};
	}
	throw std::runtime_error("Unknown relativity scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	if (scenario.id == ScenarioId::RelativisticDoppler) {
		const auto emitted_frequency_hertz = std::max(scenario.emitted_frequency_hertz.value_or(440.0), 1.0);
		const auto source_beta = clamp_beta(scenario.source_velocity_fraction_of_light.value_or(0.35));
		const auto observer_beta = clamp_beta(scenario.observer_velocity_fraction_of_light.value_or(0.0));
		const auto beta = relative_beta(source_beta, observer_beta);
		const auto observed_frequency_hertz =
			emitted_frequency_hertz * std::sqrt(std::max((1.0 - beta) / (1.0 + beta), 1e-9));
		const auto classical_observed_frequency_hertz = emitted_frequency_hertz * (1.0 - beta);
		return {
			.time_seconds = 0.0,
			.relative_velocity_fraction_of_light = beta,
			.emitted_frequency_hertz = emitted_frequency_hertz,
			.source_velocity_fraction_of_light = source_beta,
			.observer_velocity_fraction_of_light = observer_beta,
			.observed_frequency_hertz = observed_frequency_hertz,
			.classical_observed_frequency_hertz = classical_observed_frequency_hertz,
			.shift_ratio = observed_frequency_hertz / emitted_frequency_hertz,
			.redshift = observed_frequency_hertz < emitted_frequency_hertz,
			.stable = std::isfinite(observed_frequency_hertz),
		};
	}
	if (scenario.id == ScenarioId::GravitationalTimeDilation) {
		const auto central_mass_solar_masses = std::max(scenario.central_mass_solar_masses.value_or(1.0), 0.1);
		const auto orbital_radius_schwarzschild_radii =
			std::max(scenario.orbital_radius_schwarzschild_radii.value_or(6.0), 1.1);
		const auto coordinate_time_seconds = std::max(time_seconds, 0.01);
		const auto schwarzschild_radius_meters =
			(2.0 * kGravitationalConstant * central_mass_solar_masses * kSolarMassKilograms) /
			(kSpeedOfLightMetersPerSecond * kSpeedOfLightMetersPerSecond);
		const auto gravitational_time_factor =
			std::sqrt(std::max(1.0 - 1.0 / orbital_radius_schwarzschild_radii, 1e-9));
		const auto local_elapsed_time_seconds = coordinate_time_seconds * gravitational_time_factor;
		return {
			.time_seconds = coordinate_time_seconds,
			.time_difference_seconds = coordinate_time_seconds - local_elapsed_time_seconds,
			.central_mass_solar_masses = central_mass_solar_masses,
			.orbital_radius_schwarzschild_radii = orbital_radius_schwarzschild_radii,
			.schwarzschild_radius_kilometers = schwarzschild_radius_meters / 1000.0,
			.gravitational_time_factor = gravitational_time_factor,
			.local_elapsed_time_seconds = local_elapsed_time_seconds,
			.stable = std::isfinite(local_elapsed_time_seconds) && gravitational_time_factor > 0.0,
		};
	}

	const auto proper_time_seconds = std::max(time_seconds, 0.01);
	const auto beta = clamp_beta(scenario.relative_velocity_fraction_of_light.value_or(0.8));
	const auto gamma = lorentz_gamma(beta);
	const auto dilated_time_seconds = gamma * proper_time_seconds;
	return {
		.time_seconds = proper_time_seconds,
		.relative_velocity_fraction_of_light = beta,
		.proper_time_seconds = proper_time_seconds,
		.lorentz_factor_gamma = gamma,
		.dilated_time_seconds = dilated_time_seconds,
		.time_difference_seconds = dilated_time_seconds - proper_time_seconds,
		.stable = std::isfinite(gamma) && std::isfinite(dilated_time_seconds),
	};
}

std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count) {
	if (scenario.id == ScenarioId::RelativisticDoppler) {
		const auto emitted_frequency_hertz = std::max(scenario.emitted_frequency_hertz.value_or(440.0), 1.0);
		const auto active_beta = relative_beta(
			clamp_beta(scenario.source_velocity_fraction_of_light.value_or(0.35)),
			clamp_beta(scenario.observer_velocity_fraction_of_light.value_or(0.0)));
		std::vector<Sample> samples;
		samples.reserve(sample_count + 1);
		for (std::size_t index = 0; index <= sample_count; index += 1) {
			const auto position = -0.9 + (static_cast<double>(index) / static_cast<double>(sample_count)) * 1.8;
			const auto observed_frequency_hertz =
				emitted_frequency_hertz * std::sqrt(std::max((1.0 - position) / (1.0 + position), 1e-9));
			samples.push_back({
				.position = position,
				.primary_value = observed_frequency_hertz,
				.secondary_value = emitted_frequency_hertz * (1.0 - position),
				.label = "relativistic-doppler-curve",
				.active = std::abs(position - active_beta) < 0.02,
			});
		}
		return samples;
	}
	if (scenario.id == ScenarioId::GravitationalTimeDilation) {
		const auto coordinate_time_seconds = std::max(time_seconds, 0.01);
		const auto active_radius =
			std::max(scenario.orbital_radius_schwarzschild_radii.value_or(6.0), 1.1);
		const auto max_radius = std::max(active_radius * 1.2, 12.0);
		std::vector<Sample> samples;
		samples.reserve(sample_count + 1);
		for (std::size_t index = 0; index <= sample_count; index += 1) {
			const auto position =
				1.1 + (static_cast<double>(index) / static_cast<double>(sample_count)) * (max_radius - 1.1);
			const auto factor = std::sqrt(std::max(1.0 - 1.0 / position, 1e-9));
			samples.push_back({
				.position = position,
				.primary_value = factor,
				.secondary_value = coordinate_time_seconds * factor,
				.label = "gravitational-time-dilation-curve",
				.active = std::abs(position - active_radius) < 0.12,
			});
		}
		return samples;
	}

	const auto proper_time_seconds = std::max(time_seconds, 0.01);
	const auto active_beta = clamp_beta(scenario.relative_velocity_fraction_of_light.value_or(0.8));
	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto position = (static_cast<double>(index) / static_cast<double>(sample_count)) * 0.95;
		const auto gamma = lorentz_gamma(position);
		samples.push_back({
			.position = position,
			.primary_value = gamma * proper_time_seconds,
			.secondary_value = proper_time_seconds,
			.label = "time-dilation-curve",
			.active = std::abs(position - active_beta) < 0.01,
		});
	}
	return samples;
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	return build_samples_at_time(scenario, default_time_seconds(scenario), sample_count);
}

}  // namespace visual_physics::relativity
