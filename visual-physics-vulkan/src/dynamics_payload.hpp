#pragma once

#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "dynamics_core.hpp"

namespace visual_physics::dynamics {

struct OverlayOptions {
	bool show_momentum_vector = true;
	bool show_velocity_vector = true;
	bool show_force_vector = true;
	bool show_scenario_guides = true;
};

struct ImportedScenarioState {
	Scenario scenario;
	double time_seconds;
	std::optional<OverlayOptions> overlays;
};

ImportedScenarioState parse_import_payload(std::string_view source);
std::string serialize_export_payload(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const OverlayOptions& overlays,
	const std::vector<Sample>& samples,
	std::string_view exported_at);

}  // namespace visual_physics::dynamics