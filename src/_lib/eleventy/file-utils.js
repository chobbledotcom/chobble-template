import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import markdownIt from "markdown-it";
import { getOpeningTimesHtml } from "#eleventy/opening-times.js";
import { getRecurringEventsHtml } from "#eleventy/recurring-events.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { processLiquidStrings } from "#utils/liquid-render.js";

/**
 * @typedef {{ context: { environments: Record<string, unknown> } }} LiquidFilterContext
 * @typedef {() => Promise<string>} AsyncHtmlProvider
 * @typedef {{ blocks?: Record<string, unknown>[] } & Record<string, unknown>} SnippetData
 */

/** @type {AsyncHtmlProvider} */
const getOpeningHtml = /** @type {any} */ (getOpeningTimesHtml);
/** @type {AsyncHtmlProvider} */
const getRecurringHtml = /** @type {any} */ (getRecurringEventsHtml);

/** @param {unknown[]} args */
const cacheKeyFromArgs = (args) => args.join(",");

/**
 * @param {string} relativePath
 * @param {string} [baseDir]
 */
const resolvePath = (relativePath, baseDir = process.cwd()) =>
  path.join(baseDir, relativePath);

/** @param {string} dirPath */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

const fileExists = memoize(
  /**
   * @param {string} relativePath
   * @param {string} baseDir
   */
  (relativePath, baseDir) => fs.existsSync(resolvePath(relativePath, baseDir)),
  { cacheKey: cacheKeyFromArgs },
);

const readFileContent = memoize(
  /**
   * @param {string} relativePath
   * @param {string} baseDir
   */
  (relativePath, baseDir) => {
    const fullPath = resolvePath(relativePath, baseDir);
    if (!fs.existsSync(fullPath)) return "";
    return fs.readFileSync(fullPath, "utf8");
  },
  { cacheKey: cacheKeyFromArgs },
);

/**
 * @param {string} name
 * @param {string} [baseDir]
 */
const loadSnippet = (name, baseDir = process.cwd()) => {
  const snippetPath = path.join(baseDir, "src/snippets", `${name}.md`);
  return fs.existsSync(snippetPath) ? matter.read(snippetPath) : null;
};

const readSnippetData = memoize(
  /**
   * @param {string} name
   * @param {string} [baseDir]
   * @returns {SnippetData}
   */
  (name, baseDir = process.cwd()) => {
    const parsed = loadSnippet(name, baseDir);
    return parsed ? parsed.data : {};
  },
  { cacheKey: cacheKeyFromArgs },
);

/**
 * @param {string} content
 * @param {string} pattern
 * @param {AsyncHtmlProvider} getHtml
 */
const replaceIfPresent = async (content, pattern, getHtml) =>
  content.includes(pattern)
    ? content.replace(pattern, await getHtml())
    : content;

const renderSnippet = memoize(
  /**
   * @param {string} name
   * @param {string} [defaultString]
   * @param {string} [baseDir]
   * @param {ReturnType<typeof markdownIt>} [mdRenderer]
   */
  async (
    name,
    defaultString = "",
    baseDir = process.cwd(),
    mdRenderer = new markdownIt({ html: true }),
  ) => {
    const parsed = loadSnippet(name, baseDir);
    if (!parsed) return defaultString;

    const withOpening = await replaceIfPresent(
      parsed.content,
      "{% opening_times %}",
      getOpeningHtml,
    );
    const processed = await replaceIfPresent(
      withOpening,
      "{% recurring_events %}",
      getRecurringHtml,
    );

    return mdRenderer.render(processed);
  },
  { cacheKey: cacheKeyFromArgs },
);

/** @param {string} name */
const fileExistsFilter = (name) => fileExists(name);

/** @param {string} name */
const fileMissingFilter = (name) => !fileExists(name);

/** @param {string} name */
const snippetDataFilter = (name) => readSnippetData(name);

/**
 * @this {LiquidFilterContext}
 * @param {string} name
 */
async function snippetBlocksFilter(name) {
  const data = readSnippetData(name);
  if (!data?.blocks) return [];
  return processLiquidStrings(data.blocks, this.context.environments);
}

/** @param {string} str */
const escapeHtmlFilter = (str) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * @param {string} name
 * @param {string} defaultString
 * @param {ReturnType<typeof markdownIt>} mdRenderer
 */
const renderSnippetShortcode = async (name, defaultString, mdRenderer) =>
  await renderSnippet(name, defaultString, process.cwd(), mdRenderer);

/** @param {string} relativePath */
const readFileShortcode = (relativePath) => readFileContent(relativePath);

/**
 * @param {{ addFilter: Function, addAsyncFilter: Function, addShortcode: Function, addAsyncShortcode: Function }} eleventyConfig
 */
const configureFileUtils = (eleventyConfig) => {
  const mdRenderer = new markdownIt({ html: true });

  eleventyConfig.addFilter("file_exists", fileExistsFilter);
  eleventyConfig.addFilter("file_missing", fileMissingFilter);
  eleventyConfig.addFilter("snippet_data", snippetDataFilter);
  eleventyConfig.addAsyncFilter("snippet_blocks", snippetBlocksFilter);
  eleventyConfig.addFilter("escape_html", escapeHtmlFilter);

  eleventyConfig.addAsyncShortcode(
    "render_snippet",
    /**
     * @param {string} name
     * @param {string} defaultString
     */
    async (name, defaultString) =>
      await renderSnippetShortcode(name, defaultString, mdRenderer),
  );

  eleventyConfig.addShortcode("read_file", readFileShortcode);
};

export { configureFileUtils, ensureDir };
