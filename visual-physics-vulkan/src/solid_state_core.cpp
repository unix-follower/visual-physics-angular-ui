#include "solid_state_core.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace visual_physics::solid_state {
namespace {

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double default_time_seconds(ScenarioId id) {
	switch (id) {
	case ScenarioId::CrystalElasticity:
		return 0.45;
	case ScenarioId::PhononDispersion:
		return 0.55;
	case ScenarioId::ElectronicStructure:
		return 0.60;
	}
	throw std::runtime_error("Unknown solid-state scenario id");
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::CrystalElasticity:
		return "crystal-elasticity";
	case ScenarioId::PhononDispersion:
		return "phonon-dispersion";
	case ScenarioId::ElectronicStructure:
		return "electronic-structure";
	}
	throw std::runtime_error("Unknown solid-state scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "crystal-elasticity") {
		return ScenarioId::CrystalElasticity;
	}
	if (value == "phonon-dispersion") {
		return ScenarioId::PhononDispersion;
	}
	if (value == "electronic-structure") {
		return ScenarioId::ElectronicStructure;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::CrystalElasticity:
		return {
			.id = id,
			.name = "Crystal Elasticity",
			.summary = "Inspect a crystal stress-strain curve with elastic energy storage and a yield-strength guide.",
			.equation_summary = "sigma = E epsilon, U = 1/2 sigma epsilon",
			.status = "Validated material slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 2.2, 0.0, 220.0},
			.focus_area = "Stress-strain closure, elastic energy density, and yield-margin context.",
			.max_strain_percent = 1.6,
			.youngs_modulus_gigapascals = 210.0,
			.yield_strength_megapascals = 185.0,
		};
	case ScenarioId::PhononDispersion:
		return {
			.id = id,
			.name = "Phonon Dispersion",
			.summary = "Explore acoustic and optical phonon branches through a reduced Brillouin-zone sweep.",
			.equation_summary = "omega_a approx omega_max sin(pi k / 2), omega_o approx omega_gap + ...",
			.status = "Validated transport slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 1.0, 0.0, 12.0},
			.focus_area = "Acoustic versus optical mode separation, group velocity, and zone-edge behavior.",
			.lattice_spacing_nanometers = 0.42,
			.spring_constant_newtons_per_meter = 18.0,
			.atomic_mass_amu = 28.0,
		};
	case ScenarioId::ElectronicStructure:
		return {
			.id = id,
			.name = "Electronic Structure",
			.summary = "Inspect a simplified band-gap and density-of-states view with a live occupation estimate.",
			.equation_summary = "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
			.status = "Validated carrier slice",
			.duration_seconds = 1.0,
			.view_bounds = {-1.5, 2.5, 0.0, 1.4},
			.focus_area = "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
			.band_gap_electron_volts = 1.1,
			.effective_mass_ratio = 0.22,
			.dopant_density_per_cubic_centimeter = 8e15,
		};
	}
	throw std::runtime_error("Unknown solid-state scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	if (scenario.id == ScenarioId::PhononDispersion) {
		const auto wave_vector_fraction = clamp(time_seconds, 0.0, 1.0);
		const auto lattice_spacing_nanometers = scenario.lattice_spacing_nanometers.value_or(0.42);
		const auto spring_constant_newtons_per_meter = scenario.spring_constant_newtons_per_meter.value_or(18.0);
		const auto atomic_mass_amu = scenario.atomic_mass_amu.value_or(28.0);
		const auto mode_scale = std::sqrt(spring_constant_newtons_per_meter / atomic_mass_amu) * 8.0;
		const auto acoustic_frequency_terahertz = mode_scale * std::sin((3.14159265358979323846 * wave_vector_fraction) / 2.0);
		const auto optical_frequency_terahertz = 4.0 + mode_scale * 0.55 * std::cos((3.14159265358979323846 * wave_vector_fraction) / 2.0);
		const auto group_velocity_kilometers_per_second =
			((mode_scale * lattice_spacing_nanometers * 3.14159265358979323846) / 2.0) *
			std::cos((3.14159265358979323846 * wave_vector_fraction) / 2.0);
		return {
			.time_seconds = time_seconds,
			.wave_vector_fraction = wave_vector_fraction,
			.acoustic_frequency_terahertz = acoustic_frequency_terahertz,
			.optical_frequency_terahertz = optical_frequency_terahertz,
			.group_velocity_kilometers_per_second = group_velocity_kilometers_per_second,
			.stable = std::isfinite(acoustic_frequency_terahertz) && std::isfinite(optical_frequency_terahertz),
		};
	}

	if (scenario.id == ScenarioId::ElectronicStructure) {
		const auto band_gap_electron_volts = scenario.band_gap_electron_volts.value_or(1.1);
		const auto effective_mass_ratio = scenario.effective_mass_ratio.value_or(0.22);
		const auto dopant_density_per_cubic_centimeter = scenario.dopant_density_per_cubic_centimeter.value_or(8e15);
		const auto energy_electron_volts =
			(-0.5 * band_gap_electron_volts) + clamp(time_seconds, 0.0, 1.0) * band_gap_electron_volts * 2.2;
		const auto conduction_edge = band_gap_electron_volts / 2.0;
		const auto density_of_states_arbitrary_units =
			energy_electron_volts >= conduction_edge
				? std::sqrt(energy_electron_volts - conduction_edge + 0.02) * std::sqrt(1.0 / effective_mass_ratio) * 0.9
				: 0.0;
		const auto fermi_level = -0.12 + std::log10(dopant_density_per_cubic_centimeter / 1e15) * 0.04;
		const auto occupation_probability = 1.0 / (1.0 + std::exp((energy_electron_volts - fermi_level) / 0.08));
		return {
			.time_seconds = time_seconds,
			.energy_electron_volts = energy_electron_volts,
			.density_of_states_arbitrary_units = density_of_states_arbitrary_units,
			.occupation_probability = occupation_probability,
			.stable = std::isfinite(density_of_states_arbitrary_units) && std::isfinite(occupation_probability),
		};
	}

