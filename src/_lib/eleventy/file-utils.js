import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import markdownIt from "markdown-it";
import { getOpeningTimesHtml } from "#eleventy/opening-times.js";
import { getRecurringEventsHtml } from "#eleventy/recurring-events.js";
import { memoize } from "#utils/memoize.js";

const cacheKeyFromArgs = (args) => args.join(",");

const getDirname = (importMetaUrl) =>
  path.dirname(fileURLToPath(importMetaUrl));

const createMarkdownRenderer = (options = { html: true }) =>
  new markdownIt(options);

const fileExists = memoize(
  (relativePath, baseDir = process.cwd()) => {
    const fullPath = path.join(baseDir, relativePath);
    return fs.existsSync(fullPath);
  },
  { cacheKey: cacheKeyFromArgs },
);

const fileMissing = (relativePath, baseDir = process.cwd()) =>
  !fileExists(relativePath, baseDir);

const readFileContent = memoize(
  (relativePath, baseDir = process.cwd()) => {
    const fullPath = path.join(baseDir, relativePath);
    if (!fs.existsSync(fullPath)) return "";
    return fs.readFileSync(fullPath, "utf8");
  },
  { cacheKey: cacheKeyFromArgs },
);

const extractBodyFromMarkdown = (content) => matter(content).content;

const renderSnippet = memoize(
  async (
    name,
    defaultString = "",
    baseDir = process.cwd(),
    mdRenderer = createMarkdownRenderer(),
  ) => {
    const snippetPath = path.join(baseDir, "src/snippets", `${name}.md`);

    if (!fs.existsSync(snippetPath)) return defaultString;

    const content = fs.readFileSync(snippetPath, "utf8");
    let bodyContent = extractBodyFromMarkdown(content);

    // Preprocess liquid shortcodes
    if (bodyContent.includes("{% opening_times %}")) {
      const openingHtml = await getOpeningTimesHtml();
      bodyContent = bodyContent.replace("{% opening_times %}", openingHtml);
    }

    if (bodyContent.includes("{% recurring_events %}")) {
      const recurringHtml = await getRecurringEventsHtml();
      bodyContent = bodyContent.replace(
        "{% recurring_events %}",
        recurringHtml,
      );
    }

    return mdRenderer.render(bodyContent);
  },
  { cacheKey: cacheKeyFromArgs },
);

const configureFileUtils = (eleventyConfig) => {
  const mdRenderer = createMarkdownRenderer();

  eleventyConfig.addFilter("file_exists", (name) => fileExists(name));

  eleventyConfig.addFilter("file_missing", (name) => fileMissing(name));

  eleventyConfig.addAsyncShortcode(
    "render_snippet",
    async (name, defaultString) =>
      await renderSnippet(name, defaultString, process.cwd(), mdRenderer),
  );

  eleventyConfig.addShortcode("read_file", (relativePath) =>
    readFileContent(relativePath),
  );
};

export {
  getDirname,
  createMarkdownRenderer,
  fileExists,
  fileMissing,
  readFileContent,
  extractBodyFromMarkdown,
  renderSnippet,
  configureFileUtils,
};
