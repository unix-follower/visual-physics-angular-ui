#include "computational_physics_payload.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <functional>
#include <limits>
#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::computational_physics {
namespace {

using Json = nlohmann::json;

struct ObservedOrderEstimate {
	double coarse_step_seconds;
	double fine_step_seconds;
	std::optional<double> euler_order;
	std::optional<double> symplectic_order;
	std::optional<double> rk4_order;
};

struct StabilityThresholdEstimate {
	SolverMethodId solver_method;
	double tolerance;
	std::optional<double> recommended_step_seconds;
	std::optional<double> final_position_error;
};

struct SpringDriftThresholdEstimate {
	std::string_view metric;
	SolverMethodId solver_method;
	double tolerance;
	std::optional<double> recommended_step_seconds;
	std::optional<double> final_error;
};

struct OrbitalDriftThresholdEstimate {
	std::string_view metric;
	SolverMethodId solver_method;
	double tolerance;
	std::optional<double> recommended_step_seconds;
	std::optional<double> final_error;
};

struct SolverRecommendationSummary {
	SolverMethodId solver_method;
	double recommended_step_seconds;
	std::string reason;
};

struct SolverRecommendationCandidate {
	SolverMethodId solver_method;
	std::optional<double> recommended_step_seconds;
	std::string limiting_metric;
	bool eligible;
	std::string reason;
};

void require_number_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_number()) {
		throw std::runtime_error("Invalid or missing numeric field: " + std::string(field_name));
	}
}

void require_string_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_string()) {
		throw std::runtime_error("Invalid or missing string field: " + std::string(field_name));
	}
}

void require_boolean_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_boolean()) {
		throw std::runtime_error("Invalid or missing boolean field: " + std::string(field_name));
	}
}

Vector2 parse_vector2(const Json& value, std::string_view field_name) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid vector field: " + std::string(field_name));
	}
	require_number_field(value, "x");
	require_number_field(value, "y");
	return {value.at("x").get<double>(), value.at("y").get<double>()};
}

ViewBounds parse_view_bounds(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid viewBounds");
	}
	require_number_field(value, "minX");
	require_number_field(value, "maxX");
	require_number_field(value, "minY");
	require_number_field(value, "maxY");
	return {
		value.at("minX").get<double>(),
		value.at("maxX").get<double>(),
		value.at("minY").get<double>(),
		value.at("maxY").get<double>(),
	};
}

Json serialize_vector2(const Vector2& value) {
	return Json{{"x", value.x}, {"y", value.y}};
}

Json serialize_solver_metrics(const SolverMetrics& metrics) {
	return Json{
		{"position", serialize_vector2(metrics.position)},
		{"velocity", serialize_vector2(metrics.velocity)},
		{"positionError", metrics.position_error},
		{"speedError", metrics.speed_error},
		{"maxPathDeviation", metrics.max_path_deviation},
	};
}

Json serialize_orbital_diagnostics(const OrbitalInvariantDiagnostics& diagnostics) {
	return Json{
		{"referenceSpecificEnergy", diagnostics.reference_specific_energy},
		{"eulerSpecificEnergy", diagnostics.euler_specific_energy},
		{"symplecticSpecificEnergy", diagnostics.symplectic_specific_energy},
		{"rk4SpecificEnergy", diagnostics.rk4_specific_energy},
		{"eulerSpecificEnergyError", diagnostics.euler_specific_energy_error},
		{"symplecticSpecificEnergyError", diagnostics.symplectic_specific_energy_error},
		{"rk4SpecificEnergyError", diagnostics.rk4_specific_energy_error},
		{"referenceAngularMomentum", diagnostics.reference_angular_momentum},
		{"eulerAngularMomentum", diagnostics.euler_angular_momentum},
		{"symplecticAngularMomentum", diagnostics.symplectic_angular_momentum},
		{"rk4AngularMomentum", diagnostics.rk4_angular_momentum},
		{"eulerAngularMomentumError", diagnostics.euler_angular_momentum_error},
		{"symplecticAngularMomentumError", diagnostics.symplectic_angular_momentum_error},
		{"rk4AngularMomentumError", diagnostics.rk4_angular_momentum_error},
	};
}

Json serialize_spring_diagnostics(const SpringOscillatorDiagnostics& diagnostics) {
	return Json{
		{"referenceTotalEnergy", diagnostics.reference_total_energy},
		{"eulerTotalEnergy", diagnostics.euler_total_energy},
		{"symplecticTotalEnergy", diagnostics.symplectic_total_energy},
		{"rk4TotalEnergy", diagnostics.rk4_total_energy},
		{"eulerTotalEnergyError", diagnostics.euler_total_energy_error},
		{"symplecticTotalEnergyError", diagnostics.symplectic_total_energy_error},
		{"rk4TotalEnergyError", diagnostics.rk4_total_energy_error},
		{"referenceDisplacementMagnitude", diagnostics.reference_displacement_magnitude},
		{"eulerDisplacementMagnitude", diagnostics.euler_displacement_magnitude},
		{"symplecticDisplacementMagnitude", diagnostics.symplectic_displacement_magnitude},
		{"rk4DisplacementMagnitude", diagnostics.rk4_displacement_magnitude},
		{"eulerDisplacementMagnitudeError", diagnostics.euler_displacement_magnitude_error},
		{"symplecticDisplacementMagnitudeError", diagnostics.symplectic_displacement_magnitude_error},
		{"rk4DisplacementMagnitudeError", diagnostics.rk4_displacement_magnitude_error},
		{"referencePhaseAngle", diagnostics.reference_phase_angle},
		{"eulerPhaseAngle", diagnostics.euler_phase_angle},
		{"symplecticPhaseAngle", diagnostics.symplectic_phase_angle},
		{"rk4PhaseAngle", diagnostics.rk4_phase_angle},
		{"eulerPhaseAngleError", diagnostics.euler_phase_angle_error},
		{"symplecticPhaseAngleError", diagnostics.symplectic_phase_angle_error},
		{"rk4PhaseAngleError", diagnostics.rk4_phase_angle_error},
	};
}

