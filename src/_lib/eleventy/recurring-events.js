import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Liquid } from "liquidjs";
import strings from "#data/strings.js";
import { SRC_DIR } from "#lib/paths.js";
import { memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

const liquid = new Liquid();

const templatePath = join(SRC_DIR, "_includes", "recurring-events.html");

const getTemplate = memoize(async () => readFile(templatePath, "utf-8"));

/**
 * Render recurring events as HTML list
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} events
 * @returns {Promise<string>}
 */
const renderRecurringEvents = async (events) => {
  if (!events || events.length === 0) {
    return "";
  }

  const normalizedEvents = events.map((event) => ({
    url: event.url || event.data.url,
    data: event.data,
  }));

  const template = await getTemplate();
  return liquid.parseAndRender(template, {
    recurring_events: normalizedEvents,
  });
};

/**
 * Shortcode function that renders recurring events from a provided collection.
 * Used for testing with mock data. Not used directly in Eleventy due to
 * collection access limitations in shortcodes.
 *
 * @param {import("#lib/types").EleventyCollectionItem[]} events
 * @returns {Promise<string>}
 */
async function recurringEventsShortcode(events = []) {
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

  const recurringEvents = markdownFiles
    .map((filename) => {
      const filePath = path.default.join(eventsDir, filename);
      const { data } = matter.default.read(filePath);

      if (!data.recurring_date) return null;

      const fileSlug = filename
        .replace(".md", "")
        .replace(/^\d{4}-\d{2}-\d{2}-/, "");
      return {
        url: data.permalink || `/${strings.event_permalink_dir}/${fileSlug}/`,
        data: {
          title: data.title,
          recurring_date: data.recurring_date,
          event_location: data.event_location,
        },
      };
    })
    .filter(Boolean)
    .sort(sortItems);

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
  renderRecurringEvents,
  recurringEventsShortcode,
  getRecurringEventsHtml,
};
