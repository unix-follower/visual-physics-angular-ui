#include "nuclear_and_particle_physics_report.hpp"

#include <algorithm>
#include <limits>
#include <sstream>

namespace visual_physics::nuclear_and_particle_physics {
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
	if (scenario.id == ScenarioId::BindingEnergyCurve) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active structure-scan cursor for the selected nucleus."},
			{"total_binding_energy_mev", "Total binding energy", format_number(snapshot.total_binding_energy_mev.value_or(0.0)), "Total estimated binding energy for the active nucleus."},
			{"stability_index", "Stability index", format_number(snapshot.stability_index.value_or(0.0)), "Simple proton-fraction stability cue for the current slice."},
		};
	}

	if (scenario.id == ScenarioId::ProtonProtonCollision) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active collider-event cursor within the simplified event sweep."},
			{"invariant_mass_gev", "Invariant mass", format_number(snapshot.invariant_mass_gev.value_or(0.0)), "Derived event mass scale for the active scattering geometry."},
			{"transverse_momentum_gev", "Transverse momentum", format_number(snapshot.transverse_momentum_gev.value_or(0.0)), "Transverse event momentum derived from the current angle."},
		};
	}

	return {
		{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active decay cursor within the shared half-life sweep."},
		{"remaining_fraction", "Remaining fraction", format_number(snapshot.remaining_fraction.value_or(0.0)), "Residual isotope fraction after the active elapsed time."},
		{"activity_tbq", "Activity", format_number(snapshot.activity_terabecquerels.value_or(0.0)), "Estimated activity for the active decay sample."},
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

}  // namespace visual_physics::nuclear_and_particle_physics