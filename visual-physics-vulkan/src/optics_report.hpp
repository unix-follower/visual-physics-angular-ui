#pragma once

#include <string>
#include <vector>

#include "optics_core.hpp"

namespace visual_physics::optics {

std::string build_report_csv(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const std::vector<Sample>& samples);

}  // namespace visual_physics::optics