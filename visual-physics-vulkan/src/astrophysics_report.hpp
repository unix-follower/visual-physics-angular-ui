#pragma once

#include <string>
#include <vector>

#include "astrophysics_core.hpp"

namespace visual_physics::astrophysics {

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

}  // namespace visual_physics::astrophysics