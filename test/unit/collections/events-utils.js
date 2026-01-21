/**
 * Event fixture factories and test utilities
 * Shared test helpers for events.test.js and other event-related tests
 */

import { expect } from "bun:test";
import { map } from "#toolkit/fp/array.js";

/**
 * Assert event categorization counts
 * @param {Object} result - Result object with upcoming, past, regular, undated arrays
 * @param {Object} options - Expected counts
 * @param {number} options.upcoming - Expected upcoming events
 * @param {number} options.past - Expected past events
 * @param {number} options.regular - Expected regular events
 * @param {number} options.undated - Expected undated events
 */
const expectEventCounts = (
  result,
  { upcoming = 0, past = 0, regular = 0, undated = 0 },
) => {
  expect(result.upcoming.length).toBe(upcoming);
  expect(result.past.length).toBe(past);
  expect(result.regular.length).toBe(regular);
  expect(result.undated.length).toBe(undated);
};

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
 * @param {string} [options.title] - Event title (defaults based on event type)
 * @param {Date} [options.date] - Explicit date for the event
 * @param {number} [options.daysOffset=30] - Days from today (positive=future, negative=past)
 * @param {string} [options.recurring] - Recurring date string (e.g., "Every Monday")
 * @param {boolean} [options.undated] - Create event without date
 * @returns {Object} Event fixture with { data: { title, event_date|recurring_date, ... } }
 *
 * @example
 * createEvent({ title: "Summer Fest", daysOffset: 60 })
 * createEvent({ title: "Weekly Meetup", recurring: "Every Monday" })
 * createEvent({ title: "Past Event", daysOffset: -30 })
 * createEvent({ title: "No Date Event", undated: true })
 */
const createEvent = ({
  title,
  date,
  daysOffset = 30,
  recurring,
  undated,
  ...extraData
} = {}) => {
  if (recurring !== undefined) {
    return {
      data: {
        title: title ?? "Recurring Event",
        recurring_date: recurring,
        ...extraData,
      },
    };
  }

  if (undated) {
    return {
      data: {
        title: title ?? "Undated Event",
        ...extraData,
      },
    };
  }

  const eventDate = date ?? createOffsetDate(daysOffset);

  return {
    data: {
      title: title ?? (daysOffset < 0 ? "Past Event" : "Future Event"),
      event_date:
        eventDate instanceof Date ? formatDateString(eventDate) : eventDate,
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

export {
  expectEventCounts,
  createOffsetDate,
  formatDateString,
  createEvent,
  createEvents,
};
