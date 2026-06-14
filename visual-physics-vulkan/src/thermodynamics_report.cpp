#include "thermodynamics_report.hpp"

#include <iomanip>
#include <sstream>

namespace visual_physics::thermodynamics {

std::string build_report_csv(const Scenario& scenario, const std::vector<Sample>& samples) {
	std::ostringstream output;
	output << "scenario_id," << to_string(scenario.id) << '\n';
	if (scenario.id == ScenarioId::CarnotCycle) {
		output << "molar_amount_mol," << scenario.molar_amount << '\n';
		output << "hot_reservoir_temperature_kelvin," << scenario.hot_reservoir_temperature_kelvin.value_or(0.0) << '\n';
		output << "cold_reservoir_temperature_kelvin," << scenario.cold_reservoir_temperature_kelvin.value_or(0.0) << '\n';
		output << "cycle_min_volume_m3," << scenario.cycle_min_volume_cubic_meters.value_or(0.0) << '\n';
		output << "cycle_volume_ratio," << scenario.cycle_volume_ratio.value_or(0.0) << '\n';
		output << "time_seconds,stage_label,volume_m3,pressure_pa,internal_energy_joules,entropy_transfer_kj_per_k,stable\n";
	} else if (scenario.id == ScenarioId::HeatConductionSlab) {
		output << "slab_thickness_m," << scenario.slab_thickness_meters.value_or(0.0) << '\n';
		output << "thermal_conductivity_w_m_k," << scenario.thermal_conductivity_w_per_mk.value_or(0.0) << '\n';
		output << "thermal_diffusivity_m2_s," << scenario.thermal_diffusivity_m2_per_s.value_or(0.0) << '\n';
		output << "initial_temperature_c," << scenario.initial_temperature_celsius.value_or(0.0) << '\n';
		output << "boundary_temperature_c," << scenario.boundary_temperature_celsius.value_or(0.0) << '\n';
		output << "time_seconds,position_m,temperature_c,heat_flux_w_m2,normalized_temperature,stable\n";
	} else {
		output << "gas_constant_j_mol_k," << scenario.gas_constant << '\n';
		output << "molar_amount_mol," << scenario.molar_amount << '\n';
		output << "temperature_kelvin," << scenario.temperature_kelvin << '\n';
		output << "reference_volume_m3," << scenario.volume_cubic_meters << '\n';
		output << "molar_mass_kg_per_mol," << scenario.molar_mass_kg_per_mol << '\n';
		output << "degrees_of_freedom," << scenario.degrees_of_freedom << '\n';
		output << "time_seconds,volume_m3,pressure_pa,temperature_kelvin,internal_energy_joules,stable\n";
	}
	output << std::fixed << std::setprecision(6);
	for (const auto& sample : samples) {
		if (scenario.id == ScenarioId::CarnotCycle) {
			output << sample.time_seconds << ','
			       << '"' << sample.stage_label.value_or(std::string{}) << '"' << ','
			       << sample.volume_cubic_meters << ','
			       << sample.pressure_pascals << ','
			       << sample.internal_energy_joules << ','
			       << sample.entropy_transfer_kj_per_k.value_or(0.0) << ','
			       << (sample.stable ? "true" : "false") << '\n';
		} else if (scenario.id == ScenarioId::HeatConductionSlab) {
			output << sample.time_seconds << ','
			       << sample.position_meters.value_or(0.0) << ','
			       << sample.temperature_celsius.value_or(0.0) << ','
			       << sample.heat_flux_w_per_m2.value_or(0.0) << ','
			       << sample.normalized_temperature.value_or(0.0) << ','
			       << (sample.stable ? "true" : "false") << '\n';
		} else {
			output << sample.time_seconds << ','
			       << sample.volume_cubic_meters << ','
			       << sample.pressure_pascals << ','
			       << sample.temperature_kelvin << ','
			       << sample.internal_energy_joules << ','
			       << (sample.stable ? "true" : "false") << '\n';
		}
	}
	return output.str();
}

}  // namespace visual_physics::thermodynamics