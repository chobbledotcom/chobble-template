import specsIcons from "#data/specs_icons.json" with { type: "json" };

/**
 * Get the icon filename for a spec name
 * Normalizes the spec name (lowercase, trimmed) before lookup
 * @param {string} specName - The spec name to look up
 * @returns {string|null} - The icon filename or null if not found
 */
const specIcon = (specName) => {
	if (!specName) return null;
	const normalized = specName.toLowerCase().trim();
	return specsIcons[normalized] || null;
};

const configureSpecFilters = (eleventyConfig) => {
	eleventyConfig.addFilter("spec_icon", specIcon);
};

export { specIcon, configureSpecFilters };
