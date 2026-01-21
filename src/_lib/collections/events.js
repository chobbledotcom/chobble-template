/**
 * Events collection and filters
 *
 * @module #collections/events
 */

import { pipe, sort } from "#toolkit/fp/array.js";
import { groupBy } from "#toolkit/fp/grouping.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { compareBy, descending } from "#toolkit/fp/sorting.js";
import {
  createArrayFieldIndexer,
  getEventsFromApi,
  getProductsFromApi,
} from "#utils/collection-utils.js";
import { sortItems } from "#utils/sorting.js";
import { findFromChildren } from "#utils/thumbnail-finder.js";

/** @typedef {import("#lib/types").EventCollectionItem} EventCollectionItem */
/** @typedef {import("#lib/types").ProductCollectionItem} ProductCollectionItem */

/** @typedef {"upcoming" | "past" | "regular" | "undated"} EventCategory */

/**
 * Categorised events result.
 * @typedef {Record<EventCategory, EventCollectionItem[]>} CategorisedEvents
 */

/**
 * Compare events by event_date.
 * @type {(a: EventCollectionItem, b: EventCollectionItem) => number}
 */
const byEventDate = compareBy((e) =>
  new Date(e.data.event_date ?? 0).getTime(),
);

/**
 * Curried Map lookup: getGroup(key)(map) => value or [].
 *
 * @template K, V
 * @param {K} key - Map key to look up
 * @returns {(map: Map<K, V[]>) => V[]} Function that returns value or empty array
 */
const getGroup = (key) => (map) => map.get(key) ?? [];

/**
 * Categorise events into upcoming, past, regular, and undated groups.
 * Uses functional groupBy - no mutable objects or loops.
 *
 * @param {EventCollectionItem[]} events - Events to categorise
 * @returns {CategorisedEvents} Events grouped by category
 */
export const categoriseEvents = memoize((events) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  /**
   * Determine event category.
   * @param {EventCollectionItem} event
   * @returns {EventCategory}
   */
  const getCategory = (event) => {
    if (event.data.recurring_date) return "regular";
    if (!event.data.event_date) return "undated";
    const date = new Date(event.data.event_date);
    date.setHours(0, 0, 0, 0);
    return date >= now ? "upcoming" : "past";
  };

  const grouped = groupBy(events, getCategory);

  const upcoming = pipe(getGroup("upcoming"), sort(byEventDate))(grouped);
  const past = pipe(getGroup("past"), sort(descending(byEventDate)))(grouped);
  const regular = pipe(getGroup("regular"), sort(sortItems))(grouped);
  const undated = pipe(getGroup("undated"), sort(sortItems))(grouped);

  return { upcoming, past, regular, undated };
});

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

/**
 * Configure events collection.
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureEvents = (eleventyConfig) => {
  eleventyConfig.addCollection("events", createEventsCollection);
};

export { configureEvents };
