import strings from "#data/strings.js";
import { linkableContent } from "#utils/linkable-content.js";

export default linkableContent("event", {
  event_location: (data) => data.event_location || "",
  ical_url: (data) => {
    // Only provide iCal URL for one-off events
    if (data.event_date && !data.recurring_date) {
      return `/${strings.event_permalink_dir}/${data.page.fileSlug}.ics`;
    }
    return null;
  },
});
