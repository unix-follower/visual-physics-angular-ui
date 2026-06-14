#include "waves_core.hpp"

#include <algorithm>
#include <cmath>
#include <numbers>
#include <stdexcept>

namespace visual_physics::waves {
namespace {

constexpr double kPi = std::numbers::pi_v<double>;

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

double default_time_seconds(ScenarioId id) {
	switch (id) {
	case ScenarioId::StandingWave:
		return 0.0;
	case ScenarioId::TravelingWave:
		return 0.25;
	case ScenarioId::DopplerEffect:
		return 0.0;
	}
	throw std::runtime_error("Unknown waves scenario id");
}

Snapshot build_standing_wave_snapshot(const Scenario& scenario, double time_seconds) {
	const auto string_length_meters = std::max(scenario.string_length_meters.value_or(1.2), 0.1);
	const auto wave_speed_meters_per_second =
		std::max(scenario.wave_speed_meters_per_second.value_or(24.0), 0.1);
	const auto amplitude_millimeters =
		std::max(scenario.amplitude_millimeters.value_or(6.0), 0.1);
	const auto harmonic_number = std::max(1.0, std::round(scenario.harmonic_number.value_or(2.0)));
	const auto wavelength_meters = (2.0 * string_length_meters) / harmonic_number;
	const auto frequency_hertz = wave_speed_meters_per_second / wavelength_meters;

	return {
		.time_seconds = time_seconds,
		.string_length_meters = string_length_meters,
		.wave_speed_meters_per_second = wave_speed_meters_per_second,
		.amplitude_millimeters = amplitude_millimeters,
		.harmonic_number = harmonic_number,
		.wavelength_meters = wavelength_meters,
		.frequency_hertz = frequency_hertz,
		.stable = std::isfinite(frequency_hertz),
	};
}

Snapshot build_traveling_wave_snapshot(const Scenario& scenario, double time_seconds) {
	const auto wave_speed_meters_per_second =
		std::max(scenario.wave_speed_meters_per_second.value_or(18.0), 0.1);
	const auto amplitude_millimeters =
		std::max(scenario.amplitude_millimeters.value_or(4.0), 0.1);
	const auto frequency_hertz = std::max(scenario.frequency_hertz.value_or(6.0), 0.1);
	const auto wavelength_meters = wave_speed_meters_per_second / frequency_hertz;

	return {
		.time_seconds = time_seconds,
		.wave_speed_meters_per_second = wave_speed_meters_per_second,
		.amplitude_millimeters = amplitude_millimeters,
		.wavelength_meters = wavelength_meters,
		.frequency_hertz = frequency_hertz,
		.stable = std::isfinite(wavelength_meters),
	};
}

Snapshot build_doppler_snapshot(const Scenario& scenario, double time_seconds) {
	const auto wave_speed_meters_per_second =
		std::max(scenario.wave_speed_meters_per_second.value_or(343.0), 0.1);
	const auto emitted_frequency_hertz =
		std::max(scenario.emitted_frequency_hertz.value_or(440.0), 0.1);
	const auto source_speed_meters_per_second = clamp(
		scenario.source_speed_meters_per_second.value_or(18.0),
		-wave_speed_meters_per_second * 0.9,
		wave_speed_meters_per_second * 0.9);
	const auto observer_speed_meters_per_second = clamp(
		scenario.observer_speed_meters_per_second.value_or(0.0),
		-wave_speed_meters_per_second * 0.9,
		wave_speed_meters_per_second * 0.9);
	const auto apparent_frequency_hertz = emitted_frequency_hertz *
		((wave_speed_meters_per_second + observer_speed_meters_per_second) /
		 (wave_speed_meters_per_second - source_speed_meters_per_second));
	const auto wavelength_meters = wave_speed_meters_per_second / emitted_frequency_hertz;

	return {
		.time_seconds = time_seconds,
		.wave_speed_meters_per_second = wave_speed_meters_per_second,
		.wavelength_meters = wavelength_meters,
		.emitted_frequency_hertz = emitted_frequency_hertz,
		.source_speed_meters_per_second = source_speed_meters_per_second,
		.observer_speed_meters_per_second = observer_speed_meters_per_second,
		.apparent_frequency_hertz = apparent_frequency_hertz,
		.stable = std::isfinite(apparent_frequency_hertz),
	};
}

std::vector<Sample> build_standing_wave_samples(const Snapshot& snapshot, std::size_t sample_count) {
	const auto string_length_meters = snapshot.string_length_meters.value_or(1.2);
	const auto amplitude_millimeters = snapshot.amplitude_millimeters.value_or(6.0);
	const auto harmonic_number = std::max(1.0, std::round(snapshot.harmonic_number.value_or(2.0)));
	const auto frequency_hertz = std::max(snapshot.frequency_hertz.value_or(0.0), 0.0);
	const auto temporal_scale = std::cos(2.0 * kPi * frequency_hertz * snapshot.time_seconds);

	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto fraction = static_cast<double>(index) / static_cast<double>(sample_count);
		const auto position = fraction * string_length_meters;
		const auto displacement = amplitude_millimeters *
			std::sin((harmonic_number * kPi * position) / string_length_meters) * temporal_scale;
		samples.push_back({
			.position = position,
			.primary_value = displacement,
			.secondary_value = std::nullopt,
			.label = "standing-wave-profile",
			.active = true,
		});
	}
	return samples;
}

std::vector<Sample> build_traveling_wave_samples(const Snapshot& snapshot, std::size_t sample_count) {
	const auto amplitude_millimeters = snapshot.amplitude_millimeters.value_or(4.0);
	const auto wavelength_meters = snapshot.wavelength_meters.value_or(3.0);
	const auto frequency_hertz = snapshot.frequency_hertz.value_or(6.0);

	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto fraction = static_cast<double>(index) / static_cast<double>(sample_count);
		const auto position = fraction * (wavelength_meters * 2.0);
		const auto phase = 2.0 * kPi * ((position / wavelength_meters) - frequency_hertz * snapshot.time_seconds);
		samples.push_back({
			.position = position,
			.primary_value = amplitude_millimeters * std::sin(phase),
			.secondary_value = std::nullopt,
			.label = "traveling-wave-profile",
			.active = true,
		});
	}
	return samples;
}

