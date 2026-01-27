/**
 * Generate PagesCMS type definitions from .pages.yml schema
 *
 * This script parses .pages.yml and generates src/_lib/types/pages-cms-generated.d.ts
 * with TypeScript interfaces for all PagesCMS-validated data types.
 *
 * Fields marked as `required: true` in .pages.yml become non-optional properties.
 * This allows JSDoc annotations to leverage PagesCMS schema validation.
 *
 * Run: bun scripts/generate-pages-cms-types.js
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const PAGES_YML = path.join(ROOT_DIR, ".pages.yml");
const OUTPUT_FILE = path.join(
  ROOT_DIR,
  "src/_lib/types/pages-cms-generated.d.ts",
);

/**
 * Map PagesCMS field types to TypeScript types
 * @param {object} field - The field definition
 * @param {string} [nestedTypeName] - For nested objects, the generated type name
 */
const mapFieldType = (field, nestedTypeName) => {
  if (!field.type) return "unknown";

  switch (field.type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
      return "string"; // Dates come as ISO strings
    case "object":
      // If we have a nested type name, use it; otherwise fall back to Record
      return nestedTypeName || "Record<string, unknown>";
    case "image":
      return "string";
    case "code":
      return "string";
    case "rich-text":
      return "string"; // Rich text is markdown/HTML string
    case "reference":
      return "string"; // References store paths as strings
    default:
      return "unknown";
  }
};

/**
 * Generate an interface name from a field name
 * e.g., "product_options" -> "PagesCMSProductOption"
 */
const generateInterfaceName = (fieldName) => {
  // Remove common suffixes that indicate arrays
  const singular = fieldName
    .replace(/s$/, "") // Remove trailing 's' for plurals
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return `PagesCMS${singular}`;
};

/**
 * Check if a field is a nested object type
 */
const isNestedObjectType = (field) => field.type === "object" && field.fields;

/**
 * Generate interface name for a nested type
 */
const generateNestedInterfaceName = (parentName, fieldName) => {
  const capitalizedName =
    fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  const singular = capitalizedName.replace(/s$/, "");
  return `${parentName}${singular}`;
};

/**
 * Get the TypeScript type for a subfield, processing nested objects if needed
 */
const getSubfieldType = (subField, parentInterfaceName, types, typeMapping) => {
  if (!isNestedObjectType(subField)) {
    return mapFieldType(subField);
  }

  const nestedName = generateNestedInterfaceName(
    parentInterfaceName,
    subField.name,
  );
  processNestedFieldType(subField, nestedName, types, typeMapping);
  return subField.list ? `${nestedName}[]` : nestedName;
};

/**
 * Extract fields for a single object-type field
 */
const extractObjectFields = (
  field,
  parentInterfaceName,
  types,
  typeMapping,
) => {
  if (!field.fields) return [];

  return field.fields.map((subField) => ({
    name: subField.name,
    type: getSubfieldType(subField, parentInterfaceName, types, typeMapping),
    required: subField.required === true,
    optional: subField.required !== true,
    label: subField.label || "",
  }));
};

/**
 * Generate TypeScript code for an object type
 */
const generateObjectTypeCode = (interfaceName, properties) => {
  const lines = ["/**", ` * @typedef {Object} ${interfaceName}`];

  for (const prop of properties) {
    const requiredStr = prop.required ? "" : "?";
    lines.push(
      ` * @property {${prop.type}} ${requiredStr}${prop.name} - ${prop.label}`,
    );
  }

  lines.push(" */");
  lines.push(`export interface ${interfaceName} {`);

  for (const prop of properties) {
    const optionalMarker = prop.optional ? "?" : "";
    lines.push(`  ${prop.name}${optionalMarker}: ${prop.type};`);
  }

  lines.push("}");
  return lines.join("\n");
};

/**
 * Register a type in the types array and mapping
 */
const registerType = (field, interfaceName, types, typeMapping, mappingKey) => {
  const properties = extractObjectFields(
    field,
    interfaceName,
    types,
    typeMapping,
  );
  const typeCode = generateObjectTypeCode(interfaceName, properties);
  types.push({ name: field.name, interfaceName, code: typeCode });
  typeMapping[mappingKey] = interfaceName;
};

/**
 * Process a nested object field type
 */
const processNestedFieldType = (field, interfaceName, types, typeMapping) => {
  if (typeMapping[interfaceName]) return;
  registerType(field, interfaceName, types, typeMapping, interfaceName);
};

/**
 * Process a single field and generate type if it's an object type
 */
const processFieldType = (field, types, typeMapping) => {
  if (!isNestedObjectType(field)) return;
  if (typeMapping[field.name]) return;
  const interfaceName = generateInterfaceName(field.name);
  registerType(field, interfaceName, types, typeMapping, field.name);
};

/**
 * Extract all types from config items
 */
const extractAllTypes = (config) => {
  const types = [];
  const typeMapping = {};

  const allItems = config.content || [];
  for (const item of allItems) {
    if (item.fields) {
      for (const field of item.fields) {
        processFieldType(field, types, typeMapping);
      }
    }
  }

  return { types, typeMapping };
};

/**
 * Generate the header for the output file
 */
const generateFileHeader = () => {
  return [
    "/**",
    " * @fileoverview Auto-generated PagesCMS types from .pages.yml",
    " *",
    " * Generated by: scripts/generate-pages-cms-types.js",
    " * Do not edit manually - regenerate using: bun scripts/generate-pages-cms-types.js",
    " *",
    " * These types represent data validated by PagesCMS schema (.pages.yml).",
    " * Fields marked as required: true in the schema are non-optional.",
    " * Use these in JSDoc annotations to leverage validation guarantees.",
    " */",
    "",
  ];
};

/**
 * Parse .pages.yml and generate type definitions
 */
const generateTypes = () => {
  const yamlContent = readFileSync(PAGES_YML, "utf-8");
  const config = YAML.parse(yamlContent);

  const { types } = extractAllTypes(config);

  const output = [
    ...generateFileHeader(),
    ...types.flatMap((type) => [type.code, ""]),
  ];

  // Write the file
  writeFileSync(OUTPUT_FILE, `${output.join("\n")}\n`);
  console.log(`✓ Generated types to ${OUTPUT_FILE}`);
  console.log(`✓ Generated ${types.length} type interfaces`);
};

generateTypes();
