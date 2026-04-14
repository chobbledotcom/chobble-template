/**
 * Collection configuration assembly.
 *
 * Turns a collection name + `CmsConfig` into a complete `CollectionConfig`:
 *   1. `getCoreFields` dispatches to the right field builder.
 *   2. `addOptionalFields` appends feature-gated fields (permalinks, FAQs,
 *      galleries, specs, add-ons, tabs, blocks).
 *   3. `getValidatedViewConfig` filters the list-view config down to fields
 *      that actually exist on the collection.
 *   4. `generateCollectionConfig` wraps it all up with path/label/filename.
 */

import { generateBlocksField } from "#scripts/customise-cms/blocks.js";
import { getCollection } from "#scripts/customise-cms/collections.js";
import { getCollectionFieldBuilders } from "#scripts/customise-cms/field-builders.js";
import {
  COMMON_FIELDS,
  createAddOnsField,
  FAQS_FIELD,
  GALLERY_FIELD,
  SPECS_FIELD,
} from "#scripts/customise-cms/fields.js";
import {
  buildEventsFields,
  buildGuidePagesFields,
  buildLocationsFields,
  buildMenuCategoriesFields,
  buildMenuItemsFields,
  buildNewsFields,
  buildProductsFields,
  buildPropertiesFields,
  buildReviewsFields,
} from "#scripts/customise-cms/item-builders.js";
import { compact, filter, memberOf } from "#toolkit/fp/array.js";
import { BLOCK_CMS_FIELDS } from "#utils/block-schema.js";

/**
 * @typedef {import('./generator-helpers.js').CmsConfig} CmsConfig
 * @typedef {import('./generator-helpers.js').CmsField} CmsField
 * @typedef {import('./generator-helpers.js').FieldContext} FieldContext
 * @typedef {import('./generator-helpers.js').ViewConfig} ViewConfig
 * @typedef {import('./generator-helpers.js').CollectionConfig} CollectionConfig
 * @typedef {import('./collections.js').CollectionDefinition} CollectionDefinition
 */

/**
 * Dispatch to the appropriate field builder for a given collection name.
 * Returns an empty array for unknown collections (the caller appends optional
 * fields such as blocks/FAQs regardless).
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Core fields for the collection
 */
const getCoreFields = (collectionName, config, fields) => {
  const builders = getCollectionFieldBuilders(config, fields);
  const staticBuilder = builders[collectionName];
  if (staticBuilder) return staticBuilder();

  const dynamicBuilders = {
    news: buildNewsFields,
    products: buildProductsFields,
    reviews: buildReviewsFields,
    events: buildEventsFields,
    locations: buildLocationsFields,
    properties: buildPropertiesFields,
    "guide-pages": buildGuidePagesFields,
    "menu-categories": buildMenuCategoriesFields,
    "menu-items": buildMenuItemsFields,
  };

  const builder = dynamicBuilders[collectionName];
  return builder ? builder(config, fields) : [];
};

/**
 * Get collection-specific optional fields based on what the collection supports
 * @param {CollectionDefinition} collection - Collection definition
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {(false | CmsField)[]} Collection-specific optional fields
 */
const getCollectionSpecificFields = (collection, config, fieldContext) => [
  config.features.galleries && collection.supportsGallery && GALLERY_FIELD,
  config.features.specs && collection.supportsSpecs && SPECS_FIELD,
  config.features.add_ons &&
    collection.supportsAddOns &&
    createAddOnsField(config.features.use_visual_editor),
  collection.supportsTabs && fieldContext.tabs,
];

/**
 * Add optional fields based on configuration
 * @param {CmsField[]} coreFields - Existing fields
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {CmsField[]} Fields with optional fields added
 */
const addOptionalFields = (
  coreFields,
  collectionName,
  config,
  fieldContext,
) => {
  if (collectionName === "snippets") return coreFields;

  const collection = getCollection(collectionName);
  const alreadyHasBlocks = collectionName === "pages";
  return compact([
    ...coreFields,
    config.features.permalinks && COMMON_FIELDS.permalink,
    config.features.redirects && COMMON_FIELDS.redirect_from,
    config.features.faqs && FAQS_FIELD,
    ...getCollectionSpecificFields(collection, config, fieldContext),
    config.features.use_blocks &&
      !alreadyHasBlocks &&
      generateBlocksField(
        Object.keys(BLOCK_CMS_FIELDS),
        config.features.use_visual_editor,
      ),
  ]);
};

