import { addGallery } from "#collections/products.js";
import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import { arraySlugKey, memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

/**
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {import("#lib/types").EleventyCollectionItem[]}
 */
const createPropertiesCollection = (collectionApi) => {
  const properties = collectionApi.getFilteredByTag("property");
  return properties.map(addGallery);
};

const getPropertiesByLocation = memoize(
  (properties, locationSlug) => {
    if (!properties || !locationSlug) return [];
    return properties
      .filter((property) => property.data.locations?.includes(locationSlug))
      .sort(sortItems);
  },
  { cacheKey: arraySlugKey },
);

const getFeaturedProperties = (properties) =>
  properties?.filter((p) => p.data.featured) || [];

const propertiesWithReviewsPage = withReviewsPage(
  "property",
  "properties",
  addGallery,
);
const propertyReviewsRedirects = reviewsRedirects("property", "properties");

const configureProperties = (eleventyConfig) => {
  eleventyConfig.addCollection("properties", createPropertiesCollection);
  eleventyConfig.addCollection(
    "propertiesWithReviewsPage",
    propertiesWithReviewsPage,
  );
  eleventyConfig.addCollection(
    "propertyReviewsRedirects",
    propertyReviewsRedirects,
  );
  eleventyConfig.addFilter("getPropertiesByLocation", getPropertiesByLocation);
  eleventyConfig.addFilter("getFeaturedProperties", getFeaturedProperties);
};

export {
  createPropertiesCollection,
  propertiesWithReviewsPage,
  propertyReviewsRedirects,
  getPropertiesByLocation,
  getFeaturedProperties,
  configureProperties,
};
