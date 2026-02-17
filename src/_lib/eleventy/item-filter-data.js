/**
 * HTML-safe JSON serialization for filter data attributes.
 *
 * Builds the complete filter JSON from filter_data (title, price) and
 * filter_attributes (parsed into slugified key-value pairs), then escapes
 * HTML entities for safe embedding in data-* attributes.
 *
 * filter_attributes are parsed here at render time rather than in
 * eleventyComputed because Eleventy's ComputedDataProxy runs computed
 * functions with proxy objects during dependency detection, and
 * Object.fromEntries cannot process those proxy arrays.
 */

import { parseFilterAttributes } from "#filters/filter-core.js";
import { escapeAttrValue } from "#utils/dom-builder.js";

/**
 * Register the toFilterJsonAttr filter with Eleventy.
 * @param {*} eleventyConfig - Eleventy config
 */
export const configureItemFilterData = (eleventyConfig) => {
  /**
   * Build complete filter JSON from filter_data and filter_attributes,
   * then escape for safe HTML attribute embedding.
   * @param {{ title: string, price: number }} filterData - Pre-computed filter data
   * @param {Array<{name: string, value: string}>} filterAttributes - Raw filter attributes
   * @returns {string} HTML-safe JSON string
   */
  const toFilterJsonAttr = (filterData, filterAttributes) =>
    escapeAttrValue(
      JSON.stringify({
        ...filterData,
        filters: parseFilterAttributes(filterAttributes),
      }),
    );

  eleventyConfig.addFilter("toFilterJsonAttr", toFilterJsonAttr);
};
