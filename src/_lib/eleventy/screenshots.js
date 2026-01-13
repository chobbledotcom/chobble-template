import { isAbsolute, join } from "node:path";
import config from "#data/config.json" with { type: "json" };
import {
  buildViewportSuffix,
  getDefaultOptions,
  getViewports,
  sanitizePagePath,
  screenshot,
  screenshotAllViewports,
  screenshotMultiple,
  startServer,
  VIEWPORTS,
} from "#media/screenshot.js";
import { map, pipe } from "#utils/array-utils.js";
import { log, error as logError } from "#utils/console.js";

const getScreenshotConfig = () => config.screenshots || {};

const resolveOutputDir = (outputDir) =>
  isAbsolute(outputDir) ? outputDir : join(process.cwd(), outputDir);

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

  const options = {
    baseUrl: server.baseUrl,
    outputDir: resolveOutputDir(screenshotConfig.outputDir || "screenshots"),
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

export function configureScreenshots(eleventyConfig) {
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
}

export {
  screenshot,
  screenshotMultiple,
  screenshotAllViewports,
  startServer,
  getViewports,
  getDefaultOptions,
  VIEWPORTS,
};
