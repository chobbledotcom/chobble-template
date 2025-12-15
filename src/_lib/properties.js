import { memoize } from "./memoize.js";
import { addGallery } from "./products.js";
import { sortByOrderThenTitle } from "./sorting.js";

// Cache key for functions with (array, string) signature
const cacheKeyArrayAndSlug = (args) => {
  const arr = args[0];
  const slug = args[1];
  return `${arr?.length || 0}:${slug}`;
};

const createPropertiesCollection = (collectionApi) => {
  const properties = collectionApi.getFilteredByTag("property") || [];
  return properties.map(addGallery);
};

const getPropertiesByLocation = memoize(
  (properties, locationSlug) => {
    if (!properties || !locationSlug) return [];
    return properties
      .filter((property) => property.data.locations?.includes(locationSlug))
      .sort(sortByOrderThenTitle);
  },
  { cacheKey: cacheKeyArrayAndSlug },
);

const getFeaturedProperties = (properties) =>
  properties?.filter((p) => p.data.featured) || [];

const configureProperties = (eleventyConfig) => {
  eleventyConfig.addCollection("properties", createPropertiesCollection);
  eleventyConfig.addFilter("getPropertiesByLocation", getPropertiesByLocation);
  eleventyConfig.addFilter("getFeaturedProperties", getFeaturedProperties);
};

export {
  createPropertiesCollection,
  getPropertiesByLocation,
  getFeaturedProperties,
  configureProperties,
};
