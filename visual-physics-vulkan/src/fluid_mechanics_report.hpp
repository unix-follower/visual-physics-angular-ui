#pragma once

#include <string>
#include <vector>

#include "fluid_mechanics_core.hpp"

namespace visual_physics::fluid_mechanics {

std::string build_report_csv(const Scenario& scenario, const std::vector<Sample>& samples);

}  // namespace visual_physics::fluid_mechanics