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

const CATEGORIES = {
  performance: "performance",
  accessibility: "accessibility",
  "best-practices": "best-practices",
  seo: "seo",
};

const DEFAULT_OPTIONS = {
  outputDir: getDefaultOutputDir("lighthouse-reports"),
  outputPath: null,
  baseUrl: DEFAULT_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  categories: Object.keys(CATEGORIES),
  format: "html",
  onlyCategories: null,
  thresholds: null,
};

const formatScore = (score) =>
  score === null ? "N/A" : `${Math.round(score * 100)}`;

const extractScores = (lhr) => ({
  performance: lhr.categories.performance?.score,
  accessibility: lhr.categories.accessibility?.score,
  "best-practices": lhr.categories["best-practices"]?.score,
  seo: lhr.categories.seo?.score,
});

const checkThresholds = (scores, thresholds) => {
  if (!thresholds) return { passed: true, failures: [] };

  const failures = [];
  for (const [category, minScore] of Object.entries(thresholds)) {
    const score = scores[category];
    if (score !== null && score < minScore) {
      failures.push({
        category,
        actual: Math.round(score * 100),
        expected: Math.round(minScore * 100),
      });
    }
  }
  return { passed: failures.length === 0, failures };
};

const getPlaywrightChromiumPath = async () => {
  const { chromium } = await import("playwright");
  return chromium.executablePath();
};

export const runLighthouse = async (url, outputPath, options) => {
  const lighthouse = (await import("lighthouse")).default;
  const chromeLauncher = await import("chrome-launcher");

  prepareOutputDir(outputPath);

  // Use Playwright's bundled Chromium if CHROME_PATH not set
  const chromePath =
    process.env.CHROME_PATH || (await getPlaywrightChromiumPath());

  const chrome = await chromeLauncher.launch({
    chromePath,
    chromeFlags: ["--headless", ...BROWSER_ARGS],
  });

  try {
    const runnerResult = await lighthouse(
      url,
      {
        port: chrome.port,
        output: options.format,
        logLevel: "error",
        onlyCategories: options.onlyCategories || options.categories,
      },
      {
        extends: "lighthouse:default",
        settings: {
          maxWaitForFcp: options.timeout,
          maxWaitForLoad: options.timeout,
        },
      },
    );

    const report = runnerResult.report;
    const lhr = runnerResult.lhr;

    await Bun.write(outputPath, report);

    const scores = extractScores(lhr);
    const thresholdResult = checkThresholds(scores, options.thresholds);

    return {
      success: true,
      path: outputPath,
      url,
      scores,
      thresholds: thresholdResult,
      finalUrl: lhr.finalDisplayedUrl,
    };
  } finally {
    await chrome.kill();
  }
};

const formatExtension = (format) => {
  const extensions = { html: "html", json: "json", csv: "csv" };
  return extensions[format] || "html";
};

export const lighthouse = async (pagePath, options = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const url = buildUrl(pagePath, opts.baseUrl);

  const outputPath =
    opts.outputPath ||
    buildOutputPath(opts.outputDir, pagePath, "", formatExtension(opts.format));

  log(`Running Lighthouse on ${url}`);

  const result = await runLighthouse(url, outputPath, opts);

  const scoreStr = Object.entries(result.scores)
    .map(([k, v]) => `${k}: ${formatScore(v)}`)
    .join(", ");

  log(`Lighthouse complete: ${scoreStr}`);
  log(`Report saved: ${result.path}`);

  return result;
};

export const lighthouseMultiple = (pagePaths, options = {}) =>
  runBatchOperations(
    pagePaths,
    (pagePath) => lighthouse(pagePath, options),
    (i, reason) => ({ pagePath: pagePaths[i], error: reason.message }),
  );

export const lighthouseAllCategories = async (pagePath, options = {}) => {
  // Run lighthouse once - it includes all categories by default
  const result = await lighthouse(pagePath, {
    ...options,
    categories: Object.keys(CATEGORIES),
  });
  return {
    results: [result],
    errors: [],
  };
};

export const getCategories = () => ({ ...CATEGORIES });
export const getDefaultOptions = () => ({ ...DEFAULT_OPTIONS });

// Re-export shared utilities
export { buildUrl, sanitizePagePath, startServer };
