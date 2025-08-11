const { buildBaseMeta } = require('../_lib/schema-helper');

module.exports = {
  eleventyComputed: {
    meta: data => buildBaseMeta(data)
  }
};