#include "astrophysics_core.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace visual_physics::astrophysics {
namespace {

constexpr double kPi = 3.14159265358979323846;
constexpr double kGravitationalConstant = 6.6743e-11;
constexpr double kSolarMassKilograms = 1.98847e30;
constexpr double kAstronomicalUnitMeters = 149597870700.0;
constexpr double kSecondsPerDay = 86400.0;
constexpr double kSpeedOfLightKilometersPerSecond = 299792.458;
constexpr double kSolarSurfaceTemperatureKelvin = 5772.0;
constexpr double kMegaparsecToBillionLightYears = 0.00326156;

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double default_time_seconds(ScenarioId id) {
	switch (id) {
	case ScenarioId::PlanetaryOrbit:
		return 0.2;
	case ScenarioId::StellarLuminosity:
		return 0.25;
	case ScenarioId::HubbleExpansion:
		return 0.25;
	}
	throw std::runtime_error("Unknown astrophysics scenario id");
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::PlanetaryOrbit:
		return "planetary-orbit";
	case ScenarioId::StellarLuminosity:
		return "stellar-luminosity";
	case ScenarioId::HubbleExpansion:
		return "hubble-expansion";
	}
	throw std::runtime_error("Unknown astrophysics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "planetary-orbit") {
		return ScenarioId::PlanetaryOrbit;
	}
	if (value == "stellar-luminosity") {
		return ScenarioId::StellarLuminosity;
	}
	if (value == "hubble-expansion") {
		return ScenarioId::HubbleExpansion;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::PlanetaryOrbit:
		return {
			.id = id,
			.name = "Planetary Orbit Explorer",
			.summary = "Estimate circular and low-eccentricity orbital diagnostics for a planet around a single star.",
			.equation_summary = "T = 2 pi sqrt(r^3 / GM), v = sqrt(GM / r)",
			.status = "Initial orbit slice in progress",
			.duration_seconds = 1.0,
			.view_bounds = {-1.6, 1.6, -1.6, 1.6},
			.focus_area = "Orbital period, orbital speed, escape-speed comparison, and deterministic sampled orbit geometry.",
			.central_mass_solar_masses = 1.0,
			.orbital_radius_astronomical_units = 1.0,
			.orbital_eccentricity = 0.12,
		};
	case ScenarioId::StellarLuminosity:
		return {
			.id = id,
			.name = "Stellar Luminosity and Habitable Zone",
			.summary = "Derive luminosity scaling and habitable-zone style distances from stellar radius and surface temperature.",
			.equation_summary = "L / Lsun = (R / Rsun)^2 (T / Tsun)^4",
			.status = "Shared scaffold ready",
			.duration_seconds = 1.0,
			.view_bounds = {0.25, 6.0, 0.0, 8.0},
			.focus_area = "Luminosity scaling, irradiance falloff with distance, and habitable-zone distance estimates.",
			.stellar_mass_solar_masses = 1.0,
			.stellar_radius_solar_radii = 1.0,
			.surface_temperature_kelvin = 5772.0,
		};
	case ScenarioId::HubbleExpansion:
		return {
			.id = id,
			.name = "Hubble Expansion",
			.summary = "Compare cosmological distance with recession velocity and light-travel-scale estimates under Hubble-law assumptions.",
			.equation_summary = "v = H0 d, z approx v / c",
			.status = "Shared scaffold ready",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 2000.0, 0.0, 160000.0},
			.focus_area = "Distance-velocity scaling, approximate redshift, and horizon-scale travel-time context.",
			.distance_megaparsecs = 400.0,
			.hubble_constant_kilometers_per_second_per_megaparsec = 70.0,
		};
	}
	throw std::runtime_error("Unknown astrophysics scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	if (scenario.id == ScenarioId::StellarLuminosity) {
		const auto stellar_mass_solar_masses = std::max(scenario.stellar_mass_solar_masses.value_or(1.0), 0.1);
		const auto stellar_radius_solar_radii = std::max(scenario.stellar_radius_solar_radii.value_or(1.0), 0.1);
		const auto surface_temperature_kelvin = std::max(scenario.surface_temperature_kelvin.value_or(5772.0), 1500.0);
		const auto luminosity_solar_units = stellar_radius_solar_radii * stellar_radius_solar_radii *
			std::pow(surface_temperature_kelvin / kSolarSurfaceTemperatureKelvin, 4.0);
		return {
			.time_seconds = time_seconds,
			.stellar_mass_solar_masses = stellar_mass_solar_masses,
			.stellar_radius_solar_radii = stellar_radius_solar_radii,
			.surface_temperature_kelvin = surface_temperature_kelvin,
			.luminosity_solar_units = luminosity_solar_units,
			.habitable_zone_inner_astronomical_units = std::sqrt(luminosity_solar_units / 1.1),
			.habitable_zone_outer_astronomical_units = std::sqrt(luminosity_solar_units / 0.53),
			.stable = std::isfinite(luminosity_solar_units),
		};
	}

	if (scenario.id == ScenarioId::HubbleExpansion) {
		const auto distance_megaparsecs = std::max(scenario.distance_megaparsecs.value_or(400.0), 1.0);
		const auto hubble_constant = std::max(
			scenario.hubble_constant_kilometers_per_second_per_megaparsec.value_or(70.0),
			10.0);
		const auto recession_velocity = distance_megaparsecs * hubble_constant;
		const auto redshift = recession_velocity / kSpeedOfLightKilometersPerSecond;
		return {
			.time_seconds = time_seconds,
			.distance_megaparsecs = distance_megaparsecs,
			.hubble_constant_kilometers_per_second_per_megaparsec = hubble_constant,
			.recession_velocity_kilometers_per_second = recession_velocity,
			.light_travel_time_billion_years = distance_megaparsecs * kMegaparsecToBillionLightYears,
			.redshift = redshift,
			.stable = std::isfinite(recession_velocity) && std::isfinite(redshift),
		};
	}

	const auto central_mass_solar_masses = std::max(scenario.central_mass_solar_masses.value_or(1.0), 0.1);
	const auto orbital_radius_astronomical_units = std::max(
		scenario.orbital_radius_astronomical_units.value_or(1.0),
		0.1);
	const auto orbital_eccentricity = clamp(scenario.orbital_eccentricity.value_or(0.12), 0.0, 0.85);
	const auto radius_meters = orbital_radius_astronomical_units * kAstronomicalUnitMeters;
	const auto mass_kilograms = central_mass_solar_masses * kSolarMassKilograms;
	const auto orbital_period_seconds =
		2.0 * kPi * std::sqrt((radius_meters * radius_meters * radius_meters) /
			(kGravitationalConstant * mass_kilograms));
	const auto orbital_speed_kilometers_per_second =
		std::sqrt((kGravitationalConstant * mass_kilograms) / radius_meters) / 1000.0;
	const auto escape_speed_kilometers_per_second = std::sqrt(2.0) * orbital_speed_kilometers_per_second;
	const auto specific_orbital_energy_megajoules_per_kilogram =
		(-kGravitationalConstant * mass_kilograms) / (2.0 * radius_meters * 1000000.0);
	return {
		.time_seconds = time_seconds,
		.central_mass_solar_masses = central_mass_solar_masses,
		.orbital_radius_astronomical_units = orbital_radius_astronomical_units,
		.orbital_eccentricity = orbital_eccentricity,
		.orbital_period_days = orbital_period_seconds / kSecondsPerDay,
		.orbital_speed_kilometers_per_second = orbital_speed_kilometers_per_second,
		.escape_speed_kilometers_per_second = escape_speed_kilometers_per_second,
		.specific_orbital_energy_megajoules_per_kilogram = specific_orbital_energy_megajoules_per_kilogram,
		.stable = std::isfinite(orbital_period_seconds) &&
			std::isfinite(orbital_speed_kilometers_per_second) &&
			std::isfinite(specific_orbital_energy_megajoules_per_kilogram),
	};
}

