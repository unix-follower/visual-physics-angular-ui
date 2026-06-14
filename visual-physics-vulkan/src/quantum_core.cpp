#include "quantum_core.hpp"

#include <algorithm>
#include <cmath>
#include <numbers>
#include <stdexcept>

namespace visual_physics::quantum {
namespace {

constexpr double kElectronMassKg = 9.1093837015e-31;
constexpr double kPlanckConstant = 6.62607015e-34;
constexpr double kHbar = 1.054571817e-34;
constexpr double kElementaryCharge = 1.602176634e-19;
constexpr double kPi = std::numbers::pi_v<double>;

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double sinc(double value) {
	if (std::abs(value) < 1e-9) {
		return 1.0;
	}
	return std::sin(value) / value;
}

float normalize_x(double x, const ViewBounds& bounds) {
	const auto span = std::max(bounds.max_x - bounds.min_x, 1e-6);
	return static_cast<float>(((x - bounds.min_x) / span) * 2.0 - 1.0);
}

float normalize_y(double y, const ViewBounds& bounds) {
	const auto span = std::max(bounds.max_y - bounds.min_y, 1e-6);
	return static_cast<float>(((y - bounds.min_y) / span) * 2.0 - 1.0);
}

Snapshot build_particle_in_box_snapshot(const Scenario& scenario, double time_seconds) {
	const auto box_length_nanometers = std::max(scenario.box_length_nanometers.value_or(1.2), 0.1);
	const auto quantum_number = std::max(1.0, std::round(scenario.quantum_number.value_or(1.0)));
	const auto box_length_meters = box_length_nanometers * 1e-9;
	const auto energy_joules =
		((quantum_number * quantum_number) * (kPlanckConstant * kPlanckConstant)) /
		(8.0 * kElectronMassKg * box_length_meters * box_length_meters);
	const auto energy_level_ev = energy_joules / kElementaryCharge;

	return {
		.time_seconds = time_seconds,
		.box_length_nanometers = box_length_nanometers,
		.quantum_number = quantum_number,
		.energy_level_ev = energy_level_ev,
		.de_broglie_wavelength_nanometers = (2.0 * box_length_nanometers) / quantum_number,
		.node_count = quantum_number - 1.0,
		.first_antinode_nanometers = box_length_nanometers / (2.0 * quantum_number),
		.stable = std::isfinite(energy_level_ev),
	};
}

Snapshot build_tunneling_snapshot(const Scenario& scenario, double time_seconds) {
	const auto particle_energy_ev = std::max(scenario.particle_energy_ev.value_or(2.1), 0.05);
	const auto barrier_height_ev = std::max(
		scenario.barrier_height_ev.value_or(3.8),
		particle_energy_ev + 0.01);
	const auto barrier_width_nanometers = std::max(scenario.barrier_width_nanometers.value_or(0.45), 0.05);
	const auto barrier_width_meters = barrier_width_nanometers * 1e-9;
	const auto delta_energy_joules = (barrier_height_ev - particle_energy_ev) * kElementaryCharge;
	const auto kappa = std::sqrt(2.0 * kElectronMassKg * delta_energy_joules) / kHbar;
	const auto transmission_probability = clamp(std::exp(-2.0 * kappa * barrier_width_meters), 1e-6, 0.999999);

	return {
		.time_seconds = time_seconds,
		.particle_energy_ev = particle_energy_ev,
		.barrier_height_ev = barrier_height_ev,
		.barrier_width_nanometers = barrier_width_nanometers,
		.transmission_probability = transmission_probability,
		.reflection_probability = 1.0 - transmission_probability,
		.decay_length_nanometers = (1.0 / kappa) * 1e9,
		.stable = std::isfinite(transmission_probability),
	};
}

Snapshot build_double_slit_snapshot(const Scenario& scenario, double time_seconds) {
	const auto wavelength_nanometers = std::max(scenario.wavelength_nanometers.value_or(520.0), 100.0);
	const auto slit_separation_micrometers = std::max(scenario.slit_separation_micrometers.value_or(120.0), 1.0);
	const auto slit_width_micrometers = std::max(scenario.slit_width_micrometers.value_or(40.0), 1.0);
	const auto screen_distance_meters = std::max(scenario.screen_distance_meters.value_or(1.8), 0.1);
	const auto wavelength_meters = wavelength_nanometers * 1e-9;
	const auto slit_separation_meters = slit_separation_micrometers * 1e-6;
	const auto slit_width_meters = slit_width_micrometers * 1e-6;
	const auto fringe_spacing_millimeters =
		(screen_distance_meters * wavelength_meters * 1000.0) / slit_separation_meters;
	const auto central_maximum_width_millimeters =
		(2.0 * screen_distance_meters * wavelength_meters * 1000.0) / slit_width_meters;

	return {
		.time_seconds = time_seconds,
		.wavelength_nanometers = wavelength_nanometers,
		.slit_separation_micrometers = slit_separation_micrometers,
		.slit_width_micrometers = slit_width_micrometers,
		.screen_distance_meters = screen_distance_meters,
		.fringe_spacing_millimeters = fringe_spacing_millimeters,
		.central_maximum_width_millimeters = central_maximum_width_millimeters,
		.coherence_estimate = slit_separation_micrometers / slit_width_micrometers,
		.stable = std::isfinite(fringe_spacing_millimeters),
	};
}

std::vector<Sample> build_particle_in_box_samples(const Snapshot& snapshot, std::size_t sample_count) {
	const auto length_nanometers = snapshot.box_length_nanometers.value_or(1.2);
	const auto quantum_number = std::max(1.0, std::round(snapshot.quantum_number.value_or(1.0)));
	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto fraction = static_cast<double>(index) / static_cast<double>(sample_count);
		const auto position = fraction * length_nanometers;
		const auto phase = (quantum_number * kPi * position) / length_nanometers;
		samples.push_back({
			.position = position,
			.primary_value = std::sin(phase) * std::sin(phase),
			.secondary_value = std::sin(phase),
			.label = "probability-density",
			.active = true,
		});
	}
	return samples;
}

std::vector<Sample> build_tunneling_samples(const Snapshot& snapshot, std::size_t sample_count) {
	const auto width_nanometers = snapshot.barrier_width_nanometers.value_or(0.45);
	const auto transmission_probability = snapshot.transmission_probability.value_or(0.0);
	const auto decay_length_nanometers = snapshot.decay_length_nanometers.value_or(0.1);
	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto fraction = static_cast<double>(index) / static_cast<double>(sample_count);
		const auto position = fraction * (width_nanometers * 3.0);
		double probability = 1.0;
		double potential = 0.0;
		if (position >= width_nanometers && position <= width_nanometers * 2.0) {
			potential = snapshot.barrier_height_ev.value_or(0.0);
			probability = std::exp(-(position - width_nanometers) / decay_length_nanometers);
		} else if (position > width_nanometers * 2.0) {
			probability = transmission_probability;
		}
		samples.push_back({
			.position = position,
			.primary_value = probability,
			.secondary_value = potential,
			.label = "tunneling-envelope",
			.active = true,
		});
	}
	return samples;
}

