const { buildBaseMeta, buildOrganizationMeta } = require('../_lib/schema-helper');
const { categoriseEvents } = require('../_lib/events');
const strings = require('../_data/strings.js');

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
    },
    // Computed properties for events page
    header_text: data => {
      if (data.page.inputPath && data.page.inputPath.includes('/events.md')) {
        return strings.event_name;
      }
      return data.header_text;
    },
    meta_title: data => {
      if (data.page.inputPath && data.page.inputPath.includes('/events.md')) {
        return strings.event_name;
      }
      return data.meta_title;
    },
    permalink: data => {
      if (data.page.inputPath && data.page.inputPath.includes('/events.md')) {
        return `/${strings.event_permalink_dir}/`;
      }
      return data.permalink;
    },
    eleventyNavigation: data => {
      if (data.page.inputPath && data.page.inputPath.includes('/events.md')) {
        return {
          key: strings.event_name,
          order: data.eleventyNavigation?.order || 4
        };
      }
      return data.eleventyNavigation;
    }
  }
};