double compute_observed_order(double coarse_error, double fine_error, double step_ratio) {
	if (coarse_error <= 0.0 || fine_error <= 0.0 || step_ratio <= 1.0) {
		return std::numeric_limits<double>::quiet_NaN();
	}

	return std::log(coarse_error / fine_error) / std::log(step_ratio);
}

std::vector<ObservedOrderEstimate> build_metric_observed_order_estimates(
	const std::vector<ConvergenceSample>& samples,
	const std::function<double(const ConvergenceSample&)>& euler_accessor,
	const std::function<double(const ConvergenceSample&)>& symplectic_accessor,
	const std::function<double(const ConvergenceSample&)>& rk4_accessor) {
	auto sorted_samples = samples;
	std::sort(
		sorted_samples.begin(),
		sorted_samples.end(),
		[](const ConvergenceSample& left, const ConvergenceSample& right) {
			return left.step_seconds > right.step_seconds;
		});

	std::vector<ObservedOrderEstimate> estimates;
	if (sorted_samples.size() < 2) {
		return estimates;
	}

	estimates.reserve(sorted_samples.size() - 1);
	for (std::size_t index = 0; index < sorted_samples.size() - 1; index += 1) {
		const auto& coarse = sorted_samples[index];
		const auto& fine = sorted_samples[index + 1];
		const double ratio = coarse.step_seconds / std::max(fine.step_seconds, 1e-12);
		const double euler_order = compute_observed_order(euler_accessor(coarse), euler_accessor(fine), ratio);
		const double symplectic_order = compute_observed_order(symplectic_accessor(coarse), symplectic_accessor(fine), ratio);
		const double rk4_order = compute_observed_order(rk4_accessor(coarse), rk4_accessor(fine), ratio);
		estimates.push_back({
			.coarse_step_seconds = coarse.step_seconds,
			.fine_step_seconds = fine.step_seconds,
			.euler_order = std::isfinite(euler_order) ? std::optional<double>{euler_order} : std::nullopt,
			.symplectic_order = std::isfinite(symplectic_order) ? std::optional<double>{symplectic_order} : std::nullopt,
			.rk4_order = std::isfinite(rk4_order) ? std::optional<double>{rk4_order} : std::nullopt,
		});
	}

	return estimates;
}

std::vector<ObservedOrderEstimate> build_observed_order_estimates(
	const std::vector<ConvergenceSample>& samples) {
	return build_metric_observed_order_estimates(
		samples,
		[](const ConvergenceSample& sample) { return sample.euler_final_position_error; },
		[](const ConvergenceSample& sample) { return sample.symplectic_final_position_error; },
		[](const ConvergenceSample& sample) { return sample.rk4_final_position_error; });
}

std::vector<ObservedOrderEstimate> build_orbital_observed_order_estimates(
	const std::vector<ConvergenceSample>& samples,
	std::string_view metric) {
	return build_metric_observed_order_estimates(
		samples,
		[metric](const ConvergenceSample& sample) {
			return metric == "energy"
				? sample.euler_final_specific_energy_error.value_or(0.0)
				: sample.euler_final_angular_momentum_error.value_or(0.0);
		},
		[metric](const ConvergenceSample& sample) {
			return metric == "energy"
				? sample.symplectic_final_specific_energy_error.value_or(0.0)
				: sample.symplectic_final_angular_momentum_error.value_or(0.0);
		},
		[metric](const ConvergenceSample& sample) {
			return metric == "energy"
				? sample.rk4_final_specific_energy_error.value_or(0.0)
				: sample.rk4_final_angular_momentum_error.value_or(0.0);
		});
}

std::vector<ObservedOrderEstimate> build_spring_observed_order_estimates(
	const std::vector<ConvergenceSample>& samples,
	std::string_view metric) {
	return build_metric_observed_order_estimates(
		samples,
		[metric](const ConvergenceSample& sample) {
			return metric == "energy"
				? sample.euler_final_spring_energy_error.value_or(0.0)
				: sample.euler_final_spring_phase_error.value_or(0.0);
		},
		[metric](const ConvergenceSample& sample) {
			return metric == "energy"
				? sample.symplectic_final_spring_energy_error.value_or(0.0)
				: sample.symplectic_final_spring_phase_error.value_or(0.0);
		},
		[metric](const ConvergenceSample& sample) {
			return metric == "energy"
				? sample.rk4_final_spring_energy_error.value_or(0.0)
				: sample.rk4_final_spring_phase_error.value_or(0.0);
		});
}

