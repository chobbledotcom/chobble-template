/**
 * Properties collection and filters
 *
 * @module #collections/properties
 */

import { addGallery } from "#collections/products.js";
import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import {
  createArrayFieldIndexer,
  featuredCollection,
} from "#utils/collection-utils.js";
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

const propertiesWithReviewsPage = withReviewsPage("properties", addGallery);
const propertyReviewsRedirects = reviewsRedirects("properties");

/** @param {*} collectionApi */
const createPropertiesCollection = (collectionApi) =>
  collectionApi.getFilteredByTag("properties").map(addGallery);

/** @param {*} eleventyConfig */
const configureProperties = (eleventyConfig) => {
  eleventyConfig.addCollection("properties", createPropertiesCollection);
  eleventyConfig.addCollection(
    "featuredProperties",
    featuredCollection(createPropertiesCollection),
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
};

export { configureProperties };
