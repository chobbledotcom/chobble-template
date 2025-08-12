const { buildBaseMeta, buildOrganizationMeta } = require('../_lib/schema-helper');
const { categorizeEvents } = require('../_lib/events');

module.exports = {
  eleventyComputed: {
    meta: data => {
      if (data.layout === "contact.html") {
        return buildOrganizationMeta(data);
      }
      
      return buildBaseMeta(data);
    },
    categorizedEvents: data => {
      // Make the categorized events available to the events page template
      if (data.layout === "events.html" && data.collections && data.collections.events) {
        return categorizeEvents(data.collections.events);
      }
      return null;
    }
  }
};