#include "plasma_physics_report.hpp"

#include <algorithm>
#include <limits>
#include <optional>
#include <sstream>

namespace visual_physics::plasma_physics {
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
	if (scenario.id == ScenarioId::DebyeScreening) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active screening cursor within the probe-shielding sweep."},
			{"debye_length_mm", "Debye length", format_number(snapshot.debye_length_millimeters.value_or(0.0)), "Characteristic shielding length for the active plasma state."},
			{"shielding_fraction", "Shielding fraction", format_number(snapshot.shielding_fraction.value_or(0.0)), "Fraction of the probe potential shielded at the active radius."},
		};
	}

	if (scenario.id == ScenarioId::MagneticConfinement) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active confinement cursor within the simplified toroidal slice."},
			{"larmor_radius_mm", "Larmor radius", format_number(snapshot.larmor_radius_millimeters.value_or(0.0)), "Gyroradius estimate for the active confinement state."},
			{"safety_factor", "Safety factor", format_number(snapshot.safety_factor.value_or(0.0)), "Simple confinement-quality cue for the active plasma column."},
		};
	}

	return {
		{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active collective-oscillation cursor in the shared plasma sweep."},
		{"plasma_frequency_ghz", "Plasma frequency", format_number(snapshot.plasma_frequency_gigahertz.value_or(0.0)), "Collective oscillation frequency for the active electron density."},
		{"restoring_field_kv_m", "Restoring field", format_number(snapshot.restoring_field_kilovolts_per_meter.value_or(0.0)), "Effective restoring field strength for the active perturbation."},
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

}  // namespace visual_physics::plasma_physics