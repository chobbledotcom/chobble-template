/**
 * Schema helper fixture factories and builders
 * Shared test utilities for schema-helper.test.js
 */

import { filterMap, map } from "#utils/fp/array.js";

/**
 * Create a curried optional property adder
 * Returns a function that adds optional properties to an object
 *
 * @param {Array<string>} keys - Property names that are optional
 * @returns {Function} (obj, options) => object with optional properties merged
 *
 * @example
 * const addContactInfo = addOptionalProps(["email", "phone"]);
 * addContactInfo({ name: "Alice" }, { email: "a@b.com" }); // { name: "Alice", email: "a@b.com" }
 */
const addOptionalProps = (keys) => (obj, options) => ({
  ...obj,
  ...Object.fromEntries(
    filterMap(
      (key) => options[key],
      (key) => [key, options[key]],
    )(keys),
  ),
});

/**
 * Create an object builder with required and optional properties.
 * Curried: (requiredDefaults, optionalKeys) => (options) => object
 *
 * Required properties are always included (with defaults if not provided).
 * Optional properties are only added if their value is truthy.
 *
 * @param {Object} requiredDefaults - Map of required property names to default values
 * @param {Array<string>} optionalKeys - Array of optional property names
 * @returns {Function} (options) => object
 *
 * @example
 * const createPerson = createObjectBuilder({ name: "Anonymous" }, ["age", "email"]);
 * createPerson({ name: "Alice", age: 30 }); // { name: "Alice", age: 30 }
 * createPerson({ email: null }); // { name: "Anonymous" }
 */
const createObjectBuilder = (requiredDefaults, optionalKeys) => {
  const addOptionals = addOptionalProps(optionalKeys);
  return (options = {}) => {
    const baseObj = Object.fromEntries(
      map(([key, defaultVal]) => [key, options[key] ?? defaultVal])(
        Object.entries(requiredDefaults),
      ),
    );
    return addOptionals(baseObj, options);
  };
};

// Schema page and site builders
const createSchemaPage = createObjectBuilder({ url: "/page/" }, [
  "fileSlug",
  "date",
]);

const createSchemaSite = createObjectBuilder(
  { url: "https://example.com", name: "Test Site" },
  ["logo"],
);

/**
 * Create base schema data with page and site information
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.pageUrl="/page/"] - Page URL
 * @param {string} [options.pageFileSlug] - Page file slug
 * @param {Date} [options.pageDate] - Page date
 * @param {string} [options.siteUrl="https://example.com"] - Site URL
 * @param {string} [options.siteName="Test Site"] - Site name
 * @param {string} [options.siteLogo] - Site logo URL
 * @param {Object} [options.extraData] - Additional data properties
 * @returns {Object} Schema data with page and site
 */
const createSchemaData = (options = {}) => {
  const {
    pageUrl = "/page/",
    pageFileSlug = null,
    pageDate = null,
    siteUrl = "https://example.com",
    siteName = "Test Site",
    siteLogo = null,
    ...extraData
  } = options;
  const data = {
    page: createSchemaPage({
      url: pageUrl,
      fileSlug: pageFileSlug,
      date: pageDate,
    }),
    site: createSchemaSite({ url: siteUrl, name: siteName, logo: siteLogo }),
    ...extraData,
  };
  // Only add name if not explicitly set to undefined
  if (!("name" in options) || options.name !== undefined) {
    data.name = options.name ?? "Test";
  }
  return data;
};

/**
 * Create post/news schema data
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.name="Test Post"] - Post name
 * @param {Object} [options.author] - Author object
 * @param {Date} [options.date] - Post date
 * @param {string} [options.siteName="Test Site"] - Site name
 * @param {string} [options.siteLogo] - Site logo URL
 * @returns {Object} Post schema data
 */
const createPostSchemaData = ({
  name = "Test Post",
  author = null,
  date = new Date("2024-03-15"),
  siteName = "Test Site",
  siteLogo = null,
  ...extraData
} = {}) => {
  const data = createSchemaData({
    pageUrl: "/news/test-post/",
    pageDate: date,
    name,
    siteName,
    siteLogo,
    ...extraData,
  });
  if (author) data.author = author;
  return data;
};

export {
  addOptionalProps,
  createObjectBuilder,
  createPostSchemaData,
  createSchemaData,
  createSchemaPage,
  createSchemaSite,
};
