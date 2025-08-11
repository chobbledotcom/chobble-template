const { buildPostMeta } = require('../_lib/schema-helper');

module.exports = {
  eleventyComputed: {
    meta: data => buildPostMeta(data)
  }
};