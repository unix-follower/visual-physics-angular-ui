#include <array>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <cstring>
#include <cstdlib>
#include <ctime>
#include <cmath>
#include <limits>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string_view>
#include <vector>

#include <vulkan/vulkan.h>

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
#include "computational_physics_overlay.hpp"
#include "computational_physics_payload.hpp"
#include "computational_physics_report.hpp"
#include "fluid_mechanics_core.hpp"
#include "fluid_mechanics_overlay.hpp"
#include "fluid_mechanics_payload.hpp"
#include "optics_core.hpp"
#include "optics_overlay.hpp"
#include "optics_payload.hpp"
#include "plasma_physics_core.hpp"
#include "plasma_physics_payload.hpp"
#include "plasma_physics_report.hpp"
#include "quantum_core.hpp"
#include "quantum_overlay.hpp"
#include "quantum_payload.hpp"
#include "quantum_report.hpp"
#include "relativity_core.hpp"
#include "relativity_payload.hpp"
#include "relativity_report.hpp"
#include "solid_state_core.hpp"
#include "solid_state_payload.hpp"
#include "solid_state_report.hpp"
#include "thermodynamics_core.hpp"
#include "thermodynamics_overlay.hpp"
#include "thermodynamics_payload.hpp"
#include "waves_core.hpp"
#include "waves_payload.hpp"
#include "waves_report.hpp"
#include "electronics_core.hpp"
#include "electronics_overlay.hpp"
#include "electronics_payload.hpp"
#include "electromagnetism_core.hpp"
#include "electromagnetism_overlay.hpp"
#include "electromagnetism_payload.hpp"
#include "kinematics_core.hpp"
#include "kinematics_payload.hpp"
#include "statics_core.hpp"
#include "statics_overlay.hpp"
#include "statics_payload.hpp"

namespace {

constexpr double kPi = 3.14159265358979323846;

constexpr std::string_view kPortabilitySubsetExtensionName =
	"VK_KHR_portability_subset";
constexpr VkFormat kOffscreenColorFormat = VK_FORMAT_R8G8B8A8_UNORM;
constexpr uint32_t kDefaultOffscreenWidth = 960;
constexpr uint32_t kDefaultOffscreenHeight = 540;
constexpr std::size_t kDefaultSampleCount = 48;

struct RenderConfig {
	uint32_t width = kDefaultOffscreenWidth;
	uint32_t height = kDefaultOffscreenHeight;
	std::size_t sample_count = kDefaultSampleCount;
};

struct RenderVertex {
	float x;
	float y;
	float r;
	float g;
	float b;
	float a;
};

struct PhysicalDeviceSelection {
	VkPhysicalDevice physical_device = VK_NULL_HANDLE;
	uint32_t graphics_queue_family_index = 0;
	VkPhysicalDeviceProperties properties{};
};

class VulkanInstance {
public:
	explicit VulkanInstance(VkInstance instance) : instance_(instance) {}

	VulkanInstance(const VulkanInstance&) = delete;
	VulkanInstance& operator=(const VulkanInstance&) = delete;

	VulkanInstance(VulkanInstance&& other) noexcept : instance_(other.instance_) {
		other.instance_ = VK_NULL_HANDLE;
	}

	VulkanInstance& operator=(VulkanInstance&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		instance_ = other.instance_;
		other.instance_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanInstance() {
		reset();
	}

	[[nodiscard]] VkInstance get() const {
		return instance_;
	}

private:
	void reset() {
		if (instance_ != VK_NULL_HANDLE) {
			vkDestroyInstance(instance_, nullptr);
			instance_ = VK_NULL_HANDLE;
		}
	}

	VkInstance instance_ = VK_NULL_HANDLE;
};

class VulkanDevice {
public:
	explicit VulkanDevice(VkDevice device) : device_(device) {}

	VulkanDevice(const VulkanDevice&) = delete;
	VulkanDevice& operator=(const VulkanDevice&) = delete;

	VulkanDevice(VulkanDevice&& other) noexcept : device_(other.device_) {
		other.device_ = VK_NULL_HANDLE;
	}

	VulkanDevice& operator=(VulkanDevice&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		other.device_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanDevice() {
		reset();
	}

	[[nodiscard]] VkDevice get() const {
		return device_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE) {
			vkDestroyDevice(device_, nullptr);
			device_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
};

class VulkanCommandPool {
public:
	VulkanCommandPool(VkDevice device, VkCommandPool command_pool)
		: device_(device), command_pool_(command_pool) {}

	VulkanCommandPool(const VulkanCommandPool&) = delete;
	VulkanCommandPool& operator=(const VulkanCommandPool&) = delete;

	VulkanCommandPool(VulkanCommandPool&& other) noexcept
		: device_(other.device_), command_pool_(other.command_pool_) {
		other.command_pool_ = VK_NULL_HANDLE;
	}

	VulkanCommandPool& operator=(VulkanCommandPool&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		command_pool_ = other.command_pool_;
		other.command_pool_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanCommandPool() {
		reset();
	}

	[[nodiscard]] VkCommandPool get() const {
		return command_pool_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && command_pool_ != VK_NULL_HANDLE) {
			vkDestroyCommandPool(device_, command_pool_, nullptr);
			command_pool_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkCommandPool command_pool_ = VK_NULL_HANDLE;
};

class VulkanBuffer {
public:
	VulkanBuffer(VkDevice device, VkBuffer buffer, VkDeviceMemory memory)
		: device_(device), buffer_(buffer), memory_(memory) {}

	VulkanBuffer(const VulkanBuffer&) = delete;
	VulkanBuffer& operator=(const VulkanBuffer&) = delete;

	VulkanBuffer(VulkanBuffer&& other) noexcept
		: device_(other.device_), buffer_(other.buffer_), memory_(other.memory_) {
		other.buffer_ = VK_NULL_HANDLE;
		other.memory_ = VK_NULL_HANDLE;
	}

	VulkanBuffer& operator=(VulkanBuffer&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		buffer_ = other.buffer_;
		memory_ = other.memory_;
		other.buffer_ = VK_NULL_HANDLE;
		other.memory_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanBuffer() {
		reset();
	}

	[[nodiscard]] VkBuffer get() const {
		return buffer_;
	}

	[[nodiscard]] VkDeviceMemory memory() const {
		return memory_;
	}

	[[nodiscard]] VkDevice device() const {
		return device_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && buffer_ != VK_NULL_HANDLE) {
			vkDestroyBuffer(device_, buffer_, nullptr);
			buffer_ = VK_NULL_HANDLE;
		}

		if (device_ != VK_NULL_HANDLE && memory_ != VK_NULL_HANDLE) {
			vkFreeMemory(device_, memory_, nullptr);
			memory_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkBuffer buffer_ = VK_NULL_HANDLE;
	VkDeviceMemory memory_ = VK_NULL_HANDLE;
};

class VulkanShaderModule {
public:
	VulkanShaderModule(VkDevice device, VkShaderModule shader_module)
		: device_(device), shader_module_(shader_module) {}

	VulkanShaderModule(const VulkanShaderModule&) = delete;
	VulkanShaderModule& operator=(const VulkanShaderModule&) = delete;

	VulkanShaderModule(VulkanShaderModule&& other) noexcept
		: device_(other.device_), shader_module_(other.shader_module_) {
		other.shader_module_ = VK_NULL_HANDLE;
	}

	VulkanShaderModule& operator=(VulkanShaderModule&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		shader_module_ = other.shader_module_;
		other.shader_module_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanShaderModule() {
		reset();
	}

	[[nodiscard]] VkShaderModule get() const {
		return shader_module_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && shader_module_ != VK_NULL_HANDLE) {
			vkDestroyShaderModule(device_, shader_module_, nullptr);
			shader_module_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkShaderModule shader_module_ = VK_NULL_HANDLE;
};

class VulkanRenderPass {
public:
	VulkanRenderPass(VkDevice device, VkRenderPass render_pass)
		: device_(device), render_pass_(render_pass) {}

	VulkanRenderPass(const VulkanRenderPass&) = delete;
	VulkanRenderPass& operator=(const VulkanRenderPass&) = delete;

	VulkanRenderPass(VulkanRenderPass&& other) noexcept
		: device_(other.device_), render_pass_(other.render_pass_) {
		other.render_pass_ = VK_NULL_HANDLE;
	}

	VulkanRenderPass& operator=(VulkanRenderPass&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		render_pass_ = other.render_pass_;
		other.render_pass_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanRenderPass() {
		reset();
	}

	[[nodiscard]] VkRenderPass get() const {
		return render_pass_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && render_pass_ != VK_NULL_HANDLE) {
			vkDestroyRenderPass(device_, render_pass_, nullptr);
			render_pass_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkRenderPass render_pass_ = VK_NULL_HANDLE;
};

class VulkanPipelineLayout {
public:
	VulkanPipelineLayout(VkDevice device, VkPipelineLayout pipeline_layout)
		: device_(device), pipeline_layout_(pipeline_layout) {}

	VulkanPipelineLayout(const VulkanPipelineLayout&) = delete;
	VulkanPipelineLayout& operator=(const VulkanPipelineLayout&) = delete;

	VulkanPipelineLayout(VulkanPipelineLayout&& other) noexcept
		: device_(other.device_), pipeline_layout_(other.pipeline_layout_) {
		other.pipeline_layout_ = VK_NULL_HANDLE;
	}

	VulkanPipelineLayout& operator=(VulkanPipelineLayout&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		pipeline_layout_ = other.pipeline_layout_;
		other.pipeline_layout_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanPipelineLayout() {
		reset();
	}

	[[nodiscard]] VkPipelineLayout get() const {
		return pipeline_layout_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && pipeline_layout_ != VK_NULL_HANDLE) {
			vkDestroyPipelineLayout(device_, pipeline_layout_, nullptr);
			pipeline_layout_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkPipelineLayout pipeline_layout_ = VK_NULL_HANDLE;
};

class VulkanPipeline {
public:
	VulkanPipeline(VkDevice device, VkPipeline pipeline)
		: device_(device), pipeline_(pipeline) {}

	VulkanPipeline(const VulkanPipeline&) = delete;
	VulkanPipeline& operator=(const VulkanPipeline&) = delete;

	VulkanPipeline(VulkanPipeline&& other) noexcept
		: device_(other.device_), pipeline_(other.pipeline_) {
		other.pipeline_ = VK_NULL_HANDLE;
	}

	VulkanPipeline& operator=(VulkanPipeline&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		pipeline_ = other.pipeline_;
		other.pipeline_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanPipeline() {
		reset();
	}

	[[nodiscard]] VkPipeline get() const {
		return pipeline_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && pipeline_ != VK_NULL_HANDLE) {
			vkDestroyPipeline(device_, pipeline_, nullptr);
			pipeline_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkPipeline pipeline_ = VK_NULL_HANDLE;
};

class VulkanImage {
public:
	VulkanImage(VkDevice device, VkImage image, VkDeviceMemory memory)
		: device_(device), image_(image), memory_(memory) {}

	VulkanImage(const VulkanImage&) = delete;
	VulkanImage& operator=(const VulkanImage&) = delete;

	VulkanImage(VulkanImage&& other) noexcept
		: device_(other.device_), image_(other.image_), memory_(other.memory_) {
		other.image_ = VK_NULL_HANDLE;
		other.memory_ = VK_NULL_HANDLE;
	}

	VulkanImage& operator=(VulkanImage&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		image_ = other.image_;
		memory_ = other.memory_;
		other.image_ = VK_NULL_HANDLE;
		other.memory_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanImage() {
		reset();
	}

	[[nodiscard]] VkImage get() const {
		return image_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && image_ != VK_NULL_HANDLE) {
			vkDestroyImage(device_, image_, nullptr);
			image_ = VK_NULL_HANDLE;
		}

		if (device_ != VK_NULL_HANDLE && memory_ != VK_NULL_HANDLE) {
			vkFreeMemory(device_, memory_, nullptr);
			memory_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkImage image_ = VK_NULL_HANDLE;
	VkDeviceMemory memory_ = VK_NULL_HANDLE;
};

class VulkanImageView {
public:
	VulkanImageView(VkDevice device, VkImageView image_view)
		: device_(device), image_view_(image_view) {}

	VulkanImageView(const VulkanImageView&) = delete;
	VulkanImageView& operator=(const VulkanImageView&) = delete;

	VulkanImageView(VulkanImageView&& other) noexcept
		: device_(other.device_), image_view_(other.image_view_) {
		other.image_view_ = VK_NULL_HANDLE;
	}

	VulkanImageView& operator=(VulkanImageView&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		image_view_ = other.image_view_;
		other.image_view_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanImageView() {
		reset();
	}

	[[nodiscard]] VkImageView get() const {
		return image_view_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && image_view_ != VK_NULL_HANDLE) {
			vkDestroyImageView(device_, image_view_, nullptr);
			image_view_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkImageView image_view_ = VK_NULL_HANDLE;
};

class VulkanFramebuffer {
public:
	VulkanFramebuffer(VkDevice device, VkFramebuffer framebuffer)
		: device_(device), framebuffer_(framebuffer) {}

	VulkanFramebuffer(const VulkanFramebuffer&) = delete;
	VulkanFramebuffer& operator=(const VulkanFramebuffer&) = delete;

	VulkanFramebuffer(VulkanFramebuffer&& other) noexcept
		: device_(other.device_), framebuffer_(other.framebuffer_) {
		other.framebuffer_ = VK_NULL_HANDLE;
	}

	VulkanFramebuffer& operator=(VulkanFramebuffer&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		framebuffer_ = other.framebuffer_;
		other.framebuffer_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanFramebuffer() {
		reset();
	}

	[[nodiscard]] VkFramebuffer get() const {
		return framebuffer_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && framebuffer_ != VK_NULL_HANDLE) {
			vkDestroyFramebuffer(device_, framebuffer_, nullptr);
			framebuffer_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkFramebuffer framebuffer_ = VK_NULL_HANDLE;
};

class VulkanFence {
public:
	VulkanFence(VkDevice device, VkFence fence) : device_(device), fence_(fence) {}

	VulkanFence(const VulkanFence&) = delete;
	VulkanFence& operator=(const VulkanFence&) = delete;

	VulkanFence(VulkanFence&& other) noexcept : device_(other.device_), fence_(other.fence_) {
		other.fence_ = VK_NULL_HANDLE;
	}

	VulkanFence& operator=(VulkanFence&& other) noexcept {
		if (this == &other) {
			return *this;
		}

		reset();
		device_ = other.device_;
		fence_ = other.fence_;
		other.fence_ = VK_NULL_HANDLE;
		return *this;
	}

	~VulkanFence() {
		reset();
	}

	[[nodiscard]] VkFence get() const {
		return fence_;
	}

private:
	void reset() {
		if (device_ != VK_NULL_HANDLE && fence_ != VK_NULL_HANDLE) {
			vkDestroyFence(device_, fence_, nullptr);
			fence_ = VK_NULL_HANDLE;
		}
	}

	VkDevice device_ = VK_NULL_HANDLE;
	VkFence fence_ = VK_NULL_HANDLE;
};

VulkanInstance create_instance() {
	const std::vector<const char*> instance_extensions{
		VK_KHR_PORTABILITY_ENUMERATION_EXTENSION_NAME,
	};

	const VkApplicationInfo application_info{
		.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO,
		.pNext = nullptr,
		.pApplicationName = "visual_physics_vulkan",
		.applicationVersion = VK_MAKE_API_VERSION(0, 0, 1, 0),
		.pEngineName = "visual_physics_phase2",
		.engineVersion = VK_MAKE_API_VERSION(0, 0, 1, 0),
		.apiVersion = VK_API_VERSION_1_0,
	};

	const VkInstanceCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
		.pNext = nullptr,
		.flags = VK_INSTANCE_CREATE_ENUMERATE_PORTABILITY_BIT_KHR,
		.pApplicationInfo = &application_info,
		.enabledLayerCount = 0,
		.ppEnabledLayerNames = nullptr,
		.enabledExtensionCount =
			static_cast<uint32_t>(instance_extensions.size()),
		.ppEnabledExtensionNames = instance_extensions.data(),
	};

	VkInstance instance = VK_NULL_HANDLE;
	const VkResult result = vkCreateInstance(&create_info, nullptr, &instance);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan instance");
	}

	return VulkanInstance(instance);
}

std::optional<uint32_t> find_graphics_queue_family(VkPhysicalDevice physical_device) {
	uint32_t queue_family_count = 0;
	vkGetPhysicalDeviceQueueFamilyProperties(physical_device, &queue_family_count, nullptr);

	std::vector<VkQueueFamilyProperties> queue_families(queue_family_count);
	vkGetPhysicalDeviceQueueFamilyProperties(
		physical_device,
		&queue_family_count,
		queue_families.data());

	for (uint32_t index = 0; index < queue_family_count; ++index) {
		if ((queue_families[index].queueFlags & VK_QUEUE_GRAPHICS_BIT) != 0) {
			return index;
		}
	}

	return std::nullopt;
}

bool has_extension(VkPhysicalDevice physical_device, std::string_view extension_name) {
	uint32_t extension_count = 0;
	vkEnumerateDeviceExtensionProperties(
		physical_device,
		nullptr,
		&extension_count,
		nullptr);

	std::vector<VkExtensionProperties> extensions(extension_count);
	vkEnumerateDeviceExtensionProperties(
		physical_device,
		nullptr,
		&extension_count,
		extensions.data());

	for (const auto& extension : extensions) {
		if (extension_name == extension.extensionName) {
			return true;
		}
	}

	return false;
}

PhysicalDeviceSelection select_physical_device(VkInstance instance) {
	uint32_t physical_device_count = 0;
	vkEnumeratePhysicalDevices(instance, &physical_device_count, nullptr);
	if (physical_device_count == 0) {
		throw std::runtime_error("No Vulkan physical devices available");
	}

	std::vector<VkPhysicalDevice> physical_devices(physical_device_count);
	vkEnumeratePhysicalDevices(instance, &physical_device_count, physical_devices.data());

	std::optional<PhysicalDeviceSelection> fallback_selection;

	for (const auto physical_device : physical_devices) {
		const auto queue_family_index = find_graphics_queue_family(physical_device);
		if (!queue_family_index.has_value()) {
			continue;
		}

		PhysicalDeviceSelection selection;
		selection.physical_device = physical_device;
		selection.graphics_queue_family_index = *queue_family_index;
		vkGetPhysicalDeviceProperties(physical_device, &selection.properties);

		if (selection.properties.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU) {
			return selection;
		}

		if (!fallback_selection.has_value()) {
			fallback_selection = selection;
		}
	}

	if (!fallback_selection.has_value()) {
		throw std::runtime_error("No graphics-capable Vulkan physical device found");
	}

	return *fallback_selection;
}

VulkanDevice create_device(const PhysicalDeviceSelection& selection) {
	constexpr float queue_priority = 1.0F;
	const VkDeviceQueueCreateInfo queue_create_info{
		.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.queueFamilyIndex = selection.graphics_queue_family_index,
		.queueCount = 1,
		.pQueuePriorities = &queue_priority,
	};

	std::vector<const char*> device_extensions;
	if (has_extension(selection.physical_device, kPortabilitySubsetExtensionName)) {
		device_extensions.push_back(kPortabilitySubsetExtensionName.data());
	}

	const VkPhysicalDeviceFeatures enabled_features{};
	const VkDeviceCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.queueCreateInfoCount = 1,
		.pQueueCreateInfos = &queue_create_info,
		.enabledLayerCount = 0,
		.ppEnabledLayerNames = nullptr,
		.enabledExtensionCount = static_cast<uint32_t>(device_extensions.size()),
		.ppEnabledExtensionNames = device_extensions.empty() ? nullptr : device_extensions.data(),
		.pEnabledFeatures = &enabled_features,
	};

	VkDevice device = VK_NULL_HANDLE;
	const VkResult result = vkCreateDevice(selection.physical_device, &create_info, nullptr, &device);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan logical device");
	}

	return VulkanDevice(device);
}

VkQueue get_graphics_queue(VkDevice device, uint32_t queue_family_index) {
	VkQueue queue = VK_NULL_HANDLE;
	vkGetDeviceQueue(device, queue_family_index, 0, &queue);
	if (queue == VK_NULL_HANDLE) {
		throw std::runtime_error("Failed to retrieve Vulkan graphics queue");
	}

	return queue;
}

VulkanCommandPool create_command_pool(VkDevice device, uint32_t queue_family_index) {
	const VkCommandPoolCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
		.pNext = nullptr,
		.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
		.queueFamilyIndex = queue_family_index,
	};

	VkCommandPool command_pool = VK_NULL_HANDLE;
	const VkResult result = vkCreateCommandPool(device, &create_info, nullptr, &command_pool);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan command pool");
	}

	return VulkanCommandPool(device, command_pool);
}

VkCommandBuffer allocate_command_buffer(VkDevice device, VkCommandPool command_pool) {
	const VkCommandBufferAllocateInfo allocate_info{
		.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
		.pNext = nullptr,
		.commandPool = command_pool,
		.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
		.commandBufferCount = 1,
	};

	VkCommandBuffer command_buffer = VK_NULL_HANDLE;
	const VkResult allocation_result =
		vkAllocateCommandBuffers(device, &allocate_info, &command_buffer);
	if (allocation_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to allocate Vulkan command buffer");
	}

	return command_buffer;
}

std::string_view device_type_label(VkPhysicalDeviceType device_type) {
	switch (device_type) {
		case VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU:
			return "integrated";
		case VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU:
			return "discrete";
		case VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU:
			return "virtual";
		case VK_PHYSICAL_DEVICE_TYPE_CPU:
			return "cpu";
		default:
			return "other";
	}
}

uint32_t find_memory_type(
	VkPhysicalDevice physical_device,
	uint32_t type_filter,
	VkMemoryPropertyFlags required_properties) {
	VkPhysicalDeviceMemoryProperties memory_properties{};
	vkGetPhysicalDeviceMemoryProperties(physical_device, &memory_properties);

	for (uint32_t index = 0; index < memory_properties.memoryTypeCount; ++index) {
		const bool type_supported = (type_filter & (1U << index)) != 0;
		const bool properties_match =
			(memory_properties.memoryTypes[index].propertyFlags & required_properties) ==
			required_properties;

		if (type_supported && properties_match) {
			return index;
		}
	}

	throw std::runtime_error("Failed to find a suitable Vulkan memory type");
}

VulkanBuffer create_buffer(
	VkPhysicalDevice physical_device,
	VkDevice device,
	VkDeviceSize size_in_bytes,
	VkBufferUsageFlags usage,
	VkMemoryPropertyFlags memory_properties);

VulkanBuffer create_vertex_buffer(
	VkPhysicalDevice physical_device,
	VkDevice device,
	const void* data,
	VkDeviceSize size_in_bytes) {
	auto buffer = create_buffer(
		physical_device,
		device,
		size_in_bytes,
		VK_BUFFER_USAGE_VERTEX_BUFFER_BIT,
		VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT);

	void* mapped_memory = nullptr;
	const VkResult map_result =
		vkMapMemory(device, buffer.memory(), 0, size_in_bytes, 0, &mapped_memory);
	if (map_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to map Vulkan vertex buffer memory");
	}

	std::memcpy(mapped_memory, data, static_cast<std::size_t>(size_in_bytes));
	vkUnmapMemory(device, buffer.memory());

	return buffer;
}

VulkanBuffer create_buffer(
	VkPhysicalDevice physical_device,
	VkDevice device,
	VkDeviceSize size_in_bytes,
	VkBufferUsageFlags usage,
	VkMemoryPropertyFlags memory_properties) {
	const VkBufferCreateInfo buffer_create_info{
		.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.size = size_in_bytes,
		.usage = usage,
		.sharingMode = VK_SHARING_MODE_EXCLUSIVE,
		.queueFamilyIndexCount = 0,
		.pQueueFamilyIndices = nullptr,
	};

	VkBuffer buffer = VK_NULL_HANDLE;
	const VkResult buffer_result = vkCreateBuffer(device, &buffer_create_info, nullptr, &buffer);
	if (buffer_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan vertex buffer");
	}

	VkMemoryRequirements memory_requirements{};
	vkGetBufferMemoryRequirements(device, buffer, &memory_requirements);

	const VkMemoryAllocateInfo allocate_info{
		.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO,
		.pNext = nullptr,
		.allocationSize = memory_requirements.size,
		.memoryTypeIndex = find_memory_type(
			physical_device,
			memory_requirements.memoryTypeBits,
			memory_properties),
	};

	VkDeviceMemory memory = VK_NULL_HANDLE;
	const VkResult memory_result = vkAllocateMemory(device, &allocate_info, nullptr, &memory);
	if (memory_result != VK_SUCCESS) {
		vkDestroyBuffer(device, buffer, nullptr);
		throw std::runtime_error("Failed to allocate Vulkan vertex buffer memory");
	}

	const VkResult bind_result = vkBindBufferMemory(device, buffer, memory, 0);
	if (bind_result != VK_SUCCESS) {
		vkDestroyBuffer(device, buffer, nullptr);
		vkFreeMemory(device, memory, nullptr);
		throw std::runtime_error("Failed to bind Vulkan vertex buffer memory");
	}

	return VulkanBuffer(device, buffer, memory);
}

VulkanImage create_offscreen_image(
	VkPhysicalDevice physical_device,
	VkDevice device,
	uint32_t width,
	uint32_t height) {
	const VkImageCreateInfo image_create_info{
		.sType = VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.imageType = VK_IMAGE_TYPE_2D,
		.format = kOffscreenColorFormat,
		.extent = {width, height, 1},
		.mipLevels = 1,
		.arrayLayers = 1,
		.samples = VK_SAMPLE_COUNT_1_BIT,
		.tiling = VK_IMAGE_TILING_OPTIMAL,
		.usage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_TRANSFER_SRC_BIT,
		.sharingMode = VK_SHARING_MODE_EXCLUSIVE,
		.queueFamilyIndexCount = 0,
		.pQueueFamilyIndices = nullptr,
		.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED,
	};

	VkImage image = VK_NULL_HANDLE;
	const VkResult image_result = vkCreateImage(device, &image_create_info, nullptr, &image);
	if (image_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan offscreen image");
	}

	VkMemoryRequirements memory_requirements{};
	vkGetImageMemoryRequirements(device, image, &memory_requirements);

	const VkMemoryAllocateInfo allocate_info{
		.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO,
		.pNext = nullptr,
		.allocationSize = memory_requirements.size,
		.memoryTypeIndex = find_memory_type(
			physical_device,
			memory_requirements.memoryTypeBits,
			VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT),
	};

	VkDeviceMemory memory = VK_NULL_HANDLE;
	const VkResult memory_result = vkAllocateMemory(device, &allocate_info, nullptr, &memory);
	if (memory_result != VK_SUCCESS) {
		vkDestroyImage(device, image, nullptr);
		throw std::runtime_error("Failed to allocate Vulkan offscreen image memory");
	}

	const VkResult bind_result = vkBindImageMemory(device, image, memory, 0);
	if (bind_result != VK_SUCCESS) {
		vkDestroyImage(device, image, nullptr);
		vkFreeMemory(device, memory, nullptr);
		throw std::runtime_error("Failed to bind Vulkan offscreen image memory");
	}

	return VulkanImage(device, image, memory);
}

VulkanImageView create_image_view(VkDevice device, VkImage image) {
	const VkImageViewCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.image = image,
		.viewType = VK_IMAGE_VIEW_TYPE_2D,
		.format = kOffscreenColorFormat,
		.components = {
			VK_COMPONENT_SWIZZLE_IDENTITY,
			VK_COMPONENT_SWIZZLE_IDENTITY,
			VK_COMPONENT_SWIZZLE_IDENTITY,
			VK_COMPONENT_SWIZZLE_IDENTITY,
		},
		.subresourceRange = {
			VK_IMAGE_ASPECT_COLOR_BIT,
			0,
			1,
			0,
			1,
		},
	};

	VkImageView image_view = VK_NULL_HANDLE;
	const VkResult result = vkCreateImageView(device, &create_info, nullptr, &image_view);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan image view");
	}

	return VulkanImageView(device, image_view);
}

VulkanFramebuffer create_framebuffer(
	VkDevice device,
	VkRenderPass render_pass,
	VkImageView image_view,
	uint32_t width,
	uint32_t height) {
	const VkFramebufferCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.renderPass = render_pass,
		.attachmentCount = 1,
		.pAttachments = &image_view,
		.width = width,
		.height = height,
		.layers = 1,
	};

	VkFramebuffer framebuffer = VK_NULL_HANDLE;
	const VkResult result = vkCreateFramebuffer(device, &create_info, nullptr, &framebuffer);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan framebuffer");
	}

	return VulkanFramebuffer(device, framebuffer);
}

VulkanFence create_fence(VkDevice device) {
	const VkFenceCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
	};

	VkFence fence = VK_NULL_HANDLE;
	const VkResult result = vkCreateFence(device, &create_info, nullptr, &fence);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan fence");
	}

	return VulkanFence(device, fence);
}

std::vector<char> read_binary_file(const std::filesystem::path& path) {
	std::ifstream file(path, std::ios::binary | std::ios::ate);
	if (!file.is_open()) {
		throw std::runtime_error("Failed to open shader file: " + path.string());
	}

	const auto size = file.tellg();
	if (size <= 0 || (static_cast<std::size_t>(size) % sizeof(uint32_t)) != 0) {
		throw std::runtime_error("Invalid SPIR-V shader size: " + path.string());
	}

	std::vector<char> bytes(static_cast<std::size_t>(size));
	file.seekg(0);
	file.read(bytes.data(), size);
	if (!file) {
		throw std::runtime_error("Failed to read shader file: " + path.string());
	}

	return bytes;
}

VulkanShaderModule create_shader_module(VkDevice device, const std::filesystem::path& path) {
	const auto bytes = read_binary_file(path);
	const VkShaderModuleCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.codeSize = bytes.size(),
		.pCode = reinterpret_cast<const uint32_t*>(bytes.data()),
	};

	VkShaderModule shader_module = VK_NULL_HANDLE;
	const VkResult result = vkCreateShaderModule(device, &create_info, nullptr, &shader_module);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan shader module");
	}

	return VulkanShaderModule(device, shader_module);
}

VulkanRenderPass create_render_pass(VkDevice device) {
	const VkAttachmentDescription color_attachment{
		.flags = 0,
		.format = kOffscreenColorFormat,
		.samples = VK_SAMPLE_COUNT_1_BIT,
		.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR,
		.storeOp = VK_ATTACHMENT_STORE_OP_STORE,
		.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE,
		.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE,
		.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED,
		.finalLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
	};

	const VkAttachmentReference color_attachment_ref{
		.attachment = 0,
		.layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
	};

	const VkSubpassDescription subpass{
		.flags = 0,
		.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS,
		.inputAttachmentCount = 0,
		.pInputAttachments = nullptr,
		.colorAttachmentCount = 1,
		.pColorAttachments = &color_attachment_ref,
		.pResolveAttachments = nullptr,
		.pDepthStencilAttachment = nullptr,
		.pPreserveAttachments = nullptr,
	};

	const VkSubpassDependency dependency{
		.srcSubpass = 0,
		.dstSubpass = VK_SUBPASS_EXTERNAL,
		.srcStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
		.dstStageMask = VK_PIPELINE_STAGE_TRANSFER_BIT,
		.srcAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
		.dstAccessMask = VK_ACCESS_TRANSFER_READ_BIT,
		.dependencyFlags = 0,
	};

	const VkRenderPassCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.attachmentCount = 1,
		.pAttachments = &color_attachment,
		.subpassCount = 1,
		.pSubpasses = &subpass,
		.dependencyCount = 1,
		.pDependencies = &dependency,
	};

	VkRenderPass render_pass = VK_NULL_HANDLE;
	const VkResult result = vkCreateRenderPass(device, &create_info, nullptr, &render_pass);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan render pass");
	}

	return VulkanRenderPass(device, render_pass);
}

VulkanPipelineLayout create_pipeline_layout(VkDevice device) {
	const VkPipelineLayoutCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.setLayoutCount = 0,
		.pSetLayouts = nullptr,
		.pushConstantRangeCount = 0,
		.pPushConstantRanges = nullptr,
	};

	VkPipelineLayout pipeline_layout = VK_NULL_HANDLE;
	const VkResult result = vkCreatePipelineLayout(device, &create_info, nullptr, &pipeline_layout);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan pipeline layout");
	}

	return VulkanPipelineLayout(device, pipeline_layout);
}

VulkanPipeline create_line_pipeline(
	VkDevice device,
	VkRenderPass render_pass,
	VkPipelineLayout pipeline_layout,
	VkShaderModule vertex_shader,
	VkShaderModule fragment_shader,
	VkPrimitiveTopology topology) {
	const VkPipelineShaderStageCreateInfo vertex_stage{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.stage = VK_SHADER_STAGE_VERTEX_BIT,
		.module = vertex_shader,
		.pName = "main",
		.pSpecializationInfo = nullptr,
	};
	const VkPipelineShaderStageCreateInfo fragment_stage{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.stage = VK_SHADER_STAGE_FRAGMENT_BIT,
		.module = fragment_shader,
		.pName = "main",
		.pSpecializationInfo = nullptr,
	};
	const std::array shader_stages{vertex_stage, fragment_stage};

	const VkVertexInputBindingDescription binding_description{
		.binding = 0,
		.stride = sizeof(RenderVertex),
		.inputRate = VK_VERTEX_INPUT_RATE_VERTEX,
	};
	const std::array attribute_descriptions{
		VkVertexInputAttributeDescription{
		.location = 0,
		.binding = 0,
		.format = VK_FORMAT_R32G32_SFLOAT,
		.offset = 0,
		},
		VkVertexInputAttributeDescription{
			.location = 1,
			.binding = 0,
			.format = VK_FORMAT_R32G32B32A32_SFLOAT,
			.offset = sizeof(float) * 2,
		},
	};

	const VkPipelineVertexInputStateCreateInfo vertex_input_state{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.vertexBindingDescriptionCount = 1,
		.pVertexBindingDescriptions = &binding_description,
		.vertexAttributeDescriptionCount = static_cast<uint32_t>(attribute_descriptions.size()),
		.pVertexAttributeDescriptions = attribute_descriptions.data(),
	};

	const VkPipelineInputAssemblyStateCreateInfo input_assembly_state{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.topology = topology,
		.primitiveRestartEnable = VK_FALSE,
	};

	const VkPipelineViewportStateCreateInfo viewport_state{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.viewportCount = 1,
		.pViewports = nullptr,
		.scissorCount = 1,
		.pScissors = nullptr,
	};

	const VkPipelineRasterizationStateCreateInfo rasterization_state{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.depthClampEnable = VK_FALSE,
		.rasterizerDiscardEnable = VK_FALSE,
		.polygonMode = VK_POLYGON_MODE_FILL,
		.cullMode = VK_CULL_MODE_NONE,
		.frontFace = VK_FRONT_FACE_COUNTER_CLOCKWISE,
		.depthBiasEnable = VK_FALSE,
		.depthBiasConstantFactor = 0.0F,
		.depthBiasClamp = 0.0F,
		.depthBiasSlopeFactor = 0.0F,
		.lineWidth = 1.0F,
	};

	const VkPipelineMultisampleStateCreateInfo multisample_state{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.rasterizationSamples = VK_SAMPLE_COUNT_1_BIT,
		.sampleShadingEnable = VK_FALSE,
		.minSampleShading = 1.0F,
		.pSampleMask = nullptr,
		.alphaToCoverageEnable = VK_FALSE,
		.alphaToOneEnable = VK_FALSE,
	};

	const VkPipelineColorBlendAttachmentState color_blend_attachment{
		.blendEnable = VK_FALSE,
		.srcColorBlendFactor = VK_BLEND_FACTOR_ONE,
		.dstColorBlendFactor = VK_BLEND_FACTOR_ZERO,
		.colorBlendOp = VK_BLEND_OP_ADD,
		.srcAlphaBlendFactor = VK_BLEND_FACTOR_ONE,
		.dstAlphaBlendFactor = VK_BLEND_FACTOR_ZERO,
		.alphaBlendOp = VK_BLEND_OP_ADD,
		.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | VK_COLOR_COMPONENT_G_BIT |
			VK_COLOR_COMPONENT_B_BIT | VK_COLOR_COMPONENT_A_BIT,
	};

	const VkPipelineColorBlendStateCreateInfo color_blend_state{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.logicOpEnable = VK_FALSE,
		.logicOp = VK_LOGIC_OP_COPY,
		.attachmentCount = 1,
		.pAttachments = &color_blend_attachment,
		.blendConstants = {0.0F, 0.0F, 0.0F, 0.0F},
	};

	const std::array dynamic_states{VK_DYNAMIC_STATE_VIEWPORT, VK_DYNAMIC_STATE_SCISSOR};
	const VkPipelineDynamicStateCreateInfo dynamic_state{
		.sType = VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.dynamicStateCount = static_cast<uint32_t>(dynamic_states.size()),
		.pDynamicStates = dynamic_states.data(),
	};

	const VkGraphicsPipelineCreateInfo create_info{
		.sType = VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO,
		.pNext = nullptr,
		.flags = 0,
		.stageCount = static_cast<uint32_t>(shader_stages.size()),
		.pStages = shader_stages.data(),
		.pVertexInputState = &vertex_input_state,
		.pInputAssemblyState = &input_assembly_state,
		.pTessellationState = nullptr,
		.pViewportState = &viewport_state,
		.pRasterizationState = &rasterization_state,
		.pMultisampleState = &multisample_state,
		.pDepthStencilState = nullptr,
		.pColorBlendState = &color_blend_state,
		.pDynamicState = &dynamic_state,
		.layout = pipeline_layout,
		.renderPass = render_pass,
		.subpass = 0,
		.basePipelineHandle = VK_NULL_HANDLE,
		.basePipelineIndex = -1,
	};

	VkPipeline pipeline = VK_NULL_HANDLE;
	const VkResult result = vkCreateGraphicsPipelines(
		device,
		VK_NULL_HANDLE,
		1,
		&create_info,
		nullptr,
		&pipeline);
	if (result != VK_SUCCESS) {
		throw std::runtime_error("Failed to create Vulkan graphics pipeline");
	}

	return VulkanPipeline(device, pipeline);
}

void record_draw_commands(
	VkCommandBuffer command_buffer,
	const RenderConfig& render_config,
	VkRenderPass render_pass,
	VkFramebuffer framebuffer,
	VkPipeline line_pipeline,
	VkPipeline marker_pipeline,
	VkBuffer axes_buffer,
	uint32_t axes_vertex_count,
	VkBuffer trajectory_buffer,
	uint32_t trajectory_vertex_count,
	VkBuffer overlay_line_buffer,
	uint32_t overlay_line_vertex_count,
	VkBuffer marker_buffer,
	uint32_t marker_vertex_count,
	VkBuffer overlay_marker_buffer,
	uint32_t overlay_marker_vertex_count,
	VkImage offscreen_image,
	VkBuffer readback_buffer) {
	const VkCommandBufferBeginInfo begin_info{
		.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
		.pNext = nullptr,
		.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT,
		.pInheritanceInfo = nullptr,
	};
	const VkResult begin_result = vkBeginCommandBuffer(command_buffer, &begin_info);
	if (begin_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to begin Vulkan command buffer");
	}

	const VkClearValue clear_value{ .color = {{0.031F, 0.071F, 0.118F, 1.0F}} };
	const VkRenderPassBeginInfo render_pass_begin_info{
		.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO,
		.pNext = nullptr,
		.renderPass = render_pass,
		.framebuffer = framebuffer,
		.renderArea = {{0, 0}, {render_config.width, render_config.height}},
		.clearValueCount = 1,
		.pClearValues = &clear_value,
	};

	vkCmdBeginRenderPass(command_buffer, &render_pass_begin_info, VK_SUBPASS_CONTENTS_INLINE);

	const VkViewport viewport{
		0.0F,
		0.0F,
		static_cast<float>(render_config.width),
		static_cast<float>(render_config.height),
		0.0F,
		1.0F,
	};
	const VkRect2D scissor{{0, 0}, {render_config.width, render_config.height}};
	vkCmdSetViewport(command_buffer, 0, 1, &viewport);
	vkCmdSetScissor(command_buffer, 0, 1, &scissor);
	vkCmdBindPipeline(command_buffer, VK_PIPELINE_BIND_POINT_GRAPHICS, line_pipeline);

	constexpr VkDeviceSize offsets[] = {0};
	vkCmdBindVertexBuffers(command_buffer, 0, 1, &axes_buffer, offsets);
	vkCmdDraw(command_buffer, axes_vertex_count, 1, 0, 0);
	vkCmdBindVertexBuffers(command_buffer, 0, 1, &trajectory_buffer, offsets);
	vkCmdDraw(command_buffer, trajectory_vertex_count, 1, 0, 0);
	if (overlay_line_vertex_count > 0) {
		vkCmdBindVertexBuffers(command_buffer, 0, 1, &overlay_line_buffer, offsets);
		vkCmdDraw(command_buffer, overlay_line_vertex_count, 1, 0, 0);
	}
	vkCmdBindPipeline(command_buffer, VK_PIPELINE_BIND_POINT_GRAPHICS, marker_pipeline);
	if (overlay_marker_vertex_count > 0) {
		vkCmdBindVertexBuffers(command_buffer, 0, 1, &overlay_marker_buffer, offsets);
		vkCmdDraw(command_buffer, overlay_marker_vertex_count, 1, 0, 0);
	}
	vkCmdBindVertexBuffers(command_buffer, 0, 1, &marker_buffer, offsets);
	vkCmdDraw(command_buffer, marker_vertex_count, 1, 0, 0);

	vkCmdEndRenderPass(command_buffer);

	const VkImageMemoryBarrier transfer_barrier{
		.sType = VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER,
		.pNext = nullptr,
		.srcAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
		.dstAccessMask = VK_ACCESS_TRANSFER_READ_BIT,
		.oldLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
		.newLayout = VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
		.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED,
		.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED,
		.image = offscreen_image,
		.subresourceRange = {
			VK_IMAGE_ASPECT_COLOR_BIT,
			0,
			1,
			0,
			1,
		},
	};
	vkCmdPipelineBarrier(
		command_buffer,
		VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
		VK_PIPELINE_STAGE_TRANSFER_BIT,
		0,
		0,
		nullptr,
		0,
		nullptr,
		1,
		&transfer_barrier);

	const VkBufferImageCopy copy_region{
		.bufferOffset = 0,
		.bufferRowLength = 0,
		.bufferImageHeight = 0,
		.imageSubresource = {VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1},
		.imageOffset = {0, 0, 0},
		.imageExtent = {render_config.width, render_config.height, 1},
	};
	vkCmdCopyImageToBuffer(
		command_buffer,
		offscreen_image,
		VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
		readback_buffer,
		1,
		&copy_region);

	const VkResult end_result = vkEndCommandBuffer(command_buffer);
	if (end_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to end Vulkan command buffer");
	}
}

void submit_and_wait(VkDevice device, VkQueue queue, VkCommandBuffer command_buffer) {
	const auto fence = create_fence(device);
	const VkSubmitInfo submit_info{
		.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO,
		.pNext = nullptr,
		.waitSemaphoreCount = 0,
		.pWaitSemaphores = nullptr,
		.pWaitDstStageMask = nullptr,
		.commandBufferCount = 1,
		.pCommandBuffers = &command_buffer,
		.signalSemaphoreCount = 0,
		.pSignalSemaphores = nullptr,
	};

	const VkResult submit_result = vkQueueSubmit(queue, 1, &submit_info, fence.get());
	if (submit_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to submit Vulkan draw commands");
	}

	const VkFence render_fence = fence.get();
	const VkResult wait_result = vkWaitForFences(device, 1, &render_fence, VK_TRUE, UINT64_MAX);
	if (wait_result != VK_SUCCESS) {
		throw std::runtime_error("Failed while waiting for Vulkan draw fence");
	}

	vkQueueWaitIdle(queue);
}

void write_ppm_image(
	const VulkanBuffer& readback_buffer,
	const std::filesystem::path& path,
	const RenderConfig& render_config) {
	void* mapped_memory = nullptr;
	const VkDeviceSize byte_count =
		static_cast<VkDeviceSize>(render_config.width) * render_config.height * 4;
	const VkResult map_result =
		vkMapMemory(readback_buffer.device(), readback_buffer.memory(), 0, byte_count, 0, &mapped_memory);
	if (map_result != VK_SUCCESS) {
		throw std::runtime_error("Failed to map Vulkan readback buffer memory");
	}

	std::ofstream output(path, std::ios::binary);
	if (!output.is_open()) {
		vkUnmapMemory(readback_buffer.device(), readback_buffer.memory());
		throw std::runtime_error("Failed to open output image: " + path.string());
	}

	output << "P6\n" << render_config.width << ' ' << render_config.height << "\n255\n";
	const auto* pixels = static_cast<const unsigned char*>(mapped_memory);
	for (uint32_t row = 0; row < render_config.height; ++row) {
		for (uint32_t column = 0; column < render_config.width; ++column) {
			const std::size_t pixel_index =
				(static_cast<std::size_t>(row) * render_config.width + column) * 4;
			output.put(static_cast<char>(pixels[pixel_index]));
			output.put(static_cast<char>(pixels[pixel_index + 1]));
			output.put(static_cast<char>(pixels[pixel_index + 2]));
		}
	}

	vkUnmapMemory(readback_buffer.device(), readback_buffer.memory());
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::kinematics::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::dynamics::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::statics::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::fluid_mechanics::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::thermodynamics::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::optics::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::quantum::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::electronics::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::electromagnetism::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

std::vector<RenderVertex> colorize_vertices(
	const std::vector<visual_physics::computational_physics::NormalizedVertex>& vertices,
	std::array<float, 4> color) {
	std::vector<RenderVertex> colored_vertices;
	colored_vertices.reserve(vertices.size());
	for (const auto& vertex : vertices) {
		colored_vertices.push_back({vertex.x, vertex.y, color[0], color[1], color[2], color[3]});
	}
	return colored_vertices;
}

struct WavesPlotBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

struct RelativityPlotBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

WavesPlotBounds build_waves_plot_bounds(
	const std::vector<visual_physics::waves::Sample>& samples) {
	if (samples.empty()) {
		return {-1.0, 1.0, -1.0, 1.0};
	}

	double min_x = samples.front().position;
	double max_x = samples.front().position;
	double min_y = samples.front().primary_value;
	double max_y = samples.front().primary_value;
	for (const auto& sample : samples) {
		min_x = std::min(min_x, sample.position);
		max_x = std::max(max_x, sample.position);
		min_y = std::min(min_y, sample.primary_value);
		max_y = std::max(max_y, sample.primary_value);
	}
	min_y = std::min(min_y, 0.0);
	max_y = std::max(max_y, 0.0);
	if (std::abs(max_x - min_x) < 1e-6) {
		min_x -= 1.0;
		max_x += 1.0;
	}
	if (std::abs(max_y - min_y) < 1e-6) {
		min_y -= 1.0;
		max_y += 1.0;
	}
	const double y_padding = std::max((max_y - min_y) * 0.1, 0.5);
	return {min_x, max_x, min_y - y_padding, max_y + y_padding};
}

RenderVertex make_waves_plot_vertex(
	double x,
	double y,
	const WavesPlotBounds& bounds,
	std::array<float, 4> color) {
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
		color[0],
		color[1],
		color[2],
		color[3],
	};
}

std::vector<RenderVertex> build_waves_axes_vertices(
	const std::vector<visual_physics::waves::Sample>& samples,
	std::array<float, 4> color) {
	const auto bounds = build_waves_plot_bounds(samples);
	const double y_axis_x = bounds.min_x <= 0.0 && bounds.max_x >= 0.0 ? 0.0 : bounds.min_x;
	const double x_axis_y = bounds.min_y <= 0.0 && bounds.max_y >= 0.0 ? 0.0 : bounds.min_y;
	return {
		make_waves_plot_vertex(bounds.min_x, x_axis_y, bounds, color),
		make_waves_plot_vertex(bounds.max_x, x_axis_y, bounds, color),
		make_waves_plot_vertex(y_axis_x, bounds.min_y, bounds, color),
		make_waves_plot_vertex(y_axis_x, bounds.max_y, bounds, color),
	};
}

std::vector<RenderVertex> build_waves_trajectory_vertices(
	const std::vector<visual_physics::waves::Sample>& samples,
	std::array<float, 4> color) {
	std::vector<RenderVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}
	const auto bounds = build_waves_plot_bounds(samples);
	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		vertices.push_back(make_waves_plot_vertex(
			samples[index - 1].position,
			samples[index - 1].primary_value,
			bounds,
			color));
		vertices.push_back(make_waves_plot_vertex(
			samples[index].position,
			samples[index].primary_value,
			bounds,
			color));
	}
	return vertices;
}

std::vector<RenderVertex> build_waves_marker_vertices(
	const std::vector<visual_physics::waves::Sample>& samples,
	std::array<float, 4> color) {
	std::vector<RenderVertex> vertices;
	if (samples.empty()) {
		return vertices;
	}
	const auto bounds = build_waves_plot_bounds(samples);
	const auto& sample = samples[samples.size() / 2];
	const double dx = (bounds.max_x - bounds.min_x) * 0.015;
	const double dy = (bounds.max_y - bounds.min_y) * 0.06;
	vertices.reserve(4);
	vertices.push_back(make_waves_plot_vertex(sample.position - dx, sample.primary_value, bounds, color));
	vertices.push_back(make_waves_plot_vertex(sample.position + dx, sample.primary_value, bounds, color));
	vertices.push_back(make_waves_plot_vertex(sample.position, sample.primary_value - dy, bounds, color));
	vertices.push_back(make_waves_plot_vertex(sample.position, sample.primary_value + dy, bounds, color));
	return vertices;
}

RelativityPlotBounds build_relativity_plot_bounds(
	const std::vector<visual_physics::relativity::Sample>& samples) {
	if (samples.empty()) {
		return {-1.0, 1.0, -1.0, 1.0};
	}

	double min_x = samples.front().position;
	double max_x = samples.front().position;
	double min_y = samples.front().primary_value;
	double max_y = samples.front().primary_value;
	for (const auto& sample : samples) {
		min_x = std::min(min_x, sample.position);
		max_x = std::max(max_x, sample.position);
		min_y = std::min(min_y, sample.primary_value);
		max_y = std::max(max_y, sample.primary_value);
		if (sample.secondary_value.has_value()) {
			min_y = std::min(min_y, *sample.secondary_value);
			max_y = std::max(max_y, *sample.secondary_value);
		}
	}
	min_y = std::min(min_y, 0.0);
	max_y = std::max(max_y, 0.0);
	if (std::abs(max_x - min_x) < 1e-6) {
		min_x -= 1.0;
		max_x += 1.0;
	}
	if (std::abs(max_y - min_y) < 1e-6) {
		min_y -= 1.0;
		max_y += 1.0;
	}
	const double y_padding = std::max((max_y - min_y) * 0.1, 0.25);
	return {min_x, max_x, min_y - y_padding, max_y + y_padding};
}

RenderVertex make_relativity_plot_vertex(
	double x,
	double y,
	const RelativityPlotBounds& bounds,
	std::array<float, 4> color) {
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
		color[0],
		color[1],
		color[2],
		color[3],
	};
}

std::vector<RenderVertex> build_relativity_axes_vertices(
	const std::vector<visual_physics::relativity::Sample>& samples,
	std::array<float, 4> color) {
	const auto bounds = build_relativity_plot_bounds(samples);
	const double y_axis_x = bounds.min_x <= 0.0 && bounds.max_x >= 0.0 ? 0.0 : bounds.min_x;
	const double x_axis_y = bounds.min_y <= 0.0 && bounds.max_y >= 0.0 ? 0.0 : bounds.min_y;
	return {
		make_relativity_plot_vertex(bounds.min_x, x_axis_y, bounds, color),
		make_relativity_plot_vertex(bounds.max_x, x_axis_y, bounds, color),
		make_relativity_plot_vertex(y_axis_x, bounds.min_y, bounds, color),
		make_relativity_plot_vertex(y_axis_x, bounds.max_y, bounds, color),
	};
}

std::vector<RenderVertex> build_relativity_trajectory_vertices(
	const std::vector<visual_physics::relativity::Sample>& samples,
	std::array<float, 4> color,
	bool use_secondary_value) {
	std::vector<RenderVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}
	const auto bounds = build_relativity_plot_bounds(samples);
	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		const auto previous_y = use_secondary_value
			? samples[index - 1].secondary_value.value_or(samples[index - 1].primary_value)
			: samples[index - 1].primary_value;
		const auto current_y = use_secondary_value
			? samples[index].secondary_value.value_or(samples[index].primary_value)
			: samples[index].primary_value;
		vertices.push_back(make_relativity_plot_vertex(samples[index - 1].position, previous_y, bounds, color));
		vertices.push_back(make_relativity_plot_vertex(samples[index].position, current_y, bounds, color));
	}
	return vertices;
}

std::vector<RenderVertex> build_relativity_marker_vertices(
	const std::vector<visual_physics::relativity::Sample>& samples,
	std::array<float, 4> color) {
	std::vector<RenderVertex> vertices;
	if (samples.empty()) {
		return vertices;
	}
	const auto bounds = build_relativity_plot_bounds(samples);
	const auto marker_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	const auto& sample = marker_it != samples.end() ? *marker_it : samples[samples.size() / 2];
	const double dx = (bounds.max_x - bounds.min_x) * 0.015;
	const double dy = (bounds.max_y - bounds.min_y) * 0.04;
	vertices.reserve(4);
	vertices.push_back(make_relativity_plot_vertex(sample.position - dx, sample.primary_value, bounds, color));
	vertices.push_back(make_relativity_plot_vertex(sample.position + dx, sample.primary_value, bounds, color));
	vertices.push_back(make_relativity_plot_vertex(sample.position, sample.primary_value - dy, bounds, color));
	vertices.push_back(make_relativity_plot_vertex(sample.position, sample.primary_value + dy, bounds, color));
	return vertices;
}

struct AstrophysicsPlotBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

struct AtmosphericPlotBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

struct PlasmaPlotBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

struct SolidStatePlotBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

struct NuclearAndParticlePhysicsPlotBounds {
	double min_x;
	double max_x;
	double min_y;
	double max_y;
};

SolidStatePlotBounds build_solid_state_plot_bounds(
	const std::vector<visual_physics::solid_state::Sample>& samples) {
	if (samples.empty()) {
		return {-1.0, 1.0, -1.0, 1.0};
	}

	double min_x = samples.front().position;
	double max_x = samples.front().position;
	double min_y = samples.front().primary_value;
	double max_y = samples.front().primary_value;
	for (const auto& sample : samples) {
		min_x = std::min(min_x, sample.position);
		max_x = std::max(max_x, sample.position);
		min_y = std::min(min_y, sample.primary_value);
		max_y = std::max(max_y, sample.primary_value);
		if (sample.secondary_value.has_value()) {
			min_y = std::min(min_y, *sample.secondary_value);
			max_y = std::max(max_y, *sample.secondary_value);
		}
	}
	min_y = std::min(min_y, 0.0);
	max_y = std::max(max_y, 0.0);
	if (std::abs(max_x - min_x) < 1e-6) {
		min_x -= 1.0;
		max_x += 1.0;
	}
	if (std::abs(max_y - min_y) < 1e-6) {
		min_y -= 1.0;
		max_y += 1.0;
	}
	const double y_padding = std::max((max_y - min_y) * 0.1, 0.25);
	return {min_x, max_x, min_y - y_padding, max_y + y_padding};
}

PlasmaPlotBounds build_plasma_plot_bounds(
	const std::vector<visual_physics::plasma_physics::Sample>& samples) {
	if (samples.empty()) {
		return {-1.0, 1.0, -1.0, 1.0};
	}

	double min_x = samples.front().position;
	double max_x = samples.front().position;
	double min_y = samples.front().primary_value;
	double max_y = samples.front().primary_value;
	for (const auto& sample : samples) {
		min_x = std::min(min_x, sample.position);
		max_x = std::max(max_x, sample.position);
		min_y = std::min(min_y, sample.primary_value);
		max_y = std::max(max_y, sample.primary_value);
		if (sample.secondary_value.has_value()) {
			min_y = std::min(min_y, *sample.secondary_value);
			max_y = std::max(max_y, *sample.secondary_value);
		}
	}
	min_y = std::min(min_y, 0.0);
	max_y = std::max(max_y, 0.0);
	if (std::abs(max_x - min_x) < 1e-6) {
		min_x -= 1.0;
		max_x += 1.0;
	}
	if (std::abs(max_y - min_y) < 1e-6) {
		min_y -= 1.0;
		max_y += 1.0;
	}
	const double y_padding = std::max((max_y - min_y) * 0.1, 0.25);
	return {min_x, max_x, min_y - y_padding, max_y + y_padding};
}

RenderVertex make_plasma_plot_vertex(
	double x,
	double y,
	const PlasmaPlotBounds& bounds,
	std::array<float, 4> color) {
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
		color[0],
		color[1],
		color[2],
		color[3],
	};
}

std::vector<RenderVertex> build_plasma_axes_vertices(
	const std::vector<visual_physics::plasma_physics::Sample>& samples,
	std::array<float, 4> color) {
	const auto bounds = build_plasma_plot_bounds(samples);
	const double y_axis_x = bounds.min_x <= 0.0 && bounds.max_x >= 0.0 ? 0.0 : bounds.min_x;
	const double x_axis_y = bounds.min_y <= 0.0 && bounds.max_y >= 0.0 ? 0.0 : bounds.min_y;
	return {
		make_plasma_plot_vertex(bounds.min_x, x_axis_y, bounds, color),
		make_plasma_plot_vertex(bounds.max_x, x_axis_y, bounds, color),
		make_plasma_plot_vertex(y_axis_x, bounds.min_y, bounds, color),
		make_plasma_plot_vertex(y_axis_x, bounds.max_y, bounds, color),
	};
}

std::vector<RenderVertex> build_plasma_trajectory_vertices(
	const std::vector<visual_physics::plasma_physics::Sample>& samples,
	std::array<float, 4> color,
	bool use_secondary_value) {
	std::vector<RenderVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}
	const auto bounds = build_plasma_plot_bounds(samples);
	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		const auto previous_y = use_secondary_value
			? samples[index - 1].secondary_value.value_or(samples[index - 1].primary_value)
			: samples[index - 1].primary_value;
		const auto current_y = use_secondary_value
			? samples[index].secondary_value.value_or(samples[index].primary_value)
			: samples[index].primary_value;
		vertices.push_back(make_plasma_plot_vertex(samples[index - 1].position, previous_y, bounds, color));
		vertices.push_back(make_plasma_plot_vertex(samples[index].position, current_y, bounds, color));
	}
	return vertices;
}

std::vector<RenderVertex> build_plasma_marker_vertices(
	const std::vector<visual_physics::plasma_physics::Sample>& samples,
	std::array<float, 4> color) {
	std::vector<RenderVertex> vertices;
	if (samples.empty()) {
		return vertices;
	}
	const auto bounds = build_plasma_plot_bounds(samples);
	const auto marker_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	const auto& sample = marker_it != samples.end() ? *marker_it : samples[samples.size() / 2];
	const double dx = (bounds.max_x - bounds.min_x) * 0.015;
	const double dy = (bounds.max_y - bounds.min_y) * 0.04;
	vertices.reserve(4);
	vertices.push_back(make_plasma_plot_vertex(sample.position - dx, sample.primary_value, bounds, color));
	vertices.push_back(make_plasma_plot_vertex(sample.position + dx, sample.primary_value, bounds, color));
	vertices.push_back(make_plasma_plot_vertex(sample.position, sample.primary_value - dy, bounds, color));
	vertices.push_back(make_plasma_plot_vertex(sample.position, sample.primary_value + dy, bounds, color));
	return vertices;
}

RenderVertex make_solid_state_plot_vertex(
	double x,
	double y,
	const SolidStatePlotBounds& bounds,
	std::array<float, 4> color) {
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
		color[0],
		color[1],
		color[2],
		color[3],
	};
}

std::vector<RenderVertex> build_solid_state_axes_vertices(
	const std::vector<visual_physics::solid_state::Sample>& samples,
	std::array<float, 4> color) {
	const auto bounds = build_solid_state_plot_bounds(samples);
	const double y_axis_x = bounds.min_x <= 0.0 && bounds.max_x >= 0.0 ? 0.0 : bounds.min_x;
	const double x_axis_y = bounds.min_y <= 0.0 && bounds.max_y >= 0.0 ? 0.0 : bounds.min_y;
	return {
		make_solid_state_plot_vertex(bounds.min_x, x_axis_y, bounds, color),
		make_solid_state_plot_vertex(bounds.max_x, x_axis_y, bounds, color),
		make_solid_state_plot_vertex(y_axis_x, bounds.min_y, bounds, color),
		make_solid_state_plot_vertex(y_axis_x, bounds.max_y, bounds, color),
	};
}

std::vector<RenderVertex> build_solid_state_trajectory_vertices(
	const std::vector<visual_physics::solid_state::Sample>& samples,
	std::array<float, 4> color,
	bool use_secondary_value) {
	std::vector<RenderVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}
	const auto bounds = build_solid_state_plot_bounds(samples);
	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		const auto previous_y = use_secondary_value
			? samples[index - 1].secondary_value.value_or(samples[index - 1].primary_value)
			: samples[index - 1].primary_value;
		const auto current_y = use_secondary_value
			? samples[index].secondary_value.value_or(samples[index].primary_value)
			: samples[index].primary_value;
		vertices.push_back(make_solid_state_plot_vertex(
			samples[index - 1].position,
			previous_y,
			bounds,
			color));
		vertices.push_back(make_solid_state_plot_vertex(
			samples[index].position,
			current_y,
			bounds,
			color));
	}
	return vertices;
}

std::vector<RenderVertex> build_solid_state_marker_vertices(
	const std::vector<visual_physics::solid_state::Sample>& samples,
	std::array<float, 4> color) {
	std::vector<RenderVertex> vertices;
	if (samples.empty()) {
		return vertices;
	}
	const auto bounds = build_solid_state_plot_bounds(samples);
	const auto marker_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	const auto& sample = marker_it != samples.end() ? *marker_it : samples[samples.size() / 2];
	const double dx = (bounds.max_x - bounds.min_x) * 0.015;
	const double dy = (bounds.max_y - bounds.min_y) * 0.04;
	vertices.reserve(4);
	vertices.push_back(make_solid_state_plot_vertex(sample.position - dx, sample.primary_value, bounds, color));
	vertices.push_back(make_solid_state_plot_vertex(sample.position + dx, sample.primary_value, bounds, color));
	vertices.push_back(make_solid_state_plot_vertex(sample.position, sample.primary_value - dy, bounds, color));
	vertices.push_back(make_solid_state_plot_vertex(sample.position, sample.primary_value + dy, bounds, color));
	return vertices;
}

NuclearAndParticlePhysicsPlotBounds build_nuclear_and_particle_physics_plot_bounds(
	const std::vector<visual_physics::nuclear_and_particle_physics::Sample>& samples) {
	if (samples.empty()) {
		return {-1.0, 1.0, -1.0, 1.0};
	}

	double min_x = samples.front().position;
	double max_x = samples.front().position;
	double min_y = samples.front().primary_value;
	double max_y = samples.front().primary_value;
	for (const auto& sample : samples) {
		min_x = std::min(min_x, sample.position);
		max_x = std::max(max_x, sample.position);
		min_y = std::min(min_y, sample.primary_value);
		max_y = std::max(max_y, sample.primary_value);
		if (sample.secondary_value.has_value()) {
			min_y = std::min(min_y, *sample.secondary_value);
			max_y = std::max(max_y, *sample.secondary_value);
		}
	}
	min_y = std::min(min_y, 0.0);
	max_y = std::max(max_y, 0.0);
	if (std::abs(max_x - min_x) < 1e-6) {
		min_x -= 1.0;
		max_x += 1.0;
	}
	if (std::abs(max_y - min_y) < 1e-6) {
		min_y -= 1.0;
		max_y += 1.0;
	}
	const double y_padding = std::max((max_y - min_y) * 0.1, 0.25);
	return {min_x, max_x, min_y - y_padding, max_y + y_padding};
}

RenderVertex make_nuclear_and_particle_physics_plot_vertex(
	double x,
	double y,
	const NuclearAndParticlePhysicsPlotBounds& bounds,
	std::array<float, 4> color) {
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
		color[0],
		color[1],
		color[2],
		color[3],
	};
}

std::vector<RenderVertex> build_nuclear_and_particle_physics_axes_vertices(
	const std::vector<visual_physics::nuclear_and_particle_physics::Sample>& samples,
	std::array<float, 4> color) {
	const auto bounds = build_nuclear_and_particle_physics_plot_bounds(samples);
	const double y_axis_x = bounds.min_x <= 0.0 && bounds.max_x >= 0.0 ? 0.0 : bounds.min_x;
	const double x_axis_y = bounds.min_y <= 0.0 && bounds.max_y >= 0.0 ? 0.0 : bounds.min_y;
	return {
		make_nuclear_and_particle_physics_plot_vertex(bounds.min_x, x_axis_y, bounds, color),
		make_nuclear_and_particle_physics_plot_vertex(bounds.max_x, x_axis_y, bounds, color),
		make_nuclear_and_particle_physics_plot_vertex(y_axis_x, bounds.min_y, bounds, color),
		make_nuclear_and_particle_physics_plot_vertex(y_axis_x, bounds.max_y, bounds, color),
	};
}

std::vector<RenderVertex> build_nuclear_and_particle_physics_trajectory_vertices(
	const std::vector<visual_physics::nuclear_and_particle_physics::Sample>& samples,
	std::array<float, 4> color,
	bool use_secondary_value) {
	std::vector<RenderVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}
	const auto bounds = build_nuclear_and_particle_physics_plot_bounds(samples);
	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		const auto previous_y = use_secondary_value
			? samples[index - 1].secondary_value.value_or(samples[index - 1].primary_value)
			: samples[index - 1].primary_value;
		const auto current_y = use_secondary_value
			? samples[index].secondary_value.value_or(samples[index].primary_value)
			: samples[index].primary_value;
		vertices.push_back(make_nuclear_and_particle_physics_plot_vertex(
			samples[index - 1].position,
			previous_y,
			bounds,
			color));
		vertices.push_back(make_nuclear_and_particle_physics_plot_vertex(
			samples[index].position,
			current_y,
			bounds,
			color));
	}
	return vertices;
}

std::vector<RenderVertex> build_nuclear_and_particle_physics_marker_vertices(
	const std::vector<visual_physics::nuclear_and_particle_physics::Sample>& samples,
	std::array<float, 4> color) {
	std::vector<RenderVertex> vertices;
	if (samples.empty()) {
		return vertices;
	}
	const auto bounds = build_nuclear_and_particle_physics_plot_bounds(samples);
	const auto marker_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	const auto& sample = marker_it != samples.end() ? *marker_it : samples[samples.size() / 2];
	const double dx = (bounds.max_x - bounds.min_x) * 0.015;
	const double dy = (bounds.max_y - bounds.min_y) * 0.04;
	vertices.reserve(4);
	vertices.push_back(make_nuclear_and_particle_physics_plot_vertex(
		sample.position - dx,
		sample.primary_value,
		bounds,
		color));
	vertices.push_back(make_nuclear_and_particle_physics_plot_vertex(
		sample.position + dx,
		sample.primary_value,
		bounds,
		color));
	vertices.push_back(make_nuclear_and_particle_physics_plot_vertex(
		sample.position,
		sample.primary_value - dy,
		bounds,
		color));
	vertices.push_back(make_nuclear_and_particle_physics_plot_vertex(
		sample.position,
		sample.primary_value + dy,
		bounds,
		color));
	return vertices;
}

AtmosphericPlotBounds build_atmospheric_plot_bounds(
	const std::vector<visual_physics::atmospheric::Sample>& samples) {
	if (samples.empty()) {
		return {-1.0, 1.0, -1.0, 1.0};
	}

	double min_x = samples.front().position;
	double max_x = samples.front().position;
	double min_y = samples.front().primary_value;
	double max_y = samples.front().primary_value;
	for (const auto& sample : samples) {
		min_x = std::min(min_x, sample.position);
		max_x = std::max(max_x, sample.position);
		min_y = std::min(min_y, sample.primary_value);
		max_y = std::max(max_y, sample.primary_value);
		if (sample.secondary_value.has_value()) {
			min_y = std::min(min_y, *sample.secondary_value);
			max_y = std::max(max_y, *sample.secondary_value);
		}
	}
	min_y = std::min(min_y, 0.0);
	max_y = std::max(max_y, 0.0);
	if (std::abs(max_x - min_x) < 1e-6) {
		min_x -= 1.0;
		max_x += 1.0;
	}
	if (std::abs(max_y - min_y) < 1e-6) {
		min_y -= 1.0;
		max_y += 1.0;
	}
	const double y_padding = std::max((max_y - min_y) * 0.1, 0.25);
	return {min_x, max_x, min_y - y_padding, max_y + y_padding};
}

RenderVertex make_atmospheric_plot_vertex(
	double x,
	double y,
	const AtmosphericPlotBounds& bounds,
	std::array<float, 4> color) {
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
		color[0],
		color[1],
		color[2],
		color[3],
	};
}

std::vector<RenderVertex> build_atmospheric_axes_vertices(
	const std::vector<visual_physics::atmospheric::Sample>& samples,
	std::array<float, 4> color) {
	const auto bounds = build_atmospheric_plot_bounds(samples);
	const double y_axis_x = bounds.min_x <= 0.0 && bounds.max_x >= 0.0 ? 0.0 : bounds.min_x;
	const double x_axis_y = bounds.min_y <= 0.0 && bounds.max_y >= 0.0 ? 0.0 : bounds.min_y;
	return {
		make_atmospheric_plot_vertex(bounds.min_x, x_axis_y, bounds, color),
		make_atmospheric_plot_vertex(bounds.max_x, x_axis_y, bounds, color),
		make_atmospheric_plot_vertex(y_axis_x, bounds.min_y, bounds, color),
		make_atmospheric_plot_vertex(y_axis_x, bounds.max_y, bounds, color),
	};
}

std::vector<RenderVertex> build_atmospheric_trajectory_vertices(
	const std::vector<visual_physics::atmospheric::Sample>& samples,
	std::array<float, 4> color,
	bool use_secondary_value) {
	std::vector<RenderVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}
	const auto bounds = build_atmospheric_plot_bounds(samples);
	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		const auto previous_y = use_secondary_value
			? samples[index - 1].secondary_value.value_or(samples[index - 1].primary_value)
			: samples[index - 1].primary_value;
		const auto current_y = use_secondary_value
			? samples[index].secondary_value.value_or(samples[index].primary_value)
			: samples[index].primary_value;
		vertices.push_back(make_atmospheric_plot_vertex(
			samples[index - 1].position,
			previous_y,
			bounds,
			color));
		vertices.push_back(make_atmospheric_plot_vertex(
			samples[index].position,
			current_y,
			bounds,
			color));
	}
	return vertices;
}

std::vector<RenderVertex> build_atmospheric_marker_vertices(
	const std::vector<visual_physics::atmospheric::Sample>& samples,
	std::array<float, 4> color) {
	std::vector<RenderVertex> vertices;
	if (samples.empty()) {
		return vertices;
	}
	const auto bounds = build_atmospheric_plot_bounds(samples);
	const auto marker_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	const auto& sample = marker_it != samples.end() ? *marker_it : samples[samples.size() / 2];
	const double dx = (bounds.max_x - bounds.min_x) * 0.015;
	const double dy = (bounds.max_y - bounds.min_y) * 0.04;
	vertices.reserve(4);
	vertices.push_back(make_atmospheric_plot_vertex(sample.position - dx, sample.primary_value, bounds, color));
	vertices.push_back(make_atmospheric_plot_vertex(sample.position + dx, sample.primary_value, bounds, color));
	vertices.push_back(make_atmospheric_plot_vertex(sample.position, sample.primary_value - dy, bounds, color));
	vertices.push_back(make_atmospheric_plot_vertex(sample.position, sample.primary_value + dy, bounds, color));
	return vertices;
}

AstrophysicsPlotBounds build_astrophysics_plot_bounds(
	const std::vector<visual_physics::astrophysics::Sample>& samples) {
	if (samples.empty()) {
		return {-1.0, 1.0, -1.0, 1.0};
	}

	double min_x = samples.front().position;
	double max_x = samples.front().position;
	double min_y = samples.front().primary_value;
	double max_y = samples.front().primary_value;
	for (const auto& sample : samples) {
		min_x = std::min(min_x, sample.position);
		max_x = std::max(max_x, sample.position);
		min_y = std::min(min_y, sample.primary_value);
		max_y = std::max(max_y, sample.primary_value);
		if (sample.secondary_value.has_value()) {
			min_y = std::min(min_y, *sample.secondary_value);
			max_y = std::max(max_y, *sample.secondary_value);
		}
	}
	min_y = std::min(min_y, 0.0);
	max_y = std::max(max_y, 0.0);
	if (std::abs(max_x - min_x) < 1e-6) {
		min_x -= 1.0;
		max_x += 1.0;
	}
	if (std::abs(max_y - min_y) < 1e-6) {
		min_y -= 1.0;
		max_y += 1.0;
	}
	const double y_padding = std::max((max_y - min_y) * 0.1, 0.25);
	return {min_x, max_x, min_y - y_padding, max_y + y_padding};
}

RenderVertex make_astrophysics_plot_vertex(
	double x,
	double y,
	const AstrophysicsPlotBounds& bounds,
	std::array<float, 4> color) {
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;
	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
		color[0],
		color[1],
		color[2],
		color[3],
	};
}

std::vector<RenderVertex> build_astrophysics_axes_vertices(
	const std::vector<visual_physics::astrophysics::Sample>& samples,
	std::array<float, 4> color) {
	const auto bounds = build_astrophysics_plot_bounds(samples);
	const double y_axis_x = bounds.min_x <= 0.0 && bounds.max_x >= 0.0 ? 0.0 : bounds.min_x;
	const double x_axis_y = bounds.min_y <= 0.0 && bounds.max_y >= 0.0 ? 0.0 : bounds.min_y;
	return {
		make_astrophysics_plot_vertex(bounds.min_x, x_axis_y, bounds, color),
		make_astrophysics_plot_vertex(bounds.max_x, x_axis_y, bounds, color),
		make_astrophysics_plot_vertex(y_axis_x, bounds.min_y, bounds, color),
		make_astrophysics_plot_vertex(y_axis_x, bounds.max_y, bounds, color),
	};
}

std::vector<RenderVertex> build_astrophysics_trajectory_vertices(
	const std::vector<visual_physics::astrophysics::Sample>& samples,
	std::array<float, 4> color,
	bool use_secondary_value) {
	std::vector<RenderVertex> vertices;
	if (samples.size() < 2) {
		return vertices;
	}
	const auto bounds = build_astrophysics_plot_bounds(samples);
	vertices.reserve((samples.size() - 1) * 2);
	for (std::size_t index = 1; index < samples.size(); index += 1) {
		const auto previous_y = use_secondary_value
			? samples[index - 1].secondary_value.value_or(samples[index - 1].primary_value)
			: samples[index - 1].primary_value;
		const auto current_y = use_secondary_value
			? samples[index].secondary_value.value_or(samples[index].primary_value)
			: samples[index].primary_value;
		vertices.push_back(make_astrophysics_plot_vertex(
			samples[index - 1].position,
			previous_y,
			bounds,
			color));
		vertices.push_back(make_astrophysics_plot_vertex(
			samples[index].position,
			current_y,
			bounds,
			color));
	}
	return vertices;
}

std::vector<RenderVertex> build_astrophysics_marker_vertices(
	const std::vector<visual_physics::astrophysics::Sample>& samples,
	std::array<float, 4> color) {
	std::vector<RenderVertex> vertices;
	if (samples.empty()) {
		return vertices;
	}
	const auto bounds = build_astrophysics_plot_bounds(samples);
	const auto marker_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
		return sample.active;
	});
	const auto& sample = marker_it != samples.end() ? *marker_it : samples[samples.size() / 2];
	const double dx = (bounds.max_x - bounds.min_x) * 0.015;
	const double dy = (bounds.max_y - bounds.min_y) * 0.04;
	vertices.reserve(4);
	vertices.push_back(make_astrophysics_plot_vertex(sample.position - dx, sample.primary_value, bounds, color));
	vertices.push_back(make_astrophysics_plot_vertex(sample.position + dx, sample.primary_value, bounds, color));
	vertices.push_back(make_astrophysics_plot_vertex(sample.position, sample.primary_value - dy, bounds, color));
	vertices.push_back(make_astrophysics_plot_vertex(sample.position, sample.primary_value + dy, bounds, color));
	return vertices;
}

visual_physics::dynamics::NormalizedVertex to_dynamics_ndc_point(
	double x,
	double y,
	const visual_physics::dynamics::Scenario& scenario) {
	const auto& bounds = scenario.view_bounds;
	const double normalized_x =
		((x - bounds.min_x) / std::max(bounds.max_x - bounds.min_x, 1e-6)) * 2.0 - 1.0;
	const double normalized_y =
		((y - bounds.min_y) / std::max(bounds.max_y - bounds.min_y, 1e-6)) * 2.0 - 1.0;

	return {
		static_cast<float>(std::clamp(normalized_x, -0.96, 0.96)),
		static_cast<float>(std::clamp(normalized_y, -0.96, 0.96)),
	};
}

void append_dynamics_overlay_line(
	std::vector<RenderVertex>& vertices,
	const visual_physics::dynamics::Scenario& scenario,
	const visual_physics::dynamics::Vector2& from,
	const visual_physics::dynamics::Vector2& to,
	std::array<float, 4> color) {
	const auto from_point = to_dynamics_ndc_point(from.x, from.y, scenario);
	const auto to_point = to_dynamics_ndc_point(to.x, to.y, scenario);
	vertices.push_back({from_point.x, from_point.y, color[0], color[1], color[2], color[3]});
	vertices.push_back({to_point.x, to_point.y, color[0], color[1], color[2], color[3]});
}

void append_dynamics_overlay_marker(
	std::vector<RenderVertex>& vertices,
	const visual_physics::dynamics::Scenario& scenario,
	double x,
	double y,
	float aspect_ratio,
	float half_width,
	std::array<float, 4> color) {
	const auto center = to_dynamics_ndc_point(x, y, scenario);
	const float safe_aspect = std::max(aspect_ratio, 0.001F);
	const float half_height = aspect_ratio >= 1.0F
		? half_width * aspect_ratio
		: half_width / safe_aspect;
	vertices.push_back({center.x - half_width, center.y - half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x + half_width, center.y - half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x - half_width, center.y + half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x - half_width, center.y + half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x + half_width, center.y - half_height, color[0], color[1], color[2], color[3]});
	vertices.push_back({center.x + half_width, center.y + half_height, color[0], color[1], color[2], color[3]});
}

std::vector<RenderVertex> build_dynamics_overlay_line_vertices(
	const visual_physics::dynamics::Snapshot& snapshot,
	const visual_physics::dynamics::Scenario& scenario,
	const visual_physics::dynamics::OverlayOptions& overlays) {
	std::vector<RenderVertex> vertices;
	const auto position = snapshot.position;
	if (overlays.show_momentum_vector) {
		append_dynamics_overlay_line(
			vertices,
			scenario,
			position,
			{position.x + snapshot.momentum.x * 0.18, position.y + snapshot.momentum.y * 0.18},
			{0.85F, 0.62F, 1.0F, 1.0F});
	}
	if (overlays.show_velocity_vector) {
		append_dynamics_overlay_line(
			vertices,
			scenario,
			position,
			{position.x + snapshot.velocity.x * 0.45, position.y + snapshot.velocity.y * 0.45},
			{0.45F, 0.96F, 0.66F, 1.0F});
	}
	if (overlays.show_force_vector) {
		append_dynamics_overlay_line(
			vertices,
			scenario,
			position,
			{position.x + snapshot.net_force.x * 0.12, position.y + snapshot.net_force.y * 0.12},
			{1.0F, 0.54F, 0.36F, 1.0F});
	}

	if (overlays.show_scenario_guides &&
		scenario.id == visual_physics::dynamics::ScenarioId::SpringOscillator &&
		scenario.spring_anchor.has_value()) {
		append_dynamics_overlay_line(
			vertices,
			scenario,
			*scenario.spring_anchor,
			position,
			{0.98F, 0.9F, 0.47F, 1.0F});
	}

	if (overlays.show_scenario_guides &&
		scenario.id == visual_physics::dynamics::ScenarioId::OrbitalMotion &&
		scenario.orbital_center.has_value()) {
		append_dynamics_overlay_line(
			vertices,
			scenario,
			*scenario.orbital_center,
			position,
			{0.98F, 0.9F, 0.47F, 1.0F});
	}

	if (overlays.show_scenario_guides &&
		scenario.id == visual_physics::dynamics::ScenarioId::ElasticCollision) {
		const auto& bounds = scenario.view_bounds;
		append_dynamics_overlay_line(vertices, scenario, {bounds.min_x, bounds.min_y}, {bounds.max_x, bounds.min_y}, {0.98F, 0.9F, 0.47F, 1.0F});
		append_dynamics_overlay_line(vertices, scenario, {bounds.max_x, bounds.min_y}, {bounds.max_x, bounds.max_y}, {0.98F, 0.9F, 0.47F, 1.0F});
		append_dynamics_overlay_line(vertices, scenario, {bounds.max_x, bounds.max_y}, {bounds.min_x, bounds.max_y}, {0.98F, 0.9F, 0.47F, 1.0F});
		append_dynamics_overlay_line(vertices, scenario, {bounds.min_x, bounds.max_y}, {bounds.min_x, bounds.min_y}, {0.98F, 0.9F, 0.47F, 1.0F});
	}

	return vertices;
}

std::vector<RenderVertex> build_dynamics_overlay_marker_vertices(
	const visual_physics::dynamics::Scenario& scenario,
	float aspect_ratio,
	const visual_physics::dynamics::OverlayOptions& overlays) {
	std::vector<RenderVertex> vertices;
	if (overlays.show_scenario_guides &&
		scenario.id == visual_physics::dynamics::ScenarioId::SpringOscillator &&
		scenario.spring_anchor.has_value()) {
		append_dynamics_overlay_marker(vertices, scenario, scenario.spring_anchor->x, scenario.spring_anchor->y, aspect_ratio, 0.016F, {0.98F, 0.9F, 0.47F, 1.0F});
	}
	if (overlays.show_scenario_guides &&
		scenario.id == visual_physics::dynamics::ScenarioId::OrbitalMotion &&
		scenario.orbital_center.has_value()) {
		append_dynamics_overlay_marker(vertices, scenario, scenario.orbital_center->x, scenario.orbital_center->y, aspect_ratio, 0.016F, {0.98F, 0.9F, 0.47F, 1.0F});
	}
	return vertices;
}

enum class PhysicsDomain {
	Kinematics,
	Dynamics,
	Statics,
	FluidMechanics,
	PlasmaPhysics,
	AtmosphericPhysics,
	SolidStatePhysics,
	NuclearAndParticlePhysics,
	Astrophysics,
	Relativity,
	Waves,
	Optics,
	Quantum,
	Thermodynamics,
	ElectronicsAndCircuits,
	Electromagnetism,
	ComputationalPhysics,
};

struct ProgramOptions {
	PhysicsDomain domain = PhysicsDomain::Kinematics;
	std::optional<std::string> scenario_id_text;
	std::optional<double> time_seconds;
	std::filesystem::path output_path = std::filesystem::path("build") / "phase2-kinematics.ppm";
	std::optional<std::filesystem::path> export_state_path;
	std::optional<std::filesystem::path> export_plasma_report_csv_path;
	std::optional<std::filesystem::path> export_solid_state_report_csv_path;
	std::optional<std::filesystem::path> export_nuclear_report_csv_path;
	std::optional<std::filesystem::path> export_atmospheric_report_csv_path;
	std::optional<std::filesystem::path> export_astrophysics_report_csv_path;
	std::optional<std::filesystem::path> export_relativity_report_csv_path;
	std::optional<std::filesystem::path> export_waves_report_csv_path;
	std::optional<std::filesystem::path> export_quantum_report_csv_path;
	std::optional<std::filesystem::path> export_convergence_csv_path;
	std::optional<std::filesystem::path> export_orbital_invariant_csv_path;
	std::optional<std::filesystem::path> export_spring_invariant_csv_path;
	std::optional<std::filesystem::path> import_path;
	bool roundtrip_check = false;
	RenderConfig render_config;
	std::optional<double> initial_position_x;
	std::optional<double> initial_position_y;
	std::optional<double> initial_velocity_x;
	std::optional<double> initial_velocity_y;
	std::optional<double> acceleration_x;
	std::optional<double> acceleration_y;
	std::optional<double> observer_velocity_x;
	std::optional<double> observer_velocity_y;
	std::optional<double> radius;
	std::optional<double> angular_speed;
	std::optional<double> mass;
	std::optional<double> net_force_x;
	std::optional<double> net_force_y;
	std::optional<double> gravity_x;
	std::optional<double> gravity_y;
	std::optional<double> drag_coefficient;
	std::optional<double> comparison_step_seconds;
	std::optional<double> reference_step_seconds;
	std::optional<double> spring_anchor_x;
	std::optional<double> spring_anchor_y;
	std::optional<double> spring_constant;
	std::optional<double> damping_coefficient;
	std::optional<double> orbital_center_x;
	std::optional<double> orbital_center_y;
	std::optional<double> gravitational_parameter;
	std::optional<double> restitution_coefficient;
	std::optional<double> secondary_mass;
	std::optional<double> angle_degrees;
	std::optional<double> friction_coefficient;
	std::optional<double> load_position;
	std::optional<double> load_magnitude;
	std::optional<double> source_point_x;
	std::optional<double> source_point_y;
	std::optional<double> secondary_source_point_x;
	std::optional<double> secondary_source_point_y;
	std::optional<double> probe_point_x;
	std::optional<double> probe_point_y;
	std::optional<double> charge_magnitude;
	std::optional<double> secondary_charge_magnitude;
	std::optional<double> magnetic_field_strength;
	std::optional<double> current;
	std::optional<double> loop_radius;
	std::optional<double> plate_separation;
	std::optional<double> potential_difference;
	std::optional<double> flux_rate;
	std::optional<double> inductance;
	std::optional<double> box_length_nanometers;
	std::optional<double> relative_velocity_fraction_of_light;
	std::optional<double> proper_time_seconds;
	std::optional<double> emitted_frequency_hertz;
	std::optional<double> source_velocity_fraction_of_light;
	std::optional<double> observer_velocity_fraction_of_light;
	std::optional<double> central_mass_solar_masses;
	std::optional<double> orbital_radius_astronomical_units;
	std::optional<double> orbital_eccentricity;
	std::optional<double> stellar_mass_solar_masses;
	std::optional<double> stellar_radius_solar_radii;
	std::optional<double> surface_temperature_kelvin;
	std::optional<double> sea_level_pressure_kilopascals;
	std::optional<double> scale_height_kilometers;
	std::optional<double> lapse_rate_kelvin_per_kilometer;
	std::optional<double> tropopause_height_kilometers;
	std::optional<double> environmental_lapse_rate_kelvin_per_kilometer;
	std::optional<double> parcel_temperature_excess_kelvin;
	std::optional<double> column_height_kilometers;
	std::optional<double> electron_density_per_cubic_meter;
	std::optional<double> electron_temperature_electron_volts;
	std::optional<double> perturbation_amplitude_percent;
	std::optional<double> probe_potential_volts;
	std::optional<double> magnetic_field_tesla;
	std::optional<double> plasma_current_mega_amperes;
	std::optional<double> major_radius_meters;
	std::optional<double> max_strain_percent;
	std::optional<double> youngs_modulus_gigapascals;
	std::optional<double> yield_strength_megapascals;
	std::optional<double> lattice_spacing_nanometers;
	std::optional<double> spring_constant_newtons_per_meter;
	std::optional<double> atomic_mass_amu;
	std::optional<double> band_gap_electron_volts;
	std::optional<double> effective_mass_ratio;
	std::optional<double> dopant_density_per_cubic_centimeter;
	std::optional<double> half_life_hours;
	std::optional<double> initial_population_trillions;
	std::optional<double> mass_number;
	std::optional<double> proton_count;
	std::optional<double> binding_energy_per_nucleon_mev;
	std::optional<double> beam_energy_gev;
	std::optional<double> scattering_angle_degrees;
	std::optional<double> detector_radius_meters;
	std::optional<double> distance_megaparsecs;
	std::optional<double> hubble_constant_kilometers_per_second_per_megaparsec;
	std::optional<double> orbital_radius_schwarzschild_radii;
	std::optional<double> coordinate_time_seconds;
	std::optional<double> quantum_number;
	std::optional<double> particle_energy_ev;
	std::optional<double> barrier_height_ev;
	std::optional<double> barrier_width_nanometers;
	std::optional<double> wavelength_nanometers;
	std::optional<double> slit_separation_micrometers;
	std::optional<double> slit_width_micrometers;
	std::optional<double> screen_distance_meters;
	std::optional<bool> show_momentum_vector;
	std::optional<bool> show_velocity_vector;
	std::optional<bool> show_force_vector;
	std::optional<bool> show_scenario_guides;
	std::optional<bool> show_applied_force;
	std::optional<bool> show_reaction_forces;
	std::optional<bool> show_residual_guides;
	std::optional<bool> show_field_vectors;
	std::optional<bool> show_magnetic_field;
	std::optional<bool> show_force_vectors;
	std::optional<bool> show_potential_guides;
	std::optional<bool> show_trajectory;
	std::optional<bool> show_reference_trajectory;
	std::optional<bool> show_euler_trajectory;
	std::optional<bool> show_symplectic_trajectory;
	std::optional<bool> show_rk4_trajectory;
	std::optional<bool> show_error_bars;
	std::optional<bool> show_reference_guides;
	std::optional<bool> show_comparison_curve;
	std::optional<bool> show_comparison_band;
	std::optional<bool> show_active_marker;
	std::optional<bool> show_probability_guide;
	std::optional<bool> show_potential_guide;
	std::optional<bool> show_phase_guide;
};

std::string_view to_string(PhysicsDomain domain) {
	switch (domain) {
	case PhysicsDomain::Kinematics:
		return "kinematics";
	case PhysicsDomain::Dynamics:
		return "dynamics";
	case PhysicsDomain::Statics:
		return "statics";
	case PhysicsDomain::FluidMechanics:
		return "fluid-mechanics";
	case PhysicsDomain::PlasmaPhysics:
		return "plasma-physics";
	case PhysicsDomain::AtmosphericPhysics:
		return "atmospheric-physics";
	case PhysicsDomain::SolidStatePhysics:
		return "solid-state-physics";
	case PhysicsDomain::NuclearAndParticlePhysics:
		return "nuclear-and-particle-physics";
	case PhysicsDomain::Astrophysics:
		return "astrophysics";
	case PhysicsDomain::Relativity:
		return "relativity";
	case PhysicsDomain::Waves:
		return "waves";
	case PhysicsDomain::Optics:
		return "optics";
	case PhysicsDomain::Quantum:
		return "quantum";
	case PhysicsDomain::Thermodynamics:
		return "thermodynamics";
	case PhysicsDomain::ElectronicsAndCircuits:
		return "electronics-and-circuits";
	case PhysicsDomain::Electromagnetism:
		return "electromagnetism";
	case PhysicsDomain::ComputationalPhysics:
		return "computational-physics";
	}

	throw std::runtime_error("Unknown domain");
}

double parse_double_argument(std::string_view value, std::string_view flag_name) {
	std::string owned_value(value);
	char* parse_end = nullptr;
	const double result = std::strtod(owned_value.c_str(), &parse_end);
	if (parse_end == owned_value.c_str() || *parse_end != '\0') {
		throw std::runtime_error("Invalid numeric value for " + std::string(flag_name));
	}

	return result;
}

uint32_t parse_uint32_argument(std::string_view value, std::string_view flag_name) {
	std::string owned_value(value);
	char* parse_end = nullptr;
	const unsigned long result = std::strtoul(owned_value.c_str(), &parse_end, 10);
	if (parse_end == owned_value.c_str() || *parse_end != '\0' || result == 0 ||
		result > std::numeric_limits<uint32_t>::max()) {
		throw std::runtime_error("Invalid positive integer value for " + std::string(flag_name));
	}

	return static_cast<uint32_t>(result);
}

std::size_t parse_size_argument(std::string_view value, std::string_view flag_name) {
	std::string owned_value(value);
	char* parse_end = nullptr;
	const unsigned long long result = std::strtoull(owned_value.c_str(), &parse_end, 10);
	if (parse_end == owned_value.c_str() || *parse_end != '\0' || result == 0 ||
		result > std::numeric_limits<std::size_t>::max()) {
		throw std::runtime_error("Invalid positive integer value for " + std::string(flag_name));
	}

	return static_cast<std::size_t>(result);
}

bool parse_bool_argument(std::string_view value, std::string_view flag_name) {
	if (value == "true" || value == "1") {
		return true;
	}
	if (value == "false" || value == "0") {
		return false;
	}
	throw std::runtime_error("Invalid boolean value for " + std::string(flag_name));
}

ProgramOptions parse_program_options(int argc, char** argv) {
	ProgramOptions options;

	for (int index = 1; index < argc; index += 1) {
		const std::string_view argument(argv[index]);
		auto require_numeric_value = [&](std::string_view flag_name) {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for " + std::string(flag_name));
			}
			return parse_double_argument(argv[++index], flag_name);
		};
		auto require_boolean_value = [&](std::string_view flag_name) {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for " + std::string(flag_name));
			}
			return parse_bool_argument(argv[++index], flag_name);
		};

		if (argument == "--scenario") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --scenario");
			}
			options.scenario_id_text = std::string(argv[++index]);
			continue;
		}

		if (argument == "--domain") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --domain");
			}
			const std::string_view value(argv[++index]);
			if (value == "kinematics") {
				options.domain = PhysicsDomain::Kinematics;
			} else if (value == "dynamics") {
				options.domain = PhysicsDomain::Dynamics;
			} else if (value == "statics") {
				options.domain = PhysicsDomain::Statics;
			} else if (value == "fluid-mechanics") {
				options.domain = PhysicsDomain::FluidMechanics;
			} else if (value == "plasma-physics") {
				options.domain = PhysicsDomain::PlasmaPhysics;
			} else if (value == "atmospheric-physics") {
				options.domain = PhysicsDomain::AtmosphericPhysics;
			} else if (value == "solid-state-physics") {
				options.domain = PhysicsDomain::SolidStatePhysics;
			} else if (value == "nuclear-and-particle-physics") {
				options.domain = PhysicsDomain::NuclearAndParticlePhysics;
			} else if (value == "astrophysics") {
				options.domain = PhysicsDomain::Astrophysics;
			} else if (value == "relativity") {
				options.domain = PhysicsDomain::Relativity;
			} else if (value == "waves") {
				options.domain = PhysicsDomain::Waves;
			} else if (value == "optics") {
				options.domain = PhysicsDomain::Optics;
			} else if (value == "quantum") {
				options.domain = PhysicsDomain::Quantum;
			} else if (value == "thermodynamics") {
				options.domain = PhysicsDomain::Thermodynamics;
			} else if (value == "electronics-and-circuits") {
				options.domain = PhysicsDomain::ElectronicsAndCircuits;
			} else if (value == "electromagnetism") {
				options.domain = PhysicsDomain::Electromagnetism;
			} else if (value == "computational-physics") {
				options.domain = PhysicsDomain::ComputationalPhysics;
			} else {
				throw std::runtime_error("Unknown domain: " + std::string(value));
			}
			continue;
		}

		if (argument == "--time") {
			options.time_seconds = require_numeric_value("--time");
			continue;
		}

		if (argument == "--output") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --output");
			}
			options.output_path = argv[++index];
			continue;
		}

		if (argument == "--export-state") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-state");
			}
			options.export_state_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-plasma-report-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-plasma-report-csv");
			}
			options.export_plasma_report_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-solid-state-report-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-solid-state-report-csv");
			}
			options.export_solid_state_report_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-nuclear-report-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-nuclear-report-csv");
			}
			options.export_nuclear_report_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-atmospheric-report-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-atmospheric-report-csv");
			}
			options.export_atmospheric_report_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-astrophysics-report-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-astrophysics-report-csv");
			}
			options.export_astrophysics_report_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-relativity-report-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-relativity-report-csv");
			}
			options.export_relativity_report_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-waves-report-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-waves-report-csv");
			}
			options.export_waves_report_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-quantum-report-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-quantum-report-csv");
			}
			options.export_quantum_report_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-convergence-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-convergence-csv");
			}
			options.export_convergence_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-orbital-invariant-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-orbital-invariant-csv");
			}
			options.export_orbital_invariant_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--export-spring-invariant-csv") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --export-spring-invariant-csv");
			}
			options.export_spring_invariant_csv_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--width") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --width");
			}
			options.render_config.width = parse_uint32_argument(argv[++index], "--width");
			continue;
		}

		if (argument == "--height") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --height");
			}
			options.render_config.height = parse_uint32_argument(argv[++index], "--height");
			continue;
		}

		if (argument == "--sample-count") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --sample-count");
			}
			options.render_config.sample_count = parse_size_argument(argv[++index], "--sample-count");
			continue;
		}

		if (argument == "--import") {
			if (index + 1 >= argc) {
				throw std::runtime_error("Missing value for --import");
			}
			options.import_path = std::filesystem::path(argv[++index]);
			continue;
		}

		if (argument == "--relative-velocity-fraction-of-light") {
			options.relative_velocity_fraction_of_light =
				require_numeric_value("--relative-velocity-fraction-of-light");
			continue;
		}

		if (argument == "--proper-time-seconds") {
			options.proper_time_seconds = require_numeric_value("--proper-time-seconds");
			continue;
		}

		if (argument == "--emitted-frequency-hertz") {
			options.emitted_frequency_hertz = require_numeric_value("--emitted-frequency-hertz");
			continue;
		}

		if (argument == "--source-velocity-fraction-of-light") {
			options.source_velocity_fraction_of_light =
				require_numeric_value("--source-velocity-fraction-of-light");
			continue;
		}

		if (argument == "--observer-velocity-fraction-of-light") {
			options.observer_velocity_fraction_of_light =
				require_numeric_value("--observer-velocity-fraction-of-light");
			continue;
		}

		if (argument == "--central-mass-solar-masses") {
			options.central_mass_solar_masses =
				require_numeric_value("--central-mass-solar-masses");
			continue;
		}

		if (argument == "--orbital-radius-astronomical-units") {
			options.orbital_radius_astronomical_units =
				require_numeric_value("--orbital-radius-astronomical-units");
			continue;
		}

		if (argument == "--orbital-eccentricity") {
			options.orbital_eccentricity = require_numeric_value("--orbital-eccentricity");
			continue;
		}

		if (argument == "--stellar-mass-solar-masses") {
			options.stellar_mass_solar_masses =
				require_numeric_value("--stellar-mass-solar-masses");
			continue;
		}

		if (argument == "--stellar-radius-solar-radii") {
			options.stellar_radius_solar_radii =
				require_numeric_value("--stellar-radius-solar-radii");
			continue;
		}

		if (argument == "--surface-temperature-kelvin") {
			options.surface_temperature_kelvin =
				require_numeric_value("--surface-temperature-kelvin");
			continue;
		}

		if (argument == "--sea-level-pressure-kilopascals") {
			options.sea_level_pressure_kilopascals =
				require_numeric_value("--sea-level-pressure-kilopascals");
			continue;
		}

		if (argument == "--scale-height-kilometers") {
			options.scale_height_kilometers =
				require_numeric_value("--scale-height-kilometers");
			continue;
		}

		if (argument == "--lapse-rate-kelvin-per-kilometer") {
			options.lapse_rate_kelvin_per_kilometer =
				require_numeric_value("--lapse-rate-kelvin-per-kilometer");
			continue;
		}

		if (argument == "--tropopause-height-kilometers") {
			options.tropopause_height_kilometers =
				require_numeric_value("--tropopause-height-kilometers");
			continue;
		}

		if (argument == "--environmental-lapse-rate-kilvin-per-kilometer") {
			options.environmental_lapse_rate_kelvin_per_kilometer =
				require_numeric_value("--environmental-lapse-rate-kilvin-per-kilometer");
			continue;
		}

		if (argument == "--environmental-lapse-rate-kelvin-per-kilometer") {
			options.environmental_lapse_rate_kelvin_per_kilometer =
				require_numeric_value("--environmental-lapse-rate-kelvin-per-kilometer");
			continue;
		}

		if (argument == "--parcel-temperature-excess-kelvin") {
			options.parcel_temperature_excess_kelvin =
				require_numeric_value("--parcel-temperature-excess-kelvin");
			continue;
		}

		if (argument == "--column-height-kilometers") {
			options.column_height_kilometers =
				require_numeric_value("--column-height-kilometers");
			continue;
		}

		if (argument == "--electron-density-per-cubic-meter") {
			options.electron_density_per_cubic_meter =
				require_numeric_value("--electron-density-per-cubic-meter");
			continue;
		}

		if (argument == "--electron-temperature-electron-volts") {
			options.electron_temperature_electron_volts =
				require_numeric_value("--electron-temperature-electron-volts");
			continue;
		}

		if (argument == "--perturbation-amplitude-percent") {
			options.perturbation_amplitude_percent =
				require_numeric_value("--perturbation-amplitude-percent");
			continue;
		}

		if (argument == "--probe-potential-volts") {
			options.probe_potential_volts =
				require_numeric_value("--probe-potential-volts");
			continue;
		}

		if (argument == "--magnetic-field-tesla") {
			options.magnetic_field_tesla =
				require_numeric_value("--magnetic-field-tesla");
			continue;
		}

		if (argument == "--plasma-current-mega-amperes") {
			options.plasma_current_mega_amperes =
				require_numeric_value("--plasma-current-mega-amperes");
			continue;
		}

		if (argument == "--major-radius-meters") {
			options.major_radius_meters =
				require_numeric_value("--major-radius-meters");
			continue;
		}

		if (argument == "--max-strain-percent") {
			options.max_strain_percent = require_numeric_value("--max-strain-percent");
			continue;
		}

		if (argument == "--youngs-modulus-gigapascals") {
			options.youngs_modulus_gigapascals =
				require_numeric_value("--youngs-modulus-gigapascals");
			continue;
		}

		if (argument == "--yield-strength-megapascals") {
			options.yield_strength_megapascals =
				require_numeric_value("--yield-strength-megapascals");
			continue;
		}

		if (argument == "--lattice-spacing-nanometers") {
			options.lattice_spacing_nanometers =
				require_numeric_value("--lattice-spacing-nanometers");
			continue;
		}

		if (argument == "--spring-constant-newtons-per-meter") {
			options.spring_constant_newtons_per_meter =
				require_numeric_value("--spring-constant-newtons-per-meter");
			continue;
		}

		if (argument == "--atomic-mass-amu") {
			options.atomic_mass_amu = require_numeric_value("--atomic-mass-amu");
			continue;
		}

		if (argument == "--band-gap-electron-volts") {
			options.band_gap_electron_volts =
				require_numeric_value("--band-gap-electron-volts");
			continue;
		}

		if (argument == "--effective-mass-ratio") {
			options.effective_mass_ratio = require_numeric_value("--effective-mass-ratio");
			continue;
		}

		if (argument == "--dopant-density-per-cubic-centimeter") {
			options.dopant_density_per_cubic_centimeter =
				require_numeric_value("--dopant-density-per-cubic-centimeter");
			continue;
		}

		if (argument == "--half-life-hours") {
			options.half_life_hours = require_numeric_value("--half-life-hours");
			continue;
		}

		if (argument == "--initial-population-trillions") {
			options.initial_population_trillions =
				require_numeric_value("--initial-population-trillions");
			continue;
		}

		if (argument == "--mass-number") {
			options.mass_number = require_numeric_value("--mass-number");
			continue;
		}

		if (argument == "--proton-count") {
			options.proton_count = require_numeric_value("--proton-count");
			continue;
		}

		if (argument == "--binding-energy-per-nucleon-mev") {
			options.binding_energy_per_nucleon_mev =
				require_numeric_value("--binding-energy-per-nucleon-mev");
			continue;
		}

		if (argument == "--beam-energy-gev") {
			options.beam_energy_gev = require_numeric_value("--beam-energy-gev");
			continue;
		}

		if (argument == "--scattering-angle-degrees") {
			options.scattering_angle_degrees =
				require_numeric_value("--scattering-angle-degrees");
			continue;
		}

		if (argument == "--detector-radius-meters") {
			options.detector_radius_meters =
				require_numeric_value("--detector-radius-meters");
			continue;
		}

		if (argument == "--distance-megaparsecs") {
			options.distance_megaparsecs = require_numeric_value("--distance-megaparsecs");
			continue;
		}

		if (argument == "--hubble-constant-kilometers-per-second-per-megaparsec") {
			options.hubble_constant_kilometers_per_second_per_megaparsec =
				require_numeric_value("--hubble-constant-kilometers-per-second-per-megaparsec");
			continue;
		}

		if (argument == "--orbital-radius-schwarzschild-radii") {
			options.orbital_radius_schwarzschild_radii =
				require_numeric_value("--orbital-radius-schwarzschild-radii");
			continue;
		}

		if (argument == "--coordinate-time-seconds") {
			options.coordinate_time_seconds = require_numeric_value("--coordinate-time-seconds");
			continue;
		}

		if (argument == "--roundtrip-check") {
			options.roundtrip_check = true;
			continue;
		}

		if (argument == "--list-scenarios") {
			std::cout << "Available scenarios (" << to_string(options.domain) << "):\n";
			if (options.domain == PhysicsDomain::Kinematics) {
				std::cout << "  constant-velocity\n"
				          << "  constant-acceleration\n"
				          << "  projectile\n"
				          << "  relative-motion\n"
				          << "  uniform-circular-motion\n";
			} else if (options.domain == PhysicsDomain::Dynamics) {
				std::cout << "  constant-force\n"
				          << "  drag-projectile\n"
				          << "  spring-oscillator\n"
				          << "  orbital-motion\n"
				          << "  elastic-collision\n";
			} else if (options.domain == PhysicsDomain::Electromagnetism) {
				std::cout << "  point-charge-electrostatics\n"
				          << "  moving-charge-magnetic-field\n"
				          << "  current-loop-magnetic-field\n"
				          << "  capacitor-potential-field\n"
				          << "  electromagnetic-induction\n";
			} else if (options.domain == PhysicsDomain::FluidMechanics) {
				std::cout << "  buoyancy-block\n"
				          << "  poiseuille-pipe\n"
				          << "  open-channel-flow\n";
			} else if (options.domain == PhysicsDomain::PlasmaPhysics) {
				std::cout << "  plasma-oscillation\n"
				          << "  debye-screening\n"
				          << "  magnetic-confinement\n";
			} else if (options.domain == PhysicsDomain::AtmosphericPhysics) {
				std::cout << "  barometric-formula\n"
				          << "  adiabatic-lapse-rate\n"
				          << "  convection-column\n";
			} else if (options.domain == PhysicsDomain::SolidStatePhysics) {
				std::cout << "  crystal-elasticity\n"
				          << "  phonon-dispersion\n"
				          << "  electronic-structure\n";
			} else if (options.domain == PhysicsDomain::NuclearAndParticlePhysics) {
				std::cout << "  radioactive-decay\n"
				          << "  binding-energy-curve\n"
				          << "  proton-proton-collision\n";
			} else if (options.domain == PhysicsDomain::Astrophysics) {
				std::cout << "  planetary-orbit\n"
				          << "  stellar-luminosity\n"
				          << "  hubble-expansion\n";
			} else if (options.domain == PhysicsDomain::Relativity) {
				std::cout << "  time-dilation\n"
				          << "  relativistic-doppler\n"
				          << "  gravitational-time-dilation\n";
			} else if (options.domain == PhysicsDomain::Waves) {
				std::cout << "  standing-wave\n"
				          << "  traveling-wave\n"
				          << "  doppler-effect\n";
			} else if (options.domain == PhysicsDomain::Optics) {
				std::cout << "  snell-refraction\n"
				          << "  thin-lens-imaging\n"
				          << "  single-slit-diffraction\n";
			} else if (options.domain == PhysicsDomain::Quantum) {
				std::cout << "  particle-in-a-box\n"
				          << "  finite-potential-well-tunneling\n"
				          << "  double-slit-interference\n";
			} else if (options.domain == PhysicsDomain::Thermodynamics) {
				std::cout << "  ideal-gas-state\n"
				          << "  heat-conduction-slab\n"
				          << "  carnot-cycle\n";
			} else if (options.domain == PhysicsDomain::ElectronicsAndCircuits) {
				std::cout << "  rc-transient\n"
				          << "  full-wave-rectifier\n"
				          << "  half-wave-rectifier\n"
				          << "  rlc-response\n"
				          << "  smoothed-rectifier\n"
				          << "  rc-high-pass\n"
				          << "  rlc-resonance\n"
				          << "  rl-high-pass\n"
				          << "  rl-low-pass\n"
				          << "  resistor-network\n"
				          << "  rl-transient\n"
				          << "  rc-low-pass\n";
			} else if (options.domain == PhysicsDomain::ComputationalPhysics) {
				std::cout << "  projectile-solver-comparison\n"
				          << "  orbital-solver-comparison\n"
				          << "  spring-oscillator-comparison\n";
			} else {
				std::cout << "  beam-support\n"
				          << "  inclined-plane\n"
				          << "  pulley-equilibrium\n";
			}
			std::exit(0);
		}

		if (argument == "--initial-position-x") {
			options.initial_position_x = require_numeric_value("--initial-position-x");
			continue;
		}

		if (argument == "--initial-position-y") {
			options.initial_position_y = require_numeric_value("--initial-position-y");
			continue;
		}

		if (argument == "--initial-velocity-x") {
			options.initial_velocity_x = require_numeric_value("--initial-velocity-x");
			continue;
		}

		if (argument == "--initial-velocity-y") {
			options.initial_velocity_y = require_numeric_value("--initial-velocity-y");
			continue;
		}

		if (argument == "--acceleration-x") {
			options.acceleration_x = require_numeric_value("--acceleration-x");
			continue;
		}

		if (argument == "--acceleration-y") {
			options.acceleration_y = require_numeric_value("--acceleration-y");
			continue;
		}

		if (argument == "--observer-velocity-x") {
			options.observer_velocity_x = require_numeric_value("--observer-velocity-x");
			continue;
		}

		if (argument == "--observer-velocity-y") {
			options.observer_velocity_y = require_numeric_value("--observer-velocity-y");
			continue;
		}

		if (argument == "--radius") {
			options.radius = require_numeric_value("--radius");
			continue;
		}

		if (argument == "--angular-speed") {
			options.angular_speed = require_numeric_value("--angular-speed");
			continue;
		}

		if (argument == "--mass") {
			options.mass = require_numeric_value("--mass");
			continue;
		}

		if (argument == "--net-force-x") {
			options.net_force_x = require_numeric_value("--net-force-x");
			continue;
		}

		if (argument == "--net-force-y") {
			options.net_force_y = require_numeric_value("--net-force-y");
			continue;
		}

		if (argument == "--gravity-x") {
			options.gravity_x = require_numeric_value("--gravity-x");
			continue;
		}

		if (argument == "--gravity-y") {
			options.gravity_y = require_numeric_value("--gravity-y");
			continue;
		}

		if (argument == "--drag-coefficient") {
			options.drag_coefficient = require_numeric_value("--drag-coefficient");
			continue;
		}

		if (argument == "--comparison-step-seconds") {
			options.comparison_step_seconds = require_numeric_value("--comparison-step-seconds");
			continue;
		}

		if (argument == "--reference-step-seconds") {
			options.reference_step_seconds = require_numeric_value("--reference-step-seconds");
			continue;
		}

		if (argument == "--spring-anchor-x") {
			options.spring_anchor_x = require_numeric_value("--spring-anchor-x");
			continue;
		}

		if (argument == "--spring-anchor-y") {
			options.spring_anchor_y = require_numeric_value("--spring-anchor-y");
			continue;
		}

		if (argument == "--spring-constant") {
			options.spring_constant = require_numeric_value("--spring-constant");
			continue;
		}

		if (argument == "--damping-coefficient") {
			options.damping_coefficient = require_numeric_value("--damping-coefficient");
			continue;
		}

		if (argument == "--orbital-center-x") {
			options.orbital_center_x = require_numeric_value("--orbital-center-x");
			continue;
		}

		if (argument == "--orbital-center-y") {
			options.orbital_center_y = require_numeric_value("--orbital-center-y");
			continue;
		}

		if (argument == "--gravitational-parameter") {
			options.gravitational_parameter = require_numeric_value("--gravitational-parameter");
			continue;
		}

		if (argument == "--restitution-coefficient") {
			options.restitution_coefficient = require_numeric_value("--restitution-coefficient");
			continue;
		}

		if (argument == "--secondary-mass") {
			options.secondary_mass = require_numeric_value("--secondary-mass");
			continue;
		}

		if (argument == "--angle-degrees") {
			options.angle_degrees = require_numeric_value("--angle-degrees");
			continue;
		}

		if (argument == "--friction-coefficient") {
			options.friction_coefficient = require_numeric_value("--friction-coefficient");
			continue;
		}

		if (argument == "--load-position") {
			options.load_position = require_numeric_value("--load-position");
			continue;
		}

		if (argument == "--load-magnitude") {
			options.load_magnitude = require_numeric_value("--load-magnitude");
			continue;
		}

		if (argument == "--source-point-x") {
			options.source_point_x = require_numeric_value("--source-point-x");
			continue;
		}

		if (argument == "--source-point-y") {
			options.source_point_y = require_numeric_value("--source-point-y");
			continue;
		}

		if (argument == "--secondary-source-point-x") {
			options.secondary_source_point_x = require_numeric_value("--secondary-source-point-x");
			continue;
		}

		if (argument == "--secondary-source-point-y") {
			options.secondary_source_point_y = require_numeric_value("--secondary-source-point-y");
			continue;
		}

		if (argument == "--probe-point-x") {
			options.probe_point_x = require_numeric_value("--probe-point-x");
			continue;
		}

		if (argument == "--probe-point-y") {
			options.probe_point_y = require_numeric_value("--probe-point-y");
			continue;
		}

		if (argument == "--charge-magnitude") {
			options.charge_magnitude = require_numeric_value("--charge-magnitude");
			continue;
		}

		if (argument == "--secondary-charge-magnitude") {
			options.secondary_charge_magnitude = require_numeric_value("--secondary-charge-magnitude");
			continue;
		}

		if (argument == "--magnetic-field-strength") {
			options.magnetic_field_strength = require_numeric_value("--magnetic-field-strength");
			continue;
		}

		if (argument == "--current") {
			options.current = require_numeric_value("--current");
			continue;
		}

		if (argument == "--loop-radius") {
			options.loop_radius = require_numeric_value("--loop-radius");
			continue;
		}

		if (argument == "--plate-separation") {
			options.plate_separation = require_numeric_value("--plate-separation");
			continue;
		}

		if (argument == "--potential-difference") {
			options.potential_difference = require_numeric_value("--potential-difference");
			continue;
		}

		if (argument == "--flux-rate") {
			options.flux_rate = require_numeric_value("--flux-rate");
			continue;
		}

		if (argument == "--inductance") {
			options.inductance = require_numeric_value("--inductance");
			continue;
		}

		if (argument == "--box-length-nanometers") {
			options.box_length_nanometers = require_numeric_value("--box-length-nanometers");
			continue;
		}

		if (argument == "--quantum-number") {
			options.quantum_number = require_numeric_value("--quantum-number");
			continue;
		}

		if (argument == "--particle-energy-ev") {
			options.particle_energy_ev = require_numeric_value("--particle-energy-ev");
			continue;
		}

		if (argument == "--barrier-height-ev") {
			options.barrier_height_ev = require_numeric_value("--barrier-height-ev");
			continue;
		}

		if (argument == "--barrier-width-nanometers") {
			options.barrier_width_nanometers = require_numeric_value("--barrier-width-nanometers");
			continue;
		}

		if (argument == "--wavelength-nanometers") {
			options.wavelength_nanometers = require_numeric_value("--wavelength-nanometers");
			continue;
		}

		if (argument == "--slit-separation-micrometers") {
			options.slit_separation_micrometers = require_numeric_value("--slit-separation-micrometers");
			continue;
		}

		if (argument == "--slit-width-micrometers") {
			options.slit_width_micrometers = require_numeric_value("--slit-width-micrometers");
			continue;
		}

		if (argument == "--screen-distance-meters") {
			options.screen_distance_meters = require_numeric_value("--screen-distance-meters");
			continue;
		}

		if (argument == "--show-momentum-vector") {
			options.show_momentum_vector = require_boolean_value("--show-momentum-vector");
			continue;
		}

		if (argument == "--show-velocity-vector") {
			options.show_velocity_vector = require_boolean_value("--show-velocity-vector");
			continue;
		}

		if (argument == "--show-force-vector") {
			options.show_force_vector = require_boolean_value("--show-force-vector");
			continue;
		}

		if (argument == "--show-scenario-guides") {
			options.show_scenario_guides = require_boolean_value("--show-scenario-guides");
			continue;
		}

		if (argument == "--show-applied-force") {
			options.show_applied_force = require_boolean_value("--show-applied-force");
			continue;
		}

		if (argument == "--show-reaction-forces") {
			options.show_reaction_forces = require_boolean_value("--show-reaction-forces");
			continue;
		}

		if (argument == "--show-residual-guides") {
			options.show_residual_guides = require_boolean_value("--show-residual-guides");
			continue;
		}

		if (argument == "--show-field-vectors") {
			options.show_field_vectors = require_boolean_value("--show-field-vectors");
			continue;
		}

		if (argument == "--show-magnetic-field") {
			options.show_magnetic_field = require_boolean_value("--show-magnetic-field");
			continue;
		}

		if (argument == "--show-force-vectors") {
			options.show_force_vectors = require_boolean_value("--show-force-vectors");
			continue;
		}

		if (argument == "--show-potential-guides") {
			options.show_potential_guides = require_boolean_value("--show-potential-guides");
			continue;
		}

		if (argument == "--show-trajectory") {
			options.show_trajectory = require_boolean_value("--show-trajectory");
			continue;
		}

		if (argument == "--show-reference-trajectory") {
			options.show_reference_trajectory = require_boolean_value("--show-reference-trajectory");
			continue;
		}

		if (argument == "--show-euler-trajectory") {
			options.show_euler_trajectory = require_boolean_value("--show-euler-trajectory");
			continue;
		}

		if (argument == "--show-symplectic-trajectory") {
			options.show_symplectic_trajectory = require_boolean_value("--show-symplectic-trajectory");
			continue;
		}

		if (argument == "--show-rk4-trajectory") {
			options.show_rk4_trajectory = require_boolean_value("--show-rk4-trajectory");
			continue;
		}

		if (argument == "--show-error-bars") {
			options.show_error_bars = require_boolean_value("--show-error-bars");
			continue;
		}

		if (argument == "--show-reference-guides") {
			options.show_reference_guides = require_boolean_value("--show-reference-guides");
			continue;
		}

		if (argument == "--show-comparison-curve") {
			options.show_comparison_curve = require_boolean_value("--show-comparison-curve");
			continue;
		}

		if (argument == "--show-comparison-band") {
			options.show_comparison_band = require_boolean_value("--show-comparison-band");
			continue;
		}

		if (argument == "--show-active-marker") {
			options.show_active_marker = require_boolean_value("--show-active-marker");
			continue;
		}

		if (argument == "--show-probability-guide") {
			options.show_probability_guide = require_boolean_value("--show-probability-guide");
			continue;
		}

		if (argument == "--show-potential-guide") {
			options.show_potential_guide = require_boolean_value("--show-potential-guide");
			continue;
		}

		if (argument == "--show-phase-guide") {
			options.show_phase_guide = require_boolean_value("--show-phase-guide");
			continue;
		}

		throw std::runtime_error("Unknown argument: " + std::string(argument));
	}

	return options;
}

visual_physics::kinematics::Scenario apply_program_overrides(
	visual_physics::kinematics::Scenario scenario,
	const ProgramOptions& options) {
	if (options.initial_position_x.has_value()) {
		scenario.initial_position.x = *options.initial_position_x;
	}
	if (options.initial_position_y.has_value()) {
		scenario.initial_position.y = *options.initial_position_y;
	}
	if (options.initial_velocity_x.has_value()) {
		scenario.initial_velocity.x = *options.initial_velocity_x;
	}
	if (options.initial_velocity_y.has_value()) {
		scenario.initial_velocity.y = *options.initial_velocity_y;
	}
	if (options.acceleration_x.has_value()) {
		scenario.acceleration.x = *options.acceleration_x;
	}
	if (options.acceleration_y.has_value()) {
		scenario.acceleration.y = *options.acceleration_y;
	}
	if (options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value()) {
		auto observer_velocity = scenario.observer_velocity.value_or(
			visual_physics::kinematics::Vector2{0.0, 0.0});
		if (options.observer_velocity_x.has_value()) {
			observer_velocity.x = *options.observer_velocity_x;
		}
		if (options.observer_velocity_y.has_value()) {
			observer_velocity.y = *options.observer_velocity_y;
		}
		scenario.observer_velocity = observer_velocity;
	}
	if (options.radius.has_value()) {
		scenario.radius = *options.radius;
	}
	if (options.angular_speed.has_value()) {
		scenario.angular_speed = *options.angular_speed;
	}

	return scenario;
}

visual_physics::dynamics::Scenario apply_program_overrides(
	visual_physics::dynamics::Scenario scenario,
	const ProgramOptions& options) {
	if (options.initial_position_x.has_value()) {
		scenario.initial_position.x = *options.initial_position_x;
	}
	if (options.initial_position_y.has_value()) {
		scenario.initial_position.y = *options.initial_position_y;
	}
	if (options.initial_velocity_x.has_value()) {
		scenario.initial_velocity.x = *options.initial_velocity_x;
	}
	if (options.initial_velocity_y.has_value()) {
		scenario.initial_velocity.y = *options.initial_velocity_y;
	}
	if (options.mass.has_value()) {
		scenario.mass = std::max(*options.mass, 0.1);
	}
	if (options.net_force_x.has_value() || options.net_force_y.has_value()) {
		auto net_force = scenario.net_force.value_or(visual_physics::dynamics::Vector2{0.0, 0.0});
		if (options.net_force_x.has_value()) {
			net_force.x = *options.net_force_x;
		}
		if (options.net_force_y.has_value()) {
			net_force.y = *options.net_force_y;
		}
		scenario.net_force = net_force;
	}
	if (options.gravity_x.has_value() || options.gravity_y.has_value()) {
		auto gravity = scenario.gravity.value_or(visual_physics::dynamics::Vector2{0.0, -9.81});
		if (options.gravity_x.has_value()) {
			gravity.x = *options.gravity_x;
		}
		if (options.gravity_y.has_value()) {
			gravity.y = *options.gravity_y;
		}
		scenario.gravity = gravity;
	}
	if (options.drag_coefficient.has_value()) {
		scenario.drag_coefficient = std::max(*options.drag_coefficient, 0.0);
	}
	if (options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value()) {
		auto spring_anchor = scenario.spring_anchor.value_or(visual_physics::dynamics::Vector2{0.0, 0.0});
		if (options.spring_anchor_x.has_value()) {
			spring_anchor.x = *options.spring_anchor_x;
		}
		if (options.spring_anchor_y.has_value()) {
			spring_anchor.y = *options.spring_anchor_y;
		}
		scenario.spring_anchor = spring_anchor;
	}
	if (options.spring_constant.has_value()) {
		scenario.spring_constant = std::max(*options.spring_constant, 0.1);
	}
	if (options.damping_coefficient.has_value()) {
		scenario.damping_coefficient = std::max(*options.damping_coefficient, 0.0);
	}
	if (options.orbital_center_x.has_value() || options.orbital_center_y.has_value()) {
		auto orbital_center = scenario.orbital_center.value_or(visual_physics::dynamics::Vector2{0.0, 0.0});
		if (options.orbital_center_x.has_value()) {
			orbital_center.x = *options.orbital_center_x;
		}
		if (options.orbital_center_y.has_value()) {
			orbital_center.y = *options.orbital_center_y;
		}
		scenario.orbital_center = orbital_center;
	}
	if (options.gravitational_parameter.has_value()) {
		scenario.gravitational_parameter = std::max(*options.gravitational_parameter, 0.1);
	}
	if (options.restitution_coefficient.has_value()) {
		scenario.restitution_coefficient = std::clamp(*options.restitution_coefficient, 0.0, 1.0);
	}

	return scenario;
}

visual_physics::computational_physics::Scenario apply_program_overrides(
	visual_physics::computational_physics::Scenario scenario,
	const ProgramOptions& options) {
	if (options.initial_position_x.has_value()) {
		scenario.initial_position.x = *options.initial_position_x;
	}
	if (options.initial_position_y.has_value()) {
		scenario.initial_position.y = *options.initial_position_y;
	}
	if (options.initial_velocity_x.has_value()) {
		scenario.initial_velocity.x = *options.initial_velocity_x;
	}
	if (options.initial_velocity_y.has_value()) {
		scenario.initial_velocity.y = *options.initial_velocity_y;
	}
	if (options.mass.has_value()) {
		scenario.mass = std::max(*options.mass, 0.1);
	}
	if (options.gravity_x.has_value()) {
		scenario.gravity.x = *options.gravity_x;
	}
	if (options.gravity_y.has_value()) {
		scenario.gravity.y = *options.gravity_y;
	}
	if (options.drag_coefficient.has_value()) {
		scenario.drag_coefficient = std::max(*options.drag_coefficient, 0.0);
	}
	if (options.orbital_center_x.has_value() || options.orbital_center_y.has_value()) {
		auto orbital_center = scenario.orbital_center.value_or(
			visual_physics::computational_physics::Vector2{0.0, 0.0});
		if (options.orbital_center_x.has_value()) {
			orbital_center.x = *options.orbital_center_x;
		}
		if (options.orbital_center_y.has_value()) {
			orbital_center.y = *options.orbital_center_y;
		}
		scenario.orbital_center = orbital_center;
	}
	if (options.gravitational_parameter.has_value()) {
		scenario.gravitational_parameter = std::max(*options.gravitational_parameter, 0.1);
	}
	if (options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value()) {
		auto spring_anchor = scenario.spring_anchor.value_or(
			visual_physics::computational_physics::Vector2{0.0, 0.0});
		if (options.spring_anchor_x.has_value()) {
			spring_anchor.x = *options.spring_anchor_x;
		}
		if (options.spring_anchor_y.has_value()) {
			spring_anchor.y = *options.spring_anchor_y;
		}
		scenario.spring_anchor = spring_anchor;
	}
	if (options.spring_constant.has_value()) {
		scenario.spring_constant = std::max(*options.spring_constant, 0.1);
	}
	if (options.damping_coefficient.has_value()) {
		scenario.damping_coefficient = std::max(*options.damping_coefficient, 0.0);
	}
	if (options.comparison_step_seconds.has_value()) {
		scenario.comparison_step_seconds = std::clamp(*options.comparison_step_seconds, 0.02, 0.5);
	}
	if (options.reference_step_seconds.has_value()) {
		scenario.reference_step_seconds = std::clamp(*options.reference_step_seconds, 1.0 / 2000.0, 0.05);
	}
	return scenario;
}

visual_physics::statics::Scenario apply_program_overrides(
	visual_physics::statics::Scenario scenario,
	const ProgramOptions& options) {
	if (options.mass.has_value()) {
		scenario.mass = std::max(*options.mass, 0.0);
	}
	if (options.secondary_mass.has_value()) {
		scenario.secondary_mass = std::max(*options.secondary_mass, 0.0);
	}
	if (options.angle_degrees.has_value()) {
		scenario.angle_degrees = std::clamp(*options.angle_degrees, 0.0, 85.0);
	}
	if (options.friction_coefficient.has_value()) {
		scenario.friction_coefficient = std::max(*options.friction_coefficient, 0.0);
	}
	if (options.load_position.has_value()) {
		scenario.load_position = *options.load_position;
	}
	if (options.load_magnitude.has_value()) {
		scenario.load_magnitude = std::max(*options.load_magnitude, 0.0);
	}
	return scenario;
}

visual_physics::electromagnetism::Scenario apply_program_overrides(
	visual_physics::electromagnetism::Scenario scenario,
	const ProgramOptions& options) {
	if (options.initial_position_x.has_value()) {
		scenario.initial_position.x = *options.initial_position_x;
	}
	if (options.initial_position_y.has_value()) {
		scenario.initial_position.y = *options.initial_position_y;
	}
	if (options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value()) {
		auto initial_velocity =
			scenario.initial_velocity.value_or(visual_physics::electromagnetism::Vector2{0.0, 0.0});
		if (options.initial_velocity_x.has_value()) {
			initial_velocity.x = *options.initial_velocity_x;
		}
		if (options.initial_velocity_y.has_value()) {
			initial_velocity.y = *options.initial_velocity_y;
		}
		scenario.initial_velocity = initial_velocity;
	}
	if (options.source_point_x.has_value() || options.source_point_y.has_value()) {
		auto source_point =
			scenario.source_point.value_or(visual_physics::electromagnetism::Vector2{0.0, 0.0});
		if (options.source_point_x.has_value()) {
			source_point.x = *options.source_point_x;
		}
		if (options.source_point_y.has_value()) {
			source_point.y = *options.source_point_y;
		}
		scenario.source_point = source_point;
	}
	if (options.secondary_source_point_x.has_value() || options.secondary_source_point_y.has_value()) {
		auto secondary_source_point = scenario.secondary_source_point.value_or(
			visual_physics::electromagnetism::Vector2{0.0, 0.0});
		if (options.secondary_source_point_x.has_value()) {
			secondary_source_point.x = *options.secondary_source_point_x;
		}
		if (options.secondary_source_point_y.has_value()) {
			secondary_source_point.y = *options.secondary_source_point_y;
		}
		scenario.secondary_source_point = secondary_source_point;
	}
	if (options.probe_point_x.has_value() || options.probe_point_y.has_value()) {
		auto probe_point =
			scenario.probe_point.value_or(visual_physics::electromagnetism::Vector2{0.0, 0.0});
		if (options.probe_point_x.has_value()) {
			probe_point.x = *options.probe_point_x;
		}
		if (options.probe_point_y.has_value()) {
			probe_point.y = *options.probe_point_y;
		}
		scenario.probe_point = probe_point;
	}
	if (options.charge_magnitude.has_value()) {
		scenario.charge_magnitude = *options.charge_magnitude;
	}
	if (options.secondary_charge_magnitude.has_value()) {
		scenario.secondary_charge_magnitude = *options.secondary_charge_magnitude;
	}
	if (options.mass.has_value()) {
		scenario.mass = std::max(*options.mass, 0.1);
	}
	if (options.magnetic_field_strength.has_value()) {
		scenario.magnetic_field_strength = *options.magnetic_field_strength;
	}
	if (options.current.has_value()) {
		scenario.current = *options.current;
	}
	if (options.loop_radius.has_value()) {
		scenario.loop_radius = std::max(*options.loop_radius, 0.1);
	}
	if (options.plate_separation.has_value()) {
		scenario.plate_separation = std::max(*options.plate_separation, 0.1);
	}
	if (options.potential_difference.has_value()) {
		scenario.potential_difference = *options.potential_difference;
	}
	if (options.flux_rate.has_value()) {
		scenario.flux_rate = *options.flux_rate;
	}
	if (options.inductance.has_value()) {
		scenario.inductance = std::max(*options.inductance, 0.1);
	}
	return scenario;
}

visual_physics::quantum::Scenario apply_program_overrides(
	visual_physics::quantum::Scenario scenario,
	const ProgramOptions& options) {
	if (options.box_length_nanometers.has_value()) {
		scenario.box_length_nanometers = std::max(*options.box_length_nanometers, 0.1);
	}
	if (options.quantum_number.has_value()) {
		scenario.quantum_number = std::max(1.0, std::round(*options.quantum_number));
	}
	if (options.particle_energy_ev.has_value()) {
		scenario.particle_energy_ev = std::max(*options.particle_energy_ev, 0.05);
	}
	if (options.barrier_height_ev.has_value()) {
		scenario.barrier_height_ev = std::max(*options.barrier_height_ev, 0.06);
	}
	if (options.barrier_width_nanometers.has_value()) {
		scenario.barrier_width_nanometers = std::max(*options.barrier_width_nanometers, 0.05);
	}
	if (options.wavelength_nanometers.has_value()) {
		scenario.wavelength_nanometers = std::max(*options.wavelength_nanometers, 100.0);
	}
	if (options.slit_separation_micrometers.has_value()) {
		scenario.slit_separation_micrometers = std::max(*options.slit_separation_micrometers, 1.0);
	}
	if (options.slit_width_micrometers.has_value()) {
		scenario.slit_width_micrometers = std::max(*options.slit_width_micrometers, 1.0);
	}
	if (options.screen_distance_meters.has_value()) {
		scenario.screen_distance_meters = std::max(*options.screen_distance_meters, 0.1);
	}
	return scenario;
}

visual_physics::relativity::Scenario apply_program_overrides(
	visual_physics::relativity::Scenario scenario,
	const ProgramOptions& options) {
	if (options.relative_velocity_fraction_of_light.has_value()) {
		scenario.relative_velocity_fraction_of_light =
			std::clamp(*options.relative_velocity_fraction_of_light, -0.95, 0.95);
	}
	if (options.proper_time_seconds.has_value()) {
		scenario.proper_time_seconds = std::max(*options.proper_time_seconds, 0.01);
	}
	if (options.emitted_frequency_hertz.has_value()) {
		scenario.emitted_frequency_hertz = std::max(*options.emitted_frequency_hertz, 1.0);
	}
	if (options.source_velocity_fraction_of_light.has_value()) {
		scenario.source_velocity_fraction_of_light =
			std::clamp(*options.source_velocity_fraction_of_light, -0.95, 0.95);
	}
	if (options.observer_velocity_fraction_of_light.has_value()) {
		scenario.observer_velocity_fraction_of_light =
			std::clamp(*options.observer_velocity_fraction_of_light, -0.95, 0.95);
	}
	if (options.central_mass_solar_masses.has_value()) {
		scenario.central_mass_solar_masses = std::max(*options.central_mass_solar_masses, 0.1);
	}
	if (options.orbital_radius_schwarzschild_radii.has_value()) {
		scenario.orbital_radius_schwarzschild_radii =
			std::max(*options.orbital_radius_schwarzschild_radii, 1.1);
	}
	if (options.coordinate_time_seconds.has_value()) {
		scenario.coordinate_time_seconds = std::max(*options.coordinate_time_seconds, 0.01);
	}
	return scenario;
}

visual_physics::atmospheric::Scenario apply_program_overrides(
	visual_physics::atmospheric::Scenario scenario,
	const ProgramOptions& options) {
	if (options.sea_level_pressure_kilopascals.has_value()) {
		scenario.sea_level_pressure_kilopascals =
			std::max(*options.sea_level_pressure_kilopascals, 10.0);
	}
	if (options.scale_height_kilometers.has_value()) {
		scenario.scale_height_kilometers = std::max(*options.scale_height_kilometers, 1.0);
	}
	if (options.surface_temperature_kelvin.has_value()) {
		scenario.surface_temperature_kelvin = std::max(*options.surface_temperature_kelvin, 180.0);
	}
	if (options.lapse_rate_kelvin_per_kilometer.has_value()) {
		scenario.lapse_rate_kelvin_per_kilometer =
			std::clamp(*options.lapse_rate_kelvin_per_kilometer, 2.0, 12.0);
	}
	if (options.tropopause_height_kilometers.has_value()) {
		scenario.tropopause_height_kilometers =
			std::clamp(*options.tropopause_height_kilometers, 6.0, 18.0);
	}
	if (options.environmental_lapse_rate_kelvin_per_kilometer.has_value()) {
		scenario.environmental_lapse_rate_kelvin_per_kilometer =
			std::clamp(*options.environmental_lapse_rate_kelvin_per_kilometer, 2.0, 11.0);
	}
	if (options.parcel_temperature_excess_kelvin.has_value()) {
		scenario.parcel_temperature_excess_kelvin =
			std::clamp(*options.parcel_temperature_excess_kelvin, 0.2, 8.0);
	}
	if (options.column_height_kilometers.has_value()) {
		scenario.column_height_kilometers = std::clamp(*options.column_height_kilometers, 3.0, 14.0);
	}
	return scenario;
}

visual_physics::solid_state::Scenario apply_program_overrides(
	visual_physics::solid_state::Scenario scenario,
	const ProgramOptions& options) {
	if (options.max_strain_percent.has_value()) {
		scenario.max_strain_percent = std::clamp(*options.max_strain_percent, 0.1, 5.0);
	}
	if (options.youngs_modulus_gigapascals.has_value()) {
		scenario.youngs_modulus_gigapascals =
			std::clamp(*options.youngs_modulus_gigapascals, 1.0, 400.0);
	}
	if (options.yield_strength_megapascals.has_value()) {
		scenario.yield_strength_megapascals =
			std::clamp(*options.yield_strength_megapascals, 1.0, 2000.0);
	}
	if (options.lattice_spacing_nanometers.has_value()) {
		scenario.lattice_spacing_nanometers =
			std::clamp(*options.lattice_spacing_nanometers, 0.1, 1.5);
	}
	if (options.spring_constant_newtons_per_meter.has_value()) {
		scenario.spring_constant_newtons_per_meter =
			std::clamp(*options.spring_constant_newtons_per_meter, 1.0, 100.0);
	}
	if (options.atomic_mass_amu.has_value()) {
		scenario.atomic_mass_amu = std::clamp(*options.atomic_mass_amu, 1.0, 300.0);
	}
	if (options.band_gap_electron_volts.has_value()) {
		scenario.band_gap_electron_volts =
			std::clamp(*options.band_gap_electron_volts, 0.0, 5.0);
	}
	if (options.effective_mass_ratio.has_value()) {
		scenario.effective_mass_ratio = std::clamp(*options.effective_mass_ratio, 0.01, 5.0);
	}
	if (options.dopant_density_per_cubic_centimeter.has_value()) {
		scenario.dopant_density_per_cubic_centimeter =
			std::clamp(*options.dopant_density_per_cubic_centimeter, 1.0e10, 1.0e20);
	}
	return scenario;
}

visual_physics::plasma_physics::Scenario apply_program_overrides(
	visual_physics::plasma_physics::Scenario scenario,
	const ProgramOptions& options) {
	if (options.electron_density_per_cubic_meter.has_value()) {
		scenario.electron_density_per_cubic_meter =
			std::clamp(*options.electron_density_per_cubic_meter, 1.0e15, 1.0e22);
	}
	if (options.electron_temperature_electron_volts.has_value()) {
		scenario.electron_temperature_electron_volts =
			std::clamp(*options.electron_temperature_electron_volts, 0.1, 500.0);
	}
	if (options.perturbation_amplitude_percent.has_value()) {
		scenario.perturbation_amplitude_percent =
			std::clamp(*options.perturbation_amplitude_percent, 0.1, 40.0);
	}
	if (options.probe_potential_volts.has_value()) {
		scenario.probe_potential_volts =
			std::clamp(*options.probe_potential_volts, 0.1, 500.0);
	}
	if (options.magnetic_field_tesla.has_value()) {
		scenario.magnetic_field_tesla =
			std::clamp(*options.magnetic_field_tesla, 0.1, 20.0);
	}
	if (options.plasma_current_mega_amperes.has_value()) {
		scenario.plasma_current_mega_amperes =
			std::clamp(*options.plasma_current_mega_amperes, 0.1, 30.0);
	}
	if (options.major_radius_meters.has_value()) {
		scenario.major_radius_meters =
			std::clamp(*options.major_radius_meters, 0.2, 12.0);
	}
	return scenario;
}

visual_physics::nuclear_and_particle_physics::Scenario apply_program_overrides(
	visual_physics::nuclear_and_particle_physics::Scenario scenario,
	const ProgramOptions& options) {
	if (options.half_life_hours.has_value()) {
		scenario.half_life_hours = std::max(*options.half_life_hours, 0.1);
	}
	if (options.initial_population_trillions.has_value()) {
		scenario.initial_population_trillions = std::max(*options.initial_population_trillions, 0.0);
	}
	if (options.mass_number.has_value()) {
		scenario.mass_number = std::clamp(std::round(*options.mass_number), 1.0, 240.0);
	}
	if (options.proton_count.has_value()) {
		const auto max_proton_count = scenario.mass_number.value_or(56.0);
		scenario.proton_count = std::clamp(std::round(*options.proton_count), 1.0, max_proton_count);
	}
	if (options.binding_energy_per_nucleon_mev.has_value()) {
		scenario.binding_energy_per_nucleon_mev =
			std::clamp(*options.binding_energy_per_nucleon_mev, 0.5, 12.0);
	}
	if (options.beam_energy_gev.has_value()) {
		scenario.beam_energy_gev = std::max(*options.beam_energy_gev, 0.1);
	}
	if (options.scattering_angle_degrees.has_value()) {
		scenario.scattering_angle_degrees =
			std::clamp(*options.scattering_angle_degrees, 1.0, 175.0);
	}
	if (options.detector_radius_meters.has_value()) {
		scenario.detector_radius_meters = std::clamp(*options.detector_radius_meters, 0.1, 20.0);
	}
	return scenario;
}

visual_physics::astrophysics::Scenario apply_program_overrides(
	visual_physics::astrophysics::Scenario scenario,
	const ProgramOptions& options) {
	if (options.central_mass_solar_masses.has_value()) {
		scenario.central_mass_solar_masses = std::max(*options.central_mass_solar_masses, 0.1);
	}
	if (options.orbital_radius_astronomical_units.has_value()) {
		scenario.orbital_radius_astronomical_units =
			std::max(*options.orbital_radius_astronomical_units, 0.1);
	}
	if (options.orbital_eccentricity.has_value()) {
		scenario.orbital_eccentricity = std::clamp(*options.orbital_eccentricity, 0.0, 0.85);
	}
	if (options.stellar_mass_solar_masses.has_value()) {
		scenario.stellar_mass_solar_masses = std::max(*options.stellar_mass_solar_masses, 0.1);
	}
	if (options.stellar_radius_solar_radii.has_value()) {
		scenario.stellar_radius_solar_radii = std::max(*options.stellar_radius_solar_radii, 0.1);
	}
	if (options.surface_temperature_kelvin.has_value()) {
		scenario.surface_temperature_kelvin = std::max(*options.surface_temperature_kelvin, 1500.0);
	}
	if (options.distance_megaparsecs.has_value()) {
		scenario.distance_megaparsecs = std::max(*options.distance_megaparsecs, 1.0);
	}
	if (options.hubble_constant_kilometers_per_second_per_megaparsec.has_value()) {
		scenario.hubble_constant_kilometers_per_second_per_megaparsec = std::max(
			*options.hubble_constant_kilometers_per_second_per_megaparsec,
			10.0);
	}
	return scenario;
}

bool has_electromagnetism_overrides(const ProgramOptions& options) {
	return options.source_point_x.has_value() || options.source_point_y.has_value() ||
		options.secondary_source_point_x.has_value() || options.secondary_source_point_y.has_value() ||
		options.probe_point_x.has_value() || options.probe_point_y.has_value() ||
		options.charge_magnitude.has_value() || options.secondary_charge_magnitude.has_value() ||
		options.magnetic_field_strength.has_value() || options.current.has_value() ||
		options.loop_radius.has_value() || options.plate_separation.has_value() ||
		options.potential_difference.has_value() || options.flux_rate.has_value() ||
		options.inductance.has_value() || options.show_field_vectors.has_value() ||
		options.show_magnetic_field.has_value() || options.show_force_vectors.has_value() ||
		options.show_potential_guides.has_value() || options.show_trajectory.has_value();
}

bool has_computational_physics_overrides(const ProgramOptions& options) {
	return options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value();
}

bool has_quantum_overrides(const ProgramOptions& options) {
	return options.box_length_nanometers.has_value() || options.quantum_number.has_value() ||
		options.particle_energy_ev.has_value() || options.barrier_height_ev.has_value() ||
		options.barrier_width_nanometers.has_value() || options.wavelength_nanometers.has_value() ||
		options.slit_separation_micrometers.has_value() || options.slit_width_micrometers.has_value() ||
		options.screen_distance_meters.has_value() || options.show_probability_guide.has_value() ||
		options.show_potential_guide.has_value() || options.show_phase_guide.has_value();
}

bool has_relativity_overrides(const ProgramOptions& options) {
	return options.relative_velocity_fraction_of_light.has_value() ||
		options.proper_time_seconds.has_value() || options.emitted_frequency_hertz.has_value() ||
		options.source_velocity_fraction_of_light.has_value() ||
		options.observer_velocity_fraction_of_light.has_value() ||
		options.central_mass_solar_masses.has_value() ||
		options.orbital_radius_schwarzschild_radii.has_value() ||
		options.coordinate_time_seconds.has_value() ||
		options.show_reference_guides.has_value() ||
		options.show_comparison_curve.has_value() || options.show_active_marker.has_value();
}

bool has_plasma_overrides(const ProgramOptions& options) {
	return options.electron_density_per_cubic_meter.has_value() ||
		options.electron_temperature_electron_volts.has_value() ||
		options.perturbation_amplitude_percent.has_value() ||
		options.probe_potential_volts.has_value() ||
		options.magnetic_field_tesla.has_value() ||
		options.plasma_current_mega_amperes.has_value() ||
		options.major_radius_meters.has_value();
}

bool has_solid_state_overrides(const ProgramOptions& options) {
	return options.max_strain_percent.has_value() ||
		options.youngs_modulus_gigapascals.has_value() ||
		options.yield_strength_megapascals.has_value() ||
		options.lattice_spacing_nanometers.has_value() ||
		options.spring_constant_newtons_per_meter.has_value() ||
		options.atomic_mass_amu.has_value() ||
		options.band_gap_electron_volts.has_value() ||
		options.effective_mass_ratio.has_value() ||
		options.dopant_density_per_cubic_centimeter.has_value();
}

bool has_nuclear_and_particle_physics_overrides(const ProgramOptions& options) {
	return options.half_life_hours.has_value() ||
		options.initial_population_trillions.has_value() ||
		options.mass_number.has_value() ||
		options.proton_count.has_value() ||
		options.binding_energy_per_nucleon_mev.has_value() ||
		options.beam_energy_gev.has_value() ||
		options.scattering_angle_degrees.has_value() ||
		options.detector_radius_meters.has_value();
}

void validate_nuclear_and_particle_physics_options(const ProgramOptions& options) {
	if (options.import_path.has_value() && options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}
	if (has_solid_state_overrides(options)) {
		throw std::runtime_error(
			"Solid State override flags cannot be used with --domain nuclear-and-particle-physics");
	}
}

void validate_kinematics_options(const ProgramOptions& options) {
	if (options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() ||
		options.restitution_coefficient.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		has_electromagnetism_overrides(options) || has_computational_physics_overrides(options) ||
		has_quantum_overrides(options)) {
		throw std::runtime_error("Dynamics-only override flags cannot be used with --domain kinematics");
	}
}

visual_physics::dynamics::OverlayOptions apply_overlay_overrides(
	visual_physics::dynamics::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_momentum_vector.has_value()) {
		overlays.show_momentum_vector = *options.show_momentum_vector;
	}
	if (options.show_velocity_vector.has_value()) {
		overlays.show_velocity_vector = *options.show_velocity_vector;
	}
	if (options.show_force_vector.has_value()) {
		overlays.show_force_vector = *options.show_force_vector;
	}
	if (options.show_scenario_guides.has_value()) {
		overlays.show_scenario_guides = *options.show_scenario_guides;
	}
	return overlays;
}

visual_physics::statics::OverlayOptions apply_overlay_overrides(
	visual_physics::statics::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_applied_force.has_value()) {
		overlays.show_applied_force = *options.show_applied_force;
	}
	if (options.show_reaction_forces.has_value()) {
		overlays.show_reaction_forces = *options.show_reaction_forces;
	}
	if (options.show_residual_guides.has_value()) {
		overlays.show_residual_guides = *options.show_residual_guides;
	}
	return overlays;
}

visual_physics::electromagnetism::OverlayOptions apply_overlay_overrides(
	visual_physics::electromagnetism::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_field_vectors.has_value()) {
		overlays.show_field_vectors = *options.show_field_vectors;
	}
	if (options.show_magnetic_field.has_value()) {
		overlays.show_magnetic_field = *options.show_magnetic_field;
	}
	if (options.show_force_vectors.has_value()) {
		overlays.show_force_vectors = *options.show_force_vectors;
	}
	if (options.show_potential_guides.has_value()) {
		overlays.show_potential_guides = *options.show_potential_guides;
	}
	if (options.show_trajectory.has_value()) {
		overlays.show_trajectory = *options.show_trajectory;
	}
	return overlays;
}

visual_physics::computational_physics::OverlayOptions apply_overlay_overrides(
	visual_physics::computational_physics::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_reference_trajectory.has_value()) {
		overlays.show_reference_trajectory = *options.show_reference_trajectory;
	}
	if (options.show_euler_trajectory.has_value()) {
		overlays.show_euler_trajectory = *options.show_euler_trajectory;
	}
	if (options.show_symplectic_trajectory.has_value()) {
		overlays.show_symplectic_trajectory = *options.show_symplectic_trajectory;
	}
	if (options.show_rk4_trajectory.has_value()) {
		overlays.show_rk4_trajectory = *options.show_rk4_trajectory;
	}
	if (options.show_error_bars.has_value()) {
		overlays.show_error_bars = *options.show_error_bars;
	}
	return overlays;
}

visual_physics::electronics::OverlayOptions apply_overlay_overrides(
	visual_physics::electronics::OverlayOptions overlays,
	const ProgramOptions& options) {
	static_cast<void>(options);
	return overlays;
}

visual_physics::fluid_mechanics::OverlayOptions apply_overlay_overrides(
	visual_physics::fluid_mechanics::OverlayOptions overlays,
	const ProgramOptions& options) {
	static_cast<void>(options);
	return overlays;
}

visual_physics::thermodynamics::OverlayOptions apply_overlay_overrides(
	visual_physics::thermodynamics::OverlayOptions overlays,
	const ProgramOptions& options) {
	static_cast<void>(options);
	return overlays;
}

visual_physics::waves::OverlayOptions apply_overlay_overrides(
	visual_physics::waves::OverlayOptions overlays,
	const ProgramOptions& options) {
	static_cast<void>(options);
	return overlays;
}

visual_physics::optics::OverlayOptions apply_overlay_overrides(
	visual_physics::optics::OverlayOptions overlays,
	const ProgramOptions& options) {
	static_cast<void>(options);
	return overlays;
}

visual_physics::quantum::OverlayOptions apply_overlay_overrides(
	visual_physics::quantum::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_probability_guide.has_value()) {
		overlays.show_probability_guide = *options.show_probability_guide;
	}
	if (options.show_potential_guide.has_value()) {
		overlays.show_potential_guide = *options.show_potential_guide;
	}
	if (options.show_phase_guide.has_value()) {
		overlays.show_phase_guide = *options.show_phase_guide;
	}
	return overlays;
}

visual_physics::relativity::OverlayOptions apply_overlay_overrides(
	visual_physics::relativity::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_reference_guides.has_value()) {
		overlays.show_reference_guides = *options.show_reference_guides;
	}
	if (options.show_comparison_curve.has_value()) {
		overlays.show_comparison_curve = *options.show_comparison_curve;
	}
	if (options.show_active_marker.has_value()) {
		overlays.show_active_marker = *options.show_active_marker;
	}
	return overlays;
}

visual_physics::astrophysics::OverlayOptions apply_overlay_overrides(
	visual_physics::astrophysics::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_reference_guides.has_value()) {
		overlays.show_reference_guides = *options.show_reference_guides;
	}
	if (options.show_active_marker.has_value()) {
		overlays.show_active_marker = *options.show_active_marker;
	}
	if (options.show_comparison_band.has_value()) {
		overlays.show_comparison_band = *options.show_comparison_band;
	}
	return overlays;
}

visual_physics::plasma_physics::OverlayOptions apply_overlay_overrides(
	visual_physics::plasma_physics::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_reference_guides.has_value()) {
		overlays.show_reference_guides = *options.show_reference_guides;
	}
	if (options.show_active_marker.has_value()) {
		overlays.show_active_marker = *options.show_active_marker;
	}
	if (options.show_comparison_band.has_value()) {
		overlays.show_comparison_band = *options.show_comparison_band;
	}
	return overlays;
}

visual_physics::solid_state::OverlayOptions apply_overlay_overrides(
	visual_physics::solid_state::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_reference_guides.has_value()) {
		overlays.show_reference_guides = *options.show_reference_guides;
	}
	if (options.show_active_marker.has_value()) {
		overlays.show_active_marker = *options.show_active_marker;
	}
	if (options.show_comparison_band.has_value()) {
		overlays.show_comparison_band = *options.show_comparison_band;
	}
	return overlays;
}

visual_physics::nuclear_and_particle_physics::OverlayOptions apply_overlay_overrides(
	visual_physics::nuclear_and_particle_physics::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_reference_guides.has_value()) {
		overlays.show_reference_guides = *options.show_reference_guides;
	}
	if (options.show_active_marker.has_value()) {
		overlays.show_active_marker = *options.show_active_marker;
	}
	if (options.show_comparison_band.has_value()) {
		overlays.show_comparison_band = *options.show_comparison_band;
	}
	return overlays;
}

visual_physics::atmospheric::OverlayOptions apply_overlay_overrides(
	visual_physics::atmospheric::OverlayOptions overlays,
	const ProgramOptions& options) {
	if (options.show_reference_guides.has_value()) {
		overlays.show_reference_guides = *options.show_reference_guides;
	}
	if (options.show_active_marker.has_value()) {
		overlays.show_active_marker = *options.show_active_marker;
	}
	if (options.show_comparison_band.has_value()) {
		overlays.show_comparison_band = *options.show_comparison_band;
	}
	return overlays;
}

void validate_dynamics_options(const ProgramOptions& options) {
	if (options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || options.show_applied_force.has_value() ||
		options.show_reaction_forces.has_value() || options.show_residual_guides.has_value() ||
		has_electromagnetism_overrides(options) || has_computational_physics_overrides(options) ||
		has_quantum_overrides(options)) {
		throw std::runtime_error("Kinematics-only override flags cannot be used with --domain dynamics");
	}
}

void validate_statics_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.net_force_x.has_value() || options.net_force_y.has_value() ||
		options.gravity_x.has_value() || options.gravity_y.has_value() ||
		options.drag_coefficient.has_value() || options.spring_anchor_x.has_value() ||
		options.spring_anchor_y.has_value() || options.spring_constant.has_value() ||
		options.damping_coefficient.has_value() || options.orbital_center_x.has_value() ||
		options.orbital_center_y.has_value() || options.gravitational_parameter.has_value() ||
		options.restitution_coefficient.has_value() || options.show_momentum_vector.has_value() ||
		options.show_velocity_vector.has_value() || options.show_force_vector.has_value() ||
		options.show_scenario_guides.has_value() || has_electromagnetism_overrides(options) ||
		has_computational_physics_overrides(options) || has_quantum_overrides(options)) {
		throw std::runtime_error(
			"Kinematics and Dynamics override flags cannot be used with --domain statics");
	}
}

void validate_electromagnetism_options(const ProgramOptions& options) {
	if (options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.net_force_x.has_value() || options.net_force_y.has_value() ||
		options.gravity_x.has_value() || options.gravity_y.has_value() ||
		options.drag_coefficient.has_value() || options.spring_anchor_x.has_value() ||
		options.spring_anchor_y.has_value() || options.spring_constant.has_value() ||
		options.damping_coefficient.has_value() || options.orbital_center_x.has_value() ||
		options.orbital_center_y.has_value() || options.gravitational_parameter.has_value() ||
		options.restitution_coefficient.has_value() || options.secondary_mass.has_value() ||
		options.angle_degrees.has_value() || options.friction_coefficient.has_value() ||
		options.load_position.has_value() || options.load_magnitude.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || has_computational_physics_overrides(options) ||
		has_quantum_overrides(options)) {
		throw std::runtime_error(
			"Kinematics, Dynamics, and Statics override flags cannot be used with --domain electromagnetism");
	}
}

void validate_electronics_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || options.source_point_x.has_value() ||
		options.source_point_y.has_value() || options.secondary_source_point_x.has_value() ||
		options.secondary_source_point_y.has_value() || options.probe_point_x.has_value() ||
		options.probe_point_y.has_value() || options.charge_magnitude.has_value() ||
		options.secondary_charge_magnitude.has_value() || options.magnetic_field_strength.has_value() ||
		options.current.has_value() || options.loop_radius.has_value() ||
		options.plate_separation.has_value() || options.potential_difference.has_value() ||
		options.flux_rate.has_value() || options.inductance.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_field_vectors.has_value() ||
		options.show_magnetic_field.has_value() || options.show_force_vectors.has_value() ||
		options.show_potential_guides.has_value() || options.show_trajectory.has_value() ||
		options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value() || has_quantum_overrides(options)) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, electromagnetism, and computational physics flags cannot be used with --domain electronics-and-circuits");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value()) {
		throw std::runtime_error(
			"Computational Physics CSV export flags cannot be used with --domain electronics-and-circuits");
	}
}

void validate_fluid_mechanics_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || options.source_point_x.has_value() ||
		options.source_point_y.has_value() || options.secondary_source_point_x.has_value() ||
		options.secondary_source_point_y.has_value() || options.probe_point_x.has_value() ||
		options.probe_point_y.has_value() || options.charge_magnitude.has_value() ||
		options.secondary_charge_magnitude.has_value() || options.magnetic_field_strength.has_value() ||
		options.current.has_value() || options.loop_radius.has_value() ||
		options.plate_separation.has_value() || options.potential_difference.has_value() ||
		options.flux_rate.has_value() || options.inductance.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_field_vectors.has_value() ||
		options.show_magnetic_field.has_value() || options.show_force_vectors.has_value() ||
		options.show_potential_guides.has_value() || options.show_trajectory.has_value() ||
		options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value() || has_quantum_overrides(options)) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, electromagnetism, electronics, and computational physics flags cannot be used with --domain fluid-mechanics");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value()) {
		throw std::runtime_error(
			"Computational Physics CSV export flags cannot be used with --domain fluid-mechanics");
	}
}

void validate_atmospheric_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || has_electromagnetism_overrides(options) ||
		has_computational_physics_overrides(options) || has_quantum_overrides(options) ||
		options.box_length_nanometers.has_value() || options.quantum_number.has_value() ||
		options.particle_energy_ev.has_value() || options.barrier_height_ev.has_value() ||
		options.barrier_width_nanometers.has_value() || options.wavelength_nanometers.has_value() ||
		options.slit_separation_micrometers.has_value() || options.slit_width_micrometers.has_value() ||
		options.screen_distance_meters.has_value() || options.relative_velocity_fraction_of_light.has_value() ||
		options.proper_time_seconds.has_value() || options.emitted_frequency_hertz.has_value() ||
		options.source_velocity_fraction_of_light.has_value() ||
		options.observer_velocity_fraction_of_light.has_value() ||
		options.central_mass_solar_masses.has_value() ||
		options.orbital_radius_astronomical_units.has_value() ||
		options.orbital_eccentricity.has_value() ||
		options.stellar_mass_solar_masses.has_value() ||
		options.stellar_radius_solar_radii.has_value() ||
		options.distance_megaparsecs.has_value() ||
		options.hubble_constant_kilometers_per_second_per_megaparsec.has_value() ||
		options.orbital_radius_schwarzschild_radii.has_value() ||
		options.coordinate_time_seconds.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_probability_guide.has_value() ||
		options.show_potential_guide.has_value() || options.show_phase_guide.has_value() ||
		options.show_comparison_curve.has_value()) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, thermodynamics, optics, electromagnetism, electronics, relativity, astrophysics, quantum, and computational physics flags cannot be used with --domain atmospheric-physics");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value() ||
		options.export_astrophysics_report_csv_path.has_value() ||
		options.export_relativity_report_csv_path.has_value() ||
		options.export_waves_report_csv_path.has_value() ||
		options.export_quantum_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Existing astrophysics, relativity, waves, quantum, and computational physics CSV export flags cannot be used with --domain atmospheric-physics");
	}
	if (options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value()) {
		throw std::runtime_error(
			"Computational Physics overlay flags cannot be used with --domain atmospheric-physics");
	}
	if (options.import_path.has_value() && options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}
}

void validate_solid_state_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || has_electromagnetism_overrides(options) ||
		has_computational_physics_overrides(options) || has_quantum_overrides(options) ||
		options.box_length_nanometers.has_value() || options.quantum_number.has_value() ||
		options.particle_energy_ev.has_value() || options.barrier_height_ev.has_value() ||
		options.barrier_width_nanometers.has_value() || options.wavelength_nanometers.has_value() ||
		options.slit_separation_micrometers.has_value() || options.slit_width_micrometers.has_value() ||
		options.screen_distance_meters.has_value() || options.relative_velocity_fraction_of_light.has_value() ||
		options.proper_time_seconds.has_value() || options.emitted_frequency_hertz.has_value() ||
		options.source_velocity_fraction_of_light.has_value() ||
		options.observer_velocity_fraction_of_light.has_value() ||
		options.central_mass_solar_masses.has_value() ||
		options.orbital_radius_astronomical_units.has_value() ||
		options.orbital_eccentricity.has_value() ||
		options.stellar_mass_solar_masses.has_value() ||
		options.stellar_radius_solar_radii.has_value() ||
		options.surface_temperature_kelvin.has_value() ||
		options.sea_level_pressure_kilopascals.has_value() ||
		options.scale_height_kilometers.has_value() ||
		options.lapse_rate_kelvin_per_kilometer.has_value() ||
		options.tropopause_height_kilometers.has_value() ||
		options.environmental_lapse_rate_kelvin_per_kilometer.has_value() ||
		options.parcel_temperature_excess_kelvin.has_value() ||
		options.column_height_kilometers.has_value() ||
		options.distance_megaparsecs.has_value() ||
		options.hubble_constant_kilometers_per_second_per_megaparsec.has_value() ||
		options.orbital_radius_schwarzschild_radii.has_value() ||
		options.coordinate_time_seconds.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_probability_guide.has_value() ||
		options.show_potential_guide.has_value() || options.show_phase_guide.has_value() ||
		options.show_comparison_curve.has_value()) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, thermodynamics, optics, electromagnetism, electronics, relativity, astrophysics, atmospheric physics, quantum, and computational physics flags cannot be used with --domain solid-state-physics");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value() ||
		options.export_atmospheric_report_csv_path.has_value() ||
		options.export_astrophysics_report_csv_path.has_value() ||
		options.export_relativity_report_csv_path.has_value() ||
		options.export_waves_report_csv_path.has_value() ||
		options.export_quantum_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Existing atmospheric, astrophysics, relativity, waves, quantum, and computational physics CSV export flags cannot be used with --domain solid-state-physics");
	}
	if (options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value()) {
		throw std::runtime_error(
			"Computational Physics overlay flags cannot be used with --domain solid-state-physics");
	}
	if (options.import_path.has_value() && options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}
}

void validate_waves_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || has_electromagnetism_overrides(options) ||
		has_computational_physics_overrides(options) || has_quantum_overrides(options) ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value()) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, thermodynamics, optics, electromagnetism, electronics, quantum, and computational physics flags cannot be used with --domain waves");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value() ||
		options.export_quantum_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Quantum and Computational Physics CSV export flags cannot be used with --domain waves");
	}
}

void validate_relativity_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || has_electromagnetism_overrides(options) ||
		has_computational_physics_overrides(options) || has_quantum_overrides(options) ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_probability_guide.has_value() ||
		options.show_potential_guide.has_value() || options.show_phase_guide.has_value()) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, thermodynamics, optics, electromagnetism, electronics, quantum, and computational physics flags cannot be used with --domain relativity");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value() ||
		options.export_waves_report_csv_path.has_value() ||
		options.export_quantum_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Existing waves, quantum, and computational physics CSV export flags cannot be used with --domain relativity");
	}
}

void validate_astrophysics_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || has_electromagnetism_overrides(options) ||
		has_computational_physics_overrides(options) || has_quantum_overrides(options) ||
		options.box_length_nanometers.has_value() || options.quantum_number.has_value() ||
		options.particle_energy_ev.has_value() || options.barrier_height_ev.has_value() ||
		options.barrier_width_nanometers.has_value() || options.wavelength_nanometers.has_value() ||
		options.slit_separation_micrometers.has_value() || options.slit_width_micrometers.has_value() ||
		options.screen_distance_meters.has_value() || options.relative_velocity_fraction_of_light.has_value() ||
		options.proper_time_seconds.has_value() || options.emitted_frequency_hertz.has_value() ||
		options.source_velocity_fraction_of_light.has_value() ||
		options.observer_velocity_fraction_of_light.has_value() ||
		options.orbital_radius_schwarzschild_radii.has_value() ||
		options.coordinate_time_seconds.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_probability_guide.has_value() ||
		options.show_potential_guide.has_value() || options.show_phase_guide.has_value() ||
		options.show_comparison_curve.has_value()) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, thermodynamics, optics, electromagnetism, electronics, relativity, quantum, and computational physics flags cannot be used with --domain astrophysics");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value() ||
		options.export_relativity_report_csv_path.has_value() ||
		options.export_waves_report_csv_path.has_value() ||
		options.export_quantum_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Existing relativity, waves, quantum, and computational physics CSV export flags cannot be used with --domain astrophysics");
	}
}

void validate_thermodynamics_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || options.source_point_x.has_value() ||
		options.source_point_y.has_value() || options.secondary_source_point_x.has_value() ||
		options.secondary_source_point_y.has_value() || options.probe_point_x.has_value() ||
		options.probe_point_y.has_value() || options.charge_magnitude.has_value() ||
		options.secondary_charge_magnitude.has_value() || options.magnetic_field_strength.has_value() ||
		options.current.has_value() || options.loop_radius.has_value() ||
		options.plate_separation.has_value() || options.potential_difference.has_value() ||
		options.flux_rate.has_value() || options.inductance.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_field_vectors.has_value() ||
		options.show_magnetic_field.has_value() || options.show_force_vectors.has_value() ||
		options.show_potential_guides.has_value() || options.show_trajectory.has_value() ||
		options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value() || has_quantum_overrides(options)) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, electromagnetism, electronics, and computational physics flags cannot be used with --domain thermodynamics");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value()) {
		throw std::runtime_error(
			"Computational Physics CSV export flags cannot be used with --domain thermodynamics");
	}
}

void validate_optics_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || options.source_point_x.has_value() ||
		options.source_point_y.has_value() || options.secondary_source_point_x.has_value() ||
		options.secondary_source_point_y.has_value() || options.probe_point_x.has_value() ||
		options.probe_point_y.has_value() || options.charge_magnitude.has_value() ||
		options.secondary_charge_magnitude.has_value() || options.magnetic_field_strength.has_value() ||
		options.current.has_value() || options.loop_radius.has_value() ||
		options.plate_separation.has_value() || options.potential_difference.has_value() ||
		options.flux_rate.has_value() || options.inductance.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_field_vectors.has_value() ||
		options.show_magnetic_field.has_value() || options.show_force_vectors.has_value() ||
		options.show_potential_guides.has_value() || options.show_trajectory.has_value() ||
		options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value() || has_quantum_overrides(options)) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, thermodynamics, electromagnetism, electronics, and computational physics flags cannot be used with --domain optics");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value()) {
		throw std::runtime_error(
			"Computational Physics CSV export flags cannot be used with --domain optics");
	}
}

void validate_quantum_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || options.source_point_x.has_value() ||
		options.source_point_y.has_value() || options.secondary_source_point_x.has_value() ||
		options.secondary_source_point_y.has_value() || options.probe_point_x.has_value() ||
		options.probe_point_y.has_value() || options.charge_magnitude.has_value() ||
		options.secondary_charge_magnitude.has_value() || options.magnetic_field_strength.has_value() ||
		options.current.has_value() || options.loop_radius.has_value() ||
		options.plate_separation.has_value() || options.potential_difference.has_value() ||
		options.flux_rate.has_value() || options.inductance.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_field_vectors.has_value() ||
		options.show_magnetic_field.has_value() || options.show_force_vectors.has_value() ||
		options.show_potential_guides.has_value() || options.show_trajectory.has_value() ||
		options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value()) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, thermodynamics, electromagnetism, electronics, and computational physics flags cannot be used with --domain quantum");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value()) {
		throw std::runtime_error(
			"Computational Physics CSV export flags cannot be used with --domain quantum");
	}
}

void validate_computational_physics_options(const ProgramOptions& options) {
	if (options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.net_force_x.has_value() || options.net_force_y.has_value() ||
		options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || options.show_momentum_vector.has_value() ||
		options.show_velocity_vector.has_value() || options.show_force_vector.has_value() ||
		options.show_scenario_guides.has_value() || options.show_applied_force.has_value() ||
		options.show_reaction_forces.has_value() || options.show_residual_guides.has_value() ||
		has_electromagnetism_overrides(options) || has_quantum_overrides(options)) {
		throw std::runtime_error(
			"Kinematics, Dynamics, Statics, and Electromagnetism-only flags cannot be used with --domain computational-physics");
	}
}

void validate_quantum_scenario_overrides(
	const visual_physics::quantum::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with quantum scenario " +
			std::string(visual_physics::quantum::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::quantum::ScenarioId::ParticleInBox) {
		if (options.particle_energy_ev.has_value()) {
			reject("--particle-energy-ev");
		}
		if (options.barrier_height_ev.has_value()) {
			reject("--barrier-height-ev");
		}
		if (options.barrier_width_nanometers.has_value()) {
			reject("--barrier-width-nanometers");
		}
		if (options.wavelength_nanometers.has_value()) {
			reject("--wavelength-nanometers");
		}
		if (options.slit_separation_micrometers.has_value()) {
			reject("--slit-separation-micrometers");
		}
		if (options.slit_width_micrometers.has_value()) {
			reject("--slit-width-micrometers");
		}
		if (options.screen_distance_meters.has_value()) {
			reject("--screen-distance-meters");
		}
		return;
	}

	if (scenario.id == visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling) {
		if (options.box_length_nanometers.has_value()) {
			reject("--box-length-nanometers");
		}
		if (options.quantum_number.has_value()) {
			reject("--quantum-number");
		}
		if (options.wavelength_nanometers.has_value()) {
			reject("--wavelength-nanometers");
		}
		if (options.slit_separation_micrometers.has_value()) {
			reject("--slit-separation-micrometers");
		}
		if (options.slit_width_micrometers.has_value()) {
			reject("--slit-width-micrometers");
		}
		if (options.screen_distance_meters.has_value()) {
			reject("--screen-distance-meters");
		}
		return;
	}

	if (options.box_length_nanometers.has_value()) {
		reject("--box-length-nanometers");
	}
	if (options.quantum_number.has_value()) {
		reject("--quantum-number");
	}
	if (options.particle_energy_ev.has_value()) {
		reject("--particle-energy-ev");
	}
	if (options.barrier_height_ev.has_value()) {
		reject("--barrier-height-ev");
	}
	if (options.barrier_width_nanometers.has_value()) {
		reject("--barrier-width-nanometers");
	}
}

void validate_computational_physics_scenario_overrides(
	const visual_physics::computational_physics::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with computational physics scenario " +
			std::string(visual_physics::computational_physics::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::computational_physics::ScenarioId::ProjectileSolverComparison) {
		if (options.orbital_center_x.has_value() || options.orbital_center_y.has_value()) {
			reject("--orbital-center-x/--orbital-center-y");
		}
		if (options.gravitational_parameter.has_value()) {
			reject("--gravitational-parameter");
		}
		if (options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value()) {
			reject("--spring-anchor-x/--spring-anchor-y");
		}
		if (options.spring_constant.has_value()) {
			reject("--spring-constant");
		}
		if (options.damping_coefficient.has_value()) {
			reject("--damping-coefficient");
		}
		return;
	}

	if (scenario.id == visual_physics::computational_physics::ScenarioId::OrbitalSolverComparison) {
		if (options.gravity_x.has_value() || options.gravity_y.has_value()) {
			reject("--gravity-x/--gravity-y");
		}
		if (options.drag_coefficient.has_value()) {
			reject("--drag-coefficient");
		}
		if (options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value()) {
			reject("--spring-anchor-x/--spring-anchor-y");
		}
		if (options.spring_constant.has_value()) {
			reject("--spring-constant");
		}
		if (options.damping_coefficient.has_value()) {
			reject("--damping-coefficient");
		}
		return;
	}

	if (options.gravity_x.has_value() || options.gravity_y.has_value()) {
		reject("--gravity-x/--gravity-y");
	}
	if (options.drag_coefficient.has_value()) {
		reject("--drag-coefficient");
	}
	if (options.orbital_center_x.has_value() || options.orbital_center_y.has_value()) {
		reject("--orbital-center-x/--orbital-center-y");
	}
	if (options.gravitational_parameter.has_value()) {
		reject("--gravitational-parameter");
	}
}

void validate_electromagnetism_scenario_overrides(
	const visual_physics::electromagnetism::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with electromagnetism scenario " +
			std::string(visual_physics::electromagnetism::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::electromagnetism::ScenarioId::PointChargeElectrostatics) {
		if (options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value()) {
			reject("--initial-velocity-x/--initial-velocity-y");
		}
		if (options.mass.has_value()) {
			reject("--mass");
		}
		if (options.magnetic_field_strength.has_value()) {
			reject("--magnetic-field-strength");
		}
		if (options.current.has_value()) {
			reject("--current");
		}
		if (options.loop_radius.has_value()) {
			reject("--loop-radius");
		}
		if (options.plate_separation.has_value()) {
			reject("--plate-separation");
		}
		if (options.potential_difference.has_value()) {
			reject("--potential-difference");
		}
		if (options.flux_rate.has_value()) {
			reject("--flux-rate");
		}
		if (options.inductance.has_value()) {
			reject("--inductance");
		}
		if (options.show_magnetic_field.has_value()) {
			reject("--show-magnetic-field");
		}
		if (options.show_trajectory.has_value()) {
			reject("--show-trajectory");
		}
		return;
	}

	if (scenario.id == visual_physics::electromagnetism::ScenarioId::MovingChargeMagneticField) {
		if (options.source_point_x.has_value() || options.source_point_y.has_value()) {
			reject("--source-point-x/--source-point-y");
		}
		if (options.secondary_source_point_x.has_value() || options.secondary_source_point_y.has_value()) {
			reject("--secondary-source-point-x/--secondary-source-point-y");
		}
		if (options.probe_point_x.has_value() || options.probe_point_y.has_value()) {
			reject("--probe-point-x/--probe-point-y");
		}
		if (options.secondary_charge_magnitude.has_value()) {
			reject("--secondary-charge-magnitude");
		}
		if (options.current.has_value()) {
			reject("--current");
		}
		if (options.loop_radius.has_value()) {
			reject("--loop-radius");
		}
		if (options.plate_separation.has_value()) {
			reject("--plate-separation");
		}
		if (options.potential_difference.has_value()) {
			reject("--potential-difference");
		}
		if (options.flux_rate.has_value()) {
			reject("--flux-rate");
		}
		if (options.inductance.has_value()) {
			reject("--inductance");
		}
		if (options.show_field_vectors.has_value()) {
			reject("--show-field-vectors");
		}
		if (options.show_potential_guides.has_value()) {
			reject("--show-potential-guides");
		}
		return;
	}

	if (scenario.id == visual_physics::electromagnetism::ScenarioId::CurrentLoopMagneticField) {
		if (options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value()) {
			reject("--initial-velocity-x/--initial-velocity-y");
		}
		if (options.initial_position_x.has_value() || options.initial_position_y.has_value()) {
			reject("--initial-position-x/--initial-position-y");
		}
		if (options.source_point_x.has_value() || options.source_point_y.has_value()) {
			reject("--source-point-x/--source-point-y");
		}
		if (options.secondary_source_point_x.has_value() || options.secondary_source_point_y.has_value()) {
			reject("--secondary-source-point-x/--secondary-source-point-y");
		}
		if (options.charge_magnitude.has_value()) {
			reject("--charge-magnitude");
		}
		if (options.secondary_charge_magnitude.has_value()) {
			reject("--secondary-charge-magnitude");
		}
		if (options.mass.has_value()) {
			reject("--mass");
		}
		if (options.magnetic_field_strength.has_value()) {
			reject("--magnetic-field-strength");
		}
		if (options.plate_separation.has_value()) {
			reject("--plate-separation");
		}
		if (options.potential_difference.has_value()) {
			reject("--potential-difference");
		}
		if (options.flux_rate.has_value()) {
			reject("--flux-rate");
		}
		if (options.inductance.has_value()) {
			reject("--inductance");
		}
		if (options.show_field_vectors.has_value()) {
			reject("--show-field-vectors");
		}
		if (options.show_force_vectors.has_value()) {
			reject("--show-force-vectors");
		}
		if (options.show_trajectory.has_value()) {
			reject("--show-trajectory");
		}
		return;
	}

	if (scenario.id == visual_physics::electromagnetism::ScenarioId::CapacitorPotentialField) {
		if (options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value()) {
			reject("--initial-velocity-x/--initial-velocity-y");
		}
		if (options.source_point_x.has_value() || options.source_point_y.has_value()) {
			reject("--source-point-x/--source-point-y");
		}
		if (options.secondary_source_point_x.has_value() || options.secondary_source_point_y.has_value()) {
			reject("--secondary-source-point-x/--secondary-source-point-y");
		}
		if (options.charge_magnitude.has_value()) {
			reject("--charge-magnitude");
		}
		if (options.secondary_charge_magnitude.has_value()) {
			reject("--secondary-charge-magnitude");
		}
		if (options.mass.has_value()) {
			reject("--mass");
		}
		if (options.magnetic_field_strength.has_value()) {
			reject("--magnetic-field-strength");
		}
		if (options.current.has_value()) {
			reject("--current");
		}
		if (options.loop_radius.has_value()) {
			reject("--loop-radius");
		}
		if (options.flux_rate.has_value()) {
			reject("--flux-rate");
		}
		if (options.inductance.has_value()) {
			reject("--inductance");
		}
		if (options.show_magnetic_field.has_value()) {
			reject("--show-magnetic-field");
		}
		if (options.show_trajectory.has_value()) {
			reject("--show-trajectory");
		}
		return;
	}

	if (options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value()) {
		reject("--initial-velocity-x/--initial-velocity-y");
	}
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value()) {
		reject("--initial-position-x/--initial-position-y");
	}
	if (options.source_point_x.has_value() || options.source_point_y.has_value()) {
		reject("--source-point-x/--source-point-y");
	}
	if (options.secondary_source_point_x.has_value() || options.secondary_source_point_y.has_value()) {
		reject("--secondary-source-point-x/--secondary-source-point-y");
	}
	if (options.charge_magnitude.has_value()) {
		reject("--charge-magnitude");
	}
	if (options.secondary_charge_magnitude.has_value()) {
		reject("--secondary-charge-magnitude");
	}
	if (options.mass.has_value()) {
		reject("--mass");
	}
	if (options.magnetic_field_strength.has_value()) {
		reject("--magnetic-field-strength");
	}
	if (options.current.has_value()) {
		reject("--current");
	}
	if (options.loop_radius.has_value()) {
		reject("--loop-radius");
	}
	if (options.plate_separation.has_value()) {
		reject("--plate-separation");
	}
	if (options.potential_difference.has_value()) {
		reject("--potential-difference");
	}
	if (options.show_field_vectors.has_value()) {
		reject("--show-field-vectors");
	}
	if (options.show_trajectory.has_value()) {
		reject("--show-trajectory");
	}
}

void validate_statics_scenario_overrides(
	const visual_physics::statics::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with statics scenario " +
			std::string(visual_physics::statics::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::statics::ScenarioId::BeamSupport) {
		if (options.mass.has_value()) {
			reject("--mass");
		}
		if (options.secondary_mass.has_value()) {
			reject("--secondary-mass");
		}
		if (options.angle_degrees.has_value()) {
			reject("--angle-degrees");
		}
		if (options.friction_coefficient.has_value()) {
			reject("--friction-coefficient");
		}
		return;
	}

	if (scenario.id == visual_physics::statics::ScenarioId::InclinedPlane) {
		if (options.secondary_mass.has_value()) {
			reject("--secondary-mass");
		}
		if (options.load_position.has_value()) {
			reject("--load-position");
		}
		if (options.load_magnitude.has_value()) {
			reject("--load-magnitude");
		}
		return;
	}

	if (options.angle_degrees.has_value()) {
		reject("--angle-degrees");
	}
	if (options.friction_coefficient.has_value()) {
		reject("--friction-coefficient");
	}
	if (options.load_position.has_value()) {
		reject("--load-position");
	}
	if (options.load_magnitude.has_value()) {
		reject("--load-magnitude");
	}
}

void validate_astrophysics_scenario_overrides(
	const visual_physics::astrophysics::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with astrophysics scenario " +
			std::string(visual_physics::astrophysics::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::astrophysics::ScenarioId::PlanetaryOrbit) {
		if (options.stellar_mass_solar_masses.has_value()) {
			reject("--stellar-mass-solar-masses");
		}
		if (options.stellar_radius_solar_radii.has_value()) {
			reject("--stellar-radius-solar-radii");
		}
		if (options.surface_temperature_kelvin.has_value()) {
			reject("--surface-temperature-kelvin");
		}
		if (options.distance_megaparsecs.has_value()) {
			reject("--distance-megaparsecs");
		}
		if (options.hubble_constant_kilometers_per_second_per_megaparsec.has_value()) {
			reject("--hubble-constant-kilometers-per-second-per-megaparsec");
		}
		return;
	}

	if (scenario.id == visual_physics::astrophysics::ScenarioId::StellarLuminosity) {
		if (options.central_mass_solar_masses.has_value()) {
			reject("--central-mass-solar-masses");
		}
		if (options.orbital_radius_astronomical_units.has_value()) {
			reject("--orbital-radius-astronomical-units");
		}
		if (options.orbital_eccentricity.has_value()) {
			reject("--orbital-eccentricity");
		}
		if (options.distance_megaparsecs.has_value()) {
			reject("--distance-megaparsecs");
		}
		if (options.hubble_constant_kilometers_per_second_per_megaparsec.has_value()) {
			reject("--hubble-constant-kilometers-per-second-per-megaparsec");
		}
		return;
	}

	if (options.central_mass_solar_masses.has_value()) {
		reject("--central-mass-solar-masses");
	}
	if (options.orbital_radius_astronomical_units.has_value()) {
		reject("--orbital-radius-astronomical-units");
	}
	if (options.orbital_eccentricity.has_value()) {
		reject("--orbital-eccentricity");
	}
	if (options.stellar_mass_solar_masses.has_value()) {
		reject("--stellar-mass-solar-masses");
	}
	if (options.stellar_radius_solar_radii.has_value()) {
		reject("--stellar-radius-solar-radii");
	}
	if (options.surface_temperature_kelvin.has_value()) {
		reject("--surface-temperature-kelvin");
	}
}

void validate_atmospheric_scenario_overrides(
	const visual_physics::atmospheric::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with atmospheric scenario " +
			std::string(visual_physics::atmospheric::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::atmospheric::ScenarioId::BarometricFormula) {
		if (options.surface_temperature_kelvin.has_value()) {
			reject("--surface-temperature-kelvin");
		}
		if (options.lapse_rate_kelvin_per_kilometer.has_value()) {
			reject("--lapse-rate-kelvin-per-kilometer");
		}
		if (options.tropopause_height_kilometers.has_value()) {
			reject("--tropopause-height-kilometers");
		}
		if (options.environmental_lapse_rate_kelvin_per_kilometer.has_value()) {
			reject("--environmental-lapse-rate-kelvin-per-kilometer");
		}
		if (options.parcel_temperature_excess_kelvin.has_value()) {
			reject("--parcel-temperature-excess-kelvin");
		}
		if (options.column_height_kilometers.has_value()) {
			reject("--column-height-kilometers");
		}
		return;
	}

	if (scenario.id == visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate) {
		if (options.sea_level_pressure_kilopascals.has_value()) {
			reject("--sea-level-pressure-kilopascals");
		}
		if (options.scale_height_kilometers.has_value()) {
			reject("--scale-height-kilometers");
		}
		if (options.environmental_lapse_rate_kelvin_per_kilometer.has_value()) {
			reject("--environmental-lapse-rate-kelvin-per-kilometer");
		}
		if (options.parcel_temperature_excess_kelvin.has_value()) {
			reject("--parcel-temperature-excess-kelvin");
		}
		if (options.column_height_kilometers.has_value()) {
			reject("--column-height-kilometers");
		}
		return;
	}

	if (options.sea_level_pressure_kilopascals.has_value()) {
		reject("--sea-level-pressure-kilopascals");
	}
	if (options.scale_height_kilometers.has_value()) {
		reject("--scale-height-kilometers");
	}
	if (options.lapse_rate_kelvin_per_kilometer.has_value()) {
		reject("--lapse-rate-kelvin-per-kilometer");
	}
	if (options.tropopause_height_kilometers.has_value()) {
		reject("--tropopause-height-kilometers");
	}
}

void validate_solid_state_scenario_overrides(
	const visual_physics::solid_state::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with solid-state scenario " +
			std::string(visual_physics::solid_state::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::solid_state::ScenarioId::CrystalElasticity) {
		if (options.lattice_spacing_nanometers.has_value()) {
			reject("--lattice-spacing-nanometers");
		}
		if (options.spring_constant_newtons_per_meter.has_value()) {
			reject("--spring-constant-newtons-per-meter");
		}
		if (options.atomic_mass_amu.has_value()) {
			reject("--atomic-mass-amu");
		}
		if (options.band_gap_electron_volts.has_value()) {
			reject("--band-gap-electron-volts");
		}
		if (options.effective_mass_ratio.has_value()) {
			reject("--effective-mass-ratio");
		}
		if (options.dopant_density_per_cubic_centimeter.has_value()) {
			reject("--dopant-density-per-cubic-centimeter");
		}
		return;
	}

	if (scenario.id == visual_physics::solid_state::ScenarioId::PhononDispersion) {
		if (options.max_strain_percent.has_value()) {
			reject("--max-strain-percent");
		}
		if (options.youngs_modulus_gigapascals.has_value()) {
			reject("--youngs-modulus-gigapascals");
		}
		if (options.yield_strength_megapascals.has_value()) {
			reject("--yield-strength-megapascals");
		}
		if (options.band_gap_electron_volts.has_value()) {
			reject("--band-gap-electron-volts");
		}
		if (options.effective_mass_ratio.has_value()) {
			reject("--effective-mass-ratio");
		}
		if (options.dopant_density_per_cubic_centimeter.has_value()) {
			reject("--dopant-density-per-cubic-centimeter");
		}
		return;
	}

	if (options.max_strain_percent.has_value()) {
		reject("--max-strain-percent");
	}
	if (options.youngs_modulus_gigapascals.has_value()) {
		reject("--youngs-modulus-gigapascals");
	}
	if (options.yield_strength_megapascals.has_value()) {
		reject("--yield-strength-megapascals");
	}
	if (options.lattice_spacing_nanometers.has_value()) {
		reject("--lattice-spacing-nanometers");
	}
	if (options.spring_constant_newtons_per_meter.has_value()) {
		reject("--spring-constant-newtons-per-meter");
	}
	if (options.atomic_mass_amu.has_value()) {
		reject("--atomic-mass-amu");
	}
}

void validate_plasma_options(const ProgramOptions& options) {
	if (options.initial_position_x.has_value() || options.initial_position_y.has_value() ||
		options.initial_velocity_x.has_value() || options.initial_velocity_y.has_value() ||
		options.acceleration_x.has_value() || options.acceleration_y.has_value() ||
		options.observer_velocity_x.has_value() || options.observer_velocity_y.has_value() ||
		options.radius.has_value() || options.angular_speed.has_value() ||
		options.mass.has_value() || options.net_force_x.has_value() ||
		options.net_force_y.has_value() || options.gravity_x.has_value() ||
		options.gravity_y.has_value() || options.drag_coefficient.has_value() ||
		options.comparison_step_seconds.has_value() || options.reference_step_seconds.has_value() ||
		options.spring_anchor_x.has_value() || options.spring_anchor_y.has_value() ||
		options.spring_constant.has_value() || options.damping_coefficient.has_value() ||
		options.orbital_center_x.has_value() || options.orbital_center_y.has_value() ||
		options.gravitational_parameter.has_value() || options.restitution_coefficient.has_value() ||
		options.secondary_mass.has_value() || options.angle_degrees.has_value() ||
		options.friction_coefficient.has_value() || options.load_position.has_value() ||
		options.load_magnitude.has_value() || has_electromagnetism_overrides(options) ||
		has_computational_physics_overrides(options) || has_quantum_overrides(options) ||
		options.relative_velocity_fraction_of_light.has_value() ||
		options.proper_time_seconds.has_value() || options.emitted_frequency_hertz.has_value() ||
		options.source_velocity_fraction_of_light.has_value() ||
		options.observer_velocity_fraction_of_light.has_value() ||
		options.central_mass_solar_masses.has_value() ||
		options.orbital_radius_astronomical_units.has_value() ||
		options.orbital_eccentricity.has_value() ||
		options.stellar_mass_solar_masses.has_value() ||
		options.stellar_radius_solar_radii.has_value() ||
		options.surface_temperature_kelvin.has_value() ||
		options.sea_level_pressure_kilopascals.has_value() ||
		options.scale_height_kilometers.has_value() ||
		options.lapse_rate_kelvin_per_kilometer.has_value() ||
		options.tropopause_height_kilometers.has_value() ||
		options.environmental_lapse_rate_kelvin_per_kilometer.has_value() ||
		options.parcel_temperature_excess_kelvin.has_value() ||
		options.column_height_kilometers.has_value() ||
		has_solid_state_overrides(options) ||
		has_nuclear_and_particle_physics_overrides(options) ||
		options.distance_megaparsecs.has_value() ||
		options.hubble_constant_kilometers_per_second_per_megaparsec.has_value() ||
		options.orbital_radius_schwarzschild_radii.has_value() ||
		options.coordinate_time_seconds.has_value() ||
		options.show_momentum_vector.has_value() || options.show_velocity_vector.has_value() ||
		options.show_force_vector.has_value() || options.show_scenario_guides.has_value() ||
		options.show_applied_force.has_value() || options.show_reaction_forces.has_value() ||
		options.show_residual_guides.has_value() || options.show_probability_guide.has_value() ||
		options.show_potential_guide.has_value() || options.show_phase_guide.has_value() ||
		options.show_comparison_curve.has_value()) {
		throw std::runtime_error(
			"Existing kinematics, dynamics, statics, fluid mechanics, thermodynamics, optics, electromagnetism, electronics, relativity, astrophysics, atmospheric physics, solid-state physics, nuclear-and-particle physics, quantum, and computational physics flags cannot be used with --domain plasma-physics");
	}
	if (options.export_convergence_csv_path.has_value() ||
		options.export_orbital_invariant_csv_path.has_value() ||
		options.export_spring_invariant_csv_path.has_value() ||
		options.export_solid_state_report_csv_path.has_value() ||
		options.export_nuclear_report_csv_path.has_value() ||
		options.export_atmospheric_report_csv_path.has_value() ||
		options.export_astrophysics_report_csv_path.has_value() ||
		options.export_relativity_report_csv_path.has_value() ||
		options.export_waves_report_csv_path.has_value() ||
		options.export_quantum_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Existing solid-state, nuclear, atmospheric, astrophysics, relativity, waves, quantum, and computational physics CSV export flags cannot be used with --domain plasma-physics");
	}
	if (options.show_reference_trajectory.has_value() || options.show_euler_trajectory.has_value() ||
		options.show_symplectic_trajectory.has_value() || options.show_rk4_trajectory.has_value() ||
		options.show_error_bars.has_value()) {
		throw std::runtime_error(
			"Computational Physics overlay flags cannot be used with --domain plasma-physics");
	}
	if (options.import_path.has_value() && options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}
}

void validate_plasma_scenario_overrides(
	const visual_physics::plasma_physics::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with plasma-physics scenario " +
			std::string(visual_physics::plasma_physics::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::plasma_physics::ScenarioId::PlasmaOscillation) {
		if (options.probe_potential_volts.has_value()) {
			reject("--probe-potential-volts");
		}
		if (options.magnetic_field_tesla.has_value()) {
			reject("--magnetic-field-tesla");
		}
		if (options.plasma_current_mega_amperes.has_value()) {
			reject("--plasma-current-mega-amperes");
		}
		if (options.major_radius_meters.has_value()) {
			reject("--major-radius-meters");
		}
		return;
	}

	if (scenario.id == visual_physics::plasma_physics::ScenarioId::DebyeScreening) {
		if (options.perturbation_amplitude_percent.has_value()) {
			reject("--perturbation-amplitude-percent");
		}
		if (options.magnetic_field_tesla.has_value()) {
			reject("--magnetic-field-tesla");
		}
		if (options.plasma_current_mega_amperes.has_value()) {
			reject("--plasma-current-mega-amperes");
		}
		if (options.major_radius_meters.has_value()) {
			reject("--major-radius-meters");
		}
		return;
	}

	if (options.perturbation_amplitude_percent.has_value()) {
		reject("--perturbation-amplitude-percent");
	}
	if (options.probe_potential_volts.has_value()) {
		reject("--probe-potential-volts");
	}
}

void validate_nuclear_and_particle_physics_scenario_overrides(
	const visual_physics::nuclear_and_particle_physics::Scenario& scenario,
	const ProgramOptions& options) {
	auto reject = [&](std::string_view flag_name) {
		throw std::runtime_error(
			std::string(flag_name) +
			" cannot be used with nuclear-and-particle-physics scenario " +
			std::string(visual_physics::nuclear_and_particle_physics::to_string(scenario.id)));
	};

	if (scenario.id == visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay) {
		if (options.mass_number.has_value()) {
			reject("--mass-number");
		}
		if (options.proton_count.has_value()) {
			reject("--proton-count");
		}
		if (options.binding_energy_per_nucleon_mev.has_value()) {
			reject("--binding-energy-per-nucleon-mev");
		}
		if (options.beam_energy_gev.has_value()) {
			reject("--beam-energy-gev");
		}
		if (options.scattering_angle_degrees.has_value()) {
			reject("--scattering-angle-degrees");
		}
		if (options.detector_radius_meters.has_value()) {
			reject("--detector-radius-meters");
		}
		return;
	}

	if (scenario.id == visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve) {
		if (options.half_life_hours.has_value()) {
			reject("--half-life-hours");
		}
		if (options.initial_population_trillions.has_value()) {
			reject("--initial-population-trillions");
		}
		if (options.beam_energy_gev.has_value()) {
			reject("--beam-energy-gev");
		}
		if (options.scattering_angle_degrees.has_value()) {
			reject("--scattering-angle-degrees");
		}
		if (options.detector_radius_meters.has_value()) {
			reject("--detector-radius-meters");
		}
		return;
	}

	if (options.half_life_hours.has_value()) {
		reject("--half-life-hours");
	}
	if (options.initial_population_trillions.has_value()) {
		reject("--initial-population-trillions");
	}
	if (options.mass_number.has_value()) {
		reject("--mass-number");
	}
	if (options.proton_count.has_value()) {
		reject("--proton-count");
	}
	if (options.binding_energy_per_nucleon_mev.has_value()) {
		reject("--binding-energy-per-nucleon-mev");
	}
}

std::string read_text_file(const std::filesystem::path& path) {
	std::ifstream input(path);
	if (!input.is_open()) {
		throw std::runtime_error("Failed to open import payload: " + path.string());
	}

	return std::string(
		std::istreambuf_iterator<char>(input),
		std::istreambuf_iterator<char>());
}

void write_text_file(const std::filesystem::path& path, std::string_view content) {
	std::ofstream output(path, std::ios::binary);
	if (!output.is_open()) {
		throw std::runtime_error("Failed to open output text file: " + path.string());
	}
	output << content;
}

bool nearly_equal(double left, double right, double tolerance = 1e-9) {
	return std::abs(left - right) <= tolerance;
}

void verify_roundtrip_scenario(
	const visual_physics::kinematics::Scenario& original,
	const visual_physics::kinematics::Scenario& roundtrip) {
	if (original.id != roundtrip.id ||
		original.name != roundtrip.name ||
		original.summary != roundtrip.summary ||
		original.equation_summary != roundtrip.equation_summary ||
		!nearly_equal(original.duration_seconds, roundtrip.duration_seconds) ||
		!nearly_equal(original.view_bounds.min_x, roundtrip.view_bounds.min_x) ||
		!nearly_equal(original.view_bounds.max_x, roundtrip.view_bounds.max_x) ||
		!nearly_equal(original.view_bounds.min_y, roundtrip.view_bounds.min_y) ||
		!nearly_equal(original.view_bounds.max_y, roundtrip.view_bounds.max_y) ||
		!nearly_equal(original.initial_position.x, roundtrip.initial_position.x) ||
		!nearly_equal(original.initial_position.y, roundtrip.initial_position.y) ||
		!nearly_equal(original.initial_velocity.x, roundtrip.initial_velocity.x) ||
		!nearly_equal(original.initial_velocity.y, roundtrip.initial_velocity.y) ||
		!nearly_equal(original.acceleration.x, roundtrip.acceleration.x) ||
		!nearly_equal(original.acceleration.y, roundtrip.acceleration.y) ||
		original.observer_velocity.has_value() != roundtrip.observer_velocity.has_value() ||
		original.radius.has_value() != roundtrip.radius.has_value() ||
		original.angular_speed.has_value() != roundtrip.angular_speed.has_value() ||
		original.center.has_value() != roundtrip.center.has_value()) {
		throw std::runtime_error("Roundtrip check failed: scenario mismatch");
	}

	if (original.observer_velocity.has_value() &&
		(!nearly_equal(original.observer_velocity->x, roundtrip.observer_velocity->x) ||
		 !nearly_equal(original.observer_velocity->y, roundtrip.observer_velocity->y))) {
		throw std::runtime_error("Roundtrip check failed: observer velocity mismatch");
	}
	if (original.radius.has_value() && !nearly_equal(*original.radius, *roundtrip.radius)) {
		throw std::runtime_error("Roundtrip check failed: radius mismatch");
	}
	if (original.angular_speed.has_value() &&
		!nearly_equal(*original.angular_speed, *roundtrip.angular_speed)) {
		throw std::runtime_error("Roundtrip check failed: angular speed mismatch");
	}
	if (original.center.has_value() &&
		(!nearly_equal(original.center->x, roundtrip.center->x) ||
		 !nearly_equal(original.center->y, roundtrip.center->y))) {
		throw std::runtime_error("Roundtrip check failed: center mismatch");
	}
}

void verify_roundtrip_snapshot(
	const visual_physics::kinematics::Snapshot& original,
	const visual_physics::kinematics::Snapshot& roundtrip) {
	if (!nearly_equal(original.time_seconds, roundtrip.time_seconds) ||
		!nearly_equal(original.position.x, roundtrip.position.x) ||
		!nearly_equal(original.position.y, roundtrip.position.y) ||
		!nearly_equal(original.velocity.x, roundtrip.velocity.x) ||
		!nearly_equal(original.velocity.y, roundtrip.velocity.y) ||
		!nearly_equal(original.acceleration.x, roundtrip.acceleration.x) ||
		!nearly_equal(original.acceleration.y, roundtrip.acceleration.y) ||
		!nearly_equal(original.speed, roundtrip.speed) ||
		!nearly_equal(original.acceleration_magnitude, roundtrip.acceleration_magnitude) ||
		original.relative_position.has_value() != roundtrip.relative_position.has_value() ||
		original.relative_velocity.has_value() != roundtrip.relative_velocity.has_value()) {
		throw std::runtime_error("Roundtrip check failed: snapshot mismatch");
	}

	if (original.relative_position.has_value() &&
		(!nearly_equal(original.relative_position->x, roundtrip.relative_position->x) ||
		 !nearly_equal(original.relative_position->y, roundtrip.relative_position->y))) {
		throw std::runtime_error("Roundtrip check failed: relative position mismatch");
	}
	if (original.relative_velocity.has_value() &&
		(!nearly_equal(original.relative_velocity->x, roundtrip.relative_velocity->x) ||
		 !nearly_equal(original.relative_velocity->y, roundtrip.relative_velocity->y))) {
		throw std::runtime_error("Roundtrip check failed: relative velocity mismatch");
	}
}

void verify_roundtrip_samples(
	const std::vector<visual_physics::kinematics::Sample>& original,
	const std::vector<visual_physics::kinematics::Sample>& roundtrip) {
	if (original.size() != roundtrip.size()) {
		throw std::runtime_error("Roundtrip check failed: sample count mismatch");
	}

	for (std::size_t index = 0; index < original.size(); index += 1) {
		if (!nearly_equal(original[index].time_seconds, roundtrip[index].time_seconds) ||
			!nearly_equal(original[index].x_position, roundtrip[index].x_position) ||
			!nearly_equal(original[index].y_position, roundtrip[index].y_position) ||
			!nearly_equal(original[index].speed, roundtrip[index].speed) ||
			!nearly_equal(
				original[index].acceleration_magnitude,
				roundtrip[index].acceleration_magnitude)) {
			throw std::runtime_error("Roundtrip check failed: sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::kinematics::Scenario& scenario,
	const visual_physics::kinematics::Snapshot& snapshot,
	const std::vector<visual_physics::kinematics::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::kinematics::serialize_export_payload(
		scenario,
		snapshot,
		{},
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::kinematics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::kinematics::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::kinematics::build_samples(imported.scenario, sample_count);

	verify_roundtrip_scenario(scenario, imported.scenario);
	verify_roundtrip_snapshot(snapshot, roundtrip_snapshot);
	verify_roundtrip_samples(samples, roundtrip_samples);
}

void verify_roundtrip_optional_vector2(
	const std::optional<visual_physics::electromagnetism::Vector2>& original,
	const std::optional<visual_physics::electromagnetism::Vector2>& roundtrip,
	std::string_view field_name) {
	if (original.has_value() != roundtrip.has_value()) {
		throw std::runtime_error(
			"Roundtrip check failed: optional vector presence mismatch for " +
			std::string(field_name));
	}
	if (original.has_value() &&
		(!nearly_equal(original->x, roundtrip->x) || !nearly_equal(original->y, roundtrip->y))) {
		throw std::runtime_error(
			"Roundtrip check failed: optional vector mismatch for " + std::string(field_name));
	}
}

void verify_roundtrip_optional_double(
	const std::optional<double>& original,
	const std::optional<double>& roundtrip,
	std::string_view field_name) {
	if (original.has_value() != roundtrip.has_value()) {
		throw std::runtime_error(
			"Roundtrip check failed: optional scalar presence mismatch for " +
			std::string(field_name));
	}
	if (original.has_value() && !nearly_equal(*original, *roundtrip)) {
		throw std::runtime_error(
			"Roundtrip check failed: optional scalar mismatch for " + std::string(field_name));
	}
}

void verify_roundtrip_scenario(
	const visual_physics::electromagnetism::Scenario& original,
	const visual_physics::electromagnetism::Scenario& roundtrip) {
	if (original.id != roundtrip.id ||
		original.name != roundtrip.name ||
		original.summary != roundtrip.summary ||
		original.equation_summary != roundtrip.equation_summary ||
		original.status != roundtrip.status ||
		!nearly_equal(original.duration_seconds, roundtrip.duration_seconds) ||
		!nearly_equal(original.view_bounds.min_x, roundtrip.view_bounds.min_x) ||
		!nearly_equal(original.view_bounds.max_x, roundtrip.view_bounds.max_x) ||
		!nearly_equal(original.view_bounds.min_y, roundtrip.view_bounds.min_y) ||
		!nearly_equal(original.view_bounds.max_y, roundtrip.view_bounds.max_y) ||
		original.focus_area != roundtrip.focus_area ||
		!nearly_equal(original.initial_position.x, roundtrip.initial_position.x) ||
		!nearly_equal(original.initial_position.y, roundtrip.initial_position.y)) {
		throw std::runtime_error("Roundtrip check failed: electromagnetism scenario mismatch");
	}

	verify_roundtrip_optional_vector2(original.initial_velocity, roundtrip.initial_velocity, "initialVelocity");
	verify_roundtrip_optional_vector2(original.source_point, roundtrip.source_point, "sourcePoint");
	verify_roundtrip_optional_vector2(
		original.secondary_source_point,
		roundtrip.secondary_source_point,
		"secondarySourcePoint");
	verify_roundtrip_optional_vector2(original.probe_point, roundtrip.probe_point, "probePoint");
	verify_roundtrip_optional_double(original.charge_magnitude, roundtrip.charge_magnitude, "chargeMagnitude");
	verify_roundtrip_optional_double(
		original.secondary_charge_magnitude,
		roundtrip.secondary_charge_magnitude,
		"secondaryChargeMagnitude");
	verify_roundtrip_optional_double(original.mass, roundtrip.mass, "mass");
	verify_roundtrip_optional_double(
		original.magnetic_field_strength,
		roundtrip.magnetic_field_strength,
		"magneticFieldStrength");
	verify_roundtrip_optional_double(original.current, roundtrip.current, "current");
	verify_roundtrip_optional_double(original.loop_radius, roundtrip.loop_radius, "loopRadius");
	verify_roundtrip_optional_double(original.plate_separation, roundtrip.plate_separation, "plateSeparation");
	verify_roundtrip_optional_double(
		original.potential_difference,
		roundtrip.potential_difference,
		"potentialDifference");
	verify_roundtrip_optional_double(original.flux_rate, roundtrip.flux_rate, "fluxRate");
	verify_roundtrip_optional_double(original.inductance, roundtrip.inductance, "inductance");
}

void verify_roundtrip_snapshot(
	const visual_physics::electromagnetism::Snapshot& original,
	const visual_physics::electromagnetism::Snapshot& roundtrip) {
	if (!nearly_equal(original.time_seconds, roundtrip.time_seconds) ||
		!nearly_equal(original.position.x, roundtrip.position.x) ||
		!nearly_equal(original.position.y, roundtrip.position.y) ||
		!nearly_equal(original.electric_field.x, roundtrip.electric_field.x) ||
		!nearly_equal(original.electric_field.y, roundtrip.electric_field.y) ||
		!nearly_equal(original.magnetic_field.x, roundtrip.magnetic_field.x) ||
		!nearly_equal(original.magnetic_field.y, roundtrip.magnetic_field.y) ||
		!nearly_equal(original.force.x, roundtrip.force.x) ||
		!nearly_equal(original.force.y, roundtrip.force.y) ||
		!nearly_equal(original.potential, roundtrip.potential) ||
		!nearly_equal(original.field_magnitude, roundtrip.field_magnitude) ||
		!nearly_equal(original.force_magnitude, roundtrip.force_magnitude) ||
		!nearly_equal(original.energy, roundtrip.energy) ||
		original.stable != roundtrip.stable) {
		throw std::runtime_error("Roundtrip check failed: electromagnetism snapshot mismatch");
	}
}

void verify_roundtrip_samples(
	const std::vector<visual_physics::electromagnetism::Sample>& original,
	const std::vector<visual_physics::electromagnetism::Sample>& roundtrip) {
	if (original.size() != roundtrip.size()) {
		throw std::runtime_error("Roundtrip check failed: electromagnetism sample count mismatch");
	}

	for (std::size_t index = 0; index < original.size(); index += 1) {
		if (!nearly_equal(original[index].time_seconds, roundtrip[index].time_seconds) ||
			!nearly_equal(original[index].x_position, roundtrip[index].x_position) ||
			!nearly_equal(original[index].y_position, roundtrip[index].y_position) ||
			!nearly_equal(original[index].field_magnitude, roundtrip[index].field_magnitude) ||
			!nearly_equal(original[index].force_magnitude, roundtrip[index].force_magnitude) ||
			!nearly_equal(original[index].potential, roundtrip[index].potential)) {
			throw std::runtime_error("Roundtrip check failed: electromagnetism sample mismatch");
		}
	}
}

void verify_roundtrip_overlays(
	const visual_physics::electromagnetism::OverlayOptions& original,
	const visual_physics::electromagnetism::OverlayOptions& roundtrip) {
	if (original.show_field_vectors != roundtrip.show_field_vectors ||
		original.show_magnetic_field != roundtrip.show_magnetic_field ||
		original.show_force_vectors != roundtrip.show_force_vectors ||
		original.show_potential_guides != roundtrip.show_potential_guides ||
		original.show_trajectory != roundtrip.show_trajectory) {
		throw std::runtime_error("Roundtrip check failed: electromagnetism overlays mismatch");
	}
}

void verify_roundtrip_payload(
	const visual_physics::electromagnetism::Scenario& scenario,
	const visual_physics::electromagnetism::Snapshot& snapshot,
	const visual_physics::electromagnetism::OverlayOptions& overlays,
	const std::vector<visual_physics::electromagnetism::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::electromagnetism::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::electromagnetism::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::electromagnetism::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::electromagnetism::build_samples(imported.scenario, sample_count);

	verify_roundtrip_scenario(scenario, imported.scenario);
	verify_roundtrip_snapshot(snapshot, roundtrip_snapshot);
	verify_roundtrip_samples(samples, roundtrip_samples);
	verify_roundtrip_overlays(
		overlays,
		imported.overlays.value_or(visual_physics::electromagnetism::OverlayOptions{}));
}

void verify_roundtrip_payload(
	const visual_physics::electronics::Scenario& scenario,
	const visual_physics::electronics::Snapshot& snapshot,
	const visual_physics::electronics::OverlayOptions& overlays,
	const std::vector<visual_physics::electronics::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::electronics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::electronics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::electronics::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::electronics::build_samples(imported.scenario, sample_count);

	if (scenario.id != imported.scenario.id ||
		scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y) ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.source_voltage, imported.scenario.source_voltage) ||
		!nearly_equal(scenario.resistance_ohms, imported.scenario.resistance_ohms) ||
		!nearly_equal(scenario.capacitance_farads, imported.scenario.capacitance_farads) ||
		scenario.inductance_henrys.has_value() != imported.scenario.inductance_henrys.has_value() ||
		scenario.upper_resistance_ohms.has_value() != imported.scenario.upper_resistance_ohms.has_value() ||
		scenario.lower_resistance_ohms.has_value() != imported.scenario.lower_resistance_ohms.has_value() ||
		!nearly_equal(
			scenario.initial_capacitor_voltage,
			imported.scenario.initial_capacitor_voltage)) {
		throw std::runtime_error("Roundtrip check failed: electronics scenario mismatch");
	}
	if (scenario.upper_resistance_ohms.has_value() &&
		!nearly_equal(*scenario.upper_resistance_ohms, *imported.scenario.upper_resistance_ohms)) {
		throw std::runtime_error("Roundtrip check failed: electronics upper resistance mismatch");
	}
	if (scenario.inductance_henrys.has_value() &&
		!nearly_equal(*scenario.inductance_henrys, *imported.scenario.inductance_henrys)) {
		throw std::runtime_error("Roundtrip check failed: electronics inductance mismatch");
	}
	if (scenario.lower_resistance_ohms.has_value() &&
		!nearly_equal(*scenario.lower_resistance_ohms, *imported.scenario.lower_resistance_ohms)) {
		throw std::runtime_error("Roundtrip check failed: electronics lower resistance mismatch");
	}
	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		!nearly_equal(snapshot.source_voltage, roundtrip_snapshot.source_voltage) ||
		!nearly_equal(snapshot.resistor_voltage, roundtrip_snapshot.resistor_voltage) ||
		!nearly_equal(snapshot.capacitor_voltage, roundtrip_snapshot.capacitor_voltage) ||
		!nearly_equal(snapshot.current_amps, roundtrip_snapshot.current_amps) ||
		!nearly_equal(snapshot.charge_coulombs, roundtrip_snapshot.charge_coulombs) ||
		!nearly_equal(snapshot.stored_energy_joules, roundtrip_snapshot.stored_energy_joules) ||
		!nearly_equal(snapshot.time_constant_seconds, roundtrip_snapshot.time_constant_seconds)) {
		throw std::runtime_error("Roundtrip check failed: electronics snapshot mismatch");
	}
	if (snapshot.flux_linkage_webers.has_value() != roundtrip_snapshot.flux_linkage_webers.has_value()) {
		throw std::runtime_error("Roundtrip check failed: electronics flux linkage optional mismatch");
	}
	if (snapshot.flux_linkage_webers.has_value() &&
		!nearly_equal(*snapshot.flux_linkage_webers, *roundtrip_snapshot.flux_linkage_webers)) {
		throw std::runtime_error("Roundtrip check failed: electronics flux linkage mismatch");
	}
	if (snapshot.output_voltage.has_value() != roundtrip_snapshot.output_voltage.has_value() ||
		snapshot.branch_current_amps.has_value() != roundtrip_snapshot.branch_current_amps.has_value() ||
		snapshot.equivalent_resistance_ohms.has_value() != roundtrip_snapshot.equivalent_resistance_ohms.has_value() ||
		snapshot.lower_branch_power_watts.has_value() != roundtrip_snapshot.lower_branch_power_watts.has_value()) {
		throw std::runtime_error("Roundtrip check failed: electronics snapshot optional mismatch");
	}
	if (snapshot.output_voltage.has_value() &&
		!nearly_equal(*snapshot.output_voltage, *roundtrip_snapshot.output_voltage)) {
		throw std::runtime_error("Roundtrip check failed: electronics output voltage mismatch");
	}
	if (snapshot.branch_current_amps.has_value() &&
		!nearly_equal(*snapshot.branch_current_amps, *roundtrip_snapshot.branch_current_amps)) {
		throw std::runtime_error("Roundtrip check failed: electronics branch current mismatch");
	}
	if (snapshot.equivalent_resistance_ohms.has_value() &&
		!nearly_equal(*snapshot.equivalent_resistance_ohms, *roundtrip_snapshot.equivalent_resistance_ohms)) {
		throw std::runtime_error("Roundtrip check failed: electronics equivalent resistance mismatch");
	}
	if (snapshot.lower_branch_power_watts.has_value() &&
		!nearly_equal(*snapshot.lower_branch_power_watts, *roundtrip_snapshot.lower_branch_power_watts)) {
		throw std::runtime_error("Roundtrip check failed: electronics lower power mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: electronics sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].time_seconds, roundtrip_samples[index].time_seconds) ||
			!nearly_equal(samples[index].source_voltage, roundtrip_samples[index].source_voltage) ||
			!nearly_equal(samples[index].capacitor_voltage, roundtrip_samples[index].capacitor_voltage) ||
			!nearly_equal(samples[index].current_amps, roundtrip_samples[index].current_amps) ||
			!nearly_equal(samples[index].charge_coulombs, roundtrip_samples[index].charge_coulombs) ||
			!nearly_equal(
				samples[index].stored_energy_joules,
				roundtrip_samples[index].stored_energy_joules)) {
			throw std::runtime_error("Roundtrip check failed: electronics sample mismatch");
		}
		if (samples[index].flux_linkage_webers.has_value() != roundtrip_samples[index].flux_linkage_webers.has_value()) {
			throw std::runtime_error("Roundtrip check failed: electronics sample flux mismatch");
		}
		if (samples[index].output_voltage.has_value() != roundtrip_samples[index].output_voltage.has_value() ||
			samples[index].branch_current_amps.has_value() != roundtrip_samples[index].branch_current_amps.has_value() ||
			samples[index].lower_branch_power_watts.has_value() != roundtrip_samples[index].lower_branch_power_watts.has_value()) {
			throw std::runtime_error("Roundtrip check failed: electronics sample optional mismatch");
		}
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::electronics::OverlayOptions{});
	if (overlays.show_source_voltage != roundtrip_overlays.show_source_voltage ||
		overlays.show_resistor_voltage != roundtrip_overlays.show_resistor_voltage ||
		overlays.show_energy_curve != roundtrip_overlays.show_energy_curve) {
		throw std::runtime_error("Roundtrip check failed: electronics overlays mismatch");
	}
}

void verify_roundtrip_payload(
	const visual_physics::fluid_mechanics::Scenario& scenario,
	const visual_physics::fluid_mechanics::Snapshot& snapshot,
	const visual_physics::fluid_mechanics::OverlayOptions& overlays,
	const std::vector<visual_physics::fluid_mechanics::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::fluid_mechanics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::fluid_mechanics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::fluid_mechanics::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::fluid_mechanics::build_samples(imported.scenario, sample_count);

	if (scenario.id != imported.scenario.id ||
		scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		!nearly_equal(scenario.gravity, imported.scenario.gravity) ||
		!nearly_equal(scenario.fluid_density, imported.scenario.fluid_density)) {
		throw std::runtime_error("Roundtrip check failed: fluid mechanics scenario mismatch");
	}
	if (scenario.id == visual_physics::fluid_mechanics::ScenarioId::OpenChannelFlow) {
		if (!nearly_equal(scenario.channel_width.value_or(0.0), imported.scenario.channel_width.value_or(0.0)) ||
			!nearly_equal(scenario.channel_depth.value_or(0.0), imported.scenario.channel_depth.value_or(0.0)) ||
			!nearly_equal(scenario.channel_slope.value_or(0.0), imported.scenario.channel_slope.value_or(0.0)) ||
			!nearly_equal(scenario.roughness_coefficient.value_or(0.0), imported.scenario.roughness_coefficient.value_or(0.0)) ||
			!nearly_equal(scenario.channel_length.value_or(0.0), imported.scenario.channel_length.value_or(0.0)) ||
			!nearly_equal(snapshot.discharge.value_or(0.0), roundtrip_snapshot.discharge.value_or(0.0)) ||
			!nearly_equal(snapshot.hydraulic_radius.value_or(0.0), roundtrip_snapshot.hydraulic_radius.value_or(0.0)) ||
			!nearly_equal(snapshot.average_velocity.value_or(0.0), roundtrip_snapshot.average_velocity.value_or(0.0)) ||
			!nearly_equal(snapshot.froude_number.value_or(0.0), roundtrip_snapshot.froude_number.value_or(0.0)) ||
			snapshot.stable != roundtrip_snapshot.stable) {
			throw std::runtime_error("Roundtrip check failed: fluid mechanics snapshot mismatch");
		}
	} else if (scenario.id == visual_physics::fluid_mechanics::ScenarioId::PoiseuillePipe) {
		if (!nearly_equal(scenario.pipe_radius.value_or(0.0), imported.scenario.pipe_radius.value_or(0.0)) ||
			!nearly_equal(scenario.pipe_length.value_or(0.0), imported.scenario.pipe_length.value_or(0.0)) ||
			!nearly_equal(scenario.pressure_drop.value_or(0.0), imported.scenario.pressure_drop.value_or(0.0)) ||
			!nearly_equal(scenario.dynamic_viscosity.value_or(0.0), imported.scenario.dynamic_viscosity.value_or(0.0)) ||
			!nearly_equal(snapshot.volumetric_flow_rate.value_or(0.0), roundtrip_snapshot.volumetric_flow_rate.value_or(0.0)) ||
			!nearly_equal(snapshot.average_velocity.value_or(0.0), roundtrip_snapshot.average_velocity.value_or(0.0)) ||
			!nearly_equal(snapshot.centerline_velocity.value_or(0.0), roundtrip_snapshot.centerline_velocity.value_or(0.0)) ||
			!nearly_equal(snapshot.reynolds_number.value_or(0.0), roundtrip_snapshot.reynolds_number.value_or(0.0)) ||
			!nearly_equal(snapshot.pressure_gradient.value_or(0.0), roundtrip_snapshot.pressure_gradient.value_or(0.0)) ||
			snapshot.stable != roundtrip_snapshot.stable) {
			throw std::runtime_error("Roundtrip check failed: fluid mechanics snapshot mismatch");
		}
	} else if (!nearly_equal(scenario.block_density, imported.scenario.block_density) ||
		!nearly_equal(scenario.block_width, imported.scenario.block_width) ||
		!nearly_equal(scenario.block_height, imported.scenario.block_height) ||
		!nearly_equal(scenario.block_depth, imported.scenario.block_depth) ||
		!nearly_equal(snapshot.equilibrium_depth, roundtrip_snapshot.equilibrium_depth) ||
		!nearly_equal(snapshot.immersion_ratio, roundtrip_snapshot.immersion_ratio) ||
		!nearly_equal(snapshot.displaced_volume, roundtrip_snapshot.displaced_volume) ||
		!nearly_equal(snapshot.buoyant_force, roundtrip_snapshot.buoyant_force) ||
		!nearly_equal(snapshot.weight_force, roundtrip_snapshot.weight_force) ||
		!nearly_equal(snapshot.net_force, roundtrip_snapshot.net_force) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: fluid mechanics snapshot mismatch");
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::fluid_mechanics::OverlayOptions{});
	if (overlays.show_force_guides != roundtrip_overlays.show_force_guides ||
		overlays.show_waterline != roundtrip_overlays.show_waterline ||
		overlays.show_equilibrium_guide != roundtrip_overlays.show_equilibrium_guide) {
		throw std::runtime_error("Roundtrip check failed: fluid mechanics overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: fluid mechanics sample count mismatch");
	}
	if (scenario.id == visual_physics::fluid_mechanics::ScenarioId::OpenChannelFlow) {
		for (std::size_t index = 0; index < samples.size(); index += 1) {
			if (!nearly_equal(samples[index].axial_position.value_or(0.0), roundtrip_samples[index].axial_position.value_or(0.0)) ||
				!nearly_equal(samples[index].bed_elevation.value_or(0.0), roundtrip_samples[index].bed_elevation.value_or(0.0)) ||
				!nearly_equal(samples[index].water_surface_elevation.value_or(0.0), roundtrip_samples[index].water_surface_elevation.value_or(0.0)) ||
				!nearly_equal(samples[index].average_velocity.value_or(0.0), roundtrip_samples[index].average_velocity.value_or(0.0)) ||
				!nearly_equal(samples[index].discharge.value_or(0.0), roundtrip_samples[index].discharge.value_or(0.0)) ||
				!nearly_equal(samples[index].froude_number.value_or(0.0), roundtrip_samples[index].froude_number.value_or(0.0)) ||
				samples[index].stable != roundtrip_samples[index].stable) {
				throw std::runtime_error("Roundtrip check failed: fluid mechanics sample mismatch");
			}
		}
	} else if (scenario.id == visual_physics::fluid_mechanics::ScenarioId::PoiseuillePipe) {
		for (std::size_t index = 0; index < samples.size(); index += 1) {
			if (!nearly_equal(samples[index].axial_position.value_or(0.0), roundtrip_samples[index].axial_position.value_or(0.0)) ||
				!nearly_equal(samples[index].pressure.value_or(0.0), roundtrip_samples[index].pressure.value_or(0.0)) ||
				!nearly_equal(samples[index].average_velocity.value_or(0.0), roundtrip_samples[index].average_velocity.value_or(0.0)) ||
				!nearly_equal(samples[index].reynolds_number.value_or(0.0), roundtrip_samples[index].reynolds_number.value_or(0.0)) ||
				samples[index].stable != roundtrip_samples[index].stable) {
				throw std::runtime_error("Roundtrip check failed: fluid mechanics sample mismatch");
			}
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::thermodynamics::Scenario& scenario,
	const visual_physics::thermodynamics::Snapshot& snapshot,
	const visual_physics::thermodynamics::OverlayOptions& overlays,
	const std::vector<visual_physics::thermodynamics::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::thermodynamics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::thermodynamics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::thermodynamics::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::thermodynamics::build_samples(imported.scenario, sample_count);

	if (scenario.id != imported.scenario.id ||
		scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		(scenario.id == visual_physics::thermodynamics::ScenarioId::HeatConductionSlab
			? !nearly_equal(
				scenario.slab_thickness_meters.value_or(0.0),
				imported.scenario.slab_thickness_meters.value_or(0.0)) ||
			  !nearly_equal(
				scenario.thermal_conductivity_w_per_mk.value_or(0.0),
				imported.scenario.thermal_conductivity_w_per_mk.value_or(0.0)) ||
			  !nearly_equal(
				scenario.thermal_diffusivity_m2_per_s.value_or(0.0),
				imported.scenario.thermal_diffusivity_m2_per_s.value_or(0.0)) ||
			  !nearly_equal(
				scenario.initial_temperature_celsius.value_or(0.0),
				imported.scenario.initial_temperature_celsius.value_or(0.0)) ||
			  !nearly_equal(
				scenario.boundary_temperature_celsius.value_or(0.0),
				imported.scenario.boundary_temperature_celsius.value_or(0.0))
			: scenario.id == visual_physics::thermodynamics::ScenarioId::CarnotCycle
			? !nearly_equal(scenario.gas_constant, imported.scenario.gas_constant) ||
			  !nearly_equal(scenario.molar_amount, imported.scenario.molar_amount) ||
			  !nearly_equal(
				scenario.hot_reservoir_temperature_kelvin.value_or(0.0),
				imported.scenario.hot_reservoir_temperature_kelvin.value_or(0.0)) ||
			  !nearly_equal(
				scenario.cold_reservoir_temperature_kelvin.value_or(0.0),
				imported.scenario.cold_reservoir_temperature_kelvin.value_or(0.0)) ||
			  !nearly_equal(
				scenario.cycle_min_volume_cubic_meters.value_or(0.0),
				imported.scenario.cycle_min_volume_cubic_meters.value_or(0.0)) ||
			  !nearly_equal(
				scenario.cycle_volume_ratio.value_or(0.0),
				imported.scenario.cycle_volume_ratio.value_or(0.0))
			: !nearly_equal(scenario.gas_constant, imported.scenario.gas_constant) ||
			  !nearly_equal(scenario.molar_amount, imported.scenario.molar_amount) ||
			  !nearly_equal(scenario.temperature_kelvin, imported.scenario.temperature_kelvin) ||
			  !nearly_equal(scenario.volume_cubic_meters, imported.scenario.volume_cubic_meters) ||
			  !nearly_equal(scenario.molar_mass_kg_per_mol, imported.scenario.molar_mass_kg_per_mol) ||
			  !nearly_equal(scenario.degrees_of_freedom, imported.scenario.degrees_of_freedom))) {
		throw std::runtime_error("Roundtrip check failed: thermodynamics scenario mismatch");
	}
	if (scenario.id == visual_physics::thermodynamics::ScenarioId::HeatConductionSlab) {
		if (!nearly_equal(snapshot.center_temperature_celsius.value_or(0.0), roundtrip_snapshot.center_temperature_celsius.value_or(0.0)) ||
			!nearly_equal(snapshot.surface_temperature_celsius.value_or(0.0), roundtrip_snapshot.surface_temperature_celsius.value_or(0.0)) ||
			!nearly_equal(snapshot.heat_flux_w_per_m2.value_or(0.0), roundtrip_snapshot.heat_flux_w_per_m2.value_or(0.0)) ||
			!nearly_equal(snapshot.fourier_number.value_or(0.0), roundtrip_snapshot.fourier_number.value_or(0.0)) ||
			!nearly_equal(snapshot.normalized_temperature.value_or(0.0), roundtrip_snapshot.normalized_temperature.value_or(0.0)) ||
			snapshot.stable != roundtrip_snapshot.stable) {
			throw std::runtime_error("Roundtrip check failed: thermodynamics snapshot mismatch");
		}
	} else if (scenario.id == visual_physics::thermodynamics::ScenarioId::CarnotCycle) {
		if (!nearly_equal(snapshot.pressure_pascals, roundtrip_snapshot.pressure_pascals) ||
			!nearly_equal(snapshot.internal_energy_joules, roundtrip_snapshot.internal_energy_joules) ||
			!nearly_equal(snapshot.temperature_kelvin, roundtrip_snapshot.temperature_kelvin) ||
			!nearly_equal(snapshot.volume_cubic_meters, roundtrip_snapshot.volume_cubic_meters) ||
			!nearly_equal(snapshot.thermal_efficiency.value_or(0.0), roundtrip_snapshot.thermal_efficiency.value_or(0.0)) ||
			!nearly_equal(snapshot.absorbed_heat_kj.value_or(0.0), roundtrip_snapshot.absorbed_heat_kj.value_or(0.0)) ||
			!nearly_equal(snapshot.rejected_heat_kj.value_or(0.0), roundtrip_snapshot.rejected_heat_kj.value_or(0.0)) ||
			!nearly_equal(snapshot.net_work_kj.value_or(0.0), roundtrip_snapshot.net_work_kj.value_or(0.0)) ||
			!nearly_equal(snapshot.entropy_transfer_kj_per_k.value_or(0.0), roundtrip_snapshot.entropy_transfer_kj_per_k.value_or(0.0)) ||
			snapshot.cycle_stage_label.value_or(std::string{}) != roundtrip_snapshot.cycle_stage_label.value_or(std::string{}) ||
			snapshot.stable != roundtrip_snapshot.stable) {
			throw std::runtime_error("Roundtrip check failed: thermodynamics snapshot mismatch");
		}
	} else if (!nearly_equal(snapshot.pressure_pascals, roundtrip_snapshot.pressure_pascals) ||
		!nearly_equal(snapshot.density_kg_m3, roundtrip_snapshot.density_kg_m3) ||
		!nearly_equal(snapshot.internal_energy_joules, roundtrip_snapshot.internal_energy_joules) ||
		!nearly_equal(snapshot.temperature_kelvin, roundtrip_snapshot.temperature_kelvin) ||
		!nearly_equal(snapshot.volume_cubic_meters, roundtrip_snapshot.volume_cubic_meters) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: thermodynamics snapshot mismatch");
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::thermodynamics::OverlayOptions{});
	if (overlays.show_pressure_guide != roundtrip_overlays.show_pressure_guide ||
		overlays.show_temperature_band != roundtrip_overlays.show_temperature_band ||
		overlays.show_energy_marker != roundtrip_overlays.show_energy_marker) {
		throw std::runtime_error("Roundtrip check failed: thermodynamics overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: thermodynamics sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (scenario.id == visual_physics::thermodynamics::ScenarioId::HeatConductionSlab) {
			if (!nearly_equal(samples[index].time_seconds, roundtrip_samples[index].time_seconds) ||
				!nearly_equal(samples[index].position_meters.value_or(0.0), roundtrip_samples[index].position_meters.value_or(0.0)) ||
				!nearly_equal(samples[index].temperature_celsius.value_or(0.0), roundtrip_samples[index].temperature_celsius.value_or(0.0)) ||
				!nearly_equal(samples[index].heat_flux_w_per_m2.value_or(0.0), roundtrip_samples[index].heat_flux_w_per_m2.value_or(0.0)) ||
				!nearly_equal(samples[index].normalized_temperature.value_or(0.0), roundtrip_samples[index].normalized_temperature.value_or(0.0)) ||
				samples[index].stable != roundtrip_samples[index].stable) {
				throw std::runtime_error("Roundtrip check failed: thermodynamics sample mismatch");
			}
		} else if (scenario.id == visual_physics::thermodynamics::ScenarioId::CarnotCycle) {
			if (!nearly_equal(samples[index].time_seconds, roundtrip_samples[index].time_seconds) ||
				!nearly_equal(samples[index].volume_cubic_meters, roundtrip_samples[index].volume_cubic_meters) ||
				!nearly_equal(samples[index].pressure_pascals, roundtrip_samples[index].pressure_pascals) ||
				!nearly_equal(samples[index].internal_energy_joules, roundtrip_samples[index].internal_energy_joules) ||
				!nearly_equal(
					samples[index].entropy_transfer_kj_per_k.value_or(0.0),
					roundtrip_samples[index].entropy_transfer_kj_per_k.value_or(0.0)) ||
				samples[index].stage_label.value_or(std::string{}) != roundtrip_samples[index].stage_label.value_or(std::string{}) ||
				samples[index].stable != roundtrip_samples[index].stable) {
				throw std::runtime_error("Roundtrip check failed: thermodynamics sample mismatch");
			}
		} else if (!nearly_equal(samples[index].time_seconds, roundtrip_samples[index].time_seconds) ||
			!nearly_equal(samples[index].volume_cubic_meters, roundtrip_samples[index].volume_cubic_meters) ||
			!nearly_equal(samples[index].pressure_pascals, roundtrip_samples[index].pressure_pascals) ||
			!nearly_equal(samples[index].temperature_kelvin, roundtrip_samples[index].temperature_kelvin) ||
			!nearly_equal(samples[index].internal_energy_joules, roundtrip_samples[index].internal_energy_joules) ||
			samples[index].stable != roundtrip_samples[index].stable) {
			throw std::runtime_error("Roundtrip check failed: thermodynamics sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::waves::Scenario& scenario,
	const visual_physics::waves::Snapshot& snapshot,
	const visual_physics::waves::OverlayOptions& overlays,
	const std::vector<visual_physics::waves::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::waves::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::waves::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::waves::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::waves::build_samples_at_time(
		imported.scenario,
		imported.time_seconds,
		sample_count);

	if (scenario.id != imported.scenario.id ||
		scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y)) {
		throw std::runtime_error("Roundtrip check failed: waves scenario mismatch");
	}
	if (scenario.id == visual_physics::waves::ScenarioId::StandingWave) {
		if (!nearly_equal(scenario.string_length_meters.value_or(0.0), imported.scenario.string_length_meters.value_or(0.0)) ||
			!nearly_equal(scenario.wave_speed_meters_per_second.value_or(0.0), imported.scenario.wave_speed_meters_per_second.value_or(0.0)) ||
			!nearly_equal(scenario.amplitude_millimeters.value_or(0.0), imported.scenario.amplitude_millimeters.value_or(0.0)) ||
			!nearly_equal(scenario.harmonic_number.value_or(0.0), imported.scenario.harmonic_number.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: waves scenario mismatch");
		}
	} else if (scenario.id == visual_physics::waves::ScenarioId::TravelingWave) {
		if (!nearly_equal(scenario.wave_speed_meters_per_second.value_or(0.0), imported.scenario.wave_speed_meters_per_second.value_or(0.0)) ||
			!nearly_equal(scenario.amplitude_millimeters.value_or(0.0), imported.scenario.amplitude_millimeters.value_or(0.0)) ||
			!nearly_equal(scenario.frequency_hertz.value_or(0.0), imported.scenario.frequency_hertz.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: waves scenario mismatch");
		}
	} else if (!nearly_equal(scenario.wave_speed_meters_per_second.value_or(0.0), imported.scenario.wave_speed_meters_per_second.value_or(0.0)) ||
		!nearly_equal(scenario.emitted_frequency_hertz.value_or(0.0), imported.scenario.emitted_frequency_hertz.value_or(0.0)) ||
		!nearly_equal(scenario.source_speed_meters_per_second.value_or(0.0), imported.scenario.source_speed_meters_per_second.value_or(0.0)) ||
		!nearly_equal(scenario.observer_speed_meters_per_second.value_or(0.0), imported.scenario.observer_speed_meters_per_second.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: waves scenario mismatch");
	}

	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: waves snapshot mismatch");
	}
	if (scenario.id == visual_physics::waves::ScenarioId::StandingWave) {
		if (!nearly_equal(snapshot.frequency_hertz.value_or(0.0), roundtrip_snapshot.frequency_hertz.value_or(0.0)) ||
			!nearly_equal(snapshot.wavelength_meters.value_or(0.0), roundtrip_snapshot.wavelength_meters.value_or(0.0)) ||
			!nearly_equal(snapshot.harmonic_number.value_or(0.0), roundtrip_snapshot.harmonic_number.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: waves snapshot mismatch");
		}
	} else if (scenario.id == visual_physics::waves::ScenarioId::TravelingWave) {
		if (!nearly_equal(snapshot.wave_speed_meters_per_second.value_or(0.0), roundtrip_snapshot.wave_speed_meters_per_second.value_or(0.0)) ||
			!nearly_equal(snapshot.frequency_hertz.value_or(0.0), roundtrip_snapshot.frequency_hertz.value_or(0.0)) ||
			!nearly_equal(snapshot.wavelength_meters.value_or(0.0), roundtrip_snapshot.wavelength_meters.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: waves snapshot mismatch");
		}
	} else if (!nearly_equal(snapshot.emitted_frequency_hertz.value_or(0.0), roundtrip_snapshot.emitted_frequency_hertz.value_or(0.0)) ||
		!nearly_equal(snapshot.apparent_frequency_hertz.value_or(0.0), roundtrip_snapshot.apparent_frequency_hertz.value_or(0.0)) ||
		!nearly_equal(snapshot.source_speed_meters_per_second.value_or(0.0), roundtrip_snapshot.source_speed_meters_per_second.value_or(0.0)) ||
		!nearly_equal(snapshot.observer_speed_meters_per_second.value_or(0.0), roundtrip_snapshot.observer_speed_meters_per_second.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: waves snapshot mismatch");
	}

	const auto roundtrip_overlays = imported.overlays.value_or(visual_physics::waves::OverlayOptions{});
	if (overlays.show_wave_guides != roundtrip_overlays.show_wave_guides ||
		overlays.show_node_markers != roundtrip_overlays.show_node_markers ||
		overlays.show_reference_curve != roundtrip_overlays.show_reference_curve) {
		throw std::runtime_error("Roundtrip check failed: waves overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: waves sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].position, roundtrip_samples[index].position) ||
			!nearly_equal(samples[index].primary_value, roundtrip_samples[index].primary_value) ||
			!nearly_equal(samples[index].secondary_value.value_or(0.0), roundtrip_samples[index].secondary_value.value_or(0.0)) ||
			samples[index].label != roundtrip_samples[index].label ||
			samples[index].active != roundtrip_samples[index].active) {
			throw std::runtime_error("Roundtrip check failed: waves sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::relativity::Scenario& scenario,
	const visual_physics::relativity::Snapshot& snapshot,
	const visual_physics::relativity::OverlayOptions& overlays,
	const std::vector<visual_physics::relativity::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::relativity::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::relativity::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::relativity::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::relativity::build_samples_at_time(
		imported.scenario,
		imported.time_seconds,
		sample_count);

	if (scenario.id != imported.scenario.id || scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y)) {
		throw std::runtime_error("Roundtrip check failed: relativity scenario mismatch");
	}
	if (scenario.id == visual_physics::relativity::ScenarioId::RelativisticDoppler) {
		if (!nearly_equal(
				scenario.emitted_frequency_hertz.value_or(0.0),
				imported.scenario.emitted_frequency_hertz.value_or(0.0)) ||
			!nearly_equal(
				scenario.source_velocity_fraction_of_light.value_or(0.0),
				imported.scenario.source_velocity_fraction_of_light.value_or(0.0)) ||
			!nearly_equal(
				scenario.observer_velocity_fraction_of_light.value_or(0.0),
				imported.scenario.observer_velocity_fraction_of_light.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: relativity scenario mismatch");
		}
	} else if (scenario.id == visual_physics::relativity::ScenarioId::GravitationalTimeDilation) {
		if (!nearly_equal(
				scenario.central_mass_solar_masses.value_or(0.0),
				imported.scenario.central_mass_solar_masses.value_or(0.0)) ||
			!nearly_equal(
				scenario.orbital_radius_schwarzschild_radii.value_or(0.0),
				imported.scenario.orbital_radius_schwarzschild_radii.value_or(0.0)) ||
			!nearly_equal(
				scenario.coordinate_time_seconds.value_or(0.0),
				imported.scenario.coordinate_time_seconds.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: relativity scenario mismatch");
		}
	} else if (!nearly_equal(
				scenario.relative_velocity_fraction_of_light.value_or(0.0),
				imported.scenario.relative_velocity_fraction_of_light.value_or(0.0)) ||
			!nearly_equal(
				scenario.proper_time_seconds.value_or(0.0),
				imported.scenario.proper_time_seconds.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: relativity scenario mismatch");
	}

	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		!nearly_equal(
			snapshot.relative_velocity_fraction_of_light.value_or(0.0),
			roundtrip_snapshot.relative_velocity_fraction_of_light.value_or(0.0)) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: relativity snapshot mismatch");
	}
	if (scenario.id == visual_physics::relativity::ScenarioId::RelativisticDoppler) {
		if (!nearly_equal(
				snapshot.emitted_frequency_hertz.value_or(0.0),
				roundtrip_snapshot.emitted_frequency_hertz.value_or(0.0)) ||
			!nearly_equal(
				snapshot.source_velocity_fraction_of_light.value_or(0.0),
				roundtrip_snapshot.source_velocity_fraction_of_light.value_or(0.0)) ||
			!nearly_equal(
				snapshot.observer_velocity_fraction_of_light.value_or(0.0),
				roundtrip_snapshot.observer_velocity_fraction_of_light.value_or(0.0)) ||
			!nearly_equal(
				snapshot.observed_frequency_hertz.value_or(0.0),
				roundtrip_snapshot.observed_frequency_hertz.value_or(0.0)) ||
			!nearly_equal(
				snapshot.classical_observed_frequency_hertz.value_or(0.0),
				roundtrip_snapshot.classical_observed_frequency_hertz.value_or(0.0)) ||
			!nearly_equal(
				snapshot.shift_ratio.value_or(0.0),
				roundtrip_snapshot.shift_ratio.value_or(0.0)) ||
			snapshot.redshift.value_or(false) != roundtrip_snapshot.redshift.value_or(false)) {
			throw std::runtime_error("Roundtrip check failed: relativity snapshot mismatch");
		}
	} else if (scenario.id == visual_physics::relativity::ScenarioId::GravitationalTimeDilation) {
		if (!nearly_equal(
				snapshot.central_mass_solar_masses.value_or(0.0),
				roundtrip_snapshot.central_mass_solar_masses.value_or(0.0)) ||
			!nearly_equal(
				snapshot.orbital_radius_schwarzschild_radii.value_or(0.0),
				roundtrip_snapshot.orbital_radius_schwarzschild_radii.value_or(0.0)) ||
			!nearly_equal(
				snapshot.schwarzschild_radius_kilometers.value_or(0.0),
				roundtrip_snapshot.schwarzschild_radius_kilometers.value_or(0.0)) ||
			!nearly_equal(
				snapshot.gravitational_time_factor.value_or(0.0),
				roundtrip_snapshot.gravitational_time_factor.value_or(0.0)) ||
			!nearly_equal(
				snapshot.local_elapsed_time_seconds.value_or(0.0),
				roundtrip_snapshot.local_elapsed_time_seconds.value_or(0.0)) ||
			!nearly_equal(
				snapshot.time_difference_seconds.value_or(0.0),
				roundtrip_snapshot.time_difference_seconds.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: relativity snapshot mismatch");
		}
	} else if (!nearly_equal(
				snapshot.proper_time_seconds.value_or(0.0),
				roundtrip_snapshot.proper_time_seconds.value_or(0.0)) ||
			!nearly_equal(
				snapshot.lorentz_factor_gamma.value_or(0.0),
				roundtrip_snapshot.lorentz_factor_gamma.value_or(0.0)) ||
			!nearly_equal(
				snapshot.dilated_time_seconds.value_or(0.0),
				roundtrip_snapshot.dilated_time_seconds.value_or(0.0)) ||
			!nearly_equal(
				snapshot.time_difference_seconds.value_or(0.0),
				roundtrip_snapshot.time_difference_seconds.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: relativity snapshot mismatch");
	}

	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::relativity::OverlayOptions{});
	if (overlays.show_reference_guides != roundtrip_overlays.show_reference_guides ||
		overlays.show_comparison_curve != roundtrip_overlays.show_comparison_curve ||
		overlays.show_active_marker != roundtrip_overlays.show_active_marker) {
		throw std::runtime_error("Roundtrip check failed: relativity overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: relativity sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].position, roundtrip_samples[index].position) ||
			!nearly_equal(samples[index].primary_value, roundtrip_samples[index].primary_value) ||
			!nearly_equal(
				samples[index].secondary_value.value_or(0.0),
				roundtrip_samples[index].secondary_value.value_or(0.0)) ||
			samples[index].label != roundtrip_samples[index].label ||
			samples[index].active != roundtrip_samples[index].active) {
			throw std::runtime_error("Roundtrip check failed: relativity sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::solid_state::Scenario& scenario,
	const visual_physics::solid_state::Snapshot& snapshot,
	const visual_physics::solid_state::OverlayOptions& overlays,
	const std::vector<visual_physics::solid_state::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::solid_state::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::solid_state::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::solid_state::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::solid_state::build_samples_at_time(
		imported.scenario,
		imported.time_seconds,
		sample_count);

	if (scenario.id != imported.scenario.id || scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y)) {
		throw std::runtime_error("Roundtrip check failed: solid-state scenario mismatch");
	}
	if (scenario.id == visual_physics::solid_state::ScenarioId::CrystalElasticity) {
		if (!nearly_equal(
				scenario.max_strain_percent.value_or(0.0),
				imported.scenario.max_strain_percent.value_or(0.0)) ||
			!nearly_equal(
				scenario.youngs_modulus_gigapascals.value_or(0.0),
				imported.scenario.youngs_modulus_gigapascals.value_or(0.0)) ||
			!nearly_equal(
				scenario.yield_strength_megapascals.value_or(0.0),
				imported.scenario.yield_strength_megapascals.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: solid-state scenario mismatch");
		}
	} else if (scenario.id == visual_physics::solid_state::ScenarioId::PhononDispersion) {
		if (!nearly_equal(
				scenario.lattice_spacing_nanometers.value_or(0.0),
				imported.scenario.lattice_spacing_nanometers.value_or(0.0)) ||
			!nearly_equal(
				scenario.spring_constant_newtons_per_meter.value_or(0.0),
				imported.scenario.spring_constant_newtons_per_meter.value_or(0.0)) ||
			!nearly_equal(
				scenario.atomic_mass_amu.value_or(0.0),
				imported.scenario.atomic_mass_amu.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: solid-state scenario mismatch");
		}
	} else if (!nearly_equal(
				scenario.band_gap_electron_volts.value_or(0.0),
				imported.scenario.band_gap_electron_volts.value_or(0.0)) ||
			!nearly_equal(
				scenario.effective_mass_ratio.value_or(0.0),
				imported.scenario.effective_mass_ratio.value_or(0.0)) ||
			!nearly_equal(
				scenario.dopant_density_per_cubic_centimeter.value_or(0.0),
				imported.scenario.dopant_density_per_cubic_centimeter.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: solid-state scenario mismatch");
	}
	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: solid-state snapshot mismatch");
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::solid_state::OverlayOptions{});
	if (overlays.show_reference_guides != roundtrip_overlays.show_reference_guides ||
		overlays.show_active_marker != roundtrip_overlays.show_active_marker ||
		overlays.show_comparison_band != roundtrip_overlays.show_comparison_band) {
		throw std::runtime_error("Roundtrip check failed: solid-state overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: solid-state sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].position, roundtrip_samples[index].position) ||
			!nearly_equal(samples[index].primary_value, roundtrip_samples[index].primary_value) ||
			!nearly_equal(
				samples[index].secondary_value.value_or(0.0),
				roundtrip_samples[index].secondary_value.value_or(0.0)) ||
			samples[index].label != roundtrip_samples[index].label ||
			samples[index].active != roundtrip_samples[index].active) {
			throw std::runtime_error("Roundtrip check failed: solid-state sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::nuclear_and_particle_physics::Scenario& scenario,
	const visual_physics::nuclear_and_particle_physics::Snapshot& snapshot,
	const visual_physics::nuclear_and_particle_physics::OverlayOptions& overlays,
	const std::vector<visual_physics::nuclear_and_particle_physics::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::nuclear_and_particle_physics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::nuclear_and_particle_physics::parse_import_payload(payload);
	const auto roundtrip_snapshot = visual_physics::nuclear_and_particle_physics::sample_scenario(
		imported.scenario,
		imported.time_seconds);
	const auto roundtrip_samples = visual_physics::nuclear_and_particle_physics::build_samples_at_time(
		imported.scenario,
		imported.time_seconds,
		sample_count);

	if (scenario.id != imported.scenario.id || scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y)) {
		throw std::runtime_error("Roundtrip check failed: nuclear-and-particle-physics scenario mismatch");
	}
	if (scenario.id == visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay) {
		if (!nearly_equal(
				scenario.half_life_hours.value_or(0.0),
				imported.scenario.half_life_hours.value_or(0.0)) ||
			!nearly_equal(
				scenario.initial_population_trillions.value_or(0.0),
				imported.scenario.initial_population_trillions.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: nuclear-and-particle-physics scenario mismatch");
		}
	} else if (scenario.id == visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve) {
		if (!nearly_equal(scenario.mass_number.value_or(0.0), imported.scenario.mass_number.value_or(0.0)) ||
			!nearly_equal(scenario.proton_count.value_or(0.0), imported.scenario.proton_count.value_or(0.0)) ||
			!nearly_equal(
				scenario.binding_energy_per_nucleon_mev.value_or(0.0),
				imported.scenario.binding_energy_per_nucleon_mev.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: nuclear-and-particle-physics scenario mismatch");
		}
	} else if (!nearly_equal(
				scenario.beam_energy_gev.value_or(0.0),
				imported.scenario.beam_energy_gev.value_or(0.0)) ||
			!nearly_equal(
				scenario.scattering_angle_degrees.value_or(0.0),
				imported.scenario.scattering_angle_degrees.value_or(0.0)) ||
			!nearly_equal(
				scenario.detector_radius_meters.value_or(0.0),
				imported.scenario.detector_radius_meters.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: nuclear-and-particle-physics scenario mismatch");
	}
	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: nuclear-and-particle-physics snapshot mismatch");
	}
	const auto roundtrip_overlays = imported.overlays.value_or(
		visual_physics::nuclear_and_particle_physics::OverlayOptions{});
	if (overlays.show_reference_guides != roundtrip_overlays.show_reference_guides ||
		overlays.show_active_marker != roundtrip_overlays.show_active_marker ||
		overlays.show_comparison_band != roundtrip_overlays.show_comparison_band) {
		throw std::runtime_error("Roundtrip check failed: nuclear-and-particle-physics overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: nuclear-and-particle-physics sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].position, roundtrip_samples[index].position) ||
			!nearly_equal(samples[index].primary_value, roundtrip_samples[index].primary_value) ||
			!nearly_equal(
				samples[index].secondary_value.value_or(0.0),
				roundtrip_samples[index].secondary_value.value_or(0.0)) ||
			samples[index].label != roundtrip_samples[index].label ||
			samples[index].active != roundtrip_samples[index].active) {
			throw std::runtime_error("Roundtrip check failed: nuclear-and-particle-physics sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::atmospheric::Scenario& scenario,
	const visual_physics::atmospheric::Snapshot& snapshot,
	const visual_physics::atmospheric::OverlayOptions& overlays,
	const std::vector<visual_physics::atmospheric::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::atmospheric::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::atmospheric::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::atmospheric::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::atmospheric::build_samples_at_time(
		imported.scenario,
		imported.time_seconds,
		sample_count);

	if (scenario.id != imported.scenario.id || scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y)) {
		throw std::runtime_error("Roundtrip check failed: atmospheric scenario mismatch");
	}
	if (scenario.id == visual_physics::atmospheric::ScenarioId::BarometricFormula) {
		if (!nearly_equal(
				scenario.sea_level_pressure_kilopascals.value_or(0.0),
				imported.scenario.sea_level_pressure_kilopascals.value_or(0.0)) ||
			!nearly_equal(
				scenario.scale_height_kilometers.value_or(0.0),
				imported.scenario.scale_height_kilometers.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: atmospheric scenario mismatch");
		}
	} else if (scenario.id == visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate) {
		if (!nearly_equal(
				scenario.surface_temperature_kelvin.value_or(0.0),
				imported.scenario.surface_temperature_kelvin.value_or(0.0)) ||
			!nearly_equal(
				scenario.lapse_rate_kelvin_per_kilometer.value_or(0.0),
				imported.scenario.lapse_rate_kelvin_per_kilometer.value_or(0.0)) ||
			!nearly_equal(
				scenario.tropopause_height_kilometers.value_or(0.0),
				imported.scenario.tropopause_height_kilometers.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: atmospheric scenario mismatch");
		}
	} else if (!nearly_equal(
				scenario.surface_temperature_kelvin.value_or(0.0),
				imported.scenario.surface_temperature_kelvin.value_or(0.0)) ||
			!nearly_equal(
				scenario.environmental_lapse_rate_kelvin_per_kilometer.value_or(0.0),
				imported.scenario.environmental_lapse_rate_kelvin_per_kilometer.value_or(0.0)) ||
			!nearly_equal(
				scenario.parcel_temperature_excess_kelvin.value_or(0.0),
				imported.scenario.parcel_temperature_excess_kelvin.value_or(0.0)) ||
			!nearly_equal(
				scenario.column_height_kilometers.value_or(0.0),
				imported.scenario.column_height_kilometers.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: atmospheric scenario mismatch");
	}
	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: atmospheric snapshot mismatch");
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::atmospheric::OverlayOptions{});
	if (overlays.show_reference_guides != roundtrip_overlays.show_reference_guides ||
		overlays.show_active_marker != roundtrip_overlays.show_active_marker ||
		overlays.show_comparison_band != roundtrip_overlays.show_comparison_band) {
		throw std::runtime_error("Roundtrip check failed: atmospheric overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: atmospheric sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].position, roundtrip_samples[index].position) ||
			!nearly_equal(samples[index].primary_value, roundtrip_samples[index].primary_value) ||
			!nearly_equal(
				samples[index].secondary_value.value_or(0.0),
				roundtrip_samples[index].secondary_value.value_or(0.0)) ||
			samples[index].label != roundtrip_samples[index].label ||
			samples[index].active != roundtrip_samples[index].active) {
			throw std::runtime_error("Roundtrip check failed: atmospheric sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::astrophysics::Scenario& scenario,
	const visual_physics::astrophysics::Snapshot& snapshot,
	const visual_physics::astrophysics::OverlayOptions& overlays,
	const std::vector<visual_physics::astrophysics::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::astrophysics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::astrophysics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::astrophysics::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::astrophysics::build_samples_at_time(
		imported.scenario,
		imported.time_seconds,
		sample_count);

	if (scenario.id != imported.scenario.id || scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y)) {
		throw std::runtime_error("Roundtrip check failed: astrophysics scenario mismatch");
	}
	if (scenario.id == visual_physics::astrophysics::ScenarioId::PlanetaryOrbit) {
		if (!nearly_equal(
				scenario.central_mass_solar_masses.value_or(0.0),
				imported.scenario.central_mass_solar_masses.value_or(0.0)) ||
			!nearly_equal(
				scenario.orbital_radius_astronomical_units.value_or(0.0),
				imported.scenario.orbital_radius_astronomical_units.value_or(0.0)) ||
			!nearly_equal(
				scenario.orbital_eccentricity.value_or(0.0),
				imported.scenario.orbital_eccentricity.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: astrophysics scenario mismatch");
		}
	} else if (scenario.id == visual_physics::astrophysics::ScenarioId::StellarLuminosity) {
		if (!nearly_equal(
				scenario.stellar_mass_solar_masses.value_or(0.0),
				imported.scenario.stellar_mass_solar_masses.value_or(0.0)) ||
			!nearly_equal(
				scenario.stellar_radius_solar_radii.value_or(0.0),
				imported.scenario.stellar_radius_solar_radii.value_or(0.0)) ||
			!nearly_equal(
				scenario.surface_temperature_kelvin.value_or(0.0),
				imported.scenario.surface_temperature_kelvin.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: astrophysics scenario mismatch");
		}
	} else if (!nearly_equal(
				scenario.distance_megaparsecs.value_or(0.0),
				imported.scenario.distance_megaparsecs.value_or(0.0)) ||
			!nearly_equal(
				scenario.hubble_constant_kilometers_per_second_per_megaparsec.value_or(0.0),
				imported.scenario.hubble_constant_kilometers_per_second_per_megaparsec.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: astrophysics scenario mismatch");
	}
	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: astrophysics snapshot mismatch");
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::astrophysics::OverlayOptions{});
	if (overlays.show_reference_guides != roundtrip_overlays.show_reference_guides ||
		overlays.show_active_marker != roundtrip_overlays.show_active_marker ||
		overlays.show_comparison_band != roundtrip_overlays.show_comparison_band) {
		throw std::runtime_error("Roundtrip check failed: astrophysics overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: astrophysics sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].position, roundtrip_samples[index].position) ||
			!nearly_equal(samples[index].primary_value, roundtrip_samples[index].primary_value) ||
			!nearly_equal(
				samples[index].secondary_value.value_or(0.0),
				roundtrip_samples[index].secondary_value.value_or(0.0)) ||
			samples[index].label != roundtrip_samples[index].label ||
			samples[index].active != roundtrip_samples[index].active) {
			throw std::runtime_error("Roundtrip check failed: astrophysics sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::plasma_physics::Scenario& scenario,
	const visual_physics::plasma_physics::Snapshot& snapshot,
	const visual_physics::plasma_physics::OverlayOptions& overlays,
	const std::vector<visual_physics::plasma_physics::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::plasma_physics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::plasma_physics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::plasma_physics::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples = visual_physics::plasma_physics::build_samples_at_time(
		imported.scenario,
		imported.time_seconds,
		sample_count);

	if (scenario.id != imported.scenario.id || scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y)) {
		throw std::runtime_error("Roundtrip check failed: plasma-physics scenario mismatch");
	}
	if (scenario.id == visual_physics::plasma_physics::ScenarioId::PlasmaOscillation) {
		if (!nearly_equal(
				scenario.electron_density_per_cubic_meter.value_or(0.0),
				imported.scenario.electron_density_per_cubic_meter.value_or(0.0)) ||
			!nearly_equal(
				scenario.electron_temperature_electron_volts.value_or(0.0),
				imported.scenario.electron_temperature_electron_volts.value_or(0.0)) ||
			!nearly_equal(
				scenario.perturbation_amplitude_percent.value_or(0.0),
				imported.scenario.perturbation_amplitude_percent.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: plasma-physics scenario mismatch");
		}
	} else if (scenario.id == visual_physics::plasma_physics::ScenarioId::DebyeScreening) {
		if (!nearly_equal(
				scenario.electron_density_per_cubic_meter.value_or(0.0),
				imported.scenario.electron_density_per_cubic_meter.value_or(0.0)) ||
			!nearly_equal(
				scenario.electron_temperature_electron_volts.value_or(0.0),
				imported.scenario.electron_temperature_electron_volts.value_or(0.0)) ||
			!nearly_equal(
				scenario.probe_potential_volts.value_or(0.0),
				imported.scenario.probe_potential_volts.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: plasma-physics scenario mismatch");
		}
	} else if (!nearly_equal(
				scenario.magnetic_field_tesla.value_or(0.0),
				imported.scenario.magnetic_field_tesla.value_or(0.0)) ||
			!nearly_equal(
				scenario.plasma_current_mega_amperes.value_or(0.0),
				imported.scenario.plasma_current_mega_amperes.value_or(0.0)) ||
			!nearly_equal(
				scenario.major_radius_meters.value_or(0.0),
				imported.scenario.major_radius_meters.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: plasma-physics scenario mismatch");
	}
	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: plasma-physics snapshot mismatch");
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::plasma_physics::OverlayOptions{});
	if (overlays.show_reference_guides != roundtrip_overlays.show_reference_guides ||
		overlays.show_active_marker != roundtrip_overlays.show_active_marker ||
		overlays.show_comparison_band != roundtrip_overlays.show_comparison_band) {
		throw std::runtime_error("Roundtrip check failed: plasma-physics overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: plasma-physics sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].position, roundtrip_samples[index].position) ||
			!nearly_equal(samples[index].primary_value, roundtrip_samples[index].primary_value) ||
			!nearly_equal(
				samples[index].secondary_value.value_or(0.0),
				roundtrip_samples[index].secondary_value.value_or(0.0)) ||
			samples[index].label != roundtrip_samples[index].label ||
			samples[index].active != roundtrip_samples[index].active) {
			throw std::runtime_error("Roundtrip check failed: plasma-physics sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::optics::Scenario& scenario,
	const visual_physics::optics::Snapshot& snapshot,
	const visual_physics::optics::OverlayOptions& overlays,
	const std::vector<visual_physics::optics::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::optics::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::optics::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::optics::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::optics::build_samples(imported.scenario, sample_count);

	if (scenario.id != imported.scenario.id ||
		scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds)) {
		throw std::runtime_error("Roundtrip check failed: optics scenario mismatch");
	}
	if (scenario.id == visual_physics::optics::ScenarioId::SnellRefraction) {
		if (!nearly_equal(
				scenario.incident_angle_degrees.value_or(0.0),
				imported.scenario.incident_angle_degrees.value_or(0.0)) ||
			!nearly_equal(
				scenario.medium_a_refractive_index.value_or(0.0),
				imported.scenario.medium_a_refractive_index.value_or(0.0)) ||
			!nearly_equal(
				scenario.medium_b_refractive_index.value_or(0.0),
				imported.scenario.medium_b_refractive_index.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: optics scenario mismatch");
		}
	} else if (scenario.id == visual_physics::optics::ScenarioId::ThinLensImaging) {
		if (!nearly_equal(
				scenario.focal_length_centimeters.value_or(0.0),
				imported.scenario.focal_length_centimeters.value_or(0.0)) ||
			!nearly_equal(
				scenario.object_distance_centimeters.value_or(0.0),
				imported.scenario.object_distance_centimeters.value_or(0.0)) ||
			!nearly_equal(
				scenario.object_height_centimeters.value_or(0.0),
				imported.scenario.object_height_centimeters.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: optics scenario mismatch");
		}
	} else if (!nearly_equal(
			scenario.slit_width_micrometers.value_or(0.0),
			imported.scenario.slit_width_micrometers.value_or(0.0)) ||
		!nearly_equal(
			scenario.wavelength_nanometers.value_or(0.0),
			imported.scenario.wavelength_nanometers.value_or(0.0)) ||
		!nearly_equal(
			scenario.screen_distance_meters.value_or(0.0),
			imported.scenario.screen_distance_meters.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: optics scenario mismatch");
	}
	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: optics snapshot mismatch");
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::optics::OverlayOptions{});
	if (overlays.show_incident_guide != roundtrip_overlays.show_incident_guide ||
		overlays.show_normal_guide != roundtrip_overlays.show_normal_guide ||
		overlays.show_secondary_guide != roundtrip_overlays.show_secondary_guide) {
		throw std::runtime_error("Roundtrip check failed: optics overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: optics sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].time_seconds, roundtrip_samples[index].time_seconds) ||
			samples[index].ray_label != roundtrip_samples[index].ray_label ||
			!nearly_equal(samples[index].start_x, roundtrip_samples[index].start_x) ||
			!nearly_equal(samples[index].start_y, roundtrip_samples[index].start_y) ||
			!nearly_equal(samples[index].end_x, roundtrip_samples[index].end_x) ||
			!nearly_equal(samples[index].end_y, roundtrip_samples[index].end_y) ||
			!nearly_equal(samples[index].angle_degrees, roundtrip_samples[index].angle_degrees) ||
			samples[index].active != roundtrip_samples[index].active ||
			samples[index].stable != roundtrip_samples[index].stable) {
			throw std::runtime_error("Roundtrip check failed: optics sample mismatch");
		}
	}
}

void verify_roundtrip_payload(
	const visual_physics::quantum::Scenario& scenario,
	const visual_physics::quantum::Snapshot& snapshot,
	const visual_physics::quantum::OverlayOptions& overlays,
	const std::vector<visual_physics::quantum::Sample>& samples,
	std::size_t sample_count) {
	const auto payload = visual_physics::quantum::serialize_export_payload(
		scenario,
		snapshot,
		overlays,
		samples,
		"roundtrip-check");
	const auto imported = visual_physics::quantum::parse_import_payload(payload);
	const auto roundtrip_snapshot =
		visual_physics::quantum::sample_scenario(imported.scenario, imported.time_seconds);
	const auto roundtrip_samples =
		visual_physics::quantum::build_samples(imported.scenario, sample_count);

	if (scenario.id != imported.scenario.id ||
		scenario.name != imported.scenario.name ||
		scenario.summary != imported.scenario.summary ||
		scenario.equation_summary != imported.scenario.equation_summary ||
		scenario.status != imported.scenario.status ||
		scenario.focus_area != imported.scenario.focus_area ||
		!nearly_equal(scenario.duration_seconds, imported.scenario.duration_seconds) ||
		!nearly_equal(scenario.view_bounds.min_x, imported.scenario.view_bounds.min_x) ||
		!nearly_equal(scenario.view_bounds.max_x, imported.scenario.view_bounds.max_x) ||
		!nearly_equal(scenario.view_bounds.min_y, imported.scenario.view_bounds.min_y) ||
		!nearly_equal(scenario.view_bounds.max_y, imported.scenario.view_bounds.max_y)) {
		throw std::runtime_error("Roundtrip check failed: quantum scenario mismatch");
	}
	if (scenario.id == visual_physics::quantum::ScenarioId::ParticleInBox) {
		if (!nearly_equal(
				scenario.box_length_nanometers.value_or(0.0),
				imported.scenario.box_length_nanometers.value_or(0.0)) ||
			!nearly_equal(
				scenario.quantum_number.value_or(0.0),
				imported.scenario.quantum_number.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: quantum scenario mismatch");
		}
	} else if (scenario.id == visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling) {
		if (!nearly_equal(
				scenario.particle_energy_ev.value_or(0.0),
				imported.scenario.particle_energy_ev.value_or(0.0)) ||
			!nearly_equal(
				scenario.barrier_height_ev.value_or(0.0),
				imported.scenario.barrier_height_ev.value_or(0.0)) ||
			!nearly_equal(
				scenario.barrier_width_nanometers.value_or(0.0),
				imported.scenario.barrier_width_nanometers.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: quantum scenario mismatch");
		}
	} else if (!nearly_equal(
				scenario.wavelength_nanometers.value_or(0.0),
				imported.scenario.wavelength_nanometers.value_or(0.0)) ||
			!nearly_equal(
				scenario.slit_separation_micrometers.value_or(0.0),
				imported.scenario.slit_separation_micrometers.value_or(0.0)) ||
			!nearly_equal(
				scenario.slit_width_micrometers.value_or(0.0),
				imported.scenario.slit_width_micrometers.value_or(0.0)) ||
			!nearly_equal(
				scenario.screen_distance_meters.value_or(0.0),
				imported.scenario.screen_distance_meters.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: quantum scenario mismatch");
	}
	if (!nearly_equal(snapshot.time_seconds, roundtrip_snapshot.time_seconds) ||
		snapshot.stable != roundtrip_snapshot.stable) {
		throw std::runtime_error("Roundtrip check failed: quantum snapshot mismatch");
	}
	if (scenario.id == visual_physics::quantum::ScenarioId::ParticleInBox) {
		if (!nearly_equal(
				snapshot.energy_level_ev.value_or(0.0),
				roundtrip_snapshot.energy_level_ev.value_or(0.0)) ||
			!nearly_equal(
				snapshot.de_broglie_wavelength_nanometers.value_or(0.0),
				roundtrip_snapshot.de_broglie_wavelength_nanometers.value_or(0.0)) ||
			!nearly_equal(
				snapshot.node_count.value_or(0.0),
				roundtrip_snapshot.node_count.value_or(0.0)) ||
			!nearly_equal(
				snapshot.first_antinode_nanometers.value_or(0.0),
				roundtrip_snapshot.first_antinode_nanometers.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: quantum snapshot mismatch");
		}
	} else if (scenario.id == visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling) {
		if (!nearly_equal(
				snapshot.transmission_probability.value_or(0.0),
				roundtrip_snapshot.transmission_probability.value_or(0.0)) ||
			!nearly_equal(
				snapshot.reflection_probability.value_or(0.0),
				roundtrip_snapshot.reflection_probability.value_or(0.0)) ||
			!nearly_equal(
				snapshot.decay_length_nanometers.value_or(0.0),
				roundtrip_snapshot.decay_length_nanometers.value_or(0.0))) {
			throw std::runtime_error("Roundtrip check failed: quantum snapshot mismatch");
		}
	} else if (!nearly_equal(
				snapshot.fringe_spacing_millimeters.value_or(0.0),
				roundtrip_snapshot.fringe_spacing_millimeters.value_or(0.0)) ||
			!nearly_equal(
				snapshot.central_maximum_width_millimeters.value_or(0.0),
				roundtrip_snapshot.central_maximum_width_millimeters.value_or(0.0)) ||
			!nearly_equal(
				snapshot.coherence_estimate.value_or(0.0),
				roundtrip_snapshot.coherence_estimate.value_or(0.0))) {
		throw std::runtime_error("Roundtrip check failed: quantum snapshot mismatch");
	}
	const auto roundtrip_overlays =
		imported.overlays.value_or(visual_physics::quantum::OverlayOptions{});
	if (overlays.show_probability_guide != roundtrip_overlays.show_probability_guide ||
		overlays.show_potential_guide != roundtrip_overlays.show_potential_guide ||
		overlays.show_phase_guide != roundtrip_overlays.show_phase_guide) {
		throw std::runtime_error("Roundtrip check failed: quantum overlays mismatch");
	}
	if (samples.size() != roundtrip_samples.size()) {
		throw std::runtime_error("Roundtrip check failed: quantum sample count mismatch");
	}
	for (std::size_t index = 0; index < samples.size(); index += 1) {
		if (!nearly_equal(samples[index].position, roundtrip_samples[index].position) ||
			!nearly_equal(samples[index].primary_value, roundtrip_samples[index].primary_value) ||
			!nearly_equal(
				samples[index].secondary_value.value_or(0.0),
				roundtrip_samples[index].secondary_value.value_or(0.0)) ||
			samples[index].label != roundtrip_samples[index].label ||
			samples[index].active != roundtrip_samples[index].active) {
			throw std::runtime_error("Roundtrip check failed: quantum sample mismatch");
		}
	}
}

std::string build_export_timestamp() {
	const auto now = std::time(nullptr);
	std::tm utc_time{};
	gmtime_r(&now, &utc_time);
	std::ostringstream timestamp;
	timestamp << std::put_time(&utc_time, "%Y-%m-%dT%H:%M:%S.000Z");
	return timestamp.str();
}

visual_physics::kinematics::ImportedScenarioState resolve_imported_state(const ProgramOptions& options) {
	validate_kinematics_options(options);
	if (!options.import_path.has_value()) {
		const auto parsed_id = options.scenario_id_text.has_value()
			? visual_physics::kinematics::parse_scenario_id(*options.scenario_id_text)
			: std::optional<visual_physics::kinematics::ScenarioId>{};
		if (options.scenario_id_text.has_value() && !parsed_id.has_value()) {
			throw std::runtime_error("Unknown kinematics scenario id: " + *options.scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::kinematics::make_default_scenario(
				parsed_id.value_or(visual_physics::kinematics::ScenarioId::Projectile)),
			options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(1.5),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::kinematics::parse_import_payload(
		read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::dynamics::ImportedScenarioState resolve_imported_dynamics_state(
	const ProgramOptions& options) {
	validate_dynamics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text =
			options.scenario_id_text.value_or(std::string("drag-projectile"));
		const auto parsed_id = visual_physics::dynamics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown dynamics scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::dynamics::make_default_scenario(*parsed_id),
			options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(1.5),
			.overlays = apply_overlay_overrides(visual_physics::dynamics::OverlayOptions{}, options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::dynamics::parse_import_payload(
		read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::dynamics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::statics::ImportedScenarioState resolve_imported_statics_state(
	const ProgramOptions& options) {
	validate_statics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text =
			options.scenario_id_text.value_or(std::string("beam-support"));
		const auto parsed_id = visual_physics::statics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown statics scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::statics::make_default_scenario(*parsed_id),
			options);
		validate_statics_scenario_overrides(scenario, options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(0.0),
			.overlays = apply_overlay_overrides(visual_physics::statics::OverlayOptions{}, options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::statics::parse_import_payload(
		read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	validate_statics_scenario_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::statics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::electromagnetism::ImportedScenarioState resolve_imported_electromagnetism_state(
	const ProgramOptions& options) {
	validate_electromagnetism_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text =
			options.scenario_id_text.value_or(std::string("point-charge-electrostatics"));
		const auto parsed_id = visual_physics::electromagnetism::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown electromagnetism scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::electromagnetism::make_default_scenario(*parsed_id),
			options);
		validate_electromagnetism_scenario_overrides(scenario, options);
		const double default_time_seconds =
			scenario.id == visual_physics::electromagnetism::ScenarioId::MovingChargeMagneticField ||
			scenario.id == visual_physics::electromagnetism::ScenarioId::ElectromagneticInduction
				? 1.5
				: 0.0;
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(default_time_seconds),
			.overlays = apply_overlay_overrides(
				visual_physics::electromagnetism::OverlayOptions{},
				options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::electromagnetism::parse_import_payload(
		read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	validate_electromagnetism_scenario_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::electromagnetism::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::electronics::ImportedScenarioState resolve_imported_electronics_state(
	const ProgramOptions& options) {
	validate_electronics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("rc-transient"));
		const auto parsed_id = visual_physics::electronics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown electronics scenario id: " + scenario_id_text);
		}
		const auto scenario = visual_physics::electronics::make_default_scenario(*parsed_id);
		const bool is_rc_filter =
			scenario.id == visual_physics::electronics::ScenarioId::RcLowPass ||
			scenario.id == visual_physics::electronics::ScenarioId::RcHighPass;
		const bool is_rl_filter =
			scenario.id == visual_physics::electronics::ScenarioId::RlLowPass ||
			scenario.id == visual_physics::electronics::ScenarioId::RlHighPass;
		const bool is_rlc_filter =
			scenario.id == visual_physics::electronics::ScenarioId::RlcResonance;
		const double default_time_seconds =
			is_rc_filter
				? 1.0 / (2.0 * kPi * std::max(scenario.resistance_ohms, 1e-6) * std::max(scenario.capacitance_farads, 1e-12))
				: (is_rl_filter
					? std::max(scenario.resistance_ohms, 1e-6) /
						(2.0 * kPi * std::max(scenario.inductance_henrys.value_or(0.0), 1e-12))
					: (is_rlc_filter
						? 1.0 /
							(2.0 * kPi * std::sqrt(
								std::max(scenario.inductance_henrys.value_or(0.0), 1e-12) *
								std::max(scenario.capacitance_farads, 1e-12)))
						: scenario.duration_seconds * 0.5));
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(default_time_seconds),
			.overlays = apply_overlay_overrides(visual_physics::electronics::OverlayOptions{}, options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::electronics::parse_import_payload(
		read_text_file(*options.import_path));
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::electronics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::computational_physics::ImportedScenarioState resolve_imported_computational_physics_state(
	const ProgramOptions& options) {
	validate_computational_physics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text =
			options.scenario_id_text.value_or(std::string("projectile-solver-comparison"));
		const auto parsed_id =
			visual_physics::computational_physics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error(
				"Unknown computational physics scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::computational_physics::make_default_scenario(*parsed_id),
			options);
		validate_computational_physics_scenario_overrides(scenario, options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(
				scenario.id == visual_physics::computational_physics::ScenarioId::OrbitalSolverComparison
					? 8.0
					: (scenario.id == visual_physics::computational_physics::ScenarioId::SpringOscillatorComparison
						? 6.0
						: 1.5)),
			.overlays = apply_overlay_overrides(
				visual_physics::computational_physics::OverlayOptions{},
				options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::computational_physics::parse_import_payload(
		read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	validate_computational_physics_scenario_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::computational_physics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::fluid_mechanics::ImportedScenarioState resolve_imported_fluid_mechanics_state(
	const ProgramOptions& options) {
	validate_fluid_mechanics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("buoyancy-block"));
		const auto parsed_id = visual_physics::fluid_mechanics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown fluid mechanics scenario id: " + scenario_id_text);
		}
		const auto scenario = visual_physics::fluid_mechanics::make_default_scenario(*parsed_id);
		const double default_time_seconds =
			scenario.id == visual_physics::fluid_mechanics::ScenarioId::BuoyancyBlock
				? scenario.duration_seconds * 0.5
				: 0.0;
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(default_time_seconds),
			.overlays = apply_overlay_overrides(
				visual_physics::fluid_mechanics::OverlayOptions{},
				options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::fluid_mechanics::parse_import_payload(
		read_text_file(*options.import_path));
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::fluid_mechanics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::thermodynamics::ImportedScenarioState resolve_imported_thermodynamics_state(
	const ProgramOptions& options) {
	validate_thermodynamics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("ideal-gas-state"));
		const auto parsed_id = visual_physics::thermodynamics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown thermodynamics scenario id: " + scenario_id_text);
		}
		const auto scenario = visual_physics::thermodynamics::make_default_scenario(*parsed_id);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(scenario.duration_seconds * 0.25),
			.overlays = apply_overlay_overrides(
				visual_physics::thermodynamics::OverlayOptions{},
				options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::thermodynamics::parse_import_payload(
		read_text_file(*options.import_path));
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::thermodynamics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

double default_waves_time_seconds(visual_physics::waves::ScenarioId id) {
	switch (id) {
	case visual_physics::waves::ScenarioId::StandingWave:
		return 0.0;
	case visual_physics::waves::ScenarioId::TravelingWave:
		return 0.25;
	case visual_physics::waves::ScenarioId::DopplerEffect:
		return 0.0;
	}
	throw std::runtime_error("Unknown waves scenario id");
}

double default_relativity_time_seconds(visual_physics::relativity::ScenarioId id) {
	switch (id) {
	case visual_physics::relativity::ScenarioId::TimeDilation:
		return 0.0;
	case visual_physics::relativity::ScenarioId::RelativisticDoppler:
		return 0.0;
	case visual_physics::relativity::ScenarioId::GravitationalTimeDilation:
		return 1.0;
	}
	throw std::runtime_error("Unknown relativity scenario id");
}

double default_astrophysics_time_seconds(visual_physics::astrophysics::ScenarioId id) {
	switch (id) {
	case visual_physics::astrophysics::ScenarioId::PlanetaryOrbit:
		return 0.2;
	case visual_physics::astrophysics::ScenarioId::StellarLuminosity:
		return 0.25;
	case visual_physics::astrophysics::ScenarioId::HubbleExpansion:
		return 0.25;
	}
	throw std::runtime_error("Unknown astrophysics scenario id");
}

double default_atmospheric_time_seconds(visual_physics::atmospheric::ScenarioId id) {
	switch (id) {
	case visual_physics::atmospheric::ScenarioId::BarometricFormula:
		return 0.2;
	case visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate:
		return 0.3;
	case visual_physics::atmospheric::ScenarioId::ConvectionColumn:
		return 0.35;
	}
	throw std::runtime_error("Unknown atmospheric scenario id");
}

double default_solid_state_time_seconds(visual_physics::solid_state::ScenarioId id) {
	switch (id) {
	case visual_physics::solid_state::ScenarioId::CrystalElasticity:
		return 0.45;
	case visual_physics::solid_state::ScenarioId::PhononDispersion:
		return 0.55;
	case visual_physics::solid_state::ScenarioId::ElectronicStructure:
		return 0.60;
	}
	throw std::runtime_error("Unknown solid-state scenario id");
}

double default_nuclear_and_particle_physics_time_seconds(
	visual_physics::nuclear_and_particle_physics::ScenarioId id) {
	switch (id) {
	case visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay:
		return 0.35;
	case visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve:
		return 0.45;
	case visual_physics::nuclear_and_particle_physics::ScenarioId::ProtonProtonCollision:
		return 0.55;
	}
	throw std::runtime_error("Unknown nuclear-and-particle-physics scenario id");
}

double default_plasma_time_seconds(visual_physics::plasma_physics::ScenarioId id) {
	switch (id) {
	case visual_physics::plasma_physics::ScenarioId::PlasmaOscillation:
		return 0.35;
	case visual_physics::plasma_physics::ScenarioId::DebyeScreening:
		return 0.45;
	case visual_physics::plasma_physics::ScenarioId::MagneticConfinement:
		return 0.55;
	}
	throw std::runtime_error("Unknown plasma-physics scenario id");
}

visual_physics::plasma_physics::ImportedScenarioState resolve_imported_plasma_state(
	const ProgramOptions& options) {
	validate_plasma_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text =
			options.scenario_id_text.value_or(std::string("plasma-oscillation"));
		const auto parsed_id = visual_physics::plasma_physics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown plasma-physics scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::plasma_physics::make_default_scenario(*parsed_id),
			options);
		validate_plasma_scenario_overrides(scenario, options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(default_plasma_time_seconds(scenario.id)),
			.overlays = apply_overlay_overrides(
				visual_physics::plasma_physics::OverlayOptions{},
				options),
		};
	}

	auto imported = visual_physics::plasma_physics::parse_import_payload(read_text_file(*options.import_path));
	validate_plasma_scenario_overrides(imported.scenario, options);
	imported.scenario = apply_program_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::plasma_physics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::solid_state::ImportedScenarioState resolve_imported_solid_state_state(
	const ProgramOptions& options) {
	validate_solid_state_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("crystal-elasticity"));
		const auto parsed_id = visual_physics::solid_state::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown solid-state scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::solid_state::make_default_scenario(*parsed_id),
			options);
		validate_solid_state_scenario_overrides(scenario, options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(default_solid_state_time_seconds(scenario.id)),
			.overlays = apply_overlay_overrides(visual_physics::solid_state::OverlayOptions{}, options),
		};
	}

	auto imported = visual_physics::solid_state::parse_import_payload(read_text_file(*options.import_path));
	validate_solid_state_scenario_overrides(imported.scenario, options);
	imported.scenario = apply_program_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::solid_state::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::nuclear_and_particle_physics::ImportedScenarioState
resolve_imported_nuclear_and_particle_physics_state(const ProgramOptions& options) {
	validate_nuclear_and_particle_physics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text =
			options.scenario_id_text.value_or(std::string("radioactive-decay"));
		const auto parsed_id =
			visual_physics::nuclear_and_particle_physics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error(
				"Unknown nuclear-and-particle-physics scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::nuclear_and_particle_physics::make_default_scenario(*parsed_id),
			options);
		validate_nuclear_and_particle_physics_scenario_overrides(scenario, options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(
				default_nuclear_and_particle_physics_time_seconds(scenario.id)),
			.overlays = apply_overlay_overrides(
				visual_physics::nuclear_and_particle_physics::OverlayOptions{},
				options),
		};
	}

	auto imported = visual_physics::nuclear_and_particle_physics::parse_import_payload(
		read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	validate_nuclear_and_particle_physics_scenario_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::nuclear_and_particle_physics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::atmospheric::ImportedScenarioState resolve_imported_atmospheric_state(
	const ProgramOptions& options) {
	validate_atmospheric_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("barometric-formula"));
		const auto parsed_id = visual_physics::atmospheric::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown atmospheric scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::atmospheric::make_default_scenario(*parsed_id),
			options);
		validate_atmospheric_scenario_overrides(scenario, options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(default_atmospheric_time_seconds(scenario.id)),
			.overlays = apply_overlay_overrides(visual_physics::atmospheric::OverlayOptions{}, options),
		};
	}

	auto imported = visual_physics::atmospheric::parse_import_payload(read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	validate_atmospheric_scenario_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::atmospheric::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::astrophysics::ImportedScenarioState resolve_imported_astrophysics_state(
	const ProgramOptions& options) {
	validate_astrophysics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("planetary-orbit"));
		const auto parsed_id = visual_physics::astrophysics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown astrophysics scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::astrophysics::make_default_scenario(*parsed_id),
			options);
		validate_astrophysics_scenario_overrides(scenario, options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(default_astrophysics_time_seconds(scenario.id)),
			.overlays = apply_overlay_overrides(visual_physics::astrophysics::OverlayOptions{}, options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::astrophysics::parse_import_payload(read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	validate_astrophysics_scenario_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::astrophysics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::relativity::ImportedScenarioState resolve_imported_relativity_state(
	const ProgramOptions& options) {
	validate_relativity_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("time-dilation"));
		const auto parsed_id = visual_physics::relativity::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown relativity scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::relativity::make_default_scenario(*parsed_id),
			options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(
				scenario.id == visual_physics::relativity::ScenarioId::GravitationalTimeDilation
					? scenario.coordinate_time_seconds.value_or(default_relativity_time_seconds(scenario.id))
					: default_relativity_time_seconds(scenario.id)),
			.overlays = apply_overlay_overrides(visual_physics::relativity::OverlayOptions{}, options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::relativity::parse_import_payload(read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::relativity::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::waves::ImportedScenarioState resolve_imported_waves_state(
	const ProgramOptions& options) {
	validate_waves_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("standing-wave"));
		const auto parsed_id = visual_physics::waves::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown waves scenario id: " + scenario_id_text);
		}
		const auto scenario = visual_physics::waves::make_default_scenario(*parsed_id);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(default_waves_time_seconds(scenario.id)),
			.overlays = apply_overlay_overrides(visual_physics::waves::OverlayOptions{}, options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::waves::parse_import_payload(read_text_file(*options.import_path));
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::waves::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::optics::ImportedScenarioState resolve_imported_optics_state(
	const ProgramOptions& options) {
	validate_optics_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("snell-refraction"));
		const auto parsed_id = visual_physics::optics::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown optics scenario id: " + scenario_id_text);
		}
		const auto scenario = visual_physics::optics::make_default_scenario(*parsed_id);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(scenario.duration_seconds * 0.25),
			.overlays = apply_overlay_overrides(
				visual_physics::optics::OverlayOptions{},
				options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::optics::parse_import_payload(read_text_file(*options.import_path));
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::optics::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

visual_physics::quantum::ImportedScenarioState resolve_imported_quantum_state(
	const ProgramOptions& options) {
	validate_quantum_options(options);
	if (!options.import_path.has_value()) {
		const auto scenario_id_text = options.scenario_id_text.value_or(std::string("particle-in-a-box"));
		const auto parsed_id = visual_physics::quantum::parse_scenario_id(scenario_id_text);
		if (!parsed_id.has_value()) {
			throw std::runtime_error("Unknown quantum scenario id: " + scenario_id_text);
		}
		const auto scenario = apply_program_overrides(
			visual_physics::quantum::make_default_scenario(*parsed_id),
			options);
		validate_quantum_scenario_overrides(scenario, options);
		return {
			.scenario = scenario,
			.time_seconds = options.time_seconds.value_or(scenario.duration_seconds * 0.25),
			.overlays = apply_overlay_overrides(visual_physics::quantum::OverlayOptions{}, options),
		};
	}

	if (options.scenario_id_text.has_value()) {
		throw std::runtime_error("--scenario cannot be combined with --import");
	}

	auto imported = visual_physics::quantum::parse_import_payload(read_text_file(*options.import_path));
	imported.scenario = apply_program_overrides(imported.scenario, options);
	validate_quantum_scenario_overrides(imported.scenario, options);
	imported.overlays = apply_overlay_overrides(
		imported.overlays.value_or(visual_physics::quantum::OverlayOptions{}),
		options);
	if (options.time_seconds.has_value()) {
		imported.time_seconds = *options.time_seconds;
	}
	return imported;
}

}  // namespace

int main(int argc, char** argv) {
	const auto options = parse_program_options(argc, argv);
	uint32_t api_version = VK_API_VERSION_1_0;
	vkEnumerateInstanceVersion(&api_version);
	const auto instance = create_instance();
	const auto selected_device = select_physical_device(instance.get());
	const auto device = create_device(selected_device);
	const auto graphics_queue =
		get_graphics_queue(device.get(), selected_device.graphics_queue_family_index);
	const auto command_pool =
		create_command_pool(device.get(), selected_device.graphics_queue_family_index);
	const auto command_buffer = allocate_command_buffer(device.get(), command_pool.get());

	std::string scenario_label;
	double imported_time_seconds = 0.0;
	double snapshot_position_x = 0.0;
	double snapshot_position_y = 0.0;
	double snapshot_velocity_x = 0.0;
	double snapshot_velocity_y = 0.0;
	std::string scenario_name;
	std::string override_summary;
	std::optional<std::string> statics_summary;
	std::optional<std::string> fluid_mechanics_summary;
	std::optional<std::string> plasma_summary;
	std::optional<std::string> plasma_report_summary;
	std::optional<std::string> solid_state_summary;
	std::optional<std::string> solid_state_report_summary;
	std::optional<std::string> nuclear_and_particle_physics_summary;
	std::optional<std::string> nuclear_and_particle_physics_report_summary;
	std::optional<std::string> atmospheric_summary;
	std::optional<std::string> atmospheric_report_summary;
	std::optional<std::string> astrophysics_summary;
	std::optional<std::string> astrophysics_report_summary;
	std::optional<std::string> relativity_summary;
	std::optional<std::string> relativity_report_summary;
	std::optional<std::string> waves_summary;
	std::optional<std::string> waves_report_summary;
	std::optional<std::string> optics_summary;
	std::optional<std::string> quantum_summary;
	std::optional<std::string> quantum_report_summary;
	std::optional<std::string> thermodynamics_summary;
	std::optional<std::string> electronics_summary;
	std::optional<std::string> electromagnetism_summary;
	std::optional<std::string> computational_physics_summary;
	std::optional<visual_physics::dynamics::OverlayOptions> resolved_dynamics_overlays;
	std::optional<visual_physics::statics::OverlayOptions> resolved_statics_overlays;
	std::optional<visual_physics::fluid_mechanics::OverlayOptions> resolved_fluid_mechanics_overlays;
	std::optional<visual_physics::plasma_physics::OverlayOptions> resolved_plasma_overlays;
	std::optional<visual_physics::solid_state::OverlayOptions> resolved_solid_state_overlays;
	std::optional<visual_physics::nuclear_and_particle_physics::OverlayOptions>
		resolved_nuclear_and_particle_physics_overlays;
	std::optional<visual_physics::atmospheric::OverlayOptions> resolved_atmospheric_overlays;
	std::optional<visual_physics::astrophysics::OverlayOptions> resolved_astrophysics_overlays;
	std::optional<visual_physics::relativity::OverlayOptions> resolved_relativity_overlays;
	std::optional<visual_physics::waves::OverlayOptions> resolved_waves_overlays;
	std::optional<visual_physics::optics::OverlayOptions> resolved_optics_overlays;
	std::optional<visual_physics::quantum::OverlayOptions> resolved_quantum_overlays;
	std::optional<visual_physics::thermodynamics::OverlayOptions> resolved_thermodynamics_overlays;
	std::optional<visual_physics::electronics::OverlayOptions> resolved_electronics_overlays;
	std::optional<visual_physics::electromagnetism::OverlayOptions> resolved_electromagnetism_overlays;
	std::optional<visual_physics::computational_physics::OverlayOptions> resolved_computational_physics_overlays;
	std::vector<RenderVertex> axes_vertices;
	std::vector<RenderVertex> trajectory_vertices;
	std::vector<RenderVertex> overlay_line_vertices;
	std::vector<RenderVertex> marker_vertices;
	std::vector<RenderVertex> overlay_marker_vertices;
	if (options.domain != PhysicsDomain::ComputationalPhysics &&
		(options.export_convergence_csv_path.has_value() ||
		 options.export_orbital_invariant_csv_path.has_value() ||
		 options.export_spring_invariant_csv_path.has_value())) {
		throw std::runtime_error(
			"Computational Physics CSV export flags can only be used with --domain computational-physics");
	}
	if (options.domain != PhysicsDomain::Quantum &&
		options.export_quantum_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Quantum report CSV export flag can only be used with --domain quantum");
	}
	if (options.domain != PhysicsDomain::PlasmaPhysics &&
		options.export_plasma_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Plasma Physics report CSV export flag can only be used with --domain plasma-physics");
	}
	if (options.domain != PhysicsDomain::SolidStatePhysics &&
		options.export_solid_state_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Solid State report CSV export flag can only be used with --domain solid-state-physics");
	}
	if (options.domain != PhysicsDomain::NuclearAndParticlePhysics &&
		options.export_nuclear_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Nuclear and Particle Physics report CSV export flag can only be used with --domain nuclear-and-particle-physics");
	}
	if (options.domain != PhysicsDomain::AtmosphericPhysics &&
		options.export_atmospheric_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Atmospheric report CSV export flag can only be used with --domain atmospheric-physics");
	}
	if (options.domain != PhysicsDomain::Astrophysics &&
		options.export_astrophysics_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Astrophysics report CSV export flag can only be used with --domain astrophysics");
	}
	if (options.domain != PhysicsDomain::Relativity &&
		options.domain != PhysicsDomain::PlasmaPhysics &&
		options.domain != PhysicsDomain::Astrophysics &&
		options.domain != PhysicsDomain::AtmosphericPhysics &&
		options.domain != PhysicsDomain::SolidStatePhysics &&
		options.domain != PhysicsDomain::NuclearAndParticlePhysics &&
		has_relativity_overrides(options)) {
		throw std::runtime_error(
			"Relativity override flags can only be used with --domain relativity");
	}
	if (options.domain != PhysicsDomain::SolidStatePhysics &&
		has_solid_state_overrides(options)) {
		throw std::runtime_error(
			"Solid State override flags can only be used with --domain solid-state-physics");
	}
	if (options.domain != PhysicsDomain::PlasmaPhysics &&
		has_plasma_overrides(options)) {
		throw std::runtime_error(
			"Plasma Physics override flags can only be used with --domain plasma-physics");
	}
	if (options.domain != PhysicsDomain::NuclearAndParticlePhysics &&
		has_nuclear_and_particle_physics_overrides(options)) {
		throw std::runtime_error(
			"Nuclear and Particle Physics override flags can only be used with --domain nuclear-and-particle-physics");
	}
	if (options.domain != PhysicsDomain::Relativity &&
		options.export_relativity_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Relativity report CSV export flag can only be used with --domain relativity");
	}
	if (options.domain != PhysicsDomain::Waves &&
		options.export_waves_report_csv_path.has_value()) {
		throw std::runtime_error(
			"Waves report CSV export flag can only be used with --domain waves");
	}

	if (options.domain == PhysicsDomain::Kinematics) {
		const auto imported_state = resolve_imported_state(options);
		const auto& scenario = imported_state.scenario;
		const auto snapshot = visual_physics::kinematics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::kinematics::build_samples(scenario, options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(scenario, snapshot, samples, options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::kinematics::serialize_export_payload(
				scenario,
				snapshot,
				{},
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		axes_vertices = colorize_vertices(
			visual_physics::kinematics::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::kinematics::build_trajectory_vertices(samples, scenario),
			{0.345F, 0.847F, 1.0F, 1.0F});
		marker_vertices = colorize_vertices(
			visual_physics::kinematics::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		scenario_label = std::string(visual_physics::kinematics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = snapshot.position.x;
		snapshot_position_y = snapshot.position.y;
		snapshot_velocity_x = snapshot.velocity.x;
		snapshot_velocity_y = snapshot.velocity.y;
		scenario_name = std::string(scenario.name);
		override_summary = "Overrides: initialPosition=(" + std::to_string(scenario.initial_position.x) +
			", " + std::to_string(scenario.initial_position.y) + "), initialVelocity=(" +
			std::to_string(scenario.initial_velocity.x) + ", " +
			std::to_string(scenario.initial_velocity.y) + "), acceleration=(" +
			std::to_string(scenario.acceleration.x) + ", " +
			std::to_string(scenario.acceleration.y) + ")";
		if (scenario.observer_velocity.has_value()) {
			override_summary += "\nObserver velocity: (" +
				std::to_string(scenario.observer_velocity->x) + ", " +
				std::to_string(scenario.observer_velocity->y) + ")";
		}
		if (scenario.radius.has_value() || scenario.angular_speed.has_value()) {
			override_summary += "\nCircular controls: radius=" +
				std::to_string(scenario.radius.value_or(0.0)) + ", angularSpeed=" +
				std::to_string(scenario.angular_speed.value_or(0.0));
		}
	} else if (options.domain == PhysicsDomain::Dynamics) {
		const auto imported_state = resolve_imported_dynamics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(visual_physics::dynamics::OverlayOptions{});
		resolved_dynamics_overlays = overlays;
		const auto snapshot = visual_physics::dynamics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::dynamics::build_samples(scenario, options.render_config.sample_count);
		if (options.roundtrip_check) {
			const auto payload = visual_physics::dynamics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				"roundtrip-check");
			const auto imported = visual_physics::dynamics::parse_import_payload(payload);
			static_cast<void>(visual_physics::dynamics::sample_scenario(imported.scenario, imported.time_seconds));
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::dynamics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		axes_vertices = colorize_vertices(
			visual_physics::dynamics::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::dynamics::build_trajectory_vertices(samples, scenario),
			{0.345F, 0.847F, 1.0F, 1.0F});
		overlay_line_vertices = build_dynamics_overlay_line_vertices(snapshot, scenario, overlays);
		marker_vertices = colorize_vertices(
			visual_physics::dynamics::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		overlay_marker_vertices = build_dynamics_overlay_marker_vertices(
			scenario,
			static_cast<float>(options.render_config.width) /
				static_cast<float>(options.render_config.height),
			overlays);
		scenario_label = std::string(visual_physics::dynamics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = snapshot.position.x;
		snapshot_position_y = snapshot.position.y;
		snapshot_velocity_x = snapshot.velocity.x;
		snapshot_velocity_y = snapshot.velocity.y;
		scenario_name = scenario.name;
		override_summary = "Overrides: initialPosition=(" + std::to_string(scenario.initial_position.x) +
			", " + std::to_string(scenario.initial_position.y) + "), initialVelocity=(" +
			std::to_string(scenario.initial_velocity.x) + ", " +
			std::to_string(scenario.initial_velocity.y) + "), mass=" +
			std::to_string(scenario.mass);
		if (scenario.net_force.has_value()) {
			override_summary += "\nNet force: (" + std::to_string(scenario.net_force->x) +
				", " + std::to_string(scenario.net_force->y) + ")";
		}
		if (scenario.gravity.has_value()) {
			override_summary += "\nGravity: (" + std::to_string(scenario.gravity->x) +
				", " + std::to_string(scenario.gravity->y) + ")";
		}
		if (scenario.drag_coefficient.has_value()) {
			override_summary += "\nDrag coefficient: " + std::to_string(*scenario.drag_coefficient);
		}
		if (scenario.restitution_coefficient.has_value()) {
			override_summary += "\nRestitution: " + std::to_string(*scenario.restitution_coefficient);
		}
	} else if (options.domain == PhysicsDomain::Statics) {
		const auto imported_state = resolve_imported_statics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(visual_physics::statics::OverlayOptions{});
		resolved_statics_overlays = overlays;
		const auto snapshot = visual_physics::statics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::statics::build_samples(scenario, options.render_config.sample_count);
		if (options.roundtrip_check) {
			const auto payload = visual_physics::statics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				"roundtrip-check");
			const auto imported = visual_physics::statics::parse_import_payload(payload);
			static_cast<void>(visual_physics::statics::sample_scenario(imported.scenario, imported.time_seconds));
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::statics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		axes_vertices = colorize_vertices(
			visual_physics::statics::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::statics::build_scenario_vertices(snapshot, scenario),
			{0.345F, 0.847F, 1.0F, 1.0F});
		for (const auto& vertex : visual_physics::statics::build_overlay_line_vertices(snapshot, scenario, overlays)) {
			overlay_line_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		marker_vertices = colorize_vertices(
			visual_physics::statics::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		for (const auto& vertex : visual_physics::statics::build_overlay_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height),
				overlays)) {
			overlay_marker_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		scenario_label = std::string(visual_physics::statics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = snapshot.position.x;
		snapshot_position_y = snapshot.position.y;
		snapshot_velocity_x = 0.0;
		snapshot_velocity_y = 0.0;
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(2);
		summary << "Statics equilibrium: stable=" << (snapshot.stable ? "yes" : "no")
		        << ", residualForce=(" << snapshot.residual_force.x << ", "
		        << snapshot.residual_force.y << "), residualTorque="
		        << snapshot.residual_torque
		        << ", primaryReaction=(" << snapshot.primary_reaction_force.x << ", "
		        << snapshot.primary_reaction_force.y << ")";
		if (snapshot.secondary_reaction_force.has_value()) {
			summary << ", secondaryReaction=("
			        << snapshot.secondary_reaction_force->x << ", "
			        << snapshot.secondary_reaction_force->y << ")";
		}
		statics_summary = summary.str();
		override_summary = "Overrides: mass=" + std::to_string(scenario.mass.value_or(0.0)) +
			", secondaryMass=" + std::to_string(scenario.secondary_mass.value_or(0.0)) +
			", angleDegrees=" + std::to_string(scenario.angle_degrees.value_or(0.0)) +
			", frictionCoefficient=" + std::to_string(scenario.friction_coefficient.value_or(0.0)) +
			", loadPosition=" + std::to_string(scenario.load_position.value_or(snapshot.position.x)) +
			", loadMagnitude=" + std::to_string(scenario.load_magnitude.value_or(0.0));
	} else if (options.domain == PhysicsDomain::FluidMechanics) {
		const auto imported_state = resolve_imported_fluid_mechanics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(
			visual_physics::fluid_mechanics::OverlayOptions{});
		resolved_fluid_mechanics_overlays = overlays;
		const auto snapshot =
			visual_physics::fluid_mechanics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::fluid_mechanics::build_samples(
			scenario,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::fluid_mechanics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		axes_vertices = colorize_vertices(
			visual_physics::fluid_mechanics::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::fluid_mechanics::build_scenario_vertices(snapshot, scenario),
			{0.345F, 0.847F, 1.0F, 1.0F});
		for (const auto& vertex : visual_physics::fluid_mechanics::build_overlay_line_vertices(
					snapshot,
					scenario,
					overlays)) {
			overlay_line_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		marker_vertices = colorize_vertices(
			visual_physics::fluid_mechanics::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		for (const auto& vertex : visual_physics::fluid_mechanics::build_overlay_marker_vertices(
					snapshot,
					scenario,
					static_cast<float>(options.render_config.width) /
						static_cast<float>(options.render_config.height),
					overlays)) {
			overlay_marker_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		scenario_label = std::string(visual_physics::fluid_mechanics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = scenario.id == visual_physics::fluid_mechanics::ScenarioId::OpenChannelFlow
			? snapshot.average_velocity.value_or(0.0)
			: scenario.id == visual_physics::fluid_mechanics::ScenarioId::PoiseuillePipe
			? snapshot.average_velocity.value_or(0.0)
			: snapshot.equilibrium_depth;
		snapshot_position_y = scenario.id == visual_physics::fluid_mechanics::ScenarioId::OpenChannelFlow
			? snapshot.froude_number.value_or(0.0)
			: scenario.id == visual_physics::fluid_mechanics::ScenarioId::PoiseuillePipe
			? snapshot.pressure_gradient.value_or(0.0)
			: snapshot.net_force;
		snapshot_velocity_x = 0.0;
		snapshot_velocity_y = scenario.id == visual_physics::fluid_mechanics::ScenarioId::OpenChannelFlow
			? snapshot.discharge.value_or(0.0)
			: scenario.id == visual_physics::fluid_mechanics::ScenarioId::PoiseuillePipe
			? snapshot.reynolds_number.value_or(0.0)
			: 0.0;
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::fluid_mechanics::ScenarioId::OpenChannelFlow) {
			summary << "Fluid Mechanics snapshot: discharge="
			        << snapshot.discharge.value_or(0.0)
			        << " m^3/s, averageVelocity="
			        << snapshot.average_velocity.value_or(0.0)
			        << " m/s, hydraulicRadius="
			        << snapshot.hydraulic_radius.value_or(0.0)
			        << " m, froudeNumber="
			        << snapshot.froude_number.value_or(0.0)
			        << ", stable=" << (snapshot.stable ? "yes" : "no");
		} else if (scenario.id == visual_physics::fluid_mechanics::ScenarioId::PoiseuillePipe) {
			summary << "Fluid Mechanics snapshot: volumetricFlowRate="
			        << snapshot.volumetric_flow_rate.value_or(0.0)
			        << " m^3/s, averageVelocity="
			        << snapshot.average_velocity.value_or(0.0)
			        << " m/s, centerlineVelocity="
			        << snapshot.centerline_velocity.value_or(0.0)
			        << " m/s, reynoldsNumber="
			        << snapshot.reynolds_number.value_or(0.0)
			        << ", pressureGradient="
			        << snapshot.pressure_gradient.value_or(0.0)
			        << " Pa/m, stable=" << (snapshot.stable ? "yes" : "no");
		} else {
			summary << "Fluid Mechanics snapshot: equilibriumDepth=" << snapshot.equilibrium_depth
			        << " m, immersionRatio=" << snapshot.immersion_ratio
			        << ", buoyantForce=" << snapshot.buoyant_force
			        << " N, weightForce=" << snapshot.weight_force
			        << " N, netForce=" << snapshot.net_force
			        << " N, stable=" << (snapshot.stable ? "yes" : "no");
		}
		fluid_mechanics_summary = summary.str();
		if (scenario.id == visual_physics::fluid_mechanics::ScenarioId::OpenChannelFlow) {
			override_summary = "Overrides: gravity=" + std::to_string(scenario.gravity) +
				", channelWidth=" + std::to_string(scenario.channel_width.value_or(0.0)) +
				", channelDepth=" + std::to_string(scenario.channel_depth.value_or(0.0)) +
				", channelSlope=" + std::to_string(scenario.channel_slope.value_or(0.0)) +
				", roughnessCoefficient=" + std::to_string(scenario.roughness_coefficient.value_or(0.0)) +
				", channelLength=" + std::to_string(scenario.channel_length.value_or(0.0));
		} else if (scenario.id == visual_physics::fluid_mechanics::ScenarioId::PoiseuillePipe) {
			override_summary = "Overrides: fluidDensity=" + std::to_string(scenario.fluid_density) +
				", pipeRadius=" + std::to_string(scenario.pipe_radius.value_or(0.0)) +
				", pipeLength=" + std::to_string(scenario.pipe_length.value_or(0.0)) +
				", pressureDrop=" + std::to_string(scenario.pressure_drop.value_or(0.0)) +
				", dynamicViscosity=" + std::to_string(scenario.dynamic_viscosity.value_or(0.0));
		} else {
			override_summary = "Overrides: gravity=" + std::to_string(scenario.gravity) +
				", fluidDensity=" + std::to_string(scenario.fluid_density) +
				", blockDensity=" + std::to_string(scenario.block_density) +
				", blockWidth=" + std::to_string(scenario.block_width) +
				", blockHeight=" + std::to_string(scenario.block_height) +
				", blockDepth=" + std::to_string(scenario.block_depth);
		}
	} else if (options.domain == PhysicsDomain::PlasmaPhysics) {
		const auto imported_state = resolve_imported_plasma_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays =
			imported_state.overlays.value_or(visual_physics::plasma_physics::OverlayOptions{});
		resolved_plasma_overlays = overlays;
		const auto snapshot =
			visual_physics::plasma_physics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::plasma_physics::build_samples_at_time(
			scenario,
			imported_state.time_seconds,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::plasma_physics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_plasma_report_csv_path.has_value()) {
			const auto report_rows = visual_physics::plasma_physics::build_report_summary_rows(
				scenario,
				snapshot);
			write_text_file(
				*options.export_plasma_report_csv_path,
				visual_physics::plasma_physics::build_report_csv(scenario, snapshot, samples));
			std::ostringstream report_summary;
			report_summary << "Plasma Physics report summary: ";
			for (std::size_t index = 0; index < report_rows.size(); index += 1) {
				if (index > 0) {
					report_summary << ", ";
				}
				report_summary << report_rows[index].metric << '=' << report_rows[index].value;
			}
			plasma_report_summary = report_summary.str();
		}
		axes_vertices = overlays.show_reference_guides
			? build_plasma_axes_vertices(samples, {0.52F, 0.66F, 0.82F, 1.0F})
			: std::vector<RenderVertex>{};
		trajectory_vertices = build_plasma_trajectory_vertices(
			samples,
			{0.345F, 0.847F, 1.0F, 1.0F},
			false);
		overlay_line_vertices = overlays.show_comparison_band
			? build_plasma_trajectory_vertices(samples, {0.98F, 0.83F, 0.39F, 1.0F}, true)
			: std::vector<RenderVertex>{};
		marker_vertices = overlays.show_active_marker
			? build_plasma_marker_vertices(samples, {1.0F, 0.54F, 0.36F, 1.0F})
			: std::vector<RenderVertex>{};
		scenario_label = std::string(visual_physics::plasma_physics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = samples.empty() ? 0.0 : samples.front().position;
		snapshot_position_y = samples.empty() ? 0.0 : samples.front().primary_value;
		snapshot_velocity_x = 0.0;
		snapshot_velocity_y = samples.empty() ? 0.0 : samples.front().secondary_value.value_or(0.0);
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::plasma_physics::ScenarioId::PlasmaOscillation) {
			summary << "Plasma Physics summary: plasmaFrequencyGHz="
			        << snapshot.plasma_frequency_gigahertz.value_or(0.0)
			        << ", oscillationPeriodNs="
			        << snapshot.oscillation_period_nanoseconds.value_or(0.0)
			        << ", restoringFieldKVm="
			        << snapshot.restoring_field_kilovolts_per_meter.value_or(0.0);
		} else if (scenario.id == visual_physics::plasma_physics::ScenarioId::DebyeScreening) {
			summary << "Plasma Physics summary: debyeLengthMm="
			        << snapshot.debye_length_millimeters.value_or(0.0)
			        << ", shieldingFraction="
			        << snapshot.shielding_fraction.value_or(0.0)
			        << ", screenedPotentialV="
			        << snapshot.screened_potential_volts.value_or(0.0);
		} else {
			summary << "Plasma Physics summary: larmorRadiusMm="
			        << snapshot.larmor_radius_millimeters.value_or(0.0)
			        << ", betaPercent="
			        << snapshot.beta_percent.value_or(0.0)
			        << ", safetyFactor="
			        << snapshot.safety_factor.value_or(0.0);
		}
		plasma_summary = summary.str();
		if (!has_plasma_overrides(options)) {
			override_summary = "Overrides: none";
		} else if (scenario.id == visual_physics::plasma_physics::ScenarioId::PlasmaOscillation) {
			std::ostringstream overrides;
			overrides << std::scientific << std::setprecision(3)
			          << "Overrides: electronDensityPerCubicMeter="
			          << scenario.electron_density_per_cubic_meter.value_or(0.0);
			overrides << std::fixed << std::setprecision(6)
			          << ", electronTemperatureElectronVolts="
			          << scenario.electron_temperature_electron_volts.value_or(0.0)
			          << ", perturbationAmplitudePercent="
			          << scenario.perturbation_amplitude_percent.value_or(0.0);
			override_summary = overrides.str();
		} else if (scenario.id == visual_physics::plasma_physics::ScenarioId::DebyeScreening) {
			std::ostringstream overrides;
			overrides << std::scientific << std::setprecision(3)
			          << "Overrides: electronDensityPerCubicMeter="
			          << scenario.electron_density_per_cubic_meter.value_or(0.0);
			overrides << std::fixed << std::setprecision(6)
			          << ", electronTemperatureElectronVolts="
			          << scenario.electron_temperature_electron_volts.value_or(0.0)
			          << ", probePotentialVolts="
			          << scenario.probe_potential_volts.value_or(0.0);
			override_summary = overrides.str();
		} else {
			override_summary = "Overrides: magneticFieldTesla=" +
				std::to_string(scenario.magnetic_field_tesla.value_or(0.0)) +
				", plasmaCurrentMegaAmperes=" +
				std::to_string(scenario.plasma_current_mega_amperes.value_or(0.0)) +
				", majorRadiusMeters=" +
				std::to_string(scenario.major_radius_meters.value_or(0.0));
		}
	} else if (options.domain == PhysicsDomain::SolidStatePhysics) {
		const auto imported_state = resolve_imported_solid_state_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays =
			imported_state.overlays.value_or(visual_physics::solid_state::OverlayOptions{});
		resolved_solid_state_overlays = overlays;
		const auto snapshot =
			visual_physics::solid_state::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::solid_state::build_samples_at_time(
			scenario,
			imported_state.time_seconds,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::solid_state::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_solid_state_report_csv_path.has_value()) {
			const auto report_rows = visual_physics::solid_state::build_report_summary_rows(
				scenario,
				snapshot);
			write_text_file(
				*options.export_solid_state_report_csv_path,
				visual_physics::solid_state::build_report_csv(scenario, snapshot, samples));
			std::ostringstream report_summary;
			report_summary << "Solid State report summary: ";
			for (std::size_t index = 0; index < report_rows.size(); index += 1) {
				if (index > 0) {
					report_summary << ", ";
				}
				report_summary << report_rows[index].metric << '=' << report_rows[index].value;
			}
			solid_state_report_summary = report_summary.str();
		}
		axes_vertices = overlays.show_reference_guides
			? build_solid_state_axes_vertices(samples, {0.52F, 0.66F, 0.82F, 1.0F})
			: std::vector<RenderVertex>{};
		trajectory_vertices = build_solid_state_trajectory_vertices(
			samples,
			{0.345F, 0.847F, 1.0F, 1.0F},
			false);
		overlay_line_vertices = overlays.show_comparison_band
			? build_solid_state_trajectory_vertices(samples, {0.98F, 0.83F, 0.39F, 1.0F}, true)
			: std::vector<RenderVertex>{};
		marker_vertices = overlays.show_active_marker
			? build_solid_state_marker_vertices(samples, {1.0F, 0.54F, 0.36F, 1.0F})
			: std::vector<RenderVertex>{};
		scenario_label = std::string(visual_physics::solid_state::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = samples.empty() ? 0.0 : samples.front().position;
		snapshot_position_y = samples.empty() ? 0.0 : samples.front().primary_value;
		snapshot_velocity_x = 0.0;
		snapshot_velocity_y = samples.empty() ? 0.0 : samples.front().secondary_value.value_or(0.0);
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::solid_state::ScenarioId::CrystalElasticity) {
			summary << "Solid State summary: strainPercent="
			        << snapshot.strain_percent.value_or(0.0)
			        << ", stressMPa="
			        << snapshot.stress_megapascals.value_or(0.0)
			        << ", energyDensityMJm3="
			        << snapshot.elastic_energy_density_megajoules_per_cubic_meter.value_or(0.0);
		} else if (scenario.id == visual_physics::solid_state::ScenarioId::PhononDispersion) {
			summary << "Solid State summary: waveVectorFraction="
			        << snapshot.wave_vector_fraction.value_or(0.0)
			        << ", acousticFrequencyTHz="
			        << snapshot.acoustic_frequency_terahertz.value_or(0.0)
			        << ", groupVelocityKmS="
			        << snapshot.group_velocity_kilometers_per_second.value_or(0.0);
		} else {
			summary << "Solid State summary: energyEV="
			        << snapshot.energy_electron_volts.value_or(0.0)
			        << ", densityOfStates="
			        << snapshot.density_of_states_arbitrary_units.value_or(0.0)
			        << ", occupationProbability="
			        << snapshot.occupation_probability.value_or(0.0);
		}
		solid_state_summary = summary.str();
		if (!has_solid_state_overrides(options)) {
			override_summary = "Overrides: none";
		} else if (scenario.id == visual_physics::solid_state::ScenarioId::CrystalElasticity) {
			override_summary = "Overrides: maxStrainPercent=" +
				std::to_string(scenario.max_strain_percent.value_or(0.0)) +
				", youngsModulusGigapascals=" +
				std::to_string(scenario.youngs_modulus_gigapascals.value_or(0.0)) +
				", yieldStrengthMegapascals=" +
				std::to_string(scenario.yield_strength_megapascals.value_or(0.0));
		} else if (scenario.id == visual_physics::solid_state::ScenarioId::PhononDispersion) {
			override_summary = "Overrides: latticeSpacingNanometers=" +
				std::to_string(scenario.lattice_spacing_nanometers.value_or(0.0)) +
				", springConstantNewtonsPerMeter=" +
				std::to_string(scenario.spring_constant_newtons_per_meter.value_or(0.0)) +
				", atomicMassAmu=" +
				std::to_string(scenario.atomic_mass_amu.value_or(0.0));
		} else {
			override_summary = "Overrides: bandGapElectronVolts=" +
				std::to_string(scenario.band_gap_electron_volts.value_or(0.0)) +
				", effectiveMassRatio=" +
				std::to_string(scenario.effective_mass_ratio.value_or(0.0)) +
				", dopantDensityPerCubicCentimeter=" +
				std::to_string(scenario.dopant_density_per_cubic_centimeter.value_or(0.0));
		}
	} else if (options.domain == PhysicsDomain::NuclearAndParticlePhysics) {
		const auto imported_state = resolve_imported_nuclear_and_particle_physics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(
			visual_physics::nuclear_and_particle_physics::OverlayOptions{});
		resolved_nuclear_and_particle_physics_overlays = overlays;
		const auto snapshot = visual_physics::nuclear_and_particle_physics::sample_scenario(
			scenario,
			imported_state.time_seconds);
		const auto samples = visual_physics::nuclear_and_particle_physics::build_samples_at_time(
			scenario,
			imported_state.time_seconds,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::nuclear_and_particle_physics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_nuclear_report_csv_path.has_value()) {
			const auto report_rows =
				visual_physics::nuclear_and_particle_physics::build_report_summary_rows(
					scenario,
					snapshot);
			write_text_file(
				*options.export_nuclear_report_csv_path,
				visual_physics::nuclear_and_particle_physics::build_report_csv(
					scenario,
					snapshot,
					samples));
			std::ostringstream report_summary;
			report_summary << "Nuclear and Particle Physics report summary: ";
			for (std::size_t index = 0; index < report_rows.size(); index += 1) {
				if (index > 0) {
					report_summary << ", ";
				}
				report_summary << report_rows[index].metric << '=' << report_rows[index].value;
			}
			nuclear_and_particle_physics_report_summary = report_summary.str();
		}
		axes_vertices = overlays.show_reference_guides
			? build_nuclear_and_particle_physics_axes_vertices(samples, {0.52F, 0.66F, 0.82F, 1.0F})
			: std::vector<RenderVertex>{};
		trajectory_vertices = build_nuclear_and_particle_physics_trajectory_vertices(
			samples,
			{0.345F, 0.847F, 1.0F, 1.0F},
			false);
		overlay_line_vertices = overlays.show_comparison_band
			? build_nuclear_and_particle_physics_trajectory_vertices(
				samples,
				{0.98F, 0.83F, 0.39F, 1.0F},
				true)
			: std::vector<RenderVertex>{};
		marker_vertices = overlays.show_active_marker
			? build_nuclear_and_particle_physics_marker_vertices(samples, {1.0F, 0.54F, 0.36F, 1.0F})
			: std::vector<RenderVertex>{};
		scenario_label = std::string(visual_physics::nuclear_and_particle_physics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		const auto active_sample_it = std::find_if(samples.begin(), samples.end(), [](const auto& sample) {
			return sample.active;
		});
		const auto& active_sample = active_sample_it != samples.end() ? *active_sample_it : samples.front();
		snapshot_position_x = samples.empty() ? 0.0 : active_sample.position;
		snapshot_position_y = samples.empty() ? 0.0 : active_sample.primary_value;
		snapshot_velocity_x = 0.0;
		snapshot_velocity_y = samples.empty() ? 0.0 : active_sample.secondary_value.value_or(0.0);
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay) {
			summary << "Nuclear and Particle Physics summary: elapsedHours="
			        << snapshot.elapsed_hours.value_or(0.0)
			        << ", remainingFraction="
			        << snapshot.remaining_fraction.value_or(0.0)
			        << ", activityTBq="
			        << snapshot.activity_terabecquerels.value_or(0.0);
		} else if (scenario.id == visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve) {
			summary << "Nuclear and Particle Physics summary: totalBindingEnergyMeV="
			        << snapshot.total_binding_energy_mev.value_or(0.0)
			        << ", stabilityIndex="
			        << snapshot.stability_index.value_or(0.0);
		} else {
			summary << "Nuclear and Particle Physics summary: invariantMassGeV="
			        << snapshot.invariant_mass_gev.value_or(0.0)
			        << ", transverseMomentumGeV="
			        << snapshot.transverse_momentum_gev.value_or(0.0)
			        << ", pseudorapidity="
			        << snapshot.pseudorapidity.value_or(0.0);
		}
		nuclear_and_particle_physics_summary = summary.str();
		if (!has_nuclear_and_particle_physics_overrides(options)) {
			override_summary = "Overrides: none";
		} else if (scenario.id == visual_physics::nuclear_and_particle_physics::ScenarioId::RadioactiveDecay) {
			override_summary = "Overrides: halfLifeHours=" +
				std::to_string(scenario.half_life_hours.value_or(0.0)) +
				", initialPopulationTrillions=" +
				std::to_string(scenario.initial_population_trillions.value_or(0.0));
		} else if (scenario.id == visual_physics::nuclear_and_particle_physics::ScenarioId::BindingEnergyCurve) {
			override_summary = "Overrides: massNumber=" +
				std::to_string(scenario.mass_number.value_or(0.0)) +
				", protonCount=" +
				std::to_string(scenario.proton_count.value_or(0.0)) +
				", bindingEnergyPerNucleonMeV=" +
				std::to_string(scenario.binding_energy_per_nucleon_mev.value_or(0.0));
		} else {
			override_summary = "Overrides: beamEnergyGeV=" +
				std::to_string(scenario.beam_energy_gev.value_or(0.0)) +
				", scatteringAngleDegrees=" +
				std::to_string(scenario.scattering_angle_degrees.value_or(0.0)) +
				", detectorRadiusMeters=" +
				std::to_string(scenario.detector_radius_meters.value_or(0.0));
		}
	} else if (options.domain == PhysicsDomain::AtmosphericPhysics) {
		const auto imported_state = resolve_imported_atmospheric_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays =
			imported_state.overlays.value_or(visual_physics::atmospheric::OverlayOptions{});
		resolved_atmospheric_overlays = overlays;
		const auto snapshot =
			visual_physics::atmospheric::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::atmospheric::build_samples_at_time(
			scenario,
			imported_state.time_seconds,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::atmospheric::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_atmospheric_report_csv_path.has_value()) {
			const auto report_rows = visual_physics::atmospheric::build_report_summary_rows(
				scenario,
				snapshot);
			write_text_file(
				*options.export_atmospheric_report_csv_path,
				visual_physics::atmospheric::build_report_csv(scenario, snapshot, samples));
			std::ostringstream report_summary;
			report_summary << "Atmospheric report summary: ";
			for (std::size_t index = 0; index < report_rows.size(); index += 1) {
				if (index > 0) {
					report_summary << ", ";
				}
				report_summary << report_rows[index].metric << '=' << report_rows[index].value;
			}
			atmospheric_report_summary = report_summary.str();
		}
		axes_vertices = overlays.show_reference_guides
			? build_atmospheric_axes_vertices(samples, {0.52F, 0.66F, 0.82F, 1.0F})
			: std::vector<RenderVertex>{};
		trajectory_vertices = build_atmospheric_trajectory_vertices(
			samples,
			{0.345F, 0.847F, 1.0F, 1.0F},
			false);
		overlay_line_vertices = overlays.show_comparison_band
			? build_atmospheric_trajectory_vertices(samples, {0.98F, 0.83F, 0.39F, 1.0F}, true)
			: std::vector<RenderVertex>{};
		marker_vertices = overlays.show_active_marker
			? build_atmospheric_marker_vertices(samples, {1.0F, 0.54F, 0.36F, 1.0F})
			: std::vector<RenderVertex>{};
		scenario_label = std::string(visual_physics::atmospheric::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = samples.empty() ? 0.0 : samples.front().position;
		snapshot_position_y = samples.empty() ? 0.0 : samples.front().primary_value;
		snapshot_velocity_x = 0.0;
		snapshot_velocity_y = samples.empty() ? 0.0 : samples.front().secondary_value.value_or(0.0);
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::atmospheric::ScenarioId::BarometricFormula) {
			summary << "Atmospheric summary: pressureKpa="
			        << snapshot.pressure_kilopascals.value_or(0.0)
			        << ", relativeDensity="
			        << snapshot.relative_density.value_or(0.0)
			        << ", altitudeKm="
			        << snapshot.altitude_kilometers.value_or(0.0);
		} else if (scenario.id == visual_physics::atmospheric::ScenarioId::AdiabaticLapseRate) {
			summary << "Atmospheric summary: temperatureK="
			        << snapshot.temperature_kelvin.value_or(0.0)
			        << ", referenceTemperatureK="
			        << snapshot.reference_temperature_kelvin.value_or(0.0)
			        << ", altitudeKm="
			        << snapshot.altitude_kilometers.value_or(0.0);
		} else {
			summary << "Atmospheric summary: parcelAltitudeKm="
			        << snapshot.parcel_altitude_kilometers.value_or(0.0)
			        << ", updraftVelocityMS="
			        << snapshot.updraft_velocity_meters_per_second.value_or(0.0)
			        << ", buoyancyAccelerationMS2="
			        << snapshot.buoyancy_acceleration_meters_per_second_squared.value_or(0.0);
		}
		atmospheric_summary = summary.str();
		override_summary = "Overrides: none";
	} else if (options.domain == PhysicsDomain::Astrophysics) {
		const auto imported_state = resolve_imported_astrophysics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays =
			imported_state.overlays.value_or(visual_physics::astrophysics::OverlayOptions{});
		resolved_astrophysics_overlays = overlays;
		const auto snapshot =
			visual_physics::astrophysics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::astrophysics::build_samples_at_time(
			scenario,
			imported_state.time_seconds,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::astrophysics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_astrophysics_report_csv_path.has_value()) {
			const auto report_rows = visual_physics::astrophysics::build_report_summary_rows(
				scenario,
				snapshot);
			write_text_file(
				*options.export_astrophysics_report_csv_path,
				visual_physics::astrophysics::build_report_csv(scenario, snapshot, samples));
			std::ostringstream report_summary;
			report_summary << "Astrophysics report summary: ";
			for (std::size_t index = 0; index < report_rows.size(); index += 1) {
				if (index > 0) {
					report_summary << ", ";
				}
				report_summary << report_rows[index].metric << '=' << report_rows[index].value;
			}
			astrophysics_report_summary = report_summary.str();
		}
		axes_vertices = overlays.show_reference_guides
			? build_astrophysics_axes_vertices(samples, {0.52F, 0.66F, 0.82F, 1.0F})
			: std::vector<RenderVertex>{};
		trajectory_vertices = build_astrophysics_trajectory_vertices(
			samples,
			{0.345F, 0.847F, 1.0F, 1.0F},
			false);
		overlay_line_vertices = overlays.show_comparison_band
			? build_astrophysics_trajectory_vertices(samples, {0.98F, 0.83F, 0.39F, 1.0F}, true)
			: std::vector<RenderVertex>{};
		marker_vertices = overlays.show_active_marker
			? build_astrophysics_marker_vertices(samples, {1.0F, 0.54F, 0.36F, 1.0F})
			: std::vector<RenderVertex>{};
		scenario_label = std::string(visual_physics::astrophysics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = samples.empty() ? 0.0 : samples.front().position;
		snapshot_position_y = samples.empty() ? 0.0 : samples.front().primary_value;
		snapshot_velocity_x = 0.0;
		snapshot_velocity_y = 0.0;
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::astrophysics::ScenarioId::PlanetaryOrbit) {
			summary << "Astrophysics summary: orbitalPeriodDays="
			        << snapshot.orbital_period_days.value_or(0.0)
			        << ", orbitalSpeedKmS="
			        << snapshot.orbital_speed_kilometers_per_second.value_or(0.0)
			        << ", escapeSpeedKmS="
			        << snapshot.escape_speed_kilometers_per_second.value_or(0.0);
		} else if (scenario.id == visual_physics::astrophysics::ScenarioId::StellarLuminosity) {
			summary << "Astrophysics summary: luminositySolarUnits="
			        << snapshot.luminosity_solar_units.value_or(0.0)
			        << ", habitableZoneInnerAu="
			        << snapshot.habitable_zone_inner_astronomical_units.value_or(0.0)
			        << ", habitableZoneOuterAu="
			        << snapshot.habitable_zone_outer_astronomical_units.value_or(0.0);
		} else {
			summary << "Astrophysics summary: distanceMpc="
			        << snapshot.distance_megaparsecs.value_or(0.0)
			        << ", recessionVelocityKmS="
			        << snapshot.recession_velocity_kilometers_per_second.value_or(0.0)
			        << ", redshift="
			        << snapshot.redshift.value_or(0.0);
		}
		astrophysics_summary = summary.str();
		override_summary = "Overrides: none";
	} else if (options.domain == PhysicsDomain::Relativity) {
		const auto imported_state = resolve_imported_relativity_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays =
			imported_state.overlays.value_or(visual_physics::relativity::OverlayOptions{});
		resolved_relativity_overlays = overlays;
		const auto snapshot =
			visual_physics::relativity::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::relativity::build_samples_at_time(
			scenario,
			imported_state.time_seconds,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::relativity::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_relativity_report_csv_path.has_value()) {
			const auto report_rows = visual_physics::relativity::build_report_summary_rows(
				scenario,
				snapshot);
			write_text_file(
				*options.export_relativity_report_csv_path,
				visual_physics::relativity::build_report_csv(scenario, snapshot, samples));
			std::ostringstream report_summary;
			report_summary << "Relativity report summary: ";
			for (std::size_t index = 0; index < report_rows.size(); index += 1) {
				if (index > 0) {
					report_summary << ", ";
				}
				report_summary << report_rows[index].metric << '=' << report_rows[index].value;
			}
			relativity_report_summary = report_summary.str();
		}
		axes_vertices = overlays.show_reference_guides
			? build_relativity_axes_vertices(samples, {0.52F, 0.66F, 0.82F, 1.0F})
			: std::vector<RenderVertex>{};
		trajectory_vertices = build_relativity_trajectory_vertices(
			samples,
			{0.345F, 0.847F, 1.0F, 1.0F},
			false);
		overlay_line_vertices = overlays.show_comparison_curve
			? build_relativity_trajectory_vertices(samples, {0.98F, 0.83F, 0.39F, 1.0F}, true)
			: std::vector<RenderVertex>{};
		marker_vertices = overlays.show_active_marker
			? build_relativity_marker_vertices(samples, {1.0F, 0.54F, 0.36F, 1.0F})
			: std::vector<RenderVertex>{};
		scenario_label = std::string(visual_physics::relativity::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::relativity::ScenarioId::RelativisticDoppler) {
			snapshot_position_x = snapshot.relative_velocity_fraction_of_light.value_or(0.0);
			snapshot_position_y = snapshot.emitted_frequency_hertz.value_or(0.0);
			snapshot_velocity_x = snapshot.observed_frequency_hertz.value_or(0.0);
			snapshot_velocity_y =
				snapshot.classical_observed_frequency_hertz.value_or(0.0);
			summary << "Relativity summary: beta_rel="
			        << snapshot.relative_velocity_fraction_of_light.value_or(0.0)
			        << ", emitted=" << snapshot.emitted_frequency_hertz.value_or(0.0)
			        << "Hz, observed=" << snapshot.observed_frequency_hertz.value_or(0.0)
			        << "Hz, classical="
			        << snapshot.classical_observed_frequency_hertz.value_or(0.0)
			        << "Hz, shiftRatio=" << snapshot.shift_ratio.value_or(0.0);
			override_summary = "Overrides: emittedFrequencyHertz=" +
				std::to_string(scenario.emitted_frequency_hertz.value_or(0.0)) +
				", sourceVelocityFractionOfLight=" +
				std::to_string(scenario.source_velocity_fraction_of_light.value_or(0.0)) +
				", observerVelocityFractionOfLight=" +
				std::to_string(scenario.observer_velocity_fraction_of_light.value_or(0.0));
		} else if (scenario.id == visual_physics::relativity::ScenarioId::GravitationalTimeDilation) {
			snapshot_position_x = snapshot.orbital_radius_schwarzschild_radii.value_or(0.0);
			snapshot_position_y = snapshot.gravitational_time_factor.value_or(0.0);
			snapshot_velocity_x = snapshot.local_elapsed_time_seconds.value_or(0.0);
			snapshot_velocity_y = snapshot.time_difference_seconds.value_or(0.0);
			summary << "Relativity summary: radius="
			        << snapshot.orbital_radius_schwarzschild_radii.value_or(0.0)
			        << " r_s, factor=" << snapshot.gravitational_time_factor.value_or(0.0)
			        << ", localTime=" << snapshot.local_elapsed_time_seconds.value_or(0.0)
			        << "s, coordinateTime=" << snapshot.time_seconds
			        << "s, gap=" << snapshot.time_difference_seconds.value_or(0.0)
			        << "s";
			override_summary = "Overrides: centralMassSolarMasses=" +
				std::to_string(scenario.central_mass_solar_masses.value_or(0.0)) +
				", orbitalRadiusSchwarzschildRadii=" +
				std::to_string(scenario.orbital_radius_schwarzschild_radii.value_or(0.0)) +
				", coordinateTimeSeconds=" +
				std::to_string(scenario.coordinate_time_seconds.value_or(0.0));
		} else {
			snapshot_position_x = snapshot.relative_velocity_fraction_of_light.value_or(0.0);
			snapshot_position_y = snapshot.proper_time_seconds.value_or(0.0);
			snapshot_velocity_x = snapshot.lorentz_factor_gamma.value_or(0.0);
			snapshot_velocity_y = snapshot.dilated_time_seconds.value_or(0.0);
			summary << "Relativity summary: beta="
			        << snapshot.relative_velocity_fraction_of_light.value_or(0.0)
			        << ", gamma=" << snapshot.lorentz_factor_gamma.value_or(0.0)
			        << ", properTime=" << snapshot.proper_time_seconds.value_or(0.0)
			        << "s, dilatedTime=" << snapshot.dilated_time_seconds.value_or(0.0)
			        << "s, gap=" << snapshot.time_difference_seconds.value_or(0.0) << "s";
			override_summary = "Overrides: relativeVelocityFractionOfLight=" +
				std::to_string(scenario.relative_velocity_fraction_of_light.value_or(0.0)) +
				", properTimeSeconds=" +
				std::to_string(scenario.proper_time_seconds.value_or(0.0));
		}
		relativity_summary = summary.str();
	} else if (options.domain == PhysicsDomain::Waves) {
		const auto imported_state = resolve_imported_waves_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(visual_physics::waves::OverlayOptions{});
		resolved_waves_overlays = overlays;
		const auto snapshot =
			visual_physics::waves::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::waves::build_samples_at_time(
			scenario,
			imported_state.time_seconds,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::waves::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_waves_report_csv_path.has_value()) {
			const auto report_rows = visual_physics::waves::build_report_summary_rows(
				scenario,
				snapshot);
			write_text_file(
				*options.export_waves_report_csv_path,
				visual_physics::waves::build_report_csv(scenario, snapshot, samples));
			std::ostringstream report_summary;
			report_summary << "Waves report summary: ";
			for (std::size_t index = 0; index < report_rows.size(); index += 1) {
				if (index > 0) {
					report_summary << ", ";
				}
				report_summary << report_rows[index].metric << '=' << report_rows[index].value;
			}
			waves_report_summary = report_summary.str();
		}
		axes_vertices = build_waves_axes_vertices(samples, {0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = build_waves_trajectory_vertices(samples, {0.345F, 0.847F, 1.0F, 1.0F});
		marker_vertices = build_waves_marker_vertices(samples, {1.0F, 0.54F, 0.36F, 1.0F});
		scenario_label = std::string(visual_physics::waves::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		if (scenario.id == visual_physics::waves::ScenarioId::StandingWave) {
			snapshot_position_x = snapshot.string_length_meters.value_or(0.0);
			snapshot_position_y = snapshot.frequency_hertz.value_or(0.0);
			snapshot_velocity_x = snapshot.wavelength_meters.value_or(0.0);
			snapshot_velocity_y = snapshot.harmonic_number.value_or(0.0);
			override_summary = "Overrides: stringLengthMeters=" +
				std::to_string(scenario.string_length_meters.value_or(0.0)) +
				", waveSpeedMetersPerSecond=" +
				std::to_string(scenario.wave_speed_meters_per_second.value_or(0.0)) +
				", amplitudeMillimeters=" +
				std::to_string(scenario.amplitude_millimeters.value_or(0.0)) +
				", harmonicNumber=" +
				std::to_string(scenario.harmonic_number.value_or(0.0));
		} else if (scenario.id == visual_physics::waves::ScenarioId::TravelingWave) {
			snapshot_position_x = snapshot.wavelength_meters.value_or(0.0);
			snapshot_position_y = snapshot.frequency_hertz.value_or(0.0);
			snapshot_velocity_x = snapshot.wave_speed_meters_per_second.value_or(0.0);
			snapshot_velocity_y = snapshot.amplitude_millimeters.value_or(0.0);
			override_summary = "Overrides: waveSpeedMetersPerSecond=" +
				std::to_string(scenario.wave_speed_meters_per_second.value_or(0.0)) +
				", amplitudeMillimeters=" +
				std::to_string(scenario.amplitude_millimeters.value_or(0.0)) +
				", frequencyHertz=" +
				std::to_string(scenario.frequency_hertz.value_or(0.0));
		} else {
			snapshot_position_x = snapshot.emitted_frequency_hertz.value_or(0.0);
			snapshot_position_y = snapshot.apparent_frequency_hertz.value_or(0.0);
			snapshot_velocity_x = snapshot.source_speed_meters_per_second.value_or(0.0);
			snapshot_velocity_y = snapshot.observer_speed_meters_per_second.value_or(0.0);
			override_summary = "Overrides: waveSpeedMetersPerSecond=" +
				std::to_string(scenario.wave_speed_meters_per_second.value_or(0.0)) +
				", emittedFrequencyHertz=" +
				std::to_string(scenario.emitted_frequency_hertz.value_or(0.0)) +
				", sourceSpeedMetersPerSecond=" +
				std::to_string(scenario.source_speed_meters_per_second.value_or(0.0)) +
				", observerSpeedMetersPerSecond=" +
				std::to_string(scenario.observer_speed_meters_per_second.value_or(0.0));
		}
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::waves::ScenarioId::StandingWave) {
			summary << "Waves snapshot: stringLength="
			        << snapshot.string_length_meters.value_or(0.0)
			        << " m, frequency="
			        << snapshot.frequency_hertz.value_or(0.0)
			        << " Hz, wavelength="
			        << snapshot.wavelength_meters.value_or(0.0)
			        << " m, harmonic="
			        << snapshot.harmonic_number.value_or(0.0)
			        << ", stable=" << (snapshot.stable ? "yes" : "no");
		} else if (scenario.id == visual_physics::waves::ScenarioId::TravelingWave) {
			summary << "Waves snapshot: waveSpeed="
			        << snapshot.wave_speed_meters_per_second.value_or(0.0)
			        << " m/s, frequency="
			        << snapshot.frequency_hertz.value_or(0.0)
			        << " Hz, wavelength="
			        << snapshot.wavelength_meters.value_or(0.0)
			        << " m, amplitude="
			        << snapshot.amplitude_millimeters.value_or(0.0)
			        << " mm, stable=" << (snapshot.stable ? "yes" : "no");
		} else {
			summary << "Waves snapshot: emittedFrequency="
			        << snapshot.emitted_frequency_hertz.value_or(0.0)
			        << " Hz, apparentFrequency="
			        << snapshot.apparent_frequency_hertz.value_or(0.0)
			        << " Hz, sourceSpeed="
			        << snapshot.source_speed_meters_per_second.value_or(0.0)
			        << " m/s, observerSpeed="
			        << snapshot.observer_speed_meters_per_second.value_or(0.0)
			        << " m/s, stable=" << (snapshot.stable ? "yes" : "no");
		}
		waves_summary = summary.str();
	} else if (options.domain == PhysicsDomain::Optics) {
		const auto imported_state = resolve_imported_optics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(
			visual_physics::optics::OverlayOptions{});
		resolved_optics_overlays = overlays;
		const auto snapshot =
			visual_physics::optics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::optics::build_samples(
			scenario,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::optics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		axes_vertices = colorize_vertices(
			visual_physics::optics::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::optics::build_scenario_vertices(
				scenario,
				options.render_config.sample_count),
			{0.345F, 0.847F, 1.0F, 1.0F});
		for (const auto& vertex : visual_physics::optics::build_overlay_line_vertices(
					snapshot,
					scenario,
					overlays)) {
			overlay_line_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		marker_vertices = colorize_vertices(
			visual_physics::optics::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		for (const auto& vertex : visual_physics::optics::build_overlay_marker_vertices(
					snapshot,
					scenario,
					static_cast<float>(options.render_config.width) /
						static_cast<float>(options.render_config.height),
					overlays)) {
			overlay_marker_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		scenario_label = std::string(visual_physics::optics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		if (scenario.id == visual_physics::optics::ScenarioId::SnellRefraction) {
			snapshot_position_x = snapshot.incident_angle_degrees.value_or(0.0);
			snapshot_position_y = snapshot.refracted_angle_degrees.value_or(0.0);
			snapshot_velocity_x = snapshot.relative_refractive_index.value_or(0.0);
			snapshot_velocity_y = snapshot.total_internal_reflection.value_or(false) ? 1.0 : 0.0;
		} else if (scenario.id == visual_physics::optics::ScenarioId::ThinLensImaging) {
			snapshot_position_x = snapshot.image_distance_centimeters.value_or(0.0);
			snapshot_position_y = snapshot.image_height_centimeters.value_or(0.0);
			snapshot_velocity_x = snapshot.magnification.value_or(0.0);
			snapshot_velocity_y = snapshot.real_image.value_or(false) ? 1.0 : 0.0;
		} else {
			snapshot_position_x = snapshot.first_minimum_offset_millimeters.value_or(0.0);
			snapshot_position_y = snapshot.central_maximum_width_millimeters.value_or(0.0);
			snapshot_velocity_x = snapshot.wavelength_nanometers.value_or(0.0);
			snapshot_velocity_y = snapshot.slit_width_micrometers.value_or(0.0);
		}
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::optics::ScenarioId::SnellRefraction) {
			summary << "Optics snapshot: incidentAngle="
			        << snapshot.incident_angle_degrees.value_or(0.0)
			        << " deg, refractedAngle=";
			if (snapshot.total_internal_reflection.value_or(false)) {
				summary << "none";
			} else {
				summary << snapshot.refracted_angle_degrees.value_or(0.0) << " deg";
			}
			summary << ", criticalAngle=";
			if (snapshot.critical_angle_degrees.has_value()) {
				summary << snapshot.critical_angle_degrees.value() << " deg";
			} else {
				summary << "n/a";
			}
			summary << ", relativeIndex=" << snapshot.relative_refractive_index.value_or(0.0)
			        << ", totalInternalReflection="
			        << (snapshot.total_internal_reflection.value_or(false) ? "yes" : "no")
			        << ", stable=" << (snapshot.stable ? "yes" : "no");
			override_summary = "Overrides: incidentAngleDegrees=" +
				std::to_string(scenario.incident_angle_degrees.value_or(0.0)) +
				", mediumARefractiveIndex=" +
				std::to_string(scenario.medium_a_refractive_index.value_or(0.0)) +
				", mediumBRefractiveIndex=" +
				std::to_string(scenario.medium_b_refractive_index.value_or(0.0));
		} else if (scenario.id == visual_physics::optics::ScenarioId::ThinLensImaging) {
			summary << "Optics snapshot: focalLength="
			        << snapshot.focal_length_centimeters.value_or(0.0)
			        << " cm, imageDistance="
			        << snapshot.image_distance_centimeters.value_or(0.0)
			        << " cm, imageHeight="
			        << snapshot.image_height_centimeters.value_or(0.0)
			        << " cm, magnification="
			        << snapshot.magnification.value_or(0.0)
			        << ", realImage=" << (snapshot.real_image.value_or(false) ? "yes" : "no")
			        << ", invertedImage=" << (snapshot.inverted_image.value_or(false) ? "yes" : "no")
			        << ", stable=" << (snapshot.stable ? "yes" : "no");
			override_summary = "Overrides: focalLengthCentimeters=" +
				std::to_string(scenario.focal_length_centimeters.value_or(0.0)) +
				", objectDistanceCentimeters=" +
				std::to_string(scenario.object_distance_centimeters.value_or(0.0)) +
				", objectHeightCentimeters=" +
				std::to_string(scenario.object_height_centimeters.value_or(0.0));
		} else {
			summary << "Optics snapshot: slitWidth="
			        << snapshot.slit_width_micrometers.value_or(0.0)
			        << " um, wavelength="
			        << snapshot.wavelength_nanometers.value_or(0.0)
			        << " nm, firstMinimumOffset="
			        << snapshot.first_minimum_offset_millimeters.value_or(0.0)
			        << " mm, centralMaximumWidth="
			        << snapshot.central_maximum_width_millimeters.value_or(0.0)
			        << " mm, stable=" << (snapshot.stable ? "yes" : "no");
			override_summary = "Overrides: slitWidthMicrometers=" +
				std::to_string(scenario.slit_width_micrometers.value_or(0.0)) +
				", wavelengthNanometers=" +
				std::to_string(scenario.wavelength_nanometers.value_or(0.0)) +
				", screenDistanceMeters=" +
				std::to_string(scenario.screen_distance_meters.value_or(0.0));
		}
		optics_summary = summary.str();
	} else if (options.domain == PhysicsDomain::Quantum) {
		const auto imported_state = resolve_imported_quantum_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(
			visual_physics::quantum::OverlayOptions{});
		resolved_quantum_overlays = overlays;
		const auto snapshot =
			visual_physics::quantum::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::quantum::build_samples(
			scenario,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::quantum::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_quantum_report_csv_path.has_value()) {
			const auto report_rows = visual_physics::quantum::build_report_summary_rows(
				scenario,
				snapshot);
			write_text_file(
				*options.export_quantum_report_csv_path,
				visual_physics::quantum::build_report_csv(
					scenario,
					snapshot,
					samples));
			std::ostringstream report_summary;
			report_summary << "Quantum report summary: ";
			for (std::size_t index = 0; index < report_rows.size(); index += 1) {
				if (index > 0) {
					report_summary << ", ";
				}
				report_summary << report_rows[index].metric << '=' << report_rows[index].value;
			}
			quantum_report_summary = report_summary.str();
		}
		axes_vertices = colorize_vertices(
			visual_physics::quantum::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::quantum::build_scenario_vertices(
				scenario,
				options.render_config.sample_count),
			{0.345F, 0.847F, 1.0F, 1.0F});
		for (const auto& vertex : visual_physics::quantum::build_overlay_line_vertices(
					snapshot,
					scenario,
					overlays)) {
			overlay_line_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		marker_vertices = colorize_vertices(
			visual_physics::quantum::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		for (const auto& vertex : visual_physics::quantum::build_overlay_marker_vertices(
					snapshot,
					scenario,
					static_cast<float>(options.render_config.width) /
						static_cast<float>(options.render_config.height),
					overlays)) {
			overlay_marker_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		scenario_label = std::string(visual_physics::quantum::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		if (scenario.id == visual_physics::quantum::ScenarioId::ParticleInBox) {
			snapshot_position_x = snapshot.box_length_nanometers.value_or(0.0);
			snapshot_position_y = snapshot.energy_level_ev.value_or(0.0);
			snapshot_velocity_x = snapshot.quantum_number.value_or(0.0);
			snapshot_velocity_y = snapshot.node_count.value_or(0.0);
		} else if (scenario.id == visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling) {
			snapshot_position_x = snapshot.transmission_probability.value_or(0.0);
			snapshot_position_y = snapshot.reflection_probability.value_or(0.0);
			snapshot_velocity_x = snapshot.barrier_height_ev.value_or(0.0);
			snapshot_velocity_y = snapshot.decay_length_nanometers.value_or(0.0);
		} else {
			snapshot_position_x = snapshot.fringe_spacing_millimeters.value_or(0.0);
			snapshot_position_y = snapshot.central_maximum_width_millimeters.value_or(0.0);
			snapshot_velocity_x = snapshot.wavelength_nanometers.value_or(0.0);
			snapshot_velocity_y = snapshot.coherence_estimate.value_or(0.0);
		}
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::quantum::ScenarioId::ParticleInBox) {
			summary << "Quantum snapshot: boxLength="
			        << snapshot.box_length_nanometers.value_or(0.0)
			        << " nm, quantumNumber="
			        << snapshot.quantum_number.value_or(0.0)
			        << ", energyLevel="
			        << snapshot.energy_level_ev.value_or(0.0)
			        << " eV, nodeCount="
			        << snapshot.node_count.value_or(0.0)
			        << ", stable=" << (snapshot.stable ? "yes" : "no");
			override_summary = "Overrides: boxLengthNanometers=" +
				std::to_string(scenario.box_length_nanometers.value_or(0.0)) +
				", quantumNumber=" +
				std::to_string(scenario.quantum_number.value_or(0.0));
		} else if (scenario.id == visual_physics::quantum::ScenarioId::FinitePotentialWellTunneling) {
			summary << "Quantum snapshot: particleEnergy="
			        << snapshot.particle_energy_ev.value_or(0.0)
			        << " eV, transmission="
			        << snapshot.transmission_probability.value_or(0.0)
			        << ", reflection="
			        << snapshot.reflection_probability.value_or(0.0)
			        << ", decayLength="
			        << snapshot.decay_length_nanometers.value_or(0.0)
			        << " nm, stable=" << (snapshot.stable ? "yes" : "no");
			override_summary = "Overrides: particleEnergyEv=" +
				std::to_string(scenario.particle_energy_ev.value_or(0.0)) +
				", barrierHeightEv=" +
				std::to_string(scenario.barrier_height_ev.value_or(0.0)) +
				", barrierWidthNanometers=" +
				std::to_string(scenario.barrier_width_nanometers.value_or(0.0));
		} else {
			summary << "Quantum snapshot: wavelength="
			        << snapshot.wavelength_nanometers.value_or(0.0)
			        << " nm, fringeSpacing="
			        << snapshot.fringe_spacing_millimeters.value_or(0.0)
			        << " mm, centralMaximumWidth="
			        << snapshot.central_maximum_width_millimeters.value_or(0.0)
			        << " mm, coherence="
			        << snapshot.coherence_estimate.value_or(0.0)
			        << ", stable=" << (snapshot.stable ? "yes" : "no");
			override_summary = "Overrides: wavelengthNanometers=" +
				std::to_string(scenario.wavelength_nanometers.value_or(0.0)) +
				", slitSeparationMicrometers=" +
				std::to_string(scenario.slit_separation_micrometers.value_or(0.0)) +
				", slitWidthMicrometers=" +
				std::to_string(scenario.slit_width_micrometers.value_or(0.0)) +
				", screenDistanceMeters=" +
				std::to_string(scenario.screen_distance_meters.value_or(0.0));
		}
		quantum_summary = summary.str();
	} else if (options.domain == PhysicsDomain::Thermodynamics) {
		const auto imported_state = resolve_imported_thermodynamics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(
			visual_physics::thermodynamics::OverlayOptions{});
		resolved_thermodynamics_overlays = overlays;
		const auto snapshot =
			visual_physics::thermodynamics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples = visual_physics::thermodynamics::build_samples(
			scenario,
			options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::thermodynamics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		axes_vertices = colorize_vertices(
			visual_physics::thermodynamics::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::thermodynamics::build_scenario_vertices(scenario),
			{0.345F, 0.847F, 1.0F, 1.0F});
		for (const auto& vertex : visual_physics::thermodynamics::build_overlay_line_vertices(
					snapshot,
					scenario,
					overlays)) {
			overlay_line_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		marker_vertices = colorize_vertices(
			visual_physics::thermodynamics::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		for (const auto& vertex : visual_physics::thermodynamics::build_overlay_marker_vertices(
					snapshot,
					scenario,
					static_cast<float>(options.render_config.width) /
						static_cast<float>(options.render_config.height),
					overlays)) {
			overlay_marker_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		scenario_label = std::string(visual_physics::thermodynamics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		if (scenario.id == visual_physics::thermodynamics::ScenarioId::HeatConductionSlab) {
			snapshot_position_x = snapshot.center_temperature_celsius.value_or(0.0);
			snapshot_position_y = snapshot.heat_flux_w_per_m2.value_or(0.0);
			snapshot_velocity_x = snapshot.fourier_number.value_or(0.0);
			snapshot_velocity_y = snapshot.normalized_temperature.value_or(0.0);
		} else if (scenario.id == visual_physics::thermodynamics::ScenarioId::CarnotCycle) {
			snapshot_position_x = snapshot.volume_cubic_meters;
			snapshot_position_y = snapshot.pressure_pascals;
			snapshot_velocity_x = snapshot.net_work_kj.value_or(0.0);
			snapshot_velocity_y = snapshot.thermal_efficiency.value_or(0.0);
		} else {
			snapshot_position_x = snapshot.volume_cubic_meters;
			snapshot_position_y = snapshot.pressure_pascals;
			snapshot_velocity_x = snapshot.density_kg_m3;
			snapshot_velocity_y = snapshot.internal_energy_joules;
		}
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::thermodynamics::ScenarioId::HeatConductionSlab) {
			summary << "Thermodynamics snapshot: centerTemperature="
			        << snapshot.center_temperature_celsius.value_or(0.0)
			        << " C, surfaceTemperature="
			        << snapshot.surface_temperature_celsius.value_or(0.0)
			        << " C, heatFlux="
			        << snapshot.heat_flux_w_per_m2.value_or(0.0)
			        << " W/m^2, fourierNumber="
			        << snapshot.fourier_number.value_or(0.0)
			        << ", normalizedTemperature="
			        << snapshot.normalized_temperature.value_or(0.0)
			        << ", stable=" << (snapshot.stable ? "yes" : "no");
		} else if (scenario.id == visual_physics::thermodynamics::ScenarioId::CarnotCycle) {
			summary << "Thermodynamics snapshot: pressure=" << snapshot.pressure_pascals
			        << " Pa, volume=" << snapshot.volume_cubic_meters
			        << " m^3, temperature=" << snapshot.temperature_kelvin
			        << " K, efficiency=" << snapshot.thermal_efficiency.value_or(0.0)
			        << ", netWork=" << snapshot.net_work_kj.value_or(0.0)
			        << " kJ, entropyTransfer=" << snapshot.entropy_transfer_kj_per_k.value_or(0.0)
			        << " kJ/K, stage=" << snapshot.cycle_stage_label.value_or(std::string{"unknown"})
			        << ", stable=" << (snapshot.stable ? "yes" : "no");
		} else {
			summary << "Thermodynamics snapshot: pressure=" << snapshot.pressure_pascals
			        << " Pa, density=" << snapshot.density_kg_m3
			        << " kg/m^3, internalEnergy=" << snapshot.internal_energy_joules
			        << " J, temperature=" << snapshot.temperature_kelvin
			        << " K, volume=" << snapshot.volume_cubic_meters
			        << " m^3, stable=" << (snapshot.stable ? "yes" : "no");
		}
		thermodynamics_summary = summary.str();
		if (scenario.id == visual_physics::thermodynamics::ScenarioId::HeatConductionSlab) {
			override_summary = "Overrides: slabThicknessMeters=" + std::to_string(scenario.slab_thickness_meters.value_or(0.0)) +
				", thermalConductivityWPerMK=" + std::to_string(scenario.thermal_conductivity_w_per_mk.value_or(0.0)) +
				", thermalDiffusivityM2PerS=" + std::to_string(scenario.thermal_diffusivity_m2_per_s.value_or(0.0)) +
				", initialTemperatureCelsius=" + std::to_string(scenario.initial_temperature_celsius.value_or(0.0)) +
				", boundaryTemperatureCelsius=" + std::to_string(scenario.boundary_temperature_celsius.value_or(0.0));
		} else if (scenario.id == visual_physics::thermodynamics::ScenarioId::CarnotCycle) {
			override_summary = "Overrides: gasConstant=" + std::to_string(scenario.gas_constant) +
				", molarAmount=" + std::to_string(scenario.molar_amount) +
				", hotReservoirTemperatureKelvin=" + std::to_string(scenario.hot_reservoir_temperature_kelvin.value_or(0.0)) +
				", coldReservoirTemperatureKelvin=" + std::to_string(scenario.cold_reservoir_temperature_kelvin.value_or(0.0)) +
				", cycleMinVolumeCubicMeters=" + std::to_string(scenario.cycle_min_volume_cubic_meters.value_or(0.0)) +
				", cycleVolumeRatio=" + std::to_string(scenario.cycle_volume_ratio.value_or(0.0));
		} else {
			override_summary = "Overrides: gasConstant=" + std::to_string(scenario.gas_constant) +
				", molarAmount=" + std::to_string(scenario.molar_amount) +
				", temperatureKelvin=" + std::to_string(scenario.temperature_kelvin) +
				", volumeCubicMeters=" + std::to_string(scenario.volume_cubic_meters) +
				", molarMassKgPerMol=" + std::to_string(scenario.molar_mass_kg_per_mol) +
				", degreesOfFreedom=" + std::to_string(scenario.degrees_of_freedom);
		}
	} else if (options.domain == PhysicsDomain::ElectronicsAndCircuits) {
		const auto imported_state = resolve_imported_electronics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(
			visual_physics::electronics::OverlayOptions{});
		resolved_electronics_overlays = overlays;
		const auto snapshot =
			visual_physics::electronics::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples =
			visual_physics::electronics::build_samples(scenario, options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::electronics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		axes_vertices = colorize_vertices(
			visual_physics::electronics::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::electronics::build_scenario_vertices(samples, scenario),
			{0.345F, 0.847F, 1.0F, 1.0F});
		for (const auto& vertex : visual_physics::electronics::build_overlay_line_vertices(
					snapshot,
					samples,
					scenario,
					overlays)) {
			overlay_line_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		marker_vertices = colorize_vertices(
			visual_physics::electronics::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		for (const auto& vertex : visual_physics::electronics::build_overlay_marker_vertices(
					snapshot,
					scenario,
					static_cast<float>(options.render_config.width) /
						static_cast<float>(options.render_config.height),
					overlays)) {
			overlay_marker_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		scenario_label = std::string(visual_physics::electronics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x =
			scenario.id == visual_physics::electronics::ScenarioId::ResistorNetwork
				? snapshot.output_voltage.value_or(0.0)
				: snapshot.time_seconds;
		if (scenario.id == visual_physics::electronics::ScenarioId::ResistorNetwork) {
			snapshot_position_y = snapshot.branch_current_amps.value_or(0.0);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlcResonance) {
			snapshot_position_y = snapshot.output_voltage.value_or(snapshot.capacitor_voltage);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlcResponse) {
			snapshot_position_y = snapshot.output_voltage.value_or(snapshot.capacitor_voltage);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::HalfWaveRectifier) {
			snapshot_position_y = snapshot.output_voltage.value_or(0.0);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::FullWaveRectifier) {
			snapshot_position_y = snapshot.output_voltage.value_or(0.0);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::SmoothedRectifier) {
			snapshot_position_y = snapshot.output_voltage.value_or(0.0);
		} else if (
			scenario.id == visual_physics::electronics::ScenarioId::RlHighPass ||
			scenario.id == visual_physics::electronics::ScenarioId::RlLowPass ||
			scenario.id == visual_physics::electronics::ScenarioId::RcHighPass ||
			scenario.id == visual_physics::electronics::ScenarioId::RlTransient) {
			snapshot_position_y = snapshot.output_voltage.value_or(0.0);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RcLowPass) {
			snapshot_position_y = snapshot.output_voltage.value_or(snapshot.capacitor_voltage);
		} else {
			snapshot_position_y = snapshot.capacitor_voltage;
		}
		snapshot_velocity_x = snapshot.current_amps;
		if (scenario.id == visual_physics::electronics::ScenarioId::ResistorNetwork) {
			snapshot_velocity_y = snapshot.lower_branch_power_watts.value_or(0.0);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlcResonance) {
			snapshot_velocity_y = snapshot.stored_energy_joules;
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlcResponse) {
			snapshot_velocity_y = snapshot.stored_energy_joules;
		} else if (scenario.id == visual_physics::electronics::ScenarioId::HalfWaveRectifier) {
			snapshot_velocity_y = snapshot.lower_branch_power_watts.value_or(0.0);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::FullWaveRectifier) {
			snapshot_velocity_y = snapshot.lower_branch_power_watts.value_or(0.0);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::SmoothedRectifier) {
			snapshot_velocity_y = snapshot.stored_energy_joules;
		} else if (
			scenario.id == visual_physics::electronics::ScenarioId::RlHighPass ||
			scenario.id == visual_physics::electronics::ScenarioId::RlLowPass ||
			scenario.id == visual_physics::electronics::ScenarioId::RlTransient) {
			snapshot_velocity_y = snapshot.flux_linkage_webers.value_or(snapshot.charge_coulombs);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RcHighPass) {
			snapshot_velocity_y = snapshot.charge_coulombs;
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RcLowPass) {
			snapshot_velocity_y = snapshot.stored_energy_joules;
		} else {
			snapshot_velocity_y = snapshot.charge_coulombs;
		}
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		if (scenario.id == visual_physics::electronics::ScenarioId::ResistorNetwork) {
			summary << "Electronics snapshot: outputVoltage="
			        << snapshot.output_voltage.value_or(0.0)
			        << ", branchCurrent=" << snapshot.branch_current_amps.value_or(0.0)
			        << ", equivalentResistance=" << snapshot.equivalent_resistance_ohms.value_or(0.0)
			        << ", lowerBranchPower=" << snapshot.lower_branch_power_watts.value_or(0.0);
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", upperResistanceOhms=" + std::to_string(scenario.upper_resistance_ohms.value_or(0.0)) +
				", lowerResistanceOhms=" + std::to_string(scenario.lower_resistance_ohms.value_or(0.0));
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlTransient) {
			summary << "Electronics snapshot: inductorVoltage="
			        << snapshot.output_voltage.value_or(0.0)
			        << ", resistorVoltageDrop=" << snapshot.capacitor_voltage
			        << ", current=" << snapshot.current_amps
			        << ", fluxLinkage=" << snapshot.flux_linkage_webers.value_or(0.0)
			        << ", storedEnergy=" << snapshot.stored_energy_joules
			        << ", tau=" << snapshot.time_constant_seconds;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", inductanceHenrys=" + std::to_string(scenario.inductance_henrys.value_or(0.0));
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RcLowPass) {
			const double phase_lag_degrees =
				-(std::atan(2.0 * kPi * snapshot.time_seconds * scenario.resistance_ohms * scenario.capacitance_farads) * 180.0) /
				kPi;
			summary << "Electronics snapshot: cutoffFrequency="
			        << snapshot.time_constant_seconds
			        << ", outputVoltage=" << snapshot.output_voltage.value_or(0.0)
			        << ", current=" << snapshot.current_amps
			        << ", storedEnergy=" << snapshot.stored_energy_joules
			        << ", phaseLagDegrees=" << phase_lag_degrees;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", capacitanceFarads=" + std::to_string(scenario.capacitance_farads);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RcHighPass) {
			const double phase_lead_degrees =
				90.0 - ((std::atan(2.0 * kPi * snapshot.time_seconds * scenario.resistance_ohms * scenario.capacitance_farads) * 180.0) /
				kPi);
			summary << "Electronics snapshot: cutoffFrequency="
			        << snapshot.time_constant_seconds
			        << ", outputVoltage=" << snapshot.output_voltage.value_or(0.0)
			        << ", capacitorResidualVoltage=" << snapshot.capacitor_voltage
			        << ", branchPower=" << snapshot.lower_branch_power_watts.value_or(0.0)
			        << ", phaseLeadDegrees=" << phase_lead_degrees;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", capacitanceFarads=" + std::to_string(scenario.capacitance_farads);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlLowPass) {
			const double phase_lag_degrees =
				(std::atan((2.0 * kPi * snapshot.time_seconds * scenario.inductance_henrys.value_or(0.0)) /
					std::max(scenario.resistance_ohms, 1e-6)) * 180.0) / kPi;
			summary << "Electronics snapshot: cutoffFrequency="
			        << snapshot.time_constant_seconds
			        << ", outputVoltage=" << snapshot.output_voltage.value_or(0.0)
			        << ", inductorVoltage=" << snapshot.capacitor_voltage
			        << ", storedEnergy=" << snapshot.stored_energy_joules
			        << ", phaseLagDegrees=" << phase_lag_degrees;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", inductanceHenrys=" + std::to_string(scenario.inductance_henrys.value_or(0.0));
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlHighPass) {
			const double phase_lead_degrees =
				90.0 - ((std::atan((2.0 * kPi * snapshot.time_seconds * scenario.inductance_henrys.value_or(0.0)) /
					std::max(scenario.resistance_ohms, 1e-6)) * 180.0) / kPi);
			summary << "Electronics snapshot: cutoffFrequency="
			        << snapshot.time_constant_seconds
			        << ", outputVoltage=" << snapshot.output_voltage.value_or(0.0)
			        << ", resistorResidualVoltage=" << snapshot.capacitor_voltage
			        << ", storedEnergy=" << snapshot.stored_energy_joules
			        << ", phaseLeadDegrees=" << phase_lead_degrees;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", inductanceHenrys=" + std::to_string(scenario.inductance_henrys.value_or(0.0));
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlcResonance) {
			const double inductance_henrys = std::max(scenario.inductance_henrys.value_or(0.0), 1e-12);
			const double capacitance_farads = std::max(scenario.capacitance_farads, 1e-12);
			const double resonant_frequency_hertz =
				1.0 / (2.0 * kPi * std::sqrt(inductance_henrys * capacitance_farads));
			summary << "Electronics snapshot: resonantFrequency="
			        << resonant_frequency_hertz
			        << ", bandwidth=" << snapshot.time_constant_seconds
			        << ", outputVoltage=" << snapshot.output_voltage.value_or(snapshot.capacitor_voltage)
			        << ", current=" << snapshot.current_amps
			        << ", branchPower=" << snapshot.lower_branch_power_watts.value_or(0.0);
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", capacitanceFarads=" + std::to_string(scenario.capacitance_farads) +
				", inductanceHenrys=" + std::to_string(scenario.inductance_henrys.value_or(0.0));
		} else if (scenario.id == visual_physics::electronics::ScenarioId::RlcResponse) {
			summary << "Electronics snapshot: capacitorVoltage=" << snapshot.capacitor_voltage
			        << ", resistorVoltageDrop=" << snapshot.resistor_voltage
			        << ", current=" << snapshot.current_amps
			        << ", charge=" << snapshot.charge_coulombs
			        << ", storedEnergy=" << snapshot.stored_energy_joules
			        << ", tau=" << snapshot.time_constant_seconds;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", capacitanceFarads=" + std::to_string(scenario.capacitance_farads) +
				", inductanceHenrys=" + std::to_string(scenario.inductance_henrys.value_or(0.0)) +
				", initialCapacitorVoltage=" + std::to_string(scenario.initial_capacitor_voltage);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::HalfWaveRectifier) {
			summary << "Electronics snapshot: sourceWaveform=" << snapshot.capacitor_voltage
			        << ", outputVoltage=" << snapshot.output_voltage.value_or(0.0)
			        << ", current=" << snapshot.current_amps
			        << ", branchPower=" << snapshot.lower_branch_power_watts.value_or(0.0)
			        << ", loadPeriod=" << snapshot.time_constant_seconds;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::FullWaveRectifier) {
			summary << "Electronics snapshot: sourceWaveform=" << snapshot.capacitor_voltage
			        << ", outputVoltage=" << snapshot.output_voltage.value_or(0.0)
			        << ", current=" << snapshot.current_amps
			        << ", branchPower=" << snapshot.lower_branch_power_watts.value_or(0.0)
			        << ", ripplePeriod=" << snapshot.time_constant_seconds;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms);
		} else if (scenario.id == visual_physics::electronics::ScenarioId::SmoothedRectifier) {
			summary << "Electronics snapshot: sourceWaveform=" << snapshot.capacitor_voltage
			        << ", outputVoltage=" << snapshot.output_voltage.value_or(0.0)
			        << ", capacitorCharge=" << snapshot.charge_coulombs
			        << ", storedEnergy=" << snapshot.stored_energy_joules
			        << ", rippleVoltage=" << snapshot.source_voltage - snapshot.output_voltage.value_or(0.0)
			        << ", tau=" << snapshot.time_constant_seconds;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", capacitanceFarads=" + std::to_string(scenario.capacitance_farads);
		} else {
			summary << "Electronics snapshot: capacitorVoltage=" << snapshot.capacitor_voltage
			        << ", resistorVoltage=" << snapshot.resistor_voltage
			        << ", current=" << snapshot.current_amps
			        << ", charge=" << snapshot.charge_coulombs
			        << ", storedEnergy=" << snapshot.stored_energy_joules
			        << ", tau=" << snapshot.time_constant_seconds;
			electronics_summary = summary.str();
			override_summary = "Overrides: sourceVoltage=" + std::to_string(scenario.source_voltage) +
				", resistanceOhms=" + std::to_string(scenario.resistance_ohms) +
				", capacitanceFarads=" + std::to_string(scenario.capacitance_farads) +
				", initialCapacitorVoltage=" + std::to_string(scenario.initial_capacitor_voltage);
		}
	} else if (options.domain == PhysicsDomain::Electromagnetism) {
		const auto imported_state = resolve_imported_electromagnetism_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(
			visual_physics::electromagnetism::OverlayOptions{});
		resolved_electromagnetism_overlays = overlays;
		const auto snapshot =
			visual_physics::electromagnetism::sample_scenario(scenario, imported_state.time_seconds);
		const auto samples =
			visual_physics::electromagnetism::build_samples(scenario, options.render_config.sample_count);
		if (options.roundtrip_check) {
			verify_roundtrip_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				options.render_config.sample_count);
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::electromagnetism::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		axes_vertices = colorize_vertices(
			visual_physics::electromagnetism::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::electromagnetism::build_scenario_vertices(snapshot, scenario),
			{0.345F, 0.847F, 1.0F, 1.0F});
		for (const auto& vertex : visual_physics::electromagnetism::build_overlay_line_vertices(
					snapshot,
					scenario,
					overlays)) {
			overlay_line_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		marker_vertices = colorize_vertices(
			visual_physics::electromagnetism::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 0.54F, 0.36F, 1.0F});
		for (const auto& vertex : visual_physics::electromagnetism::build_overlay_marker_vertices(
					snapshot,
					scenario,
					static_cast<float>(options.render_config.width) /
						static_cast<float>(options.render_config.height),
					overlays)) {
			overlay_marker_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		scenario_label = std::string(visual_physics::electromagnetism::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = snapshot.position.x;
		snapshot_position_y = snapshot.position.y;
		snapshot_velocity_x = 0.0;
		snapshot_velocity_y = 0.0;
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(2);
		summary << "Electromagnetism sample: E=(" << snapshot.electric_field.x << ", "
		        << snapshot.electric_field.y << "), B=(" << snapshot.magnetic_field.x << ", "
		        << snapshot.magnetic_field.y << "), force=(" << snapshot.force.x << ", "
		        << snapshot.force.y << "), potential=" << snapshot.potential
		        << ", fieldMagnitude=" << snapshot.field_magnitude;
		electromagnetism_summary = summary.str();
		override_summary = "Overrides: chargeMagnitude=" +
			std::to_string(scenario.charge_magnitude.value_or(0.0)) +
			", secondaryChargeMagnitude=" +
			std::to_string(scenario.secondary_charge_magnitude.value_or(0.0)) +
			", magneticFieldStrength=" +
			std::to_string(scenario.magnetic_field_strength.value_or(0.0)) +
			", current=" + std::to_string(scenario.current.value_or(0.0)) +
			", loopRadius=" + std::to_string(scenario.loop_radius.value_or(0.0)) +
			", plateSeparation=" + std::to_string(scenario.plate_separation.value_or(0.0)) +
			", potentialDifference=" + std::to_string(scenario.potential_difference.value_or(0.0)) +
			", fluxRate=" + std::to_string(scenario.flux_rate.value_or(0.0)) +
			", inductance=" + std::to_string(scenario.inductance.value_or(0.0));
	} else {
		const auto imported_state = resolve_imported_computational_physics_state(options);
		const auto& scenario = imported_state.scenario;
		const auto overlays = imported_state.overlays.value_or(
			visual_physics::computational_physics::OverlayOptions{});
		resolved_computational_physics_overlays = overlays;
		const auto snapshot = visual_physics::computational_physics::sample_scenario(
			scenario,
			imported_state.time_seconds);
		const auto samples = visual_physics::computational_physics::build_samples(
			scenario,
			options.render_config.sample_count);
		const auto convergence_study =
			visual_physics::computational_physics::build_convergence_study(scenario);
		const auto orbital_invariant_history =
			visual_physics::computational_physics::build_orbital_invariant_history(
				scenario,
				options.render_config.sample_count);
		const auto spring_invariant_history =
			visual_physics::computational_physics::build_spring_invariant_history(
				scenario,
				options.render_config.sample_count);
		if (options.roundtrip_check) {
			const auto payload = visual_physics::computational_physics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				convergence_study,
				orbital_invariant_history,
				spring_invariant_history,
				"roundtrip-check");
			const auto imported = visual_physics::computational_physics::parse_import_payload(payload);
			static_cast<void>(visual_physics::computational_physics::sample_scenario(
				imported.scenario,
				imported.time_seconds));
		}
		if (options.export_state_path.has_value()) {
			const auto payload = visual_physics::computational_physics::serialize_export_payload(
				scenario,
				snapshot,
				overlays,
				samples,
				convergence_study,
				orbital_invariant_history,
				spring_invariant_history,
				build_export_timestamp());
			write_text_file(*options.export_state_path, payload);
		}
		if (options.export_convergence_csv_path.has_value()) {
			write_text_file(
				*options.export_convergence_csv_path,
				visual_physics::computational_physics::build_convergence_csv(
					scenario,
					convergence_study));
		}
		if (options.export_orbital_invariant_csv_path.has_value()) {
			write_text_file(
				*options.export_orbital_invariant_csv_path,
				visual_physics::computational_physics::build_invariant_history_csv(
					orbital_invariant_history));
		}
		if (options.export_spring_invariant_csv_path.has_value()) {
			write_text_file(
				*options.export_spring_invariant_csv_path,
				visual_physics::computational_physics::build_spring_invariant_history_csv(
					spring_invariant_history));
		}
		axes_vertices = colorize_vertices(
			visual_physics::computational_physics::build_axes_vertices(scenario),
			{0.52F, 0.66F, 0.82F, 1.0F});
		trajectory_vertices = colorize_vertices(
			visual_physics::computational_physics::build_reference_trajectory_vertices(samples, scenario),
			{0.75F, 0.80F, 0.88F, 1.0F});
		for (const auto& vertex : visual_physics::computational_physics::build_overlay_line_vertices(
					snapshot,
					samples,
					scenario,
					overlays)) {
			overlay_line_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		marker_vertices = colorize_vertices(
			visual_physics::computational_physics::build_marker_vertices(
				snapshot,
				scenario,
				static_cast<float>(options.render_config.width) /
					static_cast<float>(options.render_config.height)),
			{1.0F, 1.0F, 1.0F, 1.0F});
		for (const auto& vertex : visual_physics::computational_physics::build_overlay_marker_vertices(
					snapshot,
					scenario,
					static_cast<float>(options.render_config.width) /
						static_cast<float>(options.render_config.height),
					overlays)) {
			overlay_marker_vertices.push_back({vertex.x, vertex.y, vertex.r, vertex.g, vertex.b, vertex.a});
		}
		scenario_label = std::string(visual_physics::computational_physics::to_string(scenario.id));
		imported_time_seconds = imported_state.time_seconds;
		snapshot_position_x = snapshot.reference_position.x;
		snapshot_position_y = snapshot.reference_position.y;
		snapshot_velocity_x = snapshot.reference_velocity.x;
		snapshot_velocity_y = snapshot.reference_velocity.y;
		scenario_name = scenario.name;
		std::ostringstream summary;
		summary << std::fixed << std::setprecision(3);
		summary << "Computational Physics snapshot: eulerError="
		        << snapshot.euler.position_error
		        << ", symplecticError=" << snapshot.symplectic.position_error
		        << ", rk4Error=" << snapshot.rk4.position_error
		        << ", referenceStep=" << scenario.reference_step_seconds
		        << ", comparisonStep=" << scenario.comparison_step_seconds;
		if (snapshot.orbital_diagnostics.has_value()) {
			summary << ", eulerEnergyError="
			        << snapshot.orbital_diagnostics->euler_specific_energy_error
			        << ", symplecticEnergyError="
			        << snapshot.orbital_diagnostics->symplectic_specific_energy_error
			        << ", rk4EnergyError="
			        << snapshot.orbital_diagnostics->rk4_specific_energy_error
			        << ", eulerAngularMomentumError="
			        << snapshot.orbital_diagnostics->euler_angular_momentum_error
			        << ", symplecticAngularMomentumError="
			        << snapshot.orbital_diagnostics->symplectic_angular_momentum_error
			        << ", rk4AngularMomentumError="
			        << snapshot.orbital_diagnostics->rk4_angular_momentum_error;
		}
		if (snapshot.spring_diagnostics.has_value()) {
			summary << ", eulerSpringEnergyError="
			        << snapshot.spring_diagnostics->euler_total_energy_error
			        << ", symplecticSpringEnergyError="
			        << snapshot.spring_diagnostics->symplectic_total_energy_error
			        << ", rk4SpringEnergyError="
			        << snapshot.spring_diagnostics->rk4_total_energy_error
			        << ", eulerSpringPhaseError="
			        << snapshot.spring_diagnostics->euler_phase_angle_error
			        << ", symplecticSpringPhaseError="
			        << snapshot.spring_diagnostics->symplectic_phase_angle_error
			        << ", rk4SpringPhaseError="
			        << snapshot.spring_diagnostics->rk4_phase_angle_error;
		}
		computational_physics_summary = summary.str();
		override_summary = "Overrides: initialPosition=(" +
			std::to_string(scenario.initial_position.x) + ", " +
			std::to_string(scenario.initial_position.y) + "), initialVelocity=(" +
			std::to_string(scenario.initial_velocity.x) + ", " +
			std::to_string(scenario.initial_velocity.y) + "), gravity=(" +
			std::to_string(scenario.gravity.x) + ", " +
			std::to_string(scenario.gravity.y) + "), mass=" +
			std::to_string(scenario.mass) + ", dragCoefficient=" +
			std::to_string(scenario.drag_coefficient) + ", comparisonStepSeconds=" +
			std::to_string(scenario.comparison_step_seconds) + ", referenceStepSeconds=" +
			std::to_string(scenario.reference_step_seconds);
		if (scenario.orbital_center.has_value()) {
			override_summary += ", orbitalCenter=(" +
				std::to_string(scenario.orbital_center->x) + ", " +
				std::to_string(scenario.orbital_center->y) + "), gravitationalParameter=" +
				std::to_string(scenario.gravitational_parameter.value_or(0.0));
		}
		if (scenario.spring_anchor.has_value()) {
			override_summary += ", springAnchor=(" +
				std::to_string(scenario.spring_anchor->x) + ", " +
				std::to_string(scenario.spring_anchor->y) + "), springConstant=" +
				std::to_string(scenario.spring_constant.value_or(0.0)) +
				", dampingCoefficient=" +
				std::to_string(scenario.damping_coefficient.value_or(0.0));
		}
	}
	auto ensure_required_geometry = [](std::vector<RenderVertex>& vertices) {
		if (!vertices.empty()) {
			return;
		}
		vertices = {
			{-1.2F, -1.2F, 0.0F, 0.0F, 0.0F, 0.0F},
			{-1.2F, -1.2F, 0.0F, 0.0F, 0.0F, 0.0F},
		};
	};
	ensure_required_geometry(axes_vertices);
	ensure_required_geometry(trajectory_vertices);
	ensure_required_geometry(marker_vertices);
	const auto axes_buffer = create_vertex_buffer(
		selected_device.physical_device,
		device.get(),
		axes_vertices.data(),
		static_cast<VkDeviceSize>(axes_vertices.size() * sizeof(axes_vertices[0])));
	const auto trajectory_buffer = create_vertex_buffer(
		selected_device.physical_device,
		device.get(),
		trajectory_vertices.data(),
		static_cast<VkDeviceSize>(trajectory_vertices.size() * sizeof(trajectory_vertices[0])));
	const std::optional<VulkanBuffer> overlay_line_buffer = overlay_line_vertices.empty()
		? std::nullopt
		: std::optional<VulkanBuffer>(create_vertex_buffer(
			selected_device.physical_device,
			device.get(),
			overlay_line_vertices.data(),
			static_cast<VkDeviceSize>(overlay_line_vertices.size() * sizeof(overlay_line_vertices[0]))));
	const auto marker_buffer = create_vertex_buffer(
		selected_device.physical_device,
		device.get(),
		marker_vertices.data(),
		static_cast<VkDeviceSize>(marker_vertices.size() * sizeof(marker_vertices[0])));
	const std::optional<VulkanBuffer> overlay_marker_buffer = overlay_marker_vertices.empty()
		? std::nullopt
		: std::optional<VulkanBuffer>(create_vertex_buffer(
			selected_device.physical_device,
			device.get(),
			overlay_marker_vertices.data(),
			static_cast<VkDeviceSize>(overlay_marker_vertices.size() * sizeof(overlay_marker_vertices[0]))));
	const auto readback_buffer = create_buffer(
		selected_device.physical_device,
		device.get(),
		static_cast<VkDeviceSize>(options.render_config.width) * options.render_config.height * 4,
		VK_BUFFER_USAGE_TRANSFER_DST_BIT,
		VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT);
	const auto vertex_shader = create_shader_module(
		device.get(),
		std::filesystem::path(VISUAL_PHYSICS_VULKAN_SHADER_DIR) / "kinematics_line.vert.spv");
	const auto fragment_shader = create_shader_module(
		device.get(),
		std::filesystem::path(VISUAL_PHYSICS_VULKAN_SHADER_DIR) / "kinematics_line.frag.spv");
	const auto render_pass = create_render_pass(device.get());
	const auto offscreen_image = create_offscreen_image(
		selected_device.physical_device,
		device.get(),
		options.render_config.width,
		options.render_config.height);
	const auto offscreen_view = create_image_view(device.get(), offscreen_image.get());
	const auto framebuffer = create_framebuffer(
		device.get(),
		render_pass.get(),
		offscreen_view.get(),
		options.render_config.width,
		options.render_config.height);
	const auto pipeline_layout = create_pipeline_layout(device.get());
	const auto graphics_pipeline = create_line_pipeline(
		device.get(),
		render_pass.get(),
		pipeline_layout.get(),
		vertex_shader.get(),
		fragment_shader.get(),
		VK_PRIMITIVE_TOPOLOGY_LINE_LIST);
	const auto marker_pipeline = create_line_pipeline(
		device.get(),
		render_pass.get(),
		pipeline_layout.get(),
		vertex_shader.get(),
		fragment_shader.get(),
		VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST);
	record_draw_commands(
		command_buffer,
		options.render_config,
		render_pass.get(),
		framebuffer.get(),
		graphics_pipeline.get(),
		marker_pipeline.get(),
		axes_buffer.get(),
		static_cast<uint32_t>(axes_vertices.size()),
		trajectory_buffer.get(),
		static_cast<uint32_t>(trajectory_vertices.size()),
		overlay_line_buffer.has_value() ? overlay_line_buffer->get() : VK_NULL_HANDLE,
		static_cast<uint32_t>(overlay_line_vertices.size()),
		marker_buffer.get(),
		static_cast<uint32_t>(marker_vertices.size()),
		overlay_marker_buffer.has_value() ? overlay_marker_buffer->get() : VK_NULL_HANDLE,
		static_cast<uint32_t>(overlay_marker_vertices.size()),
		offscreen_image.get(),
		readback_buffer.get());
	submit_and_wait(device.get(), graphics_queue, command_buffer);
	const auto image_path = options.output_path;
	write_ppm_image(readback_buffer, image_path, options.render_config);

	std::cout << "Vulkan loader "
		      << VK_API_VERSION_MAJOR(api_version) << '.'
		      << VK_API_VERSION_MINOR(api_version) << '.'
		      << VK_API_VERSION_PATCH(api_version) << '\n';
	std::cout << "Selected device: " << selected_device.properties.deviceName << " ("
		      << device_type_label(selected_device.properties.deviceType) << ")\n";
	std::cout << "Domain: " << to_string(options.domain) << '\n';
	std::cout << "Scenario: " << scenario_label
		      << ", time=" << imported_time_seconds << "s\n";
	std::cout << "Render config: " << options.render_config.width << "x"
		      << options.render_config.height << ", samples="
		      << options.render_config.sample_count << '\n';
	if (options.import_path.has_value()) {
		std::cout << "Imported payload: " << options.import_path->string() << '\n';
	}
	if (options.export_state_path.has_value()) {
		std::cout << "Exported payload: " << options.export_state_path->string() << '\n';
	}
	if (options.export_plasma_report_csv_path.has_value()) {
		std::cout << "Exported plasma report CSV: "
		          << options.export_plasma_report_csv_path->string() << '\n';
	}
	if (options.export_solid_state_report_csv_path.has_value()) {
		std::cout << "Exported solid-state report CSV: "
		          << options.export_solid_state_report_csv_path->string() << '\n';
	}
	if (options.export_nuclear_report_csv_path.has_value()) {
		std::cout << "Exported nuclear report CSV: "
		          << options.export_nuclear_report_csv_path->string() << '\n';
	}
	if (options.export_atmospheric_report_csv_path.has_value()) {
		std::cout << "Exported atmospheric report CSV: "
		          << options.export_atmospheric_report_csv_path->string() << '\n';
	}
	if (options.export_astrophysics_report_csv_path.has_value()) {
		std::cout << "Exported astrophysics report CSV: "
		          << options.export_astrophysics_report_csv_path->string() << '\n';
	}
	if (options.export_relativity_report_csv_path.has_value()) {
		std::cout << "Exported relativity report CSV: "
		          << options.export_relativity_report_csv_path->string() << '\n';
	}
	if (options.export_waves_report_csv_path.has_value()) {
		std::cout << "Exported waves report CSV: "
		          << options.export_waves_report_csv_path->string() << '\n';
	}
	if (options.export_quantum_report_csv_path.has_value()) {
		std::cout << "Exported quantum report CSV: "
		          << options.export_quantum_report_csv_path->string() << '\n';
	}
	if (options.export_convergence_csv_path.has_value()) {
		std::cout << "Exported convergence CSV: " << options.export_convergence_csv_path->string() << '\n';
	}
	if (options.export_orbital_invariant_csv_path.has_value()) {
		std::cout << "Exported orbital invariant CSV: " << options.export_orbital_invariant_csv_path->string() << '\n';
	}
	if (options.export_spring_invariant_csv_path.has_value()) {
		std::cout << "Exported spring invariant CSV: " << options.export_spring_invariant_csv_path->string() << '\n';
	}
	if (options.roundtrip_check) {
		std::cout << "Roundtrip check: passed\n";
	}
	if (resolved_dynamics_overlays.has_value()) {
		std::cout << "Dynamics overlays: momentum="
		          << (resolved_dynamics_overlays->show_momentum_vector ? "on" : "off")
		          << ", velocity="
		          << (resolved_dynamics_overlays->show_velocity_vector ? "on" : "off")
		          << ", force="
		          << (resolved_dynamics_overlays->show_force_vector ? "on" : "off")
		          << ", guides="
		          << (resolved_dynamics_overlays->show_scenario_guides ? "on" : "off")
		          << '\n';
	}
	if (resolved_statics_overlays.has_value()) {
		std::cout << "Statics overlays: appliedForce="
		          << (resolved_statics_overlays->show_applied_force ? "on" : "off")
		          << ", reactions="
		          << (resolved_statics_overlays->show_reaction_forces ? "on" : "off")
		          << ", residualGuides="
		          << (resolved_statics_overlays->show_residual_guides ? "on" : "off")
		          << '\n';
	}
	if (resolved_fluid_mechanics_overlays.has_value()) {
		std::cout << "Fluid Mechanics overlays: forceGuides="
		          << (resolved_fluid_mechanics_overlays->show_force_guides ? "on" : "off")
		          << ", waterline="
		          << (resolved_fluid_mechanics_overlays->show_waterline ? "on" : "off")
		          << ", equilibriumGuide="
		          << (resolved_fluid_mechanics_overlays->show_equilibrium_guide ? "on" : "off")
		          << '\n';
	}
	if (resolved_plasma_overlays.has_value()) {
		std::cout << "Plasma Physics overlays: referenceGuides="
		          << (resolved_plasma_overlays->show_reference_guides ? "on" : "off")
		          << ", comparisonBand="
		          << (resolved_plasma_overlays->show_comparison_band ? "on" : "off")
		          << ", activeMarker="
		          << (resolved_plasma_overlays->show_active_marker ? "on" : "off")
		          << '\n';
	}
	if (resolved_solid_state_overlays.has_value()) {
		std::cout << "Solid State overlays: referenceGuides="
		          << (resolved_solid_state_overlays->show_reference_guides ? "on" : "off")
		          << ", comparisonBand="
		          << (resolved_solid_state_overlays->show_comparison_band ? "on" : "off")
		          << ", activeMarker="
		          << (resolved_solid_state_overlays->show_active_marker ? "on" : "off")
		          << '\n';
	}
	if (resolved_nuclear_and_particle_physics_overlays.has_value()) {
		std::cout << "Nuclear and Particle Physics overlays: referenceGuides="
		          << (resolved_nuclear_and_particle_physics_overlays->show_reference_guides ? "on" : "off")
		          << ", comparisonBand="
		          << (resolved_nuclear_and_particle_physics_overlays->show_comparison_band ? "on" : "off")
		          << ", activeMarker="
		          << (resolved_nuclear_and_particle_physics_overlays->show_active_marker ? "on" : "off")
		          << '\n';
	}
	if (resolved_atmospheric_overlays.has_value()) {
		std::cout << "Atmospheric overlays: referenceGuides="
		          << (resolved_atmospheric_overlays->show_reference_guides ? "on" : "off")
		          << ", comparisonBand="
		          << (resolved_atmospheric_overlays->show_comparison_band ? "on" : "off")
		          << ", activeMarker="
		          << (resolved_atmospheric_overlays->show_active_marker ? "on" : "off")
		          << '\n';
	}
	if (resolved_astrophysics_overlays.has_value()) {
		std::cout << "Astrophysics overlays: referenceGuides="
		          << (resolved_astrophysics_overlays->show_reference_guides ? "on" : "off")
		          << ", comparisonBand="
		          << (resolved_astrophysics_overlays->show_comparison_band ? "on" : "off")
		          << ", activeMarker="
		          << (resolved_astrophysics_overlays->show_active_marker ? "on" : "off")
		          << '\n';
	}
	if (resolved_relativity_overlays.has_value()) {
		std::cout << "Relativity overlays: referenceGuides="
		          << (resolved_relativity_overlays->show_reference_guides ? "on" : "off")
		          << ", comparisonCurve="
		          << (resolved_relativity_overlays->show_comparison_curve ? "on" : "off")
		          << ", activeMarker="
		          << (resolved_relativity_overlays->show_active_marker ? "on" : "off")
		          << '\n';
	}
	if (resolved_waves_overlays.has_value()) {
		std::cout << "Waves overlays: waveGuides="
		          << (resolved_waves_overlays->show_wave_guides ? "on" : "off")
		          << ", nodeMarkers="
		          << (resolved_waves_overlays->show_node_markers ? "on" : "off")
		          << ", referenceCurve="
		          << (resolved_waves_overlays->show_reference_curve ? "on" : "off")
		          << '\n';
	}
	if (resolved_optics_overlays.has_value()) {
		std::cout << "Optics overlays: incidentGuide="
		          << (resolved_optics_overlays->show_incident_guide ? "on" : "off")
		          << ", normalGuide="
		          << (resolved_optics_overlays->show_normal_guide ? "on" : "off")
		          << ", secondaryGuide="
		          << (resolved_optics_overlays->show_secondary_guide ? "on" : "off")
		          << '\n';
	}
	if (resolved_quantum_overlays.has_value()) {
		std::cout << "Quantum overlays: probabilityGuide="
		          << (resolved_quantum_overlays->show_probability_guide ? "on" : "off")
		          << ", potentialGuide="
		          << (resolved_quantum_overlays->show_potential_guide ? "on" : "off")
		          << ", phaseGuide="
		          << (resolved_quantum_overlays->show_phase_guide ? "on" : "off")
		          << '\n';
	}
	if (resolved_thermodynamics_overlays.has_value()) {
		std::cout << "Thermodynamics overlays: pressureGuide="
		          << (resolved_thermodynamics_overlays->show_pressure_guide ? "on" : "off")
		          << ", temperatureBand="
		          << (resolved_thermodynamics_overlays->show_temperature_band ? "on" : "off")
		          << ", energyMarker="
		          << (resolved_thermodynamics_overlays->show_energy_marker ? "on" : "off")
		          << '\n';
	}
	if (resolved_electronics_overlays.has_value()) {
		std::cout << "Electronics overlays: sourceVoltage="
		          << (resolved_electronics_overlays->show_source_voltage ? "on" : "off")
		          << ", resistorVoltage="
		          << (resolved_electronics_overlays->show_resistor_voltage ? "on" : "off")
		          << ", energyCurve="
		          << (resolved_electronics_overlays->show_energy_curve ? "on" : "off")
		          << '\n';
	}
	if (resolved_electromagnetism_overlays.has_value()) {
		std::cout << "Electromagnetism overlays: fieldVectors="
		          << (resolved_electromagnetism_overlays->show_field_vectors ? "on" : "off")
		          << ", magneticField="
		          << (resolved_electromagnetism_overlays->show_magnetic_field ? "on" : "off")
		          << ", forceVectors="
		          << (resolved_electromagnetism_overlays->show_force_vectors ? "on" : "off")
		          << ", potentialGuides="
		          << (resolved_electromagnetism_overlays->show_potential_guides ? "on" : "off")
		          << ", trajectory="
		          << (resolved_electromagnetism_overlays->show_trajectory ? "on" : "off")
		          << '\n';
	}
	if (resolved_computational_physics_overlays.has_value()) {
		std::cout << "Computational Physics overlays: reference="
		          << (resolved_computational_physics_overlays->show_reference_trajectory ? "on" : "off")
		          << ", euler="
		          << (resolved_computational_physics_overlays->show_euler_trajectory ? "on" : "off")
		          << ", symplectic="
		          << (resolved_computational_physics_overlays->show_symplectic_trajectory ? "on" : "off")
		          << ", rk4="
		          << (resolved_computational_physics_overlays->show_rk4_trajectory ? "on" : "off")
		          << ", errorBars="
		          << (resolved_computational_physics_overlays->show_error_bars ? "on" : "off")
		          << '\n';
	}
	std::cout << override_summary << '\n';
	std::cout << "Graphics queue family: " << selected_device.graphics_queue_family_index << '\n';
	std::cout << "Graphics queue handle: " << graphics_queue << '\n';
	std::cout << "Command resources allocated: pool=" << command_pool.get()
		      << ", buffer=" << command_buffer << '\n';
	std::cout << "Geometry buffers uploaded: axes="
		      << axes_vertices.size() * sizeof(axes_vertices[0])
		      << " bytes, trajectory="
		      << trajectory_vertices.size() * sizeof(trajectory_vertices[0])
		      << " bytes, overlays="
		      << overlay_line_vertices.size() * sizeof(overlay_line_vertices[0])
		      << " bytes, overlayMarkers="
		      << overlay_marker_vertices.size() * sizeof(overlay_marker_vertices[0])
		      << " bytes, marker="
		      << marker_vertices.size() * sizeof(marker_vertices[0])
		      << " bytes\n";
	std::cout << "Shader modules created: vert=" << vertex_shader.get()
		      << ", frag=" << fragment_shader.get() << '\n';
	std::cout << "Graphics pipeline ready: renderPass=" << render_pass.get()
		      << ", layout=" << pipeline_layout.get()
		      << ", linePipeline=" << graphics_pipeline.get()
		      << ", markerPipeline=" << marker_pipeline.get() << '\n';
	std::cout << "Offscreen target ready: image=" << offscreen_image.get()
		      << ", view=" << offscreen_view.get()
		      << ", framebuffer=" << framebuffer.get() << '\n';
	std::cout << "Headless draw submitted and completed on queue.\n";
	std::cout << "Readback image written: " << image_path.string() << '\n';
	std::cout << std::fixed << std::setprecision(2);
	std::cout << scenario_name << " sample at t=" << imported_time_seconds << "s -> position ("
		      << snapshot_position_x << ", " << snapshot_position_y << ") m, velocity ("
		      << snapshot_velocity_x << ", " << snapshot_velocity_y << ") m/s\n";
	if (statics_summary.has_value()) {
		std::cout << *statics_summary << '\n';
	}
	if (fluid_mechanics_summary.has_value()) {
		std::cout << *fluid_mechanics_summary << '\n';
	}
	if (plasma_summary.has_value()) {
		std::cout << *plasma_summary << '\n';
	}
	if (plasma_report_summary.has_value()) {
		std::cout << *plasma_report_summary << '\n';
	}
	if (solid_state_summary.has_value()) {
		std::cout << *solid_state_summary << '\n';
	}
	if (solid_state_report_summary.has_value()) {
		std::cout << *solid_state_report_summary << '\n';
	}
	if (nuclear_and_particle_physics_summary.has_value()) {
		std::cout << *nuclear_and_particle_physics_summary << '\n';
	}
	if (nuclear_and_particle_physics_report_summary.has_value()) {
		std::cout << *nuclear_and_particle_physics_report_summary << '\n';
	}
	if (atmospheric_summary.has_value()) {
		std::cout << *atmospheric_summary << '\n';
	}
	if (atmospheric_report_summary.has_value()) {
		std::cout << *atmospheric_report_summary << '\n';
	}
	if (astrophysics_summary.has_value()) {
		std::cout << *astrophysics_summary << '\n';
	}
	if (astrophysics_report_summary.has_value()) {
		std::cout << *astrophysics_report_summary << '\n';
	}
	if (relativity_summary.has_value()) {
		std::cout << *relativity_summary << '\n';
	}
	if (relativity_report_summary.has_value()) {
		std::cout << *relativity_report_summary << '\n';
	}
	if (waves_summary.has_value()) {
		std::cout << *waves_summary << '\n';
	}
	if (waves_report_summary.has_value()) {
		std::cout << *waves_report_summary << '\n';
	}
	if (optics_summary.has_value()) {
		std::cout << *optics_summary << '\n';
	}
	if (quantum_summary.has_value()) {
		std::cout << *quantum_summary << '\n';
	}
	if (quantum_report_summary.has_value()) {
		std::cout << *quantum_report_summary << '\n';
	}
	if (thermodynamics_summary.has_value()) {
		std::cout << *thermodynamics_summary << '\n';
	}
	if (electronics_summary.has_value()) {
		std::cout << *electronics_summary << '\n';
	}
	if (electromagnetism_summary.has_value()) {
		std::cout << *electromagnetism_summary << '\n';
	}
	if (computational_physics_summary.has_value()) {
		std::cout << *computational_physics_summary << '\n';
	}
	std::cout << "Renderer-ready geometry: axes=" << axes_vertices.size()
		      << " vertices, trajectory=" << trajectory_vertices.size()
		      << " vertices, overlays=" << overlay_line_vertices.size()
		      << " vertices, overlayMarkers=" << overlay_marker_vertices.size()
		      << " vertices, marker=" << marker_vertices.size() << " vertices\n";
	std::cout << "Vertex buffer handles: axes=" << axes_buffer.get()
		      << ", trajectory=" << trajectory_buffer.get()
		      << ", overlays="
		      << (overlay_line_buffer.has_value() ? overlay_line_buffer->get() : VK_NULL_HANDLE)
		      << ", overlayMarkers="
		      << (overlay_marker_buffer.has_value() ? overlay_marker_buffer->get() : VK_NULL_HANDLE)
		      << ", marker=" << marker_buffer.get() << '\n';

	return 0;
}
