import { pipe, sort } from "#utils/array-utils.js";
import { groupBy } from "#utils/grouping.js";
import { memoize } from "#utils/memoize.js";
import { compareBy, descending, sortItems } from "#utils/sorting.js";

const byEventDate = compareBy((e) => new Date(e.data.event_date).getTime());

const getFeaturedEvents = (events) =>
  events?.filter((e) => e.data.featured) || [];

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
