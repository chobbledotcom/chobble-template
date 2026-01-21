/**
 * Events collection and filters
 *
 * @module #collections/events
 */

import { pipe, sort } from "#toolkit/fp/array.js";
import { groupBy } from "#toolkit/fp/grouping.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { compareBy, descending } from "#toolkit/fp/sorting.js";
import { sortItems } from "#utils/sorting.js";

/** @typedef {import("#lib/types").EventCollectionItem} EventCollectionItem */

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
 * Get featured events from an events collection.
 *
 * @param {EventCollectionItem[]} events - Events array from Eleventy collection
 * @returns {EventCollectionItem[]} Filtered array of featured events
 */
const getFeaturedEvents = (events) => events.filter((e) => e.data.featured);

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

/**
 * Configure events filters for Eleventy.
 *
 * @param {import('11ty.ts').EleventyConfig} eleventyConfig
 */
const configureEvents = (eleventyConfig) => {
  eleventyConfig.addFilter("getFeaturedEvents", getFeaturedEvents);
};

export { configureEvents, getFeaturedEvents };