std::pair<std::optional<double>, std::optional<double>> find_recommended_step(
	const std::vector<ConvergenceSample>& samples,
	double tolerance,
	const std::function<double(const ConvergenceSample&)>& accessor) {
	for (const auto& sample : samples) {
		const double error = accessor(sample);
		if (error <= tolerance) {
			return {sample.step_seconds, error};
		}
	}

	return {std::nullopt, std::nullopt};
}

std::vector<StabilityThresholdEstimate> build_stability_threshold_estimates(
	const Scenario& scenario,
	const std::vector<ConvergenceSample>& samples) {
	const double tolerance = std::hypot(
		scenario.view_bounds.max_x - scenario.view_bounds.min_x,
		scenario.view_bounds.max_y - scenario.view_bounds.min_y) * 0.02;
	auto sorted_samples = samples;
	std::sort(
		sorted_samples.begin(),
		sorted_samples.end(),
		[](const ConvergenceSample& left, const ConvergenceSample& right) {
			return left.step_seconds > right.step_seconds;
		});

	const auto euler = find_recommended_step(sorted_samples, tolerance, [](const ConvergenceSample& sample) {
		return sample.euler_final_position_error;
	});
	const auto symplectic = find_recommended_step(sorted_samples, tolerance, [](const ConvergenceSample& sample) {
		return sample.symplectic_final_position_error;
	});
	const auto rk4 = find_recommended_step(sorted_samples, tolerance, [](const ConvergenceSample& sample) {
		return sample.rk4_final_position_error;
	});

	return {
		{SolverMethodId::Euler, tolerance, euler.first, euler.second},
		{SolverMethodId::Symplectic, tolerance, symplectic.first, symplectic.second},
		{SolverMethodId::Rk4, tolerance, rk4.first, rk4.second},
	};
}

template <typename Accessor>
std::vector<SpringDriftThresholdEstimate> build_spring_metric_thresholds(
	const std::vector<ConvergenceSample>& samples,
	std::string_view metric,
	double tolerance,
	Accessor accessor) {
	std::vector<SpringDriftThresholdEstimate> estimates;
	for (const auto solver_method : {SolverMethodId::Euler, SolverMethodId::Symplectic, SolverMethodId::Rk4}) {
		std::optional<double> recommended_step_seconds;
		std::optional<double> final_error;
		for (const auto& sample : samples) {
			const auto error = accessor(sample, solver_method);
			if (error.has_value() && *error <= tolerance) {
				recommended_step_seconds = sample.step_seconds;
				final_error = error;
				break;
			}
		}
		estimates.push_back({metric, solver_method, tolerance, recommended_step_seconds, final_error});
	}
	return estimates;
}

std::vector<SpringDriftThresholdEstimate> build_spring_drift_threshold_estimates(
	const Scenario& scenario,
	const std::vector<ConvergenceSample>& samples) {
	if (scenario.id != ScenarioId::SpringOscillatorComparison) {
		return {};
	}

	const auto anchor = scenario.spring_anchor.value_or(Vector2{0.0, 0.0});
	const double reference_energy =
		0.5 * scenario.mass *
			(scenario.initial_velocity.x * scenario.initial_velocity.x +
			 scenario.initial_velocity.y * scenario.initial_velocity.y) +
		0.5 * scenario.spring_constant.value_or(0.0) *
			((scenario.initial_position.x - anchor.x) * (scenario.initial_position.x - anchor.x) +
			 (scenario.initial_position.y - anchor.y) * (scenario.initial_position.y - anchor.y));
	const double energy_tolerance = std::max(reference_energy * 0.05, 0.01);
	const double phase_tolerance = 0.15;
	auto sorted_samples = samples;
	std::sort(
		sorted_samples.begin(),
		sorted_samples.end(),
		[](const ConvergenceSample& left, const ConvergenceSample& right) {
			return left.step_seconds > right.step_seconds;
		});

	auto estimates = build_spring_metric_thresholds(
		sorted_samples,
		"energy",
		energy_tolerance,
		[](const ConvergenceSample& sample, SolverMethodId method) -> std::optional<double> {
			switch (method) {
			case SolverMethodId::Euler:
				return sample.euler_final_spring_energy_error;
			case SolverMethodId::Symplectic:
				return sample.symplectic_final_spring_energy_error;
			case SolverMethodId::Rk4:
				return sample.rk4_final_spring_energy_error;
			}
			return std::nullopt;
		});
	auto phase_estimates = build_spring_metric_thresholds(
		sorted_samples,
		"phase",
		phase_tolerance,
		[](const ConvergenceSample& sample, SolverMethodId method) -> std::optional<double> {
			switch (method) {
			case SolverMethodId::Euler:
				return sample.euler_final_spring_phase_error;
			case SolverMethodId::Symplectic:
				return sample.symplectic_final_spring_phase_error;
			case SolverMethodId::Rk4:
				return sample.rk4_final_spring_phase_error;
			}
			return std::nullopt;
		});
	estimates.insert(estimates.end(), phase_estimates.begin(), phase_estimates.end());
	return estimates;
}

