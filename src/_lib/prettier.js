const prettier = require('prettier');

function createPrettierTransform(options = {}) {
  return async function prettierTransform(content, outputPath) {
    if (outputPath && !outputPath.endsWith('.html')) {
      return content;
    }
    
    return await prettier.format(content, {
      parser: 'html',
      ...options
    });
  };
}

function configurePrettier(eleventyConfig, options = {}) {
  eleventyConfig.addTransform('prettier', createPrettierTransform(options));
}

module.exports = {
  createPrettierTransform,
  configurePrettier
};