	const auto max_strain_percent = scenario.max_strain_percent.value_or(1.6);
	const auto strain_percent = clamp(time_seconds, 0.0, 1.0) * max_strain_percent;
	const auto strain_fraction = strain_percent / 100.0;
	const auto youngs_modulus_gigapascals = scenario.youngs_modulus_gigapascals.value_or(210.0);
	const auto yield_strength_megapascals = scenario.yield_strength_megapascals.value_or(185.0);
	const auto stress_megapascals = youngs_modulus_gigapascals * 1000.0 * strain_fraction;
	const auto elastic_energy_density_megajoules_per_cubic_meter = 0.5 * stress_megapascals * strain_fraction;
	return {
		.time_seconds = time_seconds,
		.strain_percent = strain_percent,
		.stress_megapascals = stress_megapascals,
		.elastic_energy_density_megajoules_per_cubic_meter = elastic_energy_density_megajoules_per_cubic_meter,
		.stable = stress_megapascals <= yield_strength_megapascals * 1.15,
	};
}

std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count) {
	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);

	if (scenario.id == ScenarioId::PhononDispersion) {
		const auto spring_constant_newtons_per_meter = scenario.spring_constant_newtons_per_meter.value_or(18.0);
		const auto atomic_mass_amu = scenario.atomic_mass_amu.value_or(28.0);
		const auto mode_scale = std::sqrt(spring_constant_newtons_per_meter / atomic_mass_amu) * 8.0;
		const auto active_index = static_cast<std::size_t>(
			std::round(clamp(time_seconds, 0.0, 1.0) * static_cast<double>(sample_count)));
		for (std::size_t index = 0; index <= sample_count; index += 1) {
			const auto position = static_cast<double>(index) / static_cast<double>(sample_count);
			samples.push_back({
				.position = position,
				.primary_value = mode_scale * std::sin((3.14159265358979323846 * position) / 2.0),
				.secondary_value = 4.0 + mode_scale * 0.55 * std::cos((3.14159265358979323846 * position) / 2.0),
				.label = "phonon-dispersion-profile",
				.active = index == active_index,
			});
		}
		return samples;
	}

	if (scenario.id == ScenarioId::ElectronicStructure) {
		const auto band_gap_electron_volts = scenario.band_gap_electron_volts.value_or(1.1);
		const auto effective_mass_ratio = scenario.effective_mass_ratio.value_or(0.22);
		const auto dopant_density_per_cubic_centimeter = scenario.dopant_density_per_cubic_centimeter.value_or(8e15);
		const auto fermi_level = -0.12 + std::log10(dopant_density_per_cubic_centimeter / 1e15) * 0.04;
		const auto energy_min = -0.5 * band_gap_electron_volts;
		const auto energy_max = band_gap_electron_volts * 1.7;
		const auto active_index = static_cast<std::size_t>(
			std::round(clamp(time_seconds, 0.0, 1.0) * static_cast<double>(sample_count)));
		for (std::size_t index = 0; index <= sample_count; index += 1) {
			const auto position = energy_min + ((energy_max - energy_min) * static_cast<double>(index)) / static_cast<double>(sample_count);
			const auto conduction_edge = band_gap_electron_volts / 2.0;
			const auto density =
				position >= conduction_edge
					? std::sqrt(position - conduction_edge + 0.02) * std::sqrt(1.0 / effective_mass_ratio) * 0.9
					: 0.0;
			const auto occupation = 1.0 / (1.0 + std::exp((position - fermi_level) / 0.08));
			samples.push_back({
				.position = position,
				.primary_value = density,
				.secondary_value = occupation,
				.label = "electronic-density-of-states-profile",
				.active = index == active_index,
			});
		}
		return samples;
	}

	const auto max_strain_percent = scenario.max_strain_percent.value_or(1.6);
	const auto youngs_modulus_gigapascals = scenario.youngs_modulus_gigapascals.value_or(210.0);
	const auto yield_strength_megapascals = scenario.yield_strength_megapascals.value_or(185.0);
	const auto active_index = static_cast<std::size_t>(
		std::round(clamp(time_seconds, 0.0, 1.0) * static_cast<double>(sample_count)));
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto position = (static_cast<double>(index) / static_cast<double>(sample_count)) * max_strain_percent;
		const auto strain_fraction = position / 100.0;
		samples.push_back({
			.position = position,
			.primary_value = youngs_modulus_gigapascals * 1000.0 * strain_fraction,
			.secondary_value = yield_strength_megapascals,
			.label = "crystal-stress-strain-profile",
			.active = index == active_index,
		});
	}
	return samples;
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	return build_samples_at_time(scenario, default_time_seconds(scenario.id), sample_count);
}

}  // namespace visual_physics::solid_state