template <typename Accessor>
std::vector<OrbitalDriftThresholdEstimate> build_orbital_metric_thresholds(
	const std::vector<ConvergenceSample>& samples,
	std::string_view metric,
	double tolerance,
	Accessor accessor) {
	std::vector<OrbitalDriftThresholdEstimate> estimates;
	for (const auto solver_method : {SolverMethodId::Euler, SolverMethodId::Symplectic, SolverMethodId::Rk4}) {
		std::optional<double> recommended_step_seconds;
		std::optional<double> final_error;
		for (const auto& sample : samples) {
			const auto error = accessor(sample, solver_method);
			if (error.has_value() && *error <= tolerance) {
				recommended_step_seconds = sample.step_seconds;
				final_error = error;
				break;
			}
		}
		estimates.push_back({metric, solver_method, tolerance, recommended_step_seconds, final_error});
	}
	return estimates;
}

std::vector<OrbitalDriftThresholdEstimate> build_orbital_drift_threshold_estimates(
	const Scenario& scenario,
	const std::vector<ConvergenceSample>& samples) {
	if (scenario.id != ScenarioId::OrbitalSolverComparison) {
		return {};
	}

	constexpr double energy_tolerance = 0.05;
	constexpr double angular_momentum_tolerance = 0.05;
	auto sorted_samples = samples;
	std::sort(
		sorted_samples.begin(),
		sorted_samples.end(),
		[](const ConvergenceSample& left, const ConvergenceSample& right) {
			return left.step_seconds > right.step_seconds;
		});

	auto estimates = build_orbital_metric_thresholds(
		sorted_samples,
		"energy",
		energy_tolerance,
		[](const ConvergenceSample& sample, SolverMethodId method) -> std::optional<double> {
			switch (method) {
			case SolverMethodId::Euler:
				return sample.euler_final_specific_energy_error;
			case SolverMethodId::Symplectic:
				return sample.symplectic_final_specific_energy_error;
			case SolverMethodId::Rk4:
				return sample.rk4_final_specific_energy_error;
			}
			return std::nullopt;
		});
	auto momentum_estimates = build_orbital_metric_thresholds(
		sorted_samples,
		"angularMomentum",
		angular_momentum_tolerance,
		[](const ConvergenceSample& sample, SolverMethodId method) -> std::optional<double> {
			switch (method) {
			case SolverMethodId::Euler:
				return sample.euler_final_angular_momentum_error;
			case SolverMethodId::Symplectic:
				return sample.symplectic_final_angular_momentum_error;
			case SolverMethodId::Rk4:
				return sample.rk4_final_angular_momentum_error;
			}
			return std::nullopt;
		});
	estimates.insert(estimates.end(), momentum_estimates.begin(), momentum_estimates.end());
	return estimates;
}

std::string format_metric_label(std::string_view metric) {
	return metric == "angularMomentum" ? "angular momentum" : std::string(metric);
}

struct ScenarioRecommendationMetric {
	SolverMethodId solver_method;
	std::string metric;
	std::optional<double> recommended_step_seconds;
};

std::vector<ScenarioRecommendationMetric> collect_scenario_recommendation_metrics(
	const Scenario& scenario,
	const std::vector<StabilityThresholdEstimate>& position_thresholds,
	const std::vector<OrbitalDriftThresholdEstimate>& orbital_thresholds,
	const std::vector<SpringDriftThresholdEstimate>& spring_thresholds) {
	std::vector<ScenarioRecommendationMetric> metrics;
	for (const auto& threshold : position_thresholds) {
		metrics.push_back({threshold.solver_method, "position", threshold.recommended_step_seconds});
	}
	if (scenario.id == ScenarioId::OrbitalSolverComparison) {
		for (const auto& threshold : orbital_thresholds) {
			metrics.push_back({threshold.solver_method, std::string(threshold.metric), threshold.recommended_step_seconds});
		}
	}
	if (scenario.id == ScenarioId::SpringOscillatorComparison) {
		for (const auto& threshold : spring_thresholds) {
			metrics.push_back({threshold.solver_method, std::string(threshold.metric), threshold.recommended_step_seconds});
		}
	}
	return metrics;
}

