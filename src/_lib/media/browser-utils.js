import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureDir } from "#eleventy/file-utils.js";
import { ROOT_DIR } from "#lib/paths.js";
import { log, error as logError } from "#utils/console.js";

export const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-zygote",
];

export const DEFAULT_BASE_URL = "http://localhost:8080";
export const DEFAULT_TIMEOUT = 10000;

export const sanitizePagePath = (pagePath) =>
  pagePath.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "-") || "home";

export const prepareOutputDir = (outputPath) => {
  ensureDir(dirname(outputPath));
};

export const buildUrl = (pagePath, baseUrl) =>
  pagePath.startsWith("http")
    ? pagePath
    : `${baseUrl}${pagePath.startsWith("/") ? "" : "/"}${pagePath}`;

export const buildOutputPath = (outputDir, pagePath, suffix, extension) =>
  join(outputDir, `${sanitizePagePath(pagePath)}${suffix}.${extension}`);

export const createOperationContext = (
  pagePath,
  defaultOpts,
  userOptions,
  buildPath,
) => {
  const mergedOptions = { ...defaultOpts, ...userOptions };
  return {
    opts: mergedOptions,
    url: buildUrl(pagePath, mergedOptions.baseUrl),
    outputPath: mergedOptions.outputPath || buildPath(mergedOptions, pagePath),
  };
};

export const runBatchOperations = async (items, operationFn, makeErrorInfo) => {
  const settled = await Promise.allSettled(items.map(operationFn));
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

export const waitForServer = async (baseUrl, maxAttempts = 30, delay = 250) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch {
      // Connection refused, keep trying
    }
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(
    `Server at ${baseUrl} did not respond after ${maxAttempts} attempts`,
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
  await waitForServer(baseUrl, 30, 250);

  return {
    process: serverProcess,
    port,
    baseUrl,
    stop: () => serverProcess.kill(),
  };
};

export const getDefaultOutputDir = (subdir) => join(ROOT_DIR, subdir);

export const getChromePath = async () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const { chromium } = await import("playwright");
  return chromium.executablePath();
};

export const launchChromeHeadless = async (chromePath) => {
  const chromeLauncher = await import("chrome-launcher");
  return chromeLauncher.launch({
    chromePath,
    chromeFlags: ["--headless", ...BROWSER_ARGS],
  });
};

export const ensurePlaywrightBrowsers = async () => {
  const { chromium } = await import("playwright");
  try {
    const execPath = chromium.executablePath();
    if (!existsSync(execPath)) {
      throw new Error("Browser not found");
    }
    return true;
  } catch {
    const msg =
      "Playwright browsers not installed.\n" +
      "Run: bunx playwright install chromium\n" +
      "(Use bunx to ensure the correct version is installed)";
    logError(msg);
    throw new Error(msg);
  }
};

const isConnectionError = (err) =>
  err.message?.includes("ERR_CONNECTION_REFUSED") ||
  err.message?.includes("ECONNREFUSED") ||
  err.message?.includes("net::ERR_");

export const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === maxRetries - 1;
      if (!isConnectionError(err) || isLastAttempt) {
        throw err;
      }
      log(
        `Connection failed, retrying in ${delay}ms... (${attempt + 1}/${maxRetries})`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
};
