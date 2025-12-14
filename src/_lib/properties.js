import { addGallery } from "./products.js";
import { sortByOrderThenTitle } from "./sorting.js";

const createPropertiesCollection = (collectionApi) => {
  const properties = collectionApi.getFilteredByTag("property") || [];
  return properties.map(addGallery);
};

const getPropertiesByLocation = (properties, locationSlug) => {
  if (!properties || !locationSlug) return [];
  return properties
    .filter((property) => property.data.locations?.includes(locationSlug))
    .sort(sortByOrderThenTitle);
};

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