std::vector<SolverRecommendationCandidate> build_solver_recommendation_candidates(
	const Scenario& scenario,
	const std::vector<StabilityThresholdEstimate>& position_thresholds,
	const std::vector<OrbitalDriftThresholdEstimate>& orbital_thresholds,
	const std::vector<SpringDriftThresholdEstimate>& spring_thresholds) {
	const auto scenario_metrics = collect_scenario_recommendation_metrics(
		scenario,
		position_thresholds,
		orbital_thresholds,
		spring_thresholds);
	std::vector<SolverRecommendationCandidate> candidates;
	for (const auto solver_method : {SolverMethodId::Euler, SolverMethodId::Symplectic, SolverMethodId::Rk4}) {
		std::vector<ScenarioRecommendationMetric> solver_metrics;
		for (const auto& metric : scenario_metrics) {
			if (metric.solver_method == solver_method) {
				solver_metrics.push_back(metric);
			}
		}
		if (solver_metrics.empty()) {
			candidates.push_back({
				solver_method,
				std::nullopt,
				"unavailable",
				false,
				"No sampled metrics are available for this solver.",
			});
			continue;
		}
		const auto blocking = std::find_if(
			solver_metrics.begin(),
			solver_metrics.end(),
			[](const ScenarioRecommendationMetric& metric) {
				return !metric.recommended_step_seconds.has_value();
			});
		if (blocking != solver_metrics.end()) {
			const auto limiting = format_metric_label(blocking->metric);
			candidates.push_back({
				solver_method,
				std::nullopt,
				limiting,
				false,
				limiting + " never meets the sampled tolerance band.",
			});
			continue;
		}
		auto limiting = solver_metrics.front();
		for (const auto& candidate : solver_metrics) {
			if (candidate.recommended_step_seconds.value_or(0.0) <
				limiting.recommended_step_seconds.value_or(0.0)) {
				limiting = candidate;
			}
		}
		const auto label = format_metric_label(limiting.metric);
		candidates.push_back({
			solver_method,
			limiting.recommended_step_seconds,
			label,
			true,
			label + " is the limiting tolerance.",
		});
	}
	std::sort(
		candidates.begin(),
		candidates.end(),
		[](const SolverRecommendationCandidate& left, const SolverRecommendationCandidate& right) {
			if (left.eligible != right.eligible) {
				return left.eligible && !right.eligible;
			}
			return left.recommended_step_seconds.value_or(-1.0) > right.recommended_step_seconds.value_or(-1.0);
		});
	return candidates;
}

std::optional<SolverRecommendationSummary> build_solver_recommendation_summary(
	const Scenario& scenario,
	const std::vector<StabilityThresholdEstimate>& position_thresholds,
	const std::vector<OrbitalDriftThresholdEstimate>& orbital_thresholds,
	const std::vector<SpringDriftThresholdEstimate>& spring_thresholds) {
	const auto candidates = build_solver_recommendation_candidates(
		scenario,
		position_thresholds,
		orbital_thresholds,
		spring_thresholds);
	for (const auto& candidate : candidates) {
		if (candidate.eligible && candidate.recommended_step_seconds.has_value()) {
			return SolverRecommendationSummary{
				.solver_method = candidate.solver_method,
				.recommended_step_seconds = *candidate.recommended_step_seconds,
				.reason = candidate.reason,
			};
		}
	}
	return std::nullopt;
}

Json serialize_observed_order_estimates(const std::vector<ObservedOrderEstimate>& estimates) {
	Json json = Json::array();
	for (const auto& estimate : estimates) {
		json.push_back({
			{"coarseStepSeconds", estimate.coarse_step_seconds},
			{"fineStepSeconds", estimate.fine_step_seconds},
			{"eulerOrder", estimate.euler_order.has_value() ? Json(*estimate.euler_order) : Json(nullptr)},
			{"symplecticOrder", estimate.symplectic_order.has_value() ? Json(*estimate.symplectic_order) : Json(nullptr)},
			{"rk4Order", estimate.rk4_order.has_value() ? Json(*estimate.rk4_order) : Json(nullptr)},
		});
	}
	return json;
}

Json serialize_solver_recommendation_summary(const std::optional<SolverRecommendationSummary>& summary) {
	if (!summary.has_value()) {
		return nullptr;
	}
	return Json{
		{"solverMethod", to_string(summary->solver_method)},
		{"recommendedStepSeconds", summary->recommended_step_seconds},
		{"reason", summary->reason},
	};
}

Json serialize_solver_recommendation_candidates(const std::vector<SolverRecommendationCandidate>& candidates) {
	Json json = Json::array();
	for (const auto& candidate : candidates) {
		json.push_back({
			{"solverMethod", to_string(candidate.solver_method)},
			{"recommendedStepSeconds", candidate.recommended_step_seconds.has_value() ? Json(*candidate.recommended_step_seconds) : Json(nullptr)},
			{"limitingMetric", candidate.limiting_metric},
			{"eligible", candidate.eligible},
			{"reason", candidate.reason},
		});
	}
	return json;
}

