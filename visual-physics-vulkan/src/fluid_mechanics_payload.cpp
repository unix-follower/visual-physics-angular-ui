#include "fluid_mechanics_payload.hpp"

#include <stdexcept>
#include <string>

#include <nlohmann/json.hpp>

namespace visual_physics::fluid_mechanics {
namespace {

using Json = nlohmann::json;

void require_number_field(const Json& object, std::string_view field_name) {
	if (!object.contains(field_name) || !object.at(field_name).is_number()) {
		throw std::runtime_error("Invalid or missing numeric field: " + std::string(field_name));
	}
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
		throw std::runtime_error("Invalid scenario object");
	}
	require_string_field(value, "id");
	const auto scenario_id_text = value.at("id").get<std::string>();
	const auto parsed_id = parse_scenario_id(scenario_id_text);
	if (!parsed_id.has_value()) {
		throw std::runtime_error("Unknown scenario id: " + scenario_id_text);
	}
	require_string_field(value, "name");
	require_string_field(value, "summary");
	require_string_field(value, "equationSummary");
	require_string_field(value, "status");
	require_string_field(value, "focusArea");
	require_number_field(value, "durationSeconds");
	require_number_field(value, "fluidDensity");

	Scenario scenario = make_default_scenario(*parsed_id);
	scenario.name = value.at("name").get<std::string>();
	scenario.summary = value.at("summary").get<std::string>();
	scenario.equation_summary = value.at("equationSummary").get<std::string>();
	scenario.status = value.at("status").get<std::string>();
	scenario.duration_seconds = value.at("durationSeconds").get<double>();
	scenario.view_bounds = parse_view_bounds(value.at("viewBounds"));
	scenario.focus_area = value.at("focusArea").get<std::string>();
	if (value.contains("gravity") && value.at("gravity").is_number()) {
		scenario.gravity = value.at("gravity").get<double>();
	}
	scenario.fluid_density = value.at("fluidDensity").get<double>();
	if (*parsed_id == ScenarioId::PoiseuillePipe) {
		require_number_field(value, "pipeRadius");
		require_number_field(value, "pipeLength");
		require_number_field(value, "pressureDrop");
		require_number_field(value, "dynamicViscosity");
		scenario.pipe_radius = value.at("pipeRadius").get<double>();
		scenario.pipe_length = value.at("pipeLength").get<double>();
		scenario.pressure_drop = value.at("pressureDrop").get<double>();
		scenario.dynamic_viscosity = value.at("dynamicViscosity").get<double>();
	} else if (*parsed_id == ScenarioId::OpenChannelFlow) {
		require_number_field(value, "channelWidth");
		require_number_field(value, "channelDepth");
		require_number_field(value, "channelSlope");
		require_number_field(value, "roughnessCoefficient");
		require_number_field(value, "channelLength");
		scenario.channel_width = value.at("channelWidth").get<double>();
		scenario.channel_depth = value.at("channelDepth").get<double>();
		scenario.channel_slope = value.at("channelSlope").get<double>();
		scenario.roughness_coefficient = value.at("roughnessCoefficient").get<double>();
		scenario.channel_length = value.at("channelLength").get<double>();
	} else {
		require_number_field(value, "blockDensity");
		require_number_field(value, "blockWidth");
		require_number_field(value, "blockHeight");
		require_number_field(value, "blockDepth");
		scenario.block_density = value.at("blockDensity").get<double>();
		scenario.block_width = value.at("blockWidth").get<double>();
		scenario.block_height = value.at("blockHeight").get<double>();
		scenario.block_depth = value.at("blockDepth").get<double>();
	}
	return scenario;
}

OverlayOptions parse_overlay_options(const Json& value) {
	if (!value.is_object()) {
		throw std::runtime_error("Invalid overlays object");
	}
	require_boolean_field(value, "showForceGuides");
	require_boolean_field(value, "showWaterline");
	require_boolean_field(value, "showEquilibriumGuide");
	return {
		value.at("showForceGuides").get<bool>(),
		value.at("showWaterline").get<bool>(),
		value.at("showEquilibriumGuide").get<bool>(),
	};
}

}  // namespace

