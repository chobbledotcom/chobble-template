/**
 * Collection configuration assembly.
 *
 * Turns a collection name + `CmsConfig` into a complete `CollectionConfig`:
 *   1. `getCoreFields` dispatches to the right field builder.
 *   2. `addOptionalFields` appends feature-gated fields (permalinks, FAQs,
 *      galleries, add-ons, blocks).
 *   3. `getValidatedViewConfig` filters the list-view config down to fields
 *      that actually exist on the collection.
 *   4. `generateCollectionConfig` wraps it all up with path/label/filename.
 */

import { blocksFieldFor } from "#scripts/customise-cms/blocks.js";
import { getCollection } from "#scripts/customise-cms/collections.js";
import { getCollectionFieldBuilders } from "#scripts/customise-cms/field-builders.js";
import { getFeatureFields } from "#scripts/customise-cms/generator-helpers.js";
import {
  buildGuidePagesFields,
  buildNewsFields,
} from "#scripts/customise-cms/item-builders.js";
import { compact, memberOf, notMemberOf, unique } from "#utils/fp/array.js";

/**
 * @typedef {import('./generator-helpers.js').CmsConfig} CmsConfig
 * @typedef {import('./generator-helpers.js').CmsField} CmsField
 * @typedef {import('./generator-helpers.js').ViewConfig} ViewConfig
 * @typedef {import('./generator-helpers.js').CollectionConfig} CollectionConfig
 * @typedef {import('./collections.js').CollectionDefinition} CollectionDefinition
 */

/**
 * Dispatch to the appropriate field builder for a given collection name.
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Core fields for the collection
 */
export const getCoreFields = (collectionName, config) => {
  const builders = getCollectionFieldBuilders(config);
  const staticBuilder = builders[collectionName];
  if (staticBuilder) return staticBuilder();

  const builder = DYNAMIC_BUILDERS[collectionName];
  if (!builder) {
    throw new Error(`No field builder for collection "${collectionName}"`);
  }
  return builder(config);
};

/**
 * Field builders for collections whose fields vary with the config.
 * @type {Record<string, (config: CmsConfig) => CmsField[]>}
 */
const DYNAMIC_BUILDERS = {
  news: buildNewsFields,
  "guide-pages": buildGuidePagesFields,
};

/**
 * Add optional fields based on configuration
 * @param {CmsField[]} coreFields - Existing fields
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Fields with optional fields added
 */
const addOptionalFields = (coreFields, collectionName, config) => {
  if (collectionName === "snippets") return coreFields;

  const alreadyHasBlocks = collectionName === "pages";
  return compact([
    ...coreFields,
    ...getFeatureFields(config.features),
    !alreadyHasBlocks && blocksFieldFor(collectionName),
  ]);
};

/**
 * Build all fields for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Complete field configuration for the collection
 */
const buildCollectionFields = (collectionName, config) => {
  const coreFields = getCoreFields(collectionName, config);
  return addOptionalFields(coreFields, collectionName, config);
};

/**
 * View configurations for collections. Feature-gated fields (e.g. permalink)
 * are dropped from the view when their feature is off; a view whose primary
 * or sort field is missing, or whose field list filters down to nothing, is
 * a configuration bug and fails the generator loudly.
 * @type {Record<string, ViewConfig>}
 */
const VIEW_CONFIGS = {
  pages: {
    fields: ["permalink", "meta_title"],
    primary: "meta_title",
    sort: ["meta_title"],
  },
  news: {
    fields: ["name", "date"],
    primary: "name",
    sort: ["date"],
  },
};

/**
 * Build the view config for a collection from its declared view, dropping
 * feature-gated fields the collection currently lacks.
 * @param {string} collectionName - Name of the collection
 * @param {ViewConfig} viewConfig - Declared view configuration
 * @param {string[]} availableFields - Field names present on the collection
 * @returns {ViewConfig} View config restricted to available fields
 * @throws {Error} If the primary or a sort field is missing, or no fields remain
 */
export const buildViewConfig = (
  collectionName,
  viewConfig,
  availableFields,
) => {
  const missingRequired = [viewConfig.primary, ...viewConfig.sort].filter(
    notMemberOf(availableFields),
  );
  if (missingRequired.length > 0) {
    throw new Error(
      `View config for "${collectionName}" references missing fields: ${unique(missingRequired).join(", ")}`,
    );
  }

  const fields = viewConfig.fields.filter(memberOf(availableFields));
  if (fields.length === 0) {
    throw new Error(
      `View config for "${collectionName}" has no available fields`,
    );
  }

  return { ...viewConfig, fields };
};

/**
 * Get validated view configuration for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {ViewConfig | undefined} Validated view configuration or undefined
 */
const getValidatedViewConfig = (collectionName, config) => {
  const viewConfig = VIEW_CONFIGS[collectionName];
  if (!viewConfig) return undefined;

  const collectionFields = buildCollectionFields(collectionName, config);
  const availableFieldNames = compact(
    collectionFields.map((field) => field.name),
  );

  return buildViewConfig(collectionName, viewConfig, availableFieldNames);
};

/**
 * Collections that use the default date-based filename pattern
 * @type {string[]}
 */
const DATE_FILENAME_COLLECTIONS = ["news"];

/**
 * Generate configuration for a single collection
 * @param {string} collectionName - Name of the collection (must exist in COLLECTIONS)
 * @param {CmsConfig} config - CMS configuration
 * @returns {CollectionConfig} Collection configuration
 */
export const generateCollectionConfig = (collectionName, config) => {
  const collection = getCollection(collectionName, config.hasSrcFolder);
  if (!collection) {
    throw new Error(`Unknown collection "${collectionName}" in cms_config`);
  }

  const viewConfig = getValidatedViewConfig(collectionName, config);

  return {
    name: collectionName,
    label: collection.label,
    path: collection.path,
    type: "collection",
    // A translated site keeps each language in a folder (src/pages/es/), so
    // editors browse into folders and add pages there; see directory-data.js
    // for the folder-derived URL a new page gets.
    subfolders: true,
    filename: memberOf(DATE_FILENAME_COLLECTIONS)(collectionName)
      ? "{year}-{month}-{day}-{name}.md"
      : "{name}.md",
    ...(collectionName === "snippets" && { exclude: ["README.md"] }),
    ...(viewConfig && { view: viewConfig }),
    fields: buildCollectionFields(collectionName, config),
  };
};