Scenario parse_scenario(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid scenario object");
	}
	require_string_field(value, "id");
	const auto scenario_id_text = value.at("id").get<std::string>();
	const auto parsed_id = parse_scenario_id(scenario_id_text);
	if (!parsed_id.has_value()) {
		throw std::runtime_error("Unknown scenario id: " + scenario_id_text);
	}
	require_string_field(value, "name");
	require_string_field(value, "summary");
	require_string_field(value, "equationSummary");
	require_string_field(value, "status");
	require_string_field(value, "focusArea");
	require_number_field(value, "durationSeconds");
	require_number_field(value, "mass");
	require_number_field(value, "comparisonStepSeconds");
	require_number_field(value, "referenceStepSeconds");

	Scenario scenario = make_default_scenario(*parsed_id);
	scenario.name = value.at("name").get<std::string>();
	scenario.summary = value.at("summary").get<std::string>();
	scenario.equation_summary = value.at("equationSummary").get<std::string>();
	scenario.status = value.at("status").get<std::string>();
	scenario.focus_area = value.at("focusArea").get<std::string>();
	scenario.duration_seconds = value.at("durationSeconds").get<double>();
	scenario.view_bounds = parse_view_bounds(value.at("viewBounds"));
	scenario.mass = value.at("mass").get<double>();
	scenario.initial_position = parse_vector2(value.at("initialPosition"), "initialPosition");
	scenario.initial_velocity = parse_vector2(value.at("initialVelocity"), "initialVelocity");
	if (value.contains("gravity") && !value.at("gravity").is_null()) {
		scenario.gravity = parse_vector2(value.at("gravity"), "gravity");
	}
	if (value.contains("dragCoefficient") && !value.at("dragCoefficient").is_null()) {
		scenario.drag_coefficient = value.at("dragCoefficient").get<double>();
	}
	if (value.contains("orbitalCenter") && !value.at("orbitalCenter").is_null()) {
		scenario.orbital_center = parse_vector2(value.at("orbitalCenter"), "orbitalCenter");
	}
	if (value.contains("gravitationalParameter") && !value.at("gravitationalParameter").is_null()) {
		require_number_field(value, "gravitationalParameter");
		scenario.gravitational_parameter = value.at("gravitationalParameter").get<double>();
	}
	if (value.contains("springAnchor") && !value.at("springAnchor").is_null()) {
		scenario.spring_anchor = parse_vector2(value.at("springAnchor"), "springAnchor");
	}
	if (value.contains("springConstant") && !value.at("springConstant").is_null()) {
		require_number_field(value, "springConstant");
		scenario.spring_constant = value.at("springConstant").get<double>();
	}
	if (value.contains("dampingCoefficient") && !value.at("dampingCoefficient").is_null()) {
		require_number_field(value, "dampingCoefficient");
		scenario.damping_coefficient = value.at("dampingCoefficient").get<double>();
	}
	scenario.comparison_step_seconds = value.at("comparisonStepSeconds").get<double>();
	scenario.reference_step_seconds = value.at("referenceStepSeconds").get<double>();
	return scenario;
}

OverlayOptions parse_overlay_options(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid overlays object");
	}
	require_boolean_field(value, "showReferenceTrajectory");
	require_boolean_field(value, "showEulerTrajectory");
	require_boolean_field(value, "showSymplecticTrajectory");
	require_boolean_field(value, "showRk4Trajectory");
	require_boolean_field(value, "showErrorBars");
	return {
		value.at("showReferenceTrajectory").get<bool>(),
		value.at("showEulerTrajectory").get<bool>(),
		value.at("showSymplecticTrajectory").get<bool>(),
		value.at("showRk4Trajectory").get<bool>(),
		value.at("showErrorBars").get<bool>(),
	};
}

}  // namespace

ImportedScenarioState parse_import_payload(std::string_view source) {
	const Json payload = Json::parse(source);
	if (!payload.is_object()) {
		throw std::runtime_error("Invalid payload root");
	}
	if (!payload.contains("scenario") || !payload.at("scenario").is_object()) {
		throw std::runtime_error("Invalid or missing scenario payload");
	}
	if (!payload.contains("snapshot") || !payload.at("snapshot").is_object()) {
		throw std::runtime_error("Invalid or missing snapshot payload");
	}
	const auto& snapshot = payload.at("snapshot");
	require_number_field(snapshot, "timeSeconds");

	return {
		.scenario = parse_scenario(payload.at("scenario")),
		.time_seconds = snapshot.at("timeSeconds").get<double>(),
		.overlays = payload.contains("overlays") && !payload.at("overlays").is_null()
			? std::optional<OverlayOptions>{parse_overlay_options(payload.at("overlays"))}
			: std::nullopt,
	};
}

