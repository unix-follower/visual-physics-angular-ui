#include "quantum_report.hpp"

#include <sstream>

namespace visual_physics::quantum {
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
	if (scenario.id == ScenarioId::ParticleInBox) {
		return {
			{"energy_level", "Energy level", format_number(snapshot.energy_level_ev.value_or(0.0)), "Bound-state energy for the chosen stationary mode."},
			{"node_count", "Node count", format_number(snapshot.node_count.value_or(0.0)), "Number of interior probability nodes."},
			{"well_length_nm", "Well length", format_number(snapshot.box_length_nanometers.value_or(0.0)), "Rigid-wall separation used for the 1D box."},
		};
	}
	if (scenario.id == ScenarioId::FinitePotentialWellTunneling) {
		return {
			{"transmission_probability", "Transmission probability", format_number(snapshot.transmission_probability.value_or(0.0)), "Approximate tunneling probability through the rectangular barrier."},
			{"reflection_probability", "Reflection probability", format_number(snapshot.reflection_probability.value_or(0.0)), "Complementary reflected probability."},
			{"barrier_height_ev", "Barrier height", format_number(snapshot.barrier_height_ev.value_or(0.0)), "Barrier height above the reference zero level."},
		};
	}
	return {
		{"fringe_spacing_mm", "Fringe spacing", format_number(snapshot.fringe_spacing_millimeters.value_or(0.0)), "Screen separation between neighboring bright fringes."},
		{"central_maximum_width_mm", "Central maximum width", format_number(snapshot.central_maximum_width_millimeters.value_or(0.0)), "Envelope-limited width of the brightest central interference lobe."},
		{"screen_distance_m", "Screen distance", format_number(snapshot.screen_distance_meters.value_or(0.0)), "Source-to-screen propagation distance."},
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

}  // namespace visual_physics::quantum