#include "nuclear_and_particle_physics_core.hpp"

#include <algorithm>
#include <cmath>
#include <limits>
#include <stdexcept>

namespace visual_physics::nuclear_and_particle_physics {
namespace {

constexpr double kPi = 3.14159265358979323846;

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double default_time_seconds(ScenarioId id) {
	switch (id) {
	case ScenarioId::RadioactiveDecay:
		return 0.35;
	case ScenarioId::BindingEnergyCurve:
		return 0.45;
	case ScenarioId::ProtonProtonCollision:
		return 0.55;
	}
	throw std::runtime_error("Unknown nuclear-and-particle-physics scenario id");
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::RadioactiveDecay:
		return "radioactive-decay";
	case ScenarioId::BindingEnergyCurve:
		return "binding-energy-curve";
	case ScenarioId::ProtonProtonCollision:
		return "proton-proton-collision";
	}
	throw std::runtime_error("Unknown nuclear-and-particle-physics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "radioactive-decay") {
		return ScenarioId::RadioactiveDecay;
	}
	if (value == "binding-energy-curve") {
		return ScenarioId::BindingEnergyCurve;
	}
	if (value == "proton-proton-collision") {
		return ScenarioId::ProtonProtonCollision;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::RadioactiveDecay:
		return {
			.id = id,
			.name = "Radioactive Decay",
			.summary = "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
			.equation_summary = "N(t) = N0 2^(-t / t1/2), A = lambda N",
			.status = "Starter decay slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 72.0, 0.0, 6.5},
			.focus_area = "Half-life intuition, residual population, and activity drop across one shared decay view.",
			.half_life_hours = 18.0,
			.initial_population_trillions = 6.2,
		};
	case ScenarioId::BindingEnergyCurve:
		return {
			.id = id,
			.name = "Binding Energy Curve",
			.summary = "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
			.equation_summary = "E_total approx A * (BE / A)",
			.status = "Starter nuclear-structure slice",
			.duration_seconds = 1.0,
			.view_bounds = {36.0, 76.0, 0.0, 520.0},
			.focus_area = "Mass-number scaling, proton fraction, and per-nucleon stability context.",
			.mass_number = 56.0,
			.proton_count = 26.0,
			.binding_energy_per_nucleon_mev = 8.8,
		};
	case ScenarioId::ProtonProtonCollision:
		return {
			.id = id,
			.name = "Proton-Proton Collision",
			.summary = "Estimate invariant mass, transverse momentum, and detector reach for a simplified collider event.",
			.equation_summary = "m_inv approx 2E sin(theta/2), pT approx E sin(theta/2)",
			.status = "Starter collider slice",
			.duration_seconds = 1.0,
			.view_bounds = {5.0, 175.0, 0.0, 14.0},
			.focus_area = "Beam energy, scattering angle, and detector scale in a first particle-physics event view.",
			.beam_energy_gev = 6.5,
			.scattering_angle_degrees = 28.0,
			.detector_radius_meters = 1.4,
		};
	}
	throw std::runtime_error("Unknown nuclear-and-particle-physics scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	const auto clamped_time = clamp(time_seconds, 0.0, scenario.duration_seconds);

	if (scenario.id == ScenarioId::BindingEnergyCurve) {
		const auto mass_number = scenario.mass_number.value_or(56.0);
		const auto proton_count = scenario.proton_count.value_or(26.0);
		const auto binding_energy_per_nucleon_mev =
			scenario.binding_energy_per_nucleon_mev.value_or(8.8);
		const auto adjusted_mass_number = std::round(mass_number + (clamped_time - 0.5) * 20.0);
		const auto total_binding_energy_mev = adjusted_mass_number * binding_energy_per_nucleon_mev;
		const auto proton_fraction = proton_count / std::max(adjusted_mass_number, 1.0);
		const auto stability_index = clamp(1.0 - std::abs(proton_fraction - 0.46) * 3.0, 0.0, 1.0);
		return {
			.time_seconds = clamped_time,
			.total_binding_energy_mev = total_binding_energy_mev,
			.stability_index = stability_index,
			.stable = stability_index >= 0.4,
		};
	}

	if (scenario.id == ScenarioId::ProtonProtonCollision) {
		const auto beam_energy_gev = scenario.beam_energy_gev.value_or(6.5);
		const auto scattering_angle_degrees = scenario.scattering_angle_degrees.value_or(28.0);
		const auto detector_radius_meters = scenario.detector_radius_meters.value_or(1.4);
		const auto dynamic_angle_degrees = scattering_angle_degrees * (0.65 + clamped_time * 0.5);
		const auto theta = (dynamic_angle_degrees * kPi) / 180.0;
		const auto invariant_mass_gev = 2.0 * beam_energy_gev * std::sin(theta / 2.0);
		const auto transverse_momentum_gev = beam_energy_gev * std::sin(theta / 2.0);
		const auto pseudorapidity = -std::log(std::tan(theta / 2.0));
		return {
			.time_seconds = clamped_time,
			.invariant_mass_gev = invariant_mass_gev,
			.transverse_momentum_gev = transverse_momentum_gev,
			.pseudorapidity = pseudorapidity,
			.stable = detector_radius_meters * transverse_momentum_gev >= 0.35,
		};
	}

	const auto half_life_hours = scenario.half_life_hours.value_or(18.0);
	const auto initial_population_trillions = scenario.initial_population_trillions.value_or(6.2);
	const auto elapsed_hours = clamped_time * half_life_hours * 4.0;
	const auto remaining_fraction = std::pow(0.5, elapsed_hours / half_life_hours);
	const auto remaining_population_trillions = initial_population_trillions * remaining_fraction;
	const auto activity_terabecquerels =
		(std::log(2.0) / half_life_hours) * remaining_population_trillions * 12.0;
	return {
		.time_seconds = clamped_time,
		.elapsed_hours = elapsed_hours,
		.remaining_population_trillions = remaining_population_trillions,
		.remaining_fraction = remaining_fraction,
		.activity_terabecquerels = activity_terabecquerels,
		.stable = remaining_population_trillions >= 0.0 && activity_terabecquerels >= 0.0,
	};
}

std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count) {
	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);

