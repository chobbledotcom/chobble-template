import {
  buildOutputPath,
  buildUrl,
  createOperationContext,
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  frozenObject,
  getChromePath,
  getDefaultOutputDir,
  launchChromeHeadless,
  log,
  pathErrorInfo,
  prepareOutputDir,
  runBatchOperations,
  sanitizePagePath,
  startServer,
} from "#media/browser-utils.js";

const CATEGORIES = frozenObject({
  performance: "performance",
  accessibility: "accessibility",
  "best-practices": "best-practices",
  seo: "seo",
});

const DEFAULT_OPTIONS = frozenObject({
  outputDir: getDefaultOutputDir("lighthouse-reports"),
  outputPath: null,
  baseUrl: DEFAULT_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  categories: Object.keys(CATEGORIES),
  format: "html",
  onlyCategories: null,
  thresholds: null,
});

export const runLighthouse = async (url, outputPath, options) => {
  const runLighthouseAudit = async (chrome) => {
    const lighthouseFn = (await import("lighthouse")).default;
    return lighthouseFn(
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
  };

  const extractScores = (lhr) => ({
    performance: lhr.categories.performance?.score,
    accessibility: lhr.categories.accessibility?.score,
    "best-practices": lhr.categories["best-practices"]?.score,
    seo: lhr.categories.seo?.score,
  });

  const checkThresholds = (scores, thresholds) => {
    if (!thresholds) return { passed: true, failures: [] };
    const failures = Object.entries(thresholds)
      .filter(([cat, min]) => scores[cat] !== null && scores[cat] < min)
      .map(([cat, min]) => ({
        category: cat,
        actual: Math.round(scores[cat] * 100),
        expected: Math.round(min * 100),
      }));
    return { passed: failures.length === 0, failures };
  };

  prepareOutputDir(outputPath);
  const chrome = await launchChromeHeadless(await getChromePath());

  try {
    const { report, lhr } = await runLighthouseAudit(chrome);
    await Bun.write(outputPath, report);
    const scores = extractScores(lhr);
    return {
      success: true,
      path: outputPath,
      url,
      scores,
      thresholds: checkThresholds(scores, options.thresholds),
      finalUrl: lhr.finalDisplayedUrl,
    };
  } finally {
    await chrome.kill();
  }
};

export const lighthouse = async (pagePath, options = {}) => {
  const formatExtension = (fmt) =>
    ({ html: "html", json: "json", csv: "csv" })[fmt] || "html";
  const buildReportPath = (opts, path) =>
    buildOutputPath(path, {
      outputDir: opts.outputDir,
      extension: formatExtension(opts.format),
    });

  const { opts, url, outputPath } = createOperationContext(
    pagePath,
    DEFAULT_OPTIONS,
    options,
    buildReportPath,
  );
  log(`Running Lighthouse on ${url}`);

  const result = await runLighthouse(url, outputPath, opts);
  const formatScore = (s) => (s === null ? "N/A" : `${Math.round(s * 100)}`);
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
    pathErrorInfo(pagePaths),
  );

export const getCategories = () => ({ ...CATEGORIES });

// Re-export shared utilities
export { buildUrl, sanitizePagePath, startServer };
