#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::computational_physics {

struct Vector2 {
	double x;
	double y;
};

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	ProjectileSolverComparison,
	OrbitalSolverComparison,
	SpringOscillatorComparison,
};

enum class SolverMethodId {
	Euler,
	Symplectic,
	Rk4,
};

struct Scenario {
	ScenarioId id;
	std::string name;
	std::string summary;
	std::string equation_summary;
	std::string status;
	double duration_seconds;
	ViewBounds view_bounds;
	std::string focus_area;
	double mass;
	Vector2 initial_position;
	Vector2 initial_velocity;
	Vector2 gravity;
	double drag_coefficient;
	std::optional<Vector2> orbital_center;
	std::optional<double> gravitational_parameter;
	std::optional<Vector2> spring_anchor;
	std::optional<double> spring_constant;
	std::optional<double> damping_coefficient;
	double comparison_step_seconds;
	double reference_step_seconds;
};

struct OrbitalInvariantDiagnostics {
	double reference_specific_energy;
	double euler_specific_energy;
	double symplectic_specific_energy;
	double rk4_specific_energy;
	double euler_specific_energy_error;
	double symplectic_specific_energy_error;
	double rk4_specific_energy_error;
	double reference_angular_momentum;
	double euler_angular_momentum;
	double symplectic_angular_momentum;
	double rk4_angular_momentum;
	double euler_angular_momentum_error;
	double symplectic_angular_momentum_error;
	double rk4_angular_momentum_error;
};

struct SpringOscillatorDiagnostics {
	double reference_total_energy;
	double euler_total_energy;
	double symplectic_total_energy;
	double rk4_total_energy;
	double euler_total_energy_error;
	double symplectic_total_energy_error;
	double rk4_total_energy_error;
	double reference_displacement_magnitude;
	double euler_displacement_magnitude;
	double symplectic_displacement_magnitude;
	double rk4_displacement_magnitude;
	double euler_displacement_magnitude_error;
	double symplectic_displacement_magnitude_error;
	double rk4_displacement_magnitude_error;
	double reference_phase_angle;
	double euler_phase_angle;
	double symplectic_phase_angle;
	double rk4_phase_angle;
	double euler_phase_angle_error;
	double symplectic_phase_angle_error;
	double rk4_phase_angle_error;
};

struct SolverMetrics {
	Vector2 position;
	Vector2 velocity;
	double position_error;
	double speed_error;
	double max_path_deviation;
};

struct Snapshot {
	double time_seconds;
	Vector2 reference_position;
	Vector2 reference_velocity;
	SolverMetrics euler;
	SolverMetrics symplectic;
	SolverMetrics rk4;
	std::optional<OrbitalInvariantDiagnostics> orbital_diagnostics;
	std::optional<SpringOscillatorDiagnostics> spring_diagnostics;
};

struct TrajectorySample {
	double time_seconds;
	double reference_x;
	double reference_y;
	double euler_x;
	double euler_y;
	double symplectic_x;
	double symplectic_y;
	double rk4_x;
	double rk4_y;
};

struct ConvergenceSample {
	double step_seconds;
	double euler_final_position_error;
	double symplectic_final_position_error;
	double rk4_final_position_error;
	std::optional<double> euler_final_specific_energy_error;
	std::optional<double> symplectic_final_specific_energy_error;
	std::optional<double> rk4_final_specific_energy_error;
	std::optional<double> euler_final_angular_momentum_error;
	std::optional<double> symplectic_final_angular_momentum_error;
	std::optional<double> rk4_final_angular_momentum_error;
	std::optional<double> euler_final_spring_energy_error;
	std::optional<double> symplectic_final_spring_energy_error;
	std::optional<double> rk4_final_spring_energy_error;
	std::optional<double> euler_final_spring_phase_error;
	std::optional<double> symplectic_final_spring_phase_error;
	std::optional<double> rk4_final_spring_phase_error;
};

struct OrbitalInvariantHistorySample {
	double time_seconds;
	double euler_specific_energy_error;
	double symplectic_specific_energy_error;
	double rk4_specific_energy_error;
	double euler_angular_momentum_error;
	double symplectic_angular_momentum_error;
	double rk4_angular_momentum_error;
};

struct SpringInvariantHistorySample {
	double time_seconds;
	double euler_total_energy_error;
	double symplectic_total_energy_error;
	double rk4_total_energy_error;
	double euler_displacement_magnitude_error;
	double symplectic_displacement_magnitude_error;
	double rk4_displacement_magnitude_error;
	double euler_phase_angle_error;
	double symplectic_phase_angle_error;
	double rk4_phase_angle_error;
};

struct NormalizedVertex {
	float x;
	float y;
};

std::string_view to_string(ScenarioId id);
std::optional<ScenarioId> parse_scenario_id(std::string_view value);
std::string_view to_string(SolverMethodId id);
Scenario make_default_scenario(ScenarioId id);
Snapshot sample_scenario(const Scenario& scenario, double time_seconds);
std::vector<TrajectorySample> build_samples(const Scenario& scenario, std::size_t sample_count = 48);
std::vector<ConvergenceSample> build_convergence_study(const Scenario& scenario);
std::vector<OrbitalInvariantHistorySample> build_orbital_invariant_history(
	const Scenario& scenario,
	std::size_t sample_count = 48);
std::vector<SpringInvariantHistorySample> build_spring_invariant_history(
	const Scenario& scenario,
	std::size_t sample_count = 48);
std::vector<NormalizedVertex> build_axes_vertices(const Scenario& scenario);
std::vector<NormalizedVertex> build_reference_trajectory_vertices(
	const std::vector<TrajectorySample>& samples,
	const Scenario& scenario);
std::vector<NormalizedVertex> build_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio);

}  // namespace visual_physics::computational_physics