import strings from "#data/strings.js";
import { flatMap, pipe, sort } from "#utils/array-utils.js";
import { memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

/**
 * Strip date prefix and extension from event filename
 * Converts "2024-03-15-my-event.md" to "my-event"
 *
 * @param {string} filename - The markdown filename
 * @returns {string} The slug without date prefix or extension
 */
const stripDatePrefix = (filename) =>
  filename.replace(".md", "").replace(/^\d{4}-\d{2}-\d{2}-/, "");

/**
 * Get the URL for an event, using custom permalink or default
 *
 * @param {Object} data - Event frontmatter data
 * @param {string} fileSlug - The slug derived from filename
 * @param {string} permalinkDir - The directory for event permalinks
 * @returns {string} The event URL
 */
const getEventUrl = (data, fileSlug, permalinkDir) =>
  data.permalink || `/${permalinkDir}/${fileSlug}/`;

/**
 * Render recurring events as HTML list
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} events
 * @returns {string}
 */
const renderRecurringEvents = (events) => {
  if (events.length === 0) {
    return "";
  }

  const items = events.map((event) => {
    const eventData = event.data;
    const url = event.url || eventData.url;
    const titleHtml = url
      ? `<strong><a href="${url}">${eventData.title}</a></strong>`
      : `<strong>${eventData.title}</strong>`;
    const locationHtml = eventData.event_location
      ? `<br>\n    ${eventData.event_location}`
      : "";
    return `  <li>
    ${titleHtml}<br>
    ${eventData.recurring_date}${locationHtml}
  </li>`;
  });

  return `<ul>\n${items.join("\n")}\n</ul>`;
};

/**
 * Shortcode function that renders recurring events from a provided collection.
 * Used for testing with mock data. Not used directly in Eleventy due to
 * collection access limitations in shortcodes.
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} events
 * @returns {string}
 */
function recurringEventsShortcode(events = []) {
  const recurringEvents = events
    .filter((event) => event.data.recurring_date)
    .sort(sortItems);

  return renderRecurringEvents(recurringEvents);
}

/**
 * Get recurring events HTML for direct use in file-utils
 * Memoized at module level so all importers share the same cache
 */
const getRecurringEventsHtml = memoize(async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const matter = await import("gray-matter");

  const eventsDir = path.default.join(process.cwd(), "src/events");

  if (!fs.default.existsSync(eventsDir)) {
    return "";
  }

  const markdownFiles = fs.default
    .readdirSync(eventsDir)
    .filter((file) => file.endsWith(".md"));

  const recurringEvents = pipe(
    flatMap((filename) => {
      const filePath = path.default.join(eventsDir, filename);
      const { data } = matter.default.read(filePath);
      if (!data.recurring_date) return [];

      const fileSlug = stripDatePrefix(filename);
      return [
        {
          url: getEventUrl(data, fileSlug, strings.event_permalink_dir),
          data: {
            title: data.title,
            recurring_date: data.recurring_date,
            event_location: data.event_location,
          },
        },
      ];
    }),
    sort(sortItems),
  )(markdownFiles);

  return renderRecurringEvents(recurringEvents);
});

/**
 * Configure Eleventy recurring events shortcode and filter
 * @param {Object} eleventyConfig - Eleventy configuration object
 */
const configureRecurringEvents = (eleventyConfig) => {
  eleventyConfig.addShortcode("recurring_events", getRecurringEventsHtml);
  eleventyConfig.addFilter("format_recurring_events", renderRecurringEvents);
};

export {
  configureRecurringEvents,
  getEventUrl,
  getRecurringEventsHtml,
  renderRecurringEvents,
  recurringEventsShortcode,
  stripDatePrefix,
};
