import ical from "ical-generator";
import { getConfig } from "#config/site-config.js";
import site from "#data/site.json" with { type: "json" };
import { canonicalUrl } from "#utils/canonical-url.js";

/** @typedef {import("#lib/types").EventCollectionItem} EventCollectionItem */
/** @typedef {import("#lib/types").EleventyCollectionApi} EleventyCollectionApi */

/**
 * Generates iCal format for a one-off event
 * @param {EventCollectionItem} event
 * @returns {string|null} iCal string or null if no ical_url
 */
const eventIcal = (event) => {
  if (!event.data.ical_url) return null;
  if (!event.data.event_date) return null;

  const timezone = getConfig().timezone;
  const calendar = ical({
    prodId: `//${site.name}//Event Calendar//EN`,
    name: site.name,
    timezone,
  });

  const eventDate = new Date(event.data.event_date);

  // Create a full day event without end date (single day event)
  const startDate = new Date(eventDate);
  startDate.setHours(0, 0, 0, 0);

  const _calendarEvent = calendar.createEvent({
    start: startDate,
    allDay: true,
    summary: event.data.title,
    description: event.data.subtitle || event.data.meta_description,
    location: event.data.event_location,
    url: canonicalUrl(event.url),
  });

  return calendar.toString();
};

/**
 * Configure Eleventy iCal filters and collections
 * @param {*} eleventyConfig
 */
export const configureICal = (eleventyConfig) => {
  eleventyConfig.addFilter("eventIcal", eventIcal);
  eleventyConfig.addCollection(
    "oneOffEvents",
    /** @param {EleventyCollectionApi} collectionApi */
    (collectionApi) =>
      collectionApi.getFilteredByTag("events").filter(
        /** @param {EventCollectionItem} event */
        (event) => event.data.event_date && !event.data.recurring_date,
      ),
  );
};
