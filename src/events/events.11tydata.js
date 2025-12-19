import strings from "#data/strings.js";
import { categoriseEvents } from "#collections/events.js";
import { buildPermalink } from "#utils/slug-utils.js";

export default {
  eleventyComputed: {
    navigationParent: () => strings.event_name,
    permalink: (data) => buildPermalink(data, strings.event_permalink_dir),
    ical_url: (data) => {
      // Only provide iCal URL for one-off events
      if (data.event_date && !data.recurring_date) {
        const dir = strings.event_permalink_dir;
        return `/${dir}/${data.page.fileSlug}.ics`;
      }
      return null;
    },
    categorisedEvents: (data) => {
      if (data.collections && data.collections.events) {
        return categoriseEvents(data.collections.events);
      }
      return {
        upcoming: [],
        past: [],
        regular: [],
        show: { upcoming: true, regular: false, past: false },
      };
    },
  },
};
