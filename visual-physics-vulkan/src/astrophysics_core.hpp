#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace visual_physics::astrophysics {

struct ViewBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

enum class ScenarioId {
	PlanetaryOrbit,
	StellarLuminosity,
	HubbleExpansion,
};

struct Scenario {
	ScenarioId id;
	std::string name;
	std::string summary;
	std::string equation_summary;
	std::string status;
	double duration_seconds;
	ViewBounds view_bounds;
	std::string focus_area;
	std::optional<double> central_mass_solar_masses;
	std::optional<double> orbital_radius_astronomical_units;
	std::optional<double> orbital_eccentricity;
	std::optional<double> stellar_mass_solar_masses;
	std::optional<double> stellar_radius_solar_radii;
	std::optional<double> surface_temperature_kelvin;
	std::optional<double> distance_megaparsecs;
	std::optional<double> hubble_constant_kilometers_per_second_per_megaparsec;
};

struct Snapshot {
	double time_seconds;
	std::optional<double> central_mass_solar_masses;
	std::optional<double> orbital_radius_astronomical_units;
	std::optional<double> orbital_eccentricity;
	std::optional<double> orbital_period_days;
	std::optional<double> orbital_speed_kilometers_per_second;
	std::optional<double> escape_speed_kilometers_per_second;
	std::optional<double> specific_orbital_energy_megajoules_per_kilogram;
	std::optional<double> stellar_mass_solar_masses;
	std::optional<double> stellar_radius_solar_radii;
	std::optional<double> surface_temperature_kelvin;
	std::optional<double> luminosity_solar_units;
	std::optional<double> habitable_zone_inner_astronomical_units;
	std::optional<double> habitable_zone_outer_astronomical_units;
	std::optional<double> distance_megaparsecs;
	std::optional<double> hubble_constant_kilometers_per_second_per_megaparsec;
	std::optional<double> recession_velocity_kilometers_per_second;
	std::optional<double> light_travel_time_billion_years;
	std::optional<double> redshift;
	bool stable;
};

struct Sample {
	double position;
	double primary_value;
	std::optional<double> secondary_value;
	std::string label;
	bool active;
};

std::string_view to_string(ScenarioId id);
std::optional<ScenarioId> parse_scenario_id(std::string_view value);
Scenario make_default_scenario(ScenarioId id);
Snapshot sample_scenario(const Scenario& scenario, double time_seconds);
std::vector<Sample> build_samples_at_time(
	const Scenario& scenario,
	double time_seconds,
	std::size_t sample_count = 48);
std::vector<Sample> build_samples(const Scenario& scenario, std::size_t sample_count = 48);

}  // namespace visual_physics::astrophysics