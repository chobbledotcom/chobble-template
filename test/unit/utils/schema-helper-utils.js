/**
 * Schema helper fixture factories and builders
 * Shared test utilities for schema-helper.test.js
 */

import { filterMap, map } from "#toolkit/fp/array.js";

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
  // Only add title if not explicitly set to undefined
  if (!("title" in options) || options.title !== undefined) {
    data.title = options.title ?? "Test";
  }
  return data;
};

/**
 * Create product schema data
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.fileSlug="test"] - Product slug
 * @param {string} [options.title="Test Product"] - Product title
 * @param {string} [options.siteName="Test Store"] - Site name
 * @param {number} [options.price] - Product price
 * @param {Array} [options.reviews] - Reviews collection
 * @param {string} [options.reviewsField] - Field name for reviews
 * @returns {Object} Product schema data
 */
const createProductSchemaData = ({
  fileSlug = "test",
  title = "Test Product",
  siteName = "Test Store",
  price = null,
  reviews = null,
  reviewsField = null,
  ...extraData
} = {}) => {
  const data = createSchemaData({
    pageUrl: `/products/${fileSlug}/`,
    pageFileSlug: fileSlug,
    title,
    siteName,
    ...extraData,
  });
  if (price) data.price = price;
  if (reviews && reviewsField) {
    data.collections = { reviews };
    data.reviewsField = reviewsField;
  }
  return data;
};

/**
 * Create post/news schema data
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.title="Test Post"] - Post title
 * @param {Object} [options.author] - Author object
 * @param {Date} [options.date] - Post date
 * @param {string} [options.siteName="Test Site"] - Site name
 * @param {string} [options.siteLogo] - Site logo URL
 * @returns {Object} Post schema data
 */
const createPostSchemaData = ({
  title = "Test Post",
  author = null,
  date = new Date("2024-03-15"),
  siteName = "Test Site",
  siteLogo = null,
  ...extraData
} = {}) => {
  const data = createSchemaData({
    pageUrl: "/news/test-post/",
    pageDate: date,
    title,
    siteName,
    siteLogo,
    ...extraData,
  });
  if (author) data.author = author;
  return data;
};

/**
 * Create a mock review fixture
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.name="Reviewer"] - Reviewer name
 * @param {number} [options.rating=5] - Review rating
 * @param {string} [options.field="products"] - Review relationship field
 * @param {Array} [options.items=["test"]] - Items being reviewed
 * @param {Date} [options.date] - Review date
 * @returns {Object} Review fixture with { data, date }
 */
const createMockReview = ({
  name = "Reviewer",
  rating = 5,
  field = "products",
  items = ["test"],
  date = new Date("2024-01-15"),
} = {}) => ({
  data: { name, rating, [field]: items },
  date,
});

export {
  addOptionalProps,
  createObjectBuilder,
  createSchemaPage,
  createSchemaSite,
  createSchemaData,
  createProductSchemaData,
  createPostSchemaData,
  createMockReview,
};
