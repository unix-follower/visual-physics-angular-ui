#pragma once

#include <string>
#include <vector>

#include "thermodynamics_core.hpp"

namespace visual_physics::thermodynamics {

std::string build_report_csv(const Scenario& scenario, const std::vector<Sample>& samples);

}  // namespace visual_physics::thermodynamics