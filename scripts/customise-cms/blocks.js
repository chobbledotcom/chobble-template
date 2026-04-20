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
import { BLOCK_CMS_FIELDS } from "#utils/block-schema.js";

/**
 * Convert a non-markdown schema field to a generic CMS field
 * @param {string} name - Field name
 * @param {object} fieldSchema - Field schema from JSON
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} CMS field configuration
 */
const buildGenericCmsField = (name, fieldSchema, useVisualEditor) => ({
  name,
  type: fieldSchema.type,
  label: fieldSchema.label || name,
  ...(fieldSchema.required && { required: true }),
  ...(fieldSchema.default !== undefined && { default: fieldSchema.default }),
  ...(fieldSchema.list && { list: true }),
  ...(fieldSchema.fields && {
    fields: Object.entries(fieldSchema.fields).map(([n, f]) =>
      schemaFieldToCmsField(n, f, useVisualEditor),
    ),
  }),
});

/**
 * Convert a page layout block schema field to a CMS field
 * @param {string} name - Field name
 * @param {object} fieldSchema - Field schema from JSON
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} CMS field configuration
 */
const schemaFieldToCmsField = (name, fieldSchema, useVisualEditor) => {
  if (fieldSchema.type === "markdown") {
    return createMarkdownField(
      name,
      fieldSchema.label || name,
      useVisualEditor,
      {
        ...(fieldSchema.required && { required: true }),
      },
    );
  }

  if (fieldSchema.type === "reference") {
    return createReferenceField(
      name,
      fieldSchema.label || name,
      fieldSchema.collection,
      fieldSchema.multiple !== false,
    );
  }

  return buildGenericCmsField(name, fieldSchema, useVisualEditor);
};

/**
 * Convert a block type slug to a human-readable label
 * @param {string} type - Block type slug (e.g., "section-header")
 * @returns {string} Human-readable label (e.g., "Section Header")
 */
const blockTypeToLabel = (type) =>
  type
    .split(/[-_]/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

/**
 * Convert a block type slug to a component name (e.g. "section-header" -> "block_section_header")
 * @param {string} type - Block type slug
 * @returns {string} Component name
 */
const blockTypeToComponentName = (type) => `block_${type.replace(/-/g, "_")}`;

/**
 * Build a CMS block component definition from BLOCK_CMS_FIELDS for one block type.
 * Each block is tagged with _componentName so it's extracted into the top-level
 * components map and replaced with a component reference downstream.
 * @param {string} type - Block type slug (must exist in BLOCK_CMS_FIELDS)
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} CMS block configuration
 */
const buildBlockComponent = (type, useVisualEditor) => ({
  name: type,
  label: blockTypeToLabel(type),
  type: "object",
  fields: Object.entries(BLOCK_CMS_FIELDS[type]).map(([name, fieldSchema]) =>
    schemaFieldToCmsField(name, fieldSchema, useVisualEditor),
  ),
  _componentName: blockTypeToComponentName(type),
});

/**
 * Generate CMS block field for the list of block types this page supports.
 * Block field definitions come from BLOCK_CMS_FIELDS in block-schema.js — the
 * single source of truth — so the same block type always resolves to the same
 * component no matter which page uses it.
 * @param {string[]} blockTypes - Block type slugs supported on this page
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} CMS blocks field configuration using type: block
 */
export const generateBlocksField = (blockTypes, useVisualEditor) => ({
  name: "blocks",
  label: "Content Blocks",
  type: "block",
  list: true,
  blockKey: "type",
  blocks: [...blockTypes]
    .sort()
    .map((type) => buildBlockComponent(type, useVisualEditor)),
});
