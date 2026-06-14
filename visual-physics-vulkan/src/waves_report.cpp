#include "waves_report.hpp"

#include <sstream>

namespace visual_physics::waves {
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
	if (scenario.id == ScenarioId::StandingWave) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active time cursor used for the sampled standing-wave profile."},
			{"frequency_hz", "Frequency", format_number(snapshot.frequency_hertz.value_or(0.0)), "Resonant standing-wave frequency for the selected harmonic."},
			{"wavelength_m", "Wavelength", format_number(snapshot.wavelength_meters.value_or(0.0)), "Spatial period implied by the current string length and harmonic."},
			{"harmonic_number", "Harmonic number", format_number(snapshot.harmonic_number.value_or(0.0)), "Selected standing-wave mode index."},
		};
	}
	if (scenario.id == ScenarioId::TravelingWave) {
		return {
			{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active time cursor used for the propagated waveform sample set."},
			{"frequency_hz", "Frequency", format_number(snapshot.frequency_hertz.value_or(0.0)), "Oscillation frequency derived from wave speed and wavelength."},
			{"wavelength_m", "Wavelength", format_number(snapshot.wavelength_meters.value_or(0.0)), "Distance between repeated points on the propagated waveform."},
			{"wave_speed_m_per_s", "Wave speed", format_number(snapshot.wave_speed_meters_per_second.value_or(0.0)), "Propagation speed in the active one-dimensional medium."},
		};
	}
	return {
		{"snapshot_time_s", "Snapshot time", format_number(snapshot.time_seconds), "Active time cursor used for the moving source-observer Doppler slice."},
		{"emitted_frequency_hz", "Emitted frequency", format_number(snapshot.emitted_frequency_hertz.value_or(0.0)), "Source frequency before relative-motion shift is applied."},
		{"apparent_frequency_hz", "Apparent frequency", format_number(snapshot.apparent_frequency_hertz.value_or(0.0)), "Observed frequency after Doppler compression or dilation."},
		{"source_speed_m_per_s", "Source speed", format_number(snapshot.source_speed_meters_per_second.value_or(0.0)), "Signed source speed relative to the acoustic medium."},
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

}  // namespace visual_physics::waves