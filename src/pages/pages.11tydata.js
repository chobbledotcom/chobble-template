const { buildBaseMeta, buildOrganizationMeta } = require('../_lib/schema-helper');
const { categoriseEvents } = require('../_lib/events');

module.exports = {
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