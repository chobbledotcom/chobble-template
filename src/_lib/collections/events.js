import { sort } from "#utils/array-utils.js";
import { groupBy } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

const getFeaturedEvents = (events) =>
  events?.filter((e) => e.data.featured) || [];

/**
 * Safe lookup from Map with default value
 */
const fromMap = (map, key, defaultVal = []) => map.get(key) ?? defaultVal;

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

  const upcoming = sort(
    (a, b) =>
      new Date(a.data.event_date).getTime() -
      new Date(b.data.event_date).getTime(),
  )(fromMap(grouped, "upcoming"));
  const past = sort(
    (a, b) =>
      new Date(b.data.event_date).getTime() -
      new Date(a.data.event_date).getTime(),
  )(fromMap(grouped, "past"));
  const regular = sort(sortItems)(fromMap(grouped, "regular"));
  const undated = sort(sortItems)(fromMap(grouped, "undated"));

  return {
    upcoming,
    past,
    regular,
    undated,
    show: {
      upcoming: upcoming.length > 0,
      regular: regular.length > 0,
      past: past.length > 0,
      undated: undated.length > 0,
    },
  };
});

const configureEvents = (eleventyConfig) => {
  eleventyConfig.addFilter("getFeaturedEvents", getFeaturedEvents);
};

export { configureEvents, getFeaturedEvents };