	if (scenario.id == ScenarioId::BindingEnergyCurve) {
		const auto mass_number = scenario.mass_number.value_or(56.0);
		const auto binding_energy_per_nucleon_mev =
			scenario.binding_energy_per_nucleon_mev.value_or(8.8);
		const auto active_total_binding_energy =
			sample_scenario(scenario, time_seconds).total_binding_energy_mev.value_or(0.0);
		std::size_t best_index = 0;
		double best_delta = std::numeric_limits<double>::infinity();
		for (std::size_t index = 0; index <= sample_count; index += 1) {
			const auto position = std::round(
				mass_number - 20.0 + (40.0 * static_cast<double>(index)) / static_cast<double>(sample_count));
			const auto proton_fraction_penalty = std::abs(position / 120.0 - 0.46) * 0.8;
			const auto primary_value =
				position * std::max(binding_energy_per_nucleon_mev - proton_fraction_penalty, 0.5);
			const auto secondary_value = clamp(1.0 - proton_fraction_penalty, 0.0, 1.0);
			const auto delta = std::abs(primary_value - active_total_binding_energy);
			if (delta < best_delta) {
				best_delta = delta;
				best_index = index;
			}
			samples.push_back({
				.position = position,
				.primary_value = primary_value,
				.secondary_value = secondary_value,
				.label = "binding-energy-curve-profile",
				.active = false,
			});
		}
		samples[best_index].active = true;
		return samples;
	}

	if (scenario.id == ScenarioId::ProtonProtonCollision) {
		const auto beam_energy_gev = scenario.beam_energy_gev.value_or(6.5);
		const auto active_invariant_mass =
			sample_scenario(scenario, time_seconds).invariant_mass_gev.value_or(0.0);
		std::size_t best_index = 0;
		double best_delta = std::numeric_limits<double>::infinity();
		for (std::size_t index = 0; index <= sample_count; index += 1) {
			const auto position = 5.0 + (170.0 * static_cast<double>(index)) /
				static_cast<double>(sample_count);
			const auto theta = (position * kPi) / 180.0;
			const auto primary_value = 2.0 * beam_energy_gev * std::sin(theta / 2.0);
			const auto secondary_value = beam_energy_gev * std::sin(theta / 2.0);
			const auto delta = std::abs(primary_value - active_invariant_mass);
			if (delta < best_delta) {
				best_delta = delta;
				best_index = index;
			}
			samples.push_back({
				.position = position,
				.primary_value = primary_value,
				.secondary_value = secondary_value,
				.label = "proton-proton-collision-profile",
				.active = false,
			});
		}
		samples[best_index].active = true;
		return samples;
	}

	const auto half_life_hours = scenario.half_life_hours.value_or(18.0);
	const auto initial_population_trillions = scenario.initial_population_trillions.value_or(6.2);
	const auto active_hours = sample_scenario(scenario, time_seconds).elapsed_hours.value_or(0.0);
	const auto max_hours = half_life_hours * 4.0;
	std::size_t best_index = 0;
	double best_delta = std::numeric_limits<double>::infinity();
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto position = (static_cast<double>(index) / static_cast<double>(sample_count)) * max_hours;
		const auto remaining_fraction = std::pow(0.5, position / half_life_hours);
		const auto primary_value = initial_population_trillions * remaining_fraction;
		const auto secondary_value =
			(std::log(2.0) / half_life_hours) * initial_population_trillions * remaining_fraction * 12.0;
		const auto delta = std::abs(position - active_hours);
		if (delta < best_delta) {
			best_delta = delta;
			best_index = index;
		}
		samples.push_back({
			.position = position,
			.primary_value = primary_value,
			.secondary_value = secondary_value,
			.label = "radioactive-decay-profile",
			.active = false,
		});
	}
	samples[best_index].active = true;
	return samples;
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	return build_samples_at_time(scenario, default_time_seconds(scenario.id), sample_count);
}

}  // namespace visual_physics::nuclear_and_particle_physics