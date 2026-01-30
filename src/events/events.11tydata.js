import { categoriseEvents } from "#collections/events.js";
import strings from "#data/strings.js";
import { contentTypeData } from "#utils/content-type-data.js";

export default contentTypeData("event", {
  ical_url: (data) => {
    // Only provide iCal URL for one-off events
    if (data.event_date && !data.recurring_date) {
      return `/${strings.event_permalink_dir}/${data.page.fileSlug}.ics`;
    }
    return null;
  },
  categorisedEvents: (data) => {
    if (data.collections?.events) {
      return categoriseEvents(data.collections.events);
    }
    return {
      upcoming: [],
      past: [],
      regular: [],
      show: { upcoming: true, regular: false, past: false },
    };
  },
});
