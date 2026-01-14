import { log } from "#utils/console.js";
import {
  BROWSER_ARGS,
  buildOutputPath,
  buildUrl,
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  getDefaultOutputDir,
  prepareOutputDir,
  runBatchOperations,
  sanitizePagePath,
  startServer,
} from "./browser-utils.js";

const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: "mobile" },
  tablet: { width: 768, height: 1024, name: "tablet" },
  desktop: { width: 1280, height: 800, name: "desktop" },
  "full-page": { width: 1280, height: 4000, name: "full-page" },
};

const DEFAULT_OPTIONS = {
  viewport: "desktop",
  outputDir: getDefaultOutputDir("screenshots"),
  outputPath: null,
  baseUrl: DEFAULT_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  waitForStable: true,
  backgroundColor: "FFFFFF",
  virtualTimeBudget: 5000,
};

export const buildViewportSuffix = (viewport) =>
  viewport !== "desktop" ? `-${viewport}` : "";

export const takeScreenshotWithPlaywright = async (
  url,
  outputPath,
  viewport,
  options,
) => {
  const { chromium } = await import("playwright");
  const { width, height } = VIEWPORTS[viewport] || VIEWPORTS.desktop;

  prepareOutputDir(outputPath);

  const browser = await chromium.launch({
    headless: true,
    args: BROWSER_ARGS,
  });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: options.timeout,
  });

  await page.screenshot({
    path: outputPath,
    fullPage: viewport === "full-page",
  });

  await browser.close();

  return { success: true, path: outputPath, url, viewport };
};

export const screenshot = async (pagePath, options = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const url = buildUrl(pagePath, opts.baseUrl);

  const outputPath =
    opts.outputPath ||
    buildOutputPath(
      opts.outputDir,
      pagePath,
      buildViewportSuffix(opts.viewport),
      "png",
    );

  log(`Taking screenshot of ${url} (${opts.viewport})`);

  const result = await takeScreenshotWithPlaywright(
    url,
    outputPath,
    opts.viewport,
    opts,
  );
  log(`Screenshot saved: ${result.path}`);
  return result;
};

export const screenshotMultiple = (pagePaths, options = {}) =>
  runBatchOperations(
    pagePaths,
    (pagePath) => screenshot(pagePath, options),
    (i, reason) => ({ pagePath: pagePaths[i], error: reason.message }),
  );

export const screenshotAllViewports = (pagePath, options = {}) => {
  const viewportNames = Object.keys(VIEWPORTS);
  return runBatchOperations(
    viewportNames,
    (viewport) => screenshot(pagePath, { ...options, viewport }),
    (i, reason) => ({
      pagePath,
      viewport: viewportNames[i],
      error: reason.message,
    }),
  );
};

export const getViewports = () => ({ ...VIEWPORTS });
export const getDefaultOptions = () => ({ ...DEFAULT_OPTIONS });

// Re-export shared utilities for backwards compatibility
export { buildUrl, prepareOutputDir, sanitizePagePath, startServer, VIEWPORTS };
