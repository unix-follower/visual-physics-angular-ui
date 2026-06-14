#include "computational_physics_report.hpp"

#include <algorithm>
#include <cmath>
#include <functional>
#include <limits>
#include <optional>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::computational_physics {
namespace {

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
};

struct SpringDriftThresholdEstimate {
	std::string_view metric;
	SolverMethodId solver_method;
	double tolerance;
	std::optional<double> recommended_step_seconds;
};

struct OrbitalDriftThresholdEstimate {
	std::string_view metric;
	SolverMethodId solver_method;
	double tolerance;
	std::optional<double> recommended_step_seconds;
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

constexpr std::string_view kConvergenceCsvHeader =
	"comparison_step_seconds,euler_final_position_error,symplectic_final_position_error,rk4_final_position_error,"
	"euler_observed_order,symplectic_observed_order,rk4_observed_order,euler_within_tolerance,"
	"symplectic_within_tolerance,rk4_within_tolerance,tolerance_position_error,"
	"euler_final_specific_energy_error,symplectic_final_specific_energy_error,rk4_final_specific_energy_error,"
	"euler_energy_within_tolerance,symplectic_energy_within_tolerance,rk4_energy_within_tolerance,"
	"tolerance_specific_energy_error,euler_energy_observed_order,symplectic_energy_observed_order,"
	"rk4_energy_observed_order,euler_final_angular_momentum_error,symplectic_final_angular_momentum_error,"
	"rk4_final_angular_momentum_error,euler_angular_momentum_within_tolerance,"
	"symplectic_angular_momentum_within_tolerance,rk4_angular_momentum_within_tolerance,"
	"tolerance_angular_momentum_error,euler_angular_momentum_observed_order,"
	"symplectic_angular_momentum_observed_order,rk4_angular_momentum_observed_order,"
	"euler_final_spring_energy_error,symplectic_final_spring_energy_error,rk4_final_spring_energy_error,"
	"euler_spring_energy_within_tolerance,symplectic_spring_energy_within_tolerance,"
	"rk4_spring_energy_within_tolerance,tolerance_spring_energy_error,euler_spring_energy_observed_order,"
	"symplectic_spring_energy_observed_order,rk4_spring_energy_observed_order,"
	"euler_final_spring_phase_error,symplectic_final_spring_phase_error,rk4_final_spring_phase_error,"
	"euler_spring_phase_within_tolerance,symplectic_spring_phase_within_tolerance,"
	"rk4_spring_phase_within_tolerance,tolerance_spring_phase_error,euler_spring_phase_observed_order,"
	"symplectic_spring_phase_observed_order,rk4_spring_phase_observed_order,guide_position_tolerance,"
	"guide_position_recommended_step,guide_orbital_energy_tolerance,guide_orbital_angular_momentum_tolerance,"
	"guide_orbital_recommended_step,guide_spring_energy_tolerance,guide_spring_phase_tolerance,"
	"guide_spring_recommended_step,recommended_solver_method,recommended_solver_step_seconds,"
	"recommendation_reason,rank_1_solver_method,rank_1_step_seconds,rank_1_limiting_metric,"
	"rank_1_eligible,rank_1_reason,rank_2_solver_method,rank_2_step_seconds,rank_2_limiting_metric,"
	"rank_2_eligible,rank_2_reason,rank_3_solver_method,rank_3_step_seconds,rank_3_limiting_metric,"
	"rank_3_eligible,rank_3_reason";

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
	for (std::size_t index = 0; index + 1 < sorted_samples.size(); index += 1) {
		const auto& coarse = sorted_samples[index];
		const auto& fine = sorted_samples[index + 1];
		const double ratio = coarse.step_seconds / std::max(fine.step_seconds, 1e-12);
		const double euler_order = compute_observed_order(euler_accessor(coarse), euler_accessor(fine), ratio);
		const double symplectic_order = compute_observed_order(
			symplectic_accessor(coarse),
			symplectic_accessor(fine),
			ratio);
		const double rk4_order = compute_observed_order(rk4_accessor(coarse), rk4_accessor(fine), ratio);
		estimates.push_back({
			.coarse_step_seconds = coarse.step_seconds,
			.fine_step_seconds = fine.step_seconds,
			.euler_order = std::isfinite(euler_order) ? std::optional<double>{euler_order} : std::nullopt,
			.symplectic_order =
				std::isfinite(symplectic_order) ? std::optional<double>{symplectic_order} : std::nullopt,
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

std::optional<double> find_recommended_step(
	const std::vector<ConvergenceSample>& samples,
	double tolerance,
	const std::function<double(const ConvergenceSample&)>& accessor) {
	for (const auto& sample : samples) {
		if (accessor(sample) <= tolerance) {
			return sample.step_seconds;
		}
	}

	return std::nullopt;
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

	return {
		{SolverMethodId::Euler, tolerance, find_recommended_step(sorted_samples, tolerance, [](const ConvergenceSample& sample) {
			return sample.euler_final_position_error;
		})},
		{SolverMethodId::Symplectic, tolerance, find_recommended_step(sorted_samples, tolerance, [](const ConvergenceSample& sample) {
			return sample.symplectic_final_position_error;
		})},
		{SolverMethodId::Rk4, tolerance, find_recommended_step(sorted_samples, tolerance, [](const ConvergenceSample& sample) {
			return sample.rk4_final_position_error;
		})},
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
		for (const auto& sample : samples) {
			const auto error = accessor(sample, solver_method);
			if (error.has_value() && *error <= tolerance) {
				recommended_step_seconds = sample.step_seconds;
				break;
			}
		}
		estimates.push_back({metric, solver_method, tolerance, recommended_step_seconds});
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
	constexpr double phase_tolerance = 0.15;
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
		for (const auto& sample : samples) {
			const auto error = accessor(sample, solver_method);
			if (error.has_value() && *error <= tolerance) {
				recommended_step_seconds = sample.step_seconds;
				break;
			}
		}
		estimates.push_back({metric, solver_method, tolerance, recommended_step_seconds});
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
			candidates.push_back({solver_method, std::nullopt, "unavailable", false, "No sampled metrics are available for this solver."});
			continue;
		}
		const auto blocking_metric = std::find_if(
			solver_metrics.begin(),
			solver_metrics.end(),
			[](const ScenarioRecommendationMetric& metric) {
				return !metric.recommended_step_seconds.has_value();
			});
		if (blocking_metric != solver_metrics.end()) {
			const auto label = format_metric_label(blocking_metric->metric);
			candidates.push_back({
				solver_method,
				std::nullopt,
				label,
				false,
				label + " never meets the sampled tolerance band.",
			});
			continue;
		}
		auto limiting_metric = solver_metrics.front();
		for (const auto& metric : solver_metrics) {
			if (metric.recommended_step_seconds.value_or(0.0) <
				limiting_metric.recommended_step_seconds.value_or(0.0)) {
				limiting_metric = metric;
			}
		}
		const auto label = format_metric_label(limiting_metric.metric);
		candidates.push_back({
			solver_method,
			limiting_metric.recommended_step_seconds,
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

std::string format_optional(std::optional<double> value) {
	if (!value.has_value() || !std::isfinite(*value)) {
		return "";
	}
	std::ostringstream stream;
	stream.setf(std::ios::fixed);
	stream.precision(6);
	stream << *value;
	return stream.str();
}

std::string format_observed_order(std::optional<double> value) {
	return format_optional(value);
}

std::string format_threshold_match(double step_seconds, std::optional<double> recommended_step_seconds) {
	if (!recommended_step_seconds.has_value()) {
		return "false";
	}
	return std::abs(step_seconds - *recommended_step_seconds) < 1e-9 ? "true" : "false";
}

std::string format_fixed(double value) {
	std::ostringstream stream;
	stream.setf(std::ios::fixed);
	stream.precision(6);
	stream << value;
	return stream.str();
}

std::string format_csv_text(const std::string& value) {
	if (value.find(',') == std::string::npos) {
		return value;
	}
	std::string escaped = value;
	std::size_t position = 0;
	while ((position = escaped.find('"', position)) != std::string::npos) {
		escaped.insert(position, 1, '"');
		position += 2;
	}
	return '"' + escaped + '"';
}

const ObservedOrderEstimate* find_observed_order(
	const std::vector<ObservedOrderEstimate>& estimates,
	double fine_step_seconds) {
	for (const auto& estimate : estimates) {
		if (std::abs(estimate.fine_step_seconds - fine_step_seconds) < 1e-9) {
			return &estimate;
		}
	}
	return nullptr;
}

std::optional<double> find_metric_tolerance(
	const std::vector<StabilityThresholdEstimate>& thresholds,
	SolverMethodId solver_method) {
	for (const auto& threshold : thresholds) {
		if (threshold.solver_method == solver_method) {
			return threshold.tolerance;
		}
	}
	return std::nullopt;
}

std::optional<double> find_metric_tolerance(
	const std::vector<OrbitalDriftThresholdEstimate>& thresholds,
	std::string_view metric,
	SolverMethodId solver_method) {
	for (const auto& threshold : thresholds) {
		if (threshold.metric == metric && threshold.solver_method == solver_method) {
			return threshold.tolerance;
		}
	}
	return std::nullopt;
}

std::optional<double> find_metric_tolerance(
	const std::vector<SpringDriftThresholdEstimate>& thresholds,
	std::string_view metric,
	SolverMethodId solver_method) {
	for (const auto& threshold : thresholds) {
		if (threshold.metric == metric && threshold.solver_method == solver_method) {
			return threshold.tolerance;
		}
	}
	return std::nullopt;
}

std::optional<double> find_recommended_step(
	const std::vector<StabilityThresholdEstimate>& thresholds,
	SolverMethodId solver_method) {
	for (const auto& threshold : thresholds) {
		if (threshold.solver_method == solver_method) {
			return threshold.recommended_step_seconds;
		}
	}
	return std::nullopt;
}

std::optional<double> find_recommended_step(
	const std::vector<OrbitalDriftThresholdEstimate>& thresholds,
	std::string_view metric,
	SolverMethodId solver_method) {
	for (const auto& threshold : thresholds) {
		if (threshold.metric == metric && threshold.solver_method == solver_method) {
			return threshold.recommended_step_seconds;
		}
	}
	return std::nullopt;
}

std::optional<double> find_recommended_step(
	const std::vector<SpringDriftThresholdEstimate>& thresholds,
	std::string_view metric,
	SolverMethodId solver_method) {
	for (const auto& threshold : thresholds) {
		if (threshold.metric == metric && threshold.solver_method == solver_method) {
			return threshold.recommended_step_seconds;
		}
	}
	return std::nullopt;
}

}  // namespace

std::string build_convergence_csv(
	const Scenario& scenario,
	const std::vector<ConvergenceSample>& samples) {
	const auto observed_orders = build_observed_order_estimates(samples);
	const auto orbital_energy_observed_orders = build_orbital_observed_order_estimates(samples, "energy");
	const auto orbital_momentum_observed_orders = build_orbital_observed_order_estimates(samples, "angularMomentum");
	const auto spring_energy_observed_orders = build_spring_observed_order_estimates(samples, "energy");
	const auto spring_phase_observed_orders = build_spring_observed_order_estimates(samples, "phase");
	const auto position_thresholds = build_stability_threshold_estimates(scenario, samples);
	const auto orbital_thresholds = build_orbital_drift_threshold_estimates(scenario, samples);
	const auto spring_thresholds = build_spring_drift_threshold_estimates(scenario, samples);
	const auto solver_recommendation = build_solver_recommendation_summary(
		scenario,
		position_thresholds,
		orbital_thresholds,
		spring_thresholds);
	const auto solver_ranking = build_solver_recommendation_candidates(
		scenario,
		position_thresholds,
		orbital_thresholds,
		spring_thresholds);

	const auto position_tolerance = find_metric_tolerance(position_thresholds, SolverMethodId::Euler);
	const auto orbital_energy_tolerance = find_metric_tolerance(orbital_thresholds, "energy", SolverMethodId::Euler);
	const auto orbital_momentum_tolerance = find_metric_tolerance(orbital_thresholds, "angularMomentum", SolverMethodId::Euler);
	const auto spring_energy_tolerance = find_metric_tolerance(spring_thresholds, "energy", SolverMethodId::Euler);
	const auto spring_phase_tolerance = find_metric_tolerance(spring_thresholds, "phase", SolverMethodId::Euler);
	const auto recommended_step_seconds = solver_recommendation.has_value()
		? std::optional<double>{solver_recommendation->recommended_step_seconds}
		: std::nullopt;

	std::ostringstream stream;
	stream << kConvergenceCsvHeader;
	for (const auto& sample : samples) {
		const auto* position_estimate = find_observed_order(observed_orders, sample.step_seconds);
		const auto* orbital_energy_estimate = find_observed_order(orbital_energy_observed_orders, sample.step_seconds);
		const auto* orbital_momentum_estimate = find_observed_order(orbital_momentum_observed_orders, sample.step_seconds);
		const auto* spring_energy_estimate = find_observed_order(spring_energy_observed_orders, sample.step_seconds);
		const auto* spring_phase_estimate = find_observed_order(spring_phase_observed_orders, sample.step_seconds);

		stream << '\n'
			<< format_fixed(sample.step_seconds) << ','
			<< format_fixed(sample.euler_final_position_error) << ','
			<< format_fixed(sample.symplectic_final_position_error) << ','
			<< format_fixed(sample.rk4_final_position_error) << ','
			<< format_observed_order(position_estimate ? position_estimate->euler_order : std::nullopt) << ','
			<< format_observed_order(position_estimate ? position_estimate->symplectic_order : std::nullopt) << ','
			<< format_observed_order(position_estimate ? position_estimate->rk4_order : std::nullopt) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(position_thresholds, SolverMethodId::Euler)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(position_thresholds, SolverMethodId::Symplectic)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(position_thresholds, SolverMethodId::Rk4)) << ','
			<< format_optional(position_tolerance) << ','
			<< format_optional(sample.euler_final_specific_energy_error) << ','
			<< format_optional(sample.symplectic_final_specific_energy_error) << ','
			<< format_optional(sample.rk4_final_specific_energy_error) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(orbital_thresholds, "energy", SolverMethodId::Euler)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(orbital_thresholds, "energy", SolverMethodId::Symplectic)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(orbital_thresholds, "energy", SolverMethodId::Rk4)) << ','
			<< format_optional(orbital_energy_tolerance) << ','
			<< format_observed_order(orbital_energy_estimate ? orbital_energy_estimate->euler_order : std::nullopt) << ','
			<< format_observed_order(orbital_energy_estimate ? orbital_energy_estimate->symplectic_order : std::nullopt) << ','
			<< format_observed_order(orbital_energy_estimate ? orbital_energy_estimate->rk4_order : std::nullopt) << ','
			<< format_optional(sample.euler_final_angular_momentum_error) << ','
			<< format_optional(sample.symplectic_final_angular_momentum_error) << ','
			<< format_optional(sample.rk4_final_angular_momentum_error) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(orbital_thresholds, "angularMomentum", SolverMethodId::Euler)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(orbital_thresholds, "angularMomentum", SolverMethodId::Symplectic)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(orbital_thresholds, "angularMomentum", SolverMethodId::Rk4)) << ','
			<< format_optional(orbital_momentum_tolerance) << ','
			<< format_observed_order(orbital_momentum_estimate ? orbital_momentum_estimate->euler_order : std::nullopt) << ','
			<< format_observed_order(orbital_momentum_estimate ? orbital_momentum_estimate->symplectic_order : std::nullopt) << ','
			<< format_observed_order(orbital_momentum_estimate ? orbital_momentum_estimate->rk4_order : std::nullopt) << ','
			<< format_optional(sample.euler_final_spring_energy_error) << ','
			<< format_optional(sample.symplectic_final_spring_energy_error) << ','
			<< format_optional(sample.rk4_final_spring_energy_error) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(spring_thresholds, "energy", SolverMethodId::Euler)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(spring_thresholds, "energy", SolverMethodId::Symplectic)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(spring_thresholds, "energy", SolverMethodId::Rk4)) << ','
			<< format_optional(spring_energy_tolerance) << ','
			<< format_observed_order(spring_energy_estimate ? spring_energy_estimate->euler_order : std::nullopt) << ','
			<< format_observed_order(spring_energy_estimate ? spring_energy_estimate->symplectic_order : std::nullopt) << ','
			<< format_observed_order(spring_energy_estimate ? spring_energy_estimate->rk4_order : std::nullopt) << ','
			<< format_optional(sample.euler_final_spring_phase_error) << ','
			<< format_optional(sample.symplectic_final_spring_phase_error) << ','
			<< format_optional(sample.rk4_final_spring_phase_error) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(spring_thresholds, "phase", SolverMethodId::Euler)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(spring_thresholds, "phase", SolverMethodId::Symplectic)) << ','
			<< format_threshold_match(sample.step_seconds, find_recommended_step(spring_thresholds, "phase", SolverMethodId::Rk4)) << ','
			<< format_optional(spring_phase_tolerance) << ','
			<< format_observed_order(spring_phase_estimate ? spring_phase_estimate->euler_order : std::nullopt) << ','
			<< format_observed_order(spring_phase_estimate ? spring_phase_estimate->symplectic_order : std::nullopt) << ','
			<< format_observed_order(spring_phase_estimate ? spring_phase_estimate->rk4_order : std::nullopt) << ','
			<< format_optional(position_tolerance) << ','
			<< format_optional(recommended_step_seconds) << ','
			<< format_optional(orbital_energy_tolerance) << ','
			<< format_optional(orbital_momentum_tolerance) << ','
			<< format_optional(recommended_step_seconds) << ','
			<< format_optional(spring_energy_tolerance) << ','
			<< format_optional(spring_phase_tolerance) << ','
			<< format_optional(recommended_step_seconds) << ','
			<< (solver_recommendation.has_value() ? std::string(to_string(solver_recommendation->solver_method)) : std::string()) << ','
			<< format_optional(recommended_step_seconds) << ','
			<< format_csv_text(solver_recommendation.has_value() ? solver_recommendation->reason : std::string()) ;

		for (std::size_t index = 0; index < 3; index += 1) {
			if (index < solver_ranking.size()) {
				const auto& candidate = solver_ranking[index];
				stream << ','
					<< to_string(candidate.solver_method) << ','
					<< format_optional(candidate.recommended_step_seconds) << ','
					<< format_csv_text(candidate.limiting_metric) << ','
					<< (candidate.eligible ? "true" : "false") << ','
					<< format_csv_text(candidate.reason);
			} else {
				stream << ",,,,false,";
			}
		}
	}

	return stream.str();
}

std::string build_invariant_history_csv(
	const std::vector<OrbitalInvariantHistorySample>& samples) {
	std::ostringstream stream;
	stream << "time_seconds,euler_specific_energy_error,symplectic_specific_energy_error,rk4_specific_energy_error,"
		"euler_angular_momentum_error,symplectic_angular_momentum_error,rk4_angular_momentum_error";
	for (const auto& sample : samples) {
		stream << '\n'
			<< format_fixed(sample.time_seconds) << ','
			<< format_fixed(sample.euler_specific_energy_error) << ','
			<< format_fixed(sample.symplectic_specific_energy_error) << ','
			<< format_fixed(sample.rk4_specific_energy_error) << ','
			<< format_fixed(sample.euler_angular_momentum_error) << ','
			<< format_fixed(sample.symplectic_angular_momentum_error) << ','
			<< format_fixed(sample.rk4_angular_momentum_error);
	}
	return stream.str();
}

std::string build_spring_invariant_history_csv(
	const std::vector<SpringInvariantHistorySample>& samples) {
	std::ostringstream stream;
	stream << "time_seconds,euler_total_energy_error,symplectic_total_energy_error,rk4_total_energy_error,"
		"euler_amplitude_error,symplectic_amplitude_error,rk4_amplitude_error,euler_phase_error,"
		"symplectic_phase_error,rk4_phase_error";
	for (const auto& sample : samples) {
		stream << '\n'
			<< format_fixed(sample.time_seconds) << ','
			<< format_fixed(sample.euler_total_energy_error) << ','
			<< format_fixed(sample.symplectic_total_energy_error) << ','
			<< format_fixed(sample.rk4_total_energy_error) << ','
			<< format_fixed(sample.euler_displacement_magnitude_error) << ','
			<< format_fixed(sample.symplectic_displacement_magnitude_error) << ','
			<< format_fixed(sample.rk4_displacement_magnitude_error) << ','
			<< format_fixed(sample.euler_phase_angle_error) << ','
			<< format_fixed(sample.symplectic_phase_angle_error) << ','
			<< format_fixed(sample.rk4_phase_angle_error);
	}
	return stream.str();
}

}  // namespace visual_physics::computational_physics