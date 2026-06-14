#include "electronics_core.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace visual_physics::electronics {
namespace {

constexpr double kPi = 3.14159265358979323846;

double clamp_time(const Scenario& scenario, double time_seconds) {
	return std::clamp(time_seconds, 0.0, scenario.duration_seconds);
}

double normalize_x(double time_seconds, const Scenario& scenario) {
	const double span = scenario.view_bounds.max_x - scenario.view_bounds.min_x;
	if (span <= 0.0) {
		throw std::runtime_error("Invalid electronics x view bounds");
	}
	const double normalized = (time_seconds - scenario.view_bounds.min_x) / span;
	return -0.9 + normalized * 1.8;
}

double normalize_y(double value, const Scenario& scenario) {
	const double span = scenario.view_bounds.max_y - scenario.view_bounds.min_y;
	if (span <= 0.0) {
		throw std::runtime_error("Invalid electronics y view bounds");
	}
	const double normalized = (value - scenario.view_bounds.min_y) / span;
	return -0.9 + normalized * 1.8;
}

std::vector<NormalizedVertex> build_line_segments(
	const std::vector<Sample>& samples,
	const Scenario& scenario,
	auto value_getter) {
	std::vector<NormalizedVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}

	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		vertices.push_back({
			static_cast<float>(normalize_x(samples[index - 1].time_seconds, scenario)),
			static_cast<float>(normalize_y(value_getter(samples[index - 1]), scenario)),
		});
		vertices.push_back({
			static_cast<float>(normalize_x(samples[index].time_seconds, scenario)),
			static_cast<float>(normalize_y(value_getter(samples[index]), scenario)),
		});
	}
	return vertices;
}

struct RlcDerivative {
	double charge_rate;
	double current_rate;
};

RlcDerivative build_rlc_derivative(
	double charge_coulombs,
	double current_amps,
	const Scenario& scenario,
	double inductance_henrys) {
	const double capacitance_farads = std::max(scenario.capacitance_farads, 1e-12);
	const double capacitor_voltage = charge_coulombs / capacitance_farads;
	return {
		.charge_rate = current_amps,
		.current_rate =
			(scenario.source_voltage - scenario.resistance_ohms * current_amps - capacitor_voltage) /
			inductance_henrys,
	};
}

struct RlcState {
	double charge_coulombs;
	double current_amps;
};

RlcState integrate_series_rlc(
	const Scenario& scenario,
	double time_seconds,
	double inductance_henrys) {
	const double initial_charge_coulombs = scenario.initial_capacitor_voltage * scenario.capacitance_farads;
	const int step_count = std::max(1, static_cast<int>(std::ceil(time_seconds / 0.01)));
	const double delta_time = time_seconds / static_cast<double>(step_count);
	double charge_coulombs = initial_charge_coulombs;
	double current_amps = 0.0;

	for (int index = 0; index < step_count; index += 1) {
		const auto k1 = build_rlc_derivative(charge_coulombs, current_amps, scenario, inductance_henrys);
		const auto k2 = build_rlc_derivative(
			charge_coulombs + k1.charge_rate * delta_time * 0.5,
			current_amps + k1.current_rate * delta_time * 0.5,
			scenario,
			inductance_henrys);
		const auto k3 = build_rlc_derivative(
			charge_coulombs + k2.charge_rate * delta_time * 0.5,
			current_amps + k2.current_rate * delta_time * 0.5,
			scenario,
			inductance_henrys);
		const auto k4 = build_rlc_derivative(
			charge_coulombs + k3.charge_rate * delta_time,
			current_amps + k3.current_rate * delta_time,
			scenario,
			inductance_henrys);

		charge_coulombs +=
			(delta_time / 6.0) *
			(k1.charge_rate + 2.0 * k2.charge_rate + 2.0 * k3.charge_rate + k4.charge_rate);
		current_amps +=
			(delta_time / 6.0) *
			(k1.current_rate + 2.0 * k2.current_rate + 2.0 * k3.current_rate + k4.current_rate);
	}

	return {
		.charge_coulombs = charge_coulombs,
		.current_amps = current_amps,
	};
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::RcTransient:
		return "rc-transient";
	case ScenarioId::ResistorNetwork:
		return "resistor-network";
	case ScenarioId::RlTransient:
		return "rl-transient";
	case ScenarioId::RcLowPass:
		return "rc-low-pass";
	case ScenarioId::RcHighPass:
		return "rc-high-pass";
	case ScenarioId::RlLowPass:
		return "rl-low-pass";
	case ScenarioId::RlHighPass:
		return "rl-high-pass";
	case ScenarioId::RlcResonance:
		return "rlc-resonance";
	case ScenarioId::HalfWaveRectifier:
		return "half-wave-rectifier";
	case ScenarioId::FullWaveRectifier:
		return "full-wave-rectifier";
	case ScenarioId::SmoothedRectifier:
		return "smoothed-rectifier";
	case ScenarioId::RlcResponse:
		return "rlc-response";
	}

	throw std::runtime_error("Unknown electronics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "rc-transient") {
		return ScenarioId::RcTransient;
	}
	if (value == "resistor-network") {
		return ScenarioId::ResistorNetwork;
	}
	if (value == "rl-transient") {
		return ScenarioId::RlTransient;
	}
	if (value == "rc-low-pass") {
		return ScenarioId::RcLowPass;
	}
	if (value == "rc-high-pass") {
		return ScenarioId::RcHighPass;
	}
	if (value == "rl-low-pass") {
		return ScenarioId::RlLowPass;
	}
	if (value == "rl-high-pass") {
		return ScenarioId::RlHighPass;
	}
	if (value == "rlc-resonance") {
		return ScenarioId::RlcResonance;
	}
	if (value == "half-wave-rectifier") {
		return ScenarioId::HalfWaveRectifier;
	}
	if (value == "full-wave-rectifier") {
		return ScenarioId::FullWaveRectifier;
	}
	if (value == "smoothed-rectifier") {
		return ScenarioId::SmoothedRectifier;
	}
	if (value == "rlc-response") {
		return ScenarioId::RlcResponse;
	}
	return std::nullopt;
}

