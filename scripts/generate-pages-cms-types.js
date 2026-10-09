/**
 * Generate PagesCMS type definitions from .pages.yml schema
 *
 * This script parses .pages.yml and generates src/_lib/types/pages-cms-generated.d.ts
 * with TypeScript interfaces for all PagesCMS-validated data types.
 *
 * Fields marked as `required: true` in .pages.yml become non-optional
 * properties. This allows JSDoc annotations to leverage PagesCMS schema
 * validation.
 *
 * Run: npm run generate-cms-types
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { ROOT_DIR } from "#lib/paths.js";
import { runIfMain } from "#scripts/lib/is-main-module.js";

const PAGES_YML = join(ROOT_DIR, ".pages.yml");

// Freshness tests set PAGES_CMS_TYPES_OUTPUT_PATH to compare regenerated
// output without overwriting the committed file while tsc may be reading it.
const OUTPUT_FILE = process.env.PAGES_CMS_TYPES_OUTPUT_PATH
  ? process.env.PAGES_CMS_TYPES_OUTPUT_PATH
  : join(ROOT_DIR, "src/_lib/types/pages-cms-generated.d.ts");

/**
 * A field as parsed from .pages.yml.
 * @typedef {Object} YmlField
 * @property {string} name
 * @property {string} [type]
 * @property {string} [label]
 * @property {boolean} [required]
 * @property {boolean} [list]
 * @property {YmlField[]} [fields]
 * @property {string} [component]
 */

/** @typedef {{ interfaces: string[], generatedNames: Set<string> }} TypeOutput */

/** @returns {TypeOutput} */
const newTypeOutput = () => ({ interfaces: [], generatedNames: new Set() });

/** @type {Record<string, string>} */
const SCALAR_TYPE_MAP = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "string", // Dates come as ISO strings
  object: "Record<string, unknown>", // An object with no declared fields
  image: "string",
  code: "string",
  "rich-text": "string", // Rich text is a markdown/HTML string
  reference: "string", // References store paths as strings
};

/**
 * Map a PagesCMS field type to a TypeScript type. Object types with
 * declared fields get their own interface before this is reached; an
 * unrecognised type fails the generation loudly rather than emitting
 * a silent `unknown`.
 * @param {{ type?: string, name?: string }} field
 */
const mapFieldType = (field) => {
  const mapped =
    field.type === undefined ? undefined : SCALAR_TYPE_MAP[field.type];
  if (!mapped) {
    throw new Error(
      `No TypeScript mapping for field "${field.name}" of type "${field.type}" - add it to SCALAR_TYPE_MAP`,
    );
  }
  return mapped;
};

/**
 * Generate an interface name from a field name
 * e.g., "image_cards" -> "PagesCMSImageCard"
 * @param {string} fieldName
 */
