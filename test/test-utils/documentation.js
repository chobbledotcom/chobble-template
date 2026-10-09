import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import { parseAllDocuments } from "yaml";
import { ROOT_DIR } from "#lib/paths.js";
import { findFiles } from "#test/test-utils/code-analysis.js";

const markdown = new MarkdownIt({ html: true });

export const getTableRows = (root) =>
  [...root.querySelectorAll("tbody tr")].map((row) =>
    [...row.cells].map((cell) => cell.textContent),
  );

const canonicalReference =
  "skills/cfa-static-site-builder/references/blocks.md";
const publishedDocument = (file) =>
  /^src\/(pages|guide-pages|guide-categories|snippets)\//.test(file) &&
  !file.endsWith("/README.md");

// Author-facing Markdown only: legal notices, eval fixtures, and test fixtures
// are not documentation. File discovery skips hidden directories, so name the agent
// guide explicitly. Published content shares example checks, not checkout URLs.
export const getDocumentationFiles = () => [
  ".claude/agents/code-nitpicker.md",
  ...findFiles(
    /^(?:[^/]+\.md|docs\/.*\.md|skills\/.*\.md|src\/_lib\/README\.md|src\/(?:pages|guide-pages|guide-categories|snippets)\/.*\.md|test\/TEST-QUALITY-CRITERIA\.md)$/,
    ROOT_DIR,
  ).filter((file) => !/^skills\/[^/]+\/evals\//.test(file)),
];

/** Require lexical and real-path containment, including directory symlinks. */
export const assertDocumentationTarget = (root, target, location) => {
  const outside = (base, path) => {
    const remainder = relative(base, path);
    return (
      remainder === ".." ||
      remainder.startsWith(`..${sep}`) ||
      isAbsolute(remainder)
    );
  };
  if (outside(root, target))
    throw new Error(`${location}: target escapes documentation root`);
  if (!existsSync(target)) throw new Error(`${location}: missing target`);
  if (outside(realpathSync(root), realpathSync(target)))
    throw new Error(`${location}: symlink escapes documentation root`);
};

const parseProse = (source) =>
  new DOMParser().parseFromString(
    markdown.render(matter(source).content),
    "text/html",
  );

const headingIds = (document) => {
  const used = new Set();
  return [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map(
    (heading) => {
      // GitHub removes punctuation/symbols but preserves Unicode letters and
      // combining marks. Spaces become individual hyphens, not collapsed runs.
      const base = heading.textContent
        .toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, "")
        .replaceAll(" ", "-");
      let id = base;
      let suffix = 0;
      while (used.has(id)) id = `${base}-${++suffix}`;
      used.add(id);
      return id;
    },
  );
};

/** Check repository links; published pages use site URLs checked by the build. */
export const assertDocumentationLinks = (root, files) => {
  const documents = new Map();
  const parsed = (file) => {
    if (!documents.has(file)) {
      const document = parseProse(readFileSync(file, "utf8"));
      documents.set(file, {
        document,
        ids: [
          ...headingIds(document),
          ...[...document.querySelectorAll("[id], a[name]")].flatMap((node) => [
            node.getAttribute("id"),
            node.getAttribute("name"),
          ]),
        ],
      });
    }
    return documents.get(file);
  };
  for (const file of files.filter((file) => !publishedDocument(file))) {
    const source = resolve(root, file);
    assertDocumentationTarget(root, source, file);
    const { document } = parsed(source);
    for (const link of document.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href");
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
      const [urlPath, fragment = ""] = href.split("#");
      const path = decodeURIComponent(urlPath.split("?")[0]);
      const destination = path ? resolve(dirname(source), path) : source;
      const location = `${file}: ${href}`;
      assertDocumentationTarget(root, destination, location);
      if (!fragment) continue;
      const anchor = decodeURIComponent(fragment);
      const anchorFile = statSync(destination).isDirectory()
        ? join(destination, "README.md")
        : destination;
      assertDocumentationTarget(root, anchorFile, location);
      const lines = anchor.match(/^L([1-9]\d*)(?:-L([1-9]\d*))?$/);
      if (lines && !/\.md$/i.test(anchorFile)) {
        const text = readFileSync(anchorFile, "utf8");
        const start = Number(lines[1]);
        const end = Number(lines[2] || lines[1]);
        const count = text.replace(/\n$/, "").split("\n").length;
        if (end < start || end > count)
          throw new Error(`${location}: invalid source line range`);
        continue;
      }
      const { ids } = parsed(anchorFile);
      if (!ids.includes(anchor)) throw new Error(`${location}: missing anchor`);
    }
  }
};

const yamlExamples = ({ location, code, designated = false }) => {
  const documents = parseAllDocuments(code);
  if (designated && documents.length === 0)
    throw new Error(`${location}: blocks must be an array`);
  return documents.flatMap((document) => {
    if (document.errors.length)
      throw new Error(
        `Invalid YAML in ${location}: ${document.errors.join("\n")}`,
      );
    const data = document.toJSON();
    // A closing frontmatter delimiter creates an empty trailing scalar, unlike
    // an explicitly authored `null`, which must still fail a designated fence.
    if (
      data === null &&
      document.contents?.source === "" &&
      documents.length > 1
    )
      return [];
    const envelope =
      data !== null &&
      typeof data === "object" &&
      Object.hasOwn(data, "blocks");
    if (!designated && !envelope) return [];
    const blocks = envelope ? data.blocks : data;
    if (!Array.isArray(blocks))
      throw new Error(`${location}: blocks must be an array`);
    return [{ location, blocks }];
  });
};

/** YAML blocks: use a `blocks:` envelope, or mark a bare array `yaml blocks`.
 * Unrelated YAML arrays (such as workflow steps) are never guessed by type.
 */
export const extractDocumentationExamples = (file, source) => {
  if (file === canonicalReference) return [];
  const { content, data } = matter(source);
  const frontmatterLines =
    source.slice(0, source.length - content.length).split("\n").length - 1;
  const fences = markdown
    .parse(content, {})
    .filter(
      (token) =>
        token.type === "fence" && /^(?:yaml|yml)(?: blocks)?$/.test(token.info),
    )
    .map((token) => ({
      location: `${file}:${frontmatterLines + token.map[0] + 1}`,
      code: token.content,
      designated: token.info.endsWith(" blocks"),
    }));
  const published =
    publishedDocument(file) && Object.hasOwn(data, "blocks")
      ? data.blocks.flatMap((block, index) => {
          const location = `${file} block ${index + 1}`;
          if (
            block.type === "code-block" &&
            /^(yaml|yml)$/.test(block.language)
          )
            return [{ location, code: block.code }];
          if (
            block.type === "split-code" &&
            /^(yaml|yml)$/.test(block.figure_language)
          )
            return [{ location, code: block.figure_code }];
          return [];
        })
      : [];
  return [...fences, ...published].flatMap(yamlExamples);
};
