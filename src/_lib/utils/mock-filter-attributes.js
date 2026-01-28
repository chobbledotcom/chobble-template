/**
 * Filter attributes handling with FAST_INACCURATE_BUILDS support.
 * Uses path-based hashing for consistent mock values across rebuilds.
 */
import { FAST_INACCURATE_BUILDS } from "#build/build-mode.js";
import { hashString } from "#media/thumbnail-placeholder.js";

/**
 * Generate mock filter_attributes for fast builds.
 * Uses path-based hashing for consistent values across rebuilds.
 * @param {string} inputPath - The file path of the item
 * @returns {Array<{name: string, value: string}>}
 */
const generateMockFilterAttributes = (inputPath) => {
  const hash = hashString(inputPath || "");
  return [
    { name: "Foo Attribute", value: hash % 2 === 0 ? "foo" : "bar" },
    { name: "Bar Attribute", value: hash % 3 === 0 ? "foo" : "bar" },
  ];
};

/**
 * Get filter attributes, returning mock values in FAST_INACCURATE_BUILDS mode.
 * @param {Array<{name: string, value: string}>|undefined} filterAttributes - Original attributes
 * @param {string} inputPath - The file path of the item
 * @returns {Array<{name: string, value: string}>|undefined}
 */
const getFilterAttributes = (filterAttributes, inputPath) => {
  if (!filterAttributes) return filterAttributes;
  if (FAST_INACCURATE_BUILDS) return generateMockFilterAttributes(inputPath);
  return filterAttributes;
};

export { generateMockFilterAttributes, getFilterAttributes };
