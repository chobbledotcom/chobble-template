import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import markdownIt from "markdown-it";
import { getOpeningTimesHtml } from "#eleventy/opening-times.js";
import { getRecurringEventsHtml } from "#eleventy/recurring-events.js";
import { memoize } from "#utils/memoize.js";

const createMarkdownRenderer = (options = { html: true }) =>
  new markdownIt(options);

const cacheKeyFromArgs = (args) => args.join(",");

const resolvePath = (relativePath, baseDir = process.cwd()) =>
  path.join(baseDir, relativePath);

const fileExists = memoize(
  (relativePath, baseDir) => fs.existsSync(resolvePath(relativePath, baseDir)),
  { cacheKey: cacheKeyFromArgs },
);

const fileMissing = (relativePath, baseDir) =>
  !fileExists(relativePath, baseDir);

const readFileContent = memoize(
  (relativePath, baseDir) => {
    const fullPath = resolvePath(relativePath, baseDir);
    if (!fs.existsSync(fullPath)) return "";
    return fs.readFileSync(fullPath, "utf8");
  },
  { cacheKey: cacheKeyFromArgs },
);

const renderSnippet = memoize(
  async (
    name,
    defaultString = "",
    baseDir = process.cwd(),
    mdRenderer = createMarkdownRenderer(),
  ) => {
    const snippetPath = path.join(baseDir, "src/snippets", `${name}.md`);

    if (!fs.existsSync(snippetPath)) return defaultString;

    const rawContent = matter.read(snippetPath).content;

    // Preprocess liquid shortcodes using pure functional transformations
    const replaceIfPresent = async (content, pattern, getHtml) =>
      content.includes(pattern)
        ? content.replace(pattern, await getHtml())
        : content;

    const withOpening = await replaceIfPresent(
      rawContent,
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
  createMarkdownRenderer,
  fileExists,
  fileMissing,
  readFileContent,
  renderSnippet,
  configureFileUtils,
};
