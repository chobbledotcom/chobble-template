const { buildBaseMeta } = require('../_lib/schema-helper');
const { categoriseEvents } = require('../_lib/events');

module.exports = {
  eleventyComputed: {
    meta: data => buildBaseMeta(data),
    categorisedEvents: data => {
      if (data.collections && data.collections.events) {
        return categoriseEvents(data.collections.events);
      }
      return { upcoming: [], past: [], regular: [], show: { upcoming: true, regular: false, past: false } };
    }
  }
};