Scenario make_default_scenario(ScenarioId id) {
	switch (id) {
	case ScenarioId::RcTransient:
		return {
			.id = ScenarioId::RcTransient,
			.name = "RC Transient Charging",
			.summary = "Step-response charging of a series resistor-capacitor circuit.",
			.equation_summary = "Vc(t)=Vs-(Vs-V0)e^{-t/RC}, i(t)=(Vs-Vc)/R",
			.status = "phase-12-started",
			.duration_seconds = 2.5,
			.view_bounds = {.min_x = 0.0, .max_x = 2.5, .min_y = -0.5, .max_y = 12.5},
			.focus_area = "Capacitor charge-up and resistor current decay",
			.source_voltage = 12.0,
			.resistance_ohms = 2200.0,
			.capacitance_farads = 220e-6,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = std::nullopt,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::ResistorNetwork:
		return {
			.id = ScenarioId::ResistorNetwork,
			.name = "Resistor Divider Network",
			.summary = "Two-resistor divider that converts a source voltage into a lower tap voltage.",
			.equation_summary = "Vout=Vs*Rlower/(Rupper+Rlower), I=Vs/(Rupper+Rlower)",
			.status = "phase-12-started",
			.duration_seconds = 1.0,
			.view_bounds = {.min_x = 0.0, .max_x = 1.0, .min_y = -0.5, .max_y = 12.5},
			.focus_area = "Divider output voltage, branch current, and load-side power",
			.source_voltage = 9.0,
			.resistance_ohms = 0.0,
			.capacitance_farads = 0.0,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = std::nullopt,
			.upper_resistance_ohms = 1500.0,
			.lower_resistance_ohms = 3300.0,
		};
	case ScenarioId::RlTransient:
		return {
			.id = ScenarioId::RlTransient,
			.name = "RL Transient Response",
			.summary = "Step-response current rise in a series resistor-inductor branch.",
			.equation_summary = "i(t)=Vs/R*(1-e^{-tR/L}), Vl(t)=Vse^{-tR/L}",
			.status = "phase-12-started",
			.duration_seconds = 0.8,
			.view_bounds = {.min_x = 0.0, .max_x = 0.8, .min_y = -0.5, .max_y = 12.5},
			.focus_area = "Inductor voltage decay, current rise, and magnetic energy storage",
			.source_voltage = 12.0,
			.resistance_ohms = 18.0,
			.capacitance_farads = 0.0,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = 0.12,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::RcLowPass:
		return {
			.id = ScenarioId::RcLowPass,
			.name = "RC Low-Pass Filter",
			.summary = "Frequency response of a resistor-capacitor low-pass filter measured across the capacitor.",
			.equation_summary = "|H(jw)|=1/sqrt(1+(wRC)^2), fc=1/(2piRC)",
			.status = "phase-12-started",
			.duration_seconds = 5000.0,
			.view_bounds = {.min_x = 10.0, .max_x = 5000.0, .min_y = -0.5, .max_y = 12.5},
			.focus_area = "Cutoff frequency, attenuation, and capacitor-side output amplitude",
			.source_voltage = 10.0,
			.resistance_ohms = 1000.0,
			.capacitance_farads = 1e-6,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = std::nullopt,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::RcHighPass:
		return {
			.id = ScenarioId::RcHighPass,
			.name = "RC High-Pass Filter",
			.summary = "Frequency response of a resistor-capacitor high-pass filter measured across the resistor.",
			.equation_summary = "|H(jw)|=wRC/sqrt(1+(wRC)^2), fc=1/(2piRC)",
			.status = "phase-12-started",
			.duration_seconds = 5000.0,
			.view_bounds = {.min_x = 10.0, .max_x = 5000.0, .min_y = -0.5, .max_y = 12.5},
			.focus_area = "Cutoff frequency, passband gain, and resistor-side output amplitude",
			.source_voltage = 10.0,
			.resistance_ohms = 1000.0,
			.capacitance_farads = 1e-6,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = std::nullopt,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::RlLowPass:
		return {
			.id = ScenarioId::RlLowPass,
			.name = "RL Low-Pass Filter",
			.summary = "Frequency response of a resistor-inductor low-pass filter measured across the resistor.",
			.equation_summary = "|H(jw)|=R/sqrt(R^2+(wL)^2), fc=R/(2piL)",
			.status = "phase-12-started",
			.duration_seconds = 5000.0,
			.view_bounds = {.min_x = 10.0, .max_x = 5000.0, .min_y = -0.5, .max_y = 12.5},
			.focus_area = "Cutoff frequency, gain roll-off, and resistor-side output amplitude",
			.source_voltage = 10.0,
			.resistance_ohms = 1000.0,
			.capacitance_farads = 0.0,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = 0.1,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::RlHighPass:
		return {
			.id = ScenarioId::RlHighPass,
			.name = "RL High-Pass Filter",
			.summary = "Frequency response of a resistor-inductor high-pass filter measured across the inductor.",
			.equation_summary = "|H(jw)|=wL/sqrt(R^2+(wL)^2), fc=R/(2piL)",
			.status = "phase-12-started",
			.duration_seconds = 5000.0,
			.view_bounds = {.min_x = 10.0, .max_x = 5000.0, .min_y = -0.5, .max_y = 12.5},
			.focus_area = "Cutoff frequency, passband gain, and inductor-side output amplitude",
			.source_voltage = 10.0,
			.resistance_ohms = 1000.0,
			.capacitance_farads = 0.0,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = 0.1,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::RlcResonance:
		return {
			.id = ScenarioId::RlcResonance,
			.name = "RLC Resonance Sweep",
			.summary = "Sweep frequency through a driven series RLC circuit to inspect resonance, gain, and dissipated power.",
			.equation_summary = "|Z|=sqrt(R^2+(wL-1/(wC))^2), I=Vs/|Z|",
			.status = "phase-12-started",
			.duration_seconds = 20.0,
			.view_bounds = {.min_x = 0.0, .max_x = 20.0, .min_y = 0.0, .max_y = 12.0},
			.focus_area = "Resonant frequency, capacitor gain, current peak, and dissipated power",
			.source_voltage = 6.0,
			.resistance_ohms = 4.0,
			.capacitance_farads = 0.005,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = 0.2,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::HalfWaveRectifier:
		return {
			.id = ScenarioId::HalfWaveRectifier,
			.name = "Half-Wave Rectifier",
			.summary = "Inspect a diode-clipped sinusoidal source driving a resistive load through a half-wave rectifier.",
			.equation_summary = "Vin=Vp*sin(2pift), Vout=max(Vin-Vd,0)",
			.status = "phase-12-started",
			.duration_seconds = 0.04,
			.view_bounds = {.min_x = 0.0, .max_x = 0.04, .min_y = -10.0, .max_y = 10.0},
			.focus_area = "Conduction interval, diode drop, average output, RMS load voltage, and load power",
			.source_voltage = 8.0,
			.resistance_ohms = 220.0,
			.capacitance_farads = 0.01,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = std::nullopt,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::FullWaveRectifier:
		return {
			.id = ScenarioId::FullWaveRectifier,
			.name = "Full-Wave Rectifier",
			.summary = "Inspect bridge-rectified AC delivery into a resistive load through a full-wave rectifier.",
			.equation_summary = "Vin=Vp*sin(2pift), Vout=max(|Vin|-2Vd,0)",
			.status = "phase-12-started",
			.duration_seconds = 0.04,
			.view_bounds = {.min_x = 0.0, .max_x = 0.04, .min_y = -10.0, .max_y = 10.0},
			.focus_area = "Bridge conduction, doubled ripple frequency, average output, RMS load voltage, and load power",
			.source_voltage = 8.0,
			.resistance_ohms = 220.0,
			.capacitance_farads = 0.01,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = std::nullopt,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::SmoothedRectifier:
		return {
			.id = ScenarioId::SmoothedRectifier,
			.name = "Smoothed Bridge Rectifier",
			.summary = "Inspect a bridge rectifier feeding a reservoir capacitor and resistive load in steady ripple operation.",
			.equation_summary = "Vout~envelope(max(|Vin|-2Vd,0)) with RC discharge between recharge peaks",
			.status = "phase-12-started",
			.duration_seconds = 0.04,
			.view_bounds = {.min_x = 0.0, .max_x = 0.04, .min_y = -10.0, .max_y = 10.0},
			.focus_area = "Reservoir-capacitor smoothing, ripple voltage, average DC output, capacitor charge, and stored energy",
			.source_voltage = 8.0,
			.resistance_ohms = 220.0,
			.capacitance_farads = 0.00047,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = std::nullopt,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	case ScenarioId::RlcResponse:
		return {
			.id = ScenarioId::RlcResponse,
			.name = "RLC Step Response",
			.summary = "Track damped oscillation in a driven series RLC circuit after a step input.",
			.equation_summary = "Lq\'\'+Rq\'+q/C=Vs",
			.status = "phase-12-started",
			.duration_seconds = 4.0,
			.view_bounds = {.min_x = 0.0, .max_x = 4.0, .min_y = -4.0, .max_y = 12.0},
			.focus_area = "Damped oscillation, capacitor overshoot, current reversal, and stored energy exchange",
			.source_voltage = 9.0,
			.resistance_ohms = 6.0,
			.capacitance_farads = 0.05,
			.initial_capacitor_voltage = 0.0,
			.inductance_henrys = 0.5,
			.upper_resistance_ohms = std::nullopt,
			.lower_resistance_ohms = std::nullopt,
		};
	}

	throw std::runtime_error("Unknown electronics scenario id");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	if (scenario.id == ScenarioId::ResistorNetwork) {
		const double upper_resistance = scenario.upper_resistance_ohms.value_or(0.0);
		const double lower_resistance = scenario.lower_resistance_ohms.value_or(0.0);
		const double equivalent_resistance = upper_resistance + lower_resistance;
		const double branch_current =
			equivalent_resistance > 0.0 ? scenario.source_voltage / equivalent_resistance : 0.0;
		const double output_voltage = branch_current * lower_resistance;
		const double lower_branch_power = output_voltage * branch_current;
		return {
			.time_seconds = clamp_time(scenario, time_seconds),
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = scenario.source_voltage - output_voltage,
			.capacitor_voltage = 0.0,
			.current_amps = branch_current,
			.charge_coulombs = 0.0,
			.stored_energy_joules = 0.0,
			.time_constant_seconds = 0.0,
			.flux_linkage_webers = std::nullopt,
			.output_voltage = output_voltage,
			.branch_current_amps = branch_current,
			.equivalent_resistance_ohms = equivalent_resistance,
			.lower_branch_power_watts = lower_branch_power,
		};
	}

	if (scenario.id == ScenarioId::RlTransient) {
		const double clamped_time = clamp_time(scenario, time_seconds);
		const double inductance_henrys = std::max(scenario.inductance_henrys.value_or(0.1), 1e-6);
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double time_constant_seconds = inductance_henrys / resistance_ohms;
		const double exponential_decay = std::exp(-clamped_time / time_constant_seconds);
		const double steady_state_current = scenario.source_voltage / resistance_ohms;
		const double current_amps = steady_state_current * (1.0 - exponential_decay);
		const double inductor_voltage = scenario.source_voltage * exponential_decay;
		const double resistor_voltage = scenario.source_voltage - inductor_voltage;
		const double flux_linkage = inductance_henrys * current_amps;
		const double stored_energy_joules = 0.5 * inductance_henrys * current_amps * current_amps;

		return {
			.time_seconds = clamped_time,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = resistor_voltage,
			.capacitor_voltage = resistor_voltage,
			.current_amps = current_amps,
			.charge_coulombs = flux_linkage,
			.stored_energy_joules = stored_energy_joules,
			.time_constant_seconds = time_constant_seconds,
			.flux_linkage_webers = flux_linkage,
			.output_voltage = inductor_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = scenario.resistance_ohms,
			.lower_branch_power_watts = resistor_voltage * current_amps,
		};
	}

	if (scenario.id == ScenarioId::RcLowPass) {
		const double frequency_hertz = std::max(clamp_time(scenario, time_seconds), 0.1);
		const double angular_frequency = 2.0 * kPi * frequency_hertz;
		const double capacitance_farads = std::max(scenario.capacitance_farads, 1e-12);
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double capacitive_reactance = 1.0 / (angular_frequency * capacitance_farads);
		const double impedance_magnitude =
			std::sqrt(resistance_ohms * resistance_ohms + capacitive_reactance * capacitive_reactance);
		const double current_amps = scenario.source_voltage / std::max(impedance_magnitude, 1e-6);
		const double capacitor_voltage = current_amps * capacitive_reactance;
		const double charge_coulombs = capacitance_farads * capacitor_voltage;
		const double stored_energy_joules = 0.5 * capacitance_farads * capacitor_voltage * capacitor_voltage;
		const double resistor_voltage = current_amps * resistance_ohms;
		const double cutoff_frequency_hertz =
			1.0 / (2.0 * kPi * resistance_ohms * capacitance_farads);

		return {
			.time_seconds = frequency_hertz,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = resistor_voltage,
			.capacitor_voltage = capacitor_voltage,
			.current_amps = current_amps,
			.charge_coulombs = charge_coulombs,
			.stored_energy_joules = stored_energy_joules,
			.time_constant_seconds = cutoff_frequency_hertz,
			.flux_linkage_webers = std::nullopt,
			.output_voltage = capacitor_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = resistance_ohms,
			.lower_branch_power_watts = current_amps * current_amps * resistance_ohms,
		};
	}

	if (scenario.id == ScenarioId::RcHighPass) {
		const double frequency_hertz = std::max(clamp_time(scenario, time_seconds), 0.1);
		const double angular_frequency = 2.0 * kPi * frequency_hertz;
		const double capacitance_farads = std::max(scenario.capacitance_farads, 1e-12);
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double reactive_term = angular_frequency * resistance_ohms * capacitance_farads;
		const double gain_magnitude = reactive_term / std::sqrt(1.0 + reactive_term * reactive_term);
		const double output_voltage = scenario.source_voltage * gain_magnitude;
		const double current_amps = output_voltage / resistance_ohms;
		const double capacitor_voltage = scenario.source_voltage / std::sqrt(1.0 + reactive_term * reactive_term);
		const double charge_coulombs = capacitance_farads * capacitor_voltage;
		const double stored_energy_joules = 0.5 * capacitance_farads * capacitor_voltage * capacitor_voltage;
		const double cutoff_frequency_hertz =
			1.0 / (2.0 * kPi * resistance_ohms * capacitance_farads);

		return {
			.time_seconds = frequency_hertz,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = output_voltage,
			.capacitor_voltage = capacitor_voltage,
			.current_amps = current_amps,
			.charge_coulombs = charge_coulombs,
			.stored_energy_joules = stored_energy_joules,
			.time_constant_seconds = cutoff_frequency_hertz,
			.flux_linkage_webers = std::nullopt,
			.output_voltage = output_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = resistance_ohms,
			.lower_branch_power_watts = current_amps * current_amps * resistance_ohms,
		};
	}

	if (scenario.id == ScenarioId::RlLowPass) {
		const double frequency_hertz = std::max(clamp_time(scenario, time_seconds), 0.1);
		const double angular_frequency = 2.0 * kPi * frequency_hertz;
		const double inductance_henrys = std::max(scenario.inductance_henrys.value_or(0.1), 1e-6);
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double inductive_reactance = angular_frequency * inductance_henrys;
		const double gain_magnitude = resistance_ohms /
			std::sqrt(resistance_ohms * resistance_ohms + inductive_reactance * inductive_reactance);
		const double output_voltage = scenario.source_voltage * gain_magnitude;
		const double current_amps = output_voltage / resistance_ohms;
		const double inductor_voltage = current_amps * inductive_reactance;
		const double magnetic_flux_linkage = inductance_henrys * current_amps;
		const double stored_energy_joules = 0.5 * inductance_henrys * current_amps * current_amps;
		const double cutoff_frequency_hertz = resistance_ohms / (2.0 * kPi * inductance_henrys);

		return {
			.time_seconds = frequency_hertz,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = output_voltage,
			.capacitor_voltage = inductor_voltage,
			.current_amps = current_amps,
			.charge_coulombs = magnetic_flux_linkage,
			.stored_energy_joules = stored_energy_joules,
			.time_constant_seconds = cutoff_frequency_hertz,
			.flux_linkage_webers = magnetic_flux_linkage,
			.output_voltage = output_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = resistance_ohms,
			.lower_branch_power_watts = current_amps * current_amps * resistance_ohms,
		};
	}

	if (scenario.id == ScenarioId::RlHighPass) {
		const double frequency_hertz = std::max(clamp_time(scenario, time_seconds), 0.1);
		const double angular_frequency = 2.0 * kPi * frequency_hertz;
		const double inductance_henrys = std::max(scenario.inductance_henrys.value_or(0.1), 1e-6);
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double inductive_reactance = angular_frequency * inductance_henrys;
		const double impedance_magnitude =
			std::sqrt(resistance_ohms * resistance_ohms + inductive_reactance * inductive_reactance);
		const double current_amps = scenario.source_voltage / std::max(impedance_magnitude, 1e-6);
		const double output_voltage = current_amps * inductive_reactance;
		const double resistor_voltage = current_amps * resistance_ohms;
		const double magnetic_flux_linkage = inductance_henrys * current_amps;
		const double stored_energy_joules = 0.5 * inductance_henrys * current_amps * current_amps;
		const double cutoff_frequency_hertz = resistance_ohms / (2.0 * kPi * inductance_henrys);

		return {
			.time_seconds = frequency_hertz,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = resistor_voltage,
			.capacitor_voltage = resistor_voltage,
			.current_amps = current_amps,
			.charge_coulombs = magnetic_flux_linkage,
			.stored_energy_joules = stored_energy_joules,
			.time_constant_seconds = cutoff_frequency_hertz,
			.flux_linkage_webers = magnetic_flux_linkage,
			.output_voltage = output_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = resistance_ohms,
			.lower_branch_power_watts = current_amps * current_amps * resistance_ohms,
		};
	}

	if (scenario.id == ScenarioId::RlcResonance) {
		const double frequency_hertz = std::max(clamp_time(scenario, time_seconds), 0.1);
		const double angular_frequency = 2.0 * kPi * frequency_hertz;
		const double inductance_henrys = std::max(scenario.inductance_henrys.value_or(0.1), 1e-6);
		const double capacitance_farads = std::max(scenario.capacitance_farads, 1e-12);
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double inductive_reactance = angular_frequency * inductance_henrys;
		const double capacitive_reactance = 1.0 / (angular_frequency * capacitance_farads);
		const double net_reactance = inductive_reactance - capacitive_reactance;
		const double impedance_magnitude =
			std::sqrt(resistance_ohms * resistance_ohms + net_reactance * net_reactance);
		const double current_amps = scenario.source_voltage / std::max(impedance_magnitude, 1e-6);
		const double capacitor_voltage = current_amps * capacitive_reactance;
		const double resistor_voltage = current_amps * resistance_ohms;
		const double charge_coulombs = capacitance_farads * capacitor_voltage;
		const double stored_energy_joules =
			0.5 * capacitance_farads * capacitor_voltage * capacitor_voltage +
			0.5 * inductance_henrys * current_amps * current_amps;
		const double resonant_frequency_hertz =
			1.0 / (2.0 * kPi * std::sqrt(inductance_henrys * capacitance_farads));
		const double bandwidth_hertz = resistance_ohms / (2.0 * kPi * inductance_henrys);

		return {
			.time_seconds = frequency_hertz,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = resistor_voltage,
			.capacitor_voltage = capacitor_voltage,
			.current_amps = current_amps,
			.charge_coulombs = charge_coulombs,
			.stored_energy_joules = stored_energy_joules,
			.time_constant_seconds = bandwidth_hertz,
			.flux_linkage_webers = inductance_henrys * current_amps,
			.output_voltage = capacitor_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = resistance_ohms,
			.lower_branch_power_watts = current_amps * current_amps * resistance_ohms,
		};
	}

	if (scenario.id == ScenarioId::HalfWaveRectifier) {
		const double clamped_time = clamp_time(scenario, time_seconds);
		const double line_frequency_hertz = 50.0;
		const double angular_frequency = 2.0 * kPi * line_frequency_hertz;
		const double diode_drop_volts = 0.7;
		const double source_waveform = scenario.source_voltage * std::sin(angular_frequency * clamped_time);
		const double output_voltage = std::max(source_waveform - diode_drop_volts, 0.0);
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double current_amps = output_voltage / resistance_ohms;
		const double branch_power_watts = output_voltage * current_amps;
		const double load_period_seconds = 1.0 / line_frequency_hertz;

		return {
			.time_seconds = clamped_time,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = output_voltage,
			.capacitor_voltage = source_waveform,
			.current_amps = current_amps,
			.charge_coulombs = source_waveform > diode_drop_volts ? 1.0 : 0.0,
			.stored_energy_joules = branch_power_watts,
			.time_constant_seconds = load_period_seconds,
			.flux_linkage_webers = std::nullopt,
			.output_voltage = output_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = resistance_ohms,
			.lower_branch_power_watts = branch_power_watts,
		};
	}

	if (scenario.id == ScenarioId::FullWaveRectifier) {
		const double clamped_time = clamp_time(scenario, time_seconds);
		const double line_frequency_hertz = 50.0;
		const double angular_frequency = 2.0 * kPi * line_frequency_hertz;
		const double diode_drop_volts = 1.4;
		const double source_waveform = scenario.source_voltage * std::sin(angular_frequency * clamped_time);
		const double rectified_waveform = std::abs(source_waveform);
		const double output_voltage = std::max(rectified_waveform - diode_drop_volts, 0.0);
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double current_amps = output_voltage / resistance_ohms;
		const double branch_power_watts = output_voltage * current_amps;
		const double ripple_period_seconds = 1.0 / (2.0 * line_frequency_hertz);

		return {
			.time_seconds = clamped_time,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = output_voltage,
			.capacitor_voltage = source_waveform,
			.current_amps = current_amps,
			.charge_coulombs = rectified_waveform > diode_drop_volts ? 1.0 : 0.0,
			.stored_energy_joules = branch_power_watts,
			.time_constant_seconds = ripple_period_seconds,
			.flux_linkage_webers = std::nullopt,
			.output_voltage = output_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = resistance_ohms,
			.lower_branch_power_watts = branch_power_watts,
		};
	}

	if (scenario.id == ScenarioId::SmoothedRectifier) {
		const double clamped_time = clamp_time(scenario, time_seconds);
		const double line_frequency_hertz = 50.0;
		const double angular_frequency = 2.0 * kPi * line_frequency_hertz;
		const double bridge_drop_volts = 1.4;
		const double resistance_ohms = std::max(scenario.resistance_ohms, 1e-6);
		const double capacitance_farads = std::max(scenario.capacitance_farads, 1e-6);
		const double warmup_seconds = 6.0 / line_frequency_hertz;
		const double total_time = warmup_seconds + clamped_time;
		const double integration_step = 0.0001;
		const double step_count = std::max(1.0, std::ceil(total_time / integration_step));
		const double delta_time = total_time / step_count;
		double filtered_voltage = 0.0;
		double source_waveform = 0.0;
		double rectified_waveform = 0.0;
		double peak_envelope = 0.0;

		for (int index = 0; index < static_cast<int>(step_count); index += 1) {
			const double time_seconds_step = (static_cast<double>(index) + 1.0) * delta_time;
			source_waveform = scenario.source_voltage * std::sin(angular_frequency * time_seconds_step);
			rectified_waveform = std::max(std::abs(source_waveform) - bridge_drop_volts, 0.0);
			peak_envelope = std::max(peak_envelope, rectified_waveform);

			if (rectified_waveform >= filtered_voltage) {
				filtered_voltage = rectified_waveform;
			} else {
				filtered_voltage *= std::exp(-delta_time / (resistance_ohms * capacitance_farads));
			}
		}

		const double current_amps = filtered_voltage / resistance_ohms;
		const double charge_coulombs = capacitance_farads * filtered_voltage;
		const double stored_energy_joules = 0.5 * capacitance_farads * filtered_voltage * filtered_voltage;
		const double branch_power_watts = filtered_voltage * current_amps;

		return {
			.time_seconds = clamped_time,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = filtered_voltage,
			.capacitor_voltage = source_waveform,
			.current_amps = current_amps,
			.charge_coulombs = charge_coulombs,
			.stored_energy_joules = stored_energy_joules,
			.time_constant_seconds = resistance_ohms * capacitance_farads,
			.flux_linkage_webers = std::nullopt,
			.output_voltage = filtered_voltage,
			.branch_current_amps = current_amps,
			.equivalent_resistance_ohms = resistance_ohms,
			.lower_branch_power_watts = branch_power_watts,
		};
	}

	if (scenario.id == ScenarioId::RlcResponse) {
		const double clamped_time = clamp_time(scenario, time_seconds);
		const double inductance_henrys = std::max(scenario.inductance_henrys.value_or(0.1), 1e-6);
		const auto state = integrate_series_rlc(scenario, clamped_time, inductance_henrys);
		const double capacitance_farads = std::max(scenario.capacitance_farads, 1e-12);
		const double capacitor_voltage = state.charge_coulombs / capacitance_farads;
		const double resistor_voltage = scenario.resistance_ohms * state.current_amps;
		const double stored_energy_joules =
			0.5 * capacitance_farads * capacitor_voltage * capacitor_voltage +
			0.5 * inductance_henrys * state.current_amps * state.current_amps;

		return {
			.time_seconds = clamped_time,
			.source_voltage = scenario.source_voltage,
			.resistor_voltage = resistor_voltage,
			.capacitor_voltage = capacitor_voltage,
			.current_amps = state.current_amps,
			.charge_coulombs = state.charge_coulombs,
			.stored_energy_joules = stored_energy_joules,
			.time_constant_seconds = inductance_henrys / std::max(scenario.resistance_ohms, 1e-6),
			.flux_linkage_webers = inductance_henrys * state.current_amps,
			.output_voltage = capacitor_voltage,
			.branch_current_amps = state.current_amps,
			.equivalent_resistance_ohms = scenario.resistance_ohms,
			.lower_branch_power_watts = scenario.source_voltage * state.current_amps,
		};
	}

	const double clamped_time = clamp_time(scenario, time_seconds);
	const double time_constant_seconds = scenario.resistance_ohms * scenario.capacitance_farads;
	const double delta_voltage = scenario.source_voltage - scenario.initial_capacitor_voltage;
	const double exponential_decay = std::exp(-clamped_time / time_constant_seconds);
	const double capacitor_voltage =
		scenario.source_voltage - delta_voltage * exponential_decay;
	const double resistor_voltage = scenario.source_voltage - capacitor_voltage;
	const double current_amps = resistor_voltage / scenario.resistance_ohms;
	const double charge_coulombs = scenario.capacitance_farads * capacitor_voltage;
	const double stored_energy_joules =
		0.5 * scenario.capacitance_farads * capacitor_voltage * capacitor_voltage;

	return {
		.time_seconds = clamped_time,
		.source_voltage = scenario.source_voltage,
		.resistor_voltage = resistor_voltage,
		.capacitor_voltage = capacitor_voltage,
		.current_amps = current_amps,
		.charge_coulombs = charge_coulombs,
		.stored_energy_joules = stored_energy_joules,
		.time_constant_seconds = time_constant_seconds,
		.flux_linkage_webers = std::nullopt,
		.output_voltage = std::nullopt,
		.branch_current_amps = std::nullopt,
		.equivalent_resistance_ohms = std::nullopt,
		.lower_branch_power_watts = std::nullopt,
	};
}

std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	std::vector<Sample> samples;
	samples.reserve(sample_count);
	for (std::size_t index = 0; index < sample_count; index += 1) {
		const double ratio = sample_count == 1
			? 0.0
			: static_cast<double>(index) / static_cast<double>(sample_count - 1);
		const double sample_position =
			scenario.view_bounds.min_x + ratio * (scenario.view_bounds.max_x - scenario.view_bounds.min_x);
		const auto snapshot = sample_scenario(scenario, sample_position);
		samples.push_back({
			.time_seconds = snapshot.time_seconds,
			.source_voltage = snapshot.source_voltage,
			.capacitor_voltage = snapshot.capacitor_voltage,
			.current_amps = snapshot.current_amps,
			.charge_coulombs = snapshot.charge_coulombs,
			.stored_energy_joules = snapshot.stored_energy_joules,
			.flux_linkage_webers = snapshot.flux_linkage_webers,
			.output_voltage = snapshot.output_voltage,
			.branch_current_amps = snapshot.branch_current_amps,
			.lower_branch_power_watts = snapshot.lower_branch_power_watts,
		});
	}
	return samples;
}

std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario) {
	if (scenario.id == ScenarioId::ResistorNetwork) {
		return {
			{-0.8F, -0.8F},
			{-0.8F, 0.8F},
			{-0.8F, 0.8F},
			{0.8F, 0.8F},
			{0.8F, 0.8F},
			{0.8F, -0.8F},
		};
	}

	const float zero_y = static_cast<float>(normalize_y(0.0, scenario));
	const float left_x = static_cast<float>(normalize_x(scenario.view_bounds.min_x, scenario));
	const float right_x = static_cast<float>(normalize_x(scenario.view_bounds.max_x, scenario));
	const float axis_x = static_cast<float>(normalize_x(0.0, scenario));

	return {
		{left_x, zero_y},
		{right_x, zero_y},
		{axis_x, -0.9F},
		{axis_x, 0.9F},
	};
}

std::vector<NormalizedVertex> build_scenario_vertices(
	const std::vector<Sample>& samples,
	const Scenario& scenario) {
	if (scenario.id == ScenarioId::ResistorNetwork) {
		return {
			{-0.4F, 0.7F}, {0.4F, 0.7F},
			{0.4F, 0.7F}, {0.4F, 0.3F},
			{0.4F, 0.3F}, {0.2F, 0.3F},
			{0.2F, 0.3F}, {0.2F, -0.1F},
			{0.2F, -0.1F}, {0.4F, -0.1F},
			{0.4F, -0.1F}, {0.4F, -0.7F},
			{0.4F, -0.7F}, {-0.4F, -0.7F},
			{-0.2F, 0.3F}, {0.2F, 0.3F},
			{-0.2F, -0.1F}, {0.2F, -0.1F},
			{-0.55F, 0.0F}, {-0.25F, 0.0F},
			{-0.55F, 0.12F}, {-0.55F, -0.12F},
		};
	}
	if (scenario.id == ScenarioId::RlTransient) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(0.0);
		});
	}
	if (scenario.id == ScenarioId::RcLowPass) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(sample.capacitor_voltage);
		});
	}
	if (scenario.id == ScenarioId::RcHighPass) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(0.0);
		});
	}
	if (scenario.id == ScenarioId::RlLowPass) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(0.0);
		});
	}
	if (scenario.id == ScenarioId::RlHighPass) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(0.0);
		});
	}
	if (scenario.id == ScenarioId::RlcResonance) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(sample.capacitor_voltage);
		});
	}
	if (scenario.id == ScenarioId::HalfWaveRectifier) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(0.0);
		});
	}
	if (scenario.id == ScenarioId::FullWaveRectifier) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(0.0);
		});
	}
	if (scenario.id == ScenarioId::SmoothedRectifier) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(0.0);
		});
	}
	if (scenario.id == ScenarioId::RlcResponse) {
		return build_line_segments(samples, scenario, [](const Sample& sample) {
			return sample.output_voltage.value_or(sample.capacitor_voltage);
		});
	}

	return build_line_segments(samples, scenario, [](const Sample& sample) {
		return sample.capacitor_voltage;
	});
}

