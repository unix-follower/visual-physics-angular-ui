#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <string>

#include <gtest/gtest.h>
#include <nlohmann/json.hpp>

#include "atmospheric_core.hpp"
#include "atmospheric_payload.hpp"
#include "atmospheric_report.hpp"
#include "astrophysics_core.hpp"
#include "astrophysics_payload.hpp"
#include "astrophysics_report.hpp"
#include "dynamics_core.hpp"
#include "dynamics_payload.hpp"
#include "nuclear_and_particle_physics_core.hpp"
#include "nuclear_and_particle_physics_payload.hpp"
#include "nuclear_and_particle_physics_report.hpp"
#include "computational_physics_core.hpp"
#include "computational_physics_payload.hpp"
#include "computational_physics_report.hpp"
#include "fluid_mechanics_core.hpp"
#include "optics_core.hpp"
#include "plasma_physics_core.hpp"
#include "plasma_physics_payload.hpp"
#include "plasma_physics_report.hpp"
#include "quantum_core.hpp"
#include "quantum_payload.hpp"
#include "quantum_report.hpp"
#include "relativity_core.hpp"
#include "relativity_payload.hpp"
#include "relativity_report.hpp"
#include "solid_state_core.hpp"
#include "solid_state_payload.hpp"
#include "solid_state_report.hpp"
#include "waves_core.hpp"
#include "waves_payload.hpp"
#include "waves_report.hpp"
#include "thermodynamics_core.hpp"
#include "electronics_core.hpp"
#include "electronics_payload.hpp"
#include "electromagnetism_core.hpp"
#include "electromagnetism_overlay.hpp"
#include "electromagnetism_payload.hpp"
#include "kinematics_core.hpp"
#include "kinematics_payload.hpp"
#include "statics_core.hpp"
#include "statics_overlay.hpp"
#include "statics_payload.hpp"

using visual_physics::kinematics::ScenarioId;
using visual_physics::kinematics::build_samples;
using visual_physics::kinematics::build_axes_vertices;
using visual_physics::kinematics::build_trajectory_vertices;
using visual_physics::kinematics::make_default_scenario;
using visual_physics::kinematics::parse_import_payload;
using visual_physics::kinematics::parse_scenario_id;
using visual_physics::kinematics::sample_scenario;
using visual_physics::kinematics::serialize_export_payload;
using visual_physics::kinematics::to_string;

namespace {

constexpr double kPi = 3.14159265358979323846;

std::filesystem::path executable_path() {
	return std::filesystem::path(VISUAL_PHYSICS_VULKAN_TEST_EXE);
}

std::string shell_quote(const std::filesystem::path& path) {
	return std::string("\"") + path.string() + "\"";
}

std::filesystem::path unique_temp_path(const std::string& suffix) {
	return std::filesystem::temp_directory_path() /
		std::filesystem::path("visual_physics_vulkan_" + std::to_string(std::rand()) + suffix);
}

std::string read_text_file(const std::filesystem::path& path) {
	std::ifstream input(path);
	return std::string(std::istreambuf_iterator<char>(input), std::istreambuf_iterator<char>());
}

void write_text_file(const std::filesystem::path& path, const std::string& content) {
	std::ofstream output(path);
	output << content;
}

int run_command(const std::string& command) {
	return std::system(command.c_str());
}

void expect_vector_eq(
	const visual_physics::kinematics::Vector2& actual,
	const visual_physics::kinematics::Vector2& expected) {
	EXPECT_NEAR(actual.x, expected.x, 1e-9);
	EXPECT_NEAR(actual.y, expected.y, 1e-9);
}

void expect_scenario_eq(
	const visual_physics::kinematics::Scenario& actual,
	const visual_physics::kinematics::Scenario& expected) {
	EXPECT_EQ(actual.id, expected.id);
	EXPECT_EQ(actual.name, expected.name);
	EXPECT_EQ(actual.summary, expected.summary);
	EXPECT_EQ(actual.equation_summary, expected.equation_summary);
	EXPECT_NEAR(actual.duration_seconds, expected.duration_seconds, 1e-9);
	EXPECT_NEAR(actual.view_bounds.min_x, expected.view_bounds.min_x, 1e-9);
	EXPECT_NEAR(actual.view_bounds.max_x, expected.view_bounds.max_x, 1e-9);
	EXPECT_NEAR(actual.view_bounds.min_y, expected.view_bounds.min_y, 1e-9);
	EXPECT_NEAR(actual.view_bounds.max_y, expected.view_bounds.max_y, 1e-9);
	expect_vector_eq(actual.initial_position, expected.initial_position);
	expect_vector_eq(actual.initial_velocity, expected.initial_velocity);
	expect_vector_eq(actual.acceleration, expected.acceleration);
	EXPECT_EQ(actual.observer_velocity.has_value(), expected.observer_velocity.has_value());
	if (actual.observer_velocity.has_value() && expected.observer_velocity.has_value()) {
		expect_vector_eq(*actual.observer_velocity, *expected.observer_velocity);
	}
	EXPECT_EQ(actual.radius.has_value(), expected.radius.has_value());
	if (actual.radius.has_value() && expected.radius.has_value()) {
		EXPECT_NEAR(*actual.radius, *expected.radius, 1e-9);
	}
	EXPECT_EQ(actual.angular_speed.has_value(), expected.angular_speed.has_value());
	if (actual.angular_speed.has_value() && expected.angular_speed.has_value()) {
		EXPECT_NEAR(*actual.angular_speed, *expected.angular_speed, 1e-9);
	}
	EXPECT_EQ(actual.center.has_value(), expected.center.has_value());
	if (actual.center.has_value() && expected.center.has_value()) {
		expect_vector_eq(*actual.center, *expected.center);
	}
}

void expect_snapshot_eq(
	const visual_physics::kinematics::Snapshot& actual,
	const visual_physics::kinematics::Snapshot& expected) {
	EXPECT_NEAR(actual.time_seconds, expected.time_seconds, 1e-9);
	expect_vector_eq(actual.position, expected.position);
	expect_vector_eq(actual.velocity, expected.velocity);
	expect_vector_eq(actual.acceleration, expected.acceleration);
	EXPECT_NEAR(actual.speed, expected.speed, 1e-9);
	EXPECT_NEAR(actual.acceleration_magnitude, expected.acceleration_magnitude, 1e-9);
	EXPECT_EQ(actual.relative_position.has_value(), expected.relative_position.has_value());
	if (actual.relative_position.has_value() && expected.relative_position.has_value()) {
		expect_vector_eq(*actual.relative_position, *expected.relative_position);
	}
	EXPECT_EQ(actual.relative_velocity.has_value(), expected.relative_velocity.has_value());
	if (actual.relative_velocity.has_value() && expected.relative_velocity.has_value()) {
		expect_vector_eq(*actual.relative_velocity, *expected.relative_velocity);
	}
}

void expect_samples_eq(
	const std::vector<visual_physics::kinematics::Sample>& actual,
	const std::vector<visual_physics::kinematics::Sample>& expected) {
	ASSERT_EQ(actual.size(), expected.size());
	for (std::size_t index = 0; index < actual.size(); index += 1) {
		EXPECT_NEAR(actual[index].time_seconds, expected[index].time_seconds, 1e-9);
		EXPECT_NEAR(actual[index].x_position, expected[index].x_position, 1e-9);
		EXPECT_NEAR(actual[index].y_position, expected[index].y_position, 1e-9);
		EXPECT_NEAR(actual[index].speed, expected[index].speed, 1e-9);
		EXPECT_NEAR(
			actual[index].acceleration_magnitude,
			expected[index].acceleration_magnitude,
			1e-9);
	}
}

}  // namespace

TEST(VisualPhysicsVulkanExecutable, ListsDynamicsScenarios) {
	const auto output_path = unique_temp_path("_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain dynamics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("constant-force"), std::string::npos);
	EXPECT_NE(output.find("orbital-motion"), std::string::npos);
	EXPECT_NE(output.find("elastic-collision"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsStaticsScenarios) {
	const auto output_path = unique_temp_path("_statics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain statics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("beam-support"), std::string::npos);
	EXPECT_NE(output.find("inclined-plane"), std::string::npos);
	EXPECT_NE(output.find("pulley-equilibrium"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsElectromagnetismScenarios) {
	const auto output_path = unique_temp_path("_electromagnetism_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("point-charge-electrostatics"), std::string::npos);
	EXPECT_NE(output.find("moving-charge-magnetic-field"), std::string::npos);
	EXPECT_NE(output.find("electromagnetic-induction"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsElectronicsScenarios) {
	const auto output_path = unique_temp_path("_electronics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("rc-transient"), std::string::npos);
	EXPECT_NE(output.find("full-wave-rectifier"), std::string::npos);
	EXPECT_NE(output.find("half-wave-rectifier"), std::string::npos);
	EXPECT_NE(output.find("rlc-response"), std::string::npos);
	EXPECT_NE(output.find("smoothed-rectifier"), std::string::npos);
	EXPECT_NE(output.find("rc-high-pass"), std::string::npos);
	EXPECT_NE(output.find("rlc-resonance"), std::string::npos);
	EXPECT_NE(output.find("rl-high-pass"), std::string::npos);
	EXPECT_NE(output.find("rl-low-pass"), std::string::npos);
	EXPECT_NE(output.find("resistor-network"), std::string::npos);
	EXPECT_NE(output.find("rl-transient"), std::string::npos);
	EXPECT_NE(output.find("rc-low-pass"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(FluidMechanicsCore, ComputesFloatingBlockEquilibrium) {
	const auto scenario =
		visual_physics::fluid_mechanics::make_default_scenario(
			visual_physics::fluid_mechanics::ScenarioId::BuoyancyBlock);
	const auto snapshot = visual_physics::fluid_mechanics::sample_scenario(scenario, 0.5);

	EXPECT_NEAR(snapshot.equilibrium_depth, 0.36, 1e-6);
	EXPECT_NEAR(snapshot.immersion_ratio, 0.6, 1e-6);
	EXPECT_NEAR(snapshot.displaced_volume, 0.216, 1e-6);
	EXPECT_NEAR(snapshot.buoyant_force, snapshot.weight_force, 1e-6);
	EXPECT_TRUE(snapshot.stable);
}

TEST(FluidMechanicsCore, ComputesLaminarPipeFlowDiagnostics) {
	const auto scenario =
		visual_physics::fluid_mechanics::make_default_scenario(
			visual_physics::fluid_mechanics::ScenarioId::PoiseuillePipe);
	const auto snapshot = visual_physics::fluid_mechanics::sample_scenario(scenario, 0.5);

	EXPECT_GT(snapshot.volumetric_flow_rate.value_or(0.0), 0.0);
	EXPECT_GT(snapshot.average_velocity.value_or(0.0), 0.0);
	EXPECT_NEAR(
		snapshot.centerline_velocity.value_or(0.0),
		snapshot.average_velocity.value_or(0.0) * 2.0,
		1e-9);
	EXPECT_LT(snapshot.reynolds_number.value_or(0.0), 2300.0);
	EXPECT_TRUE(snapshot.stable);
}

TEST(FluidMechanicsCore, ComputesOpenChannelFlowDiagnostics) {
	const auto scenario =
		visual_physics::fluid_mechanics::make_default_scenario(
			visual_physics::fluid_mechanics::ScenarioId::OpenChannelFlow);
	const auto snapshot = visual_physics::fluid_mechanics::sample_scenario(scenario, 0.0);

	EXPECT_GT(snapshot.discharge.value_or(0.0), 0.0);
	EXPECT_GT(snapshot.average_velocity.value_or(0.0), 0.0);
	EXPECT_GT(snapshot.hydraulic_radius.value_or(0.0), 0.0);
	EXPECT_LT(snapshot.froude_number.value_or(0.0), 1.0);
	EXPECT_TRUE(snapshot.stable);
}

TEST(VisualPhysicsVulkanExecutable, ListsFluidMechanicsScenarios) {
	const auto output_path = unique_temp_path("_fluid_mechanics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain fluid-mechanics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("buoyancy-block"), std::string::npos);
	EXPECT_NE(output.find("poiseuille-pipe"), std::string::npos);
	EXPECT_NE(output.find("open-channel-flow"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsAtmosphericPhysicsScenarios) {
	const auto output_path = unique_temp_path("_atmospheric_physics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("barometric-formula"), std::string::npos);
	EXPECT_NE(output.find("adiabatic-lapse-rate"), std::string::npos);
	EXPECT_NE(output.find("convection-column"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsSolidStatePhysicsScenarios) {
	const auto output_path = unique_temp_path("_solid_state_physics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("crystal-elasticity"), std::string::npos);
	EXPECT_NE(output.find("phonon-dispersion"), std::string::npos);
	EXPECT_NE(output.find("electronic-structure"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsNuclearAndParticlePhysicsScenarios) {
	const auto output_path = unique_temp_path("_nuclear_and_particle_physics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("radioactive-decay"), std::string::npos);
	EXPECT_NE(output.find("binding-energy-curve"), std::string::npos);
	EXPECT_NE(output.find("proton-proton-collision"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersNuclearDecayScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_nuclear_decay.ppm");
	const auto payload_path = unique_temp_path("_nuclear_decay.json");
	const auto report_csv_path = unique_temp_path("_nuclear_decay.csv");
	const auto output_path = unique_temp_path("_nuclear_decay.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --scenario radioactive-decay --time 0.35 --show-reference-guides true --show-comparison-band true --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-nuclear-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
	const auto expected_snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(expected_scenario, 0.35);
	const auto expected_report_rows =
		visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
			expected_scenario,
			expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Nuclear and Particle Physics summary: elapsedHours="
		<< expected_snapshot.elapsed_hours.value_or(0.0)
		<< ", remainingFraction="
		<< expected_snapshot.remaining_fraction.value_or(0.0)
		<< ", activityTBq="
		<< expected_snapshot.activity_terabecquerels.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Nuclear and Particle Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"radioactive-decay\""), std::string::npos);
	EXPECT_NE(payload.find("\"halfLifeHours\": 18.0"), std::string::npos);
	EXPECT_NE(payload.find("\"initialPopulationTrillions\": 6.2"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.35"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"remaining_fraction\""), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"activity_tbq\""), std::string::npos);
	EXPECT_NE(report_csv.find("radioactive-decay-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported nuclear report CSV:"), std::string::npos);
	EXPECT_NE(output.find("Nuclear and Particle Physics overlays: referenceGuides=on, comparisonBand=on, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsCollisionNuclearPayloadAndAppliesOverlayAndTimeOverrides) {
	const auto import_path = unique_temp_path("_nuclear_collision_import.json");
	const auto export_path = unique_temp_path("_nuclear_collision_export.json");
	const auto image_path = unique_temp_path("_nuclear_collision.ppm");
	const auto report_csv_path = unique_temp_path("_nuclear_collision.csv");
	const auto output_path = unique_temp_path("_nuclear_collision.txt");

	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::ProtonProtonCollision);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.25);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::nuclear_and_particle_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --import " + shell_quote(import_path) +
		" --time 0.55 --show-reference-guides true --show-active-marker false --show-comparison-band true --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-nuclear-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.55);
	const auto expected_report_rows =
		visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
			scenario,
			expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Nuclear and Particle Physics summary: invariantMassGeV="
		<< expected_snapshot.invariant_mass_gev.value_or(0.0)
		<< ", transverseMomentumGeV="
		<< expected_snapshot.transverse_momentum_gev.value_or(0.0)
		<< ", pseudorapidity="
		<< expected_snapshot.pseudorapidity.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Nuclear and Particle Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"proton-proton-collision\""), std::string::npos);
	EXPECT_NE(payload.find("\"beamEnergyGeV\": 6.5"), std::string::npos);
	EXPECT_NE(payload.find("\"scatteringAngleDegrees\": 28.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.55"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"invariant_mass_gev\""), std::string::npos);
	EXPECT_NE(report_csv.find("proton-proton-collision-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Domain: nuclear-and-particle-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: proton-proton-collision"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported nuclear report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Nuclear and Particle Physics overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsNuclearReportCsvForNonNuclearDomain) {
	const auto output_path = unique_temp_path("_nuclear_report_invalid_domain.txt");
	const auto report_csv_path = unique_temp_path("_nuclear_report_invalid_domain.csv");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --export-nuclear-report-csv " +
		shell_quote(report_csv_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Nuclear and Particle Physics report CSV export flag can only be used with --domain nuclear-and-particle-physics"),
		std::string::npos);

	std::filesystem::remove(output_path);
	std::filesystem::remove(report_csv_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesDecayNuclearCliOverridesToRenderAndExport) {
	const auto image_path = unique_temp_path("_nuclear_decay_overrides.ppm");
	const auto payload_path = unique_temp_path("_nuclear_decay_overrides.json");
	const auto output_path = unique_temp_path("_nuclear_decay_overrides.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --scenario radioactive-decay --time 0.40 --half-life-hours 12 --initial-population-trillions 8.4 --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"halfLifeHours\": 12.0"), std::string::npos);
	EXPECT_NE(payload.find("\"initialPopulationTrillions\": 8.4"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.4"), std::string::npos);
	EXPECT_NE(output.find("Scenario: radioactive-decay"), std::string::npos);
	EXPECT_NE(output.find("Overrides: halfLifeHours=12.000000, initialPopulationTrillions=8.400000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsCollisionNuclearPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_nuclear_collision_override_import.json");
	const auto export_path = unique_temp_path("_nuclear_collision_override_export.json");
	const auto image_path = unique_temp_path("_nuclear_collision_override.ppm");
	const auto report_csv_path = unique_temp_path("_nuclear_collision_override.csv");
	const auto output_path = unique_temp_path("_nuclear_collision_override.txt");

	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::ProtonProtonCollision);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.25);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::nuclear_and_particle_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --import " + shell_quote(import_path) +
		" --time 0.70 --beam-energy-gev 8.1 --scattering-angle-degrees 36 --detector-radius-meters 1.9 --export-state " +
		shell_quote(export_path) + " --export-nuclear-report-csv " + shell_quote(report_csv_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));

	auto expected_scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::ProtonProtonCollision);
	expected_scenario.beam_energy_gev = 8.1;
	expected_scenario.scattering_angle_degrees = 36.0;
	expected_scenario.detector_radius_meters = 1.9;
	const auto expected_snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(expected_scenario, 0.70);
	const auto expected_report_rows =
		visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
			expected_scenario,
			expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Nuclear and Particle Physics summary: invariantMassGeV="
		<< expected_snapshot.invariant_mass_gev.value_or(0.0)
		<< ", transverseMomentumGeV="
		<< expected_snapshot.transverse_momentum_gev.value_or(0.0)
		<< ", pseudorapidity="
		<< expected_snapshot.pseudorapidity.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Nuclear and Particle Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"beamEnergyGeV\": 8.1"), std::string::npos);
	EXPECT_NE(payload.find("\"scatteringAngleDegrees\": 36.0"), std::string::npos);
	EXPECT_NE(payload.find("\"detectorRadiusMeters\": 1.9"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.7"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"invariant_mass_gev\""), std::string::npos);
	EXPECT_NE(report_csv.find("proton-proton-collision-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Scenario: proton-proton-collision"), std::string::npos);
	EXPECT_NE(output.find("Exported nuclear report CSV: "), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: beamEnergyGeV=8.100000, scatteringAngleDegrees=36.000000, detectorRadiusMeters=1.900000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsDecayNuclearPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_nuclear_decay_override_import.json");
	const auto export_path = unique_temp_path("_nuclear_decay_override_export.json");
	const auto image_path = unique_temp_path("_nuclear_decay_override.ppm");
	const auto report_csv_path = unique_temp_path("_nuclear_decay_override.csv");
	const auto output_path = unique_temp_path("_nuclear_decay_override.txt");

	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.2);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::nuclear_and_particle_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --import " + shell_quote(import_path) +
		" --time 0.60 --show-reference-guides true --show-comparison-band true --show-active-marker false --half-life-hours 9.0 --initial-population-trillions 7.5 --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-nuclear-report-csv " + shell_quote(report_csv_path) +
		" --output " + shell_quote(image_path) + " > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
	expected_scenario.half_life_hours = 9.0;
	expected_scenario.initial_population_trillions = 7.5;
	const auto expected_snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(expected_scenario, 0.60);
	const auto expected_report_rows =
		visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
			expected_scenario,
			expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Nuclear and Particle Physics summary: elapsedHours="
		<< expected_snapshot.elapsed_hours.value_or(0.0)
		<< ", remainingFraction="
		<< expected_snapshot.remaining_fraction.value_or(0.0)
		<< ", activityTBq="
		<< expected_snapshot.activity_terabecquerels.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Nuclear and Particle Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"halfLifeHours\": 9.0"), std::string::npos);
	EXPECT_NE(payload.find("\"initialPopulationTrillions\": 7.5"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.6"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"remaining_fraction\""), std::string::npos);
	EXPECT_NE(report_csv.find("radioactive-decay-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Scenario: radioactive-decay"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported nuclear report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Nuclear and Particle Physics overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: halfLifeHours=9.000000, initialPopulationTrillions=7.500000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsBindingNuclearPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_nuclear_binding_override_import.json");
	const auto export_path = unique_temp_path("_nuclear_binding_override_export.json");
	const auto image_path = unique_temp_path("_nuclear_binding_override.ppm");
	const auto report_csv_path = unique_temp_path("_nuclear_binding_override.csv");
	const auto output_path = unique_temp_path("_nuclear_binding_override.txt");

	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.25);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::nuclear_and_particle_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = false,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --import " + shell_quote(import_path) +
		" --time 0.58 --show-reference-guides false --show-comparison-band true --show-active-marker true --mass-number 62 --proton-count 28 --binding-energy-per-nucleon-mev 8.4 --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-nuclear-report-csv " + shell_quote(report_csv_path) +
		" --output " + shell_quote(image_path) + " > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve);
	expected_scenario.mass_number = 62.0;
	expected_scenario.proton_count = 28.0;
	expected_scenario.binding_energy_per_nucleon_mev = 8.4;
	const auto expected_snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(expected_scenario, 0.58);
	const auto expected_report_rows =
		visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
			expected_scenario,
			expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Nuclear and Particle Physics summary: totalBindingEnergyMeV="
		<< expected_snapshot.total_binding_energy_mev.value_or(0.0)
		<< ", stabilityIndex="
		<< expected_snapshot.stability_index.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Nuclear and Particle Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"massNumber\": 62.0"), std::string::npos);
	EXPECT_NE(payload.find("\"protonCount\": 28.0"), std::string::npos);
	EXPECT_NE(payload.find("\"bindingEnergyPerNucleonMeV\": 8.4"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.58"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"total_binding_energy_mev\""), std::string::npos);
	EXPECT_NE(report_csv.find("binding-energy-curve-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Scenario: binding-energy-curve"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported nuclear report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Nuclear and Particle Physics overlays: referenceGuides=off, comparisonBand=on, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: massNumber=62.000000, protonCount=28.000000, bindingEnergyPerNucleonMeV=8.400000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedDecayNuclearCliFlags) {
	const auto import_path = unique_temp_path("_nuclear_import_invalid_decay.json");
	const auto image_path = unique_temp_path("_nuclear_import_invalid_decay.ppm");
	const auto output_path = unique_temp_path("_nuclear_import_invalid_decay.txt");

	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.25);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::nuclear_and_particle_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --import " + shell_quote(import_path) +
		" --mass-number 40 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--mass-number cannot be used with nuclear-and-particle-physics scenario radioactive-decay"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedBindingNuclearCliFlags) {
	const auto import_path = unique_temp_path("_nuclear_import_invalid_binding.json");
	const auto image_path = unique_temp_path("_nuclear_import_invalid_binding.ppm");
	const auto output_path = unique_temp_path("_nuclear_import_invalid_binding.txt");

	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.25);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::nuclear_and_particle_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = false,
				.show_comparison_band = true,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --import " + shell_quote(import_path) +
		" --beam-energy-gev 7.2 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--beam-energy-gev cannot be used with nuclear-and-particle-physics scenario binding-energy-curve"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedCollisionNuclearCliFlags) {
	const auto import_path = unique_temp_path("_nuclear_import_invalid_collision.json");
	const auto image_path = unique_temp_path("_nuclear_import_invalid_collision.ppm");
	const auto output_path = unique_temp_path("_nuclear_import_invalid_collision.txt");

	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::ProtonProtonCollision);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.25);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::nuclear_and_particle_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = true,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --import " + shell_quote(import_path) +
		" --half-life-hours 11 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--half-life-hours cannot be used with nuclear-and-particle-physics scenario proton-proton-collision"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsScenarioWithImportedNuclearPayload) {
	const auto import_path = unique_temp_path("_nuclear_scenario_import_conflict.json");
	const auto output_path = unique_temp_path("_nuclear_scenario_import_conflict.txt");

	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.2);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::nuclear_and_particle_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --scenario radioactive-decay --import " +
		shell_quote(import_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--scenario cannot be combined with --import"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsCollisionOnlyOverrideForBindingNuclearScenario) {
	const auto output_path = unique_temp_path("_nuclear_invalid_binding_override.txt");
	const auto image_path = unique_temp_path("_nuclear_invalid_binding_override.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --scenario binding-energy-curve --beam-energy-gev 7.2 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--beam-energy-gev cannot be used with nuclear-and-particle-physics scenario binding-energy-curve"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsNuclearOverrideFlagsForNonNuclearDomain) {
	const auto output_path = unique_temp_path("_nuclear_override_invalid_domain.txt");
	const auto image_path = unique_temp_path("_nuclear_override_invalid_domain.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --half-life-hours 12 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Nuclear and Particle Physics override flags can only be used with --domain nuclear-and-particle-physics"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersBindingNuclearScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_nuclear_binding.ppm");
	const auto payload_path = unique_temp_path("_nuclear_binding.json");
	const auto report_csv_path = unique_temp_path("_nuclear_binding.csv");
	const auto output_path = unique_temp_path("_nuclear_binding.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --scenario binding-energy-curve --time 0.45 --show-reference-guides true --show-comparison-band false --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-nuclear-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve);
	const auto expected_snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(expected_scenario, 0.45);
	const auto expected_report_rows =
		visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
			expected_scenario,
			expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Nuclear and Particle Physics summary: totalBindingEnergyMeV="
		<< expected_snapshot.total_binding_energy_mev.value_or(0.0)
		<< ", stabilityIndex="
		<< expected_snapshot.stability_index.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Nuclear and Particle Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"binding-energy-curve\""), std::string::npos);
	EXPECT_NE(payload.find("\"massNumber\": 56.0"), std::string::npos);
	EXPECT_NE(payload.find("\"protonCount\": 26.0"), std::string::npos);
	EXPECT_NE(payload.find("\"bindingEnergyPerNucleonMeV\": 8.8"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.45"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"total_binding_energy_mev\""), std::string::npos);
	EXPECT_NE(report_csv.find("binding-energy-curve-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: nuclear-and-particle-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: binding-energy-curve"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported nuclear report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Nuclear and Particle Physics overlays: referenceGuides=on, comparisonBand=off, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersCollisionNuclearScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_nuclear_collision_direct.ppm");
	const auto payload_path = unique_temp_path("_nuclear_collision_direct.json");
	const auto report_csv_path = unique_temp_path("_nuclear_collision_direct.csv");
	const auto output_path = unique_temp_path("_nuclear_collision_direct.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain nuclear-and-particle-physics --scenario proton-proton-collision --time 0.55 --show-reference-guides false --show-comparison-band true --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-nuclear-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::ProtonProtonCollision);
	const auto expected_snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(expected_scenario, 0.55);
	const auto expected_report_rows =
		visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
			expected_scenario,
			expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Nuclear and Particle Physics summary: invariantMassGeV="
		<< expected_snapshot.invariant_mass_gev.value_or(0.0)
		<< ", transverseMomentumGeV="
		<< expected_snapshot.transverse_momentum_gev.value_or(0.0)
		<< ", pseudorapidity="
		<< expected_snapshot.pseudorapidity.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Nuclear and Particle Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"proton-proton-collision\""), std::string::npos);
	EXPECT_NE(payload.find("\"beamEnergyGeV\": 6.5"), std::string::npos);
	EXPECT_NE(payload.find("\"scatteringAngleDegrees\": 28.0"), std::string::npos);
	EXPECT_NE(payload.find("\"detectorRadiusMeters\": 1.4"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.55"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"invariant_mass_gev\""), std::string::npos);
	EXPECT_NE(report_csv.find("proton-proton-collision-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: nuclear-and-particle-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: proton-proton-collision"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported nuclear report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Nuclear and Particle Physics overlays: referenceGuides=off, comparisonBand=on, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersElectronicSolidStateScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_solid_state_electronic.ppm");
	const auto payload_path = unique_temp_path("_solid_state_electronic.json");
	const auto report_csv_path = unique_temp_path("_solid_state_electronic.csv");
	const auto output_path = unique_temp_path("_solid_state_electronic.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario electronic-structure --time 0.60 --show-reference-guides true --show-comparison-band true --show-active-marker false --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(expected_scenario, 0.6);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: energyEV="
		<< expected_snapshot.energy_electron_volts.value_or(0.0)
		<< ", densityOfStates="
		<< expected_snapshot.density_of_states_arbitrary_units.value_or(0.0)
		<< ", occupationProbability="
		<< expected_snapshot.occupation_probability.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"electronic-structure\""), std::string::npos);
	EXPECT_NE(payload.find("\"bandGapElectronVolts\": 1.1"), std::string::npos);
	EXPECT_NE(payload.find("\"effectiveMassRatio\": 0.22"), std::string::npos);
	EXPECT_NE(payload.find("\"dopantDensityPerCubicCentimeter\":"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.6"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"density_of_states\""), std::string::npos);
	EXPECT_NE(report_csv.find("electronic-density-of-states-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: solid-state-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: electronic-structure"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: none"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersPhononSolidStateScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_solid_state_phonon.ppm");
	const auto payload_path = unique_temp_path("_solid_state_phonon.json");
	const auto report_csv_path = unique_temp_path("_solid_state_phonon.csv");
	const auto output_path = unique_temp_path("_solid_state_phonon.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario phonon-dispersion --time 0.40 --show-reference-guides false --show-comparison-band true --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(expected_scenario, 0.4);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: waveVectorFraction="
		<< expected_snapshot.wave_vector_fraction.value_or(0.0)
		<< ", acousticFrequencyTHz="
		<< expected_snapshot.acoustic_frequency_terahertz.value_or(0.0)
		<< ", groupVelocityKmS="
		<< expected_snapshot.group_velocity_kilometers_per_second.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"phonon-dispersion\""), std::string::npos);
	EXPECT_NE(payload.find("\"latticeSpacingNanometers\": 0.42"), std::string::npos);
	EXPECT_NE(payload.find("\"springConstantNewtonsPerMeter\": 18.0"), std::string::npos);
	EXPECT_NE(payload.find("\"atomicMassAmu\": 28.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.4"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"acoustic_frequency_thz\""), std::string::npos);
	EXPECT_NE(report_csv.find("phonon-dispersion-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: solid-state-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: phonon-dispersion"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=off, comparisonBand=on, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: none"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersCrystalSolidStateScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_solid_state_crystal.ppm");
	const auto payload_path = unique_temp_path("_solid_state_crystal.json");
	const auto report_csv_path = unique_temp_path("_solid_state_crystal.csv");
	const auto output_path = unique_temp_path("_solid_state_crystal.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario crystal-elasticity --time 0.50 --show-reference-guides true --show-comparison-band false --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(expected_scenario, 0.5);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: strainPercent="
		<< expected_snapshot.strain_percent.value_or(0.0)
		<< ", stressMPa="
		<< expected_snapshot.stress_megapascals.value_or(0.0)
		<< ", energyDensityMJm3="
		<< expected_snapshot.elastic_energy_density_megajoules_per_cubic_meter.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"crystal-elasticity\""), std::string::npos);
	EXPECT_NE(payload.find("\"maxStrainPercent\": 1.6"), std::string::npos);
	EXPECT_NE(payload.find("\"youngsModulusGigapascals\": 210.0"), std::string::npos);
	EXPECT_NE(payload.find("\"yieldStrengthMegapascals\": 185.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.5"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"stress_mpa\""), std::string::npos);
	EXPECT_NE(report_csv.find("crystal-stress-strain-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: solid-state-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: crystal-elasticity"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=on, comparisonBand=off, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: none"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsCrystalSolidStatePayloadAndAppliesOverlayAndTimeOverrides) {
	const auto import_path = unique_temp_path("_import_solid_state_crystal.json");
	const auto export_path = unique_temp_path("_export_solid_state_crystal.json");
	const auto image_path = unique_temp_path("_import_solid_state_crystal.ppm");
	const auto report_csv_path = unique_temp_path("_import_solid_state_crystal.csv");
	const auto output_path = unique_temp_path("_import_solid_state_crystal.txt");

	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.25);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::solid_state::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --import " + shell_quote(import_path) +
		" --time 0.65 --show-reference-guides true --show-active-marker false --show-comparison-band true --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.65);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: strainPercent="
		<< expected_snapshot.strain_percent.value_or(0.0)
		<< ", stressMPa="
		<< expected_snapshot.stress_megapascals.value_or(0.0)
		<< ", energyDensityMJm3="
		<< expected_snapshot.elastic_energy_density_megajoules_per_cubic_meter.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"crystal-elasticity\""), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.65"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("crystal-stress-strain-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Domain: solid-state-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: crystal-elasticity"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsSolidStateReportCsvForNonSolidStateDomain) {
	const auto output_path = unique_temp_path("_solid_state_report_invalid_domain.txt");
	const auto report_csv_path = unique_temp_path("_solid_state_report_invalid_domain.csv");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Solid State report CSV export flag can only be used with --domain solid-state-physics"),
		std::string::npos);

	std::filesystem::remove(output_path);
	std::filesystem::remove(report_csv_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesCrystalSolidStateCliOverridesToRenderAndExport) {
	const auto image_path = unique_temp_path("_solid_state_crystal_overrides.ppm");
	const auto payload_path = unique_temp_path("_solid_state_crystal_overrides.json");
	const auto report_csv_path = unique_temp_path("_solid_state_crystal_overrides.csv");
	const auto output_path = unique_temp_path("_solid_state_crystal_overrides.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario crystal-elasticity --time 0.50 --show-reference-guides false --show-comparison-band true --show-active-marker false --max-strain-percent 2.20 --youngs-modulus-gigapascals 150 --yield-strength-megapascals 220 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	expected_scenario.max_strain_percent = 2.2;
	expected_scenario.youngs_modulus_gigapascals = 150.0;
	expected_scenario.yield_strength_megapascals = 220.0;
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(expected_scenario, 0.5);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: strainPercent="
		<< expected_snapshot.strain_percent.value_or(0.0)
		<< ", stressMPa="
		<< expected_snapshot.stress_megapascals.value_or(0.0)
		<< ", energyDensityMJm3="
		<< expected_snapshot.elastic_energy_density_megajoules_per_cubic_meter.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"maxStrainPercent\": 2.2"), std::string::npos);
	EXPECT_NE(payload.find("\"youngsModulusGigapascals\": 150.0"), std::string::npos);
	EXPECT_NE(payload.find("\"yieldStrengthMegapascals\": 220.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"stress_mpa\""), std::string::npos);
	EXPECT_NE(report_csv.find("crystal-stress-strain-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=off, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: maxStrainPercent=2.200000, youngsModulusGigapascals=150.000000, yieldStrengthMegapascals=220.000000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsElectronicSolidStatePayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_solid_state_electronic_override_import.json");
	const auto export_path = unique_temp_path("_solid_state_electronic_override_export.json");
	const auto image_path = unique_temp_path("_solid_state_electronic_override.ppm");
	const auto report_csv_path = unique_temp_path("_solid_state_electronic_override.csv");
	const auto output_path = unique_temp_path("_solid_state_electronic_override.txt");

	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.3);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.3, 10);
	write_text_file(
		import_path,
		visual_physics::solid_state::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --import " + shell_quote(import_path) +
		" --time 0.75 --show-reference-guides true --show-comparison-band true --show-active-marker false --band-gap-electron-volts 1.60 --effective-mass-ratio 0.35 --dopant-density-per-cubic-centimeter 1.5e16 --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	scenario.band_gap_electron_volts = 1.6;
	scenario.effective_mass_ratio = 0.35;
	scenario.dopant_density_per_cubic_centimeter = 1.5e16;
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.75);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: energyEV="
		<< expected_snapshot.energy_electron_volts.value_or(0.0)
		<< ", densityOfStates="
		<< expected_snapshot.density_of_states_arbitrary_units.value_or(0.0)
		<< ", occupationProbability="
		<< expected_snapshot.occupation_probability.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"bandGapElectronVolts\": 1.6"), std::string::npos);
	EXPECT_NE(payload.find("\"effectiveMassRatio\": 0.35"), std::string::npos);
	EXPECT_NE(payload.find("\"dopantDensityPerCubicCentimeter\": 1.5e+16"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.75"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"density_of_states\""), std::string::npos);
	EXPECT_NE(report_csv.find("electronic-density-of-states-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: bandGapElectronVolts=1.600000, effectiveMassRatio=0.350000, dopantDensityPerCubicCentimeter=15000000000000000.000000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsCrystalSolidStatePayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_solid_state_crystal_override_import.json");
	const auto export_path = unique_temp_path("_solid_state_crystal_override_export.json");
	const auto image_path = unique_temp_path("_solid_state_crystal_override.ppm");
	const auto report_csv_path = unique_temp_path("_solid_state_crystal_override.csv");
	const auto output_path = unique_temp_path("_solid_state_crystal_override.txt");

	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.3);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.3, 10);
	write_text_file(
		import_path,
		visual_physics::solid_state::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --import " + shell_quote(import_path) +
		" --time 0.80 --show-reference-guides false --show-comparison-band true --show-active-marker false --max-strain-percent 2.40 --youngs-modulus-gigapascals 175 --yield-strength-megapascals 245 --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	scenario.max_strain_percent = 2.4;
	scenario.youngs_modulus_gigapascals = 175.0;
	scenario.yield_strength_megapascals = 245.0;
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.8);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: strainPercent="
		<< expected_snapshot.strain_percent.value_or(0.0)
		<< ", stressMPa="
		<< expected_snapshot.stress_megapascals.value_or(0.0)
		<< ", energyDensityMJm3="
		<< expected_snapshot.elastic_energy_density_megajoules_per_cubic_meter.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"maxStrainPercent\": 2.4"), std::string::npos);
	EXPECT_NE(payload.find("\"youngsModulusGigapascals\": 175.0"), std::string::npos);
	EXPECT_NE(payload.find("\"yieldStrengthMegapascals\": 245.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.8"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"stress_mpa\""), std::string::npos);
	EXPECT_NE(report_csv.find("crystal-stress-strain-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=off, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: maxStrainPercent=2.400000, youngsModulusGigapascals=175.000000, yieldStrengthMegapascals=245.000000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesPhononSolidStateCliOverridesToRenderAndExport) {
	const auto image_path = unique_temp_path("_solid_state_phonon_overrides.ppm");
	const auto payload_path = unique_temp_path("_solid_state_phonon_overrides.json");
	const auto report_csv_path = unique_temp_path("_solid_state_phonon_overrides.csv");
	const auto output_path = unique_temp_path("_solid_state_phonon_overrides.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario phonon-dispersion --time 0.40 --show-reference-guides true --show-comparison-band false --show-active-marker false --lattice-spacing-nanometers 0.55 --spring-constant-newtons-per-meter 24 --atomic-mass-amu 32 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	expected_scenario.lattice_spacing_nanometers = 0.55;
	expected_scenario.spring_constant_newtons_per_meter = 24.0;
	expected_scenario.atomic_mass_amu = 32.0;
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(expected_scenario, 0.4);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: waveVectorFraction="
		<< expected_snapshot.wave_vector_fraction.value_or(0.0)
		<< ", acousticFrequencyTHz="
		<< expected_snapshot.acoustic_frequency_terahertz.value_or(0.0)
		<< ", groupVelocityKmS="
		<< expected_snapshot.group_velocity_kilometers_per_second.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"latticeSpacingNanometers\": 0.55"), std::string::npos);
	EXPECT_NE(payload.find("\"springConstantNewtonsPerMeter\": 24.0"), std::string::npos);
	EXPECT_NE(payload.find("\"atomicMassAmu\": 32.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.4"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"acoustic_frequency_thz\""), std::string::npos);
	EXPECT_NE(report_csv.find("phonon-dispersion-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=on, comparisonBand=off, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: latticeSpacingNanometers=0.550000, springConstantNewtonsPerMeter=24.000000, atomicMassAmu=32.000000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesElectronicSolidStateCliOverridesToRenderAndExport) {
	const auto image_path = unique_temp_path("_solid_state_electronic_overrides_direct.ppm");
	const auto payload_path = unique_temp_path("_solid_state_electronic_overrides_direct.json");
	const auto report_csv_path = unique_temp_path("_solid_state_electronic_overrides_direct.csv");
	const auto output_path = unique_temp_path("_solid_state_electronic_overrides_direct.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario electronic-structure --time 0.55 --show-reference-guides false --show-comparison-band false --show-active-marker true --band-gap-electron-volts 1.45 --effective-mass-ratio 0.31 --dopant-density-per-cubic-centimeter 2.3e16 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	expected_scenario.band_gap_electron_volts = 1.45;
	expected_scenario.effective_mass_ratio = 0.31;
	expected_scenario.dopant_density_per_cubic_centimeter = 2.3e16;
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(expected_scenario, 0.55);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: energyEV="
		<< expected_snapshot.energy_electron_volts.value_or(0.0)
		<< ", densityOfStates="
		<< expected_snapshot.density_of_states_arbitrary_units.value_or(0.0)
		<< ", occupationProbability="
		<< expected_snapshot.occupation_probability.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"bandGapElectronVolts\": 1.45"), std::string::npos);
	EXPECT_NE(payload.find("\"effectiveMassRatio\": 0.31"), std::string::npos);
	EXPECT_NE(payload.find("\"dopantDensityPerCubicCentimeter\": 2.3e+16"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.55"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"density_of_states\""), std::string::npos);
	EXPECT_NE(report_csv.find("electronic-density-of-states-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=off, comparisonBand=off, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: bandGapElectronVolts=1.450000, effectiveMassRatio=0.310000, dopantDensityPerCubicCentimeter=23000000000000000.000000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsPhononSolidStatePayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_solid_state_phonon_override_import.json");
	const auto export_path = unique_temp_path("_solid_state_phonon_override_export.json");
	const auto image_path = unique_temp_path("_solid_state_phonon_override.ppm");
	const auto report_csv_path = unique_temp_path("_solid_state_phonon_override.csv");
	const auto output_path = unique_temp_path("_solid_state_phonon_override.txt");

	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::solid_state::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --import " + shell_quote(import_path) +
		" --time 0.70 --show-reference-guides false --show-comparison-band true --show-active-marker false --lattice-spacing-nanometers 0.61 --spring-constant-newtons-per-meter 28 --atomic-mass-amu 36 --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-solid-state-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	scenario.lattice_spacing_nanometers = 0.61;
	scenario.spring_constant_newtons_per_meter = 28.0;
	scenario.atomic_mass_amu = 36.0;
	const auto expected_snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.7);
	const auto expected_report_rows =
		visual_physics::solid_state::build_report_summary_rows(scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Solid State summary: waveVectorFraction="
		<< expected_snapshot.wave_vector_fraction.value_or(0.0)
		<< ", acousticFrequencyTHz="
		<< expected_snapshot.acoustic_frequency_terahertz.value_or(0.0)
		<< ", groupVelocityKmS="
		<< expected_snapshot.group_velocity_kilometers_per_second.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Solid State report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"latticeSpacingNanometers\": 0.61"), std::string::npos);
	EXPECT_NE(payload.find("\"springConstantNewtonsPerMeter\": 28.0"), std::string::npos);
	EXPECT_NE(payload.find("\"atomicMassAmu\": 36.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.7"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"acoustic_frequency_thz\""), std::string::npos);
	EXPECT_NE(report_csv.find("phonon-dispersion-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Solid State overlays: referenceGuides=off, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Exported solid-state report CSV: "), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: latticeSpacingNanometers=0.610000, springConstantNewtonsPerMeter=28.000000, atomicMassAmu=36.000000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsCrystalOnlyOverrideForPhononSolidStateScenario) {
	const auto output_path = unique_temp_path("_solid_state_invalid_phonon_override.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario phonon-dispersion --youngs-modulus-gigapascals 180 > " +
		shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--youngs-modulus-gigapascals cannot be used with solid-state scenario phonon-dispersion"),
		std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedPhononSolidStateCliFlags) {
	const auto import_path = unique_temp_path("_solid_state_import_invalid_phonon.json");
	const auto image_path = unique_temp_path("_solid_state_import_invalid_phonon.ppm");
	const auto output_path = unique_temp_path("_solid_state_import_invalid_phonon.txt");

	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.25);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::solid_state::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --import " + shell_quote(import_path) +
		" --yield-strength-megapascals 200 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--yield-strength-megapascals cannot be used with solid-state scenario phonon-dispersion"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedCrystalSolidStateCliFlags) {
	const auto import_path = unique_temp_path("_solid_state_import_invalid_crystal.json");
	const auto image_path = unique_temp_path("_solid_state_import_invalid_crystal.ppm");
	const auto output_path = unique_temp_path("_solid_state_import_invalid_crystal.txt");

	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.35, 10);
	write_text_file(
		import_path,
		visual_physics::solid_state::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = false,
				.show_comparison_band = true,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --import " + shell_quote(import_path) +
		" --atomic-mass-amu 40 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--atomic-mass-amu cannot be used with solid-state scenario crystal-elasticity"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedElectronicSolidStateCliFlags) {
	const auto import_path = unique_temp_path("_solid_state_import_invalid_electronic.json");
	const auto image_path = unique_temp_path("_solid_state_import_invalid_electronic.ppm");
	const auto output_path = unique_temp_path("_solid_state_import_invalid_electronic.txt");

	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.45);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.45, 10);
	write_text_file(
		import_path,
		visual_physics::solid_state::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = true,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --import " + shell_quote(import_path) +
		" --lattice-spacing-nanometers 0.58 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--lattice-spacing-nanometers cannot be used with solid-state scenario electronic-structure"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsPhononOnlyOverrideForElectronicSolidStateScenario) {
	const auto output_path = unique_temp_path("_solid_state_invalid_electronic_override.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario electronic-structure --atomic-mass-amu 44 > " +
		shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--atomic-mass-amu cannot be used with solid-state scenario electronic-structure"),
		std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsSolidStateOverrideFlagsForNonSolidStateDomain) {
	const auto output_path = unique_temp_path("_solid_state_override_wrong_domain.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --band-gap-electron-volts 1.4 > " +
		shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Solid State override flags can only be used with --domain solid-state-physics"),
		std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsScenarioWithImportedSolidStatePayload) {
	const auto import_path = unique_temp_path("_solid_state_scenario_import_conflict.json");
	const auto image_path = unique_temp_path("_solid_state_scenario_import_conflict.ppm");
	const auto output_path = unique_temp_path("_solid_state_scenario_import_conflict.txt");

	const auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.25);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::solid_state::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario crystal-elasticity --import " +
		shell_quote(import_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--scenario cannot be combined with --import"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsElectronicOnlyOverrideForCrystalSolidStateScenario) {
	const auto output_path = unique_temp_path("_solid_state_invalid_scenario_override.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain solid-state-physics --scenario crystal-elasticity --band-gap-electron-volts 1.4 > " +
		shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--band-gap-electron-volts cannot be used with solid-state scenario crystal-elasticity"),
		std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersFluidMechanicsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_fluid_mechanics.ppm");
	const auto payload_path = unique_temp_path("_fluid_mechanics.json");
	const auto output_path = unique_temp_path("_fluid_mechanics.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain fluid-mechanics --scenario buoyancy-block --time 0.5 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"buoyancy-block\""), std::string::npos);
	EXPECT_NE(payload.find("\"fluidDensity\": 1000.0"), std::string::npos);
	EXPECT_NE(payload.find("\"equilibriumDepth\":"), std::string::npos);
	EXPECT_NE(payload.find("\"showForceGuides\": true"), std::string::npos);
	EXPECT_NE(output.find("Domain: fluid-mechanics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: buoyancy-block"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Fluid Mechanics overlays: forceGuides=on, waterline=on, equilibriumGuide=on"), std::string::npos);
	EXPECT_NE(output.find("Fluid Mechanics snapshot: equilibriumDepth="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersPoiseuilleScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_fluid_mechanics_pipe.ppm");
	const auto payload_path = unique_temp_path("_fluid_mechanics_pipe.json");
	const auto output_path = unique_temp_path("_fluid_mechanics_pipe.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain fluid-mechanics --scenario poiseuille-pipe --time 0.5 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"poiseuille-pipe\""), std::string::npos);
	EXPECT_NE(payload.find("\"pipeRadius\": 0.045"), std::string::npos);
	EXPECT_NE(payload.find("\"volumetricFlowRate\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: fluid-mechanics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: poiseuille-pipe"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Fluid Mechanics snapshot: volumetricFlowRate="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersOpenChannelScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_fluid_mechanics_open_channel.ppm");
	const auto payload_path = unique_temp_path("_fluid_mechanics_open_channel.json");
	const auto output_path = unique_temp_path("_fluid_mechanics_open_channel.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain fluid-mechanics --scenario open-channel-flow --time 0.0 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"open-channel-flow\""), std::string::npos);
	EXPECT_NE(payload.find("\"channelWidth\": 3.0"), std::string::npos);
	EXPECT_NE(payload.find("\"discharge\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: fluid-mechanics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: open-channel-flow"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Fluid Mechanics snapshot: discharge="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(ThermodynamicsCore, ComputesIdealGasDiagnostics) {
	const auto scenario =
		visual_physics::thermodynamics::make_default_scenario(
			visual_physics::thermodynamics::ScenarioId::IdealGasState);
	const auto snapshot = visual_physics::thermodynamics::sample_scenario(scenario, 1.5);

	const double expected_pressure =
		(scenario.molar_amount * scenario.gas_constant * scenario.temperature_kelvin) /
		snapshot.volume_cubic_meters;
	const double expected_density =
		(scenario.molar_amount * scenario.molar_mass_kg_per_mol) /
		snapshot.volume_cubic_meters;
	const double expected_internal_energy =
		0.5 * scenario.degrees_of_freedom * scenario.molar_amount * scenario.gas_constant *
		scenario.temperature_kelvin;

	EXPECT_NEAR(snapshot.pressure_pascals, expected_pressure, 1e-6);
	EXPECT_NEAR(snapshot.density_kg_m3, expected_density, 1e-6);
	EXPECT_NEAR(snapshot.internal_energy_joules, expected_internal_energy, 1e-6);
	EXPECT_NEAR(snapshot.temperature_kelvin, scenario.temperature_kelvin, 1e-9);
	EXPECT_TRUE(snapshot.stable);
}

TEST(ThermodynamicsCore, ComputesHeatConductionDiagnostics) {
	const auto scenario =
		visual_physics::thermodynamics::make_default_scenario(
			visual_physics::thermodynamics::ScenarioId::HeatConductionSlab);
	const auto snapshot = visual_physics::thermodynamics::sample_scenario(scenario, 120.0);
	const double half_thickness = scenario.slab_thickness_meters.value_or(0.0) * 0.5;
	const double expected_fourier =
		(scenario.thermal_diffusivity_m2_per_s.value_or(0.0) * 120.0) / (half_thickness * half_thickness);
	const double expected_normalized = std::exp(-(M_PI * M_PI) * expected_fourier);

	EXPECT_NEAR(snapshot.fourier_number.value_or(0.0), expected_fourier, 1e-9);
	EXPECT_NEAR(snapshot.normalized_temperature.value_or(0.0), expected_normalized, 1e-9);
	EXPECT_GT(snapshot.center_temperature_celsius.value_or(0.0), scenario.initial_temperature_celsius.value_or(0.0));
	EXPECT_LT(snapshot.center_temperature_celsius.value_or(0.0), scenario.boundary_temperature_celsius.value_or(0.0));
	EXPECT_GT(snapshot.heat_flux_w_per_m2.value_or(0.0), 0.0);
}

TEST(ThermodynamicsCore, ComputesCarnotCycleDiagnostics) {
	const auto scenario =
		visual_physics::thermodynamics::make_default_scenario(
			visual_physics::thermodynamics::ScenarioId::CarnotCycle);
	const auto snapshot = visual_physics::thermodynamics::sample_scenario(scenario, 175.0);
	const double expected_efficiency =
		1.0 - scenario.cold_reservoir_temperature_kelvin.value_or(0.0) /
			scenario.hot_reservoir_temperature_kelvin.value_or(1.0);

	EXPECT_NEAR(snapshot.thermal_efficiency.value_or(0.0), expected_efficiency, 1e-9);
	EXPECT_GT(snapshot.absorbed_heat_kj.value_or(0.0), snapshot.rejected_heat_kj.value_or(0.0));
	EXPECT_GT(snapshot.net_work_kj.value_or(0.0), 0.0);
	EXPECT_GT(snapshot.entropy_transfer_kj_per_k.value_or(0.0), 0.0);
	EXPECT_FALSE(snapshot.cycle_stage_label.value_or(std::string{}).empty());
	EXPECT_TRUE(snapshot.stable);
}

TEST(OpticsCore, ComputesSnellDiagnostics) {
	const auto scenario =
		visual_physics::optics::make_default_scenario(
			visual_physics::optics::ScenarioId::SnellRefraction);
	const auto snapshot = visual_physics::optics::sample_scenario(scenario, 0.25);
	const double expected_sine_ratio =
		scenario.medium_a_refractive_index.value_or(0.0) /
		scenario.medium_b_refractive_index.value_or(1.0) *
		std::sin(scenario.incident_angle_degrees.value_or(0.0) * kPi / 180.0);
	const double expected_refracted_angle = std::asin(expected_sine_ratio) * 180.0 / kPi;

	EXPECT_NEAR(snapshot.refracted_angle_degrees.value_or(0.0), expected_refracted_angle, 1e-9);
	EXPECT_NEAR(
		snapshot.relative_refractive_index.value_or(0.0),
		scenario.medium_a_refractive_index.value_or(0.0) /
			scenario.medium_b_refractive_index.value_or(1.0),
		1e-9);
	EXPECT_FALSE(snapshot.total_internal_reflection.value_or(true));
	EXPECT_TRUE(snapshot.stable);
}

TEST(OpticsCore, ComputesThinLensDiagnostics) {
	const auto scenario =
		visual_physics::optics::make_default_scenario(
			visual_physics::optics::ScenarioId::ThinLensImaging);
	const auto snapshot = visual_physics::optics::sample_scenario(scenario, 0.25);
	const double expected_image_distance =
		1.0 /
		((1.0 / scenario.focal_length_centimeters.value_or(1.0)) -
		 (1.0 / scenario.object_distance_centimeters.value_or(1.0)));
	const double expected_magnification =
		-expected_image_distance / scenario.object_distance_centimeters.value_or(1.0);

	EXPECT_NEAR(snapshot.image_distance_centimeters.value_or(0.0), expected_image_distance, 1e-9);
	EXPECT_NEAR(snapshot.magnification.value_or(0.0), expected_magnification, 1e-9);
	EXPECT_LT(snapshot.image_height_centimeters.value_or(0.0), 0.0);
	EXPECT_TRUE(snapshot.real_image.value_or(false));
	EXPECT_TRUE(snapshot.inverted_image.value_or(false));
}

TEST(OpticsCore, ComputesSingleSlitDiagnostics) {
	const auto scenario =
		visual_physics::optics::make_default_scenario(
			visual_physics::optics::ScenarioId::SingleSlitDiffraction);
	const auto snapshot = visual_physics::optics::sample_scenario(scenario, 0.25);
	const double expected_first_minimum =
		scenario.screen_distance_meters.value_or(0.0) *
		(scenario.wavelength_nanometers.value_or(0.0) * 1e-9) * 1000.0 /
		(scenario.slit_width_micrometers.value_or(1.0) * 1e-6);

	EXPECT_NEAR(
		snapshot.first_minimum_offset_millimeters.value_or(0.0),
		expected_first_minimum,
		1e-9);
	EXPECT_NEAR(
		snapshot.central_maximum_width_millimeters.value_or(0.0),
		expected_first_minimum * 2.0,
		1e-9);
	EXPECT_TRUE(snapshot.stable);
}

TEST(VisualPhysicsVulkanExecutable, ListsOpticsScenarios) {
	const auto output_path = unique_temp_path("_optics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain optics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("snell-refraction"), std::string::npos);
	EXPECT_NE(output.find("thin-lens-imaging"), std::string::npos);
	EXPECT_NE(output.find("single-slit-diffraction"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsQuantumScenarios) {
	const auto output_path = unique_temp_path("_quantum_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain quantum --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("particle-in-a-box"), std::string::npos);
	EXPECT_NE(output.find("finite-potential-well-tunneling"), std::string::npos);
	EXPECT_NE(output.find("double-slit-interference"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsWavesScenarios) {
	const auto output_path = unique_temp_path("_waves_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain waves --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("standing-wave"), std::string::npos);
	EXPECT_NE(output.find("traveling-wave"), std::string::npos);
	EXPECT_NE(output.find("doppler-effect"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(QuantumCore, ComputesParticleInBoxDiagnostics) {
	const auto scenario =
		visual_physics::quantum::make_default_scenario(
			visual_physics::quantum::ScenarioId::ParticleInBox);
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.25);

	EXPECT_GT(snapshot.energy_level_ev.value_or(0.0), 0.0);
	EXPECT_NEAR(snapshot.node_count.value_or(-1.0), 0.0, 1e-9);
	EXPECT_NEAR(snapshot.de_broglie_wavelength_nanometers.value_or(0.0), 2.4, 1e-9);
	EXPECT_TRUE(snapshot.stable);

	const auto samples = visual_physics::quantum::build_samples(scenario, 16);
	EXPECT_EQ(samples.size(), 17U);
	EXPECT_EQ(samples.front().label, "probability-density");
	EXPECT_TRUE(samples.front().active);
}

TEST(QuantumPayload, RoundTripsDoubleSlitScenarioSnapshotSamplesAndOverlays) {
	auto scenario =
		visual_physics::quantum::make_default_scenario(
			visual_physics::quantum::ScenarioId::DoubleSlitInterference);
	scenario.wavelength_nanometers = 610.0;
	scenario.slit_separation_micrometers = 160.0;
	scenario.slit_width_micrometers = 55.0;
	scenario.screen_distance_meters = 2.4;
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.4);
	const auto samples = visual_physics::quantum::build_samples(scenario, 12);
	const visual_physics::quantum::OverlayOptions overlays{
		.show_probability_guide = false,
		.show_potential_guide = true,
		.show_phase_guide = false,
	};
	const auto payload = visual_physics::quantum::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-03T00:00:00.000Z");
	const auto imported = visual_physics::quantum::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::quantum::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::quantum::build_samples(imported.scenario, 12);

	EXPECT_EQ(imported.scenario.id, visual_physics::quantum::ScenarioId::DoubleSlitInterference);
	ASSERT_TRUE(imported.scenario.wavelength_nanometers.has_value());
	ASSERT_TRUE(imported.scenario.slit_separation_micrometers.has_value());
	ASSERT_TRUE(imported.scenario.slit_width_micrometers.has_value());
	ASSERT_TRUE(imported.scenario.screen_distance_meters.has_value());
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_NEAR(imported.time_seconds, 0.4, 1e-9);
	EXPECT_NEAR(*imported.scenario.wavelength_nanometers, 610.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.slit_separation_micrometers, 160.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.slit_width_micrometers, 55.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.screen_distance_meters, 2.4, 1e-9);
	EXPECT_FALSE(imported.overlays->show_probability_guide);
	EXPECT_TRUE(imported.overlays->show_potential_guide);
	EXPECT_FALSE(imported.overlays->show_phase_guide);
	EXPECT_NEAR(
		roundtrip_snapshot.fringe_spacing_millimeters.value_or(0.0),
		snapshot.fringe_spacing_millimeters.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.central_maximum_width_millimeters.value_or(0.0),
		snapshot.central_maximum_width_millimeters.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_NEAR(roundtrip_samples.back().position, samples.back().position, 1e-9);
	EXPECT_NEAR(roundtrip_samples.back().primary_value, samples.back().primary_value, 1e-9);
	EXPECT_EQ(roundtrip_samples.back().label, samples.back().label);
}

TEST(QuantumPayload, RoundTripsParticleInBoxScenarioSnapshotSamplesAndOverlays) {
	auto scenario =
		visual_physics::quantum::make_default_scenario(
			visual_physics::quantum::ScenarioId::ParticleInBox);
	scenario.box_length_nanometers = 2.3;
	scenario.quantum_number = 4.0;
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::quantum::build_samples(scenario, 14);
	const visual_physics::quantum::OverlayOptions overlays{
		.show_probability_guide = true,
		.show_potential_guide = false,
		.show_phase_guide = true,
	};
	const auto payload = visual_physics::quantum::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-03T00:00:00.000Z");
	const auto imported = visual_physics::quantum::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::quantum::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::quantum::build_samples(imported.scenario, 14);

	EXPECT_EQ(imported.scenario.id, visual_physics::quantum::ScenarioId::ParticleInBox);
	ASSERT_TRUE(imported.scenario.box_length_nanometers.has_value());
	ASSERT_TRUE(imported.scenario.quantum_number.has_value());
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_NEAR(imported.time_seconds, 0.35, 1e-9);
	EXPECT_NEAR(*imported.scenario.box_length_nanometers, 2.3, 1e-9);
	EXPECT_NEAR(*imported.scenario.quantum_number, 4.0, 1e-9);
	EXPECT_TRUE(imported.overlays->show_probability_guide);
	EXPECT_FALSE(imported.overlays->show_potential_guide);
	EXPECT_TRUE(imported.overlays->show_phase_guide);
	EXPECT_NEAR(
		roundtrip_snapshot.energy_level_ev.value_or(0.0),
		snapshot.energy_level_ev.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.first_antinode_nanometers.value_or(0.0),
		snapshot.first_antinode_nanometers.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_NEAR(roundtrip_samples[5].position, samples[5].position, 1e-9);
	EXPECT_NEAR(roundtrip_samples[5].primary_value, samples[5].primary_value, 1e-9);
	EXPECT_NEAR(
		roundtrip_samples[5].secondary_value.value_or(0.0),
		samples[5].secondary_value.value_or(0.0),
		1e-9);
}

TEST(QuantumPayload, RoundTripsTunnelingScenarioSnapshotSamplesAndOverlays) {
	auto scenario =
		visual_physics::quantum::make_default_scenario(
			visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling);
	scenario.particle_energy_ev = 2.6;
	scenario.barrier_height_ev = 4.2;
	scenario.barrier_width_nanometers = 0.62;
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.3);
	const auto samples = visual_physics::quantum::build_samples(scenario, 15);
	const visual_physics::quantum::OverlayOptions overlays{
		.show_probability_guide = false,
		.show_potential_guide = true,
		.show_phase_guide = true,
	};
	const auto payload = visual_physics::quantum::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-03T00:00:00.000Z");
	const auto imported = visual_physics::quantum::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::quantum::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::quantum::build_samples(imported.scenario, 15);

	EXPECT_EQ(imported.scenario.id, visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling);
	ASSERT_TRUE(imported.scenario.particle_energy_ev.has_value());
	ASSERT_TRUE(imported.scenario.barrier_height_ev.has_value());
	ASSERT_TRUE(imported.scenario.barrier_width_nanometers.has_value());
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_NEAR(imported.time_seconds, 0.3, 1e-9);
	EXPECT_NEAR(*imported.scenario.particle_energy_ev, 2.6, 1e-9);
	EXPECT_NEAR(*imported.scenario.barrier_height_ev, 4.2, 1e-9);
	EXPECT_NEAR(*imported.scenario.barrier_width_nanometers, 0.62, 1e-9);
	EXPECT_FALSE(imported.overlays->show_probability_guide);
	EXPECT_TRUE(imported.overlays->show_potential_guide);
	EXPECT_TRUE(imported.overlays->show_phase_guide);
	EXPECT_NEAR(
		roundtrip_snapshot.transmission_probability.value_or(0.0),
		snapshot.transmission_probability.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.decay_length_nanometers.value_or(0.0),
		snapshot.decay_length_nanometers.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_NEAR(roundtrip_samples.back().position, samples.back().position, 1e-9);
	EXPECT_NEAR(roundtrip_samples.back().primary_value, samples.back().primary_value, 1e-9);
	EXPECT_NEAR(
		roundtrip_samples.back().secondary_value.value_or(0.0),
		samples.back().secondary_value.value_or(0.0),
		1e-9);
}

TEST(QuantumPayload, RejectsMalformedOverlayPayload) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "particle-in-a-box",
	    "name": "Particle in a One-Dimensional Box",
	    "summary": "Test",
	    "equationSummary": "E_n",
	    "status": "Implemented",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1.2, "minY": -0.2, "maxY": 1.2 },
	    "focusArea": "Test",
	    "boxLengthNanometers": 1.2,
	    "quantumNumber": 2
	  },
	  "snapshot": { "timeSeconds": 0.25 },
	  "overlays": {
	    "showProbabilityGuide": true,
	    "showPotentialGuide": "yes",
	    "showPhaseGuide": false
	  }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::quantum::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(QuantumPayload, RejectsMissingRequiredScenarioFields) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "finite-potential-well-tunneling",
	    "name": "Finite Barrier Tunneling",
	    "summary": "Test",
	    "equationSummary": "T ~ exp",
	    "status": "Implemented",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1.35, "minY": -0.2, "maxY": 4.5 },
	    "focusArea": "Test",
	    "particleEnergyEv": 2.1,
	    "barrierHeightEv": 3.8
	  },
	  "snapshot": { "timeSeconds": 0.25 }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::quantum::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(QuantumPayload, RejectsMissingSnapshotTime) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "double-slit-interference",
	    "name": "Double-Slit Interference Pattern",
	    "summary": "Test",
	    "equationSummary": "Delta y",
	    "status": "Implemented",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -15, "maxX": 15, "minY": -0.05, "maxY": 1.05 },
	    "focusArea": "Test",
	    "wavelengthNanometers": 520,
	    "slitSeparationMicrometers": 120,
	    "slitWidthMicrometers": 40,
	    "screenDistanceMeters": 1.8
	  },
	  "snapshot": { }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::quantum::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(QuantumPayload, RejectsNonFiniteScenarioField) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "particle-in-a-box",
	    "name": "Particle in a One-Dimensional Box",
	    "summary": "Test",
	    "equationSummary": "E_n",
	    "status": "Implemented",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1.2, "minY": -0.2, "maxY": 1.2 },
	    "focusArea": "Test",
	    "boxLengthNanometers": 1e999,
	    "quantumNumber": 2
	  },
	  "snapshot": { "timeSeconds": 0.25 }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::quantum::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(QuantumPayload, RejectsNonFiniteViewBounds) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "double-slit-interference",
	    "name": "Double-Slit Interference Pattern",
	    "summary": "Test",
	    "equationSummary": "Delta y",
	    "status": "Implemented",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -15, "maxX": 1e999, "minY": -0.05, "maxY": 1.05 },
	    "focusArea": "Test",
	    "wavelengthNanometers": 520,
	    "slitSeparationMicrometers": 120,
	    "slitWidthMicrometers": 40,
	    "screenDistanceMeters": 1.8
	  },
	  "snapshot": { "timeSeconds": 0.25 }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::quantum::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(QuantumPayload, RejectsNonFiniteSnapshotTime) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "finite-potential-well-tunneling",
	    "name": "Finite Barrier Tunneling",
	    "summary": "Test",
	    "equationSummary": "T ~ exp",
	    "status": "Implemented",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1.35, "minY": -0.2, "maxY": 4.5 },
	    "focusArea": "Test",
	    "particleEnergyEv": 2.1,
	    "barrierHeightEv": 3.8,
	    "barrierWidthNanometers": 0.45
	  },
	  "snapshot": { "timeSeconds": 1e999 }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::quantum::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(WavesCore, ComputesStandingWaveDiagnostics) {
	const auto scenario = visual_physics::waves::make_default_scenario(
		visual_physics::waves::ScenarioId::StandingWave);
	const auto snapshot = visual_physics::waves::sample_scenario(scenario, 0.0);

	EXPECT_NEAR(snapshot.wavelength_meters.value_or(0.0), 1.2, 1e-9);
	EXPECT_NEAR(snapshot.frequency_hertz.value_or(0.0), 20.0, 1e-9);
	EXPECT_NEAR(snapshot.harmonic_number.value_or(0.0), 2.0, 1e-9);
	EXPECT_TRUE(snapshot.stable);

	const auto samples = visual_physics::waves::build_samples_at_time(scenario, 0.0, 16);
	ASSERT_EQ(samples.size(), 17U);
	EXPECT_EQ(samples.front().label, "standing-wave-profile");
	EXPECT_TRUE(samples.front().active);
	EXPECT_NEAR(samples[4].primary_value, 6.0, 1e-9);
	EXPECT_NEAR(samples[8].primary_value, 0.0, 1e-9);
}

TEST(WavesPayload, RoundTripsStandingWaveScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::waves::make_default_scenario(
		visual_physics::waves::ScenarioId::StandingWave);
	scenario.string_length_meters = 1.6;
	scenario.wave_speed_meters_per_second = 28.0;
	scenario.amplitude_millimeters = 7.5;
	scenario.harmonic_number = 3.0;
	const auto snapshot = visual_physics::waves::sample_scenario(scenario, 0.125);
	const auto samples = visual_physics::waves::build_samples_at_time(scenario, 0.125, 14);
	const visual_physics::waves::OverlayOptions overlays{
		.show_wave_guides = true,
		.show_node_markers = false,
		.show_reference_curve = true,
	};
	const auto payload = visual_physics::waves::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-03T00:00:00.000Z");
	const auto imported = visual_physics::waves::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::waves::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::waves::build_samples_at_time(imported.scenario, imported.time_seconds, 14);

	EXPECT_EQ(imported.scenario.id, visual_physics::waves::ScenarioId::StandingWave);
	ASSERT_TRUE(imported.scenario.string_length_meters.has_value());
	ASSERT_TRUE(imported.scenario.wave_speed_meters_per_second.has_value());
	ASSERT_TRUE(imported.scenario.amplitude_millimeters.has_value());
	ASSERT_TRUE(imported.scenario.harmonic_number.has_value());
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_NEAR(imported.time_seconds, 0.125, 1e-9);
	EXPECT_NEAR(*imported.scenario.string_length_meters, 1.6, 1e-9);
	EXPECT_NEAR(*imported.scenario.wave_speed_meters_per_second, 28.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.amplitude_millimeters, 7.5, 1e-9);
	EXPECT_NEAR(*imported.scenario.harmonic_number, 3.0, 1e-9);
	EXPECT_TRUE(imported.overlays->show_wave_guides);
	EXPECT_FALSE(imported.overlays->show_node_markers);
	EXPECT_TRUE(imported.overlays->show_reference_curve);
	EXPECT_NEAR(
		roundtrip_snapshot.frequency_hertz.value_or(0.0),
		snapshot.frequency_hertz.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.wavelength_meters.value_or(0.0),
		snapshot.wavelength_meters.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_NEAR(roundtrip_samples[7].position, samples[7].position, 1e-9);
	EXPECT_NEAR(roundtrip_samples[7].primary_value, samples[7].primary_value, 1e-9);
	EXPECT_EQ(roundtrip_samples[7].label, samples[7].label);
}

TEST(WavesPayload, RejectsMissingRequiredScenarioFields) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "standing-wave",
	    "name": "Standing Wave on a String",
	    "summary": "Test",
	    "equationSummary": "f_n",
	    "status": "Validated shared slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1.2, "minY": -1.2, "maxY": 1.2 },
	    "focusArea": "Test",
	    "stringLengthMeters": 1.2,
	    "waveSpeedMetersPerSecond": 24,
	    "amplitudeMillimeters": 6
	  },
	  "snapshot": { "timeSeconds": 0.0 }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::waves::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(WavesReport, BuildsStandingWaveSummaryFirstCsv) {
	const auto scenario = visual_physics::waves::make_default_scenario(
		visual_physics::waves::ScenarioId::StandingWave);
	const auto snapshot = visual_physics::waves::sample_scenario(scenario, 0.4);
	const auto samples = visual_physics::waves::build_samples_at_time(scenario, 0.4, 12);
	const auto csv = visual_physics::waves::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"harmonic_number\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("standing-wave-profile"), std::string::npos);
}

TEST(VisualPhysicsVulkanExecutable, RendersStandingWaveScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_waves_standing.ppm");
	const auto payload_path = unique_temp_path("_waves_standing.json");
	const auto report_csv_path = unique_temp_path("_waves_standing_report.csv");
	const auto output_path = unique_temp_path("_waves_standing.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain waves --scenario standing-wave --time 0.25 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-waves-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::PlanetaryOrbit);
	expected_scenario.central_mass_solar_masses = 1.4;
	expected_scenario.orbital_radius_astronomical_units = 1.8;
	expected_scenario.orbital_eccentricity = 0.2;
	const auto expected_snapshot = visual_physics::astrophysics::sample_scenario(expected_scenario, 0.35);
	const auto expected_report_rows =
		visual_physics::astrophysics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Astrophysics summary: orbitalPeriodDays="
		<< expected_snapshot.orbital_period_days.value_or(0.0)
		<< ", orbitalSpeedKmS="
		<< expected_snapshot.orbital_speed_kilometers_per_second.value_or(0.0)
		<< ", escapeSpeedKmS="
		<< expected_snapshot.escape_speed_kilometers_per_second.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Astrophysics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"standing-wave\""), std::string::npos);
	EXPECT_NE(payload.find("\"stringLengthMeters\": 1.2"), std::string::npos);
	EXPECT_NE(payload.find("\"harmonicNumber\": 2.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showWaveGuides\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"frequency_hz\""), std::string::npos);
	EXPECT_NE(report_csv.find("standing-wave-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: waves"), std::string::npos);
	EXPECT_NE(output.find("Scenario: standing-wave"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported waves report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Waves overlays: waveGuides=on, nodeMarkers=on, referenceCurve=on"), std::string::npos);
	EXPECT_NE(output.find("Waves snapshot: stringLength="), std::string::npos);
	EXPECT_NE(output.find("Waves report summary: snapshot_time_s="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsDopplerWavesPayloadAndPreservesOverlaysAndTime) {
	const auto import_path = unique_temp_path("_import_waves_doppler.json");
	const auto export_path = unique_temp_path("_export_waves_doppler.json");
	const auto image_path = unique_temp_path("_import_waves_doppler.ppm");
	const auto output_path = unique_temp_path("_import_waves_doppler.txt");

	auto scenario = visual_physics::waves::make_default_scenario(
		visual_physics::waves::ScenarioId::DopplerEffect);
	scenario.wave_speed_meters_per_second = 343.0;
	scenario.emitted_frequency_hertz = 480.0;
	scenario.source_speed_meters_per_second = 22.0;
	scenario.observer_speed_meters_per_second = -4.0;
	const auto snapshot = visual_physics::waves::sample_scenario(scenario, 0.15);
	const auto samples = visual_physics::waves::build_samples_at_time(scenario, 0.15, 10);
	write_text_file(
		import_path,
		visual_physics::waves::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_wave_guides = false,
				.show_node_markers = true,
				.show_reference_curve = false,
			},
			samples,
			"2026-06-03T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain waves --import " + shell_quote(import_path) +
		" --time 0.55 --export-state " + shell_quote(export_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto exported_payload = read_text_file(export_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"doppler-effect\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"emittedFrequencyHertz\": 480.0"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"sourceSpeedMetersPerSecond\": 22.0"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"observerSpeedMetersPerSecond\": -4.0"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"timeSeconds\": 0.55"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showWaveGuides\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showNodeMarkers\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showReferenceCurve\": false"), std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("time=0.55s"), std::string::npos);
	EXPECT_NE(output.find("Waves overlays: waveGuides=off, nodeMarkers=on, referenceCurve=off"), std::string::npos);
	EXPECT_NE(output.find("Waves snapshot: emittedFrequency="), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(RelativityCore, ComputesTimeDilationDiagnostics) {
	const auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::TimeDilation);
	const auto snapshot = visual_physics::relativity::sample_scenario(scenario, 0.0);

	EXPECT_NEAR(snapshot.relative_velocity_fraction_of_light.value_or(0.0), 0.8, 1e-9);
	EXPECT_NEAR(snapshot.proper_time_seconds.value_or(0.0), 0.01, 1e-9);
	EXPECT_NEAR(snapshot.lorentz_factor_gamma.value_or(0.0), 1.6666666667, 1e-6);
	EXPECT_NEAR(snapshot.dilated_time_seconds.value_or(0.0), 0.0166666667, 1e-6);
	EXPECT_TRUE(snapshot.stable);

	const auto samples = visual_physics::relativity::build_samples(scenario, 40);
	ASSERT_EQ(samples.size(), 41U);
	EXPECT_EQ(samples.front().label, "time-dilation-curve");
	EXPECT_TRUE(samples.front().secondary_value.has_value());
	const auto active_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	ASSERT_NE(active_it, samples.end());
	EXPECT_NEAR(active_it->position, 0.8, 0.01);
	EXPECT_NEAR(active_it->secondary_value.value_or(0.0), 1.0, 1e-9);
	EXPECT_GT(active_it->primary_value, active_it->secondary_value.value_or(0.0));
}

TEST(RelativityPayload, RoundTripsScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::TimeDilation);
	scenario.relative_velocity_fraction_of_light = 0.72;
	scenario.proper_time_seconds = 6.5;
	const auto snapshot = visual_physics::relativity::sample_scenario(scenario, 0.0);
	const auto samples = visual_physics::relativity::build_samples_at_time(scenario, 0.0, 12);
	const visual_physics::relativity::OverlayOptions overlays{
		.show_reference_guides = false,
		.show_comparison_curve = true,
		.show_active_marker = false,
	};
	const auto payload = visual_physics::relativity::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-03T00:00:00.000Z");
	const auto imported = visual_physics::relativity::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::relativity::sample_scenario(imported.scenario, imported.time_seconds);

	EXPECT_EQ(imported.scenario.id, visual_physics::relativity::ScenarioId::TimeDilation);
	ASSERT_TRUE(imported.scenario.relative_velocity_fraction_of_light.has_value());
	ASSERT_TRUE(imported.scenario.proper_time_seconds.has_value());
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_NEAR(imported.time_seconds, 0.01, 1e-9);
	EXPECT_NEAR(*imported.scenario.relative_velocity_fraction_of_light, 0.72, 1e-9);
	EXPECT_NEAR(*imported.scenario.proper_time_seconds, 6.5, 1e-9);
	EXPECT_FALSE(imported.overlays->show_reference_guides);
	EXPECT_TRUE(imported.overlays->show_comparison_curve);
	EXPECT_FALSE(imported.overlays->show_active_marker);
	EXPECT_NEAR(
		roundtrip_snapshot.lorentz_factor_gamma.value_or(0.0),
		snapshot.lorentz_factor_gamma.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.dilated_time_seconds.value_or(0.0),
		snapshot.dilated_time_seconds.value_or(0.0),
		1e-9);
}

TEST(RelativityPayload, RejectsNonFiniteSnapshotTime) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "time-dilation",
	    "name": "Time Dilation",
	    "summary": "Test",
	    "equationSummary": "gamma",
	    "status": "Validated shared slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -0.95, "maxX": 0.95, "minY": 0, "maxY": 10 },
	    "focusArea": "Test",
	    "relativeVelocityFractionOfLight": 0.8,
	    "properTimeSeconds": 5.0
	  },
	  "snapshot": { "timeSeconds": 1e999 }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::relativity::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(RelativityReport, BuildsSummaryFirstCsv) {
	const auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::TimeDilation);
	const auto snapshot = visual_physics::relativity::sample_scenario(scenario, 0.0);
	const auto samples = visual_physics::relativity::build_samples_at_time(scenario, 0.0, 12);
	const auto csv = visual_physics::relativity::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"lorentz_factor_gamma\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("time-dilation-curve"), std::string::npos);
}

TEST(RelativityCore, ComputesRelativisticDopplerDiagnostics) {
	const auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::RelativisticDoppler);
	const auto snapshot = visual_physics::relativity::sample_scenario(scenario, 0.5);

	EXPECT_NEAR(snapshot.time_seconds, 0.0, 1e-9);
	EXPECT_NEAR(snapshot.emitted_frequency_hertz.value_or(0.0), 440.0, 1e-9);
	EXPECT_NEAR(snapshot.source_velocity_fraction_of_light.value_or(0.0), 0.35, 1e-9);
	EXPECT_NEAR(snapshot.observer_velocity_fraction_of_light.value_or(0.0), 0.0, 1e-9);
	EXPECT_LT(snapshot.observed_frequency_hertz.value_or(0.0), snapshot.emitted_frequency_hertz.value_or(0.0));
	EXPECT_TRUE(snapshot.redshift.value_or(false));

	const auto samples = visual_physics::relativity::build_samples(scenario, 40);
	ASSERT_EQ(samples.size(), 41U);
	EXPECT_EQ(samples.front().label, "relativistic-doppler-curve");
	EXPECT_TRUE(samples.front().secondary_value.has_value());
	const auto active_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	ASSERT_NE(active_it, samples.end());
	EXPECT_NEAR(active_it->position, snapshot.relative_velocity_fraction_of_light.value_or(0.0), 0.03);
	EXPECT_NEAR(active_it->secondary_value.value_or(0.0), 440.0 * (1.0 - active_it->position), 1e-6);
}

TEST(RelativityPayload, RoundTripsDopplerScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::RelativisticDoppler);
	scenario.emitted_frequency_hertz = 523.25;
	scenario.source_velocity_fraction_of_light = 0.28;
	scenario.observer_velocity_fraction_of_light = -0.1;
	const auto snapshot = visual_physics::relativity::sample_scenario(scenario, 0.0);
	const auto samples = visual_physics::relativity::build_samples(scenario, 12);
	const visual_physics::relativity::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_comparison_curve = false,
		.show_active_marker = true,
	};
	const auto payload = visual_physics::relativity::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-03T00:00:00.000Z");
	const auto imported = visual_physics::relativity::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::relativity::sample_scenario(imported.scenario, imported.time_seconds);

	EXPECT_EQ(imported.scenario.id, visual_physics::relativity::ScenarioId::RelativisticDoppler);
	ASSERT_TRUE(imported.scenario.emitted_frequency_hertz.has_value());
	ASSERT_TRUE(imported.scenario.source_velocity_fraction_of_light.has_value());
	ASSERT_TRUE(imported.scenario.observer_velocity_fraction_of_light.has_value());
	EXPECT_NEAR(imported.time_seconds, 0.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.emitted_frequency_hertz, 523.25, 1e-9);
	EXPECT_NEAR(*imported.scenario.source_velocity_fraction_of_light, 0.28, 1e-9);
	EXPECT_NEAR(*imported.scenario.observer_velocity_fraction_of_light, -0.1, 1e-9);
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_FALSE(imported.overlays->show_comparison_curve);
	EXPECT_TRUE(imported.overlays->show_active_marker);
	EXPECT_NEAR(
		roundtrip_snapshot.observed_frequency_hertz.value_or(0.0),
		snapshot.observed_frequency_hertz.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.classical_observed_frequency_hertz.value_or(0.0),
		snapshot.classical_observed_frequency_hertz.value_or(0.0),
		1e-9);
}

TEST(RelativityReport, BuildsDopplerSummaryFirstCsv) {
	const auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::RelativisticDoppler);
	const auto snapshot = visual_physics::relativity::sample_scenario(scenario, 0.0);
	const auto samples = visual_physics::relativity::build_samples(scenario, 12);
	const auto csv = visual_physics::relativity::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("\"summary\",\"observed_frequency_hz\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"classical_frequency_hz\""), std::string::npos);
	EXPECT_NE(csv.find("relativistic-doppler-curve"), std::string::npos);
}

TEST(RelativityCore, ComputesGravitationalTimeDilationDiagnostics) {
	const auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::GravitationalTimeDilation);
	const auto snapshot = visual_physics::relativity::sample_scenario(scenario, 1.0);

	EXPECT_NEAR(snapshot.time_seconds, 1.0, 1e-9);
	EXPECT_NEAR(snapshot.central_mass_solar_masses.value_or(0.0), 1.0, 1e-9);
	EXPECT_NEAR(snapshot.orbital_radius_schwarzschild_radii.value_or(0.0), 6.0, 1e-9);
	EXPECT_GT(snapshot.gravitational_time_factor.value_or(0.0), 0.0);
	EXPECT_LT(snapshot.local_elapsed_time_seconds.value_or(0.0), snapshot.time_seconds);
	EXPECT_TRUE(snapshot.stable);

	const auto samples = visual_physics::relativity::build_samples(scenario, 40);
	ASSERT_EQ(samples.size(), 41U);
	EXPECT_EQ(samples.front().label, "gravitational-time-dilation-curve");
	EXPECT_TRUE(samples.front().secondary_value.has_value());
	const auto active_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	ASSERT_NE(active_it, samples.end());
	EXPECT_NEAR(active_it->position, 6.0, 0.15);
	EXPECT_GT(active_it->primary_value, 0.0);
	EXPECT_LT(active_it->primary_value, 1.0);
}

TEST(RelativityPayload, RoundTripsGravitationalScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::GravitationalTimeDilation);
	scenario.central_mass_solar_masses = 4.0;
	scenario.orbital_radius_schwarzschild_radii = 8.5;
	scenario.coordinate_time_seconds = 2.5;
	const auto snapshot = visual_physics::relativity::sample_scenario(
		scenario,
		scenario.coordinate_time_seconds.value_or(0.0));
	const auto samples = visual_physics::relativity::build_samples_at_time(scenario, 2.5, 12);
	const visual_physics::relativity::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_comparison_curve = true,
		.show_active_marker = false,
	};
	const auto payload = visual_physics::relativity::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-03T00:00:00.000Z");
	const auto imported = visual_physics::relativity::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::relativity::sample_scenario(imported.scenario, imported.time_seconds);

	EXPECT_EQ(imported.scenario.id, visual_physics::relativity::ScenarioId::GravitationalTimeDilation);
	ASSERT_TRUE(imported.scenario.central_mass_solar_masses.has_value());
	ASSERT_TRUE(imported.scenario.orbital_radius_schwarzschild_radii.has_value());
	ASSERT_TRUE(imported.scenario.coordinate_time_seconds.has_value());
	EXPECT_NEAR(imported.time_seconds, 2.5, 1e-9);
	EXPECT_NEAR(*imported.scenario.central_mass_solar_masses, 4.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.orbital_radius_schwarzschild_radii, 8.5, 1e-9);
	EXPECT_NEAR(*imported.scenario.coordinate_time_seconds, 2.5, 1e-9);
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_TRUE(imported.overlays->show_comparison_curve);
	EXPECT_FALSE(imported.overlays->show_active_marker);
	EXPECT_NEAR(
		roundtrip_snapshot.gravitational_time_factor.value_or(0.0),
		snapshot.gravitational_time_factor.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.local_elapsed_time_seconds.value_or(0.0),
		snapshot.local_elapsed_time_seconds.value_or(0.0),
		1e-9);
}

TEST(RelativityReport, BuildsGravitationalSummaryFirstCsv) {
	const auto scenario = visual_physics::relativity::make_default_scenario(
		visual_physics::relativity::ScenarioId::GravitationalTimeDilation);
	const auto snapshot = visual_physics::relativity::sample_scenario(scenario, 1.0);
	const auto samples = visual_physics::relativity::build_samples_at_time(scenario, 1.0, 12);
	const auto csv = visual_physics::relativity::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("\"summary\",\"gravitational_factor\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"local_elapsed_time_s\""), std::string::npos);
	EXPECT_NE(csv.find("gravitational-time-dilation-curve"), std::string::npos);
}

TEST(AstrophysicsCore, ComputesPlanetaryOrbitDiagnostics) {
	const auto scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::PlanetaryOrbit);
	const auto snapshot = visual_physics::astrophysics::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::astrophysics::build_samples_at_time(scenario, 0.2, 48);

	EXPECT_NEAR(snapshot.orbital_radius_astronomical_units.value_or(0.0), 1.0, 1e-9);
	EXPECT_GT(snapshot.orbital_period_days.value_or(0.0), 300.0);
	EXPECT_GT(snapshot.orbital_speed_kilometers_per_second.value_or(0.0), 20.0);
	EXPECT_GT(
		snapshot.escape_speed_kilometers_per_second.value_or(0.0),
		snapshot.orbital_speed_kilometers_per_second.value_or(0.0));
	ASSERT_EQ(samples.size(), 49U);
	EXPECT_EQ(samples.front().label, "planetary-orbit-trajectory");
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	EXPECT_TRUE(snapshot.stable);
}

TEST(AstrophysicsCore, ComputesStellarAndHubbleDiagnostics) {
	const auto stellar = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::StellarLuminosity);
	const auto stellar_snapshot = visual_physics::astrophysics::sample_scenario(stellar, 0.4);
	const auto stellar_samples =
		visual_physics::astrophysics::build_samples_at_time(stellar, 0.4, 32);

	EXPECT_NEAR(stellar_snapshot.luminosity_solar_units.value_or(0.0), 1.0, 1e-6);
	EXPECT_GT(
		stellar_snapshot.habitable_zone_outer_astronomical_units.value_or(0.0),
		stellar_snapshot.habitable_zone_inner_astronomical_units.value_or(0.0));
	ASSERT_EQ(stellar_samples.size(), 33U);
	EXPECT_EQ(
		std::count_if(stellar_samples.begin(), stellar_samples.end(), [](const auto& sample) { return sample.active; }),
		1);

	const auto hubble = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::HubbleExpansion);
	const auto hubble_snapshot = visual_physics::astrophysics::sample_scenario(hubble, 0.6);
	const auto hubble_samples =
		visual_physics::astrophysics::build_samples_at_time(hubble, 0.6, 32);

	EXPECT_GT(hubble_snapshot.recession_velocity_kilometers_per_second.value_or(0.0), 0.0);
	EXPECT_GT(hubble_snapshot.redshift.value_or(0.0), 0.0);
	ASSERT_EQ(hubble_samples.size(), 33U);
	EXPECT_EQ(
		std::count_if(hubble_samples.begin(), hubble_samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	EXPECT_EQ(hubble_samples.front().label, "hubble-expansion-curve");
}

TEST(AtmosphericCore, ComputesBarometricDiagnostics) {
	const auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::BarometricFormula);
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::atmospheric::build_samples(scenario, 16);

	ASSERT_TRUE(snapshot.altitude_kilometers.has_value());
	ASSERT_TRUE(snapshot.pressure_kilopascals.has_value());
	ASSERT_TRUE(snapshot.relative_density.has_value());
	EXPECT_NEAR(*snapshot.altitude_kilometers, 2.4, 1e-9);
	EXPECT_LT(*snapshot.pressure_kilopascals, scenario.sea_level_pressure_kilopascals.value_or(0.0));
	EXPECT_NEAR(
		*snapshot.relative_density,
		*snapshot.pressure_kilopascals / scenario.sea_level_pressure_kilopascals.value_or(1.0),
		1e-9);
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 17U);
	EXPECT_EQ(samples.front().label, "barometric-pressure-profile");
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	EXPECT_TRUE(samples[3].active);
}

TEST(AtmosphericCore, ComputesAdiabaticLapseDiagnostics) {
	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate);
	scenario.surface_temperature_kelvin = 290.0;
	scenario.lapse_rate_kelvin_per_kilometer = 8.0;
	scenario.tropopause_height_kilometers = 12.5;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.4);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.4, 20);

	ASSERT_TRUE(snapshot.altitude_kilometers.has_value());
	ASSERT_TRUE(snapshot.temperature_kelvin.has_value());
	ASSERT_TRUE(snapshot.reference_temperature_kelvin.has_value());
	ASSERT_TRUE(snapshot.tropopause_height_kilometers.has_value());
	EXPECT_NEAR(*snapshot.altitude_kilometers, 4.8, 1e-9);
	EXPECT_NEAR(*snapshot.temperature_kelvin, 251.6, 1e-9);
	EXPECT_NEAR(*snapshot.reference_temperature_kelvin, 258.8, 1e-9);
	EXPECT_NEAR(*snapshot.tropopause_height_kilometers, 12.5, 1e-9);
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 21U);
	EXPECT_EQ(samples.front().label, "adiabatic-temperature-profile");
	ASSERT_TRUE(samples[8].secondary_value.has_value());
	EXPECT_NEAR(samples[8].position, 4.8, 1e-9);
	EXPECT_NEAR(samples[8].primary_value, 251.6, 1e-9);
	EXPECT_NEAR(*samples[8].secondary_value, 258.8, 1e-9);
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	EXPECT_TRUE(samples[8].active);
}

TEST(AtmosphericCore, ComputesConvectionColumnDiagnostics) {
	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::ConvectionColumn);
	scenario.surface_temperature_kelvin = 305.0;
	scenario.environmental_lapse_rate_kelvin_per_kilometer = 7.0;
	scenario.parcel_temperature_excess_kelvin = 4.0;
	scenario.column_height_kilometers = 10.0;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.35, 20);

	ASSERT_TRUE(snapshot.temperature_kelvin.has_value());
	ASSERT_TRUE(snapshot.parcel_altitude_kilometers.has_value());
	ASSERT_TRUE(snapshot.buoyancy_acceleration_meters_per_second_squared.has_value());
	ASSERT_TRUE(snapshot.updraft_velocity_meters_per_second.has_value());
	ASSERT_TRUE(snapshot.convective_available_potential_energy_kilojoules_per_kilogram.has_value());
	EXPECT_NEAR(*snapshot.parcel_altitude_kilometers, 3.5, 1e-9);
	EXPECT_NEAR(*snapshot.temperature_kelvin, 280.5, 1e-9);
	EXPECT_GT(*snapshot.buoyancy_acceleration_meters_per_second_squared, 0.0);
	EXPECT_GT(*snapshot.updraft_velocity_meters_per_second, 0.0);
	EXPECT_GT(*snapshot.convective_available_potential_energy_kilojoules_per_kilogram, 0.0);
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 21U);
	EXPECT_EQ(samples.front().label, "convection-updraft-profile");
	ASSERT_TRUE(samples.front().secondary_value.has_value());
	EXPECT_GT(*samples.front().secondary_value, 0.0);
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	EXPECT_TRUE(samples[7].active);
}

TEST(SolidStateCore, ComputesCrystalDiagnostics) {
	const auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.45);
	const auto samples = visual_physics::solid_state::build_samples(scenario, 16);

	ASSERT_TRUE(snapshot.strain_percent.has_value());
	ASSERT_TRUE(snapshot.stress_megapascals.has_value());
	ASSERT_TRUE(snapshot.elastic_energy_density_megajoules_per_cubic_meter.has_value());
	EXPECT_NEAR(*snapshot.strain_percent, 0.72, 1e-9);
	EXPECT_NEAR(*snapshot.stress_megapascals, 1512.0, 1e-6);
	EXPECT_GT(*snapshot.elastic_energy_density_megajoules_per_cubic_meter, 0.0);
	EXPECT_FALSE(snapshot.stable);

	ASSERT_EQ(samples.size(), 17U);
	EXPECT_EQ(samples.front().label, "crystal-stress-strain-profile");
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	ASSERT_TRUE(samples[7].secondary_value.has_value());
	EXPECT_NEAR(*samples[7].secondary_value, 185.0, 1e-9);
}

TEST(SolidStateCore, ComputesPhononDiagnostics) {
	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	scenario.spring_constant_newtons_per_meter = 24.0;
	scenario.atomic_mass_amu = 32.0;
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.5);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.5, 20);
	const auto default_time_samples = visual_physics::solid_state::build_samples(scenario, 20);

	ASSERT_TRUE(snapshot.wave_vector_fraction.has_value());
	ASSERT_TRUE(snapshot.acoustic_frequency_terahertz.has_value());
	ASSERT_TRUE(snapshot.optical_frequency_terahertz.has_value());
	ASSERT_TRUE(snapshot.group_velocity_kilometers_per_second.has_value());
	EXPECT_NEAR(*snapshot.wave_vector_fraction, 0.5, 1e-9);
	EXPECT_GT(*snapshot.acoustic_frequency_terahertz, 0.0);
	EXPECT_GT(*snapshot.optical_frequency_terahertz, *snapshot.acoustic_frequency_terahertz);
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 21U);
	EXPECT_EQ(samples.front().label, "phonon-dispersion-profile");
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	ASSERT_TRUE(samples[10].secondary_value.has_value());
	EXPECT_TRUE(samples[10].active);
	EXPECT_EQ(
		std::count_if(
			default_time_samples.begin(),
			default_time_samples.end(),
			[](const auto& sample) { return sample.active; }),
		1);
	EXPECT_TRUE(default_time_samples[11].active);
	EXPECT_NEAR(default_time_samples[11].position, 0.55, 1e-9);
}

TEST(SolidStateCore, ComputesElectronicDiagnostics) {
	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	scenario.band_gap_electron_volts = 1.3;
	scenario.effective_mass_ratio = 0.18;
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.6);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.6, 20);
	const auto default_time_samples = visual_physics::solid_state::build_samples(scenario, 20);

	ASSERT_TRUE(snapshot.energy_electron_volts.has_value());
	ASSERT_TRUE(snapshot.density_of_states_arbitrary_units.has_value());
	ASSERT_TRUE(snapshot.occupation_probability.has_value());
	EXPECT_GT(*snapshot.energy_electron_volts, 0.0);
	EXPECT_GE(*snapshot.density_of_states_arbitrary_units, 0.0);
	EXPECT_GT(*snapshot.occupation_probability, 0.0);
	EXPECT_LE(*snapshot.occupation_probability, 1.0);
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 21U);
	EXPECT_EQ(samples.front().label, "electronic-density-of-states-profile");
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	ASSERT_TRUE(samples.front().secondary_value.has_value());
	EXPECT_EQ(
		std::count_if(
			default_time_samples.begin(),
			default_time_samples.end(),
			[](const auto& sample) { return sample.active; }),
		1);
	EXPECT_TRUE(default_time_samples[12].active);
	EXPECT_NEAR(default_time_samples[12].position, snapshot.energy_electron_volts.value_or(0.0), 1e-9);
	ASSERT_TRUE(default_time_samples.front().secondary_value.has_value());
}

TEST(NuclearAndParticlePhysicsCore, ComputesDecayDiagnostics) {
	const auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::nuclear_and_particle_physics::build_samples(scenario, 20);

	ASSERT_TRUE(snapshot.elapsed_hours.has_value());
	ASSERT_TRUE(snapshot.remaining_population_trillions.has_value());
	ASSERT_TRUE(snapshot.remaining_fraction.has_value());
	ASSERT_TRUE(snapshot.activity_terabecquerels.has_value());
	EXPECT_NEAR(*snapshot.elapsed_hours, 25.2, 1e-9);
	EXPECT_NEAR(*snapshot.remaining_fraction, 0.37892914162759955, 1e-9);
	EXPECT_NEAR(*snapshot.remaining_population_trillions, 2.349360678090, 1e-9);
	EXPECT_GT(*snapshot.activity_terabecquerels, 0.0);
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 21U);
	EXPECT_EQ(samples.front().label, "radioactive-decay-profile");
	ASSERT_TRUE(samples.front().secondary_value.has_value());
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
	EXPECT_TRUE(samples[7].active);
	EXPECT_NEAR(samples[7].position, 25.2, 1e-9);
}

TEST(NuclearAndParticlePhysicsCore, ComputesBindingDiagnostics) {
	const auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.45);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.45, 20);

	ASSERT_TRUE(snapshot.total_binding_energy_mev.has_value());
	ASSERT_TRUE(snapshot.stability_index.has_value());
	EXPECT_NEAR(*snapshot.total_binding_energy_mev, 484.0, 1e-9);
	EXPECT_NEAR(*snapshot.stability_index, 0.9618181818181818, 1e-9);
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 21U);
	EXPECT_EQ(samples.front().label, "binding-energy-curve-profile");
	ASSERT_TRUE(samples.front().secondary_value.has_value());
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
}

TEST(NuclearAndParticlePhysicsCore, ComputesCollisionDiagnostics) {
	const auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::ProtonProtonCollision);
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.55);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.55, 20);

	ASSERT_TRUE(snapshot.invariant_mass_gev.has_value());
	ASSERT_TRUE(snapshot.transverse_momentum_gev.has_value());
	ASSERT_TRUE(snapshot.pseudorapidity.has_value());
	EXPECT_GT(*snapshot.invariant_mass_gev, 0.0);
	EXPECT_GT(*snapshot.transverse_momentum_gev, 0.0);
	EXPECT_TRUE(std::isfinite(*snapshot.pseudorapidity));
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 21U);
	EXPECT_EQ(samples.front().label, "proton-proton-collision-profile");
	ASSERT_TRUE(samples.front().secondary_value.has_value());
	EXPECT_EQ(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		1);
}

TEST(AstrophysicsPayload, RoundTripsPlanetaryScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::PlanetaryOrbit);
	scenario.central_mass_solar_masses = 1.4;
	scenario.orbital_radius_astronomical_units = 1.8;
	scenario.orbital_eccentricity = 0.2;
	const auto snapshot = visual_physics::astrophysics::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::astrophysics::build_samples_at_time(scenario, 0.35, 16);
	const visual_physics::astrophysics::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_active_marker = false,
		.show_comparison_band = true,
	};
	const auto payload = visual_physics::astrophysics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-03T00:00:00.000Z");
	const auto imported = visual_physics::astrophysics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::astrophysics::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::astrophysics::build_samples_at_time(imported.scenario, imported.time_seconds, 16);

	EXPECT_EQ(imported.scenario.id, visual_physics::astrophysics::ScenarioId::PlanetaryOrbit);
	ASSERT_TRUE(imported.scenario.central_mass_solar_masses.has_value());
	ASSERT_TRUE(imported.scenario.orbital_radius_astronomical_units.has_value());
	ASSERT_TRUE(imported.scenario.orbital_eccentricity.has_value());
	EXPECT_NEAR(*imported.scenario.central_mass_solar_masses, 1.4, 1e-9);
	EXPECT_NEAR(*imported.scenario.orbital_radius_astronomical_units, 1.8, 1e-9);
	EXPECT_NEAR(*imported.scenario.orbital_eccentricity, 0.2, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.35, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_FALSE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_NEAR(
		roundtrip_snapshot.orbital_period_days.value_or(0.0),
		snapshot.orbital_period_days.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_EQ(roundtrip_samples.front().label, "planetary-orbit-trajectory");
}

TEST(AstrophysicsPayload, RejectsNonFiniteSnapshotTime) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "planetary-orbit",
	    "name": "Planetary Orbit Explorer",
	    "summary": "Estimate circular and low-eccentricity orbital diagnostics for a planet around a single star.",
	    "equationSummary": "T = 2 pi sqrt(r^3 / GM), v = sqrt(GM / r)",
	    "status": "Initial orbit slice in progress",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -1.6, "maxX": 1.6, "minY": -1.6, "maxY": 1.6 },
	    "focusArea": "Orbital period, orbital speed, escape-speed comparison, and deterministic sampled orbit geometry.",
	    "centralMassSolarMasses": 1,
	    "orbitalRadiusAstronomicalUnits": 1,
	    "orbitalEccentricity": 0.12
	  },
	  "snapshot": { "timeSeconds": 1e999 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::astrophysics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(AstrophysicsReport, BuildsSummaryFirstCsv) {
	const auto scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::PlanetaryOrbit);
	const auto snapshot = visual_physics::astrophysics::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::astrophysics::build_samples_at_time(scenario, 0.2, 12);
	const auto csv = visual_physics::astrophysics::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"orbital_period_days\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"specific_orbital_energy_mj_kg\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("planetary-orbit-trajectory"), std::string::npos);
}

TEST(AtmosphericPayload, RoundTripsBarometricScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::BarometricFormula);
	scenario.sea_level_pressure_kilopascals = 99.8;
	scenario.scale_height_kilometers = 7.6;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.35, 16);
	const visual_physics::atmospheric::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_active_marker = false,
		.show_comparison_band = true,
	};
	const auto payload = visual_physics::atmospheric::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::atmospheric::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::atmospheric::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::atmospheric::build_samples_at_time(imported.scenario, imported.time_seconds, 16);

	EXPECT_EQ(imported.scenario.id, visual_physics::atmospheric::ScenarioId::BarometricFormula);
	ASSERT_TRUE(imported.scenario.sea_level_pressure_kilopascals.has_value());
	ASSERT_TRUE(imported.scenario.scale_height_kilometers.has_value());
	EXPECT_NEAR(*imported.scenario.sea_level_pressure_kilopascals, 99.8, 1e-9);
	EXPECT_NEAR(*imported.scenario.scale_height_kilometers, 7.6, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.35, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_FALSE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_NEAR(
		roundtrip_snapshot.pressure_kilopascals.value_or(0.0),
		snapshot.pressure_kilopascals.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.relative_density.value_or(0.0),
		snapshot.relative_density.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_EQ(roundtrip_samples.front().label, "barometric-pressure-profile");
}

TEST(AtmosphericPayload, RoundTripsAdiabaticScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate);
	scenario.surface_temperature_kelvin = 292.0;
	scenario.lapse_rate_kelvin_per_kilometer = 8.7;
	scenario.tropopause_height_kilometers = 12.8;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.25);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.25, 16);
	const visual_physics::atmospheric::OverlayOptions overlays{
		.show_reference_guides = false,
		.show_active_marker = true,
		.show_comparison_band = true,
	};
	const auto payload = visual_physics::atmospheric::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::atmospheric::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::atmospheric::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::atmospheric::build_samples_at_time(imported.scenario, imported.time_seconds, 16);

	EXPECT_EQ(imported.scenario.id, visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate);
	ASSERT_TRUE(imported.scenario.surface_temperature_kelvin.has_value());
	ASSERT_TRUE(imported.scenario.lapse_rate_kelvin_per_kilometer.has_value());
	ASSERT_TRUE(imported.scenario.tropopause_height_kilometers.has_value());
	EXPECT_NEAR(*imported.scenario.surface_temperature_kelvin, 292.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.lapse_rate_kelvin_per_kilometer, 8.7, 1e-9);
	EXPECT_NEAR(*imported.scenario.tropopause_height_kilometers, 12.8, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.25, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_FALSE(imported.overlays->show_reference_guides);
	EXPECT_TRUE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_NEAR(
		roundtrip_snapshot.temperature_kelvin.value_or(0.0),
		snapshot.temperature_kelvin.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.reference_temperature_kelvin.value_or(0.0),
		snapshot.reference_temperature_kelvin.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_EQ(roundtrip_samples.front().label, "adiabatic-temperature-profile");
	ASSERT_TRUE(roundtrip_samples.front().secondary_value.has_value());
}

TEST(AtmosphericPayload, RejectsNonFiniteSnapshotTime) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "barometric-formula",
	    "name": "Barometric Formula",
	    "summary": "Estimate how hydrostatic pressure and relative density decrease with altitude in a simple atmospheric column.",
	    "equationSummary": "P(z) = P0 exp(-z / H)",
	    "status": "Validated vertical slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 12, "minY": 0, "maxY": 105 },
	    "focusArea": "Hydrostatic pressure profile, scale-height intuition, and active altitude inspection.",
	    "seaLevelPressureKilopascals": 101.325,
	    "scaleHeightKilometers": 8.4
	  },
	  "snapshot": { "timeSeconds": 1e999 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::atmospheric::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(AtmosphericPayload, RoundTripsConvectionScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::ConvectionColumn);
	scenario.surface_temperature_kelvin = 304.0;
	scenario.environmental_lapse_rate_kelvin_per_kilometer = 7.1;
	scenario.parcel_temperature_excess_kelvin = 4.2;
	scenario.column_height_kilometers = 10.5;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.45);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.45, 16);
	const visual_physics::atmospheric::OverlayOptions overlays{
		.show_reference_guides = false,
		.show_active_marker = true,
		.show_comparison_band = true,
	};
	const auto payload = visual_physics::atmospheric::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::atmospheric::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::atmospheric::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::atmospheric::build_samples_at_time(imported.scenario, imported.time_seconds, 16);

	EXPECT_EQ(imported.scenario.id, visual_physics::atmospheric::ScenarioId::ConvectionColumn);
	ASSERT_TRUE(imported.scenario.surface_temperature_kelvin.has_value());
	ASSERT_TRUE(imported.scenario.environmental_lapse_rate_kelvin_per_kilometer.has_value());
	ASSERT_TRUE(imported.scenario.parcel_temperature_excess_kelvin.has_value());
	ASSERT_TRUE(imported.scenario.column_height_kilometers.has_value());
	EXPECT_NEAR(*imported.scenario.surface_temperature_kelvin, 304.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.environmental_lapse_rate_kelvin_per_kilometer, 7.1, 1e-9);
	EXPECT_NEAR(*imported.scenario.parcel_temperature_excess_kelvin, 4.2, 1e-9);
	EXPECT_NEAR(*imported.scenario.column_height_kilometers, 10.5, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.45, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_FALSE(imported.overlays->show_reference_guides);
	EXPECT_TRUE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_NEAR(
		roundtrip_snapshot.updraft_velocity_meters_per_second.value_or(0.0),
		snapshot.updraft_velocity_meters_per_second.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_EQ(roundtrip_samples.front().label, "convection-updraft-profile");
}

TEST(AtmosphericPayload, RejectsMissingConvectionField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "convection-column",
	    "name": "Convection Column",
	    "summary": "Follow a warm parcel rising through an atmospheric column with buoyancy, updraft, and CAPE-style diagnostics.",
	    "equationSummary": "a_b approx g * Delta T / T, w approx sqrt(2 * CAPE)",
	    "status": "Validated vertical slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 10, "minY": 0, "maxY": 22 },
	    "focusArea": "Parcel ascent, buoyancy acceleration, and updraft evolution across a convective column.",
	    "surfaceTemperatureKelvin": 300,
	    "environmentalLapseRateKelvinPerKilometer": 6.5,
	    "columnHeightKilometers": 9
	  },
	  "snapshot": { "timeSeconds": 0.25 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::atmospheric::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RoundTripsCrystalScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	scenario.max_strain_percent = 1.8;
	scenario.youngs_modulus_gigapascals = 195.0;
	scenario.yield_strength_megapascals = 210.0;
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.30);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.30, 16);
	const visual_physics::solid_state::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_active_marker = false,
		.show_comparison_band = true,
	};
	const auto payload = visual_physics::solid_state::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::solid_state::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::solid_state::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::solid_state::build_samples_at_time(imported.scenario, imported.time_seconds, 16);

	EXPECT_EQ(imported.scenario.id, visual_physics::solid_state::ScenarioId::CrystalElasticity);
	ASSERT_TRUE(imported.scenario.max_strain_percent.has_value());
	ASSERT_TRUE(imported.scenario.youngs_modulus_gigapascals.has_value());
	ASSERT_TRUE(imported.scenario.yield_strength_megapascals.has_value());
	EXPECT_NEAR(*imported.scenario.max_strain_percent, 1.8, 1e-9);
	EXPECT_NEAR(*imported.scenario.youngs_modulus_gigapascals, 195.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.yield_strength_megapascals, 210.0, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.30, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_FALSE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_NEAR(
		roundtrip_snapshot.stress_megapascals.value_or(0.0),
		snapshot.stress_megapascals.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_EQ(roundtrip_samples.front().label, "crystal-stress-strain-profile");
}

TEST(SolidStatePayload, RoundTripsPhononScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	scenario.lattice_spacing_nanometers = 0.58;
	scenario.spring_constant_newtons_per_meter = 26.0;
	scenario.atomic_mass_amu = 34.0;
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.45);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.45, 16);
	const visual_physics::solid_state::OverlayOptions overlays{
		.show_reference_guides = false,
		.show_active_marker = true,
		.show_comparison_band = true,
	};
	const auto payload = visual_physics::solid_state::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::solid_state::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::solid_state::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::solid_state::build_samples_at_time(imported.scenario, imported.time_seconds, 16);

	EXPECT_EQ(imported.scenario.id, visual_physics::solid_state::ScenarioId::PhononDispersion);
	ASSERT_TRUE(imported.scenario.lattice_spacing_nanometers.has_value());
	ASSERT_TRUE(imported.scenario.spring_constant_newtons_per_meter.has_value());
	ASSERT_TRUE(imported.scenario.atomic_mass_amu.has_value());
	EXPECT_NEAR(*imported.scenario.lattice_spacing_nanometers, 0.58, 1e-9);
	EXPECT_NEAR(*imported.scenario.spring_constant_newtons_per_meter, 26.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.atomic_mass_amu, 34.0, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.45, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_FALSE(imported.overlays->show_reference_guides);
	EXPECT_TRUE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_NEAR(
		roundtrip_snapshot.acoustic_frequency_terahertz.value_or(0.0),
		snapshot.acoustic_frequency_terahertz.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.group_velocity_kilometers_per_second.value_or(0.0),
		snapshot.group_velocity_kilometers_per_second.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_EQ(roundtrip_samples.front().label, "phonon-dispersion-profile");
	ASSERT_TRUE(roundtrip_samples[8].secondary_value.has_value());
	EXPECT_NEAR(
		roundtrip_samples[8].secondary_value.value_or(0.0),
		samples[8].secondary_value.value_or(0.0),
		1e-9);
}

TEST(SolidStatePayload, SerializesPhononExportPayloadWithAngularCompatibleShape) {
	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	scenario.lattice_spacing_nanometers = 0.58;
	scenario.spring_constant_newtons_per_meter = 26.0;
	scenario.atomic_mass_amu = 34.0;
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.45);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.45, 16);
	const visual_physics::solid_state::OverlayOptions overlays{
		.show_reference_guides = false,
		.show_active_marker = true,
		.show_comparison_band = true,
	};
	const auto payload = visual_physics::solid_state::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");

	const auto parsed = nlohmann::json::parse(payload);

	EXPECT_EQ(parsed.at("exportedAt").get<std::string>(), "2026-06-04T00:00:00.000Z");
	EXPECT_EQ(parsed.at("scenario").at("id").get<std::string>(), "phonon-dispersion");
	EXPECT_NEAR(parsed.at("snapshot").at("timeSeconds").get<double>(), 0.45, 1e-9);
	EXPECT_EQ(parsed.at("snapshot").at("stable").get<bool>(), snapshot.stable);
	EXPECT_EQ(parsed.at("overlays").at("showReferenceGuides").get<bool>(), false);
	EXPECT_EQ(parsed.at("overlays").at("showActiveMarker").get<bool>(), true);
	EXPECT_EQ(parsed.at("overlays").at("showComparisonBand").get<bool>(), true);
	ASSERT_TRUE(parsed.at("samples").is_array());
	ASSERT_EQ(parsed.at("samples").size(), samples.size());
	EXPECT_EQ(parsed.at("samples").at(0).at("label").get<std::string>(), "phonon-dispersion-profile");
	EXPECT_EQ(parsed.at("samples").at(0).at("active").get<bool>(), samples.front().active);
	EXPECT_NEAR(
		parsed.at("samples").at(8).at("secondaryValue").get<double>(),
		samples[8].secondary_value.value_or(0.0),
		1e-9);
}

TEST(SolidStatePayload, RoundTripsElectronicScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	scenario.band_gap_electron_volts = 1.45;
	scenario.effective_mass_ratio = 0.28;
	scenario.dopant_density_per_cubic_centimeter = 1.9e16;
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.55);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.55, 16);
	const visual_physics::solid_state::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_active_marker = true,
		.show_comparison_band = false,
	};
	const auto payload = visual_physics::solid_state::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::solid_state::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::solid_state::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::solid_state::build_samples_at_time(imported.scenario, imported.time_seconds, 16);

	EXPECT_EQ(imported.scenario.id, visual_physics::solid_state::ScenarioId::ElectronicStructure);
	ASSERT_TRUE(imported.scenario.band_gap_electron_volts.has_value());
	ASSERT_TRUE(imported.scenario.effective_mass_ratio.has_value());
	ASSERT_TRUE(imported.scenario.dopant_density_per_cubic_centimeter.has_value());
	EXPECT_NEAR(*imported.scenario.band_gap_electron_volts, 1.45, 1e-9);
	EXPECT_NEAR(*imported.scenario.effective_mass_ratio, 0.28, 1e-9);
	EXPECT_NEAR(*imported.scenario.dopant_density_per_cubic_centimeter, 1.9e16, 1e-3);
	EXPECT_NEAR(imported.time_seconds, 0.55, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_TRUE(imported.overlays->show_active_marker);
	EXPECT_FALSE(imported.overlays->show_comparison_band);
	EXPECT_NEAR(
		roundtrip_snapshot.energy_electron_volts.value_or(0.0),
		snapshot.energy_electron_volts.value_or(0.0),
		1e-9);
	EXPECT_NEAR(
		roundtrip_snapshot.occupation_probability.value_or(0.0),
		snapshot.occupation_probability.value_or(0.0),
		1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_EQ(roundtrip_samples.front().label, "electronic-density-of-states-profile");
	ASSERT_TRUE(roundtrip_samples.front().secondary_value.has_value());
	EXPECT_NEAR(
		roundtrip_samples.front().secondary_value.value_or(0.0),
		samples.front().secondary_value.value_or(0.0),
		1e-9);
}

TEST(SolidStatePayload, AcceptsMissingOrNullOverlays) {
	const auto missing_overlays = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";
	const auto null_overlays = R"json({
	  "scenario": {
	    "id": "electronic-structure",
	    "name": "Electronic Structure",
	    "summary": "Inspect a simplified band-gap and density-of-states view with a live occupation estimate.",
	    "equationSummary": "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
	    "status": "Validated carrier slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -1.5, "maxX": 2.5, "minY": 0, "maxY": 1.4 },
	    "focusArea": "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
	    "bandGapElectronVolts": 1.1,
	    "effectiveMassRatio": 0.22,
	    "dopantDensityPerCubicCentimeter": 8e15
	  },
	  "snapshot": { "timeSeconds": 0.60 },
	  "overlays": null
	})json";

	const auto imported_missing = visual_physics::solid_state::parse_import_payload(missing_overlays);
	const auto imported_null = visual_physics::solid_state::parse_import_payload(null_overlays);

	EXPECT_EQ(imported_missing.scenario.id, visual_physics::solid_state::ScenarioId::CrystalElasticity);
	EXPECT_NEAR(imported_missing.time_seconds, 0.30, 1e-9);
	EXPECT_FALSE(imported_missing.overlays.has_value());
	EXPECT_EQ(imported_null.scenario.id, visual_physics::solid_state::ScenarioId::ElectronicStructure);
	EXPECT_NEAR(imported_null.time_seconds, 0.60, 1e-9);
	EXPECT_FALSE(imported_null.overlays.has_value());
}

TEST(NuclearAndParticlePhysicsPayload, RoundTripsDecayScenarioSnapshotSamplesAndOverlays) {
	auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
		visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
	scenario.half_life_hours = 24.0;
	scenario.initial_population_trillions = 7.4;
	const auto snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.30);
	const auto samples =
		visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.30, 16);
	const visual_physics::nuclear_and_particle_physics::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_active_marker = false,
		.show_comparison_band = true,
	};
	const auto payload = visual_physics::nuclear_and_particle_physics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::nuclear_and_particle_physics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::nuclear_and_particle_physics::sample_scenario(imported.scenario, imported.time_seconds);

	EXPECT_EQ(
		imported.scenario.id,
		visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
	ASSERT_TRUE(imported.scenario.half_life_hours.has_value());
	ASSERT_TRUE(imported.scenario.initial_population_trillions.has_value());
	EXPECT_NEAR(*imported.scenario.half_life_hours, 24.0, 1e-9);
	EXPECT_NEAR(*imported.scenario.initial_population_trillions, 7.4, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.30, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_FALSE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_NEAR(
		roundtrip_snapshot.remaining_fraction.value_or(0.0),
		snapshot.remaining_fraction.value_or(0.0),
		1e-9);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonFiniteSnapshotTime) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "proton-proton-collision",
	    "name": "Proton-Proton Collision",
	    "summary": "Estimate invariant mass, transverse momentum, and detector reach for a simplified collider event.",
	    "equationSummary": "m_inv approx 2E sin(theta/2), pT approx E sin(theta/2)",
	    "status": "Starter collider slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 5, "maxX": 175, "minY": 0, "maxY": 14 },
	    "focusArea": "Beam energy, scattering angle, and detector scale in a first particle-physics event view.",
	    "beamEnergyGeV": 6.5,
	    "scatteringAngleDegrees": 28,
	    "detectorRadiusMeters": 1.4
	  },
	  "snapshot": { "timeSeconds": 1e999 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingSnapshotTime) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "radioactive-decay",
	    "name": "Radioactive Decay",
	    "summary": "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 72, "minY": 0, "maxY": 6.5 },
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": {}
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonFiniteViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "binding-energy-curve",
	    "name": "Binding Energy Curve",
	    "summary": "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
	    "equationSummary": "E_total approx A * (BE / A)",
	    "status": "Starter nuclear-structure slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 36, "maxX": 1e999, "minY": 0, "maxY": 520 },
	    "focusArea": "Mass-number scaling, proton fraction, and per-nucleon stability context.",
	    "massNumber": 56.0,
	    "protonCount": 26.0,
	    "bindingEnergyPerNucleonMeV": 8.8
	  },
	  "snapshot": { "timeSeconds": 0.45 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingBindingField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "binding-energy-curve",
	    "name": "Binding Energy Curve",
	    "summary": "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
	    "equationSummary": "E_total approx A * (BE / A)",
	    "status": "Starter nuclear-structure slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 36, "maxX": 76, "minY": 0, "maxY": 520 },
	    "focusArea": "Mass-number scaling, proton fraction, and per-nucleon stability context.",
	    "massNumber": 56.0,
	    "protonCount": 26.0
	  },
	  "snapshot": { "timeSeconds": 0.45 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingCollisionField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "proton-proton-collision",
	    "name": "Proton-Proton Collision",
	    "summary": "Estimate invariant mass, transverse momentum, and detector reach for a simplified collider event.",
	    "equationSummary": "m_inv approx 2E sin(theta/2), pT approx E sin(theta/2)",
	    "status": "Starter collider slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 5, "maxX": 175, "minY": 0, "maxY": 14 },
	    "focusArea": "Beam energy, scattering angle, and detector scale in a first particle-physics event view.",
	    "beamEnergyGeV": 6.5,
	    "scatteringAngleDegrees": 28.0
	  },
	  "snapshot": { "timeSeconds": 0.55 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingOverlayField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "radioactive-decay",
	    "name": "Radioactive Decay",
	    "summary": "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 72, "minY": 0, "maxY": 6.5 },
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": {
	    "showReferenceGuides": true,
	    "showActiveMarker": false
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsInvalidScenarioId) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "unknown-nuclear-scenario",
	    "name": "Unknown Nuclear Scenario",
	    "summary": "Test",
	    "equationSummary": "Test",
	    "status": "Test",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 1 },
	    "focusArea": "Test",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingFocusArea) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "proton-proton-collision",
	    "name": "Proton-Proton Collision",
	    "summary": "Estimate invariant mass, transverse momentum, and detector reach for a simplified collider event.",
	    "equationSummary": "m_inv approx 2E sin(theta/2), pT approx E sin(theta/2)",
	    "status": "Starter collider slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 5, "maxX": 175, "minY": 0, "maxY": 14 },
	    "beamEnergyGeV": 6.5,
	    "scatteringAngleDegrees": 28.0,
	    "detectorRadiusMeters": 1.4
	  },
	  "snapshot": { "timeSeconds": 0.55 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "binding-energy-curve",
	    "name": "Binding Energy Curve",
	    "summary": "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
	    "equationSummary": "E_total approx A * (BE / A)",
	    "status": "Starter nuclear-structure slice",
	    "durationSeconds": 1,
	    "focusArea": "Mass-number scaling, proton fraction, and per-nucleon stability context.",
	    "massNumber": 56.0,
	    "protonCount": 26.0,
	    "bindingEnergyPerNucleonMeV": 8.8
	  },
	  "snapshot": { "timeSeconds": 0.45 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonObjectViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "radioactive-decay",
	    "name": "Radioactive Decay",
	    "summary": "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1,
	    "viewBounds": [],
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingViewBoundsMinX) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "binding-energy-curve",
	    "name": "Binding Energy Curve",
	    "summary": "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
	    "equationSummary": "E_total approx A * (BE / A)",
	    "status": "Starter nuclear-structure slice",
	    "durationSeconds": 1,
	    "viewBounds": { "maxX": 76, "minY": 0, "maxY": 520 },
	    "focusArea": "Mass-number scaling, proton fraction, and per-nucleon stability context.",
	    "massNumber": 56.0,
	    "protonCount": 26.0,
	    "bindingEnergyPerNucleonMeV": 8.8
	  },
	  "snapshot": { "timeSeconds": 0.45 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingViewBoundsMaxY) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "proton-proton-collision",
	    "name": "Proton-Proton Collision",
	    "summary": "Estimate invariant mass, transverse momentum, and detector reach for a simplified collider event.",
	    "equationSummary": "m_inv approx 2E sin(theta/2), pT approx E sin(theta/2)",
	    "status": "Starter collider slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 5, "maxX": 175, "minY": 0 },
	    "focusArea": "Beam energy, scattering angle, and detector scale in a first particle-physics event view.",
	    "beamEnergyGeV": 6.5,
	    "scatteringAngleDegrees": 28.0,
	    "detectorRadiusMeters": 1.4
	  },
	  "snapshot": { "timeSeconds": 0.55 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonObjectOverlays) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "radioactive-decay",
	    "name": "Radioactive Decay",
	    "summary": "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 72, "minY": 0, "maxY": 6.5 },
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": []
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingOverlayReferenceGuidesField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "radioactive-decay",
	    "name": "Radioactive Decay",
	    "summary": "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 72, "minY": 0, "maxY": 6.5 },
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": {
	    "showActiveMarker": false,
	    "showComparisonBand": true
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingOverlayComparisonBandField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "binding-energy-curve",
	    "name": "Binding Energy Curve",
	    "summary": "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
	    "equationSummary": "E_total approx A * (BE / A)",
	    "status": "Starter nuclear-structure slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 36, "maxX": 76, "minY": 0, "maxY": 520 },
	    "focusArea": "Mass-number scaling, proton fraction, and per-nucleon stability context.",
	    "massNumber": 56.0,
	    "protonCount": 26.0,
	    "bindingEnergyPerNucleonMeV": 8.8
	  },
	  "snapshot": { "timeSeconds": 0.45 },
	  "overlays": {
	    "showReferenceGuides": true,
	    "showActiveMarker": false
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonFiniteDurationSeconds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "radioactive-decay",
	    "name": "Radioactive Decay",
	    "summary": "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1e999,
	    "viewBounds": { "minX": 0, "maxX": 72, "minY": 0, "maxY": 6.5 },
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingStatus) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "binding-energy-curve",
	    "name": "Binding Energy Curve",
	    "summary": "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
	    "equationSummary": "E_total approx A * (BE / A)",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 36, "maxX": 76, "minY": 0, "maxY": 520 },
	    "focusArea": "Mass-number scaling, proton fraction, and per-nucleon stability context.",
	    "massNumber": 56.0,
	    "protonCount": 26.0,
	    "bindingEnergyPerNucleonMeV": 8.8
	  },
	  "snapshot": { "timeSeconds": 0.45 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingEquationSummary) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "proton-proton-collision",
	    "name": "Proton-Proton Collision",
	    "summary": "Estimate invariant mass, transverse momentum, and detector reach for a simplified collider event.",
	    "status": "Starter collider slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 5, "maxX": 175, "minY": 0, "maxY": 14 },
	    "focusArea": "Beam energy, scattering angle, and detector scale in a first particle-physics event view.",
	    "beamEnergyGeV": 6.5,
	    "scatteringAngleDegrees": 28.0,
	    "detectorRadiusMeters": 1.4
	  },
	  "snapshot": { "timeSeconds": 0.55 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingSummary) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "radioactive-decay",
	    "name": "Radioactive Decay",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 72, "minY": 0, "maxY": 6.5 },
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingName) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "binding-energy-curve",
	    "summary": "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
	    "equationSummary": "E_total approx A * (BE / A)",
	    "status": "Starter nuclear-structure slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 36, "maxX": 76, "minY": 0, "maxY": 520 },
	    "focusArea": "Mass-number scaling, proton fraction, and per-nucleon stability context.",
	    "massNumber": 56.0,
	    "protonCount": 26.0,
	    "bindingEnergyPerNucleonMeV": 8.8
	  },
	  "snapshot": { "timeSeconds": 0.45 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingScenarioId) {
	const auto malformed = R"json({
	  "scenario": {
	    "name": "Radioactive Decay",
	    "summary": "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 72, "minY": 0, "maxY": 6.5 },
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonStringScenarioId) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": 7,
	    "name": "Radioactive Decay",
	    "summary": "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
	    "equationSummary": "N(t) = N0 2^(-t / t1/2), A = lambda N",
	    "status": "Starter decay slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 72, "minY": 0, "maxY": 6.5 },
	    "focusArea": "Half-life intuition, residual population, and activity drop across one shared decay view.",
	    "halfLifeHours": 18.0,
	    "initialPopulationTrillions": 6.2
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonObjectScenarioPayload) {
	const auto malformed = R"json({
	  "scenario": 7,
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonObjectSnapshotPayload) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "binding-energy-curve",
	    "name": "Binding Energy Curve",
	    "summary": "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
	    "equationSummary": "E_total approx A * (BE / A)",
	    "status": "Starter nuclear-structure slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 36, "maxX": 76, "minY": 0, "maxY": 520 },
	    "focusArea": "Mass-number scaling, proton fraction, and per-nucleon stability context.",
	    "massNumber": 56.0,
	    "protonCount": 26.0,
	    "bindingEnergyPerNucleonMeV": 8.8
	  },
	  "snapshot": false
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingScenarioPayload) {
	const auto malformed = R"json({
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsMissingSnapshotPayload) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "proton-proton-collision",
	    "name": "Proton-Proton Collision",
	    "summary": "Estimate invariant mass, transverse momentum, and detector reach for a simplified collider event.",
	    "equationSummary": "m_inv approx 2E sin(theta/2), pT approx E sin(theta/2)",
	    "status": "Starter collider slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 5, "maxX": 175, "minY": 0, "maxY": 14 },
	    "focusArea": "Beam energy, scattering angle, and detector scale in a first particle-physics event view.",
	    "beamEnergyGeV": 6.5,
	    "scatteringAngleDegrees": 28.0,
	    "detectorRadiusMeters": 1.4
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsNonObjectPayload) {
	const auto malformed = R"json([])json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(NuclearAndParticlePhysicsPayload, RejectsInvalidJson) {
	const auto malformed = R"json({)json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::nuclear_and_particle_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingElectronicField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "electronic-structure",
	    "name": "Electronic Structure",
	    "summary": "Inspect a simplified band-gap and density-of-states view with a live occupation estimate.",
	    "equationSummary": "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
	    "status": "Validated carrier slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -1.5, "maxX": 2.5, "minY": 0, "maxY": 1.4 },
	    "focusArea": "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
	    "bandGapElectronVolts": 1.1,
	    "effectiveMassRatio": 0.22
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingCrystalField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingPhononField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "phonon-dispersion",
	    "name": "Phonon Dispersion",
	    "summary": "Inspect an acoustic and optical phonon branch with a live group-velocity estimate.",
	    "equationSummary": "omega ~ sin(ka/2), vg = d omega / dk",
	    "status": "Validated lattice slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 12 },
	    "focusArea": "Dispersion shape, optical-branch separation, and group-velocity intuition across the Brillouin zone.",
	    "latticeSpacingNanometers": 0.42,
	    "springConstantNewtonsPerMeter": 18.0
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonFiniteSnapshotTime) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "phonon-dispersion",
	    "name": "Phonon Dispersion",
	    "summary": "Inspect an acoustic and optical phonon branch with a live group-velocity estimate.",
	    "equationSummary": "omega ~ sin(ka/2), vg = d omega / dk",
	    "status": "Validated lattice slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 12 },
	    "focusArea": "Dispersion shape, optical-branch separation, and group-velocity intuition across the Brillouin zone.",
	    "latticeSpacingNanometers": 0.42,
	    "springConstantNewtonsPerMeter": 18.0,
	    "atomicMassAmu": 28.0
	  },
	  "snapshot": { "timeSeconds": 1e999 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingSnapshotTime) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "electronic-structure",
	    "name": "Electronic Structure",
	    "summary": "Inspect a simplified band-gap and density-of-states view with a live occupation estimate.",
	    "equationSummary": "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
	    "status": "Validated carrier slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -1.5, "maxX": 2.5, "minY": 0, "maxY": 1.4 },
	    "focusArea": "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
	    "bandGapElectronVolts": 1.1,
	    "effectiveMassRatio": 0.22,
	    "dopantDensityPerCubicCentimeter": 8e15
	  },
	  "snapshot": {}
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonFiniteViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1e999, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonFiniteScenarioField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "electronic-structure",
	    "name": "Electronic Structure",
	    "summary": "Inspect a simplified band-gap and density-of-states view with a live occupation estimate.",
	    "equationSummary": "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
	    "status": "Validated carrier slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -1.5, "maxX": 2.5, "minY": 0, "maxY": 1.4 },
	    "focusArea": "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
	    "bandGapElectronVolts": 1e999,
	    "effectiveMassRatio": 0.22,
	    "dopantDensityPerCubicCentimeter": 8e15
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsInvalidScenarioId) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "missing-solid-state-scenario",
	    "name": "Unknown Solid State Scenario",
	    "summary": "Test",
	    "equationSummary": "Test",
	    "status": "Test",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 1 },
	    "focusArea": "Test",
	    "bandGapElectronVolts": 1.1,
	    "effectiveMassRatio": 0.22,
	    "dopantDensityPerCubicCentimeter": 8e15
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingFocusArea) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "phonon-dispersion",
	    "name": "Phonon Dispersion",
	    "summary": "Inspect an acoustic and optical phonon branch with a live group-velocity estimate.",
	    "equationSummary": "omega ~ sin(ka/2), vg = d omega / dk",
	    "status": "Validated lattice slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 12 },
	    "latticeSpacingNanometers": 0.42,
	    "springConstantNewtonsPerMeter": 18.0,
	    "atomicMassAmu": 28.0
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonObjectViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": [],
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingViewBoundsMinX) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingViewBoundsMaxX) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingViewBoundsMinY) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingViewBoundsMaxY) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingOverlayField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": {
	    "showReferenceGuides": true,
	    "showActiveMarker": false
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingOverlayReferenceGuidesField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": {
	    "showActiveMarker": false,
	    "showComparisonBand": true
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingOverlayActiveMarkerField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": {
	    "showReferenceGuides": true,
	    "showComparisonBand": true
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingOverlayComparisonBandField) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": {
	    "showReferenceGuides": true,
	    "showActiveMarker": false
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonFiniteDurationSeconds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "phonon-dispersion",
	    "name": "Phonon Dispersion",
	    "summary": "Inspect an acoustic and optical phonon branch with a live group-velocity estimate.",
	    "equationSummary": "omega ~ sin(ka/2), vg = d omega / dk",
	    "status": "Validated lattice slice",
	    "durationSeconds": 1e999,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 12 },
	    "focusArea": "Dispersion shape, optical-branch separation, and group-velocity intuition across the Brillouin zone.",
	    "latticeSpacingNanometers": 0.42,
	    "springConstantNewtonsPerMeter": 18.0,
	    "atomicMassAmu": 28.0
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingStatus) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "electronic-structure",
	    "name": "Electronic Structure",
	    "summary": "Inspect a simplified band-gap and density-of-states view with a live occupation estimate.",
	    "equationSummary": "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -1.5, "maxX": 2.5, "minY": 0, "maxY": 1.4 },
	    "focusArea": "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
	    "bandGapElectronVolts": 1.1,
	    "effectiveMassRatio": 0.22,
	    "dopantDensityPerCubicCentimeter": 8e15
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingEquationSummary) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingSummary) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "electronic-structure",
	    "name": "Electronic Structure",
	    "equationSummary": "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
	    "status": "Validated carrier slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -1.5, "maxX": 2.5, "minY": 0, "maxY": 1.4 },
	    "focusArea": "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
	    "bandGapElectronVolts": 1.1,
	    "effectiveMassRatio": 0.22,
	    "dopantDensityPerCubicCentimeter": 8e15
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingName) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "phonon-dispersion",
	    "summary": "Inspect an acoustic and optical phonon branch with a live group-velocity estimate.",
	    "equationSummary": "omega ~ sin(ka/2), vg = d omega / dk",
	    "status": "Validated lattice slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 12 },
	    "focusArea": "Dispersion shape, optical-branch separation, and group-velocity intuition across the Brillouin zone.",
	    "latticeSpacingNanometers": 0.42,
	    "springConstantNewtonsPerMeter": 18.0,
	    "atomicMassAmu": 28.0
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingScenarioId) {
	const auto malformed = R"json({
	  "scenario": {
	    "name": "Phonon Dispersion",
	    "summary": "Inspect an acoustic and optical phonon branch with a live group-velocity estimate.",
	    "equationSummary": "omega ~ sin(ka/2), vg = d omega / dk",
	    "status": "Validated lattice slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 12 },
	    "focusArea": "Dispersion shape, optical-branch separation, and group-velocity intuition across the Brillouin zone.",
	    "latticeSpacingNanometers": 0.42,
	    "springConstantNewtonsPerMeter": 18.0,
	    "atomicMassAmu": 28.0
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonStringScenarioId) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": 7,
	    "name": "Phonon Dispersion",
	    "summary": "Inspect an acoustic and optical phonon branch with a live group-velocity estimate.",
	    "equationSummary": "omega ~ sin(ka/2), vg = d omega / dk",
	    "status": "Validated lattice slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 12 },
	    "focusArea": "Dispersion shape, optical-branch separation, and group-velocity intuition across the Brillouin zone.",
	    "latticeSpacingNanometers": 0.42,
	    "springConstantNewtonsPerMeter": 18.0,
	    "atomicMassAmu": 28.0
	  },
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonObjectScenarioPayload) {
	const auto malformed = R"json({
	  "scenario": 7,
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonObjectSnapshotPayload) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "electronic-structure",
	    "name": "Electronic Structure",
	    "summary": "Inspect a simplified band-gap and density-of-states view with a live occupation estimate.",
	    "equationSummary": "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
	    "status": "Validated carrier slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": -1.5, "maxX": 2.5, "minY": 0, "maxY": 1.4 },
	    "focusArea": "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
	    "bandGapElectronVolts": 1.1,
	    "effectiveMassRatio": 0.22,
	    "dopantDensityPerCubicCentimeter": 8e15
	  },
	  "snapshot": false
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingScenarioPayload) {
	const auto malformed = R"json({
	  "snapshot": { "timeSeconds": 0.60 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMissingSnapshotPayload) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonObjectPayload) {
	const auto malformed = R"json([])json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsInvalidJson) {
	const auto malformed = R"json({)json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsNonObjectOverlays) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": []
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(SolidStatePayload, RejectsMalformedOverlayPayload) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "crystal-elasticity",
	    "name": "Crystal Elasticity",
	    "summary": "Inspect a simplified stress-strain response with elastic energy density and yield reference cues.",
	    "equationSummary": "sigma = E epsilon, u = 1/2 sigma epsilon",
	    "status": "Validated elasticity slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 2, "minY": 0, "maxY": 260 },
	    "focusArea": "Stress-strain slope, stored elastic energy, and yield-threshold comparison.",
	    "maxStrainPercent": 1.6,
	    "youngsModulusGigapascals": 210.0,
	    "yieldStrengthMegapascals": 185.0
	  },
	  "snapshot": { "timeSeconds": 0.30 },
	  "overlays": {
	    "showReferenceGuides": true,
	    "showActiveMarker": "yes",
	    "showComparisonBand": false
	  }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::solid_state::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(AstrophysicsReport, BuildsScenarioSpecificSummaryRows) {
	const auto stellar = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::StellarLuminosity);
	const auto stellar_snapshot = visual_physics::astrophysics::sample_scenario(stellar, 0.4);
	const auto stellar_rows =
		visual_physics::astrophysics::build_report_summary_rows(stellar, stellar_snapshot);
	ASSERT_GE(stellar_rows.size(), 4U);
	EXPECT_EQ(stellar_rows[0].metric, "snapshot_time_s");
	EXPECT_EQ(stellar_rows[1].metric, "luminosity_solar_units");

	const auto hubble = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::HubbleExpansion);
	const auto hubble_snapshot = visual_physics::astrophysics::sample_scenario(hubble, 0.6);
	const auto hubble_csv = visual_physics::astrophysics::build_report_csv(
		hubble,
		hubble_snapshot,
		visual_physics::astrophysics::build_samples_at_time(hubble, 0.6, 12));
	EXPECT_NE(hubble_csv.find("\"summary\",\"distance_mpc\""), std::string::npos);
	EXPECT_NE(hubble_csv.find("\"summary\",\"recession_velocity_km_s\""), std::string::npos);
	EXPECT_NE(hubble_csv.find("\"summary\",\"redshift\""), std::string::npos);
}

TEST(AtmosphericReport, BuildsSummaryFirstCsv) {
	const auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::BarometricFormula);
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.3);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.3, 12);
	const auto csv = visual_physics::atmospheric::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"pressure_kpa\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("barometric-pressure-profile"), std::string::npos);
}

TEST(AtmosphericReport, BuildsScenarioSpecificSummaryRows) {
	const auto adiabatic = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate);
	const auto adiabatic_snapshot = visual_physics::atmospheric::sample_scenario(adiabatic, 0.4);
	const auto adiabatic_rows =
		visual_physics::atmospheric::build_report_summary_rows(adiabatic, adiabatic_snapshot);
	ASSERT_GE(adiabatic_rows.size(), 3U);
	EXPECT_EQ(adiabatic_rows[0].metric, "snapshot_time_s");
	EXPECT_EQ(adiabatic_rows[1].metric, "temperature_k");
	EXPECT_EQ(adiabatic_rows[2].metric, "reference_temperature_k");

	const auto convection = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::ConvectionColumn);
	const auto convection_snapshot = visual_physics::atmospheric::sample_scenario(convection, 0.6);
	const auto convection_csv = visual_physics::atmospheric::build_report_csv(
		convection,
		convection_snapshot,
		visual_physics::atmospheric::build_samples_at_time(convection, 0.6, 12));
	EXPECT_NE(convection_csv.find("\"summary\",\"parcel_altitude_km\""), std::string::npos);
	EXPECT_NE(convection_csv.find("\"summary\",\"updraft_velocity_m_s\""), std::string::npos);
	EXPECT_NE(convection_csv.find("convection-updraft-profile"), std::string::npos);
}

TEST(SolidStateReport, BuildsSummaryFirstCsv) {
	const auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.30);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.30, 12);
	const auto csv = visual_physics::solid_state::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"stress_mpa\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("crystal-stress-strain-profile"), std::string::npos);
	EXPECT_NE(csv.find("report_stats"), std::string::npos);
}

TEST(SolidStateReport, BuildsPhononSummaryFirstCsv) {
	const auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.40);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.40, 12);
	const auto csv = visual_physics::solid_state::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"acoustic_frequency_thz\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"group_velocity_km_s\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("phonon-dispersion-profile"), std::string::npos);
	EXPECT_NE(csv.find("report_stats"), std::string::npos);
	EXPECT_NE(csv.find("secondary_value_range"), std::string::npos);
}

TEST(SolidStateReport, BuildsElectronicSummaryFirstCsv) {
	const auto scenario = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	const auto snapshot = visual_physics::solid_state::sample_scenario(scenario, 0.60);
	const auto samples = visual_physics::solid_state::build_samples_at_time(scenario, 0.60, 12);
	const auto csv = visual_physics::solid_state::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"density_of_states\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"occupation_probability\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("electronic-density-of-states-profile"), std::string::npos);
	EXPECT_NE(csv.find("report_stats"), std::string::npos);
	EXPECT_NE(csv.find("secondary_value_range"), std::string::npos);
}

TEST(SolidStateReport, BuildsCrystalScenarioSpecificSummaryRows) {
	const auto crystal = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::CrystalElasticity);
	const auto crystal_snapshot = visual_physics::solid_state::sample_scenario(crystal, 0.3);
	const auto crystal_rows = visual_physics::solid_state::build_report_summary_rows(
		crystal,
		crystal_snapshot);
	ASSERT_GE(crystal_rows.size(), 3U);
	EXPECT_EQ(crystal_rows[0].metric, "snapshot_time_s");
	EXPECT_EQ(crystal_rows[1].metric, "stress_mpa");
	EXPECT_EQ(crystal_rows[2].metric, "yield_margin_mpa");
	EXPECT_EQ(crystal_rows[1].label, "Stress");
	EXPECT_EQ(crystal_rows[2].label, "Yield margin");
	EXPECT_EQ(
		crystal_rows[2].detail,
		"Distance between the active stress state and the configured yield threshold.");
}

TEST(SolidStateReport, BuildsScenarioSpecificSummaryRows) {
	const auto phonon = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::PhononDispersion);
	const auto phonon_snapshot = visual_physics::solid_state::sample_scenario(phonon, 0.4);
	const auto phonon_rows = visual_physics::solid_state::build_report_summary_rows(
		phonon,
		phonon_snapshot);
	ASSERT_GE(phonon_rows.size(), 3U);
	EXPECT_EQ(phonon_rows[0].metric, "snapshot_time_s");
	EXPECT_EQ(phonon_rows[1].metric, "acoustic_frequency_thz");

	const auto electronic = visual_physics::solid_state::make_default_scenario(
		visual_physics::solid_state::ScenarioId::ElectronicStructure);
	const auto electronic_snapshot = visual_physics::solid_state::sample_scenario(electronic, 0.6);
	const auto electronic_rows = visual_physics::solid_state::build_report_summary_rows(
		electronic,
		electronic_snapshot);
	ASSERT_GE(electronic_rows.size(), 3U);
	EXPECT_EQ(electronic_rows[0].metric, "snapshot_time_s");
	EXPECT_EQ(electronic_rows[1].metric, "density_of_states");
	EXPECT_EQ(electronic_rows[2].metric, "occupation_probability");
	EXPECT_EQ(electronic_rows[1].label, "Density of states");
	EXPECT_EQ(electronic_rows[2].label, "Occupation probability");
	EXPECT_EQ(
		electronic_rows[2].detail,
		"Fermi-style occupation estimate for the active energy cursor.");
}

	TEST(NuclearAndParticlePhysicsReport, BuildsSummaryFirstCsv) {
		const auto scenario = visual_physics::nuclear_and_particle_physics::make_default_scenario(
			visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay);
		const auto snapshot =
			visual_physics::nuclear_and_particle_physics::sample_scenario(scenario, 0.30);
		const auto samples =
			visual_physics::nuclear_and_particle_physics::build_samples_at_time(scenario, 0.30, 12);
		const auto csv = visual_physics::nuclear_and_particle_physics::build_report_csv(
			scenario,
			snapshot,
			samples);

		EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
		EXPECT_NE(csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
		EXPECT_NE(csv.find("\"summary\",\"remaining_fraction\""), std::string::npos);
		EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
		EXPECT_NE(csv.find("radioactive-decay-profile"), std::string::npos);
		EXPECT_NE(csv.find("report_stats"), std::string::npos);
	}

	TEST(NuclearAndParticlePhysicsReport, BuildsScenarioSpecificSummaryRows) {
		const auto binding = visual_physics::nuclear_and_particle_physics::make_default_scenario(
			visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve);
		const auto binding_snapshot =
			visual_physics::nuclear_and_particle_physics::sample_scenario(binding, 0.45);
		const auto binding_rows =
			visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
				binding,
				binding_snapshot);
		ASSERT_GE(binding_rows.size(), 3U);
		EXPECT_EQ(binding_rows[0].metric, "snapshot_time_s");
		EXPECT_EQ(binding_rows[1].metric, "total_binding_energy_mev");
		EXPECT_EQ(binding_rows[2].metric, "stability_index");

		const auto collision = visual_physics::nuclear_and_particle_physics::make_default_scenario(
			visual_physics::nuclear_and_particle_physics::ScenarioId::ProtonProtonCollision);
		const auto collision_snapshot =
			visual_physics::nuclear_and_particle_physics::sample_scenario(collision, 0.55);
		const auto collision_csv = visual_physics::nuclear_and_particle_physics::build_report_csv(
			collision,
			collision_snapshot,
			visual_physics::nuclear_and_particle_physics::build_samples_at_time(collision, 0.55, 12));
		EXPECT_NE(collision_csv.find("\"summary\",\"invariant_mass_gev\""), std::string::npos);
		EXPECT_NE(collision_csv.find("\"summary\",\"transverse_momentum_gev\""), std::string::npos);
		EXPECT_NE(collision_csv.find("proton-proton-collision-profile"), std::string::npos);
	}

TEST(VisualPhysicsVulkanExecutable, ListsRelativityScenarios) {
	const auto output_path = unique_temp_path("_relativity_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain relativity --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("time-dilation"), std::string::npos);
	EXPECT_NE(output.find("relativistic-doppler"), std::string::npos);
	EXPECT_NE(output.find("gravitational-time-dilation"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsAstrophysicsScenarios) {
	const auto output_path = unique_temp_path("_astrophysics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain astrophysics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("planetary-orbit"), std::string::npos);
	EXPECT_NE(output.find("stellar-luminosity"), std::string::npos);
	EXPECT_NE(output.find("hubble-expansion"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersAtmosphericScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_atmospheric_adiabatic.ppm");
	const auto payload_path = unique_temp_path("_atmospheric_adiabatic.json");
	const auto report_csv_path = unique_temp_path("_atmospheric_adiabatic.csv");
	const auto output_path = unique_temp_path("_atmospheric_adiabatic.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario adiabatic-lapse-rate --time 0.40 --show-reference-guides false --show-comparison-band true --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-atmospheric-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate);
	const auto expected_snapshot = visual_physics::atmospheric::sample_scenario(expected_scenario, 0.4);
	const auto expected_report_rows =
		visual_physics::atmospheric::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Atmospheric summary: temperatureK="
		<< expected_snapshot.temperature_kelvin.value_or(0.0)
		<< ", referenceTemperatureK="
		<< expected_snapshot.reference_temperature_kelvin.value_or(0.0)
		<< ", altitudeKm="
		<< expected_snapshot.altitude_kilometers.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Atmospheric report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"adiabatic-lapse-rate\""), std::string::npos);
	EXPECT_NE(payload.find("\"surfaceTemperatureKelvin\": 288.0"), std::string::npos);
	EXPECT_NE(payload.find("\"lapseRateKelvinPerKilometer\": 9.8"), std::string::npos);
	EXPECT_NE(payload.find("\"tropopauseHeightKilometers\": 11.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"temperature_k\",\"Temperature\",\"" +
			expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(report_csv.find("adiabatic-temperature-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: atmospheric-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: adiabatic-lapse-rate"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported atmospheric report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Atmospheric overlays: referenceGuides=off, comparisonBand=on, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: none"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersBarometricAtmosphericScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_atmospheric_barometric.ppm");
	const auto payload_path = unique_temp_path("_atmospheric_barometric.json");
	const auto report_csv_path = unique_temp_path("_atmospheric_barometric.csv");
	const auto output_path = unique_temp_path("_atmospheric_barometric.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario barometric-formula --time 0.30 --show-reference-guides true --show-comparison-band false --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-atmospheric-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::BarometricFormula);
	const auto expected_snapshot = visual_physics::atmospheric::sample_scenario(expected_scenario, 0.3);
	const auto expected_report_rows =
		visual_physics::atmospheric::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Atmospheric summary: pressureKpa="
		<< expected_snapshot.pressure_kilopascals.value_or(0.0)
		<< ", relativeDensity="
		<< expected_snapshot.relative_density.value_or(0.0)
		<< ", altitudeKm="
		<< expected_snapshot.altitude_kilometers.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Atmospheric report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"barometric-formula\""), std::string::npos);
	EXPECT_NE(payload.find("\"seaLevelPressureKilopascals\": 101.325"), std::string::npos);
	EXPECT_NE(payload.find("\"scaleHeightKilometers\": 8.4"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"pressure_kpa\",\"Pressure\",\"" + expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(report_csv.find("barometric-pressure-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: atmospheric-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: barometric-formula"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported atmospheric report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Atmospheric overlays: referenceGuides=on, comparisonBand=off, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: none"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersConvectionAtmosphericScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_atmospheric_convection.ppm");
	const auto payload_path = unique_temp_path("_atmospheric_convection.json");
	const auto report_csv_path = unique_temp_path("_atmospheric_convection.csv");
	const auto output_path = unique_temp_path("_atmospheric_convection.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario convection-column --time 0.35 --show-reference-guides true --show-comparison-band false --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-atmospheric-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::ConvectionColumn);
	const auto expected_snapshot = visual_physics::atmospheric::sample_scenario(expected_scenario, 0.35);
	const auto expected_report_rows =
		visual_physics::atmospheric::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Atmospheric summary: parcelAltitudeKm="
		<< expected_snapshot.parcel_altitude_kilometers.value_or(0.0)
		<< ", updraftVelocityMS="
		<< expected_snapshot.updraft_velocity_meters_per_second.value_or(0.0)
		<< ", buoyancyAccelerationMS2="
		<< expected_snapshot.buoyancy_acceleration_meters_per_second_squared.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Atmospheric report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"convection-column\""), std::string::npos);
	EXPECT_NE(payload.find("\"surfaceTemperatureKelvin\": 300.0"), std::string::npos);
	EXPECT_NE(payload.find("\"environmentalLapseRateKelvinPerKilometer\": 6.5"), std::string::npos);
	EXPECT_NE(payload.find("\"parcelTemperatureExcessKelvin\": 3.5"), std::string::npos);
	EXPECT_NE(payload.find("\"columnHeightKilometers\": 9.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"parcel_altitude_km\",\"Parcel altitude\",\"" + expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(report_csv.find("convection-updraft-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: atmospheric-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: convection-column"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported atmospheric report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Atmospheric overlays: referenceGuides=on, comparisonBand=off, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: none"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsAtmosphericPayloadAndAppliesOverlayAndTimeOverrides) {
	const auto import_path = unique_temp_path("_import_atmospheric_convection.json");
	const auto export_path = unique_temp_path("_export_atmospheric_convection.json");
	const auto image_path = unique_temp_path("_import_atmospheric_convection.ppm");
	const auto report_csv_path = unique_temp_path("_import_atmospheric_convection.csv");
	const auto output_path = unique_temp_path("_import_atmospheric_convection.txt");

	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::ConvectionColumn);
	scenario.surface_temperature_kelvin = 302.0;
	scenario.environmental_lapse_rate_kelvin_per_kilometer = 6.8;
	scenario.parcel_temperature_excess_kelvin = 4.1;
	scenario.column_height_kilometers = 10.0;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.25);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::atmospheric::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --import " + shell_quote(import_path) +
		" --time 0.65 --show-reference-guides true --show-active-marker false --show-comparison-band true --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-atmospheric-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.65);
	const auto expected_report_rows =
		visual_physics::atmospheric::build_report_summary_rows(scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Atmospheric summary: parcelAltitudeKm="
		<< expected_snapshot.parcel_altitude_kilometers.value_or(0.0)
		<< ", updraftVelocityMS="
		<< expected_snapshot.updraft_velocity_meters_per_second.value_or(0.0)
		<< ", buoyancyAccelerationMS2="
		<< expected_snapshot.buoyancy_acceleration_meters_per_second_squared.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Atmospheric report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"convection-column\""), std::string::npos);
	EXPECT_NE(payload.find("\"surfaceTemperatureKelvin\": 302.0"), std::string::npos);
	EXPECT_NE(payload.find("\"environmentalLapseRateKelvinPerKilometer\": 6.8"), std::string::npos);
	EXPECT_NE(payload.find("\"parcelTemperatureExcessKelvin\": 4.1"), std::string::npos);
	EXPECT_NE(payload.find("\"columnHeightKilometers\": 10.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.65"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"parcel_altitude_km\",\"Parcel altitude\",\"" + expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(report_csv.find("convection-updraft-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Domain: atmospheric-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: convection-column"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported atmospheric report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Atmospheric overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsAtmosphericReportCsvForNonAtmosphericDomain) {
	const auto output_path = unique_temp_path("_atmospheric_report_invalid_domain.txt");
	const auto report_csv_path = unique_temp_path("_atmospheric_report_invalid_domain.csv");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --export-atmospheric-report-csv " +
		shell_quote(report_csv_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Atmospheric report CSV export flag can only be used with --domain atmospheric-physics"),
		std::string::npos);

	std::filesystem::remove(output_path);
	std::filesystem::remove(report_csv_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesAdiabaticAtmosphericCliOverrides) {
	const auto image_path = unique_temp_path("_atmospheric_override_adiabatic.ppm");
	const auto payload_path = unique_temp_path("_atmospheric_override_adiabatic.json");
	const auto output_path = unique_temp_path("_atmospheric_override_adiabatic.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario adiabatic-lapse-rate --time 0.55 --surface-temperature-kelvin 301 --lapse-rate-kelvin-per-kilometer 8.1 --tropopause-height-kilometers 13.2 --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"surfaceTemperatureKelvin\": 301.0"), std::string::npos);
	EXPECT_NE(payload.find("\"lapseRateKelvinPerKilometer\": 8.1"), std::string::npos);
	EXPECT_NE(payload.find("\"tropopauseHeightKilometers\": 13.2"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.55"), std::string::npos);
	EXPECT_NE(output.find("Scenario: adiabatic-lapse-rate"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesConvectionAtmosphericCliOverrides) {
	const auto image_path = unique_temp_path("_atmospheric_override_convection.ppm");
	const auto payload_path = unique_temp_path("_atmospheric_override_convection.json");
	const auto output_path = unique_temp_path("_atmospheric_override_convection.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario convection-column --time 0.45 --surface-temperature-kelvin 304 --environmental-lapse-rate-kelvin-per-kilometer 7.2 --parcel-temperature-excess-kelvin 4.4 --column-height-kilometers 10.5 --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::ConvectionColumn);
	expected_scenario.surface_temperature_kelvin = 304.0;
	expected_scenario.environmental_lapse_rate_kelvin_per_kilometer = 7.2;
	expected_scenario.parcel_temperature_excess_kelvin = 4.4;
	expected_scenario.column_height_kilometers = 10.5;
	const auto expected_snapshot = visual_physics::atmospheric::sample_scenario(expected_scenario, 0.45);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Atmospheric summary: parcelAltitudeKm="
		<< expected_snapshot.parcel_altitude_kilometers.value_or(0.0)
		<< ", updraftVelocityMS="
		<< expected_snapshot.updraft_velocity_meters_per_second.value_or(0.0)
		<< ", buoyancyAccelerationMS2="
		<< expected_snapshot.buoyancy_acceleration_meters_per_second_squared.value_or(0.0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"surfaceTemperatureKelvin\": 304.0"), std::string::npos);
	EXPECT_NE(payload.find("\"environmentalLapseRateKelvinPerKilometer\": 7.2"), std::string::npos);
	EXPECT_NE(payload.find("\"parcelTemperatureExcessKelvin\": 4.4"), std::string::npos);
	EXPECT_NE(payload.find("\"columnHeightKilometers\": 10.5"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.45"), std::string::npos);
	EXPECT_NE(output.find("Scenario: convection-column"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesBarometricAtmosphericCliOverrides) {
	const auto image_path = unique_temp_path("_atmospheric_override_barometric.ppm");
	const auto payload_path = unique_temp_path("_atmospheric_override_barometric.json");
	const auto output_path = unique_temp_path("_atmospheric_override_barometric.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario barometric-formula --time 0.6 --sea-level-pressure-kilopascals 102.6 --scale-height-kilometers 8.8 --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::BarometricFormula);
	expected_scenario.sea_level_pressure_kilopascals = 102.6;
	expected_scenario.scale_height_kilometers = 8.8;
	const auto expected_snapshot = visual_physics::atmospheric::sample_scenario(expected_scenario, 0.6);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Atmospheric summary: pressureKpa="
		<< expected_snapshot.pressure_kilopascals.value_or(0.0)
		<< ", relativeDensity="
		<< expected_snapshot.relative_density.value_or(0.0)
		<< ", altitudeKm="
		<< expected_snapshot.altitude_kilometers.value_or(0.0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"seaLevelPressureKilopascals\": 102.6"), std::string::npos);
	EXPECT_NE(payload.find("\"scaleHeightKilometers\": 8.8"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.6"), std::string::npos);
	EXPECT_NE(output.find("Scenario: barometric-formula"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidBarometricAtmosphericCliFlags) {
	const auto output_path = unique_temp_path("_atmospheric_invalid_barometric.txt");
	const auto image_path = unique_temp_path("_atmospheric_invalid_barometric.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario barometric-formula --parcel-temperature-excess-kelvin 4.0 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--parcel-temperature-excess-kelvin cannot be used with atmospheric scenario barometric-formula"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidConvectionAtmosphericCliFlags) {
	const auto output_path = unique_temp_path("_atmospheric_invalid_convection.txt");
	const auto image_path = unique_temp_path("_atmospheric_invalid_convection.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario convection-column --sea-level-pressure-kilopascals 103.0 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--sea-level-pressure-kilopascals cannot be used with atmospheric scenario convection-column"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidAdiabaticAtmosphericCliFlags) {
	const auto output_path = unique_temp_path("_atmospheric_invalid_adiabatic.txt");
	const auto image_path = unique_temp_path("_atmospheric_invalid_adiabatic.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario adiabatic-lapse-rate --column-height-kilometers 9.0 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--column-height-kilometers cannot be used with atmospheric scenario adiabatic-lapse-rate"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsBarometricAtmosphericPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_atmospheric_barometric.json");
	const auto export_path = unique_temp_path("_export_atmospheric_barometric.json");
	const auto image_path = unique_temp_path("_import_atmospheric_barometric.ppm");
	const auto report_csv_path = unique_temp_path("_import_atmospheric_barometric.csv");
	const auto output_path = unique_temp_path("_import_atmospheric_barometric.txt");

	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::BarometricFormula);
	scenario.sea_level_pressure_kilopascals = 99.4;
	scenario.scale_height_kilometers = 7.9;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::atmospheric::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --import " + shell_quote(import_path) +
		" --time 0.75 --sea-level-pressure-kilopascals 103.2 --scale-height-kilometers 8.6 --show-reference-guides true --show-comparison-band true --show-active-marker false --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-atmospheric-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = scenario;
	expected_scenario.sea_level_pressure_kilopascals = 103.2;
	expected_scenario.scale_height_kilometers = 8.6;
	const auto expected_snapshot = visual_physics::atmospheric::sample_scenario(expected_scenario, 0.75);
	const auto expected_report_rows =
		visual_physics::atmospheric::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Atmospheric summary: pressureKpa="
		<< expected_snapshot.pressure_kilopascals.value_or(0.0)
		<< ", relativeDensity="
		<< expected_snapshot.relative_density.value_or(0.0)
		<< ", altitudeKm="
		<< expected_snapshot.altitude_kilometers.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Atmospheric report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"barometric-formula\""), std::string::npos);
	EXPECT_NE(payload.find("\"seaLevelPressureKilopascals\": 103.2"), std::string::npos);
	EXPECT_NE(payload.find("\"scaleHeightKilometers\": 8.6"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.75"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"pressure_kpa\",\"Pressure\",\"" + expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(report_csv.find("barometric-pressure-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Scenario: barometric-formula"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported atmospheric report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Atmospheric overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsAdiabaticAtmosphericPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_atmospheric_adiabatic.json");
	const auto export_path = unique_temp_path("_export_atmospheric_adiabatic.json");
	const auto image_path = unique_temp_path("_import_atmospheric_adiabatic.ppm");
	const auto report_csv_path = unique_temp_path("_import_atmospheric_adiabatic.csv");
	const auto output_path = unique_temp_path("_import_atmospheric_adiabatic.txt");

	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate);
	scenario.surface_temperature_kelvin = 297.5;
	scenario.lapse_rate_kelvin_per_kilometer = 7.3;
	scenario.tropopause_height_kilometers = 11.6;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.35, 10);
	write_text_file(
		import_path,
		visual_physics::atmospheric::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --import " + shell_quote(import_path) +
		" --time 0.7 --surface-temperature-kelvin 301.5 --lapse-rate-kelvin-per-kilometer 8.2 --tropopause-height-kilometers 13.4 --show-reference-guides true --show-comparison-band true --show-active-marker false --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-atmospheric-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = scenario;
	expected_scenario.surface_temperature_kelvin = 301.5;
	expected_scenario.lapse_rate_kelvin_per_kilometer = 8.2;
	expected_scenario.tropopause_height_kilometers = 13.4;
	const auto expected_snapshot = visual_physics::atmospheric::sample_scenario(expected_scenario, 0.7);
	const auto expected_report_rows =
		visual_physics::atmospheric::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Atmospheric summary: temperatureK="
		<< expected_snapshot.temperature_kelvin.value_or(0.0)
		<< ", referenceTemperatureK="
		<< expected_snapshot.reference_temperature_kelvin.value_or(0.0)
		<< ", altitudeKm="
		<< expected_snapshot.altitude_kilometers.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Atmospheric report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"adiabatic-lapse-rate\""), std::string::npos);
	EXPECT_NE(payload.find("\"surfaceTemperatureKelvin\": 301.5"), std::string::npos);
	EXPECT_NE(payload.find("\"lapseRateKelvinPerKilometer\": 8.2"), std::string::npos);
	EXPECT_NE(payload.find("\"tropopauseHeightKilometers\": 13.4"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.7"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"temperature_k\",\"Temperature\",\"" + expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(report_csv.find("adiabatic-temperature-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Scenario: adiabatic-lapse-rate"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported atmospheric report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Atmospheric overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedBarometricAtmosphericCliFlags) {
	const auto import_path = unique_temp_path("_import_atmospheric_barometric_invalid.json");
	const auto image_path = unique_temp_path("_import_atmospheric_barometric_invalid.ppm");
	const auto output_path = unique_temp_path("_import_atmospheric_barometric_invalid.txt");

	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::BarometricFormula);
	scenario.sea_level_pressure_kilopascals = 99.8;
	scenario.scale_height_kilometers = 8.1;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.3);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.3, 10);
	write_text_file(
		import_path,
		visual_physics::atmospheric::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --import " + shell_quote(import_path) +
		" --surface-temperature-kelvin 300.0 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--surface-temperature-kelvin cannot be used with atmospheric scenario barometric-formula"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedConvectionAtmosphericCliFlags) {
	const auto import_path = unique_temp_path("_import_atmospheric_convection_invalid.json");
	const auto image_path = unique_temp_path("_import_atmospheric_convection_invalid.ppm");
	const auto output_path = unique_temp_path("_import_atmospheric_convection_invalid.txt");

	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::ConvectionColumn);
	scenario.surface_temperature_kelvin = 301.0;
	scenario.environmental_lapse_rate_kelvin_per_kilometer = 6.7;
	scenario.parcel_temperature_excess_kelvin = 3.9;
	scenario.column_height_kilometers = 9.6;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.4);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.4, 10);
	write_text_file(
		import_path,
		visual_physics::atmospheric::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = true,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --import " + shell_quote(import_path) +
		" --scale-height-kilometers 8.4 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--scale-height-kilometers cannot be used with atmospheric scenario convection-column"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedAdiabaticAtmosphericCliFlags) {
	const auto import_path = unique_temp_path("_import_atmospheric_adiabatic_invalid.json");
	const auto image_path = unique_temp_path("_import_atmospheric_adiabatic_invalid.ppm");
	const auto output_path = unique_temp_path("_import_atmospheric_adiabatic_invalid.txt");

	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate);
	scenario.surface_temperature_kelvin = 299.0;
	scenario.lapse_rate_kelvin_per_kilometer = 8.4;
	scenario.tropopause_height_kilometers = 12.4;
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.3);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.3, 10);
	write_text_file(
		import_path,
		visual_physics::atmospheric::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = true,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --import " + shell_quote(import_path) +
		" --parcel-temperature-excess-kelvin 4.0 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find(
			"--parcel-temperature-excess-kelvin cannot be used with atmospheric scenario adiabatic-lapse-rate"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsScenarioWithImportedAtmosphericPayload) {
	const auto import_path = unique_temp_path("_atmospheric_scenario_import_conflict.json");
	const auto output_path = unique_temp_path("_atmospheric_scenario_import_conflict.txt");

	auto scenario = visual_physics::atmospheric::make_default_scenario(
		visual_physics::atmospheric::ScenarioId::BarometricFormula);
	const auto snapshot = visual_physics::atmospheric::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::atmospheric::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::atmospheric::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain atmospheric-physics --scenario barometric-formula --import " +
		shell_quote(import_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--scenario cannot be combined with --import"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersAstrophysicsScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_astrophysics_planetary.ppm");
	const auto payload_path = unique_temp_path("_astrophysics_planetary.json");
	const auto report_csv_path = unique_temp_path("_astrophysics_planetary.csv");
	const auto output_path = unique_temp_path("_astrophysics_planetary.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain astrophysics --scenario planetary-orbit --time 0.35 --central-mass-solar-masses 1.4 --orbital-radius-astronomical-units 1.8 --orbital-eccentricity 0.2 --show-reference-guides true --show-comparison-band true --show-active-marker false --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-astrophysics-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::PlanetaryOrbit);
	expected_scenario.central_mass_solar_masses = 1.4;
	expected_scenario.orbital_radius_astronomical_units = 1.8;
	expected_scenario.orbital_eccentricity = 0.2;
	const auto expected_snapshot = visual_physics::astrophysics::sample_scenario(expected_scenario, 0.35);
	const auto expected_report_rows =
		visual_physics::astrophysics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Astrophysics summary: orbitalPeriodDays="
		<< expected_snapshot.orbital_period_days.value_or(0.0)
		<< ", orbitalSpeedKmS="
		<< expected_snapshot.orbital_speed_kilometers_per_second.value_or(0.0)
		<< ", escapeSpeedKmS="
		<< expected_snapshot.escape_speed_kilometers_per_second.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Astrophysics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"planetary-orbit\""), std::string::npos);
	EXPECT_NE(payload.find("\"centralMassSolarMasses\": 1.4"), std::string::npos);
	EXPECT_NE(payload.find("\"orbitalRadiusAstronomicalUnits\": 1.8"), std::string::npos);
	EXPECT_NE(payload.find("\"orbitalEccentricity\": 0.2"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"orbital_period_days\",\"Orbital period\",\"" +
			expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(report_csv.find("planetary-orbit-trajectory"), std::string::npos);
	EXPECT_NE(output.find("Domain: astrophysics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: planetary-orbit"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported astrophysics report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Astrophysics overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: none"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsStellarAstrophysicsPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_astrophysics_stellar.json");
	const auto export_path = unique_temp_path("_export_astrophysics_stellar.json");
	const auto report_csv_path = unique_temp_path("_export_astrophysics_stellar.csv");
	const auto image_path = unique_temp_path("_import_astrophysics_stellar.ppm");
	const auto output_path = unique_temp_path("_import_astrophysics_stellar.txt");

	auto scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::StellarLuminosity);
	scenario.stellar_mass_solar_masses = 1.1;
	scenario.stellar_radius_solar_radii = 1.3;
	scenario.surface_temperature_kelvin = 6100.0;
	const auto snapshot = visual_physics::astrophysics::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::astrophysics::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::astrophysics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain astrophysics --import " + shell_quote(import_path) +
		" --stellar-mass-solar-masses 2.4 --stellar-radius-solar-radii 2.1 --surface-temperature-kelvin 7200 --time 0.65 --show-reference-guides true --show-active-marker false --show-comparison-band true --export-state " +
		shell_quote(export_path) + " --export-astrophysics-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = scenario;
	expected_scenario.stellar_mass_solar_masses = 2.4;
	expected_scenario.stellar_radius_solar_radii = 2.1;
	expected_scenario.surface_temperature_kelvin = 7200.0;
	const auto expected_snapshot = visual_physics::astrophysics::sample_scenario(expected_scenario, 0.65);
	const auto expected_report_rows =
		visual_physics::astrophysics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Astrophysics summary: luminositySolarUnits="
		<< expected_snapshot.luminosity_solar_units.value_or(0.0)
		<< ", habitableZoneInnerAu="
		<< expected_snapshot.habitable_zone_inner_astronomical_units.value_or(0.0)
		<< ", habitableZoneOuterAu="
		<< expected_snapshot.habitable_zone_outer_astronomical_units.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Astrophysics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto exported_payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"stellar-luminosity\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"stellarMassSolarMasses\": 2.4"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"stellarRadiusSolarRadii\": 2.1"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"surfaceTemperatureKelvin\": 7200.0"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"timeSeconds\": 0.65"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"luminosity_solar_units\",\"Luminosity\",\"" +
			expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("time=0.65s"), std::string::npos);
	EXPECT_NE(output.find("Astrophysics overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsHubbleAstrophysicsPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_astrophysics_hubble.json");
	const auto export_path = unique_temp_path("_export_astrophysics_hubble.json");
	const auto report_csv_path = unique_temp_path("_export_astrophysics_hubble.csv");
	const auto image_path = unique_temp_path("_import_astrophysics_hubble.ppm");
	const auto output_path = unique_temp_path("_import_astrophysics_hubble.txt");

	auto scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::HubbleExpansion);
	scenario.distance_megaparsecs = 300.0;
	scenario.hubble_constant_kilometers_per_second_per_megaparsec = 68.0;
	const auto snapshot = visual_physics::astrophysics::sample_scenario(scenario, 0.15);
	const auto samples = visual_physics::astrophysics::build_samples_at_time(scenario, 0.15, 10);
	write_text_file(
		import_path,
		visual_physics::astrophysics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain astrophysics --import " + shell_quote(import_path) +
		" --distance-megaparsecs 900 --hubble-constant-kilometers-per-second-per-megaparsec 74 --time 0.8 --show-reference-guides false --show-active-marker true --show-comparison-band true --export-state " +
		shell_quote(export_path) + " --export-astrophysics-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = scenario;
	expected_scenario.distance_megaparsecs = 900.0;
	expected_scenario.hubble_constant_kilometers_per_second_per_megaparsec = 74.0;
	const auto expected_snapshot = visual_physics::astrophysics::sample_scenario(expected_scenario, 0.8);
	const auto expected_report_rows =
		visual_physics::astrophysics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Astrophysics summary: distanceMpc="
		<< expected_snapshot.distance_megaparsecs.value_or(0.0)
		<< ", recessionVelocityKmS="
		<< expected_snapshot.recession_velocity_kilometers_per_second.value_or(0.0)
		<< ", redshift="
		<< expected_snapshot.redshift.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Astrophysics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto exported_payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"hubble-expansion\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"distanceMegaparsecs\": 900.0"), std::string::npos);
	EXPECT_NE(
		exported_payload.find("\"hubbleConstantKilometersPerSecondPerMegaparsec\": 74.0"),
		std::string::npos);
	EXPECT_NE(exported_payload.find("\"timeSeconds\": 0.8"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(
		report_csv.find(
			"\"summary\",\"distance_mpc\",\"Distance\",\"" +
			expected_report_rows[1].value + "\""),
		std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("time=0.8s"), std::string::npos);
	EXPECT_NE(output.find("Astrophysics overlays: referenceGuides=off, comparisonBand=on, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidPlanetaryAstrophysicsCliFlags) {
	const auto output_path = unique_temp_path("_astrophysics_invalid_planetary.txt");
	const auto image_path = unique_temp_path("_astrophysics_invalid_planetary.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain astrophysics --scenario planetary-orbit --stellar-mass-solar-masses 2.0 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find(
			"--stellar-mass-solar-masses cannot be used with astrophysics scenario planetary-orbit"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedStellarAstrophysicsCliFlags) {
	const auto import_path = unique_temp_path("_import_astrophysics_invalid_stellar.json");
	const auto output_path = unique_temp_path("_astrophysics_invalid_imported_stellar.txt");
	const auto image_path = unique_temp_path("_astrophysics_invalid_imported_stellar.ppm");

	auto scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::StellarLuminosity);
	const auto snapshot = visual_physics::astrophysics::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::astrophysics::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::astrophysics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain astrophysics --import " + shell_quote(import_path) +
		" --distance-megaparsecs 900 --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find(
			"--distance-megaparsecs cannot be used with astrophysics scenario stellar-luminosity"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsAstrophysicsReportCsvForNonAstrophysicsDomain) {
	const auto output_path = unique_temp_path("_astrophysics_report_invalid_domain.txt");
	const auto report_csv_path = unique_temp_path("_astrophysics_report_invalid_domain.csv");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --export-astrophysics-report-csv " +
		shell_quote(report_csv_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Astrophysics report CSV export flag can only be used with --domain astrophysics"),
		std::string::npos);

	std::filesystem::remove(output_path);
	std::filesystem::remove(report_csv_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsScenarioWithImportedAstrophysicsPayload) {
	const auto import_path = unique_temp_path("_astrophysics_scenario_import_conflict.json");
	const auto output_path = unique_temp_path("_astrophysics_scenario_import_conflict.txt");

	auto scenario = visual_physics::astrophysics::make_default_scenario(
		visual_physics::astrophysics::ScenarioId::PlanetaryOrbit);
	const auto snapshot = visual_physics::astrophysics::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::astrophysics::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::astrophysics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain astrophysics --scenario planetary-orbit --import " + shell_quote(import_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--scenario cannot be combined with --import"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRelativityScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_relativity_time_dilation.ppm");
	const auto payload_path = unique_temp_path("_relativity_time_dilation.json");
	const auto report_csv_path = unique_temp_path("_relativity_time_dilation.csv");
	const auto output_path = unique_temp_path("_relativity_time_dilation.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain relativity --scenario time-dilation --time 0.0 --relative-velocity-fraction-of-light 0.78 --proper-time-seconds 6.2 --show-reference-guides false --show-comparison-curve true --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-relativity-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"time-dilation\""), std::string::npos);
	EXPECT_NE(payload.find("\"relativeVelocityFractionOfLight\": 0.78"), std::string::npos);
	EXPECT_NE(payload.find("\"properTimeSeconds\": 6.2"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonCurve\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"lorentz_factor_gamma\""), std::string::npos);
	EXPECT_NE(report_csv.find("time-dilation-curve"), std::string::npos);
	EXPECT_NE(output.find("Domain: relativity"), std::string::npos);
	EXPECT_NE(output.find("Scenario: time-dilation"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported relativity report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Relativity overlays: referenceGuides=off, comparisonCurve=on, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find("Relativity summary: beta=0.780"), std::string::npos);
	EXPECT_NE(output.find("Overrides: relativeVelocityFractionOfLight=0.780000, properTimeSeconds=6.200000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRelativityDopplerScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_relativity_doppler.ppm");
	const auto payload_path = unique_temp_path("_relativity_doppler.json");
	const auto report_csv_path = unique_temp_path("_relativity_doppler.csv");
	const auto output_path = unique_temp_path("_relativity_doppler.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain relativity --scenario relativistic-doppler --emitted-frequency-hertz 523.25 --source-velocity-fraction-of-light 0.28 --observer-velocity-fraction-of-light -0.10 --show-reference-guides true --show-comparison-curve false --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-relativity-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"relativistic-doppler\""), std::string::npos);
	EXPECT_NE(payload.find("\"emittedFrequencyHertz\": 523.25"), std::string::npos);
	EXPECT_NE(payload.find("\"sourceVelocityFractionOfLight\": 0.28"), std::string::npos);
	EXPECT_NE(payload.find("\"observerVelocityFractionOfLight\": -0.1"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonCurve\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"observed_frequency_hz\""), std::string::npos);
	EXPECT_NE(report_csv.find("relativistic-doppler-curve"), std::string::npos);
	EXPECT_NE(output.find("Domain: relativity"), std::string::npos);
	EXPECT_NE(output.find("Scenario: relativistic-doppler"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Relativity overlays: referenceGuides=on, comparisonCurve=off, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find("Relativity summary: beta_rel="), std::string::npos);
	EXPECT_NE(output.find("Overrides: emittedFrequencyHertz=523.250000, sourceVelocityFractionOfLight=0.280000, observerVelocityFractionOfLight=-0.100000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRelativityGravitationalScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_relativity_gravitational.ppm");
	const auto payload_path = unique_temp_path("_relativity_gravitational.json");
	const auto report_csv_path = unique_temp_path("_relativity_gravitational.csv");
	const auto output_path = unique_temp_path("_relativity_gravitational.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain relativity --scenario gravitational-time-dilation --central-mass-solar-masses 4.0 --orbital-radius-schwarzschild-radii 8.5 --coordinate-time-seconds 2.5 --show-reference-guides true --show-comparison-curve true --show-active-marker false --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-relativity-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"gravitational-time-dilation\""), std::string::npos);
	EXPECT_NE(payload.find("\"centralMassSolarMasses\": 4.0"), std::string::npos);
	EXPECT_NE(payload.find("\"orbitalRadiusSchwarzschildRadii\": 8.5"), std::string::npos);
	EXPECT_NE(payload.find("\"coordinateTimeSeconds\": 2.5"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"gravitational_factor\""), std::string::npos);
	EXPECT_NE(report_csv.find("gravitational-time-dilation-curve"), std::string::npos);
	EXPECT_NE(output.find("Domain: relativity"), std::string::npos);
	EXPECT_NE(output.find("Scenario: gravitational-time-dilation"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Relativity overlays: referenceGuides=on, comparisonCurve=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find("Relativity summary: radius="), std::string::npos);
	EXPECT_NE(output.find("Overrides: centralMassSolarMasses=4.000000, orbitalRadiusSchwarzschildRadii=8.500000, coordinateTimeSeconds=2.500000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersParticleInBoxQuantumScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_quantum_box.ppm");
	const auto payload_path = unique_temp_path("_quantum_box.json");
	const auto report_csv_path = unique_temp_path("_quantum_box_report.csv");
	const auto output_path = unique_temp_path("_quantum_box.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain quantum --scenario particle-in-a-box --time 0.25 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-quantum-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"particle-in-a-box\""), std::string::npos);
	EXPECT_NE(payload.find("\"boxLengthNanometers\": 1.2"), std::string::npos);
	EXPECT_NE(payload.find("\"showProbabilityGuide\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"energy_level\""), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"node_count\""), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"well_length_nm\""), std::string::npos);
	EXPECT_NE(report_csv.find("\"probability-density\","), std::string::npos);
	EXPECT_NE(output.find("Domain: quantum"), std::string::npos);
	EXPECT_NE(output.find("Scenario: particle-in-a-box"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported quantum report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Quantum overlays: probabilityGuide=on, potentialGuide=on, phaseGuide=on"), std::string::npos);
	EXPECT_NE(output.find("Quantum snapshot: boxLength="), std::string::npos);
	EXPECT_NE(output.find("Quantum report summary: energy_level="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesQuantumCliFlagsToRenderAndExport) {
	const auto image_path = unique_temp_path("_quantum_cli_flags.ppm");
	const auto payload_path = unique_temp_path("_quantum_cli_flags.json");
	const auto output_path = unique_temp_path("_quantum_cli_flags.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain quantum --scenario particle-in-a-box --box-length-nanometers 2.4 --quantum-number 3" +
		" --show-probability-guide false --show-phase-guide false --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"boxLengthNanometers\": 2.4"), std::string::npos);
	EXPECT_NE(payload.find("\"quantumNumber\": 3.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showProbabilityGuide\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showPhaseGuide\": false"), std::string::npos);
	EXPECT_NE(output.find("Quantum overlays: probabilityGuide=off, potentialGuide=on, phaseGuide=off"), std::string::npos);
	EXPECT_NE(output.find("Overrides: boxLengthNanometers=2.400000, quantumNumber=3.000000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersTunnelingQuantumScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_quantum_tunneling.ppm");
	const auto payload_path = unique_temp_path("_quantum_tunneling.json");
	const auto report_csv_path = unique_temp_path("_quantum_tunneling_report.csv");
	const auto output_path = unique_temp_path("_quantum_tunneling.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain quantum --scenario finite-potential-well-tunneling --time 0.25 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-quantum-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"finite-potential-well-tunneling\""), std::string::npos);
	EXPECT_NE(payload.find("\"barrierHeightEv\": 3.8"), std::string::npos);
	EXPECT_NE(payload.find("\"transmissionProbability\":"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"transmission_probability\""), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"reflection_probability\""), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"barrier_height_ev\""), std::string::npos);
	EXPECT_NE(report_csv.find("\"tunneling-envelope\","), std::string::npos);
	EXPECT_NE(output.find("Domain: quantum"), std::string::npos);
	EXPECT_NE(output.find("Scenario: finite-potential-well-tunneling"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported quantum report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Quantum snapshot: particleEnergy="), std::string::npos);
	EXPECT_NE(output.find("Quantum report summary: transmission_probability="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersDoubleSlitQuantumScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_quantum_slit.ppm");
	const auto payload_path = unique_temp_path("_quantum_slit.json");
	const auto report_csv_path = unique_temp_path("_quantum_slit_report.csv");
	const auto output_path = unique_temp_path("_quantum_slit.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain quantum --scenario double-slit-interference --time 0.25 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-quantum-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"double-slit-interference\""), std::string::npos);
	EXPECT_NE(payload.find("\"slitSeparationMicrometers\": 120.0"), std::string::npos);
	EXPECT_NE(payload.find("\"fringeSpacingMillimeters\":"), std::string::npos);
	EXPECT_NE(report_csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(report_csv.find("fringe_spacing_mm"), std::string::npos);
	EXPECT_NE(report_csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(output.find("Domain: quantum"), std::string::npos);
	EXPECT_NE(output.find("Scenario: double-slit-interference"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported quantum report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Quantum snapshot: wavelength="), std::string::npos);
	EXPECT_NE(output.find("Quantum report summary: fringe_spacing_mm="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsBarrierFlagsForParticleInBoxQuantumScenario) {
	const auto output_path = unique_temp_path("_quantum_invalid_box.txt");
	const auto image_path = unique_temp_path("_quantum_invalid_box.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain quantum --scenario particle-in-a-box --barrier-height-ev 3.1 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--barrier-height-ev cannot be used with quantum scenario particle-in-a-box"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsQuantumPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_quantum.json");
	const auto export_path = unique_temp_path("_export_quantum.json");
	const auto image_path = unique_temp_path("_import_quantum.ppm");
	const auto output_path = unique_temp_path("_import_quantum.txt");

	auto scenario = visual_physics::quantum::make_default_scenario(
		visual_physics::quantum::ScenarioId::ParticleInBox);
	scenario.box_length_nanometers = 1.6;
	scenario.quantum_number = 2.0;
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.15);
	const auto samples = visual_physics::quantum::build_samples(scenario, 10);
	write_text_file(
		import_path,
		visual_physics::quantum::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_probability_guide = true,
				.show_potential_guide = false,
				.show_phase_guide = true,
			},
			samples,
			"2026-06-03T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain quantum --import " + shell_quote(import_path) +
		" --time 0.45 --box-length-nanometers 2.8 --quantum-number 4" +
		" --show-probability-guide false --show-phase-guide false" +
		" --export-state " + shell_quote(export_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto exported_payload = read_text_file(export_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"particle-in-a-box\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"boxLengthNanometers\": 2.8"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"quantumNumber\": 4.0"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"timeSeconds\": 0.45"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showProbabilityGuide\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showPotentialGuide\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showPhaseGuide\": false"), std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("time=0.45s"), std::string::npos);
	EXPECT_NE(output.find("Quantum overlays: probabilityGuide=off, potentialGuide=off, phaseGuide=off"), std::string::npos);
	EXPECT_NE(output.find("Overrides: boxLengthNanometers=2.800000, quantumNumber=4.000000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsTunnelingQuantumPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_quantum_tunneling.json");
	const auto export_path = unique_temp_path("_export_quantum_tunneling.json");
	const auto image_path = unique_temp_path("_import_quantum_tunneling.ppm");
	const auto output_path = unique_temp_path("_import_quantum_tunneling.txt");

	auto scenario = visual_physics::quantum::make_default_scenario(
		visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling);
	scenario.particle_energy_ev = 2.2;
	scenario.barrier_height_ev = 3.7;
	scenario.barrier_width_nanometers = 0.48;
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::quantum::build_samples(scenario, 10);
	write_text_file(
		import_path,
		visual_physics::quantum::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_probability_guide = true,
				.show_potential_guide = true,
				.show_phase_guide = false,
			},
			samples,
			"2026-06-03T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain quantum --import " + shell_quote(import_path) +
		" --time 0.55 --particle-energy-ev 2.9 --barrier-height-ev 4.4 --barrier-width-nanometers 0.66" +
		" --show-probability-guide false --show-phase-guide true" +
		" --export-state " + shell_quote(export_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto exported_payload = read_text_file(export_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"finite-potential-well-tunneling\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"particleEnergyEv\": 2.9"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"barrierHeightEv\": 4.4"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"barrierWidthNanometers\": 0.66"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"timeSeconds\": 0.55"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showProbabilityGuide\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showPotentialGuide\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showPhaseGuide\": true"), std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("time=0.55s"), std::string::npos);
	EXPECT_NE(output.find("Quantum overlays: probabilityGuide=off, potentialGuide=on, phaseGuide=on"), std::string::npos);
	EXPECT_NE(output.find("Overrides: particleEnergyEv=2.900000, barrierHeightEv=4.400000, barrierWidthNanometers=0.660000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsDoubleSlitQuantumPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_quantum_double_slit.json");
	const auto export_path = unique_temp_path("_export_quantum_double_slit.json");
	const auto image_path = unique_temp_path("_import_quantum_double_slit.ppm");
	const auto output_path = unique_temp_path("_import_quantum_double_slit.txt");

	auto scenario = visual_physics::quantum::make_default_scenario(
		visual_physics::quantum::ScenarioId::DoubleSlitInterference);
	scenario.wavelength_nanometers = 540.0;
	scenario.slit_separation_micrometers = 125.0;
	scenario.slit_width_micrometers = 42.0;
	scenario.screen_distance_meters = 1.9;
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::quantum::build_samples(scenario, 10);
	write_text_file(
		import_path,
		visual_physics::quantum::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_probability_guide = false,
				.show_potential_guide = true,
				.show_phase_guide = true,
			},
			samples,
			"2026-06-03T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain quantum --import " + shell_quote(import_path) +
		" --time 0.65 --wavelength-nanometers 610 --slit-separation-micrometers 155 --slit-width-micrometers 58 --screen-distance-meters 2.6" +
		" --show-probability-guide true --show-potential-guide false" +
		" --export-state " + shell_quote(export_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto exported_payload = read_text_file(export_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"double-slit-interference\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"wavelengthNanometers\": 610.0"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"slitSeparationMicrometers\": 155.0"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"slitWidthMicrometers\": 58.0"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"screenDistanceMeters\": 2.6"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"timeSeconds\": 0.65"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showProbabilityGuide\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showPotentialGuide\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showPhaseGuide\": true"), std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("time=0.65s"), std::string::npos);
	EXPECT_NE(output.find("Quantum overlays: probabilityGuide=on, potentialGuide=off, phaseGuide=on"), std::string::npos);
	EXPECT_NE(output.find("Overrides: wavelengthNanometers=610.000000, slitSeparationMicrometers=155.000000, slitWidthMicrometers=58.000000, screenDistanceMeters=2.600000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsScenarioImportCombinationForQuantum) {
	const auto import_path = unique_temp_path("_quantum_scenario_import_conflict.json");
	const auto output_path = unique_temp_path("_quantum_scenario_import_conflict.txt");

	const auto scenario = visual_physics::quantum::make_default_scenario(
		visual_physics::quantum::ScenarioId::DoubleSlitInterference);
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::quantum::build_samples(scenario, 8);
	write_text_file(
		import_path,
		visual_physics::quantum::serialize_export_payload(
			scenario,
			snapshot,
			{},
			samples,
			"2026-06-03T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain quantum --scenario particle-in-a-box --import " + shell_quote(import_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--scenario cannot be combined with --import"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersSnellOpticsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_optics_snell.ppm");
	const auto payload_path = unique_temp_path("_optics_snell.json");
	const auto output_path = unique_temp_path("_optics_snell.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain optics --scenario snell-refraction --time 0.25 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"snell-refraction\""), std::string::npos);
	EXPECT_NE(payload.find("\"incidentAngleDegrees\": 32.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showIncidentGuide\": true"), std::string::npos);
	EXPECT_NE(output.find("Domain: optics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: snell-refraction"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Optics overlays: incidentGuide=on, normalGuide=on, secondaryGuide=on"), std::string::npos);
	EXPECT_NE(output.find("Optics snapshot: incidentAngle="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersThinLensOpticsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_optics_lens.ppm");
	const auto payload_path = unique_temp_path("_optics_lens.json");
	const auto output_path = unique_temp_path("_optics_lens.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain optics --scenario thin-lens-imaging --time 0.25 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"thin-lens-imaging\""), std::string::npos);
	EXPECT_NE(payload.find("\"focalLengthCentimeters\": 18.0"), std::string::npos);
	EXPECT_NE(payload.find("\"imageDistanceCentimeters\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: optics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: thin-lens-imaging"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Optics snapshot: focalLength="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersSingleSlitOpticsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_optics_diffraction.ppm");
	const auto payload_path = unique_temp_path("_optics_diffraction.json");
	const auto output_path = unique_temp_path("_optics_diffraction.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain optics --scenario single-slit-diffraction --time 0.25 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"single-slit-diffraction\""), std::string::npos);
	EXPECT_NE(payload.find("\"slitWidthMicrometers\": 40.0"), std::string::npos);
	EXPECT_NE(payload.find("\"centralMaximumWidthMillimeters\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: optics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: single-slit-diffraction"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Optics snapshot: slitWidth="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsThermodynamicsScenarios) {
	const auto output_path = unique_temp_path("_thermodynamics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain thermodynamics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("ideal-gas-state"), std::string::npos);
	EXPECT_NE(output.find("heat-conduction-slab"), std::string::npos);
	EXPECT_NE(output.find("carnot-cycle"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersThermodynamicsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_thermodynamics.ppm");
	const auto payload_path = unique_temp_path("_thermodynamics.json");
	const auto output_path = unique_temp_path("_thermodynamics.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain thermodynamics --scenario ideal-gas-state --time 1.5 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"ideal-gas-state\""), std::string::npos);
	EXPECT_NE(payload.find("\"temperatureKelvin\": 320.0"), std::string::npos);
	EXPECT_NE(payload.find("\"pressurePascals\":"), std::string::npos);
	EXPECT_NE(payload.find("\"showPressureGuide\": true"), std::string::npos);
	EXPECT_NE(output.find("Domain: thermodynamics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: ideal-gas-state"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Thermodynamics overlays: pressureGuide=on, temperatureBand=on, energyMarker=on"), std::string::npos);
	EXPECT_NE(output.find("Thermodynamics snapshot: pressure="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersHeatConductionScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_thermodynamics_conduction.ppm");
	const auto payload_path = unique_temp_path("_thermodynamics_conduction.json");
	const auto output_path = unique_temp_path("_thermodynamics_conduction.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain thermodynamics --scenario heat-conduction-slab --time 120 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"heat-conduction-slab\""), std::string::npos);
	EXPECT_NE(payload.find("\"slabThicknessMeters\": 0.08"), std::string::npos);
	EXPECT_NE(payload.find("\"fourierNumber\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: thermodynamics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: heat-conduction-slab"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Thermodynamics snapshot: centerTemperature="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersCarnotCycleScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_thermodynamics_carnot.ppm");
	const auto payload_path = unique_temp_path("_thermodynamics_carnot.json");
	const auto output_path = unique_temp_path("_thermodynamics_carnot.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain thermodynamics --scenario carnot-cycle --time 175 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"carnot-cycle\""), std::string::npos);
	EXPECT_NE(payload.find("\"hotReservoirTemperatureKelvin\": 600.0"), std::string::npos);
	EXPECT_NE(payload.find("\"thermalEfficiency\":"), std::string::npos);
	EXPECT_NE(payload.find("\"cycleStageLabel\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: thermodynamics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: carnot-cycle"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Thermodynamics snapshot: pressure="), std::string::npos);
	EXPECT_NE(output.find("stage="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersElectronicsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics.ppm");
	const auto payload_path = unique_temp_path("_electronics.json");
	const auto output_path = unique_temp_path("_electronics.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario rc-transient --time 0.72 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"rc-transient\""), std::string::npos);
	EXPECT_NE(payload.find("\"sourceVoltage\": 12.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeConstantSeconds\":"), std::string::npos);
	EXPECT_NE(payload.find("\"showSourceVoltage\": true"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: rc-transient"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics overlays: sourceVoltage=on, resistorVoltage=on, energyCurve=on"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: capacitorVoltage="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersHalfWaveRectifierScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_half_wave_rectifier.ppm");
	const auto payload_path = unique_temp_path("_electronics_half_wave_rectifier.json");
	const auto output_path = unique_temp_path("_electronics_half_wave_rectifier.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario half-wave-rectifier --time 0.005 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"half-wave-rectifier\""), std::string::npos);
	EXPECT_NE(payload.find("\"resistanceOhms\": 220.0"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"lowerBranchPowerWatts\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: half-wave-rectifier"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: sourceWaveform="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersFullWaveRectifierScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_full_wave_rectifier.ppm");
	const auto payload_path = unique_temp_path("_electronics_full_wave_rectifier.json");
	const auto output_path = unique_temp_path("_electronics_full_wave_rectifier.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario full-wave-rectifier --time 0.005 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"full-wave-rectifier\""), std::string::npos);
	EXPECT_NE(payload.find("\"resistanceOhms\": 220.0"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"lowerBranchPowerWatts\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: full-wave-rectifier"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: sourceWaveform="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersSmoothedRectifierScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_smoothed_rectifier.ppm");
	const auto payload_path = unique_temp_path("_electronics_smoothed_rectifier.json");
	const auto output_path = unique_temp_path("_electronics_smoothed_rectifier.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario smoothed-rectifier --time 0.02 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"smoothed-rectifier\""), std::string::npos);
	EXPECT_NE(payload.find("\"resistanceOhms\": 220.0"), std::string::npos);
	EXPECT_NE(payload.find("\"capacitanceFarads\": 0.00047"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"storedEnergyJoules\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: smoothed-rectifier"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: sourceWaveform="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRlcResponseScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_rlc_response.ppm");
	const auto payload_path = unique_temp_path("_electronics_rlc_response.json");
	const auto output_path = unique_temp_path("_electronics_rlc_response.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario rlc-response --time 0.4 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"rlc-response\""), std::string::npos);
	EXPECT_NE(payload.find("\"capacitanceFarads\": 0.05"), std::string::npos);
	EXPECT_NE(payload.find("\"inductanceHenrys\": 0.5"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"storedEnergyJoules\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: rlc-response"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: capacitorVoltage="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRlTransientScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_rl_transient.ppm");
	const auto payload_path = unique_temp_path("_electronics_rl_transient.json");
	const auto output_path = unique_temp_path("_electronics_rl_transient.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario rl-transient --time 0.16 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"rl-transient\""), std::string::npos);
	EXPECT_NE(payload.find("\"inductanceHenrys\": 0.12"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"fluxLinkageWebers\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: rl-transient"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: inductorVoltage="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRcLowPassScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_rc_low_pass.ppm");
	const auto payload_path = unique_temp_path("_electronics_rc_low_pass.json");
	const auto output_path = unique_temp_path("_electronics_rc_low_pass.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario rc-low-pass --time 159.154943 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"rc-low-pass\""), std::string::npos);
	EXPECT_NE(payload.find("\"capacitanceFarads\": 1e-06"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"timeConstantSeconds\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: rc-low-pass"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: cutoffFrequency="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRcHighPassScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_rc_high_pass.ppm");
	const auto payload_path = unique_temp_path("_electronics_rc_high_pass.json");
	const auto output_path = unique_temp_path("_electronics_rc_high_pass.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario rc-high-pass --time 159.154943 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"rc-high-pass\""), std::string::npos);
	EXPECT_NE(payload.find("\"capacitanceFarads\": 1e-06"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"timeConstantSeconds\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: rc-high-pass"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: cutoffFrequency="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRlLowPassScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_rl_low_pass.ppm");
	const auto payload_path = unique_temp_path("_electronics_rl_low_pass.json");
	const auto output_path = unique_temp_path("_electronics_rl_low_pass.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario rl-low-pass --time 1591.549431 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"rl-low-pass\""), std::string::npos);
	EXPECT_NE(payload.find("\"inductanceHenrys\": 0.1"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"fluxLinkageWebers\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: rl-low-pass"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: cutoffFrequency="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRlHighPassScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_rl_high_pass.ppm");
	const auto payload_path = unique_temp_path("_electronics_rl_high_pass.json");
	const auto output_path = unique_temp_path("_electronics_rl_high_pass.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario rl-high-pass --time 1591.549431 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"rl-high-pass\""), std::string::npos);
	EXPECT_NE(payload.find("\"inductanceHenrys\": 0.1"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"fluxLinkageWebers\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: rl-high-pass"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: cutoffFrequency="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersRlcResonanceScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_rlc_resonance.ppm");
	const auto payload_path = unique_temp_path("_electronics_rlc_resonance.json");
	const auto output_path = unique_temp_path("_electronics_rlc_resonance.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario rlc-resonance --time 5.032921 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"rlc-resonance\""), std::string::npos);
	EXPECT_NE(payload.find("\"capacitanceFarads\": 0.005"), std::string::npos);
	EXPECT_NE(payload.find("\"inductanceHenrys\": 0.2"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"lowerBranchPowerWatts\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: rlc-resonance"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: resonantFrequency="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersResistorNetworkScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electronics_resistor_network.ppm");
	const auto payload_path = unique_temp_path("_electronics_resistor_network.json");
	const auto output_path = unique_temp_path("_electronics_resistor_network.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electronics-and-circuits --scenario resistor-network --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"resistor-network\""), std::string::npos);
	EXPECT_NE(payload.find("\"upperResistanceOhms\": 1500.0"), std::string::npos);
	EXPECT_NE(payload.find("\"lowerResistanceOhms\": 3300.0"), std::string::npos);
	EXPECT_NE(payload.find("\"outputVoltage\":"), std::string::npos);
	EXPECT_NE(payload.find("\"equivalentResistanceOhms\":"), std::string::npos);
	EXPECT_NE(output.find("Domain: electronics-and-circuits"), std::string::npos);
	EXPECT_NE(output.find("Scenario: resistor-network"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Electronics snapshot: outputVoltage="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ListsComputationalPhysicsScenarios) {
	const auto output_path = unique_temp_path("_computational_physics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain computational-physics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("projectile-solver-comparison"), std::string::npos);
	EXPECT_NE(output.find("orbital-solver-comparison"), std::string::npos);
	EXPECT_NE(output.find("spring-oscillator-comparison"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersComputationalPhysicsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_computational_physics.ppm");
	const auto payload_path = unique_temp_path("_computational_physics.json");
	const auto output_path = unique_temp_path("_computational_physics.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain computational-physics --scenario projectile-solver-comparison --comparison-step-seconds 0.2 --reference-step-seconds 0.01 --drag-coefficient 0.45 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"projectile-solver-comparison\""), std::string::npos);
	EXPECT_NE(payload.find("\"comparisonStepSeconds\": 0.2"), std::string::npos);
	EXPECT_NE(payload.find("\"referenceStepSeconds\": 0.01"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceTrajectory\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"convergenceStudy\""), std::string::npos);
	EXPECT_NE(payload.find("\"symplecticFinalPositionError\""), std::string::npos);
	EXPECT_NE(payload.find("\"solverRecommendation\""), std::string::npos);
	EXPECT_NE(payload.find("\"solverRecommendationRanking\""), std::string::npos);
	EXPECT_NE(payload.find("\"observedOrders\""), std::string::npos);
	EXPECT_NE(payload.find("\"convergencePlotGuides\""), std::string::npos);
	EXPECT_NE(output.find("Domain: computational-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: projectile-solver-comparison"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Computational Physics overlays: reference=on, euler=on, symplectic=on, rk4=on, errorBars=on"), std::string::npos);
	EXPECT_NE(output.find("Computational Physics snapshot: eulerError="), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}
TEST(VisualPhysicsVulkanExecutable, RejectsQuantumReportCsvForNonQuantumDomain) {
	const auto output_path = unique_temp_path("_quantum_report_invalid_domain.txt");
	const auto report_csv_path = unique_temp_path("_quantum_report_invalid_domain.csv");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --export-quantum-report-csv " +
		shell_quote(report_csv_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Quantum report CSV export flag can only be used with --domain quantum"),
		std::string::npos);

	std::filesystem::remove(output_path);
	std::filesystem::remove(report_csv_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersOrbitalComputationalPhysicsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_computational_physics_orbital.ppm");
	const auto payload_path = unique_temp_path("_computational_physics_orbital.json");
	const auto convergence_csv_path = unique_temp_path("_computational_physics_orbital_convergence.csv");
	const auto invariant_csv_path = unique_temp_path("_computational_physics_orbital_invariant.csv");
	const auto output_path = unique_temp_path("_computational_physics_orbital.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain computational-physics --scenario orbital-solver-comparison --orbital-center-x 0 --orbital-center-y 0 --gravitational-parameter 20 --comparison-step-seconds 0.2 --reference-step-seconds 0.01 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-convergence-csv " + shell_quote(convergence_csv_path) +
		" --export-orbital-invariant-csv " + shell_quote(invariant_csv_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(convergence_csv_path));
	ASSERT_TRUE(std::filesystem::exists(invariant_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto convergence_csv = read_text_file(convergence_csv_path);
	const auto invariant_csv = read_text_file(invariant_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"orbital-solver-comparison\""), std::string::npos);
	EXPECT_NE(payload.find("\"orbitalCenter\""), std::string::npos);
	EXPECT_NE(payload.find("\"gravitationalParameter\": 20.0"), std::string::npos);
	EXPECT_NE(payload.find("\"orbitalDiagnostics\""), std::string::npos);
	EXPECT_NE(payload.find("\"eulerFinalSpecificEnergyError\""), std::string::npos);
	EXPECT_NE(payload.find("\"orbitalInvariantHistory\""), std::string::npos);
	EXPECT_NE(payload.find("\"angularMomentumTolerance\""), std::string::npos);
	EXPECT_NE(payload.find("\"limitingMetric\""), std::string::npos);
	EXPECT_NE(convergence_csv.find("recommended_solver_method"), std::string::npos);
	EXPECT_NE(convergence_csv.find("guide_orbital_angular_momentum_tolerance"), std::string::npos);
	EXPECT_NE(invariant_csv.find("euler_angular_momentum_error"), std::string::npos);
	EXPECT_NE(output.find("Scenario: orbital-solver-comparison"), std::string::npos);
	EXPECT_NE(output.find("eulerEnergyError="), std::string::npos);
	EXPECT_NE(output.find("Exported convergence CSV: "), std::string::npos);
	EXPECT_NE(output.find("Exported orbital invariant CSV: "), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(convergence_csv_path);
	std::filesystem::remove(invariant_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsProjectileOnlyFlagsForOrbitalComputationalPhysicsScenario) {
	const auto output_path = unique_temp_path("_computational_physics_orbital_invalid.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain computational-physics --scenario orbital-solver-comparison --drag-coefficient 0.3 > " +
		shell_quote(output_path) + " 2>&1";

	EXPECT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--drag-coefficient cannot be used with computational physics scenario orbital-solver-comparison"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersSpringComputationalPhysicsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_computational_physics_spring.ppm");
	const auto payload_path = unique_temp_path("_computational_physics_spring.json");
	const auto convergence_csv_path = unique_temp_path("_computational_physics_spring_convergence.csv");
	const auto invariant_csv_path = unique_temp_path("_computational_physics_spring_invariant.csv");
	const auto output_path = unique_temp_path("_computational_physics_spring.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain computational-physics --scenario spring-oscillator-comparison --spring-anchor-x 0 --spring-anchor-y 0 --spring-constant 4.2 --damping-coefficient 0.08 --comparison-step-seconds 0.2 --reference-step-seconds 0.01 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-convergence-csv " + shell_quote(convergence_csv_path) +
		" --export-spring-invariant-csv " + shell_quote(invariant_csv_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(convergence_csv_path));
	ASSERT_TRUE(std::filesystem::exists(invariant_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto convergence_csv = read_text_file(convergence_csv_path);
	const auto invariant_csv = read_text_file(invariant_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"spring-oscillator-comparison\""), std::string::npos);
	EXPECT_NE(payload.find("\"springAnchor\""), std::string::npos);
	EXPECT_NE(payload.find("\"springConstant\": 4.2"), std::string::npos);
	EXPECT_NE(payload.find("\"dampingCoefficient\": 0.08"), std::string::npos);
	EXPECT_NE(payload.find("\"springDiagnostics\""), std::string::npos);
	EXPECT_NE(payload.find("\"eulerFinalSpringEnergyError\""), std::string::npos);
	EXPECT_NE(payload.find("\"springInvariantHistory\""), std::string::npos);
	EXPECT_NE(payload.find("\"phaseTolerance\""), std::string::npos);
	EXPECT_NE(payload.find("\"recommendedStepSeconds\""), std::string::npos);
	EXPECT_NE(convergence_csv.find("guide_spring_phase_tolerance"), std::string::npos);
	EXPECT_NE(convergence_csv.find("recommended_solver_method"), std::string::npos);
	EXPECT_NE(invariant_csv.find("euler_phase_error"), std::string::npos);
	EXPECT_NE(output.find("Scenario: spring-oscillator-comparison"), std::string::npos);
	EXPECT_NE(output.find("eulerSpringEnergyError="), std::string::npos);
	EXPECT_NE(output.find("Exported convergence CSV: "), std::string::npos);
	EXPECT_NE(output.find("Exported spring invariant CSV: "), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(convergence_csv_path);
	std::filesystem::remove(invariant_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsOrbitalOnlyFlagsForSpringComputationalPhysicsScenario) {
	const auto output_path = unique_temp_path("_computational_physics_spring_invalid.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain computational-physics --scenario spring-oscillator-comparison --gravitational-parameter 20 > " +
		shell_quote(output_path) + " 2>&1";

	EXPECT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--gravitational-parameter cannot be used with computational physics scenario spring-oscillator-comparison"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsComputationalPhysicsCsvExportFlagsOutsideComputationalPhysicsDomain) {
	const auto output_path = unique_temp_path("_computational_physics_csv_invalid.txt");
	const auto csv_path = unique_temp_path("_computational_physics_invalid.csv");
	const auto command = shell_quote(executable_path()) +
		" --domain dynamics --scenario constant-force --export-convergence-csv " +
		shell_quote(csv_path) + " > " + shell_quote(output_path) + " 2>&1";

	EXPECT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Computational Physics CSV export flags can only be used with --domain computational-physics"),
		std::string::npos);

	std::filesystem::remove(output_path);
	std::filesystem::remove(csv_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersStaticsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_statics.ppm");
	const auto payload_path = unique_temp_path("_statics.json");
	const auto output_path = unique_temp_path("_statics.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain statics --scenario beam-support --load-position 7 --load-magnitude 15 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"beam-support\""), std::string::npos);
	EXPECT_NE(payload.find("\"loadPosition\": 7.0"), std::string::npos);
	EXPECT_NE(payload.find("\"loadMagnitude\": 15.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showAppliedForce\": true"), std::string::npos);
	EXPECT_NE(output.find("Domain: statics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: beam-support"), std::string::npos);
	EXPECT_NE(output.find("Statics overlays: appliedForce=on, reactions=on, residualGuides=on"), std::string::npos);
	EXPECT_NE(output.find("Statics equilibrium: stable=yes"), std::string::npos);
	EXPECT_NE(output.find("residualForce=(0.00, 0.00)"), std::string::npos);
	EXPECT_NE(output.find("primaryReaction=(0.00, 3.75)"), std::string::npos);
	EXPECT_NE(output.find("secondaryReaction=(0.00, 11.25)"), std::string::npos);
	EXPECT_NE(output.find("overlayMarkers=18 vertices"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersInclinedPlaneScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_statics_incline.ppm");
	const auto payload_path = unique_temp_path("_statics_incline.json");
	const auto output_path = unique_temp_path("_statics_incline.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain statics --scenario inclined-plane --mass 2 --angle-degrees 35 --friction-coefficient 0.6 --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"inclined-plane\""), std::string::npos);
	EXPECT_NE(payload.find("\"angleDegrees\": 35.0"), std::string::npos);
	EXPECT_NE(payload.find("\"frictionCoefficient\": 0.6"), std::string::npos);
	EXPECT_NE(output.find("Scenario: inclined-plane"), std::string::npos);
	EXPECT_NE(output.find("Statics equilibrium: stable=no"), std::string::npos);
	EXPECT_NE(output.find("residualForce=(-1.32, -0.92)"), std::string::npos);
	EXPECT_NE(output.find("primaryReaction=(-9.22, 13.17)"), std::string::npos);
	EXPECT_NE(output.find("secondaryReaction=(7.90, 5.53)"), std::string::npos);
	EXPECT_NE(output.find("residualTorque=0.00"), std::string::npos);
	EXPECT_NE(output.find("trajectory=12 vertices"), std::string::npos);
	EXPECT_NE(output.find("overlayMarkers=24 vertices"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersPulleyScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_statics_pulley.ppm");
	const auto payload_path = unique_temp_path("_statics_pulley.json");
	const auto output_path = unique_temp_path("_statics_pulley.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain statics --scenario pulley-equilibrium --mass 1 --secondary-mass 1.5 --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"pulley-equilibrium\""), std::string::npos);
	EXPECT_NE(payload.find("\"secondaryMass\": 1.5"), std::string::npos);
	EXPECT_NE(output.find("Scenario: pulley-equilibrium"), std::string::npos);
	EXPECT_NE(output.find("Statics equilibrium: stable=no"), std::string::npos);
	EXPECT_NE(output.find("residualForce=(0.00, -4.90)"), std::string::npos);
	EXPECT_NE(output.find("primaryReaction=(0.00, 9.81)"), std::string::npos);
	EXPECT_NE(output.find("secondaryReaction=(0.00, 9.81)"), std::string::npos);
	EXPECT_NE(output.find("trajectory=30 vertices"), std::string::npos);
	EXPECT_NE(output.find("overlayMarkers=24 vertices"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(ElectromagnetismCore, SamplesPointChargeElectrostaticsWithExpectedProbeAndField) {
	const auto scenario =
		visual_physics::electromagnetism::make_default_scenario(
			visual_physics::electromagnetism::ScenarioId::PointChargeElectrostatics);
	const auto snapshot = visual_physics::electromagnetism::sample_scenario(scenario);

	EXPECT_NEAR(snapshot.position.x, 0.0, 1e-9);
	EXPECT_NEAR(snapshot.position.y, 1.5, 1e-9);
	EXPECT_GT(snapshot.electric_field.x, 1.0);
	EXPECT_NEAR(snapshot.electric_field.y, 0.0, 1e-9);
	EXPECT_NEAR(snapshot.force.x, snapshot.electric_field.x, 1e-9);
	EXPECT_TRUE(snapshot.stable);
}

TEST(ComputationalPhysicsCore, SamplesProjectileSolverComparisonAndBuildsConvergenceRows) {
	const auto scenario =
		visual_physics::computational_physics::make_default_scenario(
			visual_physics::computational_physics::ScenarioId::ProjectileSolverComparison);
	const auto snapshot = visual_physics::computational_physics::sample_scenario(scenario, 1.5);
	const auto convergence =
		visual_physics::computational_physics::build_convergence_study(scenario);

	EXPECT_GT(snapshot.euler.position_error, snapshot.rk4.position_error);
	EXPECT_GT(snapshot.euler.max_path_deviation, 0.0);
	ASSERT_EQ(convergence.size(), 4U);
	EXPECT_GT(convergence.front().step_seconds, convergence.back().step_seconds);
	EXPECT_GT(convergence.front().euler_final_position_error, convergence.back().euler_final_position_error);
}

TEST(ComputationalPhysicsCore, SamplesOrbitalSolverComparisonWithInvariantDiagnostics) {
	const auto scenario =
		visual_physics::computational_physics::make_default_scenario(
			visual_physics::computational_physics::ScenarioId::OrbitalSolverComparison);
	const auto snapshot = visual_physics::computational_physics::sample_scenario(scenario, 8.0);
	const auto convergence =
		visual_physics::computational_physics::build_convergence_study(scenario);

	ASSERT_TRUE(snapshot.orbital_diagnostics.has_value());
	EXPECT_GT(snapshot.orbital_diagnostics->euler_specific_energy_error, 0.0);
	EXPECT_GT(snapshot.orbital_diagnostics->euler_angular_momentum_error, 0.0);
	ASSERT_EQ(convergence.size(), 4U);
	ASSERT_TRUE(convergence.front().euler_final_specific_energy_error.has_value());
	ASSERT_TRUE(convergence.front().rk4_final_angular_momentum_error.has_value());
	EXPECT_GT(*convergence.front().euler_final_specific_energy_error, *convergence.back().rk4_final_specific_energy_error);
	const auto history =
		visual_physics::computational_physics::build_orbital_invariant_history(scenario, 8);
	ASSERT_EQ(history.size(), 8U);
	EXPECT_LT(history.back().rk4_angular_momentum_error, history.back().euler_angular_momentum_error);
}

TEST(ComputationalPhysicsCore, SamplesSpringSolverComparisonWithOscillatorDiagnostics) {
	const auto scenario =
		visual_physics::computational_physics::make_default_scenario(
			visual_physics::computational_physics::ScenarioId::SpringOscillatorComparison);
	const auto snapshot = visual_physics::computational_physics::sample_scenario(scenario, 12.0);
	const auto convergence =
		visual_physics::computational_physics::build_convergence_study(scenario);

	ASSERT_TRUE(snapshot.spring_diagnostics.has_value());
	EXPECT_GT(snapshot.spring_diagnostics->euler_total_energy_error, 0.0);
	EXPECT_GT(snapshot.spring_diagnostics->euler_phase_angle_error, 0.0);
	EXPECT_LT(snapshot.rk4.position_error, snapshot.euler.position_error);
	ASSERT_EQ(convergence.size(), 4U);
	ASSERT_TRUE(convergence.front().euler_final_spring_energy_error.has_value());
	ASSERT_TRUE(convergence.front().rk4_final_spring_phase_error.has_value());
	EXPECT_GT(*convergence.front().euler_final_spring_energy_error, *convergence.back().rk4_final_spring_energy_error);
	const auto history =
		visual_physics::computational_physics::build_spring_invariant_history(scenario, 8);
	ASSERT_EQ(history.size(), 8U);
	EXPECT_LT(history.back().rk4_phase_angle_error, history.back().euler_phase_angle_error);
}

TEST(ElectromagnetismCore, SamplesMovingChargeScenarioOverTimeAndBuildsSamples) {
	auto scenario =
		visual_physics::electromagnetism::make_default_scenario(
			visual_physics::electromagnetism::ScenarioId::MovingChargeMagneticField);
	scenario.magnetic_field_strength = 2.0;
	const auto snapshot = visual_physics::electromagnetism::sample_scenario(scenario, 1.5);
	const auto samples = visual_physics::electromagnetism::build_samples(scenario, 8);

	EXPECT_NEAR(snapshot.time_seconds, 1.5, 1e-9);
	EXPECT_GT(std::abs(snapshot.position.x - scenario.initial_position.x), 0.1);
	EXPECT_GT(snapshot.force_magnitude, 0.1);
	ASSERT_EQ(samples.size(), 8U);
	EXPECT_NEAR(samples.front().time_seconds, 0.0, 1e-9);
	EXPECT_NEAR(samples.back().time_seconds, scenario.duration_seconds, 1e-9);
}

TEST(ElectromagnetismCore, SamplesCurrentLoopAndInductionScenarios) {
	auto loop_scenario =
		visual_physics::electromagnetism::make_default_scenario(
			visual_physics::electromagnetism::ScenarioId::CurrentLoopMagneticField);
	loop_scenario.current = 5.0;
	loop_scenario.loop_radius = 2.2;
	const auto loop_snapshot = visual_physics::electromagnetism::sample_scenario(loop_scenario);

	auto induction_scenario =
		visual_physics::electromagnetism::make_default_scenario(
			visual_physics::electromagnetism::ScenarioId::ElectromagneticInduction);
	induction_scenario.flux_rate = 3.0;
	induction_scenario.inductance = 1.4;
	const auto early_snapshot =
		visual_physics::electromagnetism::sample_scenario(induction_scenario, 0.0);
	const auto late_snapshot =
		visual_physics::electromagnetism::sample_scenario(induction_scenario, 1.5);

	EXPECT_GT(loop_snapshot.field_magnitude, 0.1);
	EXPECT_NEAR(loop_snapshot.magnetic_field.x, 0.0, 1e-9);
	EXPECT_GT(std::abs(early_snapshot.force.x - late_snapshot.force.x), 0.1);
	EXPECT_GT(std::abs(early_snapshot.magnetic_field.y - late_snapshot.magnetic_field.y), 0.1);
}

TEST(ElectromagnetismPayload, SerializesAndParsesScenarioSpecificFields) {
	auto scenario =
		visual_physics::electromagnetism::make_default_scenario(
			visual_physics::electromagnetism::ScenarioId::CapacitorPotentialField);
	scenario.plate_separation = 3.5;
	scenario.potential_difference = 18.0;
	scenario.probe_point = visual_physics::electromagnetism::Vector2{1.1, -0.8};
	const auto snapshot = visual_physics::electromagnetism::sample_scenario(scenario);
	const auto payload = visual_physics::electromagnetism::serialize_export_payload(
		scenario,
		snapshot,
		{true, false, true, false, false},
		visual_physics::electromagnetism::build_samples(scenario, 6),
		"2026-06-02T00:00:00.000Z");
	const auto imported = visual_physics::electromagnetism::parse_import_payload(payload);

	EXPECT_EQ(imported.scenario.id, visual_physics::electromagnetism::ScenarioId::CapacitorPotentialField);
	ASSERT_TRUE(imported.scenario.plate_separation.has_value());
	ASSERT_TRUE(imported.scenario.potential_difference.has_value());
	ASSERT_TRUE(imported.scenario.probe_point.has_value());
	EXPECT_NEAR(*imported.scenario.plate_separation, 3.5, 1e-9);
	EXPECT_NEAR(*imported.scenario.potential_difference, 18.0, 1e-9);
	EXPECT_NEAR(imported.scenario.probe_point->x, 1.1, 1e-9);
	EXPECT_FALSE(imported.overlays->show_magnetic_field);
	EXPECT_FALSE(imported.overlays->show_potential_guides);
}

TEST(ElectromagnetismPayload, RoundTripsInductionScenarioSnapshotSamplesAndOverlays) {
	auto scenario =
		visual_physics::electromagnetism::make_default_scenario(
			visual_physics::electromagnetism::ScenarioId::ElectromagneticInduction);
	scenario.probe_point = visual_physics::electromagnetism::Vector2{0.4, -0.2};
	scenario.flux_rate = 3.2;
	scenario.inductance = 1.6;
	const auto snapshot = visual_physics::electromagnetism::sample_scenario(scenario, 2.25);
	const auto samples = visual_physics::electromagnetism::build_samples(scenario, 10);
	const visual_physics::electromagnetism::OverlayOptions overlays{
		.show_field_vectors = false,
		.show_magnetic_field = true,
		.show_force_vectors = false,
		.show_potential_guides = true,
		.show_trajectory = false,
	};
	const auto payload = visual_physics::electromagnetism::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-02T00:00:00.000Z");
	const auto imported = visual_physics::electromagnetism::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::electromagnetism::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::electromagnetism::build_samples(imported.scenario, 10);

	EXPECT_EQ(imported.scenario.id, visual_physics::electromagnetism::ScenarioId::ElectromagneticInduction);
	ASSERT_TRUE(imported.scenario.probe_point.has_value());
	ASSERT_TRUE(imported.scenario.flux_rate.has_value());
	ASSERT_TRUE(imported.scenario.inductance.has_value());
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_NEAR(imported.time_seconds, 2.25, 1e-9);
	EXPECT_NEAR(imported.scenario.probe_point->x, 0.4, 1e-9);
	EXPECT_NEAR(imported.scenario.probe_point->y, -0.2, 1e-9);
	EXPECT_NEAR(*imported.scenario.flux_rate, 3.2, 1e-9);
	EXPECT_NEAR(*imported.scenario.inductance, 1.6, 1e-9);
	EXPECT_FALSE(imported.overlays->show_field_vectors);
	EXPECT_TRUE(imported.overlays->show_magnetic_field);
	EXPECT_FALSE(imported.overlays->show_force_vectors);
	EXPECT_TRUE(imported.overlays->show_potential_guides);
	EXPECT_FALSE(imported.overlays->show_trajectory);
	EXPECT_NEAR(roundtrip_snapshot.force.x, snapshot.force.x, 1e-9);
	EXPECT_NEAR(roundtrip_snapshot.magnetic_field.y, snapshot.magnetic_field.y, 1e-9);
	ASSERT_EQ(roundtrip_samples.size(), samples.size());
	EXPECT_NEAR(roundtrip_samples.back().time_seconds, samples.back().time_seconds, 1e-9);
	EXPECT_NEAR(roundtrip_samples.back().field_magnitude, samples.back().field_magnitude, 1e-9);
	EXPECT_NEAR(roundtrip_samples.back().force_magnitude, samples.back().force_magnitude, 1e-9);
}

TEST(ElectromagnetismOverlay, BuildsVerticesForStaticAndDynamicScenarios) {
	const auto point_scenario =
		visual_physics::electromagnetism::make_default_scenario(
			visual_physics::electromagnetism::ScenarioId::PointChargeElectrostatics);
	const auto moving_scenario =
		visual_physics::electromagnetism::make_default_scenario(
			visual_physics::electromagnetism::ScenarioId::MovingChargeMagneticField);
	const auto point_snapshot = visual_physics::electromagnetism::sample_scenario(point_scenario);
	const auto moving_snapshot = visual_physics::electromagnetism::sample_scenario(moving_scenario, 1.0);

	const auto point_lines = visual_physics::electromagnetism::build_overlay_line_vertices(
		point_snapshot,
		point_scenario,
		{true, false, true, true, false});
	const auto moving_markers = visual_physics::electromagnetism::build_overlay_marker_vertices(
		moving_snapshot,
		moving_scenario,
		1.0F,
		{true, true, true, true, true});

	EXPECT_GT(point_lines.size(), 6U);
	EXPECT_EQ(moving_markers.size(), 6U);
	EXPECT_LE(std::abs(point_lines.front().x), 1.0F);
	EXPECT_LE(std::abs(point_lines.front().y), 1.0F);
}

TEST(VisualPhysicsVulkanExecutable, RendersElectromagnetismScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electromagnetism.ppm");
	const auto payload_path = unique_temp_path("_electromagnetism.json");
	const auto output_path = unique_temp_path("_electromagnetism.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --scenario capacitor-potential-field --probe-point-x 0.6 --probe-point-y -0.4 --plate-separation 3.0 --potential-difference 18 --show-field-vectors true --show-force-vectors false --show-potential-guides true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"capacitor-potential-field\""), std::string::npos);
	EXPECT_NE(payload.find("\"plateSeparation\": 3.0"), std::string::npos);
	EXPECT_NE(payload.find("\"potentialDifference\": 18.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showFieldVectors\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showForceVectors\": false"), std::string::npos);
	EXPECT_NE(output.find("Domain: electromagnetism"), std::string::npos);
	EXPECT_NE(output.find("Scenario: capacitor-potential-field"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism overlays: fieldVectors=on, magneticField=on, forceVectors=off, potentialGuides=on, trajectory=on"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism sample: E=(6.00, 0.00), B=(0.00, 0.00), force=(6.00, 0.00), potential=5.40, fieldMagnitude=6.00"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Renderer-ready geometry: axes=4 vertices, trajectory=4 vertices, overlays=12 vertices, overlayMarkers=18 vertices, marker=6 vertices"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersPointChargeScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electromagnetism_point.ppm");
	const auto payload_path = unique_temp_path("_electromagnetism_point.json");
	const auto output_path = unique_temp_path("_electromagnetism_point.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --scenario point-charge-electrostatics --source-point-x -1.5 --source-point-y 0.2 --secondary-source-point-x 2.4 --secondary-source-point-y -0.1 --probe-point-x 0.5 --probe-point-y 1.3 --charge-magnitude 1.8 --secondary-charge-magnitude -0.9 --show-field-vectors true --show-force-vectors true --show-potential-guides false --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"point-charge-electrostatics\""), std::string::npos);
	EXPECT_NE(payload.find("\"chargeMagnitude\": 1.8"), std::string::npos);
	EXPECT_NE(payload.find("\"secondaryChargeMagnitude\": -0.9"), std::string::npos);
	EXPECT_NE(payload.find("\"showPotentialGuides\": false"), std::string::npos);
	EXPECT_NE(output.find("Scenario: point-charge-electrostatics"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism overlays: fieldVectors=on, magneticField=on, forceVectors=on, potentialGuides=off, trajectory=on"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism sample: E=(2.60, 0.42), B=(0.00, 0.00), force=(2.60, 0.42), potential=2.44, fieldMagnitude=2.63"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Renderer-ready geometry: axes=4 vertices, trajectory=4 vertices, overlays=16 vertices, overlayMarkers=18 vertices, marker=6 vertices"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersMovingChargeScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electromagnetism_moving.ppm");
	const auto payload_path = unique_temp_path("_electromagnetism_moving.json");
	const auto output_path = unique_temp_path("_electromagnetism_moving.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --scenario moving-charge-magnetic-field --initial-position-x -2.5 --initial-position-y 0.8 --initial-velocity-x 1.9 --initial-velocity-y -0.6 --charge-magnitude 1.4 --mass 0.8 --magnetic-field-strength 2.3 --time 1.4 --show-magnetic-field false --show-force-vectors true --show-trajectory true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"moving-charge-magnetic-field\""), std::string::npos);
	EXPECT_NE(payload.find("\"chargeMagnitude\": 1.4"), std::string::npos);
	EXPECT_NE(payload.find("\"mass\": 0.8"), std::string::npos);
	EXPECT_NE(payload.find("\"magneticFieldStrength\": 2.3"), std::string::npos);
	EXPECT_NE(payload.find("\"showMagneticField\": false"), std::string::npos);
	EXPECT_NE(output.find("Scenario: moving-charge-magnetic-field, time=1.4s"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism overlays: fieldVectors=on, magneticField=off, forceVectors=on, potentialGuides=on, trajectory=on"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism sample: E=(0.00, 0.00), B=(0.00, 2.30), force=(2.15, -6.04), potential=0.00, fieldMagnitude=2.30"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Renderer-ready geometry: axes=4 vertices, trajectory=8 vertices, overlays=14 vertices, overlayMarkers=6 vertices, marker=6 vertices"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersCurrentLoopScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electromagnetism_loop.ppm");
	const auto payload_path = unique_temp_path("_electromagnetism_loop.json");
	const auto output_path = unique_temp_path("_electromagnetism_loop.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --scenario current-loop-magnetic-field --current 5 --loop-radius 2.1 --probe-point-y 1.6 --show-magnetic-field true --show-potential-guides false --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"current-loop-magnetic-field\""), std::string::npos);
	EXPECT_NE(payload.find("\"current\": 5.0"), std::string::npos);
	EXPECT_NE(payload.find("\"loopRadius\": 2.1"), std::string::npos);
	EXPECT_NE(payload.find("\"showMagneticField\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showPotentialGuides\": false"), std::string::npos);
	EXPECT_NE(output.find("Scenario: current-loop-magnetic-field"), std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism overlays: fieldVectors=on, magneticField=on, forceVectors=on, potentialGuides=off, trajectory=on"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism sample: E=(0.00, 0.00), B=(0.00, 0.75), force=(0.00, 0.00), potential=0.00, fieldMagnitude=0.75"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersInductionScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_electromagnetism_induction.ppm");
	const auto payload_path = unique_temp_path("_electromagnetism_induction.json");
	const auto output_path = unique_temp_path("_electromagnetism_induction.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --scenario electromagnetic-induction --time 2.25 --flux-rate 3.2 --inductance 1.6 --show-magnetic-field true --show-force-vectors false --show-potential-guides true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"electromagnetic-induction\""), std::string::npos);
	EXPECT_NE(payload.find("\"fluxRate\": 3.2"), std::string::npos);
	EXPECT_NE(payload.find("\"inductance\": 1.6"), std::string::npos);
	EXPECT_NE(payload.find("\"showMagneticField\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showForceVectors\": false"), std::string::npos);
	EXPECT_NE(output.find("Scenario: electromagnetic-induction, time=2.25s"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism overlays: fieldVectors=on, magneticField=on, forceVectors=off, potentialGuides=on, trajectory=on"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism sample: E=(3.62, 0.00), B=(0.00, 2.26), force=(3.62, 0.00), potential=3.62, fieldMagnitude=2.26"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Renderer-ready geometry: axes=4 vertices, trajectory=16 vertices, overlays=10 vertices, overlayMarkers=18 vertices, marker=6 vertices"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsElectromagnetismPayloadAndPreservesOverlayFlags) {
	const auto import_path = unique_temp_path("_import_electromagnetism.json");
	const auto export_path = unique_temp_path("_export_electromagnetism.json");
	const auto image_path = unique_temp_path("_import_electromagnetism.ppm");
	const auto output_path = unique_temp_path("_import_electromagnetism.txt");

	auto scenario = visual_physics::electromagnetism::make_default_scenario(
		visual_physics::electromagnetism::ScenarioId::MovingChargeMagneticField);
	scenario.magnetic_field_strength = 2.0;
	const auto snapshot = visual_physics::electromagnetism::sample_scenario(scenario, 0.75);
	const auto samples = visual_physics::electromagnetism::build_samples(scenario, 12);
	write_text_file(
		import_path,
		visual_physics::electromagnetism::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_field_vectors = true,
				.show_magnetic_field = false,
				.show_force_vectors = true,
				.show_potential_guides = true,
				.show_trajectory = false,
			},
			samples,
			"2026-06-02T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --import " + shell_quote(import_path) +
		" --time 1.25 --export-state " + shell_quote(export_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto exported_payload = read_text_file(export_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"moving-charge-magnetic-field\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showMagneticField\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showForceVectors\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showTrajectory\": false"), std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("Electromagnetism overlays: fieldVectors=on, magneticField=off, forceVectors=on, potentialGuides=on, trajectory=off"), std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism sample: E=(0.00, 0.00), B=(0.00, 2.00), force=(-4.80, 2.41), potential=0.00, fieldMagnitude=2.00"),
		std::string::npos);
	EXPECT_NE(
		output.find(
			"Renderer-ready geometry: axes=4 vertices, trajectory=8 vertices, overlays=12 vertices, overlayMarkers=6 vertices, marker=6 vertices"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsInductionPayloadAndPreservesTimeAndOverlays) {
	const auto import_path = unique_temp_path("_import_induction.json");
	const auto export_path = unique_temp_path("_export_induction.json");
	const auto image_path = unique_temp_path("_import_induction.ppm");
	const auto output_path = unique_temp_path("_import_induction.txt");

	auto scenario = visual_physics::electromagnetism::make_default_scenario(
		visual_physics::electromagnetism::ScenarioId::ElectromagneticInduction);
	scenario.flux_rate = 3.2;
	scenario.inductance = 1.6;
	const auto snapshot = visual_physics::electromagnetism::sample_scenario(scenario, 0.75);
	const auto samples = visual_physics::electromagnetism::build_samples(scenario, 10);
	write_text_file(
		import_path,
		visual_physics::electromagnetism::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_field_vectors = false,
				.show_magnetic_field = true,
				.show_force_vectors = false,
				.show_potential_guides = true,
				.show_trajectory = false,
			},
			samples,
			"2026-06-02T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --import " + shell_quote(import_path) +
		" --time 2.25 --export-state " + shell_quote(export_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto exported_payload = read_text_file(export_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"electromagnetic-induction\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"timeSeconds\": 2.25"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showMagneticField\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showForceVectors\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showPotentialGuides\": true"), std::string::npos);
	EXPECT_NE(output.find("Scenario: electromagnetic-induction, time=2.25s"), std::string::npos);
	EXPECT_NE(output.find("Electromagnetism overlays: fieldVectors=off, magneticField=on, forceVectors=off, potentialGuides=on, trajectory=off"), std::string::npos);
	EXPECT_NE(
		output.find(
			"Electromagnetism sample: E=(3.62, 0.00), B=(0.00, 2.26), force=(3.62, 0.00), potential=3.62, fieldMagnitude=2.26"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInductionTrajectoryCliFlag) {
	const auto output_path = unique_temp_path("_electromagnetism_invalid_induction_trajectory.txt");
	const auto image_path = unique_temp_path("_electromagnetism_invalid_induction_trajectory.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --scenario electromagnetic-induction --show-trajectory false --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find(
			"--show-trajectory cannot be used with electromagnetism scenario electromagnetic-induction"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidElectromagnetismOverlayFlags) {
	const auto output_path = unique_temp_path("_electromagnetism_invalid_overlay.txt");
	const auto image_path = unique_temp_path("_electromagnetism_invalid_overlay.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --scenario point-charge-electrostatics --show-magnetic-field true --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--show-magnetic-field cannot be used with electromagnetism scenario point-charge-electrostatics"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidCurrentLoopCliFlags) {
	const auto output_path = unique_temp_path("_electromagnetism_invalid_loop.txt");
	const auto image_path = unique_temp_path("_electromagnetism_invalid_loop.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain electromagnetism --scenario current-loop-magnetic-field --charge-magnitude 2 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--charge-magnitude cannot be used with electromagnetism scenario current-loop-magnetic-field"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsStaticsPayloadAndPreservesOverlayFlags) {
	const auto import_path = unique_temp_path("_import_statics.json");
	const auto export_path = unique_temp_path("_export_statics.json");
	const auto image_path = unique_temp_path("_import_statics.ppm");
	const auto output_path = unique_temp_path("_import_statics.txt");

	const auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::InclinedPlane);
	const auto snapshot = visual_physics::statics::sample_scenario(scenario, 0.0);
	const auto samples = visual_physics::statics::build_samples(scenario, 8);
	write_text_file(
		import_path,
		visual_physics::statics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_applied_force = false,
				.show_reaction_forces = true,
				.show_residual_guides = false,
			},
			samples,
			"2026-06-02T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain statics --import " + shell_quote(import_path) +
		" --export-state " + shell_quote(export_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto exported_payload = read_text_file(export_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"inclined-plane\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showAppliedForce\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showReactionForces\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showResidualGuides\": false"), std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("Statics overlays: appliedForce=off, reactions=on, residualGuides=off"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesStaticsOverlayCliFlagsToRenderAndExport) {
	const auto image_path = unique_temp_path("_statics_overlay_flags.ppm");
	const auto payload_path = unique_temp_path("_statics_overlay_flags.json");
	const auto output_path = unique_temp_path("_statics_overlay_flags.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain statics --scenario pulley-equilibrium" +
		" --show-applied-force false --show-reaction-forces false --show-residual-guides false" +
		" --export-state " + shell_quote(payload_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"showAppliedForce\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showReactionForces\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showResidualGuides\": false"), std::string::npos);
	EXPECT_NE(output.find("Statics overlays: appliedForce=off, reactions=off, residualGuides=off"), std::string::npos);
	EXPECT_NE(output.find("overlays=0 vertices"), std::string::npos);
	EXPECT_NE(output.find("overlayMarkers=0 vertices"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInclinedPlaneOnlyFlagsForBeamSupport) {
	const auto output_path = unique_temp_path("_statics_invalid_beam.txt");
	const auto image_path = unique_temp_path("_statics_invalid_beam.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain statics --scenario beam-support --angle-degrees 30 --output " +
		shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--angle-degrees cannot be used with statics scenario beam-support"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsBeamOnlyFlagsForInclinedPlane) {
	const auto output_path = unique_temp_path("_statics_invalid_incline.txt");
	const auto image_path = unique_temp_path("_statics_invalid_incline.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain statics --scenario inclined-plane --load-position 4 --output " +
		shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--load-position cannot be used with statics scenario inclined-plane"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersDynamicsScenarioAndExportsPayload) {
	const auto image_path = unique_temp_path("_dynamics.ppm");
	const auto payload_path = unique_temp_path("_dynamics.json");
	const auto output_path = unique_temp_path("_dynamics.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain dynamics --scenario constant-force --time 2.0 --mass 4 --net-force-x 8 --net-force-y 2 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));
	EXPECT_GT(std::filesystem::file_size(image_path), 0);
	EXPECT_GT(std::filesystem::file_size(payload_path), 0);

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"constant-force\""), std::string::npos);
	EXPECT_NE(payload.find("\"mass\": 4.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showMomentumVector\": true"), std::string::npos);
	EXPECT_NE(output.find("overlays=6 vertices"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsDynamicsPayloadAndPreservesOverlayFlags) {
	const auto import_path = unique_temp_path("_import_dynamics.json");
	const auto export_path = unique_temp_path("_export_dynamics.json");
	const auto image_path = unique_temp_path("_import_dynamics.ppm");
	const auto output_path = unique_temp_path("_import_dynamics.txt");

	const auto scenario = visual_physics::dynamics::make_default_scenario(
		visual_physics::dynamics::ScenarioId::SpringOscillator);
	const auto snapshot = visual_physics::dynamics::sample_scenario(scenario, 0.75);
	const auto samples = visual_physics::dynamics::build_samples(scenario, 12);
	write_text_file(
		import_path,
		visual_physics::dynamics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_momentum_vector = false,
				.show_velocity_vector = true,
				.show_force_vector = false,
				.show_scenario_guides = true,
			},
			samples,
			"2026-06-02T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain dynamics --import " + shell_quote(import_path) +
		" --time 1.1 --export-state " + shell_quote(export_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto exported_payload = read_text_file(export_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(exported_payload.find("\"id\": \"spring-oscillator\""), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showMomentumVector\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showVelocityVector\": true"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showForceVector\": false"), std::string::npos);
	EXPECT_NE(exported_payload.find("\"showScenarioGuides\": true"), std::string::npos);
	EXPECT_NE(output.find("Imported payload:"), std::string::npos);
	EXPECT_NE(output.find("time=1.1s"), std::string::npos);
	EXPECT_NE(output.find("overlays=4 vertices"), std::string::npos);
	EXPECT_NE(output.find("overlayMarkers=6 vertices"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsScenarioImportCombinationForDynamics) {
	const auto import_path = unique_temp_path("_scenario_import_conflict.json");
	const auto output_path = unique_temp_path("_scenario_import_conflict.txt");

	const auto scenario = visual_physics::dynamics::make_default_scenario(
		visual_physics::dynamics::ScenarioId::OrbitalMotion);
	const auto snapshot = visual_physics::dynamics::sample_scenario(scenario, 0.5);
	const auto samples = visual_physics::dynamics::build_samples(scenario, 8);
	write_text_file(
		import_path,
		visual_physics::dynamics::serialize_export_payload(
			scenario,
			snapshot,
			{},
			samples,
			"2026-06-02T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain dynamics --scenario constant-force --import " + shell_quote(import_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--scenario cannot be combined with --import"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsKinematicsOnlyFlagsForDynamicsDomain) {
	const auto output_path = unique_temp_path("_dynamics_cross_domain.txt");
	const auto image_path = unique_temp_path("_unused.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain dynamics --scenario constant-force --acceleration-x 1.0 --output " +
		shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Kinematics-only override flags cannot be used with --domain dynamics"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesDynamicsOverlayCliFlagsToRenderAndExport) {
	const auto image_path = unique_temp_path("_overlay_flags.ppm");
	const auto payload_path = unique_temp_path("_overlay_flags.json");
	const auto output_path = unique_temp_path("_overlay_flags.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain dynamics --scenario spring-oscillator --time 1.0" +
		" --show-momentum-vector false --show-velocity-vector false" +
		" --show-force-vector false --show-scenario-guides false" +
		" --export-state " + shell_quote(payload_path) +
		" --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto payload = read_text_file(payload_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"showMomentumVector\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showVelocityVector\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showForceVector\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showScenarioGuides\": false"), std::string::npos);
	EXPECT_NE(
		output.find("Dynamics overlays: momentum=off, velocity=off, force=off, guides=off"),
		std::string::npos);
	EXPECT_NE(output.find("overlays=0 vertices"), std::string::npos);
	EXPECT_NE(output.find("overlayMarkers=0 vertices"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanDynamics, ComputesConstantForceMotionDeterministically) {
	const auto scenario = visual_physics::dynamics::make_default_scenario(
		visual_physics::dynamics::ScenarioId::ConstantForce);
	const auto snapshot = visual_physics::dynamics::sample_scenario(scenario, 2.5);

	EXPECT_NEAR(snapshot.position.x, 9.25, 1e-6);
	EXPECT_NEAR(snapshot.position.y, 2.5625, 1e-6);
	EXPECT_NEAR(snapshot.velocity.x, 6.2, 1e-6);
	EXPECT_NEAR(snapshot.velocity.y, 1.65, 1e-6);
	EXPECT_NEAR(snapshot.acceleration.x, 2.0, 1e-6);
	EXPECT_NEAR(snapshot.acceleration.y, 0.5, 1e-6);

}

TEST(VisualPhysicsVulkanStatics, SolvesBeamSupportWithBalancedReactions) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::BeamSupport);
	scenario.load_position = 7.0;
	scenario.load_magnitude = 18.0;

	const auto snapshot = visual_physics::statics::sample_scenario(scenario);

	ASSERT_TRUE(snapshot.secondary_reaction_force.has_value());
	EXPECT_NEAR(snapshot.position.x, 7.0, 1e-6);
	EXPECT_NEAR(snapshot.primary_reaction_force.y, 4.5, 1e-6);
	EXPECT_NEAR(snapshot.secondary_reaction_force->y, 13.5, 1e-6);
	EXPECT_NEAR(snapshot.residual_force.y, 0.0, 1e-6);
	EXPECT_NEAR(snapshot.residual_torque, 0.0, 1e-6);
	EXPECT_TRUE(snapshot.stable);
}

TEST(VisualPhysicsVulkanStatics, MarksInclinedPlaneUnstableWhenFrictionIsInsufficient) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::InclinedPlane);
	scenario.mass = 2.0;
	scenario.angle_degrees = 45.0;
	scenario.friction_coefficient = 0.1;

	const auto snapshot = visual_physics::statics::sample_scenario(scenario);

	ASSERT_TRUE(snapshot.secondary_reaction_force.has_value());
	EXPECT_FALSE(snapshot.stable);
	EXPECT_GT(std::abs(snapshot.residual_force.x), 1.0);
	EXPECT_LT(snapshot.secondary_reaction_force->y, snapshot.primary_reaction_force.y);
}

TEST(VisualPhysicsVulkanStatics, RoundTripsPulleyPayloadWithSecondaryMass) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::PulleyEquilibrium);
	scenario.mass = 1.0;
	scenario.secondary_mass = 1.5;

	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto samples = visual_physics::statics::build_samples(scenario, 4);
	const auto payload = visual_physics::statics::serialize_export_payload(
		scenario,
		snapshot,
		{
			.show_applied_force = true,
			.show_reaction_forces = false,
			.show_residual_guides = true,
		},
		samples,
		"2026-06-02T00:00:00.000Z");

	const auto imported = visual_physics::statics::parse_import_payload(payload);

	EXPECT_EQ(imported.scenario.id, visual_physics::statics::ScenarioId::PulleyEquilibrium);
	ASSERT_TRUE(imported.scenario.secondary_mass.has_value());
	EXPECT_NEAR(*imported.scenario.secondary_mass, 1.5, 1e-6);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_applied_force);
	EXPECT_FALSE(imported.overlays->show_reaction_forces);
	EXPECT_TRUE(imported.overlays->show_residual_guides);
}

TEST(VisualPhysicsVulkanDynamics, ComputesSpringOscillatorWithBoundedEnergyDrift) {
	const auto scenario = visual_physics::dynamics::make_default_scenario(
		visual_physics::dynamics::ScenarioId::SpringOscillator);
	const auto snapshot = visual_physics::dynamics::sample_scenario(scenario, 1.0);
	const auto samples = visual_physics::dynamics::build_samples(scenario);

	double min_energy = samples.front().total_energy;
	double max_energy = samples.front().total_energy;
	for (const auto& sample : samples) {
		min_energy = std::min(min_energy, sample.total_energy);
		max_energy = std::max(max_energy, sample.total_energy);
	}

	EXPECT_LT(snapshot.position.x, 4.0);
	EXPECT_GT(std::abs(snapshot.position.y), 0.1);
	EXPECT_GT(snapshot.total_energy, 0.0);
	EXPECT_LT(max_energy - min_energy, 2.5);
}

TEST(VisualPhysicsVulkanDynamics, ComputesOrbitalQuarterTurnWithNegativeTotalEnergy) {
	const auto scenario = visual_physics::dynamics::make_default_scenario(
		visual_physics::dynamics::ScenarioId::OrbitalMotion);
	const auto snapshot = visual_physics::dynamics::sample_scenario(
		scenario,
		3.14159265358979323846 * 2.5 / 2.0);
	const double radius = std::hypot(snapshot.position.x, snapshot.position.y);

	EXPECT_NEAR(snapshot.position.x, 0.0, 0.6);
	EXPECT_NEAR(snapshot.position.y, 5.0, 0.6);
	EXPECT_NEAR(radius, 5.0, 0.6);
	EXPECT_LT(snapshot.total_energy, 0.0);
}

TEST(VisualPhysicsVulkanDynamics, ReflectsElasticCollisionWithinViewBounds) {
	const auto scenario = visual_physics::dynamics::make_default_scenario(
		visual_physics::dynamics::ScenarioId::ElasticCollision);
	const auto snapshot = visual_physics::dynamics::sample_scenario(scenario, 2.4);
	const double initial_speed = std::hypot(
		scenario.initial_velocity.x,
		scenario.initial_velocity.y);

	EXPECT_GE(snapshot.position.x, scenario.view_bounds.min_x);
	EXPECT_LE(snapshot.position.x, scenario.view_bounds.max_x);
	EXPECT_GE(snapshot.position.y, scenario.view_bounds.min_y);
	EXPECT_LE(snapshot.position.y, scenario.view_bounds.max_y);
	EXPECT_LT(snapshot.velocity.x, 0.0);
	EXPECT_NEAR(snapshot.speed, initial_speed, 0.05);
	EXPECT_NEAR(
		snapshot.total_energy,
		0.5 * scenario.mass * initial_speed * initial_speed,
		0.1);
}

TEST(VisualPhysicsVulkanDynamics, ParsesAngularCompatibleDynamicsImportPayload) {
	const auto payload = R"({
	  "scenario": {
	    "id": "elastic-collision",
	    "name": "Imported Collision",
	    "summary": "Imported dynamics state",
	    "equationSummary": "x\" = 0",
	    "durationSeconds": 3,
	    "viewBounds": { "minX": -3, "maxX": 3, "minY": -2, "maxY": 2 },
	    "mass": 2,
	    "initialPosition": { "x": -2, "y": 1 },
	    "initialVelocity": { "x": 2.5, "y": -0.5 },
	    "restitutionCoefficient": 0.75
	  },
	  "snapshot": { "timeSeconds": 2.2 },
	  "overlays": {
	    "showMomentumVector": true,
	    "showVelocityVector": false,
	    "showForceVector": true,
	    "showScenarioGuides": false
	  }
	})";

	const auto imported = visual_physics::dynamics::parse_import_payload(payload);

	EXPECT_EQ(imported.scenario.id, visual_physics::dynamics::ScenarioId::ElasticCollision);
	EXPECT_EQ(imported.scenario.name, "Imported Collision");
	ASSERT_TRUE(imported.scenario.restitution_coefficient.has_value());
	EXPECT_NEAR(*imported.scenario.restitution_coefficient, 0.75, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 2.2, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_momentum_vector);
	EXPECT_FALSE(imported.overlays->show_velocity_vector);
}

TEST(VisualPhysicsVulkanDynamics, SerializesAndRoundTripsDynamicsPayload) {
	const auto scenario = visual_physics::dynamics::make_default_scenario(
		visual_physics::dynamics::ScenarioId::OrbitalMotion);
	const auto snapshot = visual_physics::dynamics::sample_scenario(scenario, 1.2);
	const auto samples = visual_physics::dynamics::build_samples(scenario, 6);
	const auto payload = visual_physics::dynamics::serialize_export_payload(
		scenario,
		snapshot,
		{
			.show_momentum_vector = true,
			.show_velocity_vector = false,
			.show_force_vector = true,
			.show_scenario_guides = false,
		},
		samples,
		"2026-06-02T00:00:00.000Z");

	const auto imported = visual_physics::dynamics::parse_import_payload(payload);
	const auto roundtrip_snapshot = visual_physics::dynamics::sample_scenario(
		imported.scenario,
		imported.time_seconds);

	EXPECT_EQ(imported.scenario.id, visual_physics::dynamics::ScenarioId::OrbitalMotion);
	EXPECT_EQ(imported.scenario.name, scenario.name);
	EXPECT_NEAR(imported.time_seconds, 1.2, 1e-9);
	EXPECT_NEAR(roundtrip_snapshot.position.x, snapshot.position.x, 1e-6);
	EXPECT_NEAR(roundtrip_snapshot.position.y, snapshot.position.y, 1e-6);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_FALSE(imported.overlays->show_velocity_vector);
	EXPECT_TRUE(imported.overlays->show_force_vector);
}

TEST(VisualPhysicsVulkanDynamics, RejectsMalformedDynamicsOverlayFlags) {
	const auto malformed = R"({
	  "scenario": {
	    "id": "constant-force",
	    "name": "Constant Force Motion",
	    "summary": "Test",
	    "equationSummary": "m x\" = F",
	    "durationSeconds": 5,
	    "viewBounds": { "minX": -1, "maxX": 5, "minY": -1, "maxY": 5 },
	    "mass": 1,
	    "initialPosition": { "x": 0, "y": 0 },
	    "initialVelocity": { "x": 1, "y": 0 },
	    "netForce": { "x": 1, "y": 0 }
	  },
	  "snapshot": { "timeSeconds": 1 },
	  "overlays": {
	    "showMomentumVector": true,
	    "showVelocityVector": "yes",
	    "showForceVector": true,
	    "showScenarioGuides": true
	  }
	})";

	EXPECT_THROW(
		static_cast<void>(visual_physics::dynamics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(VisualPhysicsVulkanCore, ComputesConstantVelocityMotionDeterministically) {
	const auto scenario = make_default_scenario(ScenarioId::ConstantVelocity);
	const auto snapshot = sample_scenario(scenario, 2.5);

	EXPECT_NEAR(snapshot.position.x, 6.0, 1e-9);
	EXPECT_NEAR(snapshot.position.y, 2.25, 1e-9);
	EXPECT_NEAR(snapshot.velocity.x, 2.4, 1e-9);
	EXPECT_NEAR(snapshot.velocity.y, 0.9, 1e-9);
	EXPECT_NEAR(snapshot.acceleration_magnitude, 0.0, 1e-9);
}

TEST(VisualPhysicsVulkanCore, ComputesProjectileMotionWithGravity) {
	const auto scenario = make_default_scenario(ScenarioId::Projectile);
	const auto snapshot = sample_scenario(scenario, 1.5);

	EXPECT_NEAR(snapshot.position.x, 10.8, 1e-9);
	EXPECT_NEAR(snapshot.position.y, 5.16375, 1e-9);
	EXPECT_NEAR(snapshot.velocity.x, 7.2, 1e-9);
	EXPECT_NEAR(snapshot.velocity.y, -3.915, 1e-9);
	EXPECT_NEAR(snapshot.acceleration.y, -9.81, 1e-9);
}

TEST(VisualPhysicsVulkanCore, ComputesRelativeMotionAgainstTheObserverFrame) {
	const auto scenario = make_default_scenario(ScenarioId::RelativeMotion);
	const auto snapshot = sample_scenario(scenario, 3.0);

	ASSERT_TRUE(snapshot.relative_position.has_value());
	ASSERT_TRUE(snapshot.relative_velocity.has_value());
	EXPECT_NEAR(snapshot.relative_position->x, 8.4, 1e-9);
	EXPECT_NEAR(snapshot.relative_position->y, 3.0, 1e-9);
	EXPECT_NEAR(snapshot.relative_velocity->x, 2.8, 1e-9);
	EXPECT_NEAR(snapshot.relative_velocity->y, 1.0, 1e-9);
}

TEST(VisualPhysicsVulkanCore, ComputesUniformCircularMotionFromRadiusAndAngularSpeed) {
	const auto scenario = make_default_scenario(ScenarioId::UniformCircularMotion);
	const auto snapshot = sample_scenario(scenario, kPi / (2.0 * 0.9));

	EXPECT_NEAR(snapshot.position.x, 0.0, 1e-5);
	EXPECT_NEAR(snapshot.position.y, 4.0, 1e-5);
	EXPECT_NEAR(snapshot.velocity.x, -3.6, 1e-5);
	EXPECT_NEAR(snapshot.velocity.y, 0.0, 1e-5);
	EXPECT_NEAR(snapshot.acceleration.x, 0.0, 1e-5);
	EXPECT_NEAR(snapshot.acceleration.y, -3.24, 1e-5);
}

TEST(VisualPhysicsVulkanCore, BuildsSampledStatesFromTheScenarioDuration) {
	const auto scenario = make_default_scenario(ScenarioId::Projectile);
	const auto samples = build_samples(scenario);

	ASSERT_EQ(samples.size(), 48U);
	EXPECT_NEAR(samples.front().x_position, 0.0, 1e-9);
	EXPECT_NEAR(samples.front().y_position, 0.0, 1e-9);
	EXPECT_NEAR(samples.back().time_seconds, 2.8, 1e-9);
}

TEST(VisualPhysicsVulkanCore, BuildsAxesVerticesInNormalizedDeviceCoordinates) {
	const auto scenario = make_default_scenario(ScenarioId::Projectile);
	const auto vertices = build_axes_vertices(scenario);

	ASSERT_EQ(vertices.size(), 4U);
	EXPECT_NEAR(vertices[0].x, -0.96, 1e-6);
	EXPECT_NEAR(vertices[0].y, -0.6666667, 1e-6);
	EXPECT_NEAR(vertices[1].x, 0.96, 1e-6);
	EXPECT_NEAR(vertices[1].y, -0.6666667, 1e-6);
	EXPECT_NEAR(vertices[2].x, -0.8333333, 1e-6);
	EXPECT_NEAR(vertices[2].y, -0.96, 1e-6);
	EXPECT_NEAR(vertices[3].x, -0.8333333, 1e-6);
	EXPECT_NEAR(vertices[3].y, 0.96, 1e-6);
}

TEST(VisualPhysicsVulkanStatics, BuildsAxesVerticesInNormalizedDeviceCoordinates) {
	const auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::BeamSupport);
	const auto vertices = visual_physics::statics::build_axes_vertices(scenario);

	ASSERT_EQ(vertices.size(), 4U);
	EXPECT_NEAR(vertices[0].x, -0.96, 1e-6);
	EXPECT_NEAR(vertices[1].x, 0.96, 1e-6);
	EXPECT_NEAR(vertices[2].y, -0.96, 1e-6);
	EXPECT_NEAR(vertices[3].y, 0.96, 1e-6);
}

TEST(VisualPhysicsVulkanStatics, BuildsMarkerVerticesAroundCurrentSnapshotPosition) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::BeamSupport);
	scenario.load_position = 7.0;
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_marker_vertices(
		snapshot,
		scenario,
		16.0F / 9.0F);

	ASSERT_EQ(vertices.size(), 6U);
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, 0.28F);
		EXPECT_LE(vertex.x, 0.36F);
		EXPECT_GE(vertex.y, -0.06F);
		EXPECT_LE(vertex.y, 0.06F);
	}
}

TEST(VisualPhysicsVulkanStatics, BuildsBeamSupportScenarioGeometry) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::BeamSupport);
	scenario.load_position = 6.5;
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_scenario_vertices(snapshot, scenario);

	ASSERT_EQ(vertices.size(), 6U);
	EXPECT_LT(vertices[0].x, vertices[1].x);
	EXPECT_NEAR(vertices[0].y, vertices[1].y, 1e-6F);
	EXPECT_NEAR(vertices[2].x, vertices[3].x, 1e-6F);
	EXPECT_LT(vertices[2].y, vertices[3].y);
	EXPECT_NEAR(vertices[4].x, vertices[5].x, 1e-6F);
	EXPECT_LT(vertices[4].y, vertices[5].y);
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
	}
}

TEST(VisualPhysicsVulkanStatics, BuildsInclinedPlaneScenarioGeometry) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::InclinedPlane);
	scenario.angle_degrees = 35.0;
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_scenario_vertices(snapshot, scenario);

	ASSERT_EQ(vertices.size(), 12U);
	EXPECT_LT(vertices[0].x, vertices[1].x);
	EXPECT_LT(vertices[0].y, vertices[1].y);
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
	}
}

TEST(VisualPhysicsVulkanStatics, BuildsPulleyScenarioGeometry) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::PulleyEquilibrium);
	scenario.secondary_mass = 1.5;
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_scenario_vertices(snapshot, scenario);

	ASSERT_EQ(vertices.size(), 30U);
	EXPECT_LT(vertices[0].x, vertices[1].x);
	bool found_upper_pulley_vertex = false;
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
		if (vertex.y > 0.3F) {
			found_upper_pulley_vertex = true;
		}
	}
	EXPECT_TRUE(found_upper_pulley_vertex);
}

TEST(VisualPhysicsVulkanStatics, BuildsBeamSupportOverlayGeometryWithAllOverlaysEnabled) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::BeamSupport);
	scenario.load_position = 7.0;
	scenario.load_magnitude = 15.0;
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_overlay_line_vertices(
		snapshot,
		scenario,
		{.show_applied_force = true, .show_reaction_forces = true, .show_residual_guides = true});

	ASSERT_EQ(vertices.size(), 6U);
	EXPECT_NEAR(vertices[0].r, 1.0F, 1e-6F);
	EXPECT_NEAR(vertices[2].g, 0.92F, 1e-6F);
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
	}
}

TEST(VisualPhysicsVulkanStatics, BuildsBeamSupportOverlayMarkerGeometryWhenVisibleVectorsExist) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::BeamSupport);
	scenario.load_position = 7.0;
	scenario.load_magnitude = 15.0;
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_overlay_marker_vertices(
		snapshot,
		scenario,
		16.0F / 9.0F,
		{.show_applied_force = true, .show_reaction_forces = true, .show_residual_guides = true});

	ASSERT_EQ(vertices.size(), 18U);
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
	}
}

TEST(VisualPhysicsVulkanStatics, BuildsNoOverlayGeometryWhenStaticsOverlaysAreDisabled) {
	const auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::PulleyEquilibrium);
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_overlay_line_vertices(
		snapshot,
		scenario,
		{.show_applied_force = false, .show_reaction_forces = false, .show_residual_guides = false});

	EXPECT_TRUE(vertices.empty());
}

TEST(VisualPhysicsVulkanStatics, BuildsInclinedPlaneReactionOverlayGeometry) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::InclinedPlane);
	scenario.angle_degrees = 30.0;
	scenario.friction_coefficient = 0.7;
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_overlay_line_vertices(
		snapshot,
		scenario,
		{.show_applied_force = false, .show_reaction_forces = true, .show_residual_guides = false});

	ASSERT_EQ(vertices.size(), 4U);
	for (const auto& vertex : vertices) {
		EXPECT_NEAR(vertex.g, 0.92F, 1e-6F);
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
	}
}

TEST(VisualPhysicsVulkanStatics, BuildsInclinedPlaneOverlayMarkerGeometry) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::InclinedPlane);
	scenario.angle_degrees = 35.0;
	scenario.friction_coefficient = 0.6;
	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_overlay_marker_vertices(
		snapshot,
		scenario,
		16.0F / 9.0F,
		{.show_applied_force = true, .show_reaction_forces = true, .show_residual_guides = true});

	ASSERT_EQ(vertices.size(), 24U);
	EXPECT_NEAR(vertices[0].r, 1.0F, 1e-6F);
	EXPECT_NEAR(vertices[6].g, 0.92F, 1e-6F);
	EXPECT_NEAR(vertices[18].b, 0.47F, 1e-6F);
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
	}
}

TEST(VisualPhysicsVulkanStatics, BuildsPulleyOverlayGeometryFromSharedPulleyAnchor) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::PulleyEquilibrium);
	scenario.mass = 1.0;
	scenario.secondary_mass = 1.5;

	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_overlay_line_vertices(
		snapshot,
		scenario,
		{.show_applied_force = true, .show_reaction_forces = true, .show_residual_guides = true});

	ASSERT_EQ(vertices.size(), 8U);
	EXPECT_NEAR(vertices[0].r, 1.0F, 1e-6F);
	EXPECT_NEAR(vertices[2].g, 0.92F, 1e-6F);
	EXPECT_NEAR(vertices[6].b, 0.47F, 1e-6F);
	EXPECT_NEAR(vertices[2].x, 0.0F, 1e-6F);
	EXPECT_NEAR(vertices[4].x, 0.0F, 1e-6F);
	EXPECT_NEAR(vertices[2].y, vertices[4].y, 1e-6F);
	EXPECT_GT(vertices[3].y, vertices[2].y);
	EXPECT_GT(vertices[5].y, vertices[4].y);
	EXPECT_NEAR(vertices[6].x, 0.0F, 1e-6F);
	EXPECT_LT(vertices[7].y, vertices[6].y);
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
	}
}

TEST(VisualPhysicsVulkanStatics, BuildsPulleyOverlayMarkerGeometryFromSharedPulleyAnchor) {
	auto scenario = visual_physics::statics::make_default_scenario(
		visual_physics::statics::ScenarioId::PulleyEquilibrium);
	scenario.mass = 1.0;
	scenario.secondary_mass = 1.5;

	const auto snapshot = visual_physics::statics::sample_scenario(scenario);
	const auto vertices = visual_physics::statics::build_overlay_marker_vertices(
		snapshot,
		scenario,
		16.0F / 9.0F,
		{.show_applied_force = true, .show_reaction_forces = true, .show_residual_guides = true});

	ASSERT_EQ(vertices.size(), 24U);
	EXPECT_NEAR(vertices[0].r, 1.0F, 1e-6F);
	EXPECT_NEAR(vertices[6].g, 0.92F, 1e-6F);
	EXPECT_NEAR(vertices[18].b, 0.47F, 1e-6F);
	for (const auto& vertex : vertices) {
		EXPECT_GE(vertex.x, -0.96F);
		EXPECT_LE(vertex.x, 0.96F);
		EXPECT_GE(vertex.y, -0.96F);
		EXPECT_LE(vertex.y, 0.96F);
	}
}

TEST(VisualPhysicsVulkanCore, BuildsTrajectoryVerticesUsingAngularViewportMapping) {
	const auto scenario = make_default_scenario(ScenarioId::Projectile);
	const auto samples = build_samples(scenario);
	const auto vertices = build_trajectory_vertices(samples, scenario);

	ASSERT_EQ(vertices.size(), 94U);
	EXPECT_NEAR(vertices.front().x, -0.8333333, 1e-6);
	EXPECT_NEAR(vertices.front().y, -0.6666667, 1e-6);
	EXPECT_NEAR(vertices.back().x, 0.8466667, 1e-6);
	EXPECT_NEAR(vertices.back().y, -0.96, 1e-6);
}

TEST(VisualPhysicsVulkanCore, ParsesAndFormatsScenarioIds) {
	EXPECT_EQ(parse_scenario_id("projectile"), ScenarioId::Projectile);
	EXPECT_EQ(parse_scenario_id("relative-motion"), ScenarioId::RelativeMotion);
	EXPECT_EQ(parse_scenario_id("missing"), std::nullopt);
	EXPECT_EQ(to_string(ScenarioId::UniformCircularMotion), "uniform-circular-motion");
}

TEST(VisualPhysicsVulkanCore, ParsesAngularCompatibleImportPayload) {
	const auto payload = R"({
	  "exportedAt": "2026-06-01T00:00:00.000Z",
	  "scenario": {
	    "id": "relative-motion",
	    "name": "Relative Motion",
	    "summary": "Object velocity observed from a moving frame.",
	    "equationSummary": "v_rel = v_object - v_observer",
	    "durationSeconds": 9,
	    "viewBounds": { "minX": -2, "maxX": 32, "minY": -6, "maxY": 12 },
	    "initialPosition": { "x": 0, "y": 0 },
	    "initialVelocity": { "x": 4.6, "y": 1.4 },
	    "acceleration": { "x": 0, "y": 0 },
	    "observerVelocity": { "x": 1.8, "y": 0.4 }
	  },
	  "snapshot": {
	    "timeSeconds": 3.0,
	    "position": { "x": 13.8, "y": 4.2 },
	    "velocity": { "x": 4.6, "y": 1.4 },
	    "acceleration": { "x": 0, "y": 0 },
	    "speed": 4.808326112,
	    "accelerationMagnitude": 0,
	    "relativePosition": { "x": 8.4, "y": 3.0 },
	    "relativeVelocity": { "x": 2.8, "y": 1.0 }
	  },
	  "overlays": {
	    "showPositionVector": true,
	    "showVelocityVector": true,
	    "showAccelerationVector": true
	  },
	  "samples": []
	})";

	const auto imported = parse_import_payload(payload);

	EXPECT_EQ(imported.scenario.id, ScenarioId::RelativeMotion);
	ASSERT_TRUE(imported.scenario.observer_velocity.has_value());
	EXPECT_NEAR(imported.scenario.observer_velocity->x, 1.8, 1e-9);
	EXPECT_NEAR(imported.scenario.observer_velocity->y, 0.4, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 3.0, 1e-9);
	EXPECT_EQ(imported.scenario.name, "Relative Motion");
}

TEST(VisualPhysicsVulkanCore, SerializesAngularCompatibleExportPayload) {
	const auto scenario = make_default_scenario(ScenarioId::RelativeMotion);
	const auto snapshot = sample_scenario(scenario, 3.0);
	const auto samples = build_samples(scenario, 4);
	const auto payload = serialize_export_payload(
		scenario,
		snapshot,
		{},
		samples,
		"2026-06-01T00:00:00.000Z");

	const auto imported = parse_import_payload(payload);

	EXPECT_EQ(imported.scenario.id, ScenarioId::RelativeMotion);
	EXPECT_NEAR(imported.time_seconds, 3.0, 1e-9);
	EXPECT_EQ(imported.scenario.name, "Relative Motion");
	ASSERT_TRUE(imported.scenario.observer_velocity.has_value());
	EXPECT_NEAR(imported.scenario.observer_velocity->x, 1.8, 1e-9);
}

TEST(VisualPhysicsVulkanCore, RoundTripsPayloadWithoutChangingScenarioOrSamples) {
	auto scenario = make_default_scenario(ScenarioId::UniformCircularMotion);
	scenario.radius = 5.5;
	scenario.angular_speed = 1.2;
	const auto snapshot = sample_scenario(scenario, 2.25);
	const auto samples = build_samples(scenario, 12);
	const auto payload = serialize_export_payload(
		scenario,
		snapshot,
		{},
		samples,
		"2026-06-01T00:00:00.000Z");

	const auto imported = parse_import_payload(payload);
	const auto roundtrip_snapshot = sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = build_samples(imported.scenario, 12);

	expect_scenario_eq(imported.scenario, scenario);
	expect_snapshot_eq(roundtrip_snapshot, snapshot);
	expect_samples_eq(roundtrip_samples, samples);
}

TEST(ComputationalPhysicsReport, BuildsConvergenceCsvWithRecommendationRankingAndGuides) {
	auto scenario = visual_physics::computational_physics::make_default_scenario(
		visual_physics::computational_physics::ScenarioId::OrbitalSolverComparison);
	scenario.comparison_step_seconds = 0.2;
	scenario.reference_step_seconds = 0.01;
	const auto convergence_study =
		visual_physics::computational_physics::build_convergence_study(scenario);
	const auto csv = visual_physics::computational_physics::build_convergence_csv(
		scenario,
		convergence_study);

	EXPECT_NE(csv.find("comparison_step_seconds,euler_final_position_error"), std::string::npos);
	EXPECT_NE(csv.find("guide_orbital_angular_momentum_tolerance"), std::string::npos);
	EXPECT_NE(csv.find("recommended_solver_method"), std::string::npos);
	EXPECT_NE(csv.find("rank_3_reason"), std::string::npos);
	EXPECT_GT(std::count(csv.begin(), csv.end(), '\n'), 1);
	EXPECT_NE(csv.find("rank_1_limiting_metric"), std::string::npos);
}

TEST(ComputationalPhysicsReport, BuildsOrbitalInvariantHistoryCsv) {
	const std::vector<visual_physics::computational_physics::OrbitalInvariantHistorySample> samples{{
		0.5,
		0.125,
		0.0625,
		0.015625,
		0.25,
		0.125,
		0.03125,
	}};
	const auto csv = visual_physics::computational_physics::build_invariant_history_csv(samples);

	EXPECT_EQ(
		csv,
		"time_seconds,euler_specific_energy_error,symplectic_specific_energy_error,rk4_specific_energy_error,euler_angular_momentum_error,symplectic_angular_momentum_error,rk4_angular_momentum_error\n"
		"0.500000,0.125000,0.062500,0.015625,0.250000,0.125000,0.031250");
}

TEST(ComputationalPhysicsReport, BuildsSpringInvariantHistoryCsv) {
	const std::vector<visual_physics::computational_physics::SpringInvariantHistorySample> samples{{
		0.25,
		0.2,
		0.1,
		0.01,
		0.3,
		0.15,
		0.05,
		0.4,
		0.2,
		0.02,
	}};
	const auto csv = visual_physics::computational_physics::build_spring_invariant_history_csv(samples);

	EXPECT_EQ(
		csv,
		"time_seconds,euler_total_energy_error,symplectic_total_energy_error,rk4_total_energy_error,euler_amplitude_error,symplectic_amplitude_error,rk4_amplitude_error,euler_phase_error,symplectic_phase_error,rk4_phase_error\n"
		"0.250000,0.200000,0.100000,0.010000,0.300000,0.150000,0.050000,0.400000,0.200000,0.020000");
}

TEST(QuantumReport, BuildsScenarioSpecificSummaryRows) {
	auto box_scenario = visual_physics::quantum::make_default_scenario(
		visual_physics::quantum::ScenarioId::ParticleInBox);
	const auto box_snapshot = visual_physics::quantum::sample_scenario(box_scenario, 0.35);
	const auto box_rows = visual_physics::quantum::build_report_summary_rows(
		box_scenario,
		box_snapshot);
	ASSERT_EQ(box_rows.size(), 3U);
	EXPECT_EQ(box_rows[0].metric, "energy_level");
	EXPECT_EQ(box_rows[1].metric, "node_count");
	EXPECT_EQ(box_rows[2].metric, "well_length_nm");

	auto tunneling_scenario = visual_physics::quantum::make_default_scenario(
		visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling);
	const auto tunneling_snapshot = visual_physics::quantum::sample_scenario(
		tunneling_scenario,
		0.35);
	const auto tunneling_rows = visual_physics::quantum::build_report_summary_rows(
		tunneling_scenario,
		tunneling_snapshot);
	ASSERT_EQ(tunneling_rows.size(), 3U);
	EXPECT_EQ(tunneling_rows[0].metric, "transmission_probability");
	EXPECT_EQ(tunneling_rows[1].metric, "reflection_probability");
	EXPECT_EQ(tunneling_rows[2].metric, "barrier_height_ev");

	auto slit_scenario = visual_physics::quantum::make_default_scenario(
		visual_physics::quantum::ScenarioId::DoubleSlitInterference);
	const auto slit_snapshot = visual_physics::quantum::sample_scenario(slit_scenario, 0.35);
	const auto slit_rows = visual_physics::quantum::build_report_summary_rows(
		slit_scenario,
		slit_snapshot);
	ASSERT_EQ(slit_rows.size(), 3U);
	EXPECT_EQ(slit_rows[0].metric, "fringe_spacing_mm");
	EXPECT_EQ(slit_rows[1].metric, "central_maximum_width_mm");
	EXPECT_EQ(slit_rows[2].metric, "screen_distance_m");
}

TEST(QuantumReport, BuildsCsvWithSummaryAndSamples) {
	auto scenario = visual_physics::quantum::make_default_scenario(
		visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling);
	scenario.particle_energy_ev = 2.8;
	scenario.barrier_height_ev = 4.1;
	const auto snapshot = visual_physics::quantum::sample_scenario(scenario, 0.4);
	const auto samples = visual_physics::quantum::build_samples(scenario, 6);
	const auto csv = visual_physics::quantum::build_report_csv(
		scenario,
		snapshot,
		samples);

	EXPECT_NE(csv.find("\"summary\",\"transmission_probability\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"reflection_probability\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"barrier_height_ev\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("\"tunneling-envelope\","), std::string::npos);
	EXPECT_NE(csv.find(",true\n"), std::string::npos);
	EXPECT_GT(std::count(csv.begin(), csv.end(), '\n'), 4);
}

TEST(VisualPhysicsVulkanExecutable, ListsPlasmaPhysicsScenarios) {
	const auto output_path = unique_temp_path("_plasma_physics_list.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --list-scenarios > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	const auto output = read_text_file(output_path);

	EXPECT_NE(output.find("plasma-oscillation"), std::string::npos);
	EXPECT_NE(output.find("debye-screening"), std::string::npos);
	EXPECT_NE(output.find("magnetic-confinement"), std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RendersDebyePlasmaScenarioAndExportsPayloadAndReport) {
	const auto image_path = unique_temp_path("_plasma_debye.ppm");
	const auto payload_path = unique_temp_path("_plasma_debye.json");
	const auto report_csv_path = unique_temp_path("_plasma_debye.csv");
	const auto output_path = unique_temp_path("_plasma_debye.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --scenario debye-screening --time 0.45 --show-reference-guides true --show-comparison-band false --show-active-marker true --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::DebyeScreening);
	const auto expected_snapshot =
		visual_physics::plasma_physics::sample_scenario(expected_scenario, 0.45);
	const auto expected_report_rows =
		visual_physics::plasma_physics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Plasma Physics summary: debyeLengthMm="
		<< expected_snapshot.debye_length_millimeters.value_or(0.0)
		<< ", shieldingFraction="
		<< expected_snapshot.shielding_fraction.value_or(0.0)
		<< ", screenedPotentialV="
		<< expected_snapshot.screened_potential_volts.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Plasma Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"debye-screening\""), std::string::npos);
	EXPECT_NE(payload.find("\"probePotentialVolts\": 18.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.45"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("\"summary\",\"debye_length_mm\""), std::string::npos);
	EXPECT_NE(report_csv.find("debye-screening-profile"), std::string::npos);
	EXPECT_NE(output.find("Domain: plasma-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: debye-screening"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported plasma report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Plasma Physics overlays: referenceGuides=on, comparisonBand=off, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: none"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsOscillationPlasmaPayloadAndAppliesOverlayAndTimeOverrides) {
	const auto import_path = unique_temp_path("_import_plasma_oscillation.json");
	const auto export_path = unique_temp_path("_export_plasma_oscillation.json");
	const auto image_path = unique_temp_path("_import_plasma_oscillation.ppm");
	const auto report_csv_path = unique_temp_path("_import_plasma_oscillation.csv");
	const auto output_path = unique_temp_path("_import_plasma_oscillation.txt");

	auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::PlasmaOscillation);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.20);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.20, 10);
	write_text_file(
		import_path,
		visual_physics::plasma_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --import " + shell_quote(import_path) +
		" --time 0.65 --show-reference-guides true --show-active-marker false --show-comparison-band true --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	const auto expected_snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.65);
	const auto expected_report_rows =
		visual_physics::plasma_physics::build_report_summary_rows(scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Plasma Physics summary: plasmaFrequencyGHz="
		<< expected_snapshot.plasma_frequency_gigahertz.value_or(0.0)
		<< ", oscillationPeriodNs="
		<< expected_snapshot.oscillation_period_nanoseconds.value_or(0.0)
		<< ", restoringFieldKVm="
		<< expected_snapshot.restoring_field_kilovolts_per_meter.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Plasma Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"plasma-oscillation\""), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.65"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("plasma-oscillation-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Domain: plasma-physics"), std::string::npos);
	EXPECT_NE(output.find("Scenario: plasma-oscillation"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Exported plasma report CSV: "), std::string::npos);
	EXPECT_NE(output.find("Plasma Physics overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsPlasmaReportCsvForNonPlasmaDomain) {
	const auto output_path = unique_temp_path("_plasma_report_invalid_domain.txt");
	const auto report_csv_path = unique_temp_path("_plasma_report_invalid_domain.csv");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Plasma Physics report CSV export flag can only be used with --domain plasma-physics"),
		std::string::npos);

	std::filesystem::remove(output_path);
	std::filesystem::remove(report_csv_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesOscillationPlasmaCliOverridesToRenderAndExport) {
	const auto image_path = unique_temp_path("_plasma_oscillation_overrides.ppm");
	const auto payload_path = unique_temp_path("_plasma_oscillation_overrides.json");
	const auto report_csv_path = unique_temp_path("_plasma_oscillation_overrides.csv");
	const auto output_path = unique_temp_path("_plasma_oscillation_overrides.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --scenario plasma-oscillation --time 0.50 --show-reference-guides false --show-comparison-band true --show-active-marker false --electron-density-per-cubic-meter 7.2e18 --electron-temperature-electron-volts 9.5 --perturbation-amplitude-percent 6.8 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::PlasmaOscillation);
	expected_scenario.electron_density_per_cubic_meter = 7.2e18;
	expected_scenario.electron_temperature_electron_volts = 9.5;
	expected_scenario.perturbation_amplitude_percent = 6.8;
	const auto expected_snapshot = visual_physics::plasma_physics::sample_scenario(expected_scenario, 0.5);
	const auto expected_report_rows =
		visual_physics::plasma_physics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Plasma Physics summary: plasmaFrequencyGHz="
		<< expected_snapshot.plasma_frequency_gigahertz.value_or(0.0)
		<< ", oscillationPeriodNs="
		<< expected_snapshot.oscillation_period_nanoseconds.value_or(0.0)
		<< ", restoringFieldKVm="
		<< expected_snapshot.restoring_field_kilovolts_per_meter.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Plasma Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"electronDensityPerCubicMeter\": 7.2e+18"), std::string::npos);
	EXPECT_NE(payload.find("\"electronTemperatureElectronVolts\": 9.5"), std::string::npos);
	EXPECT_NE(payload.find("\"perturbationAmplitudePercent\": 6.8"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("plasma-oscillation-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Plasma Physics overlays: referenceGuides=off, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: electronDensityPerCubicMeter=7.200e+18, electronTemperatureElectronVolts=9.500000, perturbationAmplitudePercent=6.800000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesDebyePlasmaCliOverridesToRenderAndExport) {
	const auto image_path = unique_temp_path("_plasma_debye_overrides.ppm");
	const auto payload_path = unique_temp_path("_plasma_debye_overrides.json");
	const auto report_csv_path = unique_temp_path("_plasma_debye_overrides.csv");
	const auto output_path = unique_temp_path("_plasma_debye_overrides.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --scenario debye-screening --time 0.55 --show-reference-guides true --show-comparison-band false --show-active-marker false --electron-density-per-cubic-meter 4.4e18 --electron-temperature-electron-volts 7.2 --probe-potential-volts 24.0 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::DebyeScreening);
	expected_scenario.electron_density_per_cubic_meter = 4.4e18;
	expected_scenario.electron_temperature_electron_volts = 7.2;
	expected_scenario.probe_potential_volts = 24.0;
	const auto expected_snapshot = visual_physics::plasma_physics::sample_scenario(expected_scenario, 0.55);
	const auto expected_report_rows =
		visual_physics::plasma_physics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Plasma Physics summary: debyeLengthMm="
		<< expected_snapshot.debye_length_millimeters.value_or(0.0)
		<< ", shieldingFraction="
		<< expected_snapshot.shielding_fraction.value_or(0.0)
		<< ", screenedPotentialV="
		<< expected_snapshot.screened_potential_volts.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Plasma Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"electronDensityPerCubicMeter\": 4.4e+18"), std::string::npos);
	EXPECT_NE(payload.find("\"electronTemperatureElectronVolts\": 7.2"), std::string::npos);
	EXPECT_NE(payload.find("\"probePotentialVolts\": 24.0"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("debye-screening-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Plasma Physics overlays: referenceGuides=on, comparisonBand=off, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: electronDensityPerCubicMeter=4.400e+18, electronTemperatureElectronVolts=7.200000, probePotentialVolts=24.000000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsConfinementPlasmaPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_plasma_confinement.json");
	const auto export_path = unique_temp_path("_export_plasma_confinement.json");
	const auto image_path = unique_temp_path("_import_plasma_confinement.ppm");
	const auto report_csv_path = unique_temp_path("_import_plasma_confinement.csv");
	const auto output_path = unique_temp_path("_import_plasma_confinement.txt");

	auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::MagneticConfinement);
	scenario.magnetic_field_tesla = 4.8;
	scenario.plasma_current_mega_amperes = 12.2;
	scenario.major_radius_meters = 3.8;
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.20);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.20, 10);
	write_text_file(
		import_path,
		visual_physics::plasma_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --import " + shell_quote(import_path) +
		" --time 0.70 --magnetic-field-tesla 5.6 --plasma-current-mega-amperes 14.5 --major-radius-meters 4.2 --show-reference-guides true --show-active-marker false --show-comparison-band true --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = scenario;
	expected_scenario.magnetic_field_tesla = 5.6;
	expected_scenario.plasma_current_mega_amperes = 14.5;
	expected_scenario.major_radius_meters = 4.2;
	const auto expected_snapshot = visual_physics::plasma_physics::sample_scenario(expected_scenario, 0.70);
	const auto expected_report_rows =
		visual_physics::plasma_physics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Plasma Physics summary: larmorRadiusMm="
		<< expected_snapshot.larmor_radius_millimeters.value_or(0.0)
		<< ", betaPercent="
		<< expected_snapshot.beta_percent.value_or(0.0)
		<< ", safetyFactor="
		<< expected_snapshot.safety_factor.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Plasma Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"magnetic-confinement\""), std::string::npos);
	EXPECT_NE(payload.find("\"magneticFieldTesla\": 5.6"), std::string::npos);
	EXPECT_NE(payload.find("\"plasmaCurrentMegaAmperes\": 14.5"), std::string::npos);
	EXPECT_NE(payload.find("\"majorRadiusMeters\": 4.2"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.7"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("magnetic-confinement-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Plasma Physics overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: magneticFieldTesla=5.600000, plasmaCurrentMegaAmperes=14.500000, majorRadiusMeters=4.200000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsOscillationPlasmaPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_plasma_oscillation_cli.json");
	const auto export_path = unique_temp_path("_export_plasma_oscillation_cli.json");
	const auto image_path = unique_temp_path("_import_plasma_oscillation_cli.ppm");
	const auto report_csv_path = unique_temp_path("_import_plasma_oscillation_cli.csv");
	const auto output_path = unique_temp_path("_import_plasma_oscillation_cli.txt");

	auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::PlasmaOscillation);
	scenario.electron_density_per_cubic_meter = 6.1e18;
	scenario.electron_temperature_electron_volts = 8.2;
	scenario.perturbation_amplitude_percent = 4.5;
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.22);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.22, 10);
	write_text_file(
		import_path,
		visual_physics::plasma_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --import " + shell_quote(import_path) +
		" --time 0.62 --electron-density-per-cubic-meter 7.8e18 --electron-temperature-electron-volts 10.1 --perturbation-amplitude-percent 6.4 --show-reference-guides true --show-active-marker false --show-comparison-band true --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = scenario;
	expected_scenario.electron_density_per_cubic_meter = 7.8e18;
	expected_scenario.electron_temperature_electron_volts = 10.1;
	expected_scenario.perturbation_amplitude_percent = 6.4;
	const auto expected_snapshot = visual_physics::plasma_physics::sample_scenario(expected_scenario, 0.62);
	const auto expected_report_rows =
		visual_physics::plasma_physics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Plasma Physics summary: plasmaFrequencyGHz="
		<< expected_snapshot.plasma_frequency_gigahertz.value_or(0.0)
		<< ", oscillationPeriodNs="
		<< expected_snapshot.oscillation_period_nanoseconds.value_or(0.0)
		<< ", restoringFieldKVm="
		<< expected_snapshot.restoring_field_kilovolts_per_meter.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Plasma Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"plasma-oscillation\""), std::string::npos);
	EXPECT_NE(payload.find("\"electronDensityPerCubicMeter\": 7.8e+18"), std::string::npos);
	EXPECT_NE(payload.find("\"electronTemperatureElectronVolts\": 10.1"), std::string::npos);
	EXPECT_NE(payload.find("\"perturbationAmplitudePercent\": 6.4"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.62"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("plasma-oscillation-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Plasma Physics overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: electronDensityPerCubicMeter=7.800e+18, electronTemperatureElectronVolts=10.100000, perturbationAmplitudePercent=6.400000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, AppliesConfinementPlasmaCliOverridesToRenderAndExport) {
	const auto image_path = unique_temp_path("_plasma_confinement_overrides.ppm");
	const auto payload_path = unique_temp_path("_plasma_confinement_overrides.json");
	const auto report_csv_path = unique_temp_path("_plasma_confinement_overrides.csv");
	const auto output_path = unique_temp_path("_plasma_confinement_overrides.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --scenario magnetic-confinement --time 0.60 --show-reference-guides false --show-comparison-band true --show-active-marker true --magnetic-field-tesla 6.4 --plasma-current-mega-amperes 15.2 --major-radius-meters 4.8 --roundtrip-check --export-state " +
		shell_quote(payload_path) + " --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) + " > " +
		shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(payload_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::MagneticConfinement);
	expected_scenario.magnetic_field_tesla = 6.4;
	expected_scenario.plasma_current_mega_amperes = 15.2;
	expected_scenario.major_radius_meters = 4.8;
	const auto expected_snapshot = visual_physics::plasma_physics::sample_scenario(expected_scenario, 0.6);
	const auto expected_report_rows =
		visual_physics::plasma_physics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Plasma Physics summary: larmorRadiusMm="
		<< expected_snapshot.larmor_radius_millimeters.value_or(0.0)
		<< ", betaPercent="
		<< expected_snapshot.beta_percent.value_or(0.0)
		<< ", safetyFactor="
		<< expected_snapshot.safety_factor.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Plasma Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(payload_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"magneticFieldTesla\": 6.4"), std::string::npos);
	EXPECT_NE(payload.find("\"plasmaCurrentMegaAmperes\": 15.2"), std::string::npos);
	EXPECT_NE(payload.find("\"majorRadiusMeters\": 4.8"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": false"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": true"), std::string::npos);
	EXPECT_NE(report_csv.find("magnetic-confinement-profile"), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Plasma Physics overlays: referenceGuides=off, comparisonBand=on, activeMarker=on"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: magneticFieldTesla=6.400000, plasmaCurrentMegaAmperes=15.200000, majorRadiusMeters=4.800000"), std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(payload_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, ImportsDebyePlasmaPayloadAndAppliesCliOverrides) {
	const auto import_path = unique_temp_path("_import_plasma_debye.json");
	const auto export_path = unique_temp_path("_export_plasma_debye.json");
	const auto image_path = unique_temp_path("_import_plasma_debye.ppm");
	const auto report_csv_path = unique_temp_path("_import_plasma_debye.csv");
	const auto output_path = unique_temp_path("_import_plasma_debye.txt");

	auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::DebyeScreening);
	scenario.electron_density_per_cubic_meter = 3.8e18;
	scenario.electron_temperature_electron_volts = 5.9;
	scenario.probe_potential_volts = 21.0;
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.25);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.25, 10);
	write_text_file(
		import_path,
		visual_physics::plasma_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --import " + shell_quote(import_path) +
		" --time 0.58 --electron-density-per-cubic-meter 5.1e18 --electron-temperature-electron-volts 8.4 --probe-potential-volts 26.0 --show-reference-guides true --show-active-marker false --show-comparison-band true --roundtrip-check --export-state " +
		shell_quote(export_path) + " --export-plasma-report-csv " +
		shell_quote(report_csv_path) + " --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path);

	ASSERT_EQ(run_command(command), 0);
	ASSERT_TRUE(std::filesystem::exists(export_path));
	ASSERT_TRUE(std::filesystem::exists(image_path));
	ASSERT_TRUE(std::filesystem::exists(report_csv_path));
	ASSERT_TRUE(std::filesystem::exists(output_path));

	auto expected_scenario = scenario;
	expected_scenario.electron_density_per_cubic_meter = 5.1e18;
	expected_scenario.electron_temperature_electron_volts = 8.4;
	expected_scenario.probe_potential_volts = 26.0;
	const auto expected_snapshot = visual_physics::plasma_physics::sample_scenario(expected_scenario, 0.58);
	const auto expected_report_rows =
		visual_physics::plasma_physics::build_report_summary_rows(expected_scenario, expected_snapshot);
	std::ostringstream expected_summary;
	expected_summary << std::fixed << std::setprecision(3)
		<< "Plasma Physics summary: debyeLengthMm="
		<< expected_snapshot.debye_length_millimeters.value_or(0.0)
		<< ", shieldingFraction="
		<< expected_snapshot.shielding_fraction.value_or(0.0)
		<< ", screenedPotentialV="
		<< expected_snapshot.screened_potential_volts.value_or(0.0);
	std::ostringstream expected_report_summary;
	expected_report_summary << "Plasma Physics report summary: ";
	for (std::size_t index = 0; index < expected_report_rows.size(); index += 1) {
		if (index > 0) {
			expected_report_summary << ", ";
		}
		expected_report_summary << expected_report_rows[index].metric << '='
			<< expected_report_rows[index].value;
	}

	const auto payload = read_text_file(export_path);
	const auto report_csv = read_text_file(report_csv_path);
	const auto output = read_text_file(output_path);
	EXPECT_NE(payload.find("\"id\": \"debye-screening\""), std::string::npos);
	EXPECT_NE(payload.find("\"electronDensityPerCubicMeter\": 5.1e+18"), std::string::npos);
	EXPECT_NE(payload.find("\"electronTemperatureElectronVolts\": 8.4"), std::string::npos);
	EXPECT_NE(payload.find("\"probePotentialVolts\": 26.0"), std::string::npos);
	EXPECT_NE(payload.find("\"timeSeconds\": 0.58"), std::string::npos);
	EXPECT_NE(payload.find("\"showReferenceGuides\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showComparisonBand\": true"), std::string::npos);
	EXPECT_NE(payload.find("\"showActiveMarker\": false"), std::string::npos);
	EXPECT_NE(report_csv.find("debye-screening-profile"), std::string::npos);
	EXPECT_NE(output.find("Imported payload: "), std::string::npos);
	EXPECT_NE(output.find("Roundtrip check: passed"), std::string::npos);
	EXPECT_NE(output.find("Plasma Physics overlays: referenceGuides=on, comparisonBand=on, activeMarker=off"), std::string::npos);
	EXPECT_NE(output.find(expected_summary.str()), std::string::npos);
	EXPECT_NE(output.find(expected_report_summary.str()), std::string::npos);
	EXPECT_NE(output.find("Overrides: electronDensityPerCubicMeter=5.100e+18, electronTemperatureElectronVolts=8.400000, probePotentialVolts=26.000000"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(export_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(report_csv_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedConfinementPlasmaCliFlags) {
	const auto import_path = unique_temp_path("_import_plasma_confinement_invalid.json");
	const auto image_path = unique_temp_path("_import_plasma_confinement_invalid.ppm");
	const auto output_path = unique_temp_path("_import_plasma_confinement_invalid.txt");

	auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::MagneticConfinement);
	scenario.magnetic_field_tesla = 4.9;
	scenario.plasma_current_mega_amperes = 12.8;
	scenario.major_radius_meters = 4.1;
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.3);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.3, 10);
	write_text_file(
		import_path,
		visual_physics::plasma_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = false,
				.show_comparison_band = true,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --import " + shell_quote(import_path) +
		" --probe-potential-volts 24.0 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--probe-potential-volts cannot be used with plasma-physics scenario magnetic-confinement"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedOscillationPlasmaCliFlags) {
	const auto import_path = unique_temp_path("_import_plasma_oscillation_invalid.json");
	const auto image_path = unique_temp_path("_import_plasma_oscillation_invalid.ppm");
	const auto output_path = unique_temp_path("_import_plasma_oscillation_invalid.txt");

	auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::PlasmaOscillation);
	scenario.electron_density_per_cubic_meter = 6.4e18;
	scenario.electron_temperature_electron_volts = 7.7;
	scenario.perturbation_amplitude_percent = 4.9;
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.28);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.28, 10);
	write_text_file(
		import_path,
		visual_physics::plasma_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --import " + shell_quote(import_path) +
		" --magnetic-field-tesla 5.2 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--magnetic-field-tesla cannot be used with plasma-physics scenario plasma-oscillation"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsInvalidImportedDebyePlasmaCliFlags) {
	const auto import_path = unique_temp_path("_import_plasma_debye_invalid.json");
	const auto image_path = unique_temp_path("_import_plasma_debye_invalid.ppm");
	const auto output_path = unique_temp_path("_import_plasma_debye_invalid.txt");

	auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::DebyeScreening);
	scenario.electron_density_per_cubic_meter = 4.2e18;
	scenario.electron_temperature_electron_volts = 6.8;
	scenario.probe_potential_volts = 22.0;
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.31);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.31, 10);
	write_text_file(
		import_path,
		visual_physics::plasma_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = false,
				.show_active_marker = true,
				.show_comparison_band = true,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --import " + shell_quote(import_path) +
		" --perturbation-amplitude-percent 5.4 --output " + shell_quote(image_path) +
		" > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--perturbation-amplitude-percent cannot be used with plasma-physics scenario debye-screening"),
		std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsConfinementOnlyOverrideForOscillationPlasmaScenario) {
	const auto output_path = unique_temp_path("_plasma_invalid_oscillation.txt");
	const auto image_path = unique_temp_path("_plasma_invalid_oscillation.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --scenario plasma-oscillation --magnetic-field-tesla 5.0 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--magnetic-field-tesla cannot be used with plasma-physics scenario plasma-oscillation"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsOscillationOnlyOverrideForDebyePlasmaScenario) {
	const auto output_path = unique_temp_path("_plasma_invalid_debye.txt");
	const auto image_path = unique_temp_path("_plasma_invalid_debye.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --scenario debye-screening --perturbation-amplitude-percent 5.0 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--perturbation-amplitude-percent cannot be used with plasma-physics scenario debye-screening"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsDebyeOnlyOverrideForConfinementPlasmaScenario) {
	const auto output_path = unique_temp_path("_plasma_invalid_confinement.txt");
	const auto image_path = unique_temp_path("_plasma_invalid_confinement.ppm");
	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --scenario magnetic-confinement --probe-potential-volts 24.0 --output " +
		shell_quote(image_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("--probe-potential-volts cannot be used with plasma-physics scenario magnetic-confinement"),
		std::string::npos);

	std::filesystem::remove(image_path);
	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsPlasmaOverrideFlagsForNonPlasmaDomain) {
	const auto output_path = unique_temp_path("_plasma_override_wrong_domain.txt");
	const auto command = shell_quote(executable_path()) +
		" --domain kinematics --electron-density-per-cubic-meter 6.2e18 > " +
		shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(
		output.find("Plasma Physics override flags can only be used with --domain plasma-physics"),
		std::string::npos);

	std::filesystem::remove(output_path);
}

TEST(VisualPhysicsVulkanExecutable, RejectsScenarioWithImportedPlasmaPayload) {
	const auto import_path = unique_temp_path("_plasma_scenario_import_conflict.json");
	const auto output_path = unique_temp_path("_plasma_scenario_import_conflict.txt");

	auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::DebyeScreening);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.2);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.2, 10);
	write_text_file(
		import_path,
		visual_physics::plasma_physics::serialize_export_payload(
			scenario,
			snapshot,
			{
				.show_reference_guides = true,
				.show_active_marker = true,
				.show_comparison_band = false,
			},
			samples,
			"2026-06-04T00:00:00.000Z"));

	const auto command = shell_quote(executable_path()) +
		" --domain plasma-physics --scenario debye-screening --import " +
		shell_quote(import_path) + " > " + shell_quote(output_path) + " 2>&1";

	ASSERT_NE(run_command(command), 0);
	const auto output = read_text_file(output_path);
	EXPECT_NE(output.find("--scenario cannot be combined with --import"), std::string::npos);

	std::filesystem::remove(import_path);
	std::filesystem::remove(output_path);
}

TEST(PlasmaPhysicsCore, ComputesOscillationDiagnostics) {
	const auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::PlasmaOscillation);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::plasma_physics::build_samples(scenario);
	const auto expected_frequency = 8.98 * std::sqrt(3.2);
	const auto expected_restoring_field =
		(12.0 / 100.0) * 6.0 * std::sqrt(3.2) * (0.85 + 0.15 * std::cos(0.35 * 2.0 * kPi));

	ASSERT_TRUE(snapshot.plasma_frequency_gigahertz.has_value());
	ASSERT_TRUE(snapshot.oscillation_period_nanoseconds.has_value());
	ASSERT_TRUE(snapshot.restoring_field_kilovolts_per_meter.has_value());
	EXPECT_NEAR(snapshot.time_seconds, 0.35, 1e-9);
	EXPECT_NEAR(*snapshot.plasma_frequency_gigahertz, expected_frequency, 1e-9);
	EXPECT_NEAR(*snapshot.oscillation_period_nanoseconds, 1.0 / expected_frequency, 1e-9);
	EXPECT_NEAR(*snapshot.restoring_field_kilovolts_per_meter, expected_restoring_field, 1e-9);
	EXPECT_TRUE(snapshot.stable);

	ASSERT_EQ(samples.size(), 24U);
	EXPECT_EQ(samples.front().label, "plasma-oscillation-profile");
	EXPECT_GT(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		0);
}

TEST(PlasmaPhysicsCore, ComputesDebyeDiagnostics) {
	const auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::DebyeScreening);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.45);
	const auto expected_debye_length = 0.23 * std::sqrt(9.0 / 1.8);
	const auto expected_active_radius = expected_debye_length * 0.95;
	const auto expected_shielding_fraction = 1.0 - std::exp(-expected_active_radius / expected_debye_length);
	const auto expected_screened_potential = 18.0 * std::exp(-expected_active_radius / expected_debye_length);

	ASSERT_TRUE(snapshot.debye_length_millimeters.has_value());
	ASSERT_TRUE(snapshot.shielding_fraction.has_value());
	ASSERT_TRUE(snapshot.screened_potential_volts.has_value());
	EXPECT_NEAR(*snapshot.debye_length_millimeters, expected_debye_length, 1e-9);
	EXPECT_NEAR(*snapshot.shielding_fraction, expected_shielding_fraction, 1e-9);
	EXPECT_NEAR(*snapshot.screened_potential_volts, expected_screened_potential, 1e-9);
	EXPECT_TRUE(snapshot.stable);

	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.45, 25);
	ASSERT_EQ(samples.size(), 25U);
	EXPECT_EQ(samples.front().label, "debye-screening-profile");
	EXPECT_GT(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		0);
}

TEST(PlasmaPhysicsCore, ComputesConfinementDiagnostics) {
	const auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::MagneticConfinement);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.55);

	ASSERT_TRUE(snapshot.larmor_radius_millimeters.has_value());
	ASSERT_TRUE(snapshot.beta_percent.has_value());
	ASSERT_TRUE(snapshot.safety_factor.has_value());
	EXPECT_NEAR(*snapshot.larmor_radius_millimeters, (4.6 / 3.6) * (0.8 + 0.4 * 0.55), 1e-9);
	EXPECT_NEAR(*snapshot.beta_percent, (1.4 * 9.6) / (3.6 * 2.8), 1e-9);
	EXPECT_NEAR(*snapshot.safety_factor, 36.0, 1e-9);
	EXPECT_FALSE(snapshot.stable);

	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.55, 21);
	ASSERT_EQ(samples.size(), 21U);
	EXPECT_EQ(samples.front().label, "magnetic-confinement-profile");
	EXPECT_GT(
		std::count_if(samples.begin(), samples.end(), [](const auto& sample) { return sample.active; }),
		0);
}

TEST(PlasmaPhysicsPayload, RoundTripsDebyeScenarioSnapshotSamplesAndOverlays) {
	const auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::DebyeScreening);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.45);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.45, 25);
	const visual_physics::plasma_physics::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_active_marker = true,
		.show_comparison_band = false,
	};

	const auto serialized = visual_physics::plasma_physics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::plasma_physics::parse_import_payload(serialized);
	const auto payload = nlohmann::json::parse(serialized);

	EXPECT_EQ(imported.scenario.id, scenario.id);
	EXPECT_EQ(imported.scenario.name, scenario.name);
	EXPECT_EQ(imported.scenario.summary, scenario.summary);
	EXPECT_NEAR(imported.scenario.view_bounds.max_x, scenario.view_bounds.max_x, 1e-9);
	ASSERT_TRUE(imported.scenario.electron_density_per_cubic_meter.has_value());
	ASSERT_TRUE(imported.scenario.probe_potential_volts.has_value());
	EXPECT_NEAR(*imported.scenario.electron_density_per_cubic_meter, 1.8e18, 1.0);
	EXPECT_NEAR(*imported.scenario.probe_potential_volts, 18.0, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.45, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_TRUE(imported.overlays->show_active_marker);
	EXPECT_FALSE(imported.overlays->show_comparison_band);
	EXPECT_EQ(payload.at("samples").size(), samples.size());
	EXPECT_EQ(payload.at("snapshot").at("stable").get<bool>(), snapshot.stable);
}

TEST(PlasmaPhysicsPayload, RoundTripsOscillationScenarioSnapshotSamplesAndOverlays) {
	const auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::PlasmaOscillation);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.35, 25);
	const visual_physics::plasma_physics::OverlayOptions overlays{
		.show_reference_guides = false,
		.show_active_marker = true,
		.show_comparison_band = true,
	};

	const auto serialized = visual_physics::plasma_physics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::plasma_physics::parse_import_payload(serialized);
	const auto payload = nlohmann::json::parse(serialized);

	EXPECT_EQ(imported.scenario.id, scenario.id);
	EXPECT_EQ(imported.scenario.name, scenario.name);
	EXPECT_EQ(imported.scenario.summary, scenario.summary);
	EXPECT_NEAR(imported.scenario.view_bounds.min_x, scenario.view_bounds.min_x, 1e-9);
	ASSERT_TRUE(imported.scenario.electron_density_per_cubic_meter.has_value());
	ASSERT_TRUE(imported.scenario.perturbation_amplitude_percent.has_value());
	EXPECT_NEAR(*imported.scenario.electron_density_per_cubic_meter, 3.2e18, 1.0);
	EXPECT_NEAR(*imported.scenario.perturbation_amplitude_percent, 12.0, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.35, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_FALSE(imported.overlays->show_reference_guides);
	EXPECT_TRUE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_EQ(payload.at("samples").size(), samples.size());
	EXPECT_EQ(payload.at("snapshot").at("stable").get<bool>(), snapshot.stable);
}

TEST(PlasmaPhysicsPayload, RoundTripsConfinementScenarioSnapshotSamplesAndOverlays) {
	const auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::MagneticConfinement);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.55);
	const auto samples = visual_physics::plasma_physics::build_samples_at_time(scenario, 0.55, 25);
	const visual_physics::plasma_physics::OverlayOptions overlays{
		.show_reference_guides = true,
		.show_active_marker = false,
		.show_comparison_band = true,
	};

	const auto serialized = visual_physics::plasma_physics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"2026-06-04T00:00:00.000Z");
	const auto imported = visual_physics::plasma_physics::parse_import_payload(serialized);
	const auto payload = nlohmann::json::parse(serialized);

	EXPECT_EQ(imported.scenario.id, scenario.id);
	EXPECT_EQ(imported.scenario.name, scenario.name);
	EXPECT_EQ(imported.scenario.summary, scenario.summary);
	EXPECT_NEAR(imported.scenario.view_bounds.max_y, scenario.view_bounds.max_y, 1e-9);
	ASSERT_TRUE(imported.scenario.magnetic_field_tesla.has_value());
	ASSERT_TRUE(imported.scenario.plasma_current_mega_amperes.has_value());
	ASSERT_TRUE(imported.scenario.major_radius_meters.has_value());
	EXPECT_NEAR(*imported.scenario.magnetic_field_tesla, 3.6, 1e-9);
	EXPECT_NEAR(*imported.scenario.plasma_current_mega_amperes, 1.4, 1e-9);
	EXPECT_NEAR(*imported.scenario.major_radius_meters, 2.8, 1e-9);
	EXPECT_NEAR(imported.time_seconds, 0.55, 1e-9);
	ASSERT_TRUE(imported.overlays.has_value());
	EXPECT_TRUE(imported.overlays->show_reference_guides);
	EXPECT_FALSE(imported.overlays->show_active_marker);
	EXPECT_TRUE(imported.overlays->show_comparison_band);
	EXPECT_EQ(payload.at("samples").size(), samples.size());
	EXPECT_EQ(payload.at("snapshot").at("stable").get<bool>(), snapshot.stable);
}

TEST(PlasmaPhysicsPayload, RejectsNonFiniteSnapshotTime) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "plasma-oscillation",
	    "name": "Plasma Oscillation",
	    "summary": "Follow a density perturbation, collective restoring field, and plasma-frequency estimate in a starter plasma slice.",
	    "equationSummary": "omega_p ~ sqrt(n_e), E_restore ~ delta n * T_e",
	    "status": "Starter collective slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 18 },
	    "focusArea": "Density-driven collective oscillation, restoring-field strength, and frequency intuition in one shared view.",
	    "electronDensityPerCubicMeter": 3.2e18,
	    "electronTemperatureElectronVolts": 6.0,
	    "perturbationAmplitudePercent": 12.0
	  },
	  "snapshot": { "timeSeconds": 1e999 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(PlasmaPhysicsPayload, RejectsMissingSnapshotTime) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "debye-screening",
	    "name": "Debye Screening",
	    "summary": "Inspect shielding length, screened potential, and charge screening strength around a probe in a plasma.",
	    "equationSummary": "lambda_D ~ sqrt(T_e / n_e), phi(r) ~ phi0 exp(-r / lambda_D)",
	    "status": "Starter shielding slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 3, "minY": 0, "maxY": 18 },
	    "focusArea": "Debye length intuition, screened-potential rolloff, and shielding fraction around an inserted probe.",
	    "electronDensityPerCubicMeter": 1.8e18,
	    "electronTemperatureElectronVolts": 9.0,
	    "probePotentialVolts": 18.0
	  },
	  "snapshot": {}
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(PlasmaPhysicsPayload, RejectsNonFiniteViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "magnetic-confinement",
	    "name": "Magnetic Confinement",
	    "summary": "Estimate confinement quality, gyroradius, and safety-factor trends for a simplified toroidal plasma column.",
	    "equationSummary": "rho_L ~ 1 / B, q ~ BR / I_p, beta ~ p / B^2",
	    "status": "Starter confinement slice",
	    "durationSeconds": 1,
	    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 1e999 },
	    "focusArea": "Magnetic-field strength, plasma current, and confinement quality in a first tokamak-style view.",
	    "magneticFieldTesla": 3.6,
	    "plasmaCurrentMegaAmperes": 1.4,
	    "majorRadiusMeters": 2.8
	  },
	  "snapshot": { "timeSeconds": 0.55 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(PlasmaPhysicsPayload, RejectsMissingViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "plasma-oscillation",
	    "name": "Plasma Oscillation",
	    "summary": "Follow a density perturbation, collective restoring field, and plasma-frequency estimate in a starter plasma slice.",
	    "equationSummary": "omega_p ~ sqrt(n_e), E_restore ~ delta n * T_e",
	    "status": "Starter collective slice",
	    "durationSeconds": 1,
	    "focusArea": "Density-driven collective oscillation, restoring-field strength, and frequency intuition in one shared view.",
	    "electronDensityPerCubicMeter": 3.2e18,
	    "electronTemperatureElectronVolts": 6.0,
	    "perturbationAmplitudePercent": 12.0
	  },
	  "snapshot": { "timeSeconds": 0.35 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

TEST(PlasmaPhysicsPayload, RejectsNonObjectViewBounds) {
	const auto malformed = R"json({
	  "scenario": {
	    "id": "debye-screening",
	    "name": "Debye Screening",
	    "summary": "Inspect shielding length, screened potential, and charge screening strength around a probe in a plasma.",
	    "equationSummary": "lambda_D ~ sqrt(T_e / n_e), phi(r) ~ phi0 exp(-r / lambda_D)",
	    "status": "Starter shielding slice",
	    "durationSeconds": 1,
	    "viewBounds": [],
	    "focusArea": "Debye length intuition, screened-potential rolloff, and shielding fraction around an inserted probe.",
	    "electronDensityPerCubicMeter": 1.8e18,
	    "electronTemperatureElectronVolts": 9.0,
	    "probePotentialVolts": 18.0
	  },
	  "snapshot": { "timeSeconds": 0.45 }
	})json";

	EXPECT_THROW(
		static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
		std::runtime_error);
}

	TEST(PlasmaPhysicsPayload, RejectsMissingViewBoundsMinX) {
		const auto malformed = R"json({
		  "scenario": {
		    "id": "plasma-oscillation",
		    "name": "Plasma Oscillation",
		    "summary": "Follow a density perturbation, collective restoring field, and plasma-frequency estimate in a starter plasma slice.",
		    "equationSummary": "omega_p ~ sqrt(n_e), E_restore ~ delta n * T_e",
		    "status": "Starter collective slice",
		    "durationSeconds": 1,
		    "viewBounds": { "maxX": 1, "minY": 0, "maxY": 1 },
		    "focusArea": "Density-driven collective oscillation, restoring-field strength, and frequency intuition in one shared view.",
		    "electronDensityPerCubicMeter": 3.2e18,
		    "electronTemperatureElectronVolts": 6.0,
		    "perturbationAmplitudePercent": 12.0
		  },
		  "snapshot": { "timeSeconds": 0.35 }
		})json";

		EXPECT_THROW(
			static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
			std::runtime_error);
	}

	TEST(PlasmaPhysicsPayload, RejectsMissingViewBoundsMaxX) {
		const auto malformed = R"json({
		  "scenario": {
		    "id": "plasma-oscillation",
		    "name": "Plasma Oscillation",
		    "summary": "Follow a density perturbation, collective restoring field, and plasma-frequency estimate in a starter plasma slice.",
		    "equationSummary": "omega_p ~ sqrt(n_e), E_restore ~ delta n * T_e",
		    "status": "Starter collective slice",
		    "durationSeconds": 1,
		    "viewBounds": { "minX": 0, "minY": 0, "maxY": 1 },
		    "focusArea": "Density-driven collective oscillation, restoring-field strength, and frequency intuition in one shared view.",
		    "electronDensityPerCubicMeter": 3.2e18,
		    "electronTemperatureElectronVolts": 6.0,
		    "perturbationAmplitudePercent": 12.0
		  },
		  "snapshot": { "timeSeconds": 0.35 }
		})json";

		EXPECT_THROW(
			static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
			std::runtime_error);
	}

	TEST(PlasmaPhysicsPayload, RejectsMissingViewBoundsMinY) {
		const auto malformed = R"json({
		  "scenario": {
		    "id": "plasma-oscillation",
		    "name": "Plasma Oscillation",
		    "summary": "Follow a density perturbation, collective restoring field, and plasma-frequency estimate in a starter plasma slice.",
		    "equationSummary": "omega_p ~ sqrt(n_e), E_restore ~ delta n * T_e",
		    "status": "Starter collective slice",
		    "durationSeconds": 1,
		    "viewBounds": { "minX": 0, "maxX": 1, "maxY": 1 },
		    "focusArea": "Density-driven collective oscillation, restoring-field strength, and frequency intuition in one shared view.",
		    "electronDensityPerCubicMeter": 3.2e18,
		    "electronTemperatureElectronVolts": 6.0,
		    "perturbationAmplitudePercent": 12.0
		  },
		  "snapshot": { "timeSeconds": 0.35 }
		})json";

		EXPECT_THROW(
			static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
			std::runtime_error);
	}

	TEST(PlasmaPhysicsPayload, RejectsMissingViewBoundsMaxY) {
		const auto malformed = R"json({
		  "scenario": {
		    "id": "plasma-oscillation",
		    "name": "Plasma Oscillation",
		    "summary": "Follow a density perturbation, collective restoring field, and plasma-frequency estimate in a starter plasma slice.",
		    "equationSummary": "omega_p ~ sqrt(n_e), E_restore ~ delta n * T_e",
		    "status": "Starter collective slice",
		    "durationSeconds": 1,
		    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0 },
		    "focusArea": "Density-driven collective oscillation, restoring-field strength, and frequency intuition in one shared view.",
		    "electronDensityPerCubicMeter": 3.2e18,
		    "electronTemperatureElectronVolts": 6.0,
		    "perturbationAmplitudePercent": 12.0
		  },
		  "snapshot": { "timeSeconds": 0.35 }
		})json";

		EXPECT_THROW(
			static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
			std::runtime_error);
	}

	TEST(PlasmaPhysicsPayload, RejectsMissingOverlayField) {
		const auto malformed = R"json({
		  "scenario": {
		    "id": "debye-screening",
		    "name": "Debye Screening",
		    "summary": "Inspect shielding length, screened potential, and charge screening strength around a probe in a plasma.",
		    "equationSummary": "lambda_D ~ sqrt(T_e / n_e), phi(r) ~ phi0 exp(-r / lambda_D)",
		    "status": "Starter shielding slice",
		    "durationSeconds": 1,
		    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 1 },
		    "focusArea": "Debye length intuition, screened-potential rolloff, and shielding fraction around an inserted probe.",
		    "electronDensityPerCubicMeter": 1.8e18,
		    "electronTemperatureElectronVolts": 9.0,
		    "probePotentialVolts": 18.0
		  },
		  "snapshot": { "timeSeconds": 0.45 },
		  "overlays": {
		    "showReferenceGuides": true,
		    "showActiveMarker": false
		  }
		})json";

		EXPECT_THROW(
			static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
			std::runtime_error);
	}

	TEST(PlasmaPhysicsPayload, RejectsMissingOverlayReferenceGuidesField) {
		const auto malformed = R"json({
		  "scenario": {
		    "id": "debye-screening",
		    "name": "Debye Screening",
		    "summary": "Inspect shielding length, screened potential, and charge screening strength around a probe in a plasma.",
		    "equationSummary": "lambda_D ~ sqrt(T_e / n_e), phi(r) ~ phi0 exp(-r / lambda_D)",
		    "status": "Starter shielding slice",
		    "durationSeconds": 1,
		    "viewBounds": { "minX": 0, "maxX": 1, "minY": 0, "maxY": 1 },
		    "focusArea": "Debye length intuition, screened-potential rolloff, and shielding fraction around an inserted probe.",
		    "electronDensityPerCubicMeter": 1.8e18,
		    "electronTemperatureElectronVolts": 9.0,
		    "probePotentialVolts": 18.0
		  },
		  "snapshot": { "timeSeconds": 0.45 },
		  "overlays": {
		    "showActiveMarker": false,
		    "showComparisonBand": true
		  }
		})json";

		EXPECT_THROW(
			static_cast<void>(visual_physics::plasma_physics::parse_import_payload(malformed)),
			std::runtime_error);
	}

TEST(PlasmaPhysicsPayload, RejectsMissingScenarioField) {
	EXPECT_THROW(
		static_cast<void>(visual_physics::plasma_physics::parse_import_payload(R"json({
			"snapshot": { "timeSeconds": 0.35 }
		})json")),
		std::runtime_error);
}

TEST(PlasmaPhysicsReport, BuildsSummaryFirstCsv) {
	const auto scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::PlasmaOscillation);
	const auto snapshot = visual_physics::plasma_physics::sample_scenario(scenario, 0.35);
	const auto samples = visual_physics::plasma_physics::build_samples(scenario);
	const auto csv = visual_physics::plasma_physics::build_report_csv(scenario, snapshot, samples);

	EXPECT_NE(csv.find("category,metric,label,value,detail"), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"snapshot_time_s\""), std::string::npos);
	EXPECT_NE(csv.find("\"summary\",\"plasma_frequency_ghz\""), std::string::npos);
	EXPECT_NE(csv.find("sampleLabel,position,primaryValue,secondaryValue,active"), std::string::npos);
	EXPECT_NE(csv.find("\"report_stats\",\"sample_count\",\"24\""), std::string::npos);
}

TEST(PlasmaPhysicsReport, BuildsScenarioSpecificSummaryRows) {
	const auto screening_scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::DebyeScreening);
	const auto screening_snapshot =
		visual_physics::plasma_physics::sample_scenario(screening_scenario, 0.45);
	const auto screening_rows = visual_physics::plasma_physics::build_report_summary_rows(
		screening_scenario,
		screening_snapshot);
	ASSERT_EQ(screening_rows.size(), 3U);
	EXPECT_EQ(screening_rows[1].metric, "debye_length_mm");
	EXPECT_EQ(screening_rows[2].metric, "shielding_fraction");

	const auto confinement_scenario = visual_physics::plasma_physics::make_default_scenario(
		visual_physics::plasma_physics::ScenarioId::MagneticConfinement);
	const auto confinement_snapshot =
		visual_physics::plasma_physics::sample_scenario(confinement_scenario, 0.55);
	const auto confinement_rows = visual_physics::plasma_physics::build_report_summary_rows(
		confinement_scenario,
		confinement_snapshot);
	ASSERT_EQ(confinement_rows.size(), 3U);
	EXPECT_EQ(confinement_rows[1].metric, "larmor_radius_mm");
	EXPECT_EQ(confinement_rows[2].metric, "safety_factor");
}
