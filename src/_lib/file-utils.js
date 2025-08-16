const fs = require("fs");
const path = require("path");
const markdownIt = require("markdown-it");
const { getOpeningTimesHtml } = require("./opening-times");
const { getRecurringEventsHtml } = require("./recurring-events");

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

const renderSnippet = (
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
		const openingHtml = getOpeningTimesHtml();
		bodyContent = bodyContent.replace("{% opening_times %}", openingHtml);
	}
	
	if (bodyContent.includes("{% recurring_events %}")) {
		const recurringHtml = getRecurringEventsHtml();
		bodyContent = bodyContent.replace("{% recurring_events %}", recurringHtml);
	}

	return mdRenderer.render(bodyContent);
};

const configureFileUtils = (eleventyConfig) => {
	const mdRenderer = createMarkdownRenderer();

	eleventyConfig.addFilter("file_exists", (name) => fileExists(name));

	eleventyConfig.addFilter("file_missing", (name) => fileMissing(name));

	eleventyConfig.addShortcode("render_snippet", (name, defaultString) =>
		renderSnippet(name, defaultString, process.cwd(), mdRenderer),
	);

	eleventyConfig.addShortcode("read_file", (relativePath) =>
		readFileContent(relativePath),
	);
};

module.exports = {
	createMarkdownRenderer,
	fileExists,
	fileMissing,
	readFileContent,
	extractBodyFromMarkdown,
	renderSnippet,
	configureFileUtils,
};