std::vector<Sample> build_double_slit_samples(const Snapshot& snapshot, std::size_t sample_count) {
	const auto fringe_spacing_millimeters = snapshot.fringe_spacing_millimeters.value_or(1.0);
	const auto central_maximum_width_millimeters = snapshot.central_maximum_width_millimeters.value_or(2.0);
	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto fraction = static_cast<double>(index) / static_cast<double>(sample_count);
		const auto position = (fraction - 0.5) * fringe_spacing_millimeters * 8.0;
		const auto beta = kPi * position / fringe_spacing_millimeters;
		const auto alpha = kPi * position / (central_maximum_width_millimeters / 2.0);
		samples.push_back({
			.position = position,
			.primary_value = (std::cos(beta) * std::cos(beta)) * (sinc(alpha) * sinc(alpha)),
			.secondary_value = std::nullopt,
			.label = "screen-intensity",
			.active = true,
		});
	}
	return samples;
}

void append_segment(
	std::vector<NormalizedVertex>& vertices,
	float start_x,
	float start_y,
	float end_x,
	float end_y) {
	vertices.push_back({start_x, start_y});
	vertices.push_back({end_x, end_y});
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::ParticleInBox:
		return "particle-in-a-box";
	case ScenarioId::FinitePotentialWellTunneling:
		return "finite-potential-well-tunneling";
	case ScenarioId::DoubleSlitInterference:
		return "double-slit-interference";
	}
	throw std::runtime_error("Unknown quantum scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "particle-in-a-box") {
		return ScenarioId::ParticleInBox;
	}
	if (value == "finite-potential-well-tunneling") {
		return ScenarioId::FinitePotentialWellTunneling;
	}
	if (value == "double-slit-interference") {
		return ScenarioId::DoubleSlitInterference;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::ParticleInBox:
		return {
			.id = id,
			.name = "Particle in a One-Dimensional Box",
			.summary = "Compute stationary-state energy levels, node count, and probability-density structure for a particle confined between rigid walls.",
			.equation_summary = "E_n = n^2 h^2 / (8 m L^2), psi_n(x) = sqrt(2/L) sin(n pi x / L)",
			.status = "Implemented",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 1.2, -0.2, 1.2},
			.focus_area = "Quantized bound-state energy, spatial nodes, and stationary probability density in a 1D infinite well.",
			.box_length_nanometers = 1.2,
			.quantum_number = 1.0,
		};
	case ScenarioId::FinitePotentialWellTunneling:
		return {
			.id = id,
			.name = "Finite Barrier Tunneling",
			.summary = "Estimate transmission, reflection, and evanescent decay for a particle incident on a finite rectangular barrier.",
			.equation_summary = "T ~ exp(-2 kappa a), kappa = sqrt(2 m (V - E)) / hbar",
			.status = "Implemented",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 1.35, -0.2, 4.5},
			.focus_area = "Barrier penetration, forbidden-region decay length, and transmission versus reflection at fixed incident energy.",
			.particle_energy_ev = 2.1,
			.barrier_height_ev = 3.8,
			.barrier_width_nanometers = 0.45,
		};
	case ScenarioId::DoubleSlitInterference:
		return {
			.id = id,
			.name = "Double-Slit Interference Pattern",
			.summary = "Estimate fringe spacing and central-envelope behavior for two coherent slits illuminating a distant screen.",
			.equation_summary = "Delta y ~ lambda L / d, I(theta) ~ cos^2(beta) sinc^2(alpha)",
			.status = "Implemented",
			.duration_seconds = 1.0,
			.view_bounds = {-15.0, 15.0, -0.05, 1.05},
			.focus_area = "Interference spacing, diffraction-envelope width, and screen-intensity structure from coherent two-slit superposition.",
			.wavelength_nanometers = 520.0,
			.slit_separation_micrometers = 120.0,
			.slit_width_micrometers = 40.0,
			.screen_distance_meters = 1.8,
		};
	}
	throw std::runtime_error("Unknown quantum scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	switch (scenario.id) {
	case ScenarioId::ParticleInBox:
		return build_particle_in_box_snapshot(scenario, time_seconds);
	case ScenarioId::FinitePotentialWellTunneling:
		return build_tunneling_snapshot(scenario, time_seconds);
	case ScenarioId::DoubleSlitInterference:
		return build_double_slit_snapshot(scenario, time_seconds);
	}
	throw std::runtime_error("Unknown quantum scenario id");
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	const auto snapshot = sample_scenario(scenario, scenario.duration_seconds * 0.25);
	switch (scenario.id) {
	case ScenarioId::ParticleInBox:
		return build_particle_in_box_samples(snapshot, sample_count);
	case ScenarioId::FinitePotentialWellTunneling:
		return build_tunneling_samples(snapshot, sample_count);
	case ScenarioId::DoubleSlitInterference:
		return build_double_slit_samples(snapshot, sample_count);
	}
	throw std::runtime_error("Unknown quantum scenario id");
}

