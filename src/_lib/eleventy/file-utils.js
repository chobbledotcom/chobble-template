import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Liquid } from "liquidjs";
import markdownIt from "markdown-it";
import { getOpeningTimesHtml } from "#eleventy/opening-times.js";
import { getRecurringEventsHtml } from "#eleventy/recurring-events.js";
import { memoize } from "#toolkit/fp/memoize.js";

const snippetLiquid = new Liquid();

const cacheKeyFromArgs = (args) => args.join(",");

const resolvePath = (relativePath, baseDir = process.cwd()) =>
  path.join(baseDir, relativePath);

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

const fileExists = memoize(
  (relativePath, baseDir) => fs.existsSync(resolvePath(relativePath, baseDir)),
  { cacheKey: cacheKeyFromArgs },
);

const readFileContent = memoize(
  (relativePath, baseDir) => {
    const fullPath = resolvePath(relativePath, baseDir);
    if (!fs.existsSync(fullPath)) return "";
    return fs.readFileSync(fullPath, "utf8");
  },
  { cacheKey: cacheKeyFromArgs },
);

const loadSnippet = (name, baseDir = process.cwd()) => {
  const snippetPath = path.join(baseDir, "src/snippets", `${name}.md`);
  return fs.existsSync(snippetPath) ? matter.read(snippetPath) : null;
};

const readSnippetData = memoize(
  (name, baseDir = process.cwd()) => {
    const parsed = loadSnippet(name, baseDir);
    return parsed ? parsed.data : {};
  },
  { cacheKey: cacheKeyFromArgs },
);

/**
 * Recursively process all string values in a data structure through Liquid,
 * resolving template expressions like {{ title }} against the provided context.
 * Non-string values (numbers, booleans, null) are returned unchanged.
 */
const processLiquidStrings = async (value, context) => {
  if (typeof value === "string") {
    return value.includes("{{") || value.includes("{%")
      ? snippetLiquid.parseAndRender(value, context)
      : value;
  }
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => processLiquidStrings(item, context)),
    );
  }
  if (value !== null && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [
        k,
        await processLiquidStrings(v, context),
      ]),
    );
    return Object.fromEntries(entries);
  }
  return value;
};

const renderSnippet = memoize(
  async (
    name,
    defaultString = "",
    baseDir = process.cwd(),
    mdRenderer = new markdownIt({ html: true }),
  ) => {
    const parsed = loadSnippet(name, baseDir);
    if (!parsed) return defaultString;

    // Preprocess liquid shortcodes using pure functional transformations
    const replaceIfPresent = async (content, pattern, getHtml) =>
      content.includes(pattern)
        ? content.replace(pattern, await getHtml())
        : content;

    const withOpening = await replaceIfPresent(
      parsed.content,
      "{% opening_times %}",
      getOpeningTimesHtml,
    );
    const processed = await replaceIfPresent(
      withOpening,
      "{% recurring_events %}",
      getRecurringEventsHtml,
    );

    return mdRenderer.render(processed);
  },
  { cacheKey: cacheKeyFromArgs },
);

const configureFileUtils = (eleventyConfig) => {
  const mdRenderer = new markdownIt({ html: true });

  eleventyConfig.addFilter("file_exists", (name) => fileExists(name));

  eleventyConfig.addFilter("file_missing", (name) => !fileExists(name));

  eleventyConfig.addFilter("snippet_data", (name) => readSnippetData(name));

  eleventyConfig.addAsyncFilter(
    "snippet_blocks_with_context",
    async function (name) {
      const data = readSnippetData(name);
      if (!data?.blocks) return [];
      return processLiquidStrings(data.blocks, this.context.environments);
    },
  );

  eleventyConfig.addFilter("escape_html", (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;"),
  );

  eleventyConfig.addAsyncShortcode(
    "render_snippet",
    async (name, defaultString) =>
      await renderSnippet(name, defaultString, process.cwd(), mdRenderer),
  );

  eleventyConfig.addShortcode("read_file", (relativePath) =>
    readFileContent(relativePath),
  );
};

export { configureFileUtils, ensureDir };
