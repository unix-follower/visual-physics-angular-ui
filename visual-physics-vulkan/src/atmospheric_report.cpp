#include "atmospheric_report.hpp"

#include <sstream>

namespace visual_physics::atmospheric {
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
	if (scenario.id == ScenarioId::AdiabaticLapseRate) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active inspected altitude position for the lapse-rate profile."},
			{"temperature_k", "Temperature", format_number(snapshot.temperature_kelvin.value_or(0.0)), "Dry-adiabatic profile temperature at the active altitude."},
			{"reference_temperature_k", "Reference temperature", format_number(snapshot.reference_temperature_kelvin.value_or(0.0)), "Comparison environmental profile at the active altitude."},
		};
	}

	if (scenario.id == ScenarioId::ConvectionColumn) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active parcel time within the convective ascent cycle."},
			{"parcel_altitude_km", "Parcel altitude", format_number(snapshot.parcel_altitude_kilometers.value_or(0.0)), "Current parcel altitude in the convective column."},
			{"updraft_velocity_m_s", "Updraft velocity", format_number(snapshot.updraft_velocity_meters_per_second.value_or(0.0)), "Current updraft speed for the active parcel."},
		};
	}

	return {
		{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active inspected altitude for the pressure profile."},
		{"pressure_kpa", "Pressure", format_number(snapshot.pressure_kilopascals.value_or(0.0)), "Atmospheric pressure at the active altitude."},
		{"relative_density", "Relative density", format_number(snapshot.relative_density.value_or(0.0)), "Density ratio relative to sea-level conditions."},
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

}  // namespace visual_physics::atmospheric