/**
 * Shared helpers and types for the CMS config generator.
 *
 * Collects the reusable pieces that stitch collection field lists together:
 * the `FieldContext` (body/tabs fields precomputed from the visual-editor
 * setting), the common meta fields, and the composition helpers (`withEnabled`,
 * `buildItem`, `withHeaderFields`) used by each per-collection field builder.
 */

import {
  COMMON_FIELDS,
  createTabsField,
  getBodyField,
} from "#scripts/customise-cms/fields.js";
import { compact, memberOf, pipe } from "#toolkit/fp/array.js";

/**
 * @typedef {import('./config.js').CmsConfig} CmsConfig
 * @typedef {import('./fields.js').CmsField} CmsField
 * @typedef {import('./collections.js').CollectionDefinition} CollectionDefinition
 */

/**
 * @typedef {Object} ViewConfig
 * @property {string[]} fields - Fields to display in list view
 * @property {string} primary - Primary display field
 * @property {string[]} sort - Fields to sort by
 */

/**
 * @typedef {Object} CollectionConfig
 * @property {string} name - Collection name
 * @property {string} label - Display label
 * @property {string} path - Content path
 * @property {string} type - Config type ("collection" | "file")
 * @property {boolean} [subfolders] - Enable subfolders
 * @property {string} [filename] - Filename template
 * @property {ViewConfig} [view] - View configuration
 * @property {CmsField[]} fields - Field configurations
 */

/**
 * @typedef {Object} PagesConfig
 * @property {Object} media - Media configuration
 * @property {Object} settings - Settings configuration
 * @property {CollectionConfig[]} content - Content configurations
 */

/**
 * @typedef {Object} FieldContext
 * @property {CmsField} body - Body field (code or rich-text based on config)
 * @property {CmsField} tabs - Tabs field with appropriate body type
 * @property {(label: string) => CmsField} bodyWithLabel - Create body field with custom label
 */

/**
 * Common meta fields added to most collections
 * @type {CmsField[]}
 */
export const META_FIELDS = [
  COMMON_FIELDS.meta_title,
  COMMON_FIELDS.meta_description,
];

/**
 * Create precomputed fields based on visual editor setting
 * @param {boolean} useVisualEditor - Whether to use rich-text editor
 * @returns {FieldContext} Precomputed field context
 */
export const createFieldContext = (useVisualEditor) => {
  const body = getBodyField(useVisualEditor);
  return {
    body,
    tabs: createTabsField(useVisualEditor),
    bodyWithLabel: (label) => ({ ...body, label }),
  };
};

/**
 * Get optional header fields based on config
 * @param {CmsConfig} config - CMS configuration
 * @returns {(false | CmsField)[]} Header fields or false values to be compacted
 */
export const getHeaderFields = (config) => [
  config.features.header_images && COMMON_FIELDS.header_image,
  config.features.header_images && COMMON_FIELDS.header_text,
];

/**
 * Get common trailing content fields (subtitle, body, header_text, meta)
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {(false | CmsField)[]} Content fields with optional header_text
 */
export const getContentFields = (config, fields) => [
  COMMON_FIELDS.subtitle,
  fields.body,
  config.features.header_images && COMMON_FIELDS.header_text,
  ...META_FIELDS,
];

/**
 * Top of every item: title, subtitle, thumbnail, order
 * @returns {CmsField[]}
 */
export const getItemTop = () => [
  COMMON_FIELDS.title,
  COMMON_FIELDS.subtitle,
  COMMON_FIELDS.thumbnail,
  COMMON_FIELDS.order,
];

/**
 * Bottom of every item: body, header_image, header_text (if enabled), meta
 * @param {CmsConfig} config
 * @param {FieldContext} fields - Precomputed fields
 * @returns {(false | CmsField)[]}
 */
export const getItemBottom = (config, fields) => [
  fields.body,
  config.features.header_images && COMMON_FIELDS.header_image,
  config.features.header_images && COMMON_FIELDS.header_text,
  ...META_FIELDS,
];

/**
 * Build fields with an "enabled" helper that checks if a collection is enabled
 * @param {(enabled: (name: string) => boolean) => (false | CmsField)[]} buildFn
 * @returns {(config: CmsConfig) => CmsField[]}
 */
export const withEnabled = (buildFn) => (config) =>
  pipe(memberOf, buildFn, compact)(config.collections);

/**
 * Build fields for an item (top, [middle], bottom)
 * @param {(enabled: (name: string) => boolean) => (false | CmsField)[]} middle
 * @returns {(config: CmsConfig, fields: FieldContext) => CmsField[]}
 */
export const buildItem = (middle) => (config, fields) =>
  withEnabled((enabled) => [
    ...getItemTop(),
    ...middle(enabled),
    ...getItemBottom(config, fields),
  ])(config);

/**
 * Helper function to conditionally include header image/text
 * @param {CmsConfig} config - CMS configuration
 * @param {...(CmsField | CmsField[])} fields - Fields to include if header_images enabled
 * @returns {CmsField[]} Fields if header_images is enabled, empty array otherwise
 */
export const withHeaderFields = (config, ...fields) =>
  config.features.header_images
    ? [...fields.flatMap((f) => (Array.isArray(f) ? f : [f]))]
    : [];

/**
 * Helper to get data path based on whether src folder exists
 * @param {boolean} hasSrcFolder - Whether template has src/ folder
 * @returns {string} Data path
 */
export const getDataPath = (hasSrcFolder) =>
  hasSrcFolder ? "src/_data" : "_data";
