/**
 * DOM transforms for auto-linking URLs, emails, and phone numbers in text.
 *
 * These transforms walk the DOM tree looking for text nodes that contain
 * linkable content and replace them with anchor elements.
 */
import { flatMap } from "#toolkit/fp/array.js";
import { frozenSet } from "#toolkit/fp/set.js";

/** @typedef {{ type: "text" | "url" | "email" | "phone" | "configLink", value: string }} TextPart */
/** @typedef {{ parts: TextPart[], lastIndex: number }} TextPartsAccumulator */

/** Matches http:// or https:// URLs in text */
const URL_PATTERN = /https?:\/\/[^\s<>]+/g;

/** Matches email addresses: chars@charswithatleastonedot */
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[\w-]+/g;

/** Tags to skip when processing text nodes */
const SKIP_TAGS = frozenSet(["a", "script", "style", "code", "pre"]);

/** Block-level elements - stop ancestor search when we hit one */
const BLOCK_TAGS = frozenSet([
  "p",
  "div",
  "section",
  "article",
  "aside",
  "main",
  "header",
  "footer",
  "nav",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "dd",
  "dt",
  "blockquote",
  "figure",
  "td",
  "th",
  "form",
  "body",
]);

/** @type {(value: string) => TextPart} */
const textPart = (value) => ({ type: "text", value });
/** @type {(value: string) => TextPart} */
const urlPart = (value) => ({ type: "url", value });
/** @type {(value: string) => TextPart} */
const emailPart = (value) => ({ type: "email", value });
/** @type {(value: string) => TextPart} */
const phonePart = (value) => ({ type: "phone", value });

/** @returns {TextPartsAccumulator} */
const createTextPartsAccumulator = () => ({ parts: [], lastIndex: 0 });

/**
 * Parse text into parts based on a pattern
 * @param {string} text
 * @param {RegExp} pattern
 * @param {(value: string) => TextPart} partFactory
 * @returns {TextPart[]}
 */
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
    createTextPartsAccumulator(),
  );

  return lastIndex < text.length
    ? [...parts, textPart(text.slice(lastIndex))]
    : parts;
};

/**
 * Check if any ancestor element is in SKIP_TAGS (stops at block-level elements)
 * @param {Element | null} element
 * @returns {boolean}
 */
const hasSkipAncestor = (element) => {
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return true;
  if (BLOCK_TAGS.has(tag)) return false;
  return hasSkipAncestor(element.parentElement);
};

/**
 * Check if a text node should be processed
 * @param {Text} node
 * @param {RegExp} pattern
 * @returns {boolean}
 */
const shouldProcessNode = (node, pattern) => {
  if (!node.parentElement || hasSkipAncestor(node.parentElement)) {
    return false;
  }
  pattern.lastIndex = 0;
  return pattern.test(node.textContent);
};

/**
 * Check if a node should be accepted by the tree walker.
 * @param {RegExp} pattern
 * @returns {(node: Text) => number}
 */
const createNodeFilter = (pattern) => (node) =>
  shouldProcessNode(node, pattern) ? 1 : 2;

/**
 * Get current node from walker as Text.
 * TreeWalker with SHOW_TEXT filter only visits Text nodes.
 * @param {TreeWalker} walker
 * @returns {Text}
 */
// @ts-expect-error - walker.currentNode is Text when using SHOW_TEXT filter
const getCurrentTextNode = (walker) => walker.currentNode;

/**
 * Recursively collect all text nodes from a tree walker
 * @param {TreeWalker} walker
 * @param {Text[]} acc
 * @returns {Text[]}
 */
const walkTextNodes = (walker, acc = []) =>
  walker.nextNode()
    ? walkTextNodes(walker, [...acc, getCurrentTextNode(walker)])
    : acc;

/**
 * Collect text nodes matching a pattern using recursive walker
 * @param {*} document
 * @param {RegExp} pattern
 * @returns {Text[]}
 */
