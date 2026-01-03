import strings from "#data/strings.js";
import { memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

/**
 * Render recurring events as HTML list
 */
const renderRecurringEvents = (events) => {
  if (!events || events.length === 0) {
    return "";
  }

  const items = events.map((event) => {
    const eventData = event.data || event;
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

const _recurringEventsShortcode = function (_eleventyConfig) {
  const events =
    this.ctx?.collections?.events || this.collections?.events || [];
  const recurringEvents = events
    .filter((event) => event.data?.recurring_date)
    .sort(sortItems);

  return renderRecurringEvents(recurringEvents);
};

/**
 * Extract file slug from markdown filename
 */
const extractFileSlug = (filename) =>
  filename.replace(".md", "").replace(/^\d{4}-\d{2}-\d{2}-/, "");

/**
 * Build event URL from frontmatter or generate from slug
 */
const buildEventUrl = (frontmatter, fileSlug) =>
  frontmatter.permalink || `/${strings.event_permalink_dir}/${fileSlug}/`;

/**
 * Transform frontmatter data into recurring event object
 */
const toRecurringEvent = (frontmatter, filename) => {
  const fileSlug = extractFileSlug(filename);
  return {
    url: buildEventUrl(frontmatter, fileSlug),
    data: {
      title: frontmatter.title,
      recurring_date: frontmatter.recurring_date,
      event_location: frontmatter.event_location,
    },
  };
};

/**
 * Read and parse a markdown file, returning frontmatter if it's a recurring event
 */
const readRecurringEvent = (path, matter, eventsDir, filename) => {
  const filePath = path.default.join(eventsDir, filename);
  const { data } = matter.default.read(filePath);
  return data.recurring_date ? toRecurringEvent(data, filename) : null;
};

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
    .map((filename) => readRecurringEvent(path, matter, eventsDir, filename))
    .filter(Boolean)
    .sort(sortItems);

  return renderRecurringEvents(recurringEvents);
});

const configureRecurringEvents = (eleventyConfig) => {
  eleventyConfig.addShortcode("recurring_events", getRecurringEventsHtml);
  eleventyConfig.addFilter("format_recurring_events", renderRecurringEvents);
};

export {
  configureRecurringEvents,
  renderRecurringEvents,
  getRecurringEventsHtml,
};
