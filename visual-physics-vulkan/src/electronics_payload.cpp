#include "electronics_payload.hpp"

#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::electronics {
namespace {

using Json = nlohmann::json;

void require_number_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_number()) {
		throw std::runtime_error("Invalid or missing numeric field: " + std::string(field_name));
	}
}

double parse_initial_rlc_state(const Json& object, double capacitance_farads) {
	if (object.contains("initialCapacitorVoltage") && object.at("initialCapacitorVoltage").is_number()) {
		return object.at("initialCapacitorVoltage").get<double>();
	}
	if (object.contains("initialCharge") && object.at("initialCharge").is_number()) {
		return object.at("initialCharge").get<double>() / std::max(capacitance_farads, 1e-12);
	}
	throw std::runtime_error(
		"Invalid or missing numeric field: initialCapacitorVoltage or initialCharge");
}

void require_string_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_string()) {
		throw std::runtime_error("Invalid or missing string field: " + std::string(field_name));
	}
}

void require_boolean_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_boolean()) {
		throw std::runtime_error("Invalid or missing boolean field: " + std::string(field_name));
	}
}

ViewBounds parse_view_bounds(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid viewBounds");
	}
	require_number_field(value, "minX");
	require_number_field(value, "maxX");
	require_number_field(value, "minY");
	require_number_field(value, "maxY");
	return {
		value.at("minX").get<double>(),
		value.at("maxX").get<double>(),
		value.at("minY").get<double>(),
		value.at("maxY").get<double>(),
	};
}

Scenario parse_scenario(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid electronics scenario object");
	}
	require_string_field(value, "id");
	const auto scenario_id_text = value.at("id").get<std::string>();
	const auto parsed_id = parse_scenario_id(scenario_id_text);
	if (!parsed_id.has_value()) {
		throw std::runtime_error("Unknown electronics scenario id: " + scenario_id_text);
	}
	require_string_field(value, "name");
	require_string_field(value, "summary");
	require_string_field(value, "equationSummary");
	require_string_field(value, "status");
	require_string_field(value, "focusArea");
	require_number_field(value, "durationSeconds");
	require_number_field(value, "sourceVoltage");

	Scenario scenario = make_default_scenario(*parsed_id);
	scenario.name = value.at("name").get<std::string>();
	scenario.summary = value.at("summary").get<std::string>();
	scenario.equation_summary = value.at("equationSummary").get<std::string>();
	scenario.status = value.at("status").get<std::string>();
	scenario.duration_seconds = value.at("durationSeconds").get<double>();
	scenario.view_bounds = parse_view_bounds(value.at("viewBounds"));
	scenario.focus_area = value.at("focusArea").get<std::string>();
	scenario.source_voltage = value.at("sourceVoltage").get<double>();
	if (*parsed_id == ScenarioId::RcTransient) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "capacitanceFarads");
		require_number_field(value, "initialCapacitorVoltage");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = value.at("capacitanceFarads").get<double>();
		scenario.initial_capacitor_voltage = value.at("initialCapacitorVoltage").get<double>();
		scenario.inductance_henrys = std::nullopt;
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::RcLowPass) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "capacitanceFarads");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = value.at("capacitanceFarads").get<double>();
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = std::nullopt;
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::RcHighPass) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "capacitanceFarads");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = value.at("capacitanceFarads").get<double>();
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = std::nullopt;
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::RlLowPass) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "inductanceHenrys");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = 0.0;
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = value.at("inductanceHenrys").get<double>();
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::RlHighPass) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "inductanceHenrys");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = 0.0;
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = value.at("inductanceHenrys").get<double>();
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::RlcResonance) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "capacitanceFarads");
		require_number_field(value, "inductanceHenrys");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = value.at("capacitanceFarads").get<double>();
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = value.at("inductanceHenrys").get<double>();
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::RlcResponse) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "capacitanceFarads");
		require_number_field(value, "inductanceHenrys");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = value.at("capacitanceFarads").get<double>();
		scenario.initial_capacitor_voltage =
			parse_initial_rlc_state(value, scenario.capacitance_farads);
		scenario.inductance_henrys = value.at("inductanceHenrys").get<double>();
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::HalfWaveRectifier) {
		require_number_field(value, "resistanceOhms");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = std::nullopt;
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::FullWaveRectifier) {
		require_number_field(value, "resistanceOhms");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = std::nullopt;
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::SmoothedRectifier) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "capacitanceFarads");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = value.at("capacitanceFarads").get<double>();
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = std::nullopt;
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else if (*parsed_id == ScenarioId::RlTransient) {
		require_number_field(value, "resistanceOhms");
		require_number_field(value, "inductanceHenrys");
		scenario.resistance_ohms = value.at("resistanceOhms").get<double>();
		scenario.capacitance_farads = 0.0;
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = value.at("inductanceHenrys").get<double>();
		scenario.upper_resistance_ohms = std::nullopt;
		scenario.lower_resistance_ohms = std::nullopt;
	} else {
		require_number_field(value, "upperResistanceOhms");
		require_number_field(value, "lowerResistanceOhms");
		scenario.resistance_ohms = 0.0;
		scenario.capacitance_farads = 0.0;
		scenario.initial_capacitor_voltage = 0.0;
		scenario.inductance_henrys = std::nullopt;
		scenario.upper_resistance_ohms = value.at("upperResistanceOhms").get<double>();
		scenario.lower_resistance_ohms = value.at("lowerResistanceOhms").get<double>();
	}
	return scenario;
}