const collectTextNodes = (document, pattern) =>
  walkTextNodes(
    document.createTreeWalker(document.body, 4, {
      acceptNode: createNodeFilter(pattern),
    }),
  );

/**
 * Format URL for display (strip protocol, www, trailing slash)
 * @param {string} url
 * @returns {string}
 */
const formatUrlDisplay = (url) =>
  url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

/**
 * Create a simple anchor element with href and display text
 * @param {*} document
 * @param {string} href
 * @param {string} text
 * @returns {HTMLAnchorElement}
 */
const createSimpleLink = (document, href, text) => {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = text;
  return link;
};

/**
 * Create link element for a URL
 * @param {*} document
 * @param {string} url
 * @param {boolean} targetBlank
 * @returns {HTMLAnchorElement}
 */
const createUrlLink = (document, url, targetBlank) => {
  const link = createSimpleLink(document, url, formatUrlDisplay(url));
  if (targetBlank) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  return link;
};

/** @type {(document: *, email: string) => HTMLAnchorElement} */
const createEmailLink = (document, email) =>
  createSimpleLink(document, `mailto:${email}`, email);

/** @type {(document: *, phone: string) => HTMLAnchorElement} */
const createPhoneLink = (document, phone) =>
  createSimpleLink(document, `tel:${phone.replace(/\s/g, "")}`, phone);

/**
 * Create DOM node for a text part
 * @param {*} document
 * @param {TextPart} part
 * @param {boolean} targetBlank
 * @returns {Node}
 */
const createNodeForPart = (document, part, targetBlank) => {
  if (part.type === "url")
    return createUrlLink(document, part.value, targetBlank);
  if (part.type === "email") return createEmailLink(document, part.value);
  if (part.type === "phone") return createPhoneLink(document, part.value);
  return document.createTextNode(part.value);
};

/**
 * Build a document fragment by mapping parts through a node-creation function
 * @param {*} document
 * @param {TextPart[]} parts
 * @param {(part: TextPart) => Node} createNode
 * @returns {DocumentFragment}
 */
const buildFragment = (document, parts, createNode) => {
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    fragment.appendChild(createNode(part));
  }
  return fragment;
};

/**
 * Create document fragment from parts
 * @param {*} document
 * @param {TextPart[]} parts
 * @param {boolean} targetBlank
 * @returns {DocumentFragment}
 */
const createLinkFragment = (document, parts, targetBlank) =>
  buildFragment(document, parts, (part) =>
    createNodeForPart(document, part, targetBlank),
  );

/**
 * Process text nodes and replace with linkified content
 * @param {*} document
 * @param {RegExp} pattern
 * @param {(text: string) => TextPart[]} parser
 * @param {string} linkType
 * @param {boolean} targetBlank
 */
const processTextNodes = (document, pattern, parser, linkType, targetBlank) => {
  for (const textNode of collectTextNodes(document, pattern)) {
    const parts = parser(textNode.textContent);
    if (parts.some((p) => p.type === linkType)) {
      textNode.parentNode?.replaceChild(
        createLinkFragment(document, parts, targetBlank),
        textNode,
      );
    }
  }
};

/**
 * Linkify URLs in document
 * @param {*} document
 * @param {{ externalLinksTargetBlank: boolean }} config
 */
const linkifyUrls = (document, config) =>
  processTextNodes(
    document,
    URL_PATTERN,
    (text) => parseTextByPattern(text, URL_PATTERN, urlPart),
    "url",
    config.externalLinksTargetBlank,
  );

/**
 * Linkify email addresses in document
 * @param {*} document
 * @param {{ externalLinksTargetBlank?: boolean }} _config
 */
const linkifyEmails = (document, _config) => {
  processTextNodes(
    document,
    EMAIL_PATTERN,
    (text) => parseTextByPattern(text, EMAIL_PATTERN, emailPart),
    "email",
    false,
  );
};

/**
 * Check if content contains a phone number pattern (consecutive digits with optional spaces)
 * @param {string} content
 * @param {number} phoneLen
 * @returns {boolean}
 */
