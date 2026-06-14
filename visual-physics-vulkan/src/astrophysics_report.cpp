#include "astrophysics_report.hpp"

#include <sstream>

namespace visual_physics::astrophysics {
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
	const ReportSummaryRow snapshot_time_row{
		"snapshot_time_s",
		"Snapshot time",
		format_number(snapshot.time_seconds),
		"Active snapshot time used for the sampled scenario state.",
	};
	if (scenario.id == ScenarioId::StellarLuminosity) {
		return {
			snapshot_time_row,
			{"luminosity_solar_units", "Luminosity", format_number(snapshot.luminosity_solar_units.value_or(0.0)), "Total stellar luminosity relative to the Sun."},
			{"inner_habitable_zone_au", "Inner habitable edge", format_number(snapshot.habitable_zone_inner_astronomical_units.value_or(0.0)), "Conservative inner edge for Earth-like irradiance assumptions."},
			{"outer_habitable_zone_au", "Outer habitable edge", format_number(snapshot.habitable_zone_outer_astronomical_units.value_or(0.0)), "Approximate outer edge for retained surface heating."},
		};
	}
	if (scenario.id == ScenarioId::HubbleExpansion) {
		return {
			snapshot_time_row,
			{"distance_mpc", "Distance", format_number(snapshot.distance_megaparsecs.value_or(0.0)), "Proper distance used in the Hubble-law estimate."},
			{"recession_velocity_km_s", "Recession velocity", format_number(snapshot.recession_velocity_kilometers_per_second.value_or(0.0)), "Approximate recession speed from the active Hubble constant."},
			{"redshift", "Approximate redshift", format_number(snapshot.redshift.value_or(0.0)), "Low-redshift approximation z ~= v/c for the active distance."},
		};
	}
	return {
		{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Current orbit snapshot time within the sampled trajectory cycle."},
		{"orbital_period_days", "Orbital period", format_number(snapshot.orbital_period_days.value_or(0.0)), "Time required to complete one full orbit around the selected star."},
		{"orbital_speed_km_s", "Orbital speed", format_number(snapshot.orbital_speed_kilometers_per_second.value_or(0.0)), "Circular-orbit speed implied by the selected central mass and orbital radius."},
		{"escape_speed_km_s", "Escape speed", format_number(snapshot.escape_speed_kilometers_per_second.value_or(0.0)), "Escape speed at the same orbital radius for comparison with the bound orbit speed."},
		{"specific_orbital_energy_mj_kg", "Specific orbital energy", format_number(snapshot.specific_orbital_energy_megajoules_per_kilogram.value_or(0.0)), "Specific binding energy for the selected orbit."},
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

}  // namespace visual_physics::astrophysics