/**
 * Block schema conversion for CMS page layouts.
 *
 * Translates the shared `BLOCK_CMS_FIELDS` schema (the single source of truth
 * in `src/_lib/utils/block-schema.js`) into CMS block/field definitions. Each
 * block component is tagged with `_componentName` so the top-level pipeline
 * can hoist it into the components map and replace inline duplicates with
 * component references.
 */

import {
  createMarkdownField,
  createReferenceField,
} from "#scripts/customise-cms/fields.js";
import { slugToLabel } from "#scripts/customise-cms/generator-helpers.js";
import { BLOCK_CMS_FIELDS, isBlockAllowedIn } from "#utils/block-schema.js";

/** @typedef {import('./fields.js').CmsField} CmsField */

/**
 * One field's schema as declared in a block schema module.
 * @typedef {Object} BlockFieldSchema
 * @property {string} type
 * @property {string} [label]
 * @property {boolean} [required]
 * @property {*} [default]
 * @property {boolean} [list]
 * @property {Record<string, BlockFieldSchema>} [fields]
 * @property {{ collection: string, multiple?: boolean }} [options]
 */

/**
 * Convert a non-markdown schema field to a generic CMS field
 * @param {string} name - Field name
 * @param {BlockFieldSchema} fieldSchema - Field schema from JSON
 * @returns {CmsField} CMS field configuration
 */
const buildGenericCmsField = (name, fieldSchema) => ({
  name,
  type: fieldSchema.type,
  label: fieldSchema.label || name,
  ...(fieldSchema.required && { required: true }),
  ...(fieldSchema.default !== undefined && { default: fieldSchema.default }),
  ...(fieldSchema.list && { list: true }),
  ...(fieldSchema.fields && {
    fields: Object.entries(fieldSchema.fields).map(([n, f]) =>
      toCmsField(n, f),
    ),
  }),
});

/**
 * Convert a schema field (a block field, or a site.json field) to a CMS field
 * @param {string} name - Field name
 * @param {BlockFieldSchema} fieldSchema - Field schema from JSON
 * @returns {CmsField} CMS field configuration
 */
export const toCmsField = (name, fieldSchema) => {
  if (fieldSchema.type === "markdown") {
    return createMarkdownField(name, fieldSchema.label || name, {
      ...(fieldSchema.required && { required: true }),
    });
  }

  if (fieldSchema.type === "reference") {
    return {
      ...createReferenceField(
        name,
        fieldSchema.label || name,
        fieldSchema.options?.collection,
        fieldSchema.options?.multiple === true,
      ),
      ...(fieldSchema.required && { required: true }),
    };
  }

  return buildGenericCmsField(name, fieldSchema);
};

/**
 * Convert a block type slug to a component name (e.g. "section-header" -> "block_section_header")
 * @param {string} type - Block type slug
 * @returns {string} Component name
 */
export const componentNameFor = (type) => `block_${type.replace(/-/g, "_")}`;

/**
 * Build a CMS block component definition from BLOCK_CMS_FIELDS for one block type.
 * Each block is tagged with _componentName so it's extracted into the top-level
 * components map and replaced with a component reference downstream.
 * @param {string} type - Block type slug (must exist in BLOCK_CMS_FIELDS)
 * @returns {CmsField} CMS block configuration
 */
const buildBlockComponent = (type) => ({
  name: type,
  label: slugToLabel(type),
  type: "object",
  fields: Object.entries(BLOCK_CMS_FIELDS[type]).map(([name, fieldSchema]) =>
    toCmsField(name, fieldSchema),
  ),
  _componentName: componentNameFor(type),
});

/**
 * Generate CMS block field for the list of block types this page supports.
 * Block field definitions come from BLOCK_CMS_FIELDS in block-schema.js — the
 * single source of truth — so the same block type always resolves to the same
 * component no matter which page uses it.
 * @param {string[]} blockTypes - Block type slugs supported on this page
 * @returns {CmsField} CMS blocks field configuration using type: block
 */
export const generateBlocksField = (blockTypes) => ({
  name: "blocks",
  label: "Content Blocks",
  type: "block",
  list: true,
  blockKey: "type",
  blocks: [...blockTypes].sort().map((type) => buildBlockComponent(type)),
});

/**
 * Build the blocks field for one collection: every block type the block
 * schema allows in that collection. The single source for the
 * "allowed types → blocks field" idiom shared by pages, item collections,
 * and custom blocks collections.
 * @param {string} collectionName - Collection the blocks field belongs to
 * @returns {import('./fields.js').CmsField} Blocks field configuration
 */
export const blocksFieldFor = (collectionName) =>
  generateBlocksField(
    Object.keys(BLOCK_CMS_FIELDS).filter((type) =>
      isBlockAllowedIn(type, collectionName),
    ),
  );
