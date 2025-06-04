const fs = require("fs");
const path = require("path");
const markdownIt = require("markdown-it");

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
	const bodyContent = extractBodyFromMarkdown(content);

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
