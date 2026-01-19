import { addGallery } from "#collections/products.js";
import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import { groupByWithCache } from "#toolkit/fp/memoize.js";
import { sortItems } from "#utils/sorting.js";

/** Index properties by location for O(1) lookups, cached per properties array */
const indexByLocation = groupByWithCache(
  (property) => property.data.locations ?? [],
);

const getPropertiesByLocation = (properties, locationSlug) => {
  if (!properties || !locationSlug) return [];
  return (indexByLocation(properties)[locationSlug] ?? []).sort(sortItems);
};

/**
 * Get featured properties from a properties collection
 * @param {import("#lib/types").EleventyCollectionItem[]} properties - Properties array from Eleventy collection
 * @returns {import("#lib/types").EleventyCollectionItem[]} Filtered array of featured properties
 */
const getFeaturedProperties = (properties) =>
  properties.filter((p) => p.data.featured);

const propertiesWithReviewsPage = withReviewsPage("properties", addGallery);
const propertyReviewsRedirects = reviewsRedirects("properties");

const configureProperties = (eleventyConfig) => {
  eleventyConfig.addCollection("properties", (collectionApi) =>
    collectionApi.getFilteredByTag("properties").map(addGallery),
  );
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

export { configureProperties };
