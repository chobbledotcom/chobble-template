import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import markdownIt from "markdown-it";
import { registerFilters } from "#eleventy/register.js";
import { toBlockArray } from "#utils/block-columns.js";
import { normaliseBlocks } from "#utils/block-schema.js";
import { memoize } from "#utils/fp/memoize.js";
import { processLiquidStrings } from "#utils/liquid-render.js";
import { validateSidebarBlocks } from "#utils/sidebar-blocks.js";

/**
 * @typedef {{ type: string, content: string }} MarkdownToken
 * @typedef {{ children?: MarkdownToken[] }} MarkdownBlockToken
 * @typedef {{ tokens: MarkdownBlockToken[] }} MarkdownState
 */

/** @param {MarkdownBlockToken} token */
const stripTokenMarkers = (token) => {
  if (!token.children) return;
  for (const child of token.children) {
    if (child.type === "text") {
      child.content = child.content.replace(/\+\+/g, "");
    }
  }
};

/** @param {MarkdownState} state */
const stripPlusPlusRule = (state) => {
  for (const token of state.tokens) {
    stripTokenMarkers(token);
  }
};

/** @param {any} md */
const stripPlusPlus = (md) => {
  md.core.ruler.after("inline", "strip_plus_plus", stripPlusPlusRule);
};

/**
 * Disable indented code blocks so HTML emitted by Liquid includes inside
 * markdown content is never escaped into a code block. Fenced ``` blocks
 * still work for intentional code samples.
 * @param {any} md
 */
const disableIndentedCode = (md) => {
  md.disable("code");
};

/**
 * Require a blank line before a list. Front matter content is hard-wrapped at
 * 80 chars, so a wrapped prose sentence often continues on a line that starts
 * with a dash (e.g. "- and then..."). CommonMark normally lets such a line
 * interrupt a paragraph and turn into a bullet list. We refuse that
 * interruption, so a marker only starts a list when it follows a blank line.
 *
 * The guard fires only for top-level paragraphs (`listIndent < 0`): inside a
 * list, the same paragraph-terminator mechanism is what separates one item
 * from the next, so list items, nested lists and blank-line-separated lists
 * all keep working.
 * @param {any} md
 */
const requireBlankLineBeforeLists = (md) => {
  const { ruler } = md.block;
  // Capture the original rule before ruler.at() replaces it in place;
  // ruler.at() mutates the rule object, so reading `.fn` afterwards would
  // point back at this wrapper and recurse forever.
  const { fn: listRule, alt } = ruler.__rules__[ruler.__find__("list")];
  ruler.at(
    "list",
    /**
     * @param {any} state
     * @param {number} startLine
     * @param {number} endLine
     * @param {boolean} silent
     */
    (state, startLine, endLine, silent) => {
      if (silent && state.parentType === "paragraph" && state.listIndent < 0) {
        return false;
      }
      return listRule(state, startLine, endLine, silent);
    },
    { alt: alt.slice() },
  );
};

/** @param {any} md */
const amendMarkdown = (md) => {
  stripPlusPlus(md);
  disableIndentedCode(md);
  requireBlankLineBeforeLists(md);
};

const createMarkdownRenderer = () => {
  const md = new markdownIt({ html: true });
  amendMarkdown(md);
  return md;
};

/**
 * @typedef {{ context: { environments: Record<string, unknown> } }} LiquidFilterContext
 * @typedef {() => Promise<string>} AsyncHtmlProvider
 * @typedef {{ blocks?: Record<string, unknown>[] } & Record<string, unknown>} SnippetData
 */

/** @param {unknown[]} args */
const cacheKeyFromArgs = (args) => args.join(",");

/** @param {string} dirPath */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

/**
 * Snippet file path for a reference: a bare name, or the
 * `src/snippets/<name>.md` path Pages CMS saves. A page in another language
 * reads that language's own version, `src/snippets/<code>/<name>.md`, when
 * the site has written one, and the shared snippet otherwise.
 * @param {string} name
 * @param {string} baseDir
 * @param {string} [language] - The page language's code
 */
const snippetPath = (name, baseDir, language = "") => {
  const file = `${path.basename(name, path.extname(name))}.md`;
  const localised = path.join(baseDir, "src/snippets", language, file);
  return language && fs.existsSync(localised)
    ? localised
    : path.join(baseDir, "src/snippets", file);
};

/** @param {string} file - A snippet path from snippetPath */
const loadSnippet = (file) => (fs.existsSync(file) ? matter.read(file) : null);