/**
 * Build all fields for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {CmsField[]} Complete field configuration for the collection
 */
const buildCollectionFields = (collectionName, config, fieldContext) => {
  const coreFields = getCoreFields(collectionName, config, fieldContext);
  return addOptionalFields(coreFields, collectionName, config, fieldContext);
};

/**
 * Filter a list of field names to only include those that are available
 * @param {string[]} requestedFields - Fields to filter
 * @param {string[]} availableFields - Fields that are actually available
 * @returns {string[]} Filtered list of available fields
 */
const filterToAvailable = (requestedFields, availableFields) =>
  filter(memberOf(availableFields))(requestedFields);

/**
 * Create a validated view config with only available fields
 * @param {ViewConfig} rawConfig - Raw view configuration
 * @param {string[]} availableFields - Fields that are actually available
 * @returns {ViewConfig} Validated view configuration
 */
const createValidatedViewConfig = (rawConfig, availableFields) => {
  const validFields = filterToAvailable(rawConfig.fields, availableFields);
  const validSort = filterToAvailable(rawConfig.sort, availableFields);

  // Use first valid field as primary if original primary is unavailable
  const validPrimary = availableFields.includes(rawConfig.primary)
    ? rawConfig.primary
    : validFields[0] || availableFields[0] || "title";

  return {
    fields: validFields.length > 0 ? validFields : ["title"],
    primary: validPrimary,
    sort: validSort.length > 0 ? validSort : [validPrimary],
  };
};

/**
 * Raw view configurations for collections (before validation)
 * @type {Record<string, ViewConfig>}
 */
const RAW_VIEW_CONFIGS = {
  pages: {
    fields: ["thumbnail", "permalink", "meta_title", "header_text"],
    primary: "meta_title",
    sort: ["meta_title"],
  },
  events: {
    fields: [
      "thumbnail",
      "title",
      "event_date",
      "recurring_date",
      "event_location",
    ],
    primary: "title",
    sort: ["title"],
  },
  locations: {
    fields: ["thumbnail", "title", "subtitle"],
    primary: "title",
    sort: ["title"],
  },
  properties: {
    fields: ["thumbnail", "title", "subtitle", "bedrooms", "sleeps"],
    primary: "title",
    sort: ["title"],
  },
};

/**
 * Get validated view configuration for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {ViewConfig | undefined} Validated view configuration or undefined
 */
const getValidatedViewConfig = (collectionName, config, fieldContext) => {
  const rawConfig = RAW_VIEW_CONFIGS[collectionName];
  if (!rawConfig) return undefined;

  const collectionFields = buildCollectionFields(
    collectionName,
    config,
    fieldContext,
  );
  const availableFieldNames = collectionFields.map((f) => f.name);

  return createValidatedViewConfig(rawConfig, availableFieldNames);
};

/**
 * Collections that use the default date-based filename pattern
 * @type {string[]}
 */
const DATE_FILENAME_COLLECTIONS = ["news"];

/**
 * Check if a collection uses filename-based primary key (all except date-based ones)
 * @param {string} name - Collection name
 * @returns {boolean}
 */
const hasFilenameConfig = (name) => !memberOf(DATE_FILENAME_COLLECTIONS)(name);

/**
 * Generate configuration for a single collection
 * @param {string} collectionName - Name of the collection (must exist in COLLECTIONS)
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {CollectionConfig} Collection configuration
 */
export const generateCollectionConfig = (
  collectionName,
  config,
  fieldContext,
) => {
  const collection = getCollection(collectionName, config.hasSrcFolder);

  const collectionConfig = {
    name: collectionName,
    label: collection.label,
    path: collection.path,
    type: "collection",
    subfolders: collectionName === "locations",
  };

  if (hasFilenameConfig(collectionName)) {
    collectionConfig.filename = "{primary}.md";
  }

  const viewConfig = getValidatedViewConfig(
    collectionName,
    config,
    fieldContext,
  );
  if (viewConfig) {
    collectionConfig.view = viewConfig;
  }

  collectionConfig.fields = buildCollectionFields(
    collectionName,
    config,
    fieldContext,
  );

  return collectionConfig;
};
