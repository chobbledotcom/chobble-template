/**
 * Field definitions for CMS collections
 *
 * Provides field configurations that can be filtered based on user settings
 */

/**
 * @typedef {Object} FieldOptions
 * @property {string} [language] - Code language for code fields
 * @property {boolean} [multiple] - Allow multiple values for image fields
 * @property {number} [maxlength] - Maximum string length
 * @property {string} [collection] - Referenced collection for reference fields
 * @property {string} [search] - Search field for reference fields
 * @property {string} [value] - Value template for reference fields
 * @property {string} [label] - Label template for reference fields
 */

/**
 * @typedef {Object} CmsField
 * @property {string} name - Field name
 * @property {string} [type] - Field type (string, number, boolean, image, date, code, object, reference)
 * @property {string} [label] - Display label
 * @property {boolean} [required] - Whether field is required
 * @property {boolean} [list] - Whether field allows multiple values
 * @property {*} [default] - Default value
 * @property {FieldOptions} [options] - Type-specific options
 * @property {CmsField[]} [fields] - Nested fields for object types
 * @property {CmsField[]} [blocks] - Nested block fields for block editors
 * @property {string} [blockKey] - Discriminator key for block editors
 * @property {string} [component] - Reference to a hoisted component
 * @property {string} [_componentName] - Marker: hoist this field into `components:`
 */

/**
 * Common field definitions reused across collections
 * @type {Record<string, CmsField>}
 */
export const COMMON_FIELDS = {
  name: { name: "name", type: "string", label: "Name", required: true },
  thumbnail: { name: "thumbnail", type: "image", label: "Thumbnail" },
  subtitle: { name: "subtitle", type: "string", label: "Subtitle" },
  meta_title: {
    name: "meta_title",
    type: "string",
    label: "Meta Title",
    _componentName: "meta_title",
    options: { maxlength: 60 },
  },
  meta_description: {
    name: "meta_description",
    type: "string",
    label: "Meta Description",
    _componentName: "meta_description",
    options: { maxlength: 160 },
  },
  permalink: { name: "permalink", type: "string", label: "Permalink" },
  redirect_from: {
    name: "redirect_from",
    type: "string",
    label: "Redirect From",
    list: true,
  },
  order: { name: "order", type: "number", label: "Order" },
  no_index: { name: "no_index", type: "boolean", label: "Hide from listings" },
};

/**
 * Create a markdown field, edited in the CMS's visual rich-text editor.
 * @param {string} name - Field name
 * @param {string} label - Display label
 * @param {Object} [additionalProps={}] - Additional field properties (e.g., required)
 * @returns {CmsField} Field configuration
 */
export const createMarkdownField = (name, label, additionalProps = {}) => ({
  name,
  type: "rich-text",
  label,
  ...additionalProps,
});

/**
 * FAQs field configuration
 * Note: FAQ order is determined by array order, not by the order field
 * @type {CmsField}
 */
export const FAQS_FIELD = {
  name: "faqs",
  label: "FAQs",
  type: "object",
  list: true,
  _componentName: "faqs",
  fields: [
    { name: "question", type: "string", label: "Question", required: true },
    { name: "answer", type: "string", label: "Answer", required: true },
  ],
};

/**
 * Gallery field configuration
 * @type {CmsField}
 */
export const GALLERY_FIELD = {
  name: "gallery",
  type: "image",
  label: "Gallery",
  _componentName: "gallery",
  options: { multiple: true },
};

/**
 * Create an object list field with custom nested fields
 * @param {string} name - Field name
 * @param {string} label - Display label
 * @param {CmsField[]} nestedFields - Fields within each list item
 * @returns {CmsField} Object list field configuration
 */
export const createObjectListField = (name, label, nestedFields) => ({
  name,
  label,
  type: "object",
  list: true,
  fields: nestedFields,
});

/**
 * Create a reference field. A reference without a target collection is a
 * broken schema, so an absent collection fails loudly here.
 * @param {string} name - Field name
 * @param {string} label - Display label
 * @param {string | undefined} collection - Referenced collection name
 * @param {boolean} [multiple=true] - Allow multiple references (adds list: true at top level)
 * @returns {CmsField} Reference field configuration
 */
export const createReferenceField = (
  name,
  label,
  collection,
  multiple = true,
) => {
  if (collection === undefined) {
    throw new Error(`Reference field "${name}" is missing options.collection`);
  }
  return {
    name,
    label,
    type: "reference",
    ...(multiple && { list: true }),
    options: {
      collection,
      search: "fields.name",
      value: "{path}",
      label: "{fields.name}",
    },
  };
};

/**
 * Create an Eleventy navigation field with optional external URL support
 * @param {boolean} [includeUrl=false] - Whether to include the url field for external URLs
 * @returns {CmsField} Navigation field configuration
 */
export const createEleventyNavigationField = (includeUrl = false) => {
  const fields = [
    { name: "key", type: "string" },
    { name: "order", type: "number" },
  ];

  if (includeUrl) {
    fields.push({ name: "url", type: "string" });
  }

  return {
    name: "eleventyNavigation",
    label: "Navigation",
    type: "object",
    fields,
  };
};