const generateInterfaceName = (fieldName) => {
  const singular = fieldName
    .replace(/s$/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return `PagesCMS${singular}`;
};

/**
 * Check if a field is a nested object type
 * @param {YmlField} field
 */
const isNestedObjectType = (field) => field.type === "object" && field.fields;

/**
 * Generate interface name for a nested type
 * @param {string} parentName
 * @param {string} fieldName
 */
const generateNestedInterfaceName = (parentName, fieldName) => {
  const capitalizedName =
    fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  return `${parentName}${capitalizedName.replace(/s$/, "")}`;
};

/**
 * Get the TypeScript type for a subfield, processing nested objects if needed
 * @param {YmlField} subField
 * @param {string} parentInterfaceName
 * @param {TypeOutput} output
 * @returns {string}
 */
const getSubfieldType = (subField, parentInterfaceName, output) => {
  if (!isNestedObjectType(subField)) {
    return mapFieldType(subField);
  }

  const nestedName = generateNestedInterfaceName(
    parentInterfaceName,
    subField.name,
  );
  if (!output.generatedNames.has(nestedName)) {
    registerType(subField, nestedName, output);
  }
  return subField.list ? `${nestedName}[]` : nestedName;
};

/**
 * Extract the properties for a single object-type field
 * @param {YmlField} field
 * @param {string} interfaceName
 * @param {TypeOutput} output
 */
const extractObjectFields = (field, interfaceName, output) => {
  if (!field.fields) {
    throw new Error(`Object field "${field.name}" has no fields to type`);
  }
  return field.fields.map((subField) => ({
    name: subField.name,
    type: getSubfieldType(subField, interfaceName, output),
    required: subField.required === true,
    label: subField.label,
  }));
};

/**
 * Generate the TypeScript source for one interface
 * @param {string} interfaceName
 * @param {Array<{ name: string, type: string, required: boolean, label?: string }>} properties
 */
const generateObjectTypeCode = (interfaceName, properties) => {
  const lines = [`export interface ${interfaceName} {`];

  for (const prop of properties) {
    if (prop.label) lines.push(`  /** ${prop.label} */`);
    lines.push(`  ${prop.name}${prop.required ? "" : "?"}: ${prop.type};`);
  }

  lines.push("}");
  return lines.join("\n");
};

/**
 * Generate an interface for an object field and record it in the output.
 * The name is claimed before descending into subfields so re-entrant
 * nesting can never recurse forever.
 * @param {YmlField} field
 * @param {string} interfaceName
 * @param {TypeOutput} output
 */
const registerType = (field, interfaceName, output) => {
  output.generatedNames.add(interfaceName);
  const properties = extractObjectFields(field, interfaceName, output);
  output.interfaces.push(generateObjectTypeCode(interfaceName, properties));
};

/**
 * Resolve a component reference in a field using the components map
 * @param {YmlField} field
 * @param {Record<string, object>} components
 * @returns {YmlField}
 */
const resolveComponentRef = (field, components) => {
  if (!field.component) return field;
  const componentDef = components[field.component];
  if (!componentDef) return field;
  const { component: _c, ...fieldProps } = field;
  return { ...componentDef, ...fieldProps };
};

/**
 * Resolve all component references in a fields array, recursively
 * @param {YmlField[]} fields
 * @param {Record<string, object>} components
 * @returns {YmlField[]}
 */
const resolveFields = (fields, components) =>
  fields.map((field) => {
    const resolved = resolveComponentRef(field, components);
    if (resolved.fields) {
      return {
        ...resolved,
        fields: resolveFields(resolved.fields, components),
      };
    }
    return resolved;
  });

/**
 * Generate an interface for a top-level object field, once per field name
 * @param {YmlField} field
 * @param {TypeOutput} output
 */
const registerTopLevelField = (field, output) => {
  if (!isNestedObjectType(field) || output.generatedNames.has(field.name)) {
    return;
  }
  output.generatedNames.add(field.name);
  registerType(field, generateInterfaceName(field.name), output);
};

/**
 * Generate interfaces for every object-typed field across the config
 * @param {any} config
 * @returns {string[]} TypeScript interface sources
 */
const extractAllTypes = (config) => {
  if (!Array.isArray(config.content)) {
    throw new Error(`${PAGES_YML} has no content section - nothing to type`);
  }
  const components = "components" in config ? config.components : {};
  const output = newTypeOutput();

  for (const item of config.content) {
    const fields = item.fields ? resolveFields(item.fields, components) : [];
    for (const field of fields) {
      registerTopLevelField(field, output);
    }
  }

  return output.interfaces;
};

/* jscpd:ignore-start -- declaration data: generated-file header */
const FILE_HEADER = [
  "/**",
  " * @fileoverview Auto-generated PagesCMS types from .pages.yml",
  " *",
  " * Generated by: scripts/generate-pages-cms-types.js",
  " * Do not edit manually - regenerate using: npm run generate-cms-types",
  " *",
  " * These types represent data validated by PagesCMS schema (.pages.yml).",
  " * Fields marked as required: true in the schema are non-optional.",
  " * Use these in JSDoc annotations to leverage validation guarantees.",
  " */",
  "",
];
/* jscpd:ignore-end */

/**
 * Generate type declarations from PagesCMS YAML.
 * @param {string} pagesYaml
 * @returns {string}
 */
export const generateTypeDefinitions = (pagesYaml) => {
  const config = YAML.parse(pagesYaml);
  const interfaces = extractAllTypes(config);
  const output = [...FILE_HEADER, ...interfaces.flatMap((code) => [code, ""])];
  return `${output.join("\n")}\n`;
};

/** Parse .pages.yml and write its generated type definitions. */
const generateTypes = () => {
  const pagesYaml = readFileSync(PAGES_YML, "utf-8");
  const output = generateTypeDefinitions(pagesYaml);
  const interfaceCount = [...output.matchAll(/^export interface /gm)].length;
  writeFileSync(OUTPUT_FILE, output);
  console.log(`✓ Generated types to ${OUTPUT_FILE}`);
  console.log(`✓ Generated ${interfaceCount} type interfaces`);
};

await runIfMain(import.meta.url, generateTypes);
