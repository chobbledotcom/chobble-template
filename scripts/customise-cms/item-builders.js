/**
 * Field builders for item-style collections.
 *
 * "Item" collections share the standard layout (title/subtitle/thumbnail/order
 * on top, body/header/meta on bottom) wrapped around a collection-specific
 * middle section — see `buildItem` in `generator-helpers.js`. News and
 * guide-pages use `withEnabled`/`compact` directly instead because their field
 * order diverges from the standard item layout.
 */

import {
  COMMON_FIELDS,
  createReferenceField,
} from "#scripts/customise-cms/fields.js";
import {
  getContentFields,
  withEnabled,
} from "#scripts/customise-cms/generator-helpers.js";
import { compact } from "#utils/fp/array.js";

/**
 * @typedef {import('./generator-helpers.js').CmsConfig} CmsConfig
 * @typedef {import('./generator-helpers.js').CmsField} CmsField
 */

/**
 * Build fields for the news collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} News collection fields
 */
export const buildNewsFields = (config) =>
  compact([
    COMMON_FIELDS.name,
    { name: "date", label: "Date", type: "date" },
    { name: "author", type: "string", label: "Author" },
    ...getContentFields(),
    config.features.no_index && COMMON_FIELDS.no_index,
  ]);

/**
 * Build fields for the guide-pages collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Guide pages collection fields
 */
export const buildGuidePagesFields = (config) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.name,
    COMMON_FIELDS.subtitle,
    enabled("guide-categories") &&
      createReferenceField(
        "guide-category",
        "Guide Category",
        "guide-categories",
        false,
      ),
    COMMON_FIELDS.order,
  ])(config);
