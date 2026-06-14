#pragma once

#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "quantum_core.hpp"

namespace visual_physics::quantum {

struct OverlayOptions {
	bool show_probability_guide = true;
	bool show_potential_guide = true;
	bool show_phase_guide = true;
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

}  // namespace visual_physics::quantum