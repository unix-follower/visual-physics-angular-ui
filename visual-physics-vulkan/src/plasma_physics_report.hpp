#pragma once

#include <string>
#include <vector>

#include "plasma_physics_core.hpp"

namespace visual_physics::plasma_physics {

struct ReportSummaryRow {
	std::string metric;
	std::string label;
	std::string value;
	std::string detail;
};

std::vector<ReportSummaryRow> build_report_summary_rows(
	const Scenario& scenario,
	const Snapshot& snapshot);
std::string build_report_csv(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const std::vector<Sample>& samples);

}  // namespace visual_physics::plasma_physics