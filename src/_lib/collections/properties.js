/**
 * Properties collection and filters
 *
 * @module #collections/properties
 */

import { addGallery } from "#collections/products.js";
import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import { createArrayFieldIndexer } from "#utils/collection-utils.js";
import { sortItems } from "#utils/sorting.js";

/** @typedef {import("#lib/types").PropertyCollectionItem} PropertyCollectionItem */

/** Index properties by location for O(1) lookups, cached per properties array */
const indexByLocation = createArrayFieldIndexer("locations");

/**
 * Get properties belonging to a specific location.
 * Note: Handles undefined/null input from Liquid templates gracefully.
 *
 * @param {PropertyCollectionItem[] | undefined | null} properties - All properties
 * @param {string | undefined} locationSlug - Location slug to filter by
 * @returns {PropertyCollectionItem[]} Sorted properties in this location
 */
const getPropertiesByLocation = (properties, locationSlug) => {
  if (!properties || !locationSlug) return [];
  return (indexByLocation(properties)[locationSlug] ?? []).sort(sortItems);
};

/**
 * Get featured properties from a properties collection.
 *
 * @param {PropertyCollectionItem[]} properties - Properties array from Eleventy collection
 * @returns {PropertyCollectionItem[]} Filtered array of featured properties
 */
const getFeaturedProperties = (properties) =>
  properties.filter((p) => p.data.featured);

const propertiesWithReviewsPage = withReviewsPage("properties", addGallery);
const propertyReviewsRedirects = reviewsRedirects("properties");

/**
 * Configure properties collection and filters for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureProperties = (eleventyConfig) => {
  eleventyConfig.addCollection("properties", (collectionApi) => {
    const properties =
      /** @type {PropertyCollectionItem[]} */
      (/** @type {unknown} */ (collectionApi.getFilteredByTag("properties")));
    // @ts-expect-error - addGallery works on any item with gallery data
    return properties.map(addGallery);
  });
  eleventyConfig.addCollection(
    "propertiesWithReviewsPage",
    propertiesWithReviewsPage,
  );
  eleventyConfig.addCollection(
    "propertyReviewsRedirects",
    propertyReviewsRedirects,
  );
  eleventyConfig.addFilter("getPropertiesByLocation", getPropertiesByLocation);
  // @ts-expect-error - Filter returns array, not string (used for data transformation)
  eleventyConfig.addFilter("getFeaturedProperties", getFeaturedProperties);
};

export { configureProperties };
