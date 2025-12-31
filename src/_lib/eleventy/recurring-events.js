import { memoize } from "#utils/memoize.js";
import { sortItems } from "#utils/sorting.js";

const renderRecurringEvents = (events) => {
  if (!events || events.length === 0) {
    return "";
  }

  let html = "<ul>\n";
  for (const event of events) {
    const eventData = event.data || event;
    const url = event.url || eventData.url;
    html += `  <li>\n`;
    if (url) {
      html += `    <strong><a href="${url}">${eventData.title}</a></strong><br>\n`;
    } else {
      html += `    <strong>${eventData.title}</strong><br>\n`;
    }
    html += `    ${eventData.recurring_date}`;
    if (eventData.event_location) {
      html += `<br>\n    ${eventData.event_location}`;
    }
    html += `\n  </li>\n`;
  }
  html += "</ul>";

  return html;
};

const recurringEventsShortcode = function (eleventyConfig) {
  // Access the events collection through Eleventy's collection API
  const events =
    this.ctx?.collections?.events || this.collections?.events || [];
  const recurringEvents = events.filter((event) => event.data?.recurring_date);

  recurringEvents.sort(sortItems);

  return renderRecurringEvents(recurringEvents);
};

// Function to get recurring events HTML for direct use in file-utils
// Memoized at module level so all importers share the same cache
const getRecurringEventsHtml = memoize(async () => {
  const fs = await import("fs");
  const path = await import("path");
  const matter = await import("gray-matter");

  // Read all event files from the events directory
  const eventsDir = path.default.join(process.cwd(), "src/events");
  const recurringEvents = [];

  try {
    const files = fs.default.readdirSync(eventsDir);

    for (const file of files) {
      if (file.endsWith(".md")) {
        const filePath = path.default.join(eventsDir, file);
        const content = fs.default.readFileSync(filePath, "utf8");
        const { data } = matter.default(content);

        // Check if this is a recurring event
        if (data.recurring_date) {
          // Generate URL from filename
          // Remove .md extension and any date prefix (YYYY-MM-DD-)
          let slug = file.replace(".md", "");
          slug = slug.replace(/^\d{4}-\d{2}-\d{2}-/, "");
          const url = `/events/${slug}/`;

          recurringEvents.push({
            url: url,
            data: {
              title: data.title,
              recurring_date: data.recurring_date,
              event_location: data.event_location,
            },
          });
        }
      }
    }

    recurringEvents.sort(sortItems);

    return renderRecurringEvents(recurringEvents);
  } catch (err) {
    console.error("Error reading events:", err);
    return "";
  }
});

const configureRecurringEvents = (eleventyConfig) => {
  // Add the shortcode that can be used in templates
  eleventyConfig.addShortcode("recurring_events", getRecurringEventsHtml);

  // Also add a filter version for more flexibility
  eleventyConfig.addFilter("format_recurring_events", renderRecurringEvents);
};

export {
  configureRecurringEvents,
  renderRecurringEvents,
  getRecurringEventsHtml,
};
