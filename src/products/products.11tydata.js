const { buildProductMeta } = require('../_lib/schema-helper');

module.exports = {
  eleventyComputed: {
    meta: data => buildProductMeta(data)
  }
};