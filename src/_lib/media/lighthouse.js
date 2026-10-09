import { writeFileSync } from "node:fs";
/* jscpd:ignore-start -- shared browser automation import block */
import {
  buildUrl,
  createBatchRunner,
  createPathContext,
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  frozenObject,
  getChromePath,
  getDefaultOutputDir,
  launchChromeHeadless,
  log,
  prepareOutputDir,
  sanitizePagePath,
  startServer,
} from "#media/browser-utils.js";

/* jscpd:ignore-end */

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

/** @typedef {import("#media/browser-utils.js").OperationContext<typeof DEFAULT_OPTIONS>} LighthouseContext */

/** @type {Record<string, string>} */
const FORMAT_EXTENSIONS = { html: "html", json: "json", csv: "csv" };

/**
 * @param {string} url
 * @param {string} outputPath
 * @param {{ format?: string, onlyCategories?: string[] | null, categories?: string[], timeout?: number, thresholds?: Record<string, number> | null }} options
 */
export const runLighthouse = async (url, outputPath, options) => {
  /** @param {{ port: number }} chrome */
  const runLighthouseAudit = async (chrome) => {
    const lighthouseFn = (await import("lighthouse")).default;
    return lighthouseFn(
      url,
      {
        port: chrome.port,
        output:
          options.format === "json" || options.format === "csv"
            ? options.format
            : "html",
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

  /** @param {any} lhr */
  const extractScores = (lhr) => ({
    performance: lhr.categories.performance?.score,
    accessibility: lhr.categories.accessibility?.score,
    "best-practices": lhr.categories["best-practices"]?.score,
    seo: lhr.categories.seo?.score,
  });

  /**
   * @param {Record<string, number | null | undefined>} scores
   * @param {Record<string, number> | null | undefined} thresholds
   */
  const checkThresholds = (scores, thresholds) => {
    if (!thresholds) return { passed: true, failures: [] };
    const failures = Object.entries(thresholds).flatMap(([cat, min]) => {
      const actual = scores[cat];
      return actual !== null && actual !== undefined && actual < min
        ? [
            {
              category: cat,
              actual: Math.round(actual * 100),
              expected: Math.round(min * 100),
            },
          ]
        : [];
    });
    return { passed: failures.length === 0, failures };
  };

  /** @param {{ port: number }} chrome */
  const auditAndReport = async (chrome) => {
    const result = await runLighthouseAudit(chrome);
    if (!result) throw new Error(`Lighthouse returned no result for ${url}`);
    writeFileSync(
      outputPath,
      Array.isArray(result.report) ? result.report.join("") : result.report,
    );
    const scores = extractScores(result.lhr);
    return {
      success: true,
      path: outputPath,
      url,
      scores,
      thresholds: checkThresholds(scores, options.thresholds),
      finalUrl: result.lhr.finalDisplayedUrl,
    };
  };

  prepareOutputDir(outputPath);
  const chrome = await launchChromeHeadless(await getChromePath());

  try {
    return await auditAndReport(chrome);
  } finally {
    await chrome.kill();
  }
};

/**
 * @param {string} pagePath
 * @param {object} [options]
 */
export const lighthouse = async (pagePath, options = {}) => {
  /** @param {string} fmt */
  const formatExtension = (fmt) => FORMAT_EXTENSIONS[fmt] || "html";
  const context = createPathContext(pagePath, DEFAULT_OPTIONS, options, {
    extension: (opts) => formatExtension(opts.format),
  });
  log(`Running Lighthouse on ${context.url}`);

  const result = await runLighthouse(
    context.url,
    context.outputPath,
    context.opts,
  );
  /** @param {number | null} s */
  const formatScore = (s) => (s === null ? "N/A" : `${Math.round(s * 100)}`);
  const scoreStr = Object.entries(result.scores)
    .map(([k, v]) => `${k}: ${formatScore(v)}`)
    .join(", ");

  log(`Lighthouse complete: ${scoreStr}`);
  log(`Report saved: ${result.path}`);
  return result;
};

export const lighthouseMultiple = createBatchRunner(lighthouse);

export const getCategories = () => ({ ...CATEGORIES });

// Re-export shared utilities
export { buildUrl, sanitizePagePath, startServer };
