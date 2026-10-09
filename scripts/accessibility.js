/**
 * WCAG 2.2 Level AA checks over a built site.
 *
 * Every page in the output directory is parsed and run through axe-core with
 * the WCAG 2.0/2.1/2.2 A and AA rule sets. Because the whole site is checked
 * after it is built, this covers the pages a site actually publishes — the
 * block gallery included, which renders every block type, so a block cannot
 * ship an accessibility defect without a page failing here.
 *
 * axe binds `window` and `document` into its own scope the moment it is
 * imported. In a realm that already has them - a happy-dom test environment,
 * say - it would audit that realm's document instead of the page in hand, and
 * report a missing title on every page. Rather than mis-report, this refuses
 * to run there; the CLI and its tests both run in plain Node, where axe has no
 * document until it is handed one.
 *
 * What this does NOT cover: axe reports colour contrast as "incomplete"
 * outside a real browser, because contrast needs rendered pixels. Contrast is
 * a property of the theme's colour tokens rather than of the markup, so it is
 * checked against the design, and conformance is signed off with the manual
 * keyboard and screen-reader pass this check supports rather than replaces.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import axe from "axe-core";
import { Window } from "happy-dom";
import { globSync } from "tinyglobby";

/**
 * Whether axe found a document already in scope when it was imported, in which
 * case it is bound to that one for the life of the process.
 */
const AXE_BOUND_TO_ANOTHER_DOCUMENT =
  typeof globalThis.document !== "undefined";

/** The rule sets that together are WCAG 2.2 Level AA. */
const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * @typedef {{ page: string, rule: string, impact: string, help: string, helpUrl: string, targets: string[] }} A11yViolation
 * @typedef {{ pageCount: number, violations: A11yViolation[] }} A11yReport
 */

/**
 * The page's root element, which is what axe deduces its document and window
 * from. happy-dom's element types are its own rather than the DOM library's
 * that axe's typings are written against; the value is exactly what axe asks
 * for, and only the two type worlds disagree.
 * @param {import("happy-dom").Window} window
 * @returns {any}
 */
const rootElement = (window) => window.document.documentElement;

/**
 * Every WCAG A/AA violation on one page of HTML.
 * @param {string} html - The page's markup
 * @param {string} page - Site-relative path, naming where a violation is
 * @returns {Promise<A11yViolation[]>}
 */
const auditHtml = async (html, page) => {
  if (AXE_BOUND_TO_ANOTHER_DOCUMENT) {
    throw new Error(
      "The accessibility check needs a realm with no document of its own, " +
        "because axe binds to the one it finds when imported. Run it in Node " +
        "(in vitest: // @vitest-environment node).",
    );
  }
  const window = new Window({ url: "https://audit.invalid/" });
  window.document.write(html);
  try {
    // axe is handed the page's root element rather than its document: from an
    // element it deduces the document and window it belongs to, and clears
    // them again afterwards, so each page is audited in isolation and no
    // browser globals are set on the process.
    const { violations } = await axe.run(rootElement(window), {
      runOnly: { type: "tag", values: WCAG_AA_TAGS },
      resultTypes: ["violations"],
    });
    return violations.map((violation) => ({
      page,
      rule: violation.id,
      impact: violation.impact ? violation.impact : "unknown",
      help: violation.help,
      helpUrl: violation.helpUrl,
      targets: violation.nodes.map((node) => String(node.target)),
    }));
  } finally {
    await window.happyDOM.close();
  }
};

/**
 * Every WCAG A/AA violation across a built site, page by page. Pages are
 * audited one at a time: each needs its own window, and holding forty of them
 * open at once costs far more than the wall-clock it would save.
 * @param {string} outputDir - A built site directory
 * @returns {Promise<A11yReport>}
 */
const auditSite = async (outputDir) => {
  const pages = globSync("**/*.html", { cwd: outputDir, onlyFiles: true });
  if (pages.length === 0) {
    throw new Error(`No HTML pages found to check in: ${outputDir}`);
  }
  const found = [];
  for (const page of pages.toSorted()) {
    const html = readFileSync(join(outputDir, page), "utf8");
    found.push(await auditHtml(html, page));
  }
  return { pageCount: pages.length, violations: found.flat() };
};

/**
 * One violation as the lines a reader needs to fix it: what broke, where, and
 * the rule's own explanation.
 * @param {A11yViolation} violation
 * @returns {string[]}
 */
const formatViolation = (violation) => [
  `  ${violation.page}: ${violation.rule} (${violation.impact})`,
  `    ${violation.help}`,
  ...violation.targets.map((target) => `    at ${target}`),
  `    ${violation.helpUrl}`,
];

/**
 * The whole report, ready to print.
 * @param {A11yReport} report
 * @returns {string}
 */
const formatReport = ({ pageCount, violations }) => {
  if (violations.length === 0) {
    return `Accessibility check passed: no WCAG 2.2 AA violations across ${pageCount} page(s)`;
  }
  return [
    `WCAG 2.2 AA violations (${violations.length}):`,
    ...violations.flatMap(formatViolation),
    "",
    "Fix the markup each rule names. These are the checks a site built from",
    "this template is expected to pass before it is published.",
  ].join("\n");
};

/**
 * Audit a built site and report, returning the process exit code.
 * @param {string} outputDir - A built site directory
 * @param {Pick<Console, "log" | "error">} [output]
 * @returns {Promise<number>}
 */
const runAccessibilityCheck = async (outputDir, output = console) => {
  const report = await auditSite(outputDir);
  const text = formatReport(report);
  if (report.violations.length === 0) {
    output.log(text);
    return 0;
  }
  output.error(text);
  return 1;
};

export {
  auditHtml,
  auditSite,
  formatReport,
  runAccessibilityCheck,
  WCAG_AA_TAGS,
};
