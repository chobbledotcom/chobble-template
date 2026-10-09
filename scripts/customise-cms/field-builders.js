/**
 * Field builders for non-item collections.
 *
 * These collections don't follow the standard "item" layout (title, subtitle,
 * thumbnail, body, meta). Instead each one has a bespoke field list — e.g.
 * `pages` carries layout and navigation fields, `snippets` is just name +
 * body.
 */

import { blocksFieldFor } from "#scripts/customise-cms/blocks.js";
import {
  COMMON_FIELDS,
  createEleventyNavigationField,
  createMarkdownField,
} from "#scripts/customise-cms/fields.js";
import { compact } from "#utils/fp/array.js";

/**
 * @typedef {import('./generator-helpers.js').CmsConfig} CmsConfig
 * @typedef {import('./generator-helpers.js').CmsField} CmsField
 */

/**
 * Field builders for each collection type
 * @param {CmsConfig} config - CMS configuration
 * @returns {Record<string, () => CmsField[]>} Map of collection names to field builder functions
 */
export const getCollectionFieldBuilders = (config) => ({
  pages: () =>
    compact([
      COMMON_FIELDS.name,
      COMMON_FIELDS.subtitle,
      COMMON_FIELDS.meta_title,
      COMMON_FIELDS.meta_description,
      createEleventyNavigationField(config.features.external_navigation_urls),
      { name: "layout", type: "string" },
      config.features.no_index && COMMON_FIELDS.no_index,
      blocksFieldFor("pages"),
    ]),

  "guide-categories": () =>
    compact([
      COMMON_FIELDS.name,
      COMMON_FIELDS.subtitle,
      COMMON_FIELDS.order,
      { name: "icon", type: "image", label: "Icon" },
    ]),

  snippets: () => [COMMON_FIELDS.name, createMarkdownField("body", "Body")],
});
