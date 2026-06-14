#pragma once

#include <string>
#include <vector>

#include "computational_physics_core.hpp"

namespace visual_physics::computational_physics {

std::string build_convergence_csv(
	const Scenario& scenario,
	const std::vector<ConvergenceSample>& samples);
std::string build_invariant_history_csv(
	const std::vector<OrbitalInvariantHistorySample>& samples);
std::string build_spring_invariant_history_csv(
	const std::vector<SpringInvariantHistorySample>& samples);

}  // namespace visual_physics::computational_physics