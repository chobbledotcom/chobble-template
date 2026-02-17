/**
 * HTML-safe JSON serialization for filter data attributes.
 *
 * Converts filter_data objects to JSON and escapes HTML entities
 * so they can be safely embedded in data-* attributes.
 */

import { escapeAttrValue } from "#utils/dom-builder.js";

/**
 * Register the toFilterJsonAttr filter with Eleventy.
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig - Eleventy config
 */
export const configureItemFilterData = (eleventyConfig) => {
  /**
   * Serialize value to JSON and escape HTML entities for safe attribute embedding.
   * @param {unknown} value - Value to serialize
   * @returns {string} HTML-safe JSON string
   */
  const toAttributeJson = (value) => escapeAttrValue(JSON.stringify(value));

  eleventyConfig.addFilter("toFilterJsonAttr", toAttributeJson);
};
