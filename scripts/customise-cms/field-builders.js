/**
 * Field builders for non-item collections.
 *
 * These collections don't follow the standard "item" layout (title, subtitle,
 * thumbnail, body, meta). Instead each one has a bespoke field list — e.g.
 * `pages` carries layout and navigation fields, `team` has a role and profile
 * image, `snippets` is just name + body.
 *
 * The reusable `categoriesRef` and `productsRefList` helpers are also exported
 * here for use by the item-based builders in `item-builders.js`.
 */

import { generateBlocksField } from "#scripts/customise-cms/blocks.js";
import {
  COMMON_FIELDS,
  createEleventyNavigationField,
  createMarkdownField,
  createObjectListField,
  createReferenceField,
  KEYWORDS_FIELD,
  VIDEOS_FIELD,
} from "#scripts/customise-cms/fields.js";
import {
  getHeaderFields,
  getItemBottom,
  getItemTop,
  META_FIELDS,
  withHeaderFields,
} from "#scripts/customise-cms/generator-helpers.js";
import { compact, memberOf } from "#toolkit/fp/array.js";
import { BLOCK_CMS_FIELDS, isBlockAllowedIn } from "#utils/block-schema.js";

/**
 * @typedef {import('./generator-helpers.js').CmsConfig} CmsConfig
 * @typedef {import('./generator-helpers.js').CmsField} CmsField
 * @typedef {import('./generator-helpers.js').FieldContext} FieldContext
 */

/**
 * Create a categories reference field predicate
 * @param {(name: string) => boolean} enabled - Collection enablement checker
 * @returns {false | CmsField} Categories reference field or false
 */
export const categoriesRef = (enabled) =>
  enabled("categories") &&
  createReferenceField("categories", "Categories", "categories");

/**
 * Create a products object list field with nested reference
 * @param {(name: string) => boolean} enabled - Collection enablement checker
 * @returns {false | CmsField} Products object list field or false
 */
export const productsRefList = (enabled) =>
  enabled("products") && {
    ...createObjectListField("products", "Products", [
      createReferenceField("product", "Product", "products", false),
    ]),
    _componentName: "products_list",
  };

/**
 * Field builders for each collection type - functions that accept config and fields
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {Record<string, () => CmsField[]>} Map of collection names to field builder functions
 */
export const getCollectionFieldBuilders = (config, fields) => ({
  pages: () =>
    compact([
      ...withHeaderFields(
        config,
        COMMON_FIELDS.header_image,
        COMMON_FIELDS.header_text,
      ),
      COMMON_FIELDS.subtitle,
      fields.body,
      COMMON_FIELDS.meta_title,
      COMMON_FIELDS.meta_description,
      createEleventyNavigationField(config.features.external_navigation_urls),
      { name: "layout", type: "string" },
      config.features.no_index && COMMON_FIELDS.no_index,
      config.features.videos && VIDEOS_FIELD,
      generateBlocksField(
        Object.keys(BLOCK_CMS_FIELDS).filter((type) =>
          isBlockAllowedIn(type, "pages"),
        ),
        config.features.use_visual_editor,
      ),
    ]),

  categories: () => {
    const enabled = memberOf(config.collections);
    return compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.thumbnail,
      config.features.parent_categories &&
        createReferenceField("parent", "Parent Category", "categories", false),
      productsRefList(enabled),
      fields.body,
      config.features.below_products &&
        createMarkdownField(
          "below_products",
          "Below Products Description",
          config.features.use_visual_editor,
        ),
      COMMON_FIELDS.featured,
      config.features.keywords && KEYWORDS_FIELD,
      ...getHeaderFields(config),
      ...META_FIELDS,
      COMMON_FIELDS.subtitle,
    ]);
  },

  team: () =>
    compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.thumbnail,
      COMMON_FIELDS.order,
      { name: "snippet", type: "string", label: "Role" },
      { name: "image", type: "image", label: "Profile Image" },
      config.features.header_images && COMMON_FIELDS.header_image,
      fields.bodyWithLabel("Biography"),
    ]),

  "guide-categories": () =>
    compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.subtitle,
      COMMON_FIELDS.order,
      { name: "icon", type: "image", label: "Icon" },
      memberOf(config.collections)("properties") &&
        createReferenceField("property", "Property", "properties", false),
      fields.body,
    ]),

  snippets: () => [COMMON_FIELDS.name, fields.body],

  menus: () => compact([...getItemTop(), ...getItemBottom(config, fields)]),
});
