/**
 * Field definitions for CMS collections
 *
 * Provides field configurations that can be filtered based on user settings
 */

/**
 * Common field definitions reused across collections
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
};

/**
 * FAQs field configuration
 * Note: FAQ order is determined by array order, not by the order field
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
 */
export const GALLERY_FIELD = {
  name: "gallery",
  type: "image",
  label: "Gallery",
  options: { multiple: true },
};

/**
 * Specs field configuration
 */
export const SPECS_FIELD = {
  name: "specs",
  label: "Specifications",
  type: "object",
  list: true,
  fields: [
    { name: "name", type: "string", label: "Name", required: true },
    { name: "value", type: "string", label: "Value", required: true },
  ],
};

/**
 * Features list field configuration
 */
export const FEATURES_FIELD = {
  name: "features",
  type: "string",
  label: "Features",
  list: true,
};

/**
 * Create a reference field
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
 * @param {boolean} includeUrl - Whether to include the url field for external URLs
 * @returns {Object} Navigation field configuration
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
 * Default Eleventy navigation field (without external URLs)
 */
export const ELEVENTY_NAVIGATION_FIELD = createEleventyNavigationField(false);

/**
 * Product options field
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
 */
export const FILTER_ATTRIBUTES_FIELD = {
  name: "filter_attributes",
  label: "Filter Attributes",
  type: "object",
  list: true,
  fields: [
    { name: "name", type: "string", label: "Name", required: true },
    { name: "value", type: "string", label: "Value", required: true },
  ],
};

/**
 * Tabs field
 */
export const TABS_FIELD = {
  name: "tabs",
  label: "Tabs",
  type: "object",
  list: true,
  fields: [
    { name: "title", type: "string", label: "Title", required: true },
    {
      name: "body",
      label: "Body",
      type: "code",
      options: { language: "markdown" },
      required: true,
    },
  ],
};
