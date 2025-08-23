import { buildBaseMeta, buildOrganizationMeta } from '../_lib/schema-helper.mjs';
import { categoriseEvents } from '../_lib/events.mjs';

export default {
  eleventyComputed: {
    meta: data => {
      if (data.layout === "contact.html") {
        return buildOrganizationMeta(data);
      }
      
      return buildBaseMeta(data);
    },
    categorisedEvents: data => {
      if (data.layout === "events.html" && data.collections && data.collections.events) {
        return categoriseEvents(data.collections.events);
      }
      return null;
    }
  }
};