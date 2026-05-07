/**
 * Event fixture factories and test utilities
 * Shared test helpers for events.test.js and other event-related tests
 */

import { map } from "#toolkit/fp/array.js";

/**
 * Create a date offset from today
 * @param {number} daysOffset - Days from today (positive=future, negative=past)
 * @returns {Date} Offset date
 *
 * @example
 * createOffsetDate(30)  // 30 days in future
 * createOffsetDate(-14) // 14 days in past
 */
const createOffsetDate = (daysOffset = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
};

/**
 * Format date as YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} ISO date string
 */
const formatDateString = (date) => date.toISOString().split("T")[0];

/**
 * Unified event fixture factory using functional options pattern.
 *
 * @param {Object} options
 * @param {string} [options.name] - Event name (defaults based on event type)
 * @param {Date} [options.date] - Explicit date for the event
 * @param {number} [options.daysOffset=30] - Days from today (positive=future, negative=past)
 * @param {string} [options.recurring] - Recurring date string (e.g., "Every Monday")
 * @param {boolean} [options.undated] - Create event without date
 * @returns {Object} Event fixture with { data: { name, event_date|recurring_date, ... } }
 *
 * @example
 * createEvent({ name: "Summer Fest", daysOffset: 60 })
 * createEvent({ name: "Weekly Meetup", recurring: "Every Monday" })
 * createEvent({ name: "Past Event", daysOffset: -30 })
 * createEvent({ name: "No Date Event", undated: true })
 */
/** Default order for items without explicit order (matches eleventyComputed) */
const DEFAULT_ORDER = 9999;

const createEvent = ({
  name,
  date,
  daysOffset = 30,
  recurring,
  undated,
  order = DEFAULT_ORDER,
  ...extraData
} = {}) => {
  if (recurring !== undefined) {
    return {
      data: {
        name: name ?? "Recurring Event",
        recurring_date: recurring,
        order,
        ...extraData,
      },
    };
  }

  if (undated) {
    return {
      data: {
        name: name ?? "Undated Event",
        order,
        ...extraData,
      },
    };
  }

  const eventDate = date ?? createOffsetDate(daysOffset);

  return {
    data: {
      name: name ?? (daysOffset < 0 ? "Past Event" : "Future Event"),
      event_date:
        eventDate instanceof Date ? formatDateString(eventDate) : eventDate,
      order,
      ...extraData,
    },
  };
};

/**
 * Create multiple events from an array of options.
 * Functional composition using curried map.
 *
 * @param {Array<Object>} optionsArray - Array of createEvent option objects
 * @returns {Array<Object>} Array of event fixtures
 *
 * @example
 * createEvents([
 *   { title: "Event 1", daysOffset: 30 },
 *   { title: "Event 2", daysOffset: -30 },
 *   { recurring: "Every Monday" }
 * ])
 */
const createEvents = map(createEvent);

export { createEvent, createEvents, createOffsetDate, formatDateString };
