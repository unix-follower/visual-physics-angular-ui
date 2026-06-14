#pragma once

#include <vector>

#include "optics_core.hpp"
#include "optics_payload.hpp"

namespace visual_physics::optics {

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
	const Scenario& scenario,
	const OverlayOptions& overlays);

std::vector<OverlayVertex> build_overlay_marker_vertices(
	const Snapshot& snapshot,
	const Scenario& scenario,
	float aspect_ratio,
	const OverlayOptions& overlays);

}  // namespace visual_physics::optics