std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio) {
	if (scenario.id == ScenarioId::ResistorNetwork) {
		const float center_y = snapshot.output_voltage.has_value()
			? static_cast<float>(-0.7 + (*snapshot.output_voltage / std::max(scenario.source_voltage, 1e-6)) * 1.4)
			: 0.0F;
		const float center_x = 0.2F;
		const float half_width = 0.03F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::RlTransient) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(0.0), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::RcLowPass) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(0.0), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::RcHighPass) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(0.0), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::RlLowPass) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(0.0), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::RlHighPass) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(0.0), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::RlcResonance) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(snapshot.capacitor_voltage), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::HalfWaveRectifier) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(0.0), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::FullWaveRectifier) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(0.0), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::SmoothedRectifier) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(0.0), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}
	if (scenario.id == ScenarioId::RlcResponse) {
		const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
		const float center_y = static_cast<float>(normalize_y(snapshot.output_voltage.value_or(snapshot.capacitor_voltage), scenario));
		const float half_width = 0.02F;
		const float half_height = half_width * std::max(aspect_ratio, 0.5F);
		return {
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y - half_height},
			{center_x + half_width, center_y + half_height},
			{center_x - half_width, center_y + half_height},
		};
	}

	const float center_x = static_cast<float>(normalize_x(snapshot.time_seconds, scenario));
	const float center_y = static_cast<float>(normalize_y(snapshot.capacitor_voltage, scenario));
	const float half_width = 0.02F;
	const float half_height = half_width * std::max(aspect_ratio, 0.5F);

	return {
		{center_x - half_width, center_y - half_height},
		{center_x + half_width, center_y - half_height},
		{center_x + half_width, center_y + half_height},
		{center_x - half_width, center_y - half_height},
		{center_x + half_width, center_y + half_height},
		{center_x - half_width, center_y + half_height},
	};
}

}  // namespace visual_physics::electronics