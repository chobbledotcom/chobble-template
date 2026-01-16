import configModule from "#data/config.js";
import { transformDOM } from "#utils/lazy-dom.js";

const isExternalUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("http://") || url.startsWith("https://");
};

const formatUrlForDisplay = (url) => {
  if (!url || typeof url !== "string") return "";
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
};

// Matches http:// or https:// URLs in text
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

const SKIP_TAGS = new Set(["a", "script", "style"]);

const shouldSkipNode = (node) => {
  const parent = node.parentElement;
  if (!parent) return true;
  const tag = parent.tagName?.toLowerCase();
  return SKIP_TAGS.has(tag);
};

const hasUrl = (node) => URL_PATTERN.test(node.textContent);

const parseTextForUrls = (text) => {
  const parts = [];
  let lastIndex = 0;
  URL_PATTERN.lastIndex = 0;
  const matches = text.matchAll(URL_PATTERN);
  for (const match of matches) {
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

const collectTextNodes = (document) => {
  const walker = document.createTreeWalker(document.body, 4, {
    acceptNode: (node) => (shouldSkipNode(node) || !hasUrl(node) ? 2 : 1),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
};

const configureExternalLinks = async (eleventyConfig, testConfig = null) => {
  const config = testConfig ?? (await configModule());

  const getExternalLinkAttrs = (url) =>
    config?.externalLinksTargetBlank && isExternalUrl(url)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";

  eleventyConfig.addFilter("externalLinkAttrs", getExternalLinkAttrs);

  eleventyConfig.addFilter("linkify", (url) => {
    if (!url || typeof url !== "string") return "";
    const displayText = formatUrlForDisplay(url);
    const attrs = getExternalLinkAttrs(url);
    return `<a href="${url}"${attrs}>${displayText}</a>`;
  });

  // Transform that auto-linkifies URLs in text content
  eleventyConfig.addTransform("linkifyUrls", async (content, outputPath) => {
    if (
      typeof outputPath !== "string" ||
      !outputPath.endsWith(".html") ||
      !content ||
      (!content.includes("http://") && !content.includes("https://"))
    ) {
      return content;
    }
    return transformDOM(content, (document) => {
      const textNodes = collectTextNodes(document);
      for (const textNode of textNodes) {
        const parts = parseTextForUrls(textNode.textContent);
        if (parts.some((p) => p.type === "url")) {
          const fragment = createLinkFragment(
            document,
            parts,
            config?.externalLinksTargetBlank,
          );
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      }
    });
  });

  eleventyConfig.addTransform("externalLinks", async (content, outputPath) => {
    if (
      typeof outputPath !== "string" ||
      !outputPath.endsWith(".html") ||
      !content?.includes("<a") ||
      !config?.externalLinksTargetBlank ||
      (!content.includes("http://") && !content.includes("https://"))
    ) {
      return content;
    }
    return transformDOM(content, (document) => {
      for (const link of document.querySelectorAll("a[href]")) {
        if (isExternalUrl(link.getAttribute("href"))) {
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        }
      }
    });
  });
};

export { configureExternalLinks, formatUrlForDisplay };
