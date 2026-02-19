import { isAbsolute, join } from "node:path";
import { getConfig } from "#config/site-config.js";
import { sanitizePagePath, startServer } from "#media/browser-utils.js";
import {
  buildViewportSuffix,
  getViewports,
  screenshot,
  screenshotAllViewports,
  screenshotMultiple,
} from "#media/screenshot.js";
import { map, pipe } from "#toolkit/fp/array.js";
import { log, error as logError } from "#utils/console.js";

/** @typedef {import("#media/browser-utils.js").DevServerHandle} DevServerHandle */

/** @returns {import("#lib/types").ScreenshotConfig} */
const getScreenshotConfig = () => getConfig().screenshots;

const extractPagePaths = (collection) =>
  pipe(map((item) => item.url || item.data?.page?.url))(collection).filter(
    Boolean,
  );

export const buildScreenshotPath = (pagePath, viewport = "desktop") =>
  `/screenshots/${sanitizePagePath(pagePath)}${buildViewportSuffix(viewport)}.png`;

export const buildCollectionHandler = (pageUrlsRef) => (collectionApi) => {
  const screenshotConfig = getScreenshotConfig();

  if (screenshotConfig.collections) {
    pageUrlsRef.urls = screenshotConfig.collections.flatMap((name) =>
      extractPagePaths(collectionApi.getFilteredByTag(name)),
    );
  } else if (screenshotConfig.pages) {
    pageUrlsRef.urls = screenshotConfig.pages;
  } else {
    pageUrlsRef.urls = extractPagePaths(collectionApi.getAll());
  }

  return [];
};

export const logScreenshotErrors = (errors) => {
  if (errors.length === 0) return;
  logError(`Screenshot errors: ${errors.length}`);
  for (const err of errors) {
    logError(`  - ${err.pagePath}: ${err.error}`);
  }
};

export const captureScreenshots = async (
  pageUrls,
  screenshotConfig,
  outputDir,
) => {
  const server = await startServer(outputDir, screenshotConfig.port || 8080);
  const configOutputDir = screenshotConfig.outputDir || "screenshots";

  const options = {
    baseUrl: server.baseUrl,
    outputDir: isAbsolute(configOutputDir)
      ? configOutputDir
      : join(process.cwd(), configOutputDir),
    viewport: screenshotConfig.viewport || "desktop",
    timeout: screenshotConfig.timeout || 10000,
  };

  const pagesToCapture = screenshotConfig.limit
    ? pageUrls.slice(0, screenshotConfig.limit)
    : pageUrls;

  const { results, errors } = await screenshotMultiple(pagesToCapture, options);

  log(`Screenshots captured: ${results.length}`);
  logScreenshotErrors(errors);
  server.stop();
};

/**
 * Eleventy wrapper for screenshot utilities.
 * Wraps #media/screenshot.js for Eleventy integration.
 */
export const configureScreenshots = (eleventyConfig) => {
  const pageUrlsRef = { urls: [] };

  eleventyConfig.addCollection(
    "_screenshotPages",
    buildCollectionHandler(pageUrlsRef),
  );
  eleventyConfig.addGlobalData("screenshotViewports", () => getViewports());
  eleventyConfig.addFilter("screenshotPath", buildScreenshotPath);

  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const screenshotConfig = getScreenshotConfig();
    if (!screenshotConfig.enabled || !screenshotConfig.autoCapture) {
      return;
    }

    log("Starting screenshot capture...");
    await captureScreenshots(pageUrlsRef.urls, screenshotConfig, dir.output);
  });
};

export { screenshot, screenshotMultiple, screenshotAllViewports, startServer };
