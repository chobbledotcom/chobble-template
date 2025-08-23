import { buildBaseMeta } from '../_lib/schema-helper.mjs';
import { categoriseEvents } from '../_lib/events.mjs';
import strings from '../_data/strings.js';

export default {
  eleventyComputed: {
    meta: data => buildBaseMeta(data),
    navigationParent: () => strings.event_name,
    permalink: (data) => {
      const dir = strings.event_permalink_dir || "events";
      return `/${dir}/${data.page.fileSlug}/`;
    },
    categorisedEvents: data => {
      if (data.collections && data.collections.events) {
        return categoriseEvents(data.collections.events);
      }
      return { upcoming: [], past: [], regular: [], show: { upcoming: true, regular: false, past: false } };
    }
  }
};