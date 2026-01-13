import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { log, error as logError } from "#utils/console.js";

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

const findChromium = () => {
  const candidates = [
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ];

  for (const candidate of candidates) {
    try {
      const result = Bun.spawnSync(["which", candidate]);
      if (result.exitCode === 0) {
        return result.stdout.toString().trim();
      }
    } catch {}
  }
  return "chromium";
};

const buildOutputFilename = (pagePath, viewport, outputDir) => {
  const sanitizedPath =
    pagePath.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "-") ||
    "home";

  const viewportSuffix = viewport !== "desktop" ? `-${viewport}` : "";
  return join(outputDir, `${sanitizedPath}${viewportSuffix}.png`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getFileSize = (filePath) =>
  existsSync(filePath) ? statSync(filePath).size : 0;

const waitForFileToExist = async (filePath, timeout, checkInterval) => {
  const startTime = Date.now();
  while (!existsSync(filePath) && Date.now() - startTime < timeout) {
    await sleep(checkInterval);
  }
  return existsSync(filePath);
};

const waitForFileSizeStable = async (
  filePath,
  timeout,
  checkInterval,
  stableThreshold,
) => {
  const startTime = Date.now();
  let stableTime = 0;
  let prevSize = 0;

  while (stableTime < stableThreshold && Date.now() - startTime < timeout) {
    await sleep(checkInterval);
    const currentSize = getFileSize(filePath);
    stableTime =
      currentSize === prevSize && currentSize > 0
        ? stableTime + checkInterval
        : 0;
    prevSize = currentSize;
  }

  return stableTime >= stableThreshold;
};

const waitForFileStable = async (filePath, timeout = 10000) => {
  const checkInterval = 100;
  const stableThreshold = 500;

  const exists = await waitForFileToExist(filePath, timeout, checkInterval);
  if (!exists) return false;

  return waitForFileSizeStable(
    filePath,
    timeout,
    checkInterval,
    stableThreshold,
  );
};

const prepareOutputDir = (outputPath) => {
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (existsSync(outputPath)) {
    unlinkSync(outputPath);
  }
};

const buildChromiumArgs = (url, outputPath, width, height, options) => [
  "--headless",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  `--screenshot=${outputPath}`,
  `--window-size=${width},${height}`,
  "--hide-scrollbars",
  `--default-background-color=${options.backgroundColor}`,
  `--virtual-time-budget=${options.virtualTimeBudget}`,
  "--run-all-compositor-stages-before-draw",
  "--disable-extensions",
  "--disable-background-networking",
  url,
];

const handleChromiumClose = async (
  code,
  outputPath,
  stderr,
  options,
  viewport,
  url,
) => {
  if (options.waitForStable) {
    await waitForFileStable(outputPath, 5000);
  }

  const fileExists = existsSync(outputPath);
  const fileSize = fileExists ? statSync(outputPath).size : 0;

  if (fileExists && fileSize > 0) {
    return { success: true, path: outputPath, url, viewport };
  }
  if (code !== 0) {
    throw new Error(`Chromium exited with code ${code}: ${stderr}`);
  }
  throw new Error(`Screenshot file not created: ${outputPath}`);
};

const takeScreenshotWithChromium = (url, outputPath, viewport, options) => {
  return new Promise((resolve, reject) => {
    const { width, height } = VIEWPORTS[viewport] || VIEWPORTS.desktop;
    prepareOutputDir(outputPath);

    const args = buildChromiumArgs(url, outputPath, width, height, options);
    const chromiumProcess = spawn(findChromium(), args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    chromiumProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      chromiumProcess.kill("SIGKILL");
      reject(new Error(`Screenshot timeout after ${options.timeout}ms`));
    }, options.timeout);

    chromiumProcess.on("close", (code) => {
      clearTimeout(timeoutId);
      handleChromiumClose(code, outputPath, stderr, options, viewport, url)
        .then(resolve)
        .catch(reject);
    });

    chromiumProcess.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to spawn Chromium: ${err.message}`));
    });
  });
};

export const screenshot = async (pagePath, options = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const url = pagePath.startsWith("http")
    ? pagePath
    : `${opts.baseUrl}${pagePath.startsWith("/") ? "" : "/"}${pagePath}`;

  const outputPath =
    opts.outputPath ||
    buildOutputFilename(pagePath, opts.viewport, opts.outputDir);

  log(`Taking screenshot of ${url} (${opts.viewport})`);

  try {
    const result = await takeScreenshotWithChromium(
      url,
      outputPath,
      opts.viewport,
      opts,
    );
    log(`Screenshot saved: ${result.path}`);
    return result;
  } catch (err) {
    logError(`Screenshot failed for ${url}: ${err.message}`);
    throw err;
  }
};

export const screenshotMultiple = async (pagePaths, options = {}) => {
  const results = [];
  const errors = [];

  for (const pagePath of pagePaths) {
    try {
      const result = await screenshot(pagePath, options);
      results.push(result);
    } catch (err) {
      errors.push({ pagePath, error: err.message });
    }
  }

  return { results, errors };
};

export const screenshotAllViewports = async (pagePath, options = {}) => {
  const viewportNames = Object.keys(VIEWPORTS);
  const results = [];
  const errors = [];

  for (const viewport of viewportNames) {
    try {
      const result = await screenshot(pagePath, { ...options, viewport });
      results.push(result);
    } catch (err) {
      errors.push({ pagePath, viewport, error: err.message });
    }
  }

  return { results, errors };
};

export const startServer = async (siteDir, port = 8080) => {
  const serverProcess = Bun.spawn(
    ["bun", "x", "serve", siteDir, "-p", String(port)],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  await sleep(1000);

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

export {
  VIEWPORTS,
  DEFAULT_OPTIONS,
  buildOutputFilename,
  waitForFileStable,
  findChromium,
};