OverlayOptions parse_overlay_options(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid electronics overlays object");
	}
	require_boolean_field(value, "showSourceVoltage");
	require_boolean_field(value, "showResistorVoltage");
	require_boolean_field(value, "showEnergyCurve");
	return {
		.show_source_voltage = value.at("showSourceVoltage").get<bool>(),
		.show_resistor_voltage = value.at("showResistorVoltage").get<bool>(),
		.show_energy_curve = value.at("showEnergyCurve").get<bool>(),
	};
}

}  // namespace

ImportedScenarioState parse_import_payload(std::string_view source) {
	const Json payload = Json::parse(source);
	if (!payload.is_object()) {
		throw std::runtime_error("Invalid electronics payload root");
	}
	if (!payload.contains("scenario") || !payload.at("scenario").is_object()) {
		throw std::runtime_error("Invalid or missing electronics scenario payload");
	}
	if (!payload.contains("snapshot") || !payload.at("snapshot").is_object()) {
		throw std::runtime_error("Invalid or missing electronics snapshot payload");
	}
	const auto& snapshot = payload.at("snapshot");
	require_number_field(snapshot, "timeSeconds");

	return {
		.scenario = parse_scenario(payload.at("scenario")),
		.time_seconds = snapshot.at("timeSeconds").get<double>(),
		.overlays = payload.contains("overlays") && !payload.at("overlays").is_null()
			? std::optional<OverlayOptions>{parse_overlay_options(payload.at("overlays"))}
			: std::nullopt,
	};
}

