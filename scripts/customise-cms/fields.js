/**
 * Field definitions for CMS collections
 *
 * Provides field configurations that can be filtered based on user settings
 */

/**
 * @typedef {Object} FieldOptions
 * @property {string} [language] - Code language for code fields
 * @property {boolean} [multiple] - Allow multiple values for image fields
 * @property {string} [collection] - Referenced collection for reference fields
 * @property {string} [search] - Search field for reference fields
 * @property {string} [value] - Value template for reference fields
 * @property {string} [label] - Label template for reference fields
 */

/**
 * @typedef {Object} CmsField
 * @property {string} name - Field name
 * @property {string} type - Field type (string, number, boolean, image, date, code, object, reference)
 * @property {string} [label] - Display label
 * @property {boolean} [required] - Whether field is required
 * @property {boolean} [list] - Whether field allows multiple values
 * @property {number} [maxlength] - Maximum string length
 * @property {*} [default] - Default value
 * @property {FieldOptions} [options] - Type-specific options
 * @property {CmsField[]} [fields] - Nested fields for object types
 */

/**
 * Common field definitions reused across collections
 * @type {Record<string, CmsField>}
 */
export const COMMON_FIELDS = {
  title: { name: "title", type: "string", label: "Title" },
  name: { name: "name", type: "string", label: "Name" },
  thumbnail: { name: "thumbnail", type: "image", label: "Thumbnail" },
  header_image: { name: "header_image", type: "image", label: "Header Image" },
  subtitle: { name: "subtitle", type: "string", label: "Subtitle" },
  body: {
    name: "body",
    label: "Body",
    type: "code",
    options: { language: "markdown" },
  },
  header_text: { name: "header_text", type: "string", label: "Header Text" },
  meta_title: {
    name: "meta_title",
    type: "string",
    label: "Meta Title",
    maxlength: 55,
  },
  meta_description: {
    name: "meta_description",
    type: "string",
    label: "Meta Description",
    maxlength: 155,
  },
  permalink: { name: "permalink", type: "string", label: "Permalink" },
  redirect_from: {
    name: "redirect_from",
    type: "string",
    label: "Redirect From",
    list: true,
  },
  order: { name: "order", type: "number", label: "Order" },
  featured: { name: "featured", type: "boolean", label: "Featured" },
  no_index: { name: "no_index", type: "boolean", label: "Hide from listings" },
};

/**
 * Create a markdown field that uses rich-text or code type based on visual editor setting
 * @param {string} name - Field name
 * @param {string} label - Display label
 * @param {boolean} useVisualEditor - Whether to use visual editor
 * @param {Object} [additionalProps={}] - Additional field properties (e.g., required)
 * @returns {CmsField} Field configuration
 */
export const createMarkdownField = (
  name,
  label,
  useVisualEditor,
  additionalProps = {},
) =>
  useVisualEditor
    ? { name, type: "rich-text", label, ...additionalProps }
    : {
        name,
        type: "code",
        label,
        options: { language: "markdown" },
        ...additionalProps,
      };

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
  options: { multiple: true },
};

/**
 * Common nested fields for name/value pair objects
 * Used by specs, filter attributes, and similar list fields
 * @type {CmsField[]}
 */
const NAME_VALUE_FIELDS = [
  { name: "name", type: "string", label: "Name", required: true },
  { name: "value", type: "string", label: "Value", required: true },
];

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
 * Create an object list field with name/value pairs
 * @param {string} name - Field name
 * @param {string} label - Display label
 * @returns {CmsField} Object list field configuration
 */
const createNameValueListField = (name, label) =>
  createObjectListField(name, label, NAME_VALUE_FIELDS);

/**
 * Specs field configuration
 * @type {CmsField}
 */
export const SPECS_FIELD = createNameValueListField("specs", "Specifications");

/**
 * Features list field configuration
 * @type {CmsField}
 */
export const FEATURES_FIELD = {
  name: "features",
  type: "string",
  label: "Features",
  list: true,
};

/**
 * Create a reference field
 * @param {string} name - Field name
 * @param {string} label - Display label
 * @param {string} collection - Referenced collection name
 * @param {string} [searchField="title"] - Field to search by
 * @param {boolean} [multiple=true] - Allow multiple references
 * @returns {CmsField} Reference field configuration
 */
export const createReferenceField = (
  name,
  label,
  collection,
  searchField = "title",
  multiple = true,
) => ({
  name,
  label,
  type: "reference",
  options: {
    collection,
    multiple,
    search: searchField,
    value: "{path}",
    label: `{${searchField}}`,
  },
});

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

/**
 * Product options field
 * @type {CmsField}
 */
export const PRODUCT_OPTIONS_FIELD = {
  name: "options",
  label: "Product Options",
  type: "object",
  list: true,
  fields: [
    { name: "name", type: "string", label: "Option Name", required: true },
    {
      name: "max_quantity",
      type: "number",
      label: "Max Quantity",
      default: 10,
    },
    {
      name: "unit_price",
      type: "number",
      label: "Unit Price (\u00a3)",
      required: true,
    },
    { name: "days", type: "number", label: "Days (for hire products)" },
  ],
};

/**
 * Filter attributes field
 * @type {CmsField}
 */
export const FILTER_ATTRIBUTES_FIELD = createNameValueListField(
  "filter_attributes",
  "Filter Attributes",
);

/**
 * Create add-ons field with appropriate intro type based on config
 * @param {boolean} useVisualEditor - Whether to use visual editor
 * @returns {CmsField} Add-ons field configuration
 */
export const createAddOnsField = (useVisualEditor) => ({
  name: "add_ons",
  label: "Add-ons",
  type: "object",
  fields: [
    createMarkdownField("intro", "Intro", useVisualEditor),
    {
      name: "options",
      label: "Add-on Options",
      type: "object",
      list: true,
      fields: [
        { name: "name", type: "string", label: "Name", required: true },
        { name: "price", type: "number", label: "Price", required: true },
      ],
    },
  ],
});

/**
 * Create tabs field with appropriate body type based on config
 * @param {boolean} useVisualEditor - Whether to use visual editor
 * @returns {CmsField} Tabs field configuration
 */
export const createTabsField = (useVisualEditor) => ({
  name: "tabs",
  label: "Tabs",
  type: "object",
  list: true,
  fields: [
    { name: "title", type: "string", label: "Title", required: true },
    { name: "image", type: "image", label: "Image" },
    createMarkdownField("body", "Body", useVisualEditor, { required: true }),
  ],
});

/**
 * Tabs field (legacy, uses markdown)
 * @type {CmsField}
 */
export const TABS_FIELD = createTabsField(false);

/**
 * Get body field based on visual editor configuration
 * @param {boolean} useVisualEditor - Whether to use visual editor
 * @returns {CmsField} Body field configuration
 */
export const getBodyField = (useVisualEditor) =>
  createMarkdownField("body", "Body", useVisualEditor);

/**
 * Create a body field with custom label
 * @param {string} label - Custom label for the body field
 * @param {boolean} useVisualEditor - Whether to use visual editor
 * @returns {CmsField} Body field configuration with custom label
 */
export const createBodyField = (label, useVisualEditor) => ({
  ...getBodyField(useVisualEditor),
  label,
});
