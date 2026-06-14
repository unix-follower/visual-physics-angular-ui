#include "electronics_overlay.hpp"

#include <algorithm>
#include <cmath>

namespace visual_physics::electronics {
namespace {

double normalize_x(double time_seconds, const Scenario& scenario) {
	const double normalized =
		(time_seconds - scenario.view_bounds.min_x) /
		(scenario.view_bounds.max_x - scenario.view_bounds.min_x);
	return -0.9 + normalized * 1.8;
}

double normalize_y(double value, const Scenario& scenario) {
	const double normalized =
		(value - scenario.view_bounds.min_y) /
		(scenario.view_bounds.max_y - scenario.view_bounds.min_y);
	return -0.9 + normalized * 1.8;
}

void append_series(
	std::vector<OverlayVertex>& vertices,
	const std::vector<Sample>& samples,
	const Scenario& scenario,
	auto value_getter,
	const std::array<float, 4>& color) {
	if (samples.size() < 2) {
		return;
	}

	for (std::size_t index = 1; index < samples.size(); index += 1) {
		vertices.push_back({
			static_cast<float>(normalize_x(samples[index - 1].time_seconds, scenario)),
			static_cast<float>(normalize_y(value_getter(samples[index - 1]), scenario)),
			color[0],
			color[1],
			color[2],
			color[3],
		});
		vertices.push_back({
			static_cast<float>(normalize_x(samples[index].time_seconds, scenario)),
			static_cast<float>(normalize_y(value_getter(samples[index]), scenario)),
			color[0],
			color[1],
			color[2],
			color[3],
		});
	}
}

}  // namespace

std::vector<OverlayVertex> build_overlay_line_vertices(
	const Snapshot& snapshot,
	const std::vector<Sample>& samples,
	const Scenario& scenario,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	if (scenario.id == ScenarioId::ResistorNetwork) {
		if (overlays.show_source_voltage) {
			vertices.push_back({-0.55F, 0.0F, 0.93F, 0.69F, 0.28F, 1.0F});
			vertices.push_back({-0.55F, 0.55F, 0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage && snapshot.output_voltage.has_value()) {
			const float y = static_cast<float>(-0.7 + (*snapshot.output_voltage / std::max(scenario.source_voltage, 1e-6)) * 1.4);
			vertices.push_back({-0.1F, y, 0.43F, 0.89F, 0.64F, 1.0F});
			vertices.push_back({0.5F, y, 0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve && snapshot.lower_branch_power_watts.has_value()) {
			const float height = static_cast<float>(std::min(*snapshot.lower_branch_power_watts / 0.03, 0.7));
			vertices.push_back({0.65F, -0.7F, 0.98F, 0.43F, 0.63F, 0.9F});
			vertices.push_back({0.65F, -0.7F + height, 0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::RlTransient) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.source_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.capacitor_voltage;
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [&](const Sample& sample) {
				const double inductance_henrys = std::max(scenario.inductance_henrys.value_or(0.0), 1e-6);
				const double steady_state_current = scenario.source_voltage / std::max(scenario.resistance_ohms, 1e-6);
				const double steady_state_energy = 0.5 * inductance_henrys * steady_state_current * steady_state_current;
				return steady_state_energy <= 1e-9
					? 0.0
					: (sample.stored_energy_joules / steady_state_energy) * scenario.source_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::RcLowPass) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.source_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.output_voltage.value_or(sample.capacitor_voltage);
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [&](const Sample& sample) {
				const double max_energy = 0.5 * std::max(scenario.capacitance_farads, 1e-12) *
					scenario.source_voltage * scenario.source_voltage;
				return max_energy <= 1e-9
					? 0.0
					: (sample.stored_energy_joules / max_energy) * scenario.source_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::RcHighPass) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.source_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.output_voltage.value_or(0.0);
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.capacitor_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::RlLowPass) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.source_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.output_voltage.value_or(0.0);
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.capacitor_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::RlHighPass) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.source_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.output_voltage.value_or(0.0);
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.capacitor_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::RlcResonance) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.source_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.output_voltage.value_or(sample.capacitor_voltage);
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [&](const Sample& sample) {
				const double capacitance_farads = std::max(scenario.capacitance_farads, 1e-12);
				const double inductance_henrys = std::max(scenario.inductance_henrys.value_or(0.0), 1e-6);
				const double resonant_frequency =
					1.0 / (2.0 * 3.14159265358979323846 * std::sqrt(inductance_henrys * capacitance_farads));
				const auto resonance_snapshot = sample_scenario(scenario, resonant_frequency);
				const double max_energy = std::max(resonance_snapshot.stored_energy_joules, 1e-9);
				return (sample.stored_energy_joules / max_energy) * scenario.source_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::RlcResponse) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.source_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [&](const Sample& sample) {
				return sample.current_amps * scenario.resistance_ohms;
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [&](const Sample& sample) {
				const double max_energy = std::max(
					0.5 * std::max(scenario.capacitance_farads, 1e-12) * scenario.source_voltage * scenario.source_voltage,
					1e-9);
				return (sample.stored_energy_joules / max_energy) * scenario.source_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::HalfWaveRectifier) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.capacitor_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.output_voltage.value_or(0.0);
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [&](const Sample& sample) {
				const double max_output_voltage = std::max(scenario.source_voltage - 0.7, 1e-6);
				const double max_branch_power = (max_output_voltage * max_output_voltage) /
					std::max(scenario.resistance_ohms, 1e-6);
				return max_branch_power <= 1e-9
					? 0.0
					: (sample.lower_branch_power_watts.value_or(0.0) / max_branch_power) * scenario.source_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::FullWaveRectifier) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.capacitor_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.output_voltage.value_or(0.0);
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [&](const Sample& sample) {
				const double max_output_voltage = std::max(scenario.source_voltage - 1.4, 1e-6);
				const double max_branch_power = (max_output_voltage * max_output_voltage) /
					std::max(scenario.resistance_ohms, 1e-6);
				return max_branch_power <= 1e-9
					? 0.0
					: (sample.lower_branch_power_watts.value_or(0.0) / max_branch_power) * scenario.source_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}
	if (scenario.id == ScenarioId::SmoothedRectifier) {
		if (overlays.show_source_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.capacitor_voltage;
			}, {0.93F, 0.69F, 0.28F, 1.0F});
		}
		if (overlays.show_resistor_voltage) {
			append_series(vertices, samples, scenario, [](const Sample& sample) {
				return sample.output_voltage.value_or(0.0);
			}, {0.43F, 0.89F, 0.64F, 1.0F});
		}
		if (overlays.show_energy_curve) {
			append_series(vertices, samples, scenario, [&](const Sample& sample) {
				const double max_energy = 0.5 * std::max(scenario.capacitance_farads, 1e-12) *
					scenario.source_voltage * scenario.source_voltage;
				return max_energy <= 1e-9
					? 0.0
					: (sample.stored_energy_joules / max_energy) * scenario.source_voltage;
			}, {0.98F, 0.43F, 0.63F, 0.9F});
		}
		return vertices;
	}

	static_cast<void>(snapshot);
	if (overlays.show_source_voltage) {
		append_series(vertices, samples, scenario, [](const Sample& sample) {
			return sample.source_voltage;
		}, {0.93F, 0.69F, 0.28F, 1.0F});
	}
	if (overlays.show_resistor_voltage) {
		append_series(vertices, samples, scenario, [&](const Sample& sample) {
			return sample.source_voltage - sample.capacitor_voltage;
		}, {0.43F, 0.89F, 0.64F, 1.0F});
	}
	if (overlays.show_energy_curve) {
		append_series(vertices, samples, scenario, [&](const Sample& sample) {
			return scenario.source_voltage == 0.0
				? 0.0
				: (sample.stored_energy_joules /
					(0.5 * scenario.capacitance_farads * scenario.source_voltage * scenario.source_voltage)) *
					scenario.source_voltage;
		}, {0.98F, 0.43F, 0.63F, 0.9F});
	}
	return vertices;
}

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays) {
	std::vector<OverlayVertex> vertices;
	if (scenario.id == ScenarioId::ResistorNetwork) {
		if (!overlays.show_resistor_voltage || !snapshot.output_voltage.has_value()) {
			return vertices;
		}
		const float center_x = 0.5F;
		const float center_y = static_cast<float>(-0.7 + (*snapshot.output_voltage / std::max(scenario.source_voltage, 1e-6)) * 1.4);
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.43F, 0.89F, 0.64F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::RlTransient) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.source_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::RlcResponse) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.source_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::RcLowPass) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.source_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::RcHighPass) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.source_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::RlLowPass) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.source_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::RlHighPass) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.source_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::RlcResonance) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.source_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::HalfWaveRectifier) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.capacitor_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::FullWaveRectifier) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.capacitor_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}
	if (scenario.id == ScenarioId::SmoothedRectifier) {
		if (!overlays.show_source_voltage) {
			return vertices;
		}
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.capacitor_voltage, scenario));
		const float half_width = 0.015F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};
		vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
		return vertices;
	}

	if (!overlays.show_source_voltage) {
		return vertices;
	}

	const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
	const float center_y = static_cast<float>(normalize_y(snapshot.source_voltage, scenario));
	const float half_width = 0.015F;
	const float half_height = half_width * std::max(aspect_ratio, 0.5F);
	const std::array<float, 4> color{0.93F, 0.69F, 0.28F, 1.0F};

	vertices.push_back({center_x, center_y + half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center_x + half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center_x - half_width, center_y - half_height, color[0], color[1], color[2], color[3]});
	return vertices;
}

}  // namespace visual_physics::electronics