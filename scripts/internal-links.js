import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { tokenize } from "@nfrasser/simple-html-tokenizer";
import { globSync } from "tinyglobby";

const INTERNAL_ORIGIN = "https://internal.invalid";
const URI_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** @param {string} rootDir */
const listFiles = (rootDir) =>
  globSync("**/*", { cwd: rootDir, onlyFiles: true });

/**
 * @param {any} token
 * @param {string} name
 */
const getAttribute = (token, name) =>
  token.attributes.find(
    /** @param {[string, string]} attr */
    ([attribute]) => attribute.toLowerCase() === name,
  )?.[1];

/** @param {any[]} tokens */
const isRedirectDocument = (tokens) =>
  tokens.some(
    (token) =>
      token.type === "StartTag" &&
      token.tagName === "meta" &&
      getAttribute(token, "http-equiv")?.toLowerCase() === "refresh",
  );

/** @param {string | undefined} href */
const shouldSkipHref = (href) =>
  !href || href.startsWith("//") || URI_SCHEME.test(href);

/** @param {any[]} tokens */
const getInternalHrefs = (tokens) => {
  return tokens.flatMap((token) => {
    if (token.type !== "StartTag") return [];
    const href = getAttribute(token, "href");
    return shouldSkipHref(href) ? [] : [href];
  });
};

/**
 * When the site is built with a path prefix (e.g. a static host serving it
 * at /cfa-static/), absolute internal links carry the prefix but the
 * output files on disk do not - strip it before resolving.
 */
const PATH_PREFIX = process.env.PATH_PREFIX || "/";

/** @param {string} pathname */
const stripPathPrefix = (pathname) => {
  if (PATH_PREFIX === "/" || !pathname.startsWith(PATH_PREFIX)) {
    return pathname;
  }
  return `/${pathname.slice(PATH_PREFIX.length)}`;
};

/**
 * @param {string} source
 * @param {string} href
 */
const resolveTarget = (source, href) => {
  const url = new URL(href, `${INTERNAL_ORIGIN}/${source}`);
  return stripPathPrefix(url.pathname).replace(/^\/+/, "");
};

/**
 * @param {Set<string>} files
 * @param {string} target
 */
const targetExists = (files, target) =>
  files.has(target) || files.has(path.posix.join(target, "index.html"));

/**
 * @param {string} outputDir
 * @param {Set<string>} files
 * @param {string} source
 */
const checkHtmlFile = (outputDir, files, source) => {
  const html = readFileSync(path.join(outputDir, source), "utf8");
  const tokens = tokenize(html);
  if (isRedirectDocument(tokens)) return [];
  return getInternalHrefs(tokens)
    .map((href) => ({ source, href, target: resolveTarget(source, href) }))
    .filter(({ target }) => !targetExists(files, target));
};

/** @param {string} outputDir */
export const findBrokenInternalLinks = (outputDir) => {
  if (!existsSync(outputDir)) {
    throw new Error(`Generated site directory does not exist: ${outputDir}`);
  }
  const outputFiles = listFiles(outputDir);
  const targets = new Set(
    outputFiles.flatMap((file) => [file, encodeURI(file)]),
  );
  return outputFiles
    .filter((file) => file.endsWith(".html"))
    .flatMap((source) => checkHtmlFile(outputDir, targets, source))
    .sort(
      (first, second) =>
        first.source.localeCompare(second.source) ||
        first.href.localeCompare(second.href),
    );
};

/** @param {{ source: string, href: string, target: string }} link */
export const formatBrokenInternalLink = ({ source, href, target }) =>
  `${source}: ${href} -> ${target || "index.html"}`;

/**
 * @param {string} outputDir
 * @param {Pick<Console, "log" | "error">} [output]
 */
export const runInternalLinkCheck = (outputDir, output = console) => {
  const failures = findBrokenInternalLinks(outputDir);
  if (failures.length === 0) {
    output.log("Internal link check passed");
    return 0;
  }
  output.error(
    `Broken internal links:\n${failures.map(formatBrokenInternalLink).join("\n")}`,
  );
  return 1;
};
