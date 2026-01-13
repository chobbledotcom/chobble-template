import { join } from "node:path";
import config from "#data/config.json" with { type: "json" };
import {
  getDefaultOptions,
  getViewports,
  screenshot,
  screenshotAllViewports,
  screenshotMultiple,
  startServer,
  VIEWPORTS,
} from "#media/screenshot.js";
import { map, pipe } from "#utils/array-utils.js";
import { log, error as logError } from "#utils/console.js";

const getScreenshotConfig = () => config.screenshots || {};

const extractPagePaths = (collection) =>
  pipe(map((item) => item.url || item.data?.page?.url))(collection).filter(
    Boolean,
  );

const getPageUrlsFromConfig = (screenshotConfig, collectionApi) => {
  if (screenshotConfig.pages) {
    return screenshotConfig.pages;
  }
  return extractPagePaths(collectionApi.getAll());
};

const getPageUrlsFromCollections = (collectionNames, collectionApi) => {
  const urls = [];
  for (const collectionName of collectionNames) {
    const items = collectionApi.getFilteredByTag(collectionName);
    urls.push(...extractPagePaths(items));
  }
  return urls;
};

const buildCollectionHandler = (pageUrlsRef) => (collectionApi) => {
  const screenshotConfig = getScreenshotConfig();

  if (screenshotConfig.collections) {
    pageUrlsRef.urls = getPageUrlsFromCollections(
      screenshotConfig.collections,
      collectionApi,
    );
  } else {
    pageUrlsRef.urls = getPageUrlsFromConfig(screenshotConfig, collectionApi);
  }

  return [];
};

const buildScreenshotPath = (pagePath, viewport = "desktop") => {
  const sanitizedPath =
    pagePath.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "-") ||
    "home";
  const viewportSuffix = viewport !== "desktop" ? `-${viewport}` : "";
  return `/screenshots/${sanitizedPath}${viewportSuffix}.png`;
};

const logScreenshotErrors = (errors) => {
  if (errors.length === 0) return;
  logError(`Screenshot errors: ${errors.length}`);
  for (const err of errors) {
    logError(`  - ${err.pagePath}: ${err.error}`);
  }
};

const captureScreenshots = async (pageUrls, screenshotConfig, outputDir) => {
  const server = await startServer(outputDir, screenshotConfig.port || 8080);

  try {
    const options = {
      baseUrl: server.baseUrl,
      outputDir: join(process.cwd(), "screenshots"),
      viewport: screenshotConfig.viewport || "desktop",
      timeout: screenshotConfig.timeout || 10000,
    };

    const pagesToCapture = screenshotConfig.limit
      ? pageUrls.slice(0, screenshotConfig.limit)
      : pageUrls;

    const { results, errors } = await screenshotMultiple(
      pagesToCapture,
      options,
    );

    log(`Screenshots captured: ${results.length}`);
    logScreenshotErrors(errors);
  } finally {
    server.stop();
  }
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
