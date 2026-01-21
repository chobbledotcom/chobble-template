import { pipe, sort } from "#toolkit/fp/array.js";
import { groupBy } from "#toolkit/fp/grouping.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { compareBy, descending } from "#toolkit/fp/sorting.js";
import { sortItems } from "#utils/sorting.js";

const byEventDate = compareBy((e) => new Date(e.data.event_date).getTime());

/**
 * Get featured events from an events collection
 * @param {import("#lib/types").EleventyCollectionItem[]} events - Events array from Eleventy collection
 * @returns {import("#lib/types").EleventyCollectionItem[]} Filtered array of featured events
 */
const getFeaturedEvents = (events) => events.filter((e) => e.data.featured);

/**
 * Curried Map lookup: getGroup(key)(map) => value or []
 */
const getGroup = (key) => (map) => map.get(key) ?? [];

/**
 * Categorise events into upcoming, past, regular, and undated groups
 * Uses functional groupBy - no mutable objects or loops
 */
export const categoriseEvents = memoize((events) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const grouped = groupBy(events, (event) => {
    if (event.data.recurring_date) return "regular";
    if (!event.data.event_date) return "undated";
    const date = new Date(event.data.event_date);
    date.setHours(0, 0, 0, 0);
    return date >= now ? "upcoming" : "past";
  });

  const upcoming = pipe(getGroup("upcoming"), sort(byEventDate))(grouped);
  const past = pipe(getGroup("past"), sort(descending(byEventDate)))(grouped);
  const regular = pipe(getGroup("regular"), sort(sortItems))(grouped);
  const undated = pipe(getGroup("undated"), sort(sortItems))(grouped);

  return { upcoming, past, regular, undated };
});

const configureEvents = (eleventyConfig) => {
  eleventyConfig.addFilter("getFeaturedEvents", getFeaturedEvents);
};

export { configureEvents, getFeaturedEvents };
