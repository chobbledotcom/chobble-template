import ical from "ical-generator";
import config from "#data/config.json" with { type: "json" };
import site from "#data/site.json" with { type: "json" };
import { canonicalUrl } from "#utils/canonical-url.js";

/**
 * Generates iCal format for a one-off event
 * @param {Object} event - Event object
 * @param {Object} event.data - Event data
 * @param {string} event.data.ical_url - iCal URL (required for generating iCal)
 * @param {string} event.data.event_date - Event date
 * @param {string} event.data.title - Event title
 * @param {string} [event.data.subtitle] - Optional subtitle
 * @param {string} [event.data.meta_description] - Optional description
 * @param {string} [event.data.event_location] - Optional event location
 * @param {string} event.url - Event URL
 * @returns {string|null} iCal string or null if no ical_url
 */
export function eventIcal(event) {
  // Only generate iCal for one-off events (not recurring)
  if (!event.data.ical_url) {
    return null;
  }

  const siteName = site.name;
  const timezone = config.timezone || "Europe/London";
  const calendar = ical({
    prodId: `//${siteName}//Event Calendar//EN`,
    name: siteName,
    timezone: timezone,
  });

  const eventDate = new Date(event.data.event_date);

  // Create a full day event without end date (single day event)
  const startDate = new Date(eventDate);
  startDate.setHours(0, 0, 0, 0);

  const _calendarEvent = calendar.createEvent({
    start: startDate,
    allDay: true,
    summary: event.data.title,
    description: event.data.subtitle || event.data.meta_description || "",
    location: event.data.event_location || "",
    url: canonicalUrl(event.url),
  });

  return calendar.toString();
}

/**
 * Check if an event is a one-off event (not recurring)
 * Internal helper for the oneOffEvents collection - not exported.
 * @param {Object} event - Event object with data property
 * @returns {boolean} True if event has event_date but no recurring_date
 */
const isOneOffEvent = (event) =>
  Boolean(event.data.event_date && !event.data.recurring_date);

/**
 * Configure Eleventy iCal filters and collections
 * @param {Object} eleventyConfig - Eleventy configuration object
 */
export function configureICal(eleventyConfig) {
  eleventyConfig.addFilter("eventIcal", eventIcal);
  eleventyConfig.addCollection("oneOffEvents", (collectionApi) =>
    collectionApi.getFilteredByTag("events").filter(isOneOffEvent),
  );
}