ImportedScenarioState parse_import_payload(std::string_view source) {
	const Json payload = Json::parse(source);
	if (!payload.is_object()) {
		throw std::runtime_error("Invalid payload root");
	}
	if (!payload.contains("scenario") || !payload.at("scenario").is_object()) {
		throw std::runtime_error("Invalid or missing scenario payload");
	}
	if (!payload.contains("snapshot") || !payload.at("snapshot").is_object()) {
		throw std::runtime_error("Invalid or missing snapshot payload");
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
		{"fluidDensity", scenario.fluid_density},
	};
	if (scenario.id == ScenarioId::PoiseuillePipe) {
		scenario_json["pipeRadius"] = scenario.pipe_radius.value_or(0.0);
		scenario_json["pipeLength"] = scenario.pipe_length.value_or(0.0);
		scenario_json["pressureDrop"] = scenario.pressure_drop.value_or(0.0);
		scenario_json["dynamicViscosity"] = scenario.dynamic_viscosity.value_or(0.0);
	} else if (scenario.id == ScenarioId::OpenChannelFlow) {
		scenario_json["gravity"] = scenario.gravity;
		scenario_json["channelWidth"] = scenario.channel_width.value_or(0.0);
		scenario_json["channelDepth"] = scenario.channel_depth.value_or(0.0);
		scenario_json["channelSlope"] = scenario.channel_slope.value_or(0.0);
		scenario_json["roughnessCoefficient"] = scenario.roughness_coefficient.value_or(0.0);
		scenario_json["channelLength"] = scenario.channel_length.value_or(0.0);
	} else {
		scenario_json["gravity"] = scenario.gravity;
		scenario_json["blockDensity"] = scenario.block_density;
		scenario_json["blockWidth"] = scenario.block_width;
		scenario_json["blockHeight"] = scenario.block_height;
		scenario_json["blockDepth"] = scenario.block_depth;
	}

	Json snapshot_json{{"timeSeconds", snapshot.time_seconds}, {"stable", snapshot.stable}};
	if (scenario.id == ScenarioId::PoiseuillePipe) {
		snapshot_json["volumetricFlowRate"] = snapshot.volumetric_flow_rate.value_or(0.0);
		snapshot_json["averageVelocity"] = snapshot.average_velocity.value_or(0.0);
		snapshot_json["centerlineVelocity"] = snapshot.centerline_velocity.value_or(0.0);
		snapshot_json["reynoldsNumber"] = snapshot.reynolds_number.value_or(0.0);
		snapshot_json["pressureGradient"] = snapshot.pressure_gradient.value_or(0.0);
	} else if (scenario.id == ScenarioId::OpenChannelFlow) {
		snapshot_json["discharge"] = snapshot.discharge.value_or(0.0);
		snapshot_json["hydraulicRadius"] = snapshot.hydraulic_radius.value_or(0.0);
		snapshot_json["averageVelocity"] = snapshot.average_velocity.value_or(0.0);
		snapshot_json["froudeNumber"] = snapshot.froude_number.value_or(0.0);
	} else {
		snapshot_json["equilibriumDepth"] = snapshot.equilibrium_depth;
		snapshot_json["immersionRatio"] = snapshot.immersion_ratio;
		snapshot_json["displacedVolume"] = snapshot.displaced_volume;
		snapshot_json["buoyantForce"] = snapshot.buoyant_force;
		snapshot_json["weightForce"] = snapshot.weight_force;
		snapshot_json["netForce"] = snapshot.net_force;
	}

	Json samples_json = Json::array();
	for (const auto& sample : samples) {
		if (scenario.id == ScenarioId::PoiseuillePipe) {
			samples_json.push_back({
				{"timeSeconds", sample.time_seconds},
				{"axialPosition", sample.axial_position.value_or(0.0)},
				{"pressure", sample.pressure.value_or(0.0)},
				{"averageVelocity", sample.average_velocity.value_or(0.0)},
				{"reynoldsNumber", sample.reynolds_number.value_or(0.0)},
				{"stable", sample.stable},
			});
		} else if (scenario.id == ScenarioId::OpenChannelFlow) {
			samples_json.push_back({
				{"timeSeconds", sample.time_seconds},
				{"axialPosition", sample.axial_position.value_or(0.0)},
				{"bedElevation", sample.bed_elevation.value_or(0.0)},
				{"waterSurfaceElevation", sample.water_surface_elevation.value_or(0.0)},
				{"averageVelocity", sample.average_velocity.value_or(0.0)},
				{"discharge", sample.discharge.value_or(0.0)},
				{"froudeNumber", sample.froude_number.value_or(0.0)},
				{"stable", sample.stable},
			});
		} else {
			samples_json.push_back({
				{"timeSeconds", sample.time_seconds},
				{"submersionDepth", sample.submersion_depth},
				{"displacedVolume", sample.displaced_volume},
				{"buoyantForce", sample.buoyant_force},
				{"weightForce", sample.weight_force},
				{"netForce", sample.net_force},
				{"immersionRatio", sample.immersion_ratio},
				{"stable", sample.stable},
			});
		}
	}

	const Json payload{
		{"exportedAt", exported_at},
		{"scenario", scenario_json},
		{"snapshot", snapshot_json},
		{"overlays",
			{{"showForceGuides", overlays.show_force_guides},
			 {"showWaterline", overlays.show_waterline},
			 {"showEquilibriumGuide", overlays.show_equilibrium_guide}}},
		{"samples", samples_json},
	};

	return payload.dump(2);
}

}  // namespace visual_physics::fluid_mechanics