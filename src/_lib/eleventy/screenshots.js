import { isAbsolute, join } from "node:path";
import getConfig from "#data/config.js";
import { startServer } from "#media/browser-utils.js";
import { screenshotMultiple } from "#media/screenshot.js";
import { log, error as logError } from "#utils/console.js";

/** @typedef {import("#media/browser-utils.js").DevServerHandle} DevServerHandle */

/** @returns {import("#lib/types").ScreenshotConfig} */
const getScreenshotConfig = () => getConfig().screenshots;

/** @param {any[]} collection */
const extractPagePaths = (collection) =>
  collection.map((item) => item.url || item.data?.page?.url).filter(Boolean);

/**
 * @param {{ urls: string[] }} pageUrlsRef
 * @returns {(collectionApi: import("#lib/types").EleventyCollectionApi) => unknown[]}
 */
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

/**
 * Report per-page capture failures to the console.
 * @param {Array<{ pagePath: string, error: unknown }>} errors
 */
const logScreenshotErrors = (errors) => {
  if (errors.length === 0) return;
  logError(`Screenshot errors: ${errors.length}`);
  for (const err of errors) {
    logError(`  - ${err.pagePath}: ${err.error}`);
  }
};

/**
 * Start the preview server, capture the given pages, and stop the server.
 * Per-page failures are reported via logScreenshotErrors.
 * @param {string[]} pageUrls
 * @param {import("#lib/types").ScreenshotConfig} screenshotConfig
 * @param {string} outputDir
 */
const captureScreenshots = async (pageUrls, screenshotConfig, outputDir) => {
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
 * Wraps #media/screenshot.js for Eleventy integration. Captures the
 * collected page URLs via captureScreenshots after the build.
 * @param {import("#lib/types").UserConfig} eleventyConfig
 */
export const configureScreenshots = (eleventyConfig) => {
  const pageUrlsRef = { urls: [] };

  eleventyConfig.addCollection(
    "_screenshotPages",
    buildCollectionHandler(pageUrlsRef),
  );

  eleventyConfig.on(
    "eleventy.after",
    /** @param {{ dir: { output: string } }} event */
    async ({ dir }) => {
      const screenshotConfig = getScreenshotConfig();
      if (!screenshotConfig.enabled || !screenshotConfig.autoCapture) {
        return;
      }

      log("Starting screenshot capture...");
      await captureScreenshots(pageUrlsRef.urls, screenshotConfig, dir.output);
    },
  );
};
