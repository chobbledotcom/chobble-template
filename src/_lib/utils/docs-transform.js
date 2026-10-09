/**
 * Publish transforms for repository documentation markdown.
 *
 * The reference documents live as plain markdown in the repository — the root
 * architecture walkthrough and the site-builder skill's references — so
 * agents can read them directly. The docs-references collection publishes
 * the same files as guide pages: the guide header supplies the page title
 * (so the document's own title heading is dropped), and repository-relative
 * links are rewritten (`#utils/docs-links.js`), because a built page has no
 * repository layout to resolve them against. Liquid openers are escaped on
 * the whole document, because the references document Liquid syntax the
 * markdown block would otherwise execute as tags.
 */
import { publishedTarget } from "#utils/docs-links.js";

const TITLE = /^ {0,3}#\s/;

/**
 * Drop the document's title heading: the published page's title comes from
 * the guide header, so the source's own `# Title` would duplicate it.
 * Throws unless the document opens with a level-1 heading on its first
 * line, because that heading is what names the page.
 * @param {string} markdown Source markdown
 * @returns {string} Markdown without its title line
 */
export const stripTitleHeading = (markdown) => {
  const [title, ...body] = markdown.split("\n");
  if (!TITLE.test(title)) {
    throw new Error(
      "reference document must open with a level-1 title heading",
    );
  }
  return body.join("\n");
};

/**
 * Rewrite every repository-relative link in the markdown for a published
 * page. Fenced code blocks match ahead of links in one pass, so links
 * inside them are content, not navigation, and are left alone.
 * @param {string} markdown Source markdown without its title heading
 * @param {{ sourcePath: string, routes: Record<string, string>, rootDir: string }} options
 * @returns {string} Markdown with publishable link targets
 */
export const publishMarkdown = (markdown, options) =>
  markdown
    .replaceAll("{{", '{{ "{{" }}')
    .replaceAll("{%", '{{ "{%" }}')
    .replace(
      /(```[\s\S]*?```|~~~[\s\S]*?~~~)|(!?)\[([^\]]*)\]\(([^)\s]+)\)/g,
      (match, fenced, bang, text, target) => {
        if (fenced || bang === "!") return match;
        return `[${text}](${publishedTarget(target, options)})`;
      },
    );
