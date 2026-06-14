#pragma once

#include <string>
#include <string_view>
#include <vector>

#include "kinematics_core.hpp"

namespace visual_physics::kinematics {

struct ImportedScenarioState {
	Scenario scenario;
	double time_seconds;
};

struct VectorOverlayOptions {
	bool show_position_vector = true;
	bool show_velocity_vector = true;
	bool show_acceleration_vector = true;
};

ImportedScenarioState parse_import_payload(std::string_view source);
std::string serialize_export_payload(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const VectorOverlayOptions& overlays,
	const std::vector<Sample>& samples,
	std::string_view exported_at);

}  // namespace visual_physics::kinematics