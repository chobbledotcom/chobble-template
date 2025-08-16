const { buildBaseMeta } = require('../_lib/schema-helper');
const { categoriseEvents } = require('../_lib/events');
const strings = require('../_data/strings.js');

module.exports = {
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