std::string serialize_export_payload(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const OverlayOptions& overlays,
	const std::vector<Sample>& samples,
	std::string_view exported_at) {
	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		Json sample_json{
			{"timeSeconds", sample.time_seconds},
			{"sourceVoltage", sample.source_voltage},
			{"capacitorVoltage", sample.capacitor_voltage},
			{"currentAmps", sample.current_amps},
			{"chargeCoulombs", sample.charge_coulombs},
			{"storedEnergyJoules", sample.stored_energy_joules},
		};
		if (sample.output_voltage.has_value()) {
			sample_json["outputVoltage"] = *sample.output_voltage;
		}
		if (sample.flux_linkage_webers.has_value()) {
			sample_json["fluxLinkageWebers"] = *sample.flux_linkage_webers;
		}
		if (sample.branch_current_amps.has_value()) {
			sample_json["branchCurrentAmps"] = *sample.branch_current_amps;
		}
		if (sample.lower_branch_power_watts.has_value()) {
			sample_json["lowerBranchPowerWatts"] = *sample.lower_branch_power_watts;
		}
		samples_json.push_back(std::move(sample_json));
	}
	Json scenario_json{
		{"id", to_string(scenario.id)},
		{"name", scenario.name},
		{"summary", scenario.summary},
		{"equationSummary", scenario.equation_summary},
		{"status", scenario.status},
		{"durationSeconds", scenario.duration_seconds},
		{"viewBounds",
			{{"minX", scenario.view_bounds.min_x},
			 {"maxX", scenario.view_bounds.max_x},
			 {"minY", scenario.view_bounds.min_y},
			 {"maxY", scenario.view_bounds.max_y}}},
		{"focusArea", scenario.focus_area},
		{"sourceVoltage", scenario.source_voltage},
	};
	if (scenario.id == ScenarioId::RcTransient) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["capacitanceFarads"] = scenario.capacitance_farads;
		scenario_json["initialCapacitorVoltage"] = scenario.initial_capacitor_voltage;
	} else if (scenario.id == ScenarioId::RcLowPass) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["capacitanceFarads"] = scenario.capacitance_farads;
	} else if (scenario.id == ScenarioId::RcHighPass) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["capacitanceFarads"] = scenario.capacitance_farads;
	} else if (scenario.id == ScenarioId::RlLowPass) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["inductanceHenrys"] = scenario.inductance_henrys.value_or(0.0);
	} else if (scenario.id == ScenarioId::RlHighPass) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["inductanceHenrys"] = scenario.inductance_henrys.value_or(0.0);
	} else if (scenario.id == ScenarioId::RlcResonance) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["capacitanceFarads"] = scenario.capacitance_farads;
		scenario_json["inductanceHenrys"] = scenario.inductance_henrys.value_or(0.0);
	} else if (scenario.id == ScenarioId::RlcResponse) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["capacitanceFarads"] = scenario.capacitance_farads;
		scenario_json["inductanceHenrys"] = scenario.inductance_henrys.value_or(0.0);
		scenario_json["initialCapacitorVoltage"] = scenario.initial_capacitor_voltage;
	} else if (scenario.id == ScenarioId::HalfWaveRectifier) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
	} else if (scenario.id == ScenarioId::FullWaveRectifier) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
	} else if (scenario.id == ScenarioId::SmoothedRectifier) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["capacitanceFarads"] = scenario.capacitance_farads;
	} else if (scenario.id == ScenarioId::RlTransient) {
		scenario_json["resistanceOhms"] = scenario.resistance_ohms;
		scenario_json["inductanceHenrys"] = scenario.inductance_henrys.value_or(0.0);
	} else {
		scenario_json["upperResistanceOhms"] = scenario.upper_resistance_ohms.value_or(0.0);
		scenario_json["lowerResistanceOhms"] = scenario.lower_resistance_ohms.value_or(0.0);
	}

	Json snapshot_json{
		{"timeSeconds", snapshot.time_seconds},
		{"sourceVoltage", snapshot.source_voltage},
		{"resistorVoltage", snapshot.resistor_voltage},
		{"capacitorVoltage", snapshot.capacitor_voltage},
		{"currentAmps", snapshot.current_amps},
		{"chargeCoulombs", snapshot.charge_coulombs},
		{"storedEnergyJoules", snapshot.stored_energy_joules},
		{"timeConstantSeconds", snapshot.time_constant_seconds},
	};
	if (snapshot.output_voltage.has_value()) {
		snapshot_json["outputVoltage"] = *snapshot.output_voltage;
	}
	if (snapshot.flux_linkage_webers.has_value()) {
		snapshot_json["fluxLinkageWebers"] = *snapshot.flux_linkage_webers;
	}
	if (snapshot.branch_current_amps.has_value()) {
		snapshot_json["branchCurrentAmps"] = *snapshot.branch_current_amps;
	}
	if (snapshot.equivalent_resistance_ohms.has_value()) {
		snapshot_json["equivalentResistanceOhms"] = *snapshot.equivalent_resistance_ohms;
	}
	if (snapshot.lower_branch_power_watts.has_value()) {
		snapshot_json["lowerBranchPowerWatts"] = *snapshot.lower_branch_power_watts;
	}

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{{"showSourceVoltage", overlays.show_source_voltage},
			 {"showResistorVoltage", overlays.show_resistor_voltage},
			 {"showEnergyCurve", overlays.show_energy_curve}}},
		{"samples", samples_json},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::electronics