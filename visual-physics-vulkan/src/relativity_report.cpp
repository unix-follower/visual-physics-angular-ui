#include "relativity_report.hpp"

#include <sstream>

namespace visual_physics::relativity {
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
	if (scenario.id == ScenarioId::GravitationalTimeDilation) {
		return {
			{"snapshot_time_s", "Coordinate time", format_number(snapshot.time_seconds), "Far-field elapsed time used as the comparison interval."},
			{"gravitational_factor", "Gravitational factor", format_number(snapshot.gravitational_time_factor.value_or(0.0)), "Clock-rate suppression relative to a far-field observer."},
			{"local_elapsed_time_s", "Local elapsed time", format_number(snapshot.local_elapsed_time_seconds.value_or(0.0)), "Elapsed proper time for a clock at the selected radius."},
			{"orbital_radius_rs", "Active radius", format_number(snapshot.orbital_radius_schwarzschild_radii.value_or(0.0)), "Selected orbital radius expressed in Schwarzschild-radius units."},
			{"schwarzschild_radius_km", "Schwarzschild radius", format_number(snapshot.schwarzschild_radius_kilometers.value_or(0.0)), "Characteristic radius for the chosen central mass."},
		};
	}
	if (scenario.id == ScenarioId::RelativisticDoppler) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Static analytic Doppler slice uses zero dynamic time."},
			{"relative_velocity_fraction_c", "Relative velocity", format_number(snapshot.relative_velocity_fraction_of_light.value_or(0.0)), "Effective source-observer velocity after relativistic composition."},
			{"observed_frequency_hz", "Observed frequency", format_number(snapshot.observed_frequency_hertz.value_or(0.0)), "Relativistic longitudinal Doppler prediction for the active geometry."},
			{"classical_frequency_hz", "Classical comparison", format_number(snapshot.classical_observed_frequency_hertz.value_or(0.0)), "Classical comparison frequency for the same relative speed."},
			{"shift_ratio", "Shift ratio", format_number(snapshot.shift_ratio.value_or(0.0)), "Observed-to-emitted frequency ratio for the active relativistic motion state."},
		};
	}
	return {
		{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Proper-time interval used for the active time-dilation slice."},
		{"lorentz_factor_gamma", "Lorentz factor", format_number(snapshot.lorentz_factor_gamma.value_or(0.0)), "Relativistic scaling factor linking proper and coordinate time."},
		{"dilated_time_s", "Coordinate time", format_number(snapshot.dilated_time_seconds.value_or(0.0)), "Observer-frame elapsed time for the active relative velocity."},
		{"time_gap_s", "Time gap", format_number(snapshot.time_difference_seconds.value_or(0.0)), "Difference between coordinate and proper time for the moving clock."},
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
	for (const auto& sample : samples) {
		stream << escape_csv(sample.label) << ','
		       << sample.position << ','
		       << sample.primary_value << ',';
		if (sample.secondary_value.has_value()) {
			stream << *sample.secondary_value;
		}
		stream << ',' << (sample.active ? "true" : "false") << '\n';
	}
	return stream.str();
}

}  // namespace visual_physics::relativity
