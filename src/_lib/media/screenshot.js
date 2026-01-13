import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { log } from "#utils/console.js";

const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: "mobile" },
  tablet: { width: 768, height: 1024, name: "tablet" },
  desktop: { width: 1280, height: 800, name: "desktop" },
  "full-page": { width: 1280, height: 4000, name: "full-page" },
};

const DEFAULT_OPTIONS = {
  viewport: "desktop",
  outputDir: join(ROOT_DIR, "screenshots"),
  baseUrl: "http://localhost:8080",
  timeout: 10000,
  waitForStable: true,
  backgroundColor: "FFFFFF",
  virtualTimeBudget: 5000,
};

const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--single-process",
];

export const buildOutputFilename = (pagePath, viewport, outputDir) => {
  const sanitizedPath =
    pagePath.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "-") ||
    "home";

  const viewportSuffix = viewport !== "desktop" ? `-${viewport}` : "";
  return join(outputDir, `${sanitizedPath}${viewportSuffix}.png`);
};

export const prepareOutputDir = (outputPath) => {
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

export const buildUrl = (pagePath, baseUrl) =>
  pagePath.startsWith("http")
    ? pagePath
    : `${baseUrl}${pagePath.startsWith("/") ? "" : "/"}${pagePath}`;

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
    buildOutputFilename(pagePath, opts.viewport, opts.outputDir);

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

const partitionSettledResults = (settled, makeErrorInfo) => {
  const results = settled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);

  const errors = settled
    .map((r, i) =>
      r.status === "rejected" ? makeErrorInfo(i, r.reason) : null,
    )
    .filter(Boolean);

  return { results, errors };
};

export const screenshotMultiple = async (pagePaths, options = {}) => {
  const promises = pagePaths.map((pagePath) => screenshot(pagePath, options));
  const settled = await Promise.allSettled(promises);

  return partitionSettledResults(settled, (index, reason) => ({
    pagePath: pagePaths[index],
    error: reason.message,
  }));
};

export const screenshotAllViewports = async (pagePath, options = {}) => {
  const viewportNames = Object.keys(VIEWPORTS);
  const promises = viewportNames.map((viewport) =>
    screenshot(pagePath, { ...options, viewport }),
  );
  const settled = await Promise.allSettled(promises);

  return partitionSettledResults(settled, (index, reason) => ({
    pagePath,
    viewport: viewportNames[index],
    error: reason.message,
  }));
};

export const startServer = async (siteDir, port = 8080) => {
  const serverProcess = Bun.spawn(
    ["bun", "x", "serve", siteDir, "-p", String(port)],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  await new Promise((r) => setTimeout(r, 2000));

  return {
    process: serverProcess,
    port,
    baseUrl: `http://localhost:${port}`,
    stop: () => {
      serverProcess.kill();
    },
  };
};

export const getViewports = () => ({ ...VIEWPORTS });
export const getDefaultOptions = () => ({ ...DEFAULT_OPTIONS });

export { VIEWPORTS, DEFAULT_OPTIONS };
