import configModule from "#data/config.js";
import { transformDOM } from "#utils/lazy-dom.js";

/** @param {string} url */
const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

/** @param {string} url */
const formatUrlForDisplay = (url) =>
  url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

/** Matches http:// or https:// URLs in text */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

const SKIP_TAGS = new Set(["a", "script", "style"]);

/** @param {Text} node */
const shouldSkipNode = (node) => {
  const parent = node.parentElement;
  if (!parent) return true;
  return SKIP_TAGS.has(parent.tagName.toLowerCase());
};

/** @param {Text} node */
const hasUrl = (node) => URL_PATTERN.test(node.textContent ?? "");

/**
 * @typedef {{ type: "text" | "url", value: string }} TextPart
 * @param {string} text
 * @returns {TextPart[]}
 */
const parseTextForUrls = (text) => {
  /** @type {TextPart[]} */
  const parts = [];
  let lastIndex = 0;
  URL_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "url", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
};

/**
 * @param {Document} document
 * @param {TextPart[]} parts
 * @param {boolean} addTargetBlank
 */
const createLinkFragment = (document, parts, addTargetBlank) => {
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    if (part.type === "text") {
      fragment.appendChild(document.createTextNode(part.value));
    } else {
      const link = document.createElement("a");
      link.href = part.value;
      link.textContent = formatUrlForDisplay(part.value);
      if (addTargetBlank) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      fragment.appendChild(link);
    }
  }
  return fragment;
};

/** @param {Document} document */
const collectTextNodes = (document) => {
  const walker = document.createTreeWalker(document.body, 4, {
    acceptNode: (node) =>
      shouldSkipNode(/** @type {Text} */ (node)) ||
      !hasUrl(/** @type {Text} */ (node))
        ? 2
        : 1,
  });
  /** @type {Text[]} */
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(/** @type {Text} */ (walker.currentNode));
  }
  return nodes;
};

/**
 * @param {Document} document
 * @param {boolean} targetBlank
 */
const linkifyTextNodes = (document, targetBlank) => {
  for (const textNode of collectTextNodes(document)) {
    const parts = parseTextForUrls(textNode.textContent ?? "");
    if (parts.some((p) => p.type === "url")) {
      const fragment = createLinkFragment(document, parts, targetBlank);
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }
};

/** @param {Document} document */
const addTargetBlankToExternalLinks = (document) => {
  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (href && isExternalUrl(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  }
};

/** @param {string} content */
const hasUrlInContent = (content) =>
  content.includes("http://") || content.includes("https://");

const configureExternalLinks = async (eleventyConfig, testConfig = null) => {
  const config = testConfig ?? (await configModule());
  const targetBlank = config?.externalLinksTargetBlank ?? false;

  eleventyConfig.addFilter("externalLinkAttrs", (url) =>
    targetBlank && typeof url === "string" && isExternalUrl(url)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "",
  );

  eleventyConfig.addTransform("linkifyUrls", async (content, outputPath) => {
    if (
      typeof outputPath !== "string" ||
      !outputPath.endsWith(".html") ||
      typeof content !== "string" ||
      !hasUrlInContent(content)
    ) {
      return content;
    }
    return transformDOM(content, (doc) => linkifyTextNodes(doc, targetBlank));
  });

  eleventyConfig.addTransform("externalLinks", async (content, outputPath) => {
    if (
      typeof outputPath !== "string" ||
      !outputPath.endsWith(".html") ||
      typeof content !== "string" ||
      !content.includes("<a") ||
      !targetBlank ||
      !hasUrlInContent(content)
    ) {
      return content;
    }
    return transformDOM(content, addTargetBlankToExternalLinks);
  });
};

export { configureExternalLinks, formatUrlForDisplay };
