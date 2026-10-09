/**
 * Shared helpers and types for the CMS config generator.
 *
 * Collects the reusable pieces that stitch collection field lists together:
 * the common meta fields, the feature-gated optional fields, and the
 * `withEnabled` composition helper.
 */

import {
  COMMON_FIELDS,
  FAQS_FIELD,
  GALLERY_FIELD,
} from "#scripts/customise-cms/fields.js";
import { compact, memberOf, pipe } from "#utils/fp/array.js";

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
 * Common meta fields added to most collections
 * @type {CmsField[]}
 */
export const META_FIELDS = [
  COMMON_FIELDS.meta_title,
  COMMON_FIELDS.meta_description,
];

/**
 * Get common trailing content fields for block-only collections.
 * @returns {CmsField[]} Content fields
 */
export const getContentFields = () => [COMMON_FIELDS.subtitle, ...META_FIELDS];

/**
 * Build fields with an "enabled" helper that checks if a collection is enabled
 * @param {(enabled: (name: string) => boolean) => (false | CmsField)[]} buildFn
 * @returns {(config: CmsConfig) => CmsField[]}
 */
export const withEnabled = (buildFn) => (config) =>
  pipe(memberOf, buildFn, compact)(config.collections);

/**
 * Convert a slug to a human-readable label (e.g., "my-thing" → "My Thing")
 * @param {string} slug
 * @returns {string}
 */
export const slugToLabel = (slug) =>
  slug
    .split(/[-_]/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

/**
 * Helper to get data path based on whether src folder exists
 * @param {boolean} hasSrcFolder - Whether template has src/ folder
 * @returns {string} Data path
 */
export const getDataPath = (hasSrcFolder) =>
  hasSrcFolder ? "src/_data" : "_data";

/**
 * Optional fields gated by feature flags, in their canonical order.
 * Shared by the standard collections and custom blocks collections so
 * both emit the same fields for the same feature set.
 * @param {import('./config.js').CmsFeatures} features - Enabled features
 * @returns {(false | import('./fields.js').CmsField)[]} Fields with false for disabled features
 */
export const getFeatureFields = (features) => [
  features.permalinks && COMMON_FIELDS.permalink,
  features.redirects && COMMON_FIELDS.redirect_from,
  features.faqs && FAQS_FIELD,
  features.galleries && GALLERY_FIELD,
];