const readSnippetData = memoize(
  /**
   * A snippet's frontmatter, empty when the snippet does not exist. Its
   * `blocks` are validated and default-filled exactly like page blocks.
   * @param {string} name
   * @param {string} [baseDir]
   * @param {string} [language]
   * @returns {SnippetData}
   */
  (name, baseDir = process.cwd(), language = "") => {
    const data = loadSnippet(snippetPath(name, baseDir, language))?.data;
    if (!data) return {};
    if (!data.blocks) return data;
    return {
      ...data,
      blocks: normaliseBlocks(data.blocks, ` in snippet "${name}"`),
    };
  },
  { cacheKey: cacheKeyFromArgs },
);

const renderSnippet = memoize(
  /**
   * @param {string} name
   * @param {string} [defaultString]
   * @param {string} [baseDir]
   * @param {ReturnType<typeof markdownIt>} [mdRenderer]
   * @param {string} [language]
   */
  async (
    name,
    defaultString = "",
    baseDir = process.cwd(),
    mdRenderer = createMarkdownRenderer(),
    language = "",
  ) => {
    const parsed = loadSnippet(snippetPath(name, baseDir, language));
    if (!parsed) return defaultString;

    return mdRenderer.render(parsed.content);
  },
  { cacheKey: cacheKeyFromArgs },
);

/**
 * @param {string} name
 * @param {string} [language] - The page language's code
 */
const snippetDataFilter = (name, language = "") =>
  readSnippetData(name, process.cwd(), language);

/**
 * The blocks a `snippet` block renders. The referenced snippet must exist:
 * a dangling reference fails the build instead of silently rendering
 * nothing. Liquid in the blocks resolves in blocks.html, like page blocks.
 * @param {string} name
 * @param {string} [language] - The page language's code
 */
const snippetBlocksFilter = (name, language = "") => {
  if (!fs.existsSync(snippetPath(name, process.cwd(), language))) {
    throw new Error(
      `Snippet block references "${name}", but src/snippets/ has no such snippet`,
    );
  }
  return toBlockArray(readSnippetData(name, process.cwd(), language).blocks);
};

/**
 * The optional right-content sidebar's blocks, restricted to column-safe
 * types, with Liquid resolved against the page (they render without
 * blocks.html).
 *
 * @this {LiquidFilterContext}
 * @param {string} name
 * @param {string} [language] - The page language's code
 */
async function sidebarBlocksFilter(name, language = "") {
  return processLiquidStrings(
    validateSidebarBlocks(
      readSnippetData(name, process.cwd(), language).blocks,
    ),
    this.context.environments,
  );
}

/**
 * @this {LiquidFilterContext}
 * @param {Record<string, unknown>[] | undefined | null} blocks
 */
async function renderBlockLiquidFilter(blocks) {
  if (!blocks) return [];
  return processLiquidStrings(blocks, this.context.environments);
}

/**
 * @param {string} name
 * @param {string} defaultString
 * @param {ReturnType<typeof markdownIt>} mdRenderer
 * @param {string} [language] - The page language's code
 */
const renderSnippetShortcode = async (
  name,
  defaultString,
  mdRenderer,
  language = "",
) =>
  await renderSnippet(name, defaultString, process.cwd(), mdRenderer, language);

/**
 * @param {{ addFilter: Function, addAsyncFilter: Function, addShortcode: Function, addAsyncShortcode: Function }} eleventyConfig
 */
const configureFileUtils = (eleventyConfig) => {
  const mdRenderer = createMarkdownRenderer();

  registerFilters(eleventyConfig)({
    snippet_data: snippetDataFilter,
    snippet_blocks: snippetBlocksFilter,
    markdown: /** @param {string | null | undefined} str */ (str) =>
      str ? mdRenderer.render(str) : "",
  });
  registerFilters(
    eleventyConfig,
    "addAsyncFilter",
  )({
    sidebar_blocks: sidebarBlocksFilter,
    render_block_liquid: renderBlockLiquidFilter,
  });

  eleventyConfig.addAsyncShortcode(
    "render_snippet",
    /**
     * @param {string} name
     * @param {string} defaultString
     * @param {string} [language] - The page language's code
     */
    async (name, defaultString, language) =>
      await renderSnippetShortcode(name, defaultString, mdRenderer, language),
  );
};

export { amendMarkdown, configureFileUtils, ensureDir };
