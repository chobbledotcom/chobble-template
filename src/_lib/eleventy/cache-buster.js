const BUILD_TIMESTAMP = Math.floor(Date.now() / 1000);

// Exported for direct testing
export function cacheBust(url) {
  const isProduction = process.env.ELEVENTY_RUN_MODE === "build";

  if (!isProduction) {
    return url;
  }

  return `${url}?cached=${BUILD_TIMESTAMP}`;
}

export function configureCacheBuster(eleventyConfig) {
  eleventyConfig.addFilter("cacheBust", cacheBust);
}
