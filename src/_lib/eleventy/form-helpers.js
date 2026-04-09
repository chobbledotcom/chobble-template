/**
 * Eleventy filters for form-field processing.
 *
 * Exposes `addFieldTemplates` (from `#config/form-helpers.js`) as a Liquid
 * filter so blocks with inline field definitions (e.g. `custom-contact-form`)
 * can resolve each field's include template at render time.
 *
 * @module #eleventy/form-helpers
 */

import { addFieldTemplates } from "#config/form-helpers.js";
import { addDataFilter } from "#eleventy/add-data-filter.js";

/**
 * Register form-helper filters with Eleventy.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export const configureFormHelpers = (eleventyConfig) => {
  addDataFilter(eleventyConfig, "addFieldTemplates", addFieldTemplates);
};
