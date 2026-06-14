#include "computational_physics_core.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace visual_physics::computational_physics {
namespace {

const std::array<Scenario, 3> kDefaultScenarios{{
	{
		ScenarioId::ProjectileSolverComparison,
		"Projectile Solver Comparison",
		"Euler, symplectic, and RK4 are compared against a high-resolution reference projectile with drag.",
		"m x\" = m g - c v",
		"Phase 10 starter slice",
		4.0,
		{-2.0, 24.0, -4.0, 14.0},
		"Solver comparison",
		1.0,
		{0.0, 0.0},
		{8.5, 11.0},
		{0.0, -9.81},
		0.45,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		0.2,
		1.0 / 480.0,
	},
	{
		ScenarioId::OrbitalSolverComparison,
		"Orbital Solver Comparison",
		"Euler, symplectic, and RK4 are compared against a high-resolution orbital reference trajectory under inverse-square gravity.",
		"x\" = -mu r / |r|^3",
		"Phase 10 orbital slice",
		16.0,
		{-8.0, 8.0, -8.0, 8.0},
		"Long-horizon drift and orbital stability",
		1.0,
		{5.0, 0.0},
		{0.0, 2.0},
		{0.0, 0.0},
		0.0,
		Vector2{0.0, 0.0},
		20.0,
		std::nullopt,
		std::nullopt,
		std::nullopt,
		0.2,
		1.0 / 480.0,
	},
	{
		ScenarioId::SpringOscillatorComparison,
		"Spring Oscillator Comparison",
		"Euler, symplectic, and RK4 are compared against a high-resolution reference trajectory for a lightly damped 2D spring-mass oscillator.",
		"x\" = -(k / m) (x - x0) - (c / m) v",
		"Phase 10 spring slice",
		12.0,
		{-3.5, 3.5, -3.5, 3.5},
		"Phase drift, numerical damping, and long-horizon oscillator stability",
		1.0,
		{2.4, 0.0},
		{0.0, 2.6},
		{0.0, 0.0},
		0.0,
		std::nullopt,
		std::nullopt,
		Vector2{0.0, 0.0},
		4.2,
		0.08,
		0.2,
		1.0 / 480.0,
	},
}};

constexpr std::array<double, 4> kConvergenceDivisors{{1.0, 2.0, 4.0, 8.0}};
constexpr double kMinStepSeconds = 1e-4;

struct IntegratedState {
	Vector2 position;
	Vector2 velocity;
};

struct Derivative {
	Vector2 position_derivative;
	Vector2 velocity_derivative;
};

double clamp(double value, double min_value, double max_value) {
	return std::min(std::max(value, min_value), max_value);
}

Vector2 add(const Vector2& left, const Vector2& right) {
	return {left.x + right.x, left.y + right.y};
}

Vector2 subtract(const Vector2& left, const Vector2& right) {
	return {left.x - right.x, left.y - right.y};
}

Vector2 scale(const Vector2& value, double factor) {
	return {value.x * factor, value.y * factor};
}

double magnitude(const Vector2& value) {
	return std::hypot(value.x, value.y);
}

NormalizedVertex to_ndc_point(double x, double y, const Scenario& scenario) {
	const auto& bounds = scenario.view_bounds;
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;

	return {
		static_cast<float>(clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(clamp(normalized_y, -0.96, 0.96)),
	};
}

Vector2 compute_acceleration(
	const Scenario& scenario,
	const Vector2& position,
	const Vector2& velocity) {
	if (scenario.id == ScenarioId::OrbitalSolverComparison) {
		const auto center = scenario.orbital_center.value_or(Vector2{0.0, 0.0});
		const auto offset = subtract(position, center);
		const double distance_squared = std::max(offset.x * offset.x + offset.y * offset.y, 0.25);
		const double distance = std::sqrt(distance_squared);
		const double scale_factor = -(
			scenario.gravitational_parameter.value_or(0.0) /
			(distance_squared * distance));
		return scale(offset, scale_factor);
	}

	if (scenario.id == ScenarioId::SpringOscillatorComparison) {
		const auto anchor = scenario.spring_anchor.value_or(Vector2{0.0, 0.0});
		const auto displacement = subtract(position, anchor);
		const double spring_scale = -(
			scenario.spring_constant.value_or(0.0) /
			std::max(scenario.mass, 0.1));
		const double damping_scale = -(
			scenario.damping_coefficient.value_or(0.0) /
			std::max(scenario.mass, 0.1));
		return add(scale(displacement, spring_scale), scale(velocity, damping_scale));
	}

	return {
		scenario.gravity.x - (scenario.drag_coefficient / std::max(scenario.mass, 0.1)) * velocity.x,
		scenario.gravity.y - (scenario.drag_coefficient / std::max(scenario.mass, 0.1)) * velocity.y,
	};
}

Derivative evaluate_derivative(
	const Scenario& scenario,
	const Vector2& position,
	const Vector2& velocity) {
	return {
		velocity,
		compute_acceleration(scenario, position, velocity),
	};
}

IntegratedState integrate_euler_step(
	const Scenario& scenario,
	const IntegratedState& state,
	double delta_seconds) {
	const auto acceleration = compute_acceleration(scenario, state.position, state.velocity);
	return {
		add(state.position, scale(state.velocity, delta_seconds)),
		add(state.velocity, scale(acceleration, delta_seconds)),
	};
}

IntegratedState integrate_symplectic_step(
	const Scenario& scenario,
	const IntegratedState& state,
	double delta_seconds) {
	const auto acceleration = compute_acceleration(scenario, state.position, state.velocity);
	const auto next_velocity = add(state.velocity, scale(acceleration, delta_seconds));
	return {
		add(state.position, scale(next_velocity, delta_seconds)),
		next_velocity,
	};
}

IntegratedState integrate_rk4_step(
	const Scenario& scenario,
	const IntegratedState& state,
	double delta_seconds) {
	const Derivative k1 = evaluate_derivative(scenario, state.position, state.velocity);
	const Derivative k2 = evaluate_derivative(
		scenario,
		add(state.position, scale(k1.position_derivative, delta_seconds * 0.5)),
		add(state.velocity, scale(k1.velocity_derivative, delta_seconds * 0.5)));
	const Derivative k3 = evaluate_derivative(
		scenario,
		add(state.position, scale(k2.position_derivative, delta_seconds * 0.5)),
		add(state.velocity, scale(k2.velocity_derivative, delta_seconds * 0.5)));
	const Derivative k4 = evaluate_derivative(
		scenario,
		add(state.position, scale(k3.position_derivative, delta_seconds)),
		add(state.velocity, scale(k3.velocity_derivative, delta_seconds)));

	const auto position_delta = scale(
		add(
			add(k1.position_derivative, scale(k2.position_derivative, 2.0)),
			add(scale(k3.position_derivative, 2.0), k4.position_derivative)),
		delta_seconds / 6.0);
	const auto velocity_delta = scale(
		add(
			add(k1.velocity_derivative, scale(k2.velocity_derivative, 2.0)),
			add(scale(k3.velocity_derivative, 2.0), k4.velocity_derivative)),
		delta_seconds / 6.0);

	return {
		add(state.position, position_delta),
		add(state.velocity, velocity_delta),
	};
}

IntegratedState integrate_state(
	const Scenario& scenario,
	SolverMethodId method,
	double time_seconds,
	double step_seconds) {
	IntegratedState state{scenario.initial_position, scenario.initial_velocity};
	double remaining_seconds = std::max(time_seconds, 0.0);
	const double effective_step_seconds = std::max(step_seconds, kMinStepSeconds);

	while (remaining_seconds > 1e-12) {
		const double delta_seconds = std::min(remaining_seconds, effective_step_seconds);
		switch (method) {
		case SolverMethodId::Euler:
			state = integrate_euler_step(scenario, state, delta_seconds);
			break;
		case SolverMethodId::Symplectic:
			state = integrate_symplectic_step(scenario, state, delta_seconds);
			break;
		case SolverMethodId::Rk4:
			state = integrate_rk4_step(scenario, state, delta_seconds);
			break;
		}
		remaining_seconds -= delta_seconds;
	}

	return state;
}

IntegratedState integrate_reference_state(const Scenario& scenario, double time_seconds) {
	return integrate_state(
		scenario,
		SolverMethodId::Rk4,
		time_seconds,
		std::max(scenario.reference_step_seconds, kMinStepSeconds));
}

double compute_max_path_deviation(
	const Scenario& scenario,
	SolverMethodId method,
	double time_seconds) {
	if (time_seconds <= 0.0) {
		return 0.0;
	}

	double max_path_deviation = 0.0;
	for (int index = 0; index <= 32; index += 1) {
		const double sample_time = time_seconds * static_cast<double>(index) / 32.0;
		const auto solver_state = integrate_state(
			scenario,
			method,
			sample_time,
			std::max(scenario.comparison_step_seconds, kMinStepSeconds));
		const auto reference_state = integrate_reference_state(scenario, sample_time);
		max_path_deviation = std::max(
			max_path_deviation,
			magnitude(subtract(solver_state.position, reference_state.position)));
	}

	return max_path_deviation;
}

double compute_orbital_specific_energy(
	const Scenario& scenario,
	const IntegratedState& state) {
	const auto center = scenario.orbital_center.value_or(Vector2{0.0, 0.0});
	const auto offset = subtract(state.position, center);
	const double distance = std::max(magnitude(offset), 0.5);
	const double speed_squared = state.velocity.x * state.velocity.x + state.velocity.y * state.velocity.y;
	return 0.5 * speed_squared - (scenario.gravitational_parameter.value_or(0.0) / distance);
}

double compute_angular_momentum_magnitude(
	const Scenario& scenario,
	const IntegratedState& state) {
	const auto center = scenario.orbital_center.value_or(Vector2{0.0, 0.0});
	const auto offset = subtract(state.position, center);
	return std::abs(offset.x * state.velocity.y - offset.y * state.velocity.x);
}

double compute_spring_total_energy(
	const Scenario& scenario,
	const IntegratedState& state) {
	const auto anchor = scenario.spring_anchor.value_or(Vector2{0.0, 0.0});
	const double displacement = magnitude(subtract(state.position, anchor));
	const double speed_squared = state.velocity.x * state.velocity.x + state.velocity.y * state.velocity.y;
	return 0.5 * scenario.mass * speed_squared +
		0.5 * scenario.spring_constant.value_or(0.0) * displacement * displacement;
}

double compute_spring_displacement_magnitude(
	const Scenario& scenario,
	const IntegratedState& state) {
	const auto anchor = scenario.spring_anchor.value_or(Vector2{0.0, 0.0});
	return magnitude(subtract(state.position, anchor));
}

double compute_spring_phase_angle(
	const Scenario& scenario,
	const IntegratedState& state) {
	const auto anchor = scenario.spring_anchor.value_or(Vector2{0.0, 0.0});
	const auto displacement = subtract(state.position, anchor);
	return std::atan2(displacement.y, displacement.x);
}

double compute_wrapped_angle_difference(double left, double right) {
	const double raw_difference = left - right;
	const double wrapped = std::atan2(std::sin(raw_difference), std::cos(raw_difference));
	return std::abs(wrapped);
}

std::optional<OrbitalInvariantDiagnostics> build_orbital_diagnostics(
	const Scenario& scenario,
	const IntegratedState& reference_state,
	const IntegratedState& euler_state,
	const IntegratedState& symplectic_state,
	const IntegratedState& rk4_state) {
	if (scenario.id != ScenarioId::OrbitalSolverComparison) {
		return std::nullopt;
	}

	const double reference_specific_energy = compute_orbital_specific_energy(scenario, reference_state);
	const double euler_specific_energy = compute_orbital_specific_energy(scenario, euler_state);
	const double symplectic_specific_energy = compute_orbital_specific_energy(scenario, symplectic_state);
	const double rk4_specific_energy = compute_orbital_specific_energy(scenario, rk4_state);
	const double reference_angular_momentum = compute_angular_momentum_magnitude(scenario, reference_state);
	const double euler_angular_momentum = compute_angular_momentum_magnitude(scenario, euler_state);
	const double symplectic_angular_momentum = compute_angular_momentum_magnitude(scenario, symplectic_state);
	const double rk4_angular_momentum = compute_angular_momentum_magnitude(scenario, rk4_state);

	return OrbitalInvariantDiagnostics{
		.reference_specific_energy = reference_specific_energy,
		.euler_specific_energy = euler_specific_energy,
		.symplectic_specific_energy = symplectic_specific_energy,
		.rk4_specific_energy = rk4_specific_energy,
		.euler_specific_energy_error = std::abs(euler_specific_energy - reference_specific_energy),
		.symplectic_specific_energy_error = std::abs(symplectic_specific_energy - reference_specific_energy),
		.rk4_specific_energy_error = std::abs(rk4_specific_energy - reference_specific_energy),
		.reference_angular_momentum = reference_angular_momentum,
		.euler_angular_momentum = euler_angular_momentum,
		.symplectic_angular_momentum = symplectic_angular_momentum,
		.rk4_angular_momentum = rk4_angular_momentum,
		.euler_angular_momentum_error = std::abs(euler_angular_momentum - reference_angular_momentum),
		.symplectic_angular_momentum_error = std::abs(symplectic_angular_momentum - reference_angular_momentum),
		.rk4_angular_momentum_error = std::abs(rk4_angular_momentum - reference_angular_momentum),
	};
}

std::optional<SpringOscillatorDiagnostics> build_spring_diagnostics(
	const Scenario& scenario,
	const IntegratedState& reference_state,
	const IntegratedState& euler_state,
	const IntegratedState& symplectic_state,
	const IntegratedState& rk4_state) {
	if (scenario.id != ScenarioId::SpringOscillatorComparison) {
		return std::nullopt;
	}

	const double reference_total_energy = compute_spring_total_energy(scenario, reference_state);
	const double euler_total_energy = compute_spring_total_energy(scenario, euler_state);
	const double symplectic_total_energy = compute_spring_total_energy(scenario, symplectic_state);
	const double rk4_total_energy = compute_spring_total_energy(scenario, rk4_state);
	const double reference_displacement_magnitude =
		compute_spring_displacement_magnitude(scenario, reference_state);
	const double euler_displacement_magnitude =
		compute_spring_displacement_magnitude(scenario, euler_state);
	const double symplectic_displacement_magnitude =
		compute_spring_displacement_magnitude(scenario, symplectic_state);
	const double rk4_displacement_magnitude =
		compute_spring_displacement_magnitude(scenario, rk4_state);
	const double reference_phase_angle = compute_spring_phase_angle(scenario, reference_state);
	const double euler_phase_angle = compute_spring_phase_angle(scenario, euler_state);
	const double symplectic_phase_angle = compute_spring_phase_angle(scenario, symplectic_state);
	const double rk4_phase_angle = compute_spring_phase_angle(scenario, rk4_state);

	return SpringOscillatorDiagnostics{
		.reference_total_energy = reference_total_energy,
		.euler_total_energy = euler_total_energy,
		.symplectic_total_energy = symplectic_total_energy,
		.rk4_total_energy = rk4_total_energy,
		.euler_total_energy_error = std::abs(euler_total_energy - reference_total_energy),
		.symplectic_total_energy_error = std::abs(symplectic_total_energy - reference_total_energy),
		.rk4_total_energy_error = std::abs(rk4_total_energy - reference_total_energy),
		.reference_displacement_magnitude = reference_displacement_magnitude,
		.euler_displacement_magnitude = euler_displacement_magnitude,
		.symplectic_displacement_magnitude = symplectic_displacement_magnitude,
		.rk4_displacement_magnitude = rk4_displacement_magnitude,
		.euler_displacement_magnitude_error =
			std::abs(euler_displacement_magnitude - reference_displacement_magnitude),
		.symplectic_displacement_magnitude_error =
			std::abs(symplectic_displacement_magnitude - reference_displacement_magnitude),
		.rk4_displacement_magnitude_error =
			std::abs(rk4_displacement_magnitude - reference_displacement_magnitude),
		.reference_phase_angle = reference_phase_angle,
		.euler_phase_angle = euler_phase_angle,
		.symplectic_phase_angle = symplectic_phase_angle,
		.rk4_phase_angle = rk4_phase_angle,
		.euler_phase_angle_error = compute_wrapped_angle_difference(
			euler_phase_angle,
			reference_phase_angle),
		.symplectic_phase_angle_error = compute_wrapped_angle_difference(
			symplectic_phase_angle,
			reference_phase_angle),
		.rk4_phase_angle_error = compute_wrapped_angle_difference(
			rk4_phase_angle,
			reference_phase_angle),
	};
}

void append_square(
	std::vector<NormalizedVertex>& vertices,
	const NormalizedVertex& center,
	float half_width,
	float half_height) {
	const NormalizedVertex top_left{center.x - half_width, center.y + half_height};
	const NormalizedVertex top_right{center.x + half_width, center.y + half_height};
	const NormalizedVertex bottom_left{center.x - half_width, center.y - half_height};
	const NormalizedVertex bottom_right{center.x + half_width, center.y - half_height};
	vertices.push_back(top_left);
	vertices.push_back(bottom_left);
	vertices.push_back(bottom_right);
	vertices.push_back(top_left);
	vertices.push_back(bottom_right);
	vertices.push_back(top_right);
}

}  // namespace

std::string_view to_string(ScenarioId id) {
	switch (id) {
	case ScenarioId::ProjectileSolverComparison:
		return "projectile-solver-comparison";
	case ScenarioId::OrbitalSolverComparison:
		return "orbital-solver-comparison";
	case ScenarioId::SpringOscillatorComparison:
		return "spring-oscillator-comparison";
	}

	throw std::runtime_error("Unknown Computational Physics scenario id");
}

std::optional<ScenarioId> parse_scenario_id(std::string_view value) {
	if (value == "projectile-solver-comparison") {
		return ScenarioId::ProjectileSolverComparison;
	}
	if (value == "orbital-solver-comparison") {
		return ScenarioId::OrbitalSolverComparison;
	}
	if (value == "spring-oscillator-comparison") {
		return ScenarioId::SpringOscillatorComparison;
	}
	return std::nullopt;
}

std::string_view to_string(SolverMethodId id) {
	switch (id) {
	case SolverMethodId::Euler:
		return "euler";
	case SolverMethodId::Symplectic:
		return "symplectic";
	case SolverMethodId::Rk4:
		return "rk4";
	}

	throw std::runtime_error("Unknown Computational Physics solver method");
}

Scenario make_default_scenario(ScenarioId id) {
	for (const auto& scenario : kDefaultScenarios) {
		if (scenario.id == id) {
			return scenario;
		}
	}

	throw std::runtime_error("Unsupported Computational Physics scenario");
}

Snapshot sample_scenario(const Scenario& scenario, double time_seconds) {
	const double clamped_time_seconds = clamp(time_seconds, 0.0, scenario.duration_seconds);
	const auto reference_state = integrate_reference_state(scenario, clamped_time_seconds);
	const auto euler_state = integrate_state(
		scenario,
		SolverMethodId::Euler,
		clamped_time_seconds,
		std::max(scenario.comparison_step_seconds, kMinStepSeconds));
	const auto symplectic_state = integrate_state(
		scenario,
		SolverMethodId::Symplectic,
		clamped_time_seconds,
		std::max(scenario.comparison_step_seconds, kMinStepSeconds));
	const auto rk4_state = integrate_state(
		scenario,
		SolverMethodId::Rk4,
		clamped_time_seconds,
		std::max(scenario.comparison_step_seconds, kMinStepSeconds));

	return {
		.time_seconds = clamped_time_seconds,
		.reference_position = reference_state.position,
		.reference_velocity = reference_state.velocity,
		.euler = {
			.position = euler_state.position,
			.velocity = euler_state.velocity,
			.position_error = magnitude(subtract(euler_state.position, reference_state.position)),
			.speed_error = std::abs(magnitude(euler_state.velocity) - magnitude(reference_state.velocity)),
			.max_path_deviation = compute_max_path_deviation(scenario, SolverMethodId::Euler, clamped_time_seconds),
		},
		.symplectic = {
			.position = symplectic_state.position,
			.velocity = symplectic_state.velocity,
			.position_error = magnitude(subtract(symplectic_state.position, reference_state.position)),
			.speed_error = std::abs(magnitude(symplectic_state.velocity) - magnitude(reference_state.velocity)),
			.max_path_deviation = compute_max_path_deviation(scenario, SolverMethodId::Symplectic, clamped_time_seconds),
		},
		.rk4 = {
			.position = rk4_state.position,
			.velocity = rk4_state.velocity,
			.position_error = magnitude(subtract(rk4_state.position, reference_state.position)),
			.speed_error = std::abs(magnitude(rk4_state.velocity) - magnitude(reference_state.velocity)),
			.max_path_deviation = compute_max_path_deviation(scenario, SolverMethodId::Rk4, clamped_time_seconds),
		},
		.orbital_diagnostics = build_orbital_diagnostics(
			scenario,
			reference_state,
			euler_state,
			symplectic_state,
			rk4_state),
		.spring_diagnostics = build_spring_diagnostics(
			scenario,
			reference_state,
			euler_state,
			symplectic_state,
			rk4_state),
	};
}

std::vector<TrajectorySample> build_samples(const Scenario& scenario, std::size_t sample_count) {
	std::vector<TrajectorySample> samples;
	if (sample_count == 0) {
		return samples;
	}

	samples.reserve(sample_count);
	for (std::size_t index = 0; index < sample_count; index += 1) {
		const double time_seconds = sample_count == 1
			? 0.0
			: scenario.duration_seconds * static_cast<double>(index) /
				static_cast<double>(sample_count - 1);
		const auto reference_state = integrate_reference_state(scenario, time_seconds);
		const auto euler_state = integrate_state(
			scenario,
			SolverMethodId::Euler,
			time_seconds,
			std::max(scenario.comparison_step_seconds, kMinStepSeconds));
		const auto symplectic_state = integrate_state(
			scenario,
			SolverMethodId::Symplectic,
			time_seconds,
			std::max(scenario.comparison_step_seconds, kMinStepSeconds));
		const auto rk4_state = integrate_state(
			scenario,
			SolverMethodId::Rk4,
			time_seconds,
			std::max(scenario.comparison_step_seconds, kMinStepSeconds));
		samples.push_back({
			.time_seconds = time_seconds,
			.reference_x = reference_state.position.x,
			.reference_y = reference_state.position.y,
			.euler_x = euler_state.position.x,
			.euler_y = euler_state.position.y,
			.symplectic_x = symplectic_state.position.x,
			.symplectic_y = symplectic_state.position.y,
			.rk4_x = rk4_state.position.x,
			.rk4_y = rk4_state.position.y,
		});
	}

	return samples;
}

std::vector<ConvergenceSample> build_convergence_study(const Scenario& scenario) {
	std::vector<ConvergenceSample> samples;
	samples.reserve(kConvergenceDivisors.size());
	for (const double divisor : kConvergenceDivisors) {
		Scenario refined_scenario = scenario;
		refined_scenario.comparison_step_seconds = clamp(
			scenario.comparison_step_seconds / divisor,
			0.02,
			0.5);
		const auto snapshot = sample_scenario(refined_scenario, refined_scenario.duration_seconds);
		samples.push_back({
			.step_seconds = refined_scenario.comparison_step_seconds,
			.euler_final_position_error = snapshot.euler.position_error,
			.symplectic_final_position_error = snapshot.symplectic.position_error,
			.rk4_final_position_error = snapshot.rk4.position_error,
			.euler_final_specific_energy_error = snapshot.orbital_diagnostics.has_value()
				? std::optional<double>{snapshot.orbital_diagnostics->euler_specific_energy_error}
				: std::nullopt,
			.symplectic_final_specific_energy_error = snapshot.orbital_diagnostics.has_value()
				? std::optional<double>{snapshot.orbital_diagnostics->symplectic_specific_energy_error}
				: std::nullopt,
			.rk4_final_specific_energy_error = snapshot.orbital_diagnostics.has_value()
				? std::optional<double>{snapshot.orbital_diagnostics->rk4_specific_energy_error}
				: std::nullopt,
			.euler_final_angular_momentum_error = snapshot.orbital_diagnostics.has_value()
				? std::optional<double>{snapshot.orbital_diagnostics->euler_angular_momentum_error}
				: std::nullopt,
			.symplectic_final_angular_momentum_error = snapshot.orbital_diagnostics.has_value()
				? std::optional<double>{snapshot.orbital_diagnostics->symplectic_angular_momentum_error}
				: std::nullopt,
			.rk4_final_angular_momentum_error = snapshot.orbital_diagnostics.has_value()
				? std::optional<double>{snapshot.orbital_diagnostics->rk4_angular_momentum_error}
				: std::nullopt,
			.euler_final_spring_energy_error = snapshot.spring_diagnostics.has_value()
				? std::optional<double>{snapshot.spring_diagnostics->euler_total_energy_error}
				: std::nullopt,
			.symplectic_final_spring_energy_error = snapshot.spring_diagnostics.has_value()
				? std::optional<double>{snapshot.spring_diagnostics->symplectic_total_energy_error}
				: std::nullopt,
			.rk4_final_spring_energy_error = snapshot.spring_diagnostics.has_value()
				? std::optional<double>{snapshot.spring_diagnostics->rk4_total_energy_error}
				: std::nullopt,
			.euler_final_spring_phase_error = snapshot.spring_diagnostics.has_value()
				? std::optional<double>{snapshot.spring_diagnostics->euler_phase_angle_error}
				: std::nullopt,
			.symplectic_final_spring_phase_error = snapshot.spring_diagnostics.has_value()
				? std::optional<double>{snapshot.spring_diagnostics->symplectic_phase_angle_error}
				: std::nullopt,
			.rk4_final_spring_phase_error = snapshot.spring_diagnostics.has_value()
				? std::optional<double>{snapshot.spring_diagnostics->rk4_phase_angle_error}
				: std::nullopt,
		});
	}

	return samples;
}

std::vector<OrbitalInvariantHistorySample> build_orbital_invariant_history(
	const Scenario& scenario,
	std::size_t sample_count) {
	std::vector<OrbitalInvariantHistorySample> samples;
	if (scenario.id != ScenarioId::OrbitalSolverComparison || sample_count == 0) {
		return samples;
	}

	samples.reserve(sample_count);
	for (std::size_t index = 0; index < sample_count; index += 1) {
		const double time_seconds = sample_count == 1
			? 0.0
			: scenario.duration_seconds * static_cast<double>(index) /
				static_cast<double>(sample_count - 1);
		const auto snapshot = sample_scenario(scenario, time_seconds);
		if (!snapshot.orbital_diagnostics.has_value()) {
			continue;
		}
		samples.push_back({
			.time_seconds = time_seconds,
			.euler_specific_energy_error = snapshot.orbital_diagnostics->euler_specific_energy_error,
			.symplectic_specific_energy_error = snapshot.orbital_diagnostics->symplectic_specific_energy_error,
			.rk4_specific_energy_error = snapshot.orbital_diagnostics->rk4_specific_energy_error,
			.euler_angular_momentum_error = snapshot.orbital_diagnostics->euler_angular_momentum_error,
			.symplectic_angular_momentum_error = snapshot.orbital_diagnostics->symplectic_angular_momentum_error,
			.rk4_angular_momentum_error = snapshot.orbital_diagnostics->rk4_angular_momentum_error,
		});
	}

	return samples;
}

std::vector<SpringInvariantHistorySample> build_spring_invariant_history(
	const Scenario& scenario,
	std::size_t sample_count) {
	std::vector<SpringInvariantHistorySample> samples;
	if (scenario.id != ScenarioId::SpringOscillatorComparison || sample_count == 0) {
		return samples;
	}

	samples.reserve(sample_count);
	for (std::size_t index = 0; index < sample_count; index += 1) {
		const double time_seconds = sample_count == 1
			? 0.0
			: scenario.duration_seconds * static_cast<double>(index) /
				static_cast<double>(sample_count - 1);
		const auto snapshot = sample_scenario(scenario, time_seconds);
		if (!snapshot.spring_diagnostics.has_value()) {
			continue;
		}
		samples.push_back({
			.time_seconds = time_seconds,
			.euler_total_energy_error = snapshot.spring_diagnostics->euler_total_energy_error,
			.symplectic_total_energy_error = snapshot.spring_diagnostics->symplectic_total_energy_error,
			.rk4_total_energy_error = snapshot.spring_diagnostics->rk4_total_energy_error,
			.euler_displacement_magnitude_error = snapshot.spring_diagnostics->euler_displacement_magnitude_error,
			.symplectic_displacement_magnitude_error = snapshot.spring_diagnostics->symplectic_displacement_magnitude_error,
			.rk4_displacement_magnitude_error = snapshot.spring_diagnostics->rk4_displacement_magnitude_error,
			.euler_phase_angle_error = snapshot.spring_diagnostics->euler_phase_angle_error,
			.symplectic_phase_angle_error = snapshot.spring_diagnostics->symplectic_phase_angle_error,
			.rk4_phase_angle_error = snapshot.spring_diagnostics->rk4_phase_angle_error,
		});
	}

	return samples;
}

std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario) {
	return {
		to_ndc_point(scenario.view_bounds.min_x, 0.0, scenario),
		to_ndc_point(scenario.view_bounds.max_x, 0.0, scenario),
		to_ndc_point(0.0, scenario.view_bounds.min_y, scenario),
		to_ndc_point(0.0, scenario.view_bounds.max_y, scenario),
	};
}

std::vector<NormalizedVertex> build_reference_trajectory_vertices(
	const std::vector<TrajectorySample>& samples,
	const Scenario& scenario) {
	std::vector<NormalizedVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}

	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		vertices.push_back(to_ndc_point(samples[index - 1].reference_x, samples[index - 1].reference_y, scenario));
		vertices.push_back(to_ndc_point(samples[index].reference_x, samples[index].reference_y, scenario));
	}
	return vertices;
}

std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio) {
	std::vector<NormalizedVertex> vertices;
	const auto center = to_ndc_point(
		snapshot.reference_position.x,
		snapshot.reference_position.y,
		scenario);
	append_square(vertices, center, 0.012F / std::max(aspect_ratio, 0.5F), 0.012F);
	return vertices;
}

}  // namespace visual_physics::computational_physics