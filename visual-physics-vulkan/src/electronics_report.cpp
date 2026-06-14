#include "electronics_report.hpp"

#include <iomanip>
#include <sstream>

namespace visual_physics::electronics {

std::string build_transient_csv(const Scenario& scenario, const std::vector<Sample>& samples) {
	std::ostringstream output;
	output << "scenario_id," << to_string(scenario.id) << '\n';
	output << "source_voltage," << scenario.source_voltage << '\n';
	output << "resistance_ohms," << scenario.resistance_ohms << '\n';
	output << "capacitance_farads," << scenario.capacitance_farads << '\n';
	output << "time_seconds,source_voltage,capacitor_voltage,current_amps,charge_coulombs,stored_energy_joules\n";
	output << std::fixed << std::setprecision(6);
	for (const auto& sample : samples) {
		output << sample.time_seconds << ','
		       << sample.source_voltage << ','
		       << sample.capacitor_voltage << ','
		       << sample.current_amps << ','
		       << sample.charge_coulombs << ','
		       << sample.stored_energy_joules << '\n';
	}
	return output.str();
}

}  // namespace visual_physics::electronics