std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count) {
	if (scenario.id == ScenarioId::StellarLuminosity) {
		const auto snapshot = sample_scenario(scenario, time_seconds);
		const auto luminosity_solar_units = snapshot.luminosity_solar_units.value_or(1.0);
		const auto inner_habitable_zone = snapshot.habitable_zone_inner_astronomical_units.value_or(1.0);
		const auto outer_habitable_zone = snapshot.habitable_zone_outer_astronomical_units.value_or(1.4);
		const auto active_distance = clamp(
			inner_habitable_zone + clamp(time_seconds, 0.0, 1.0) * (outer_habitable_zone - inner_habitable_zone),
			0.25,
			6.0);
		std::vector<Sample> samples;
		samples.reserve(sample_count + 1);
		for (std::size_t index = 0; index <= sample_count; index += 1) {
			const auto distance = 0.25 + (static_cast<double>(index) / static_cast<double>(sample_count)) * 5.75;
			samples.push_back({
				.position = distance,
				.primary_value = luminosity_solar_units / (distance * distance),
				.secondary_value = std::nullopt,
				.label = "stellar-irradiance-profile",
				.active = std::abs(distance - active_distance) < 0.1,
			});
		}
		return samples;
	}

	if (scenario.id == ScenarioId::HubbleExpansion) {
		const auto snapshot = sample_scenario(scenario, time_seconds);
		const auto distance_megaparsecs = snapshot.distance_megaparsecs.value_or(400.0);
		const auto hubble_constant =
			snapshot.hubble_constant_kilometers_per_second_per_megaparsec.value_or(70.0);
		const auto max_distance = std::max(distance_megaparsecs * 1.2, 500.0);
		const auto active_distance = clamp(time_seconds, 0.0, 1.0) * max_distance;
		std::vector<Sample> samples;
		samples.reserve(sample_count + 1);
		for (std::size_t index = 0; index <= sample_count; index += 1) {
			const auto position = (static_cast<double>(index) / static_cast<double>(sample_count)) * max_distance;
			samples.push_back({
				.position = position,
				.primary_value = position * hubble_constant,
				.secondary_value = position * kMegaparsecToBillionLightYears,
				.label = "hubble-expansion-curve",
				.active = std::abs(position - active_distance) < max_distance / 40.0,
			});
		}
		return samples;
	}

	const auto snapshot = sample_scenario(scenario, time_seconds);
	const auto semi_major_axis = snapshot.orbital_radius_astronomical_units.value_or(1.0);
	const auto eccentricity = clamp(snapshot.orbital_eccentricity.value_or(0.12), 0.0, 0.85);
	const auto semi_minor_axis = semi_major_axis * std::sqrt(1.0 - eccentricity * eccentricity);
	const auto active_index = static_cast<std::size_t>(
		std::round(clamp(time_seconds, 0.0, 1.0) * static_cast<double>(sample_count)));
	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto angle = (static_cast<double>(index) / static_cast<double>(sample_count)) * 2.0 * kPi;
		samples.push_back({
			.position = semi_major_axis * (std::cos(angle) - eccentricity),
			.primary_value = semi_minor_axis * std::sin(angle),
			.secondary_value = snapshot.orbital_speed_kilometers_per_second,
			.label = "planetary-orbit-trajectory",
			.active = index == active_index,
		});
	}
	return samples;
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	return build_samples_at_time(scenario, default_time_seconds(scenario.id), sample_count);
}

}  // namespace visual_physics::astrophysics