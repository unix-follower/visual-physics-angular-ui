#include "fluid_mechanics_report.hpp"

#include <iomanip>
#include <sstream>

namespace visual_physics::fluid_mechanics {

std::string build_report_csv(const Scenario& scenario, const std::vector<Sample>& samples) {
	std::ostringstream output;
	output << "scenario_id," << to_string(scenario.id) << '\n';
	output << "gravity," << scenario.gravity << '\n';
	output << "fluid_density_kg_m3," << scenario.fluid_density << '\n';
	if (scenario.id == ScenarioId::PoiseuillePipe) {
		output << "pipe_radius_m," << scenario.pipe_radius.value_or(0.0) << '\n';
		output << "pipe_length_m," << scenario.pipe_length.value_or(0.0) << '\n';
		output << "pressure_drop_pa," << scenario.pressure_drop.value_or(0.0) << '\n';
		output << "dynamic_viscosity_pa_s," << scenario.dynamic_viscosity.value_or(0.0) << '\n';
		output << "time_seconds,axial_position_m,pressure_pa,average_velocity_m_s,reynolds_number,stable\n";
	} else if (scenario.id == ScenarioId::OpenChannelFlow) {
		output << "channel_width_m," << scenario.channel_width.value_or(0.0) << '\n';
		output << "channel_depth_m," << scenario.channel_depth.value_or(0.0) << '\n';
		output << "channel_slope," << scenario.channel_slope.value_or(0.0) << '\n';
		output << "roughness_coefficient," << scenario.roughness_coefficient.value_or(0.0) << '\n';
		output << "channel_length_m," << scenario.channel_length.value_or(0.0) << '\n';
		output << "time_seconds,axial_position_m,bed_elevation_m,water_surface_elevation_m,average_velocity_m_s,froude_number,stable\n";
	} else {
		output << "block_density_kg_m3," << scenario.block_density << '\n';
		output << "time_seconds,submersion_depth_m,displaced_volume_m3,buoyant_force_n,weight_force_n,net_force_n,immersion_ratio,stable\n";
	}
	output << std::fixed << std::setprecision(6);
	for (const auto& sample : samples) {
		if (scenario.id == ScenarioId::PoiseuillePipe) {
			output << sample.time_seconds << ','
			       << sample.axial_position.value_or(0.0) << ','
			       << sample.pressure.value_or(0.0) << ','
			       << sample.average_velocity.value_or(0.0) << ','
			       << sample.reynolds_number.value_or(0.0) << ','
			       << (sample.stable ? "true" : "false") << '\n';
		} else if (scenario.id == ScenarioId::OpenChannelFlow) {
			output << sample.time_seconds << ','
			       << sample.axial_position.value_or(0.0) << ','
			       << sample.bed_elevation.value_or(0.0) << ','
			       << sample.water_surface_elevation.value_or(0.0) << ','
			       << sample.average_velocity.value_or(0.0) << ','
			       << sample.froude_number.value_or(0.0) << ','
			       << (sample.stable ? "true" : "false") << '\n';
		} else {
			output << sample.time_seconds << ','
			       << sample.submersion_depth << ','
			       << sample.displaced_volume << ','
			       << sample.buoyant_force << ','
			       << sample.weight_force << ','
			       << sample.net_force << ','
			       << sample.immersion_ratio << ','
			       << (sample.stable ? "true" : "false") << '\n';
		}
	}
	return output.str();
}

}  // namespace visual_physics::fluid_mechanics