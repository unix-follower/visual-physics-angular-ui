#pragma once

#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "electromagnetism_core.hpp"

namespace visual_physics::electromagnetism {

struct OverlayOptions {
	bool show_field_vectors = true;
	bool show_magnetic_field = true;
	bool show_force_vectors = true;
	bool show_potential_guides = true;
	bool show_trajectory = true;
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

}  // namespace visual_physics::electromagnetism