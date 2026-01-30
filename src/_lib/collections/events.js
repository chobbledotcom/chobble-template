/**
 * Events collection and filters
 *
 * @module #collections/events
 */

import { categoriseEvents } from "#collections/categorise-events.js";
import {
  createArrayFieldIndexer,
  featuredCollection,
  getEventsFromApi,
  getProductsFromApi,
} from "#utils/collection-utils.js";
import { findFromChildren } from "#utils/thumbnail-finder.js";

/** @typedef {import("#lib/types").EventCollectionItem} EventCollectionItem */
/** @typedef {import("#lib/types").ProductCollectionItem} ProductCollectionItem */

/** Index products by event slug for O(1) lookups */
const indexProductsByEvent = createArrayFieldIndexer("events");

/**
 * Create the events collection with inherited thumbnails from products.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {EventCollectionItem[]}
 */
const createEventsCollection = (collectionApi) => {
  const events = getEventsFromApi(collectionApi);
  if (events.length === 0) return [];

  const products = getProductsFromApi(collectionApi);
  const productsByEvent = indexProductsByEvent(products);

  return events.map((event) => {
    if (!event.data.thumbnail) {
      const thumb = findFromChildren(
        productsByEvent[event.fileSlug],
        (p) => p.data.thumbnail,
      );
      if (thumb) event.data.thumbnail = thumb;
    }
    return event;
  });
};

/** Pre-filtered recurring events (sorted by order then title). */
const createRecurringEventsCollection = (collectionApi) => {
  const events = createEventsCollection(collectionApi);
  return categoriseEvents(events).regular;
};

const createCategorisedEventsCollection = (collectionApi) =>
  categoriseEvents(createEventsCollection(collectionApi));

const configureEvents = (eleventyConfig) => {
  eleventyConfig.addCollection("events", createEventsCollection);
  eleventyConfig.addCollection(
    "categorisedEvents",
    createCategorisedEventsCollection,
  );
  eleventyConfig.addCollection(
    "featuredEvents",
    featuredCollection(createEventsCollection),
  );
  eleventyConfig.addCollection(
    "recurringEvents",
    createRecurringEventsCollection,
  );
};

export { configureEvents };
