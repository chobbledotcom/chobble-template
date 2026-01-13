import { dirname, join } from "node:path";
import { ensureDir } from "#eleventy/file-utils.js";
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
  outputPath: null,
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
  "--no-zygote",
];

export const sanitizePagePath = (pagePath) =>
  pagePath.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "-") || "home";

export const buildViewportSuffix = (viewport) =>
  viewport !== "desktop" ? `-${viewport}` : "";

export const prepareOutputDir = (outputPath) => {
  ensureDir(dirname(outputPath));
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
    join(
      opts.outputDir,
      `${sanitizePagePath(pagePath)}${buildViewportSuffix(opts.viewport)}.png`,
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

const runBatchScreenshots = async (items, screenshotFn, makeErrorInfo) => {
  const settled = await Promise.allSettled(items.map(screenshotFn));
  return {
    results: settled
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean),
    errors: settled
      .map((r, i) =>
        r.status === "rejected" ? makeErrorInfo(i, r.reason) : null,
      )
      .filter(Boolean),
  };
};

export const screenshotMultiple = (pagePaths, options = {}) =>
  runBatchScreenshots(
    pagePaths,
    (pagePath) => screenshot(pagePath, options),
    (i, reason) => ({ pagePath: pagePaths[i], error: reason.message }),
  );

export const screenshotAllViewports = (pagePath, options = {}) => {
  const viewportNames = Object.keys(VIEWPORTS);
  return runBatchScreenshots(
    viewportNames,
    (viewport) => screenshot(pagePath, { ...options, viewport }),
    (i, reason) => ({
      pagePath,
      viewport: viewportNames[i],
      error: reason.message,
    }),
  );
};

export const startServer = async (siteDir, port = 8080) => {
  const serverProcess = Bun.spawn(
    [
      "bun",
      "-e",
      `Bun.serve({port:${port},async fetch(req){const url=new URL(req.url);let p=url.pathname;if(p.endsWith('/'))p+='index.html';const file=Bun.file('${siteDir}'+p);const exists=await file.exists();return exists?new Response(file):new Response('Not found',{status:404})}})`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const baseUrl = `http://localhost:${port}`;
  for (let i = 0; i < 20; i++) {
    const [result] = await Promise.allSettled([fetch(baseUrl)]);
    if (result.status === "fulfilled" && result.value.ok) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  return {
    process: serverProcess,
    port,
    baseUrl,
    stop: () => serverProcess.kill(),
  };
};

export const getViewports = () => ({ ...VIEWPORTS });
export const getDefaultOptions = () => ({ ...DEFAULT_OPTIONS });

export { VIEWPORTS };
