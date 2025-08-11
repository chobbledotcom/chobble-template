const { buildBaseMeta, buildOrganizationMeta } = require('../_lib/schema-helper');

module.exports = {
  eleventyComputed: {
    meta: data => {
      if (data.layout === "contact.html") {
        return buildOrganizationMeta(data);
      }
      
      return buildBaseMeta(data);
    }
  }
};