import {
  BROWSER_ARGS,
  createPathContext,
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  ensurePlaywrightBrowsers,
  frozenObject,
  getDefaultOutputDir,
  log,
  pathErrorInfo,
  prepareOutputDir,
  runBatchOperations,
} from "#media/browser-utils.js";

const VIEWPORTS = frozenObject({
  mobile: { width: 375, height: 667, name: "mobile" },
  tablet: { width: 768, height: 1024, name: "tablet" },
  desktop: { width: 1280, height: 800, name: "desktop" },
  "full-page": { width: 1280, height: 4000, name: "full-page" },
});

const DEFAULT_OPTIONS = frozenObject({
  viewport: "desktop",
  outputDir: getDefaultOutputDir("screenshots"),
  outputPath: null,
  baseUrl: DEFAULT_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  waitForStable: true,
  backgroundColor: "FFFFFF",
  virtualTimeBudget: 5000,
});

/** @typedef {import("#media/browser-utils.js").OperationContext<typeof DEFAULT_OPTIONS>} ScreenshotContext */

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
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: options.timeout,
  });

  // Allow JS to initialize (scroll reveals, sliders, etc.)
  await page.waitForTimeout(100);

  await page.screenshot({
    path: outputPath,
    fullPage: viewport === "full-page",
  });

  await browser.close();

  return { success: true, path: outputPath, url, viewport };
};

export const screenshot = async (pagePath, options = {}) => {
  await ensurePlaywrightBrowsers();

  const context = createPathContext(pagePath, DEFAULT_OPTIONS, options, {
    suffix: (opts) => buildViewportSuffix(opts.viewport),
    extension: "png",
  });
  log(`Taking screenshot of ${context.url} (${context.opts.viewport})`);

  const result = await takeScreenshotWithPlaywright(
    context.url,
    context.outputPath,
    context.opts.viewport,
    context.opts,
  );
  log(`Screenshot saved: ${result.path}`);
  return result;
};

export const screenshotMultiple = (pagePaths, options = {}) =>
  runBatchOperations(
    pagePaths,
    (pagePath) => screenshot(pagePath, options),
    pathErrorInfo(pagePaths),
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
