#include "optics_report.hpp"

#include <iomanip>
#include <sstream>

namespace visual_physics::optics {
namespace {

std::string escape_csv(const std::string& value) {
	std::string escaped = "\"";
	for (const auto character : value) {
		escaped.push_back(character);
		if (character == '"') {
			escaped.push_back('"');
		}
	}
	escaped.push_back('"');
	return escaped;
}

}  // namespace

std::string build_report_csv(
	const Scenario& scenario,
	const Snapshot& snapshot,
	const std::vector<Sample>& samples) {
	std::ostringstream output;
	output << std::fixed << std::setprecision(6);
	output << "category,metric,label,value,detail\n";
	if (scenario.id == ScenarioId::SnellRefraction) {
		output << "summary,incident_angle_deg,\"Incident angle\"," << snapshot.incident_angle_degrees.value_or(0.0) << ",\"Incident ray angle measured from the interface normal.\"\n";
		output << "summary,refracted_angle_deg,\"Refracted angle\",";
		if (snapshot.total_internal_reflection.value_or(false)) {
			output << "NaN";
		} else {
			output << snapshot.refracted_angle_degrees.value_or(0.0);
		}
		output << ",\"Transmitted ray angle from Snell's law for the active medium pair.\"\n";
		output << "summary,critical_angle_deg,\"Critical angle\",";
		if (snapshot.critical_angle_degrees.has_value()) {
			output << snapshot.critical_angle_degrees.value();
		} else {
			output << "NaN";
		}
		output << ",\"Threshold incident angle beyond which total internal reflection begins.\"\n";
		output << "summary,total_internal_reflection,\"Total internal reflection\","
		       << (snapshot.total_internal_reflection.value_or(false) ? "true" : "false")
		       << ",\"Flags whether the transmitted ray exists for the current medium pair.\"\n";
	} else if (scenario.id == ScenarioId::ThinLensImaging) {
		output << "summary,focal_length_cm,\"Focal length\"," << snapshot.focal_length_centimeters.value_or(0.0) << ",\"Converging lens focal length used in the thin-lens equation.\"\n";
		output << "summary,image_distance_cm,\"Image distance\"," << snapshot.image_distance_centimeters.value_or(0.0) << ",\"Solved image position relative to the lens center.\"\n";
		output << "summary,magnification,\"Magnification\"," << snapshot.magnification.value_or(0.0) << ",\"Signed image-to-object size ratio from the thin-lens model.\"\n";
		output << "summary,real_image,\"Real image\"," << (snapshot.real_image.value_or(false) ? "true" : "false") << ",\"Flags whether the image forms on the outgoing side of the lens.\"\n";
	} else {
		output << "summary,slit_width_um,\"Slit width\"," << snapshot.slit_width_micrometers.value_or(0.0) << ",\"Single-slit aperture width driving the diffraction envelope.\"\n";
		output << "summary,wavelength_nm,\"Wavelength\"," << snapshot.wavelength_nanometers.value_or(0.0) << ",\"Monochromatic source wavelength used for the diffraction estimate.\"\n";
		output << "summary,first_minimum_offset_mm,\"First minimum offset\"," << snapshot.first_minimum_offset_millimeters.value_or(0.0) << ",\"Screen-plane offset to the first dark fringe from the optical axis.\"\n";
		output << "summary,central_maximum_width_mm,\"Central maximum width\"," << snapshot.central_maximum_width_millimeters.value_or(0.0) << ",\"Full width of the central bright diffraction lobe.\"\n";
	}
	output << '\n';
	output << "sample_ray,sample_start_x,sample_start_y,sample_end_x,sample_end_y,sample_angle_deg,active\n";
	for (const auto& sample : samples) {
		output << escape_csv(sample.ray_label) << ','
		       << sample.start_x << ','
		       << sample.start_y << ','
		       << sample.end_x << ','
		       << sample.end_y << ','
		       << sample.angle_degrees << ','
		       << (sample.active ? "true" : "false") << '\n';
	}
	return output.str();
}

}  // namespace visual_physics::optics