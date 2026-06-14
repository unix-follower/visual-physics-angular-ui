cmake_minimum_required(VERSION 4.3.3)

project(visual_physics_vulkan VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(Vulkan REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)

if(NOT Vulkan_GLSLC_EXECUTABLE)
	message(FATAL_ERROR "glslc is required to compile Vulkan shaders")
endif()

set(SHADER_SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/shaders)
set(SHADER_OUTPUT_DIR ${CMAKE_CURRENT_BINARY_DIR}/shaders)

set(VERTEX_SHADER_SOURCE ${SHADER_SOURCE_DIR}/kinematics_line.vert)
set(FRAGMENT_SHADER_SOURCE ${SHADER_SOURCE_DIR}/kinematics_line.frag)
set(VERTEX_SHADER_BINARY ${SHADER_OUTPUT_DIR}/kinematics_line.vert.spv)
set(FRAGMENT_SHADER_BINARY ${SHADER_OUTPUT_DIR}/kinematics_line.frag.spv)

add_custom_command(
	OUTPUT ${VERTEX_SHADER_BINARY}
	COMMAND ${CMAKE_COMMAND} -E make_directory ${SHADER_OUTPUT_DIR}
	COMMAND ${Vulkan_GLSLC_EXECUTABLE} --target-env=vulkan1.0 -fshader-stage=vert ${VERTEX_SHADER_SOURCE} -o ${VERTEX_SHADER_BINARY}
	DEPENDS ${VERTEX_SHADER_SOURCE}
	VERBATIM
)

add_custom_command(
	OUTPUT ${FRAGMENT_SHADER_BINARY}
	COMMAND ${CMAKE_COMMAND} -E make_directory ${SHADER_OUTPUT_DIR}
	COMMAND ${Vulkan_GLSLC_EXECUTABLE} --target-env=vulkan1.0 -fshader-stage=frag ${FRAGMENT_SHADER_SOURCE} -o ${FRAGMENT_SHADER_BINARY}
	DEPENDS ${FRAGMENT_SHADER_SOURCE}
	VERBATIM
)

add_custom_target(
	visual_physics_vulkan_shaders
	DEPENDS ${VERTEX_SHADER_BINARY} ${FRAGMENT_SHADER_BINARY}
)

add_library(
	visual_physics_vulkan_core
	src/plasma_physics_core.cpp
	src/plasma_physics_payload.cpp
	src/plasma_physics_report.cpp
	src/nuclear_and_particle_physics_core.cpp
	src/nuclear_and_particle_physics_payload.cpp
	src/nuclear_and_particle_physics_report.cpp
	src/solid_state_core.cpp
	src/solid_state_payload.cpp
	src/solid_state_report.cpp
	src/atmospheric_core.cpp
	src/atmospheric_payload.cpp
	src/atmospheric_report.cpp
	src/astrophysics_core.cpp
	src/astrophysics_payload.cpp
	src/astrophysics_report.cpp
	src/computational_physics_core.cpp
	src/computational_physics_overlay.cpp
	src/computational_physics_payload.cpp
	src/computational_physics_report.cpp
	src/dynamics_core.cpp
	src/dynamics_payload.cpp
	src/fluid_mechanics_core.cpp
	src/fluid_mechanics_overlay.cpp
	src/fluid_mechanics_payload.cpp
	src/fluid_mechanics_report.cpp
	src/optics_core.cpp
	src/optics_overlay.cpp
	src/optics_payload.cpp
	src/optics_report.cpp
	src/thermodynamics_core.cpp
	src/thermodynamics_overlay.cpp
	src/thermodynamics_payload.cpp
	src/thermodynamics_report.cpp
	src/electronics_core.cpp
	src/electronics_overlay.cpp
	src/electronics_payload.cpp
	src/electronics_report.cpp
	src/electromagnetism_core.cpp
	src/electromagnetism_overlay.cpp
	src/electromagnetism_payload.cpp
	src/kinematics_core.cpp
	src/kinematics_payload.cpp
	src/quantum_core.cpp
	src/quantum_overlay.cpp
	src/quantum_payload.cpp
	src/quantum_report.cpp
	src/relativity_core.cpp
	src/relativity_payload.cpp
	src/relativity_report.cpp
	src/waves_core.cpp
	src/waves_payload.cpp
	src/waves_report.cpp
	src/statics_core.cpp
	src/statics_overlay.cpp
	src/statics_payload.cpp
)
target_include_directories(visual_physics_vulkan_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_link_libraries(visual_physics_vulkan_core PUBLIC nlohmann_json::nlohmann_json)

add_executable(visual_physics_vulkan src/visual_physics_vulkan.cpp)
set_target_properties(visual_physics_vulkan PROPERTIES OUTPUT_NAME visual_physics_vulkan)
add_dependencies(visual_physics_vulkan visual_physics_vulkan_shaders)
target_compile_definitions(
	visual_physics_vulkan
	PRIVATE VISUAL_PHYSICS_VULKAN_SHADER_DIR="${SHADER_OUTPUT_DIR}"
)

target_link_libraries(
	visual_physics_vulkan
	PRIVATE visual_physics_vulkan_core Vulkan::Vulkan
)

enable_testing()
find_package(GTest CONFIG REQUIRED)

add_executable(tests test/visual_physics_vulkan_test.cpp)
target_compile_definitions(
	tests
	PRIVATE VISUAL_PHYSICS_VULKAN_TEST_EXE="$<TARGET_FILE:visual_physics_vulkan>"
)
target_link_libraries(
	tests
	PRIVATE visual_physics_vulkan_core GTest::gtest GTest::gtest_main
)

include(GoogleTest)
gtest_discover_tests(tests DISCOVERY_TIMEOUT 30)
