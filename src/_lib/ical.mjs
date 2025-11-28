import ical from "ical-generator";
import config from "../_data/config.json" with { type: "json" };
import site from "../_data/site.json" with { type: "json" };

export function generateICalForEvent(event) {
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

  const calendarEvent = calendar.createEvent({
    start: startDate,
    allDay: true,
    summary: event.data.title,
    description: event.data.subtitle || event.data.meta_description || "",
    location: event.data.event_location || "",
    url: `${site.url}${event.url}`,
  });

  return calendar.toString();
}

export function configureICal(eleventyConfig) {
  // Add a filter to generate iCal content
  eleventyConfig.addFilter("generateICal", generateICalForEvent);

  // Add collection of one-off events
  eleventyConfig.addCollection("oneOffEvents", (collectionApi) =>
    collectionApi.getFilteredByTag("events").filter((event) => {
      return event.data.event_date && !event.data.recurring_date;
    }),
  );
}