const hasPhonePattern = (content, phoneLen) =>
  phoneLen > 0 &&
  new RegExp(`\\b\\d(?:\\s*\\d){${phoneLen - 1}}\\b`).test(content);

/**
 * Linkify phone numbers in document
 * @param {*} document
 * @param {{ phoneNumberLength: number }} config
 */
const linkifyPhones = (document, config) => {
  if (config.phoneNumberLength <= 0) return;

  const phonePat = new RegExp(
    `\\b(\\d(?:\\s*\\d){${config.phoneNumberLength - 1}})\\b`,
    "g",
  );
  processTextNodes(
    document,
    phonePat,
    (text) => parseTextByPattern(text, phonePat, phonePart),
    "phone",
    false,
  );
};

/**
 * Escape special regex characters in a string
 * @param {string} str
 * @returns {string}
 */
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Build a regex that matches any of the link texts (longest first, word-bounded)
 * @param {string[]} texts
 * @returns {RegExp}
 */
const buildConfigLinksPattern = (texts) => {
  const sorted = [...texts].sort((a, b) => b.length - a.length);
  const alternation = sorted.map(escapeRegExp).join("|");
  return new RegExp(`\\b(${alternation})\\b`, "g");
};

/** @type {(value: string) => TextPart} */
const configLinkPart = (value) => ({ type: "configLink", value });

/**
 * Collect text nodes matching a pattern within .prose elements
 * @param {*} document
 * @param {RegExp} pattern
 * @returns {Text[]}
 */
const collectProseTextNodes = (document, pattern) =>
  flatMap((prose) =>
    walkTextNodes(
      document.createTreeWalker(prose, 4, {
        acceptNode: createNodeFilter(pattern),
      }),
    ),
  )([...document.querySelectorAll(".prose")]);

/** @type {(document: *, text: string, url: string) => HTMLAnchorElement} */
const createConfigLink = (document, text, url) =>
  createSimpleLink(document, url, text);

/**
 * Create DOM node for a config link part
 * @param {*} document
 * @param {TextPart} part
 * @param {Record<string, string>} linksMap
 * @returns {Node}
 */
const createConfigLinkNode = (document, part, linksMap) =>
  part.type === "configLink"
    ? createConfigLink(document, part.value, linksMap[part.value])
    : document.createTextNode(part.value);

/**
 * Linkify text based on configured links map, only within .prose elements.
 * Each text match is replaced with an anchor linking to the configured URL.
 * @param {*} document
 * @param {Record<string, string>} linksMap - Keys are text to match, values are URLs
 */
const linkifyConfigLinks = (document, linksMap) => {
  const texts = Object.keys(linksMap);
  if (texts.length === 0) return;

  const pattern = buildConfigLinksPattern(texts);

  for (const textNode of collectProseTextNodes(document, pattern)) {
    const parts = parseTextByPattern(
      textNode.textContent,
      pattern,
      configLinkPart,
    );
    if (parts.some((p) => p.type === "configLink")) {
      textNode.parentNode?.replaceChild(
        buildFragment(document, parts, (part) =>
          createConfigLinkNode(document, part, linksMap),
        ),
        textNode,
      );
    }
  }
};

/**
 * Check if content contains any of the configured link texts
 * @param {string} content
 * @param {Record<string, string>} linksMap
 * @returns {boolean}
 */
const hasConfigLinks = (content, linksMap) => {
  const texts = Object.keys(linksMap);
  return texts.length > 0 && texts.some((text) => content.includes(text));
};

export {
  linkifyUrls,
  linkifyEmails,
  linkifyPhones,
  linkifyConfigLinks,
  formatUrlDisplay,
  hasPhonePattern,
  hasConfigLinks,
  // Exported for testing
  parseTextByPattern,
  collectTextNodes,
  collectProseTextNodes,
  createUrlLink,
  createEmailLink,
  createPhoneLink,
  createConfigLink,
  buildConfigLinksPattern,
  URL_PATTERN,
  EMAIL_PATTERN,
  SKIP_TAGS,
  BLOCK_TAGS,
};