std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario) {
	const auto& bounds = scenario.view_bounds;
	return {
		{normalize_x(bounds.min_x, bounds), normalize_y(0.0, bounds)},
		{normalize_x(bounds.max_x, bounds), normalize_y(0.0, bounds)},
		{normalize_x(bounds.min_x, bounds), normalize_y(bounds.min_y, bounds)},
		{normalize_x(bounds.min_x, bounds), normalize_y(bounds.max_y, bounds)},
	};
}

std::vector<NormalizedVertex> build_scenario_vertices(const Scenario& scenario, std::size_t sample_count) {
	const auto snapshot = sample_scenario(scenario, scenario.duration_seconds * 0.25);
	const auto samples = build_samples(scenario, sample_count);
	std::vector<NormalizedVertex> vertices;
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		append_segment(
			vertices,
			normalize_x(samples[index - 1].position, scenario.view_bounds),
			normalize_y(samples[index - 1].primary_value, scenario.view_bounds),
			normalize_x(samples[index].position, scenario.view_bounds),
			normalize_y(samples[index].primary_value, scenario.view_bounds));
	}
	if (scenario.id == ScenarioId::FinitePotentialWellTunneling) {
		const auto width = snapshot.barrier_width_nanometers.value_or(0.45);
		append_segment(vertices,
			normalize_x(width, scenario.view_bounds), normalize_y(0.0, scenario.view_bounds),
			normalize_x(width, scenario.view_bounds), normalize_y(snapshot.barrier_height_ev.value_or(0.0), scenario.view_bounds));
		append_segment(vertices,
			normalize_x(width * 2.0, scenario.view_bounds), normalize_y(0.0, scenario.view_bounds),
			normalize_x(width * 2.0, scenario.view_bounds), normalize_y(snapshot.barrier_height_ev.value_or(0.0), scenario.view_bounds));
	}
	return vertices;
}

