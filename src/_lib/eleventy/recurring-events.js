import strings from "#data/strings.js";
import { flatMap, pipe, sort } from "#toolkit/fp/array.js";
import { memoize } from "#toolkit/fp/memoize.js";
import {
  createTemplateLoader,
  createTemplateRenderer,
} from "#utils/liquid-render.js";
import { sortItems } from "#utils/sorting.js";

const getTemplate = createTemplateLoader("recurring-events-list.html");

/**
 * Render recurring events as HTML list using Liquid template
 *
 * @param {Array<{url: string, data: {title: string, recurring_date: string, event_location?: string}}>} events
 * @returns {Promise<string>}
 */
const renderRecurringEvents = createTemplateRenderer(getTemplate, "events");

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

  const events = pipe(
    flatMap((filename) => {
      const filePath = path.default.join(eventsDir, filename);
      const { data } = matter.default.read(filePath);
      if (!data.recurring_date) return [];

      const fileSlug = filename
        .replace(".md", "")
        .replace(/^\d{4}-\d{2}-\d{2}-/, "");
      const url =
        data.permalink || `/${strings.event_permalink_dir}/${fileSlug}/`;
      return [
        {
          url,
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

  return renderRecurringEvents(events);
});

/**
 * Configure Eleventy recurring events shortcode
 * @param {*} eleventyConfig - Eleventy configuration object
 */
const configureRecurringEvents = (eleventyConfig) => {
  eleventyConfig.addAsyncShortcode("recurring_events", getRecurringEventsHtml);
};

export {
  configureRecurringEvents,
  getRecurringEventsHtml,
  renderRecurringEvents,
};
