import fs from "fs";
import markdownIt from "markdown-it";
import path from "path";
import { getOpeningTimesHtml } from "./opening-times.js";
import { getRecurringEventsHtml } from "./recurring-events.js";

const createMarkdownRenderer = (options = { html: true }) =>
  new markdownIt(options);

const fileExists = (relativePath, baseDir = process.cwd()) => {
  const fullPath = path.join(baseDir, relativePath);
  return fs.existsSync(fullPath);
};

const fileMissing = (relativePath, baseDir = process.cwd()) =>
  !fileExists(relativePath, baseDir);

const readFileContent = (relativePath, baseDir = process.cwd()) => {
  const fullPath = path.join(baseDir, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf8");
};

const extractBodyFromMarkdown = (content) => {
  const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(content);
  return hasFrontmatter
    ? content.replace(/^---\n[\s\S]*?\n---\n?/, "")
    : content;
};

const renderSnippet = async (
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
    bodyContent = bodyContent.replace("{% recurring_events %}", recurringHtml);
  }

  return mdRenderer.render(bodyContent);
};

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
  createMarkdownRenderer,
  fileExists,
  fileMissing,
  readFileContent,
  extractBodyFromMarkdown,
  renderSnippet,
  configureFileUtils,
};
