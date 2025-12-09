import { categoriseEvents } from "../_lib/events.mjs";

export default {
  eleventyComputed: {
    categorisedEvents: (data) => {
      if (
        data.layout === "events.html" &&
        data.collections &&
        data.collections.events
      ) {
        return categoriseEvents(data.collections.events);
      }
      return null;
    },
  },
};
