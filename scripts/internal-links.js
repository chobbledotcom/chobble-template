import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { tokenize } from "@nfrasser/simple-html-tokenizer";

const INTERNAL_ORIGIN = "https://internal.invalid";
const URI_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const listFiles = (rootDir) => [
  ...new Bun.Glob("**/*").scanSync({ cwd: rootDir, onlyFiles: true }),
];

const getAttribute = (token, name) =>
  token.attributes.find(([attribute]) => attribute.toLowerCase() === name)?.[1];

const isRedirectDocument = (tokens) =>
  tokens.some(
    (token) =>
      token.type === "StartTag" &&
      token.tagName === "meta" &&
      getAttribute(token, "http-equiv")?.toLowerCase() === "refresh",
  );

const shouldSkipHref = (href) =>
  !href ||
  href.includes("?") ||
  href.includes("#") ||
  href.startsWith("//") ||
  URI_SCHEME.test(href);

const getInternalHrefs = (tokens) => {
  return tokens.flatMap((token) => {
    if (token.type !== "StartTag") return [];
    const href = getAttribute(token, "href");
    return shouldSkipHref(href) ? [] : [href];
  });
};

const resolveTarget = (source, href) => {
  const url = new URL(href, `${INTERNAL_ORIGIN}/${source}`);
  return decodeURIComponent(url.pathname).replace(/^\/+/, "");
};

const targetExists = (files, target) =>
  files.has(target) || files.has(path.posix.join(target, "index.html"));

const checkHtmlFile = (outputDir, files, source) => {
  const html = readFileSync(path.join(outputDir, source), "utf8");
  const tokens = tokenize(html);
  if (isRedirectDocument(tokens)) return [];
  return getInternalHrefs(tokens)
    .map((href) => ({ source, href, target: resolveTarget(source, href) }))
    .filter(({ target }) => !targetExists(files, target));
};

export const findBrokenInternalLinks = (outputDir) => {
  if (!existsSync(outputDir)) {
    throw new Error(`Generated site directory does not exist: ${outputDir}`);
  }
  const files = new Set(listFiles(outputDir));
  return [...files]
    .filter((file) => file.endsWith(".html"))
    .flatMap((source) => checkHtmlFile(outputDir, files, source))
    .sort(
      (first, second) =>
        first.source.localeCompare(second.source) ||
        first.href.localeCompare(second.href),
    );
};

export const formatBrokenInternalLink = ({ source, href, target }) =>
  `${source}: ${href} -> ${target || "index.html"}`;

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
