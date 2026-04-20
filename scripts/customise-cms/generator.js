/**
 * YAML generator for .pages.yml
 *
 * Orchestrator module: composes a complete `.pages.yml` from per-module
 * builders (collection fields, static file configs, custom blocks pages) and
 * serialises the result with component references hoisted.
 *
 * Section modules:
 *   - generator-helpers.js — shared types + FieldContext + composition helpers
 *   - blocks.js             — block-schema → CMS field conversion
 *   - field-builders.js     — non-item collections (pages, categories, …)
 *   - item-builders.js      — item collections (news, products, events, …)
 *   - collection-config.js  — dispatcher, view config, generateCollectionConfig
 *   - static-configs.js     — singleton file configs (site, meta, alt-tags)
 *   - components.js         — hoist `_componentName` markers to components map
 */

import YAML from "yaml";
import { generateBlocksField } from "#scripts/customise-cms/blocks.js";
import { generateCollectionConfig } from "#scripts/customise-cms/collection-config.js";
import { getCollection } from "#scripts/customise-cms/collections.js";
import {
  applyComponentRefs,
  collectComponents,
} from "#scripts/customise-cms/components.js";
import {
  COMMON_FIELDS,
  createEleventyNavigationField,
  FAQS_FIELD,
  GALLERY_FIELD,
} from "#scripts/customise-cms/fields.js";
import {
  createFieldContext,
  getDataPath,
  META_FIELDS,
} from "#scripts/customise-cms/generator-helpers.js";
import {
  getAltTagsConfig,
  getHomepageConfig,
  getMetaConfig,
  getSiteConfig,
} from "#scripts/customise-cms/static-configs.js";
import { compact, filterMap } from "#toolkit/fp/array.js";
import { BLOCK_CMS_FIELDS, isBlockAllowedIn } from "#utils/block-schema.js";

/**
 * @typedef {import('./generator-helpers.js').CmsConfig} CmsConfig
 * @typedef {import('./generator-helpers.js').CmsField} CmsField
 * @typedef {import('./generator-helpers.js').FieldContext} FieldContext
 * @typedef {import('./generator-helpers.js').CollectionConfig} CollectionConfig
 */

/**
 * Convert a slug to a human-readable label (e.g., "guide-pages" -> "Guide Pages")
 * @param {string} slug - The slug to convert
 * @returns {string} Human-readable label
 */
const slugToLabel = (slug) =>
  slug
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

/**
 * Get optional fields for a custom blocks collection based on enabled features
 * @param {CmsConfig} config - CMS configuration
 * @returns {(false | CmsField)[]} Optional fields (with false for disabled features)
 */
const getCustomBlocksOptionalFields = (config) => [
  config.features.permalinks && COMMON_FIELDS.permalink,
  config.features.redirects && COMMON_FIELDS.redirect_from,
  config.features.faqs && FAQS_FIELD,
  config.features.galleries && GALLERY_FIELD,
  config.features.header_images && COMMON_FIELDS.header_image,
  config.features.header_images && COMMON_FIELDS.header_text,
];

/**
 * Generate configuration for a custom blocks collection.
 * Custom blocks collections are page-like collections that use the blocks layout.
 * @param {string} name - Collection name slug (e.g., "clients")
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {CollectionConfig} Collection configuration
 */
const generateCustomBlocksCollectionConfig = (name, config, fieldContext) => {
  const hasSrcFolder = config.hasSrcFolder ?? true;
  const path = hasSrcFolder ? `src/${name}` : name;

  return {
    name,
    label: slugToLabel(name),
    path,
    type: "collection",
    filename: "{primary}.md",
    fields: compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.subtitle,
      COMMON_FIELDS.thumbnail,
      COMMON_FIELDS.order,
      fieldContext.body,
      ...META_FIELDS,
      createEleventyNavigationField(config.features.external_navigation_urls),
      ...getCustomBlocksOptionalFields(config),
      generateBlocksField(
        Object.keys(BLOCK_CMS_FIELDS).filter((type) =>
          isBlockAllowedIn(type, name),
        ),
        config.features.use_visual_editor,
      ),
    ]),
  };
};

/**
 * Generate complete .pages.yml configuration
 * @param {CmsConfig} config - CMS configuration
 * @returns {string} YAML string for .pages.yml
 */
export const generatePagesYaml = (config) => {
  // Create field context once - precomputes body and tabs fields based on visual editor setting
  const fieldContext = createFieldContext(config.features.use_visual_editor);

  const collectionConfigs = filterMap(
    (name) => getCollection(name),
    (name) => generateCollectionConfig(name, config, fieldContext),
  )(config.collections);

  const customBlocksConfigs = (config.customBlocksCollections || []).map(
    (name) => generateCustomBlocksCollectionConfig(name, config, fieldContext),
  );

  const hasSrcFolder = config.hasSrcFolder ?? true;
  const customHomePage = config.customHomePage ?? false;
  const dataPath = getDataPath(hasSrcFolder);
  const imagesPath = hasSrcFolder ? "src/images" : "images";

  // Build content array, conditionally including homepage
  const contentArray = [
    ...collectionConfigs,
    ...customBlocksConfigs,
    ...(customHomePage ? [] : [getHomepageConfig(dataPath)]),
    getSiteConfig(dataPath),
    getMetaConfig(dataPath),
    getAltTagsConfig(dataPath),
  ];

  // Extract components from fields and replace with references
  const components = collectComponents(contentArray);
  const contentWithRefs = applyComponentRefs(contentArray);

  const pagesConfig = {
    media: {
      input: imagesPath,
      output: "/images",
      path: imagesPath,
      categories: ["image"],
      rename: true,
    },
    settings: {
      hide: true,
      content: {
        merge: true,
      },
    },
    ...(Object.keys(components).length > 0 && { components }),
    content: contentWithRefs,
  };

  return YAML.stringify(pagesConfig, {
    indent: 2,
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });
};