std::string serialize_export_payload(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const OverlayOptions& overlays,
	const std::vector<TrajectorySample>& samples,
	const std::vector<ConvergenceSample>& convergence_study,
	const std::vector<OrbitalInvariantHistorySample>& orbital_invariant_history,
	const std::vector<SpringInvariantHistorySample>& spring_invariant_history,
	std::string_view exported_at) {
	Json scenario_json{
		{"id", to_string(scenario.id)},
		{"name", scenario.name},
		{"summary", scenario.summary},
		{"equationSummary", scenario.equation_summary},
		{"status", scenario.status},
		{"durationSeconds", scenario.duration_seconds},
		{"viewBounds",
			{{"minX", scenario.view_bounds.min_x},
			 {"maxX", scenario.view_bounds.max_x},
			 {"minY", scenario.view_bounds.min_y},
			 {"maxY", scenario.view_bounds.max_y}}},
		{"focusArea", scenario.focus_area},
		{"mass", scenario.mass},
		{"initialPosition", serialize_vector2(scenario.initial_position)},
		{"initialVelocity", serialize_vector2(scenario.initial_velocity)},
		{"comparisonStepSeconds", scenario.comparison_step_seconds},
		{"referenceStepSeconds", scenario.reference_step_seconds},
	};
	if (!(scenario.gravity.x == 0.0 && scenario.gravity.y == 0.0) ||
		scenario.id == ScenarioId::ProjectileSolverComparison) {
		scenario_json["gravity"] = serialize_vector2(scenario.gravity);
	}
	if (scenario.drag_coefficient != 0.0 || scenario.id == ScenarioId::ProjectileSolverComparison) {
		scenario_json["dragCoefficient"] = scenario.drag_coefficient;
	}
	if (scenario.orbital_center.has_value()) {
		scenario_json["orbitalCenter"] = serialize_vector2(*scenario.orbital_center);
	}
	if (scenario.gravitational_parameter.has_value()) {
		scenario_json["gravitationalParameter"] = *scenario.gravitational_parameter;
	}
	if (scenario.spring_anchor.has_value()) {
		scenario_json["springAnchor"] = serialize_vector2(*scenario.spring_anchor);
	}
	if (scenario.spring_constant.has_value()) {
		scenario_json["springConstant"] = *scenario.spring_constant;
	}
	if (scenario.damping_coefficient.has_value()) {
		scenario_json["dampingCoefficient"] = *scenario.damping_coefficient;
	}

	Json snapshot_json{
		{"timeSeconds", snapshot.time_seconds},
		{"referencePosition", serialize_vector2(snapshot.reference_position)},
		{"referenceVelocity", serialize_vector2(snapshot.reference_velocity)},
		{"euler", serialize_solver_metrics(snapshot.euler)},
		{"symplectic", serialize_solver_metrics(snapshot.symplectic)},
		{"rk4", serialize_solver_metrics(snapshot.rk4)},
	};
	if (snapshot.orbital_diagnostics.has_value()) {
		snapshot_json["orbitalDiagnostics"] =
			serialize_orbital_diagnostics(*snapshot.orbital_diagnostics);
	}
	if (snapshot.spring_diagnostics.has_value()) {
		snapshot_json["springDiagnostics"] =
			serialize_spring_diagnostics(*snapshot.spring_diagnostics);
	}

	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		samples_json.push_back({
			{"timeSeconds", sample.time_seconds},
			{"reference", {{"x", sample.reference_x}, {"y", sample.reference_y}}},
			{"euler", {{"x", sample.euler_x}, {"y", sample.euler_y}}},
			{"symplectic", {{"x", sample.symplectic_x}, {"y", sample.symplectic_y}}},
			{"rk4", {{"x", sample.rk4_x}, {"y", sample.rk4_y}}},
		});
	}

	Json convergence_json = Json::array();
	for (const auto& row : convergence_study) {
		Json row_json{
			{"stepSeconds", row.step_seconds},
			{"eulerFinalPositionError", row.euler_final_position_error},
			{"symplecticFinalPositionError", row.symplectic_final_position_error},
			{"rk4FinalPositionError", row.rk4_final_position_error},
		};
		if (row.euler_final_specific_energy_error.has_value()) {
			row_json["eulerFinalSpecificEnergyError"] = *row.euler_final_specific_energy_error;
			row_json["symplecticFinalSpecificEnergyError"] = *row.symplectic_final_specific_energy_error;
			row_json["rk4FinalSpecificEnergyError"] = *row.rk4_final_specific_energy_error;
			row_json["eulerFinalAngularMomentumError"] = *row.euler_final_angular_momentum_error;
			row_json["symplecticFinalAngularMomentumError"] = *row.symplectic_final_angular_momentum_error;
			row_json["rk4FinalAngularMomentumError"] = *row.rk4_final_angular_momentum_error;
		}
		if (row.euler_final_spring_energy_error.has_value()) {
			row_json["eulerFinalSpringEnergyError"] = *row.euler_final_spring_energy_error;
			row_json["symplecticFinalSpringEnergyError"] = *row.symplectic_final_spring_energy_error;
			row_json["rk4FinalSpringEnergyError"] = *row.rk4_final_spring_energy_error;
			row_json["eulerFinalSpringPhaseError"] = *row.euler_final_spring_phase_error;
			row_json["symplecticFinalSpringPhaseError"] = *row.symplectic_final_spring_phase_error;
			row_json["rk4FinalSpringPhaseError"] = *row.rk4_final_spring_phase_error;
		}
		convergence_json.push_back(row_json);
	}

	Json orbital_history_json = Json::array();
	for (const auto& sample : orbital_invariant_history) {
		orbital_history_json.push_back({
			{"timeSeconds", sample.time_seconds},
			{"eulerSpecificEnergyError", sample.euler_specific_energy_error},
			{"symplecticSpecificEnergyError", sample.symplectic_specific_energy_error},
			{"rk4SpecificEnergyError", sample.rk4_specific_energy_error},
			{"eulerAngularMomentumError", sample.euler_angular_momentum_error},
			{"symplecticAngularMomentumError", sample.symplectic_angular_momentum_error},
			{"rk4AngularMomentumError", sample.rk4_angular_momentum_error},
		});
	}

	Json spring_history_json = Json::array();
	for (const auto& sample : spring_invariant_history) {
		spring_history_json.push_back({
			{"timeSeconds", sample.time_seconds},
			{"eulerTotalEnergyError", sample.euler_total_energy_error},
			{"symplecticTotalEnergyError", sample.symplectic_total_energy_error},
			{"rk4TotalEnergyError", sample.rk4_total_energy_error},
			{"eulerDisplacementMagnitudeError", sample.euler_displacement_magnitude_error},
			{"symplecticDisplacementMagnitudeError", sample.symplectic_displacement_magnitude_error},
			{"rk4DisplacementMagnitudeError", sample.rk4_displacement_magnitude_error},
			{"eulerPhaseAngleError", sample.euler_phase_angle_error},
			{"symplecticPhaseAngleError", sample.symplectic_phase_angle_error},
			{"rk4PhaseAngleError", sample.rk4_phase_angle_error},
		});
	}

	const auto position_observed_orders = build_observed_order_estimates(convergence_study);
	const auto orbital_energy_observed_orders = build_orbital_observed_order_estimates(convergence_study, "energy");
	const auto orbital_angular_momentum_observed_orders = build_orbital_observed_order_estimates(convergence_study, "angularMomentum");
	const auto spring_energy_observed_orders = build_spring_observed_order_estimates(convergence_study, "energy");
	const auto spring_phase_observed_orders = build_spring_observed_order_estimates(convergence_study, "phase");
	const auto position_thresholds = build_stability_threshold_estimates(scenario, convergence_study);
	const auto orbital_thresholds = build_orbital_drift_threshold_estimates(scenario, convergence_study);
	const auto spring_thresholds = build_spring_drift_threshold_estimates(scenario, convergence_study);
	const auto solver_recommendation = build_solver_recommendation_summary(
		scenario,
		position_thresholds,
		orbital_thresholds,
		spring_thresholds);
	const auto solver_recommendation_ranking = build_solver_recommendation_candidates(
		scenario,
		position_thresholds,
		orbital_thresholds,
		spring_thresholds);

	const auto find_position_tolerance = [&]() -> std::optional<double> {
		for (const auto& threshold : position_thresholds) {
			if (threshold.solver_method == SolverMethodId::Euler) {
				return threshold.tolerance;
			}
		}
		return std::nullopt;
	};
	const auto find_orbital_tolerance = [&](std::string_view metric) -> std::optional<double> {
		for (const auto& threshold : orbital_thresholds) {
			if (threshold.metric == metric && threshold.solver_method == SolverMethodId::Euler) {
				return threshold.tolerance;
			}
		}
		return std::nullopt;
	};
	const auto find_spring_tolerance = [&](std::string_view metric) -> std::optional<double> {
		for (const auto& threshold : spring_thresholds) {
			if (threshold.metric == metric && threshold.solver_method == SolverMethodId::Euler) {
				return threshold.tolerance;
			}
		}
		return std::nullopt;
	};
	const std::optional<double> recommended_step_seconds = solver_recommendation.has_value()
		? std::optional<double>{solver_recommendation->recommended_step_seconds}
		: std::nullopt;

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{{"showReferenceTrajectory", overlays.show_reference_trajectory},
			 {"showEulerTrajectory", overlays.show_euler_trajectory},
			 {"showSymplecticTrajectory", overlays.show_symplectic_trajectory},
			 {"showRk4Trajectory", overlays.show_rk4_trajectory},
			 {"showErrorBars", overlays.show_error_bars}}},
		{"samples", samples_json},
		{"convergenceStudy", convergence_json},
		{"orbitalInvariantHistory", orbital_history_json},
		{"springInvariantHistory", spring_history_json},
		{"solverRecommendation", serialize_solver_recommendation_summary(solver_recommendation)},
		{"solverRecommendationRanking", serialize_solver_recommendation_candidates(solver_recommendation_ranking)},
		{"observedOrders",
			{{"position", serialize_observed_order_estimates(position_observed_orders)},
			 {"orbital",
				{{"energy", serialize_observed_order_estimates(orbital_energy_observed_orders)},
				 {"angularMomentum", serialize_observed_order_estimates(orbital_angular_momentum_observed_orders)}}},
			 {"spring",
				{{"energy", serialize_observed_order_estimates(spring_energy_observed_orders)},
				 {"phase", serialize_observed_order_estimates(spring_phase_observed_orders)}}}}},
		{"convergencePlotGuides",
			{{"position",
				{{"tolerance", find_position_tolerance().has_value() ? Json(*find_position_tolerance()) : Json(nullptr)},
				 {"recommendedStepSeconds", recommended_step_seconds.has_value() ? Json(*recommended_step_seconds) : Json(nullptr)}}},
			 {"orbital",
				{{"energyTolerance", find_orbital_tolerance("energy").has_value() ? Json(*find_orbital_tolerance("energy")) : Json(nullptr)},
				 {"angularMomentumTolerance", find_orbital_tolerance("angularMomentum").has_value() ? Json(*find_orbital_tolerance("angularMomentum")) : Json(nullptr)},
				 {"recommendedStepSeconds", recommended_step_seconds.has_value() ? Json(*recommended_step_seconds) : Json(nullptr)}}},
			 {"spring",
				{{"energyTolerance", find_spring_tolerance("energy").has_value() ? Json(*find_spring_tolerance("energy")) : Json(nullptr)},
				 {"phaseTolerance", find_spring_tolerance("phase").has_value() ? Json(*find_spring_tolerance("phase")) : Json(nullptr)},
				 {"recommendedStepSeconds", recommended_step_seconds.has_value() ? Json(*recommended_step_seconds) : Json(nullptr)}}}}},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::computational_physics