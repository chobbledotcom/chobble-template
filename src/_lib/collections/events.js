/**
 * Events collection and filters
 *
 * @module #collections/events
 */

import { filter, pipe, sort } from "#toolkit/fp/array.js";
import { compareBy, descending } from "#toolkit/fp/sorting.js";
import {
  createArrayFieldIndexer,
  featuredCollection,
  getEventsFromApi,
  getProductsFromApi,
} from "#utils/collection-utils.js";
import { sortItems } from "#utils/sorting.js";
import { findFromChildren } from "#utils/thumbnail-finder.js";

/** @typedef {import("#lib/types").EventCollectionItem} EventCollectionItem */
/** @typedef {import("#lib/types").ProductCollectionItem} ProductCollectionItem */

/** Compare events by event_date. */
const byEventDate = compareBy((e) =>
  new Date(e.data.event_date ?? 0).getTime(),
);

/** Build-time "today" boundary — stable for the entire build. */
const today = new Date();
today.setHours(0, 0, 0, 0);

/** Classify a single event as upcoming, past, regular, or undated. */
const classifyEvent = (event) => {
  if (event.data.recurring_date) return "regular";
  if (!event.data.event_date) return "undated";
  const date = new Date(event.data.event_date);
  date.setHours(0, 0, 0, 0);
  return date >= today ? "upcoming" : "past";
};

/** Filter + sort helpers for each event category. */
const byCategory = (category, sorting) =>
  pipe(
    filter((e) => classifyEvent(e) === category),
    sort(sorting),
  );

const upcomingFrom = byCategory("upcoming", byEventDate);
const pastFrom = byCategory("past", descending(byEventDate));
const regularFrom = byCategory("regular", sortItems);
const undatedFrom = byCategory("undated", sortItems);

/** Index products by event slug for O(1) lookups */
const indexProductsByEvent = createArrayFieldIndexer("events");

/**
 * Create the events collection with inherited thumbnails from products.
 * @param {import("@11ty/eleventy").CollectionApi} collectionApi
 * @returns {EventCollectionItem[]}
 */
const createEventsCollection = (collectionApi) => {
  const events = getEventsFromApi(collectionApi);
  const products = getProductsFromApi(collectionApi);
  if (events.length === 0) return [];

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

const configureEvents = (eleventyConfig) => {
  eleventyConfig.addCollection("events", createEventsCollection);
  eleventyConfig.addCollection("upcomingEvents", (api) =>
    upcomingFrom(createEventsCollection(api)),
  );
  eleventyConfig.addCollection("pastEvents", (api) =>
    pastFrom(createEventsCollection(api)),
  );
  eleventyConfig.addCollection("regularEvents", (api) =>
    regularFrom(createEventsCollection(api)),
  );
  eleventyConfig.addCollection("undatedEvents", (api) =>
    undatedFrom(createEventsCollection(api)),
  );
  eleventyConfig.addCollection(
    "featuredEvents",
    featuredCollection(createEventsCollection),
  );
  eleventyConfig.addCollection("recurringEvents", (api) =>
    regularFrom(createEventsCollection(api)),
  );
};

export { configureEvents };
