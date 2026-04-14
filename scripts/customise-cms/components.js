/**
 * Component extraction for the generated CMS config.
 *
 * Field builders tag duplicated sub-fields with a `_componentName` marker.
 * `collectComponents` walks the generated content tree to hoist each unique
 * definition into a top-level `components` map, and `applyComponentRefs`
 * replaces the inline occurrences with lightweight `{ name, component }`
 * references so the resulting YAML stays small.
 */

/**
 * @typedef {import('./generator-helpers.js').CmsField} CmsField
 * @typedef {import('./generator-helpers.js').CollectionConfig} CollectionConfig
 */

/**
 * Extract a component definition from a field, stripping internal markers
 * @param {CmsField} field - Field with _componentName
 * @returns {object} Component definition (field without name and _componentName)
 */
const fieldToComponentDef = (field) => {
  const { name: _name, _componentName: _cn, ...def } = field;
  return def;
};

/**
 * Recursively scan fields and register component definitions.
 * Descends into nested `fields` arrays and also `blocks` arrays (for block-type fields).
 * @param {CmsField[]} fields - Fields to scan
 * @param {Record<string, object>} components - Accumulator for component definitions
 */
const scanFieldsForComponents = (fields, components) => {
  if (!fields) return;
  for (const field of fields) {
    if (field._componentName && !components[field._componentName]) {
      components[field._componentName] = fieldToComponentDef(field);
    }
    scanFieldsForComponents(field.fields, components);
    scanFieldsForComponents(field.blocks, components);
  }
};

/**
 * Collect all unique component definitions from content arrays
 * @param {CollectionConfig[]} contentArray - All content configurations
 * @returns {Record<string, object>} Map of component name to definition
 */
export const collectComponents = (contentArray) => {
  const components = {};
  for (const item of contentArray) {
    scanFieldsForComponents(item.fields, components);
  }
  return components;
};

/**
 * Replace a single field with a component reference when applicable,
 * otherwise recursively process its nested `fields` / `blocks` arrays.
 * @param {CmsField} field - Field configuration
 * @returns {CmsField} Transformed field
 */
const replaceFieldWithComponentRef = (field) => {
  if (field._componentName) {
    return { name: field.name, component: field._componentName };
  }
  const updates = {};
  if (field.fields) updates.fields = replaceWithComponentRefs(field.fields);
  if (field.blocks) updates.blocks = replaceWithComponentRefs(field.blocks);
  return Object.keys(updates).length > 0 ? { ...field, ...updates } : field;
};

/**
 * Replace component fields with component references in a fields array.
 * Descends into nested `fields` arrays and also `blocks` arrays (for block-type fields).
 * @param {CmsField[]} fields - Array of field configurations
 * @returns {CmsField[]} Fields with component references replacing full definitions
 */
const replaceWithComponentRefs = (fields) =>
  fields.map(replaceFieldWithComponentRef);

/**
 * Apply component references to all content items
 * @param {CollectionConfig[]} contentArray - All content configurations
 * @returns {CollectionConfig[]} Content with component references
 */
export const applyComponentRefs = (contentArray) =>
  contentArray.map((item) => ({
    ...item,
    fields: replaceWithComponentRefs(item.fields),
  }));
