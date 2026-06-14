#pragma once

#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "computational_physics_core.hpp"

namespace visual_physics::computational_physics {

struct OverlayOptions {
	bool show_reference_trajectory = true;
	bool show_euler_trajectory = true;
	bool show_symplectic_trajectory = true;
	bool show_rk4_trajectory = true;
	bool show_error_bars = true;
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
	const std::vector<TrajectorySample>& samples,
	const std::vector<ConvergenceSample>& convergence_study,
	const std::vector<OrbitalInvariantHistorySample>& orbital_invariant_history,
	const std::vector<SpringInvariantHistorySample>& spring_invariant_history,
	std::string_view exported_at);

}  // namespace visual_physics::computational_physics