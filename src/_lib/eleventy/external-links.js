import configModule from "#data/config.js";
import { transformDOM } from "#utils/lazy-dom.js";

/** @param {string} url */
const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

/** Matches http:// or https:// URLs in text */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

/** @type {readonly string[]} */
const SKIP_TAGS = ["a", "script", "style"];

/**
 * @param {unknown} content
 * @param {unknown} outputPath
 * @returns {content is string}
 */
const isHtmlWithUrls = (content, outputPath) =>
  typeof outputPath === "string" &&
  outputPath.endsWith(".html") &&
  typeof content === "string" &&
  (content.includes("http://") || content.includes("https://"));

const configureExternalLinks = async (eleventyConfig, testConfig = null) => {
  const config = testConfig ?? (await configModule());
  const targetBlank = config?.externalLinksTargetBlank ?? false;

  /** @param {string} url */
  const formatUrlForDisplay = (url) =>
    url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

  /** @typedef {{ type: "text" | "url", value: string }} TextPart */

  /** @type {(value: string) => TextPart} */
  const textPart = (value) => ({ type: "text", value });
  /** @type {(value: string) => TextPart} */
  const urlPart = (value) => ({ type: "url", value });

  /** @param {string} text */
  const parseTextForUrls = (text) => {
    URL_PATTERN.lastIndex = 0;
    const matches = [...text.matchAll(URL_PATTERN)];
    if (matches.length === 0) return [textPart(text)];

    const { parts, lastIndex } = matches.reduce(
      (acc, match) => ({
        parts: [
          ...acc.parts,
          ...(match.index > acc.lastIndex
            ? [textPart(text.slice(acc.lastIndex, match.index))]
            : []),
          urlPart(match[0]),
        ],
        lastIndex: match.index + match[0].length,
      }),
      { parts: /** @type {TextPart[]} */ ([]), lastIndex: 0 },
    );
    return lastIndex < text.length
      ? [...parts, textPart(text.slice(lastIndex))]
      : parts;
  };

  /** @param {Document} document */
  const createLink = (document, url) => {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = formatUrlForDisplay(url);
    if (targetBlank) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    return link;
  };

  /**
   * @param {Document} document
   * @param {TextPart[]} parts
   */
  const createLinkFragment = (document, parts) => {
    const fragment = document.createDocumentFragment();
    for (const part of parts) {
      const node =
        part.type === "text"
          ? document.createTextNode(part.value)
          : createLink(document, part.value);
      fragment.appendChild(node);
    }
    return fragment;
  };

  /** @param {Text} node */
  const shouldProcessNode = (node) => {
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.includes(parent.tagName.toLowerCase()))
      return false;
    return URL_PATTERN.test(node.textContent ?? "");
  };

  /** @param {Text} textNode */
  const processTextNode = (document, textNode) => {
    const parts = parseTextForUrls(textNode.textContent ?? "");
    if (parts.some((p) => p.type === "url")) {
      const fragment = createLinkFragment(document, parts);
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  };

  /**
   * @param {TreeWalker} walker
   * @param {Text[]} acc
   * @returns {Text[]}
   */
  const walkNodes = (walker, acc) =>
    walker.nextNode()
      ? walkNodes(walker, [...acc, /** @type {Text} */ (walker.currentNode)])
      : acc;

  /** @param {Document} document */
  const collectTextNodes = (document) => {
    const walker = document.createTreeWalker(document.body, 4, {
      acceptNode: (node) =>
        shouldProcessNode(/** @type {Text} */ (node)) ? 1 : 2,
    });
    return walkNodes(walker, []);
  };

  /** @param {Document} document */
  const linkifyTextNodes = (document) => {
    for (const textNode of collectTextNodes(document)) {
      processTextNode(document, textNode);
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

  eleventyConfig.addFilter("externalLinkAttrs", (url) =>
    targetBlank && typeof url === "string" && isExternalUrl(url)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "",
  );

  eleventyConfig.addTransform("linkifyUrls", async (content, outputPath) => {
    if (!isHtmlWithUrls(content, outputPath)) return content;
    return transformDOM(content, linkifyTextNodes);
  });

  eleventyConfig.addTransform("externalLinks", async (content, outputPath) => {
    if (!isHtmlWithUrls(content, outputPath)) return content;
    if (!content.includes("<a") || !targetBlank) return content;
    return transformDOM(content, addTargetBlankToExternalLinks);
  });
};

export { configureExternalLinks };
