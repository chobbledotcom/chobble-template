/**
 * Locations collection and filters
 *
 * @module #collections/locations
 */

import { createChildThumbnailResolver } from "#collections/thumbnail-resolvers.js";
import { filter, pipe } from "#toolkit/fp/array.js";
import { groupBy } from "#toolkit/fp/grouping.js";
import {
  createFieldIndexer,
  getByParent,
  getLocationsFromApi,
} from "#utils/collection-utils.js";
import { normaliseSlug } from "#utils/slug-utils.js";

/** @typedef {import("#lib/types").LocationCollectionItem} LocationCollectionItem */

/**
 * Get root locations (locations without a parent).
 *
 * @param {LocationCollectionItem[]} locations - All locations
 * @returns {LocationCollectionItem[]} Locations without a parent
 */
const getRootLocations = (locations) =>
  pipe(filter((loc) => !loc.data.parentLocation))(locations);

/**
 * Get sibling locations (same parent) excluding the current page.
 * Replaces gnarly Liquid loop with unless/push pattern.
 *
 * @param {LocationCollectionItem[]} locations - All locations
 * @param {string} parentLocationSlug - Parent location slug
 * @param {string} [currentUrl] - Current page URL to exclude
 * @returns {LocationCollectionItem[]} Sibling locations
 */
const getSiblingLocations = (locations, parentLocationSlug, currentUrl) =>
  pipe(
    filter(
      (loc) => normaliseSlug(loc.data.parentLocation) === parentLocationSlug,
    ),
    filter((loc) => loc.url !== currentUrl),
  )(locations);

/**
 * Create a recursive thumbnail resolver for locations.
 * Checks own thumbnail first, then child locations (services).
 * @param {Map<string, LocationCollectionItem[]>} childrenByParent
 * @returns {(location: LocationCollectionItem) => string | undefined}
 */
const createLocationThumbnailResolver = (childrenByParent) =>
  createChildThumbnailResolver({
    childrenByParent,
    getOwnThumbnail: (location) => location.data.thumbnail,
  });

/**
 * Create the locations collection with inherited thumbnails from child locations.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {LocationCollectionItem[]}
 */
const createLocationsCollection = (collectionApi) => {
  const locations = getLocationsFromApi(collectionApi);
  if (locations.length === 0) return [];

  const childrenByParent = groupBy(locations, (loc) =>
    normaliseSlug(loc.data.parentLocation),
  );
  const resolveThumbnail = createLocationThumbnailResolver(childrenByParent);

  return locations.map((location) => {
    if (!location.data.thumbnail) {
      const thumb = resolveThumbnail(location);
      if (thumb) location.data.thumbnail = thumb;
    }
    return location;
  });
};

const indexByParent = createFieldIndexer("parentLocation");

const getChildLocations = (locations, parentSlug) =>
  getByParent(indexByParent, locations, parentSlug);
const configureLocations = (eleventyConfig) => {
  eleventyConfig.addCollection("locations", createLocationsCollection);
  eleventyConfig.addCollection("rootLocations", (api) =>
    getRootLocations(createLocationsCollection(api)),
  );
  eleventyConfig.addFilter("getSiblingLocations", getSiblingLocations);
  eleventyConfig.addFilter("getChildLocations", getChildLocations);
};

export { getSiblingLocations, getChildLocations, configureLocations };
