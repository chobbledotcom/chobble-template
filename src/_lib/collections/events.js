import { sort } from "#utils/array-utils.js";
import { groupBy } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

/**
 * Date comparison for sorting events by event_date
 */
const byEventDateAsc = (a, b) =>
  new Date(a.data.event_date) - new Date(b.data.event_date);

const byEventDateDesc = (a, b) =>
  new Date(b.data.event_date) - new Date(a.data.event_date);

const getFeaturedEvents = (events) =>
  events?.filter((e) => e.data.featured) || [];

const categorizeByEventDate = (eventDate, now) => {
  const date = new Date(eventDate);
  date.setHours(0, 0, 0, 0);
  return date >= now ? "upcoming" : "past";
};

/**
 * Create an event categorizer based on current date
 * Returns a pure function: (event) => "upcoming" | "past" | "regular" | null
 */
const createEventCategorizer = (now) => (event) => {
  if (event.data.recurring_date) return "regular";
  if (event.data.event_date)
    return categorizeByEventDate(event.data.event_date, now);
  return null;
};

/**
 * Safe lookup from Map with default value
 */
const fromMap = (map, key, defaultVal = []) => map.get(key) ?? defaultVal;

/**
 * Categorise events into upcoming, past, and regular groups
 * Uses functional groupBy - no mutable objects or loops
 */
export const categoriseEvents = memoize((events) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const grouped = groupBy(events, createEventCategorizer(now));

  const upcoming = sort(byEventDateAsc)(fromMap(grouped, "upcoming"));
  const past = sort(byEventDateDesc)(fromMap(grouped, "past"));
  const regular = sort(sortItems)(fromMap(grouped, "regular"));

  return {
    upcoming,
    past,
    regular,
    show: {
      upcoming: upcoming.length > 0,
      regular: regular.length > 0,
      past: past.length > 0,
    },
  };
});

const configureEvents = (eleventyConfig) => {
  eleventyConfig.addFilter("getFeaturedEvents", getFeaturedEvents);
};

export { configureEvents, getFeaturedEvents };
