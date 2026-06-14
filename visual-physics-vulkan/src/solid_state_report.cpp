#include "solid_state_report.hpp"

#include <algorithm>
#include <limits>
#include <sstream>

namespace visual_physics::solid_state {
namespace {

std::string escape_csv(const std::string& value) {
	std::string escaped = value;
	std::size_t position = 0;
	while ((position = escaped.find('"', position)) != std::string::npos) {
		escaped.insert(position, 1, '"');
		position += 2;
	}
	return '"' + escaped + '"';
}

std::string format_number(double value) {
	std::ostringstream stream;
	stream.setf(std::ios::fixed);
	stream.precision(6);
	stream << value;
	return stream.str();
}

}  // namespace

std::vector<ReportSummaryRow> build_report_summary_rows(
	const Scenario& scenario,
	const Snapshot& snapshot) {
	if (scenario.id == ScenarioId::PhononDispersion) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active reduced wave-vector position for the inspected dispersion branch."},
			{"acoustic_frequency_thz", "Acoustic frequency", format_number(snapshot.acoustic_frequency_terahertz.value_or(0.0)), "Acoustic branch frequency at the active reduced wave vector."},
			{"group_velocity_km_s", "Group velocity", format_number(snapshot.group_velocity_kilometers_per_second.value_or(0.0)), "Transport-speed proxy for the active phonon state."},
		};
	}

	if (scenario.id == ScenarioId::ElectronicStructure) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active energy cursor position within the inspected electronic slice."},
			{"density_of_states", "Density of states", format_number(snapshot.density_of_states_arbitrary_units.value_or(0.0)), "Density-of-states buildup at the active energy cursor."},
			{"occupation_probability", "Occupation probability", format_number(snapshot.occupation_probability.value_or(0.0)), "Fermi-style occupation estimate for the active energy cursor."},
		};
	}

	const auto yield_margin =
		scenario.yield_strength_megapascals.value_or(0.0) - snapshot.stress_megapascals.value_or(0.0);
	return {
		{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active inspected strain position for the crystal slice."},
		{"stress_mpa", "Stress", format_number(snapshot.stress_megapascals.value_or(0.0)), "Stress response at the active strain point."},
		{"yield_margin_mpa", "Yield margin", format_number(yield_margin), "Distance between the active stress state and the configured yield threshold."},
	};
}

std::string build_report_csv(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const std::vector<Sample>& samples) {
	std::ostringstream stream;
	stream << "category,metric,label,value,detail\n";
	for (const auto& row : build_report_summary_rows(scenario, snapshot)) {
		stream << escape_csv("summary") << ','
		       << escape_csv(row.metric) << ','
		       << escape_csv(row.label) << ','
		       << escape_csv(row.value) << ','
		       << escape_csv(row.detail) << '\n';
	}

	stream << "\nsampleLabel,position,primaryValue,secondaryValue,active\n";
	double min_primary = std::numeric_limits<double>::infinity();
	double max_primary = -std::numeric_limits<double>::infinity();
	double min_secondary = std::numeric_limits<double>::infinity();
	double max_secondary = -std::numeric_limits<double>::infinity();
	std::optional<double> active_position;
	bool has_secondary = false;

	for (const auto& sample : samples) {
		stream << escape_csv(sample.label) << ','
		       << sample.position << ','
		       << sample.primary_value << ',';
		if (sample.secondary_value.has_value()) {
			stream << *sample.secondary_value;
			has_secondary = true;
			min_secondary = std::min(min_secondary, *sample.secondary_value);
			max_secondary = std::max(max_secondary, *sample.secondary_value);
		}
		stream << ',' << (sample.active ? "true" : "false") << '\n';

		min_primary = std::min(min_primary, sample.primary_value);
		max_primary = std::max(max_primary, sample.primary_value);
		if (sample.active) {
			active_position = sample.position;
		}
	}

	stream << "\nreportCategory,metric,value\n";
	stream << escape_csv("report_stats") << ',' << escape_csv("sample_count") << ','
	       << escape_csv(std::to_string(samples.size())) << '\n';
	stream << escape_csv("report_stats") << ',' << escape_csv("active_position") << ','
	       << escape_csv(active_position.has_value() ? format_number(*active_position) : std::string("n/a")) << '\n';
	stream << escape_csv("report_stats") << ',' << escape_csv("primary_value_range") << ','
	       << escape_csv(format_number(min_primary) + " to " + format_number(max_primary)) << '\n';
	if (has_secondary) {
		stream << escape_csv("report_stats") << ',' << escape_csv("secondary_value_range") << ','
		       << escape_csv(format_number(min_secondary) + " to " + format_number(max_secondary)) << '\n';
	}
	return stream.str();
}

}  // namespace visual_physics::solid_state