std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio) {
	static_cast<void>(aspect_ratio);
	std::vector<NormalizedVertex> vertices;
	if (scenario.id == ScenarioId::ParticleInBox && snapshot.first_antinode_nanometers.has_value()) {
		const auto x = normalize_x(*snapshot.first_antinode_nanometers, scenario.view_bounds);
		const auto y = normalize_y(1.0, scenario.view_bounds);
		vertices.push_back({x - 0.01F, y - 0.02F});
		vertices.push_back({x + 0.01F, y - 0.02F});
		vertices.push_back({x, y + 0.02F});
	} else if (
		scenario.id == ScenarioId::FinitePotentialWellTunneling &&
		snapshot.barrier_width_nanometers.has_value() &&
		snapshot.transmission_probability.has_value()) {
		const auto barrier_center_x =
			normalize_x(*snapshot.barrier_width_nanometers * 1.5, scenario.view_bounds);
		const auto transmission_y =
			normalize_y(*snapshot.transmission_probability, scenario.view_bounds);
		vertices.push_back({barrier_center_x - 0.015F, transmission_y});
		vertices.push_back({barrier_center_x + 0.015F, transmission_y});
	} else if (
		scenario.id == ScenarioId::DoubleSlitInterference &&
		snapshot.fringe_spacing_millimeters.has_value()) {
		const auto center_x = normalize_x(0.0, scenario.view_bounds);
		const auto fringe_y = normalize_y(1.0, scenario.view_bounds);
		const auto offset = static_cast<float>(
			std::min(*snapshot.fringe_spacing_millimeters, 2.5) /
			std::max(scenario.view_bounds.max_x - scenario.view_bounds.min_x, 1.0) * 2.0);
		vertices.push_back({center_x, fringe_y});
		vertices.push_back({center_x + offset, fringe_y - 0.05F});
	}
	return vertices;
}

}  // namespace visual_physics::quantum