#pragma once

#include <vector>

#include "computational_physics_core.hpp"
#include "computational_physics_payload.hpp"

namespace visual_physics::computational_physics {

struct OverlayVertex {
	float x;
	float y;
	float r;
	float g;
	float b;
	float a;
};

std::vector<OverlayVertex> build_overlay_line_vertices(
	const Snapshot& snapshot,
	const std::vector<TrajectorySample>& samples,
	const Scenario& scenario,
	const OverlayOptions& overlays);

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays);

}  // namespace visual_physics::computational_physics