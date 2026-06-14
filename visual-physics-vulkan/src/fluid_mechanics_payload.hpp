#pragma once

#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "fluid_mechanics_core.hpp"

namespace visual_physics::fluid_mechanics {

struct OverlayOptions {
	bool show_force_guides = true;
	bool show_waterline = true;
	bool show_equilibrium_guide = true;
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

}  // namespace visual_physics::fluid_mechanics