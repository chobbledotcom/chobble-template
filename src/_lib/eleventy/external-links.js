import configModule from "#data/config.js";
import { transformDOM } from "#utils/lazy-dom.js";

/** @param {string} url */
const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

/** Matches http:// or https:// URLs in text */
const URL_PATTERN = /https?:\/\/[^\s<>]+/g;

/** Matches email addresses: chars@charswithatleastonedot */
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[\w-]+/g;

/** @type {readonly string[]} */
const SKIP_TAGS = ["a", "script", "style"];

/** @typedef {{ type: "text" | "url" | "email" | "phone", value: string }} TextPart */
const textPart = (value) => ({ type: "text", value });
const urlPart = (value) => ({ type: "url", value });
const emailPart = (value) => ({ type: "email", value });
const phonePart = (value) => ({ type: "phone", value });

const parseTextByPattern = (text, pattern, partFactory) => {
  pattern.lastIndex = 0;
  const matches = [...text.matchAll(pattern)];
  if (matches.length === 0) return [textPart(text)];
  const { parts, lastIndex } = matches.reduce(
    (acc, match) => ({
      parts: [
        ...acc.parts,
        ...(match.index > acc.lastIndex
          ? [textPart(text.slice(acc.lastIndex, match.index))]
          : []),
        partFactory(match[0]),
      ],
      lastIndex: match.index + match[0].length,
    }),
    { parts: /** @type {TextPart[]} */ ([]), lastIndex: 0 },
  );
  return lastIndex < text.length
    ? [...parts, textPart(text.slice(lastIndex))]
    : parts;
};

const collectTextNodes = (document, pattern) => {
  const shouldProcess = (node) => {
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.includes(parent.tagName.toLowerCase()))
      return false;
    pattern.lastIndex = 0;
    return pattern.test(node.textContent ?? "");
  };
  const nodeFilter = (node) =>
    shouldProcess(/** @type {Text} */ (node)) ? 1 : 2;
  const walker = document.createTreeWalker(document.body, 4, {
    acceptNode: nodeFilter,
  });
  const walkNodes = (acc) =>
    walker.nextNode()
      ? walkNodes([...acc, /** @type {Text} */ (walker.currentNode)])
      : acc;
  return walkNodes([]);
};

const processNodes = (document, pattern, parser, linkType, fragmentCreator) => {
  for (const textNode of collectTextNodes(document, pattern)) {
    const parts = parser(textNode.textContent ?? "");
    if (parts.some((p) => p.type === linkType)) {
      textNode.parentNode?.replaceChild(
        fragmentCreator(document, parts),
        textNode,
      );
    }
  }
};

const createNodeForPart = (document, part, urlLinkCreator) => {
  if (part.type === "url") return urlLinkCreator(document, part.value);
  if (part.type === "email") {
    const link = document.createElement("a");
    link.href = `mailto:${part.value}`;
    link.textContent = part.value;
    return link;
  }
  if (part.type === "phone") {
    const link = document.createElement("a");
    link.href = `tel:${part.value.replace(/\s/g, "")}`;
    link.textContent = part.value;
    return link;
  }
  return document.createTextNode(part.value);
};

const createLinkFragment = (document, parts, urlLinkCreator) => {
  const fragment = document.createDocumentFragment();
  for (const part of parts)
    fragment.appendChild(createNodeForPart(document, part, urlLinkCreator));
  return fragment;
};

const linkifyPattern = (doc, pattern, partFactory, linkType, urlLinkCreator) =>
  processNodes(
    doc,
    pattern,
    (t) => parseTextByPattern(t, pattern, partFactory),
    linkType,
    (d, parts) => createLinkFragment(d, parts, urlLinkCreator),
  );

const htmlTransform = (check, proc) => async (content, outputPath) =>
  typeof outputPath === "string" &&
  outputPath.endsWith(".html") &&
  typeof content === "string" &&
  check(content)
    ? transformDOM(content, proc)
    : content;

const hasUrls = (c) => c.includes("http://") || c.includes("https://");

const addTargetBlankToExternalLinks = (document) => {
  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (href && isExternalUrl(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  }
};

const createUrlLinkFactory = (targetBlank) => (document, url) => {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
  if (targetBlank) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  return link;
};

const registerTransforms = (cfg, urlLink, phoneLen, targetBlank) => {
  cfg.addFilter("externalLinkAttrs", (url) =>
    targetBlank && typeof url === "string" && isExternalUrl(url)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "",
  );
  cfg.addTransform(
    "linkifyUrls",
    htmlTransform(hasUrls, (d) =>
      linkifyPattern(d, URL_PATTERN, urlPart, "url", urlLink),
    ),
  );
  cfg.addTransform(
    "linkifyEmails",
    htmlTransform(
      (c) => c.includes("@"),
      (d) => linkifyPattern(d, EMAIL_PATTERN, emailPart, "email", urlLink),
    ),
  );
  const phonePat =
    phoneLen > 0
      ? new RegExp(`\\b(\\d(?:\\s*\\d){${phoneLen - 1}})\\b`, "g")
      : null;
  cfg.addTransform(
    "linkifyPhones",
    phonePat
      ? htmlTransform(
          (c) => /\d/.test(c),
          (d) => linkifyPattern(d, phonePat, phonePart, "phone", urlLink),
        )
      : async (c) => c,
  );
  cfg.addTransform(
    "externalLinks",
    htmlTransform(
      (c) => hasUrls(c) && c.includes("<a") && targetBlank,
      addTargetBlankToExternalLinks,
    ),
  );
};

const configureExternalLinks = async (eleventyConfig, testConfig = null) => {
  const config = testConfig ?? (await configModule());
  const targetBlank = config?.externalLinksTargetBlank ?? false;
  const phoneNumberLength = config?.phoneNumberLength ?? 11;
  registerTransforms(
    eleventyConfig,
    createUrlLinkFactory(targetBlank),
    phoneNumberLength,
    targetBlank,
  );
};

export { configureExternalLinks };
