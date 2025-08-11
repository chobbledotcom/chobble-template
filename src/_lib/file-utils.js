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

	eleventyConfig.addShortcode("render_snippet", (name, defaultString) => {
		// Special handling for opening-times snippet
		if (name === "opening-times") {
			const siteData = require("../src/_data/site.json");
			const openingTimes = siteData.opening_times || [];
			
			if (openingTimes.length === 0) {
				return defaultString || "";
			}
			
			let html = '<ul class="opening-times">\n';
			for (const item of openingTimes) {
				html += `  <li><strong>${item.day}:</strong> ${item.hours}</li>\n`;
			}
			html += '</ul>';
			
			return html;
		}
		
		// Default snippet handling
		return renderSnippet(name, defaultString, process.cwd(), mdRenderer);
	});

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
