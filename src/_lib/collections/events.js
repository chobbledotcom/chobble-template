import { memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

/**
 * Sort events by event_date, returning a new sorted array (no mutation)
 */
const sortByEventDate = (events, descending = false) =>
  [...events].sort((a, b) => {
    const dateA = new Date(a.data.event_date);
    const dateB = new Date(b.data.event_date);
    return descending ? dateB - dateA : dateA - dateB;
  });

const getFeaturedEvents = (events) =>
  events?.filter((e) => e.data.featured) || [];

/**
 * Determine which category an event belongs to based on its date properties
 */
const getEventCategory = (event, now) => {
  if (event.data.recurring_date) {
    return "regular";
  }

  if (event.data.event_date) {
    const eventDate = new Date(event.data.event_date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= now ? "upcoming" : "past";
  }

  return null;
};

/**
 * Categorise events into upcoming, past, and regular groups
 * Uses functional reduce pattern instead of forEach with mutations
 */
export const categoriseEvents = memoize((events) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const categorised = { upcoming: [], past: [], regular: [] };

  for (const event of events) {
    const category = getEventCategory(event, now);
    if (category) {
      categorised[category].push(event);
    }
  }

  const upcoming = sortByEventDate(categorised.upcoming);
  const past = sortByEventDate(categorised.past, true);
  const regular = [...categorised.regular].sort(sortItems);

  const hasRegular = regular.length > 0;
  const hasPast = past.length > 0;

  return {
    upcoming,
    past,
    regular,
    show: {
      upcoming: !hasRegular,
      regular: hasRegular,
      past: hasPast,
    },
  };
});

const configureEvents = (eleventyConfig) => {
  eleventyConfig.addFilter("getFeaturedEvents", getFeaturedEvents);
};

export { configureEvents, getFeaturedEvents };
