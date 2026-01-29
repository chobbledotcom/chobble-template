/**
 * Locations collection and filters
 *
 * @module #collections/locations
 */

import { groupBy } from "#toolkit/fp/grouping.js";
import { memoizeByRef } from "#toolkit/fp/memoize.js";
import { getLocationsFromApi } from "#utils/collection-utils.js";
import { findFirst, findFromChildren } from "#utils/thumbnail-finder.js";

/** @typedef {import("#lib/types").LocationCollectionItem} LocationCollectionItem */

/**
 * Get root locations (locations without a parent).
 *
 * @param {LocationCollectionItem[]} locations - All locations
 * @returns {LocationCollectionItem[]} Locations without a parent
 */
const getRootLocations = (locations) =>
  locations.filter((loc) => !loc.data.parentLocation);

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
  locations.filter(
    (loc) =>
      loc.data.parentLocation === parentLocationSlug && loc.url !== currentUrl,
  );

/**
 * Create a recursive thumbnail resolver for locations.
 * Checks own thumbnail first, then child locations (services).
 * @param {Map<string, LocationCollectionItem[]>} childrenByParent
 * @returns {(slug: string, ownThumb: string | undefined) => string | undefined}
 */
const createLocationThumbnailResolver = (childrenByParent) => {
  const resolveLocation = (slug, ownThumb) =>
    findFirst(
      () => ownThumb,
      () =>
        findFromChildren(childrenByParent.get(slug), (child) =>
          resolveLocation(child.fileSlug, child.data.thumbnail),
        ),
    );
  return resolveLocation;
};

/**
 * Create the locations collection with inherited thumbnails from child locations.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {LocationCollectionItem[]}
 */
const createLocationsCollection = (collectionApi) => {
  const locations = getLocationsFromApi(collectionApi);
  if (locations.length === 0) return [];

  const childrenByParent = groupBy(locations, (loc) => loc.data.parentLocation);
  const resolveThumbnail = createLocationThumbnailResolver(childrenByParent);

  return locations.map((location) => {
    if (!location.data.thumbnail) {
      const thumb = resolveThumbnail(location.fileSlug, undefined);
      if (thumb) location.data.thumbnail = thumb;
    }
    return location;
  });
};

/**
 * Build an index of child locations by parent slug.
 * Memoized per locations array reference.
 */
const indexByParent = memoizeByRef(
  /** @param {LocationCollectionItem[]} locations */
  (locations) => groupBy(locations, (loc) => loc.data.parentLocation),
);

/**
 * Get child locations (services) of a given parent location.
 * Uses indexed lookup instead of Liquid `| where: "data.parentLocation", slug`.
 *
 * @param {LocationCollectionItem[]} locations - All locations
 * @param {string} parentSlug - Parent location slug
 * @returns {LocationCollectionItem[]} Child locations
 */
const getChildLocations = (locations, parentSlug) =>
  indexByParent(locations).get(parentSlug) ?? [];

/**
 * Configure locations collection and filters for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureLocations = (eleventyConfig) => {
  eleventyConfig.addCollection("locations", createLocationsCollection);
  // @ts-expect-error - Filter returns array for data transformation, not string
  eleventyConfig.addFilter("getRootLocations", getRootLocations);
  // @ts-expect-error - Filter returns array for data transformation, not string
  eleventyConfig.addFilter("getSiblingLocations", getSiblingLocations);
  // @ts-expect-error - Filter returns array for data transformation, not string
  eleventyConfig.addFilter("getChildLocations", getChildLocations);
};

export {
  getRootLocations,
  getSiblingLocations,
  getChildLocations,
  configureLocations,
};
