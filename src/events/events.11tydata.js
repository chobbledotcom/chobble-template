const { buildBaseMeta } = require('../_lib/schema-helper');
const { categorizeEvents } = require('../_lib/events');

module.exports = {
  eleventyComputed: {
    meta: data => buildBaseMeta(data),
    categorizedEvents: data => {
      // Make the categorized events available to templates
      if (data.collections && data.collections.events) {
        return categorizeEvents(data.collections.events);
      }
      return { upcoming: [], past: [], regular: [], hasOnlyRegular: false };
    }
  }
};