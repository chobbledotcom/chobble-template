/**
 * YAML generator for .pages.yml
 *
 * Orchestrator module: composes a complete `.pages.yml` from per-module
 * builders (collection fields, static file configs, custom blocks pages) and
 * serialises the result with component references hoisted.
 *
 * Section modules:
 *   - generator-helpers.js — shared types + composition helpers
 *   - blocks.js             — block-schema → CMS field conversion
 *   - field-builders.js     — non-item collections (pages, categories, …)
 *   - item-builders.js      — item collections (news, products, events, …)
 *   - collection-config.js  — dispatcher, view config, generateCollectionConfig
 *   - static-configs.js     — singleton file configs (site, meta, alt-tags)
 *   - components.js         — hoist `_componentName` markers to components map
 */

import YAML from "yaml";
import { blocksFieldFor } from "#scripts/customise-cms/blocks.js";
import { generateCollectionConfig } from "#scripts/customise-cms/collection-config.js";
import {
  applyComponentRefs,
  collectComponents,
} from "#scripts/customise-cms/components.js";
import {
  COMMON_FIELDS,
  createEleventyNavigationField,
} from "#scripts/customise-cms/fields.js";
import {
  getDataPath,
  getFeatureFields,
  META_FIELDS,
  slugToLabel,
} from "#scripts/customise-cms/generator-helpers.js";
import {
  getAltTagsConfig,
  getMetaConfig,
  getSiteConfig,
} from "#scripts/customise-cms/static-configs.js";
import { compact } from "#utils/fp/array.js";

/**
 * @typedef {import('./generator-helpers.js').CmsConfig} CmsConfig
 * @typedef {import('./generator-helpers.js').CmsField} CmsField
 * @typedef {import('./generator-helpers.js').CollectionConfig} CollectionConfig
 */

/**
 * Generate configuration for a custom blocks collection.
 * Custom blocks collections are page-like collections that use the blocks layout.
 * @param {string} name - Collection name slug (e.g., "clients")
 * @param {CmsConfig} config - CMS configuration
 * @returns {CollectionConfig} Collection configuration
 */
const customCollectionConfig = (name, config) => {
  const path = config.hasSrcFolder ? `src/${name}` : name;

  return {
    name,
    label: slugToLabel(name),
    path,
    type: "collection",
    filename: "{name}.md",
    fields: compact([
      COMMON_FIELDS.name,
      COMMON_FIELDS.subtitle,
      COMMON_FIELDS.thumbnail,
      COMMON_FIELDS.order,
      ...META_FIELDS,
      createEleventyNavigationField(config.features.external_navigation_urls),
      ...getFeatureFields(config.features),
      blocksFieldFor(name),
    ]),
  };
};

/**
 * Build the full content entry list: collection configs, custom blocks
 * collections, and the site/meta/alt-tags data entries.
 * @param {CmsConfig} config
 * @returns {CollectionConfig[]}
 */
const buildContentArray = (config) => {
  // generateCollectionConfig itself rejects unknown collection names
  const collectionConfigs = config.collections.map((name) =>
    generateCollectionConfig(name, config),
  );

  const customBlocksConfigs = config.customBlocksCollections.map((name) =>
    customCollectionConfig(name, config),
  );

  const dataPath = getDataPath(config.hasSrcFolder);
  return [
    ...collectionConfigs,
    ...customBlocksConfigs,
    getSiteConfig(dataPath),
    getMetaConfig(dataPath),
    getAltTagsConfig(dataPath),
  ];
};

/**
 * The static media and settings sections of .pages.yml.
 * @param {string} imagesPath
 */
const mediaAndSettings = (imagesPath) => ({
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
});

/**
 * Generate complete .pages.yml configuration
 * @param {CmsConfig} config - CMS configuration
 * @returns {string} YAML string for .pages.yml
 */
export const generatePagesYaml = (config) => {
  const contentArray = buildContentArray(config);
  const imagesPath = config.hasSrcFolder ? "src/images" : "images";

  // Extract components from fields and replace with references
  const components = collectComponents(contentArray);
  const contentWithRefs = applyComponentRefs(contentArray);

  const pagesConfig = {
    ...mediaAndSettings(imagesPath),
    ...(Object.keys(components).length > 0 && { components }),
    content: contentWithRefs,
  };

  return YAML.stringify(pagesConfig, {
    indent: 2,
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });
};
