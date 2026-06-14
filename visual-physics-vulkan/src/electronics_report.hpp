#pragma once

#include <string>
#include <vector>

#include "electronics_core.hpp"

namespace visual_physics::electronics {

std::string build_transient_csv(const Scenario& scenario, const std::vector<Sample>& samples);

}  // namespace visual_physics::electronics