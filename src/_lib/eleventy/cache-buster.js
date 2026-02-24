const BUILD_TIMESTAMP = Math.floor(Date.now() / 1000);

/** @param {string} url */
const cacheBust = (url) => {
  const isProduction = process.env.ELEVENTY_RUN_MODE === "build";

  if (isProduction === false) {
    return url;
  }

  return `${url}?cached=${BUILD_TIMESTAMP}`;
};

/** @param {*} eleventyConfig */
export const configureCacheBuster = (eleventyConfig) => {
  eleventyConfig.addFilter("cacheBust", cacheBust);
};