std::vector<Sample> build_doppler_samples(const Snapshot& snapshot, std::size_t sample_count) {
	const auto emitted_frequency_hertz = snapshot.emitted_frequency_hertz.value_or(440.0);
	const auto apparent_frequency_hertz = snapshot.apparent_frequency_hertz.value_or(emitted_frequency_hertz);
	const auto source_position = clamp(
		-6.0 + (snapshot.source_speed_meters_per_second.value_or(0.0) * snapshot.time_seconds * 0.18),
		-9.0,
		7.0);
	const auto observer_position = clamp(
		6.0 + (snapshot.observer_speed_meters_per_second.value_or(0.0) * snapshot.time_seconds * 0.18),
		source_position + 1.0,
		10.0);

	std::vector<Sample> samples;
	samples.reserve(sample_count + 1);
	for (std::size_t index = 0; index <= sample_count; index += 1) {
		const auto fraction = static_cast<double>(index) / static_cast<double>(sample_count);
		const auto position = -12.0 + fraction * 24.0;
		const auto interpolation = clamp(
			(position - source_position) / std::max(observer_position - source_position, 1.0),
			0.0,
			1.0);
		const auto smooth_interpolation = interpolation * interpolation * (3.0 - 2.0 * interpolation);
		samples.push_back({
			.position = position,
			.primary_value = emitted_frequency_hertz +
				(apparent_frequency_hertz - emitted_frequency_hertz) * smooth_interpolation,
			.secondary_value = std::nullopt,
			.label = "doppler-frequency-shift",
			.active = true,
		});
	}
	return samples;
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::StandingWave:
		return "standing-wave";
	case ScenarioId::TravelingWave:
		return "traveling-wave";
	case ScenarioId::DopplerEffect:
		return "doppler-effect";
	}
	throw std::runtime_error("Unknown waves scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "standing-wave") {
		return ScenarioId::StandingWave;
	}
	if (value == "traveling-wave") {
		return ScenarioId::TravelingWave;
	}
	if (value == "doppler-effect") {
		return ScenarioId::DopplerEffect;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::StandingWave:
		return {
			.id = id,
			.name = "Standing Wave on a String",
			.summary = "Resolve harmonic mode shape, wavelength, and resonant frequency for a stretched one-dimensional string.",
			.equation_summary = "f_n = n v / (2L), lambda_n = 2L / n",
			.status = "Validated shared slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 1.2, -1.2, 1.2},
			.focus_area = "Harmonic mode count, standing-wave node spacing, and wavelength-frequency scaling at fixed wave speed.",
			.string_length_meters = 1.2,
			.wave_speed_meters_per_second = 24.0,
			.amplitude_millimeters = 6.0,
			.harmonic_number = 2.0,
		};
	case ScenarioId::TravelingWave:
		return {
			.id = id,
			.name = "Traveling Wave Pulse Train",
			.summary = "Track a sinusoidal traveling wave using wavelength, frequency, and propagation speed on a one-dimensional medium.",
			.equation_summary = "y(x,t) = A sin(2 pi (x / lambda - f t))",
			.status = "Validated shared slice",
			.duration_seconds = 1.0,
			.view_bounds = {0.0, 2.4, -1.2, 1.2},
			.focus_area = "Propagation speed, phase advance, and wavelength-frequency coupling for a deterministic traveling-wave trace.",
			.wave_speed_meters_per_second = 18.0,
			.amplitude_millimeters = 4.0,
			.frequency_hertz = 6.0,
		};
	case ScenarioId::DopplerEffect:
		return {
			.id = id,
			.name = "One-Dimensional Doppler Shift",
			.summary = "Estimate apparent frequency shifts for a moving source and observer in a shared acoustic medium.",
			.equation_summary = "f' = f (v + v_o) / (v - v_s)",
			.status = "Validated shared slice",
			.duration_seconds = 1.0,
			.view_bounds = {-20.0, 20.0, -1.2, 1.2},
			.focus_area = "Apparent pitch shift, relative source-observer motion, and wavelength compression or dilation in the medium.",
			.wave_speed_meters_per_second = 343.0,
			.emitted_frequency_hertz = 440.0,
			.source_speed_meters_per_second = 18.0,
			.observer_speed_meters_per_second = 0.0,
		};
	}
	throw std::runtime_error("Unknown waves scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	switch (scenario.id) {
	case ScenarioId::StandingWave:
		return build_standing_wave_snapshot(scenario, std::max(time_seconds, 0.0));
	case ScenarioId::TravelingWave:
		return build_traveling_wave_snapshot(scenario, std::max(time_seconds, 0.0));
	case ScenarioId::DopplerEffect:
		return build_doppler_snapshot(scenario, std::max(time_seconds, 0.0));
	}
	throw std::runtime_error("Unknown waves scenario id");
}

std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count) {
	const auto snapshot = sample_scenario(scenario, time_seconds);
	switch (scenario.id) {
	case ScenarioId::StandingWave:
		return build_standing_wave_samples(snapshot, sample_count);
	case ScenarioId::TravelingWave:
		return build_traveling_wave_samples(snapshot, sample_count);
	case ScenarioId::DopplerEffect:
		return build_doppler_samples(snapshot, sample_count);
	}
	throw std::runtime_error("Unknown waves scenario id");
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	return build_samples_at_time(scenario, default_time_seconds(scenario.id), sample_count);
}

}  // namespace visual_physics::waves