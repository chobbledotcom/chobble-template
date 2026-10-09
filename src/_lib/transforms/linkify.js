/**
 * DOM transforms for auto-linking phone numbers and configured link texts.
 *
 * These transforms walk the DOM tree looking for text nodes that contain
 * linkable content and replace them with anchor elements. URL and email
 * linkification is handled by the linkify-html library in html-transform.js;
 * this module only supplies its SKIP_TAGS and display formatting.
 */
import { flatMap } from "#utils/fp/array.js";
import { frozenSet } from "#utils/fp/set.js";

/** @typedef {{ type: "text" | "phone" | "configLink", value: string }} TextPart */
/** @typedef {{ parts: TextPart[], lastIndex: number }} TextPartsAccumulator */

/** Tags to skip when processing text nodes */
const SKIP_TAGS = frozenSet(["a", "script", "style", "code", "pre", "title"]);

/** Block-level elements - stop ancestor search when we hit one */
/* jscpd:ignore-start -- declaration data: element tag list */
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
  "table",
  "ul",
  "ol",
]);
/* jscpd:ignore-end */

/** @type {(value: string) => TextPart} */
const textPart = (value) => ({ type: "text", value });

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
    /** @param {TextPartsAccumulator} acc */
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
    { parts: [], lastIndex: 0 },
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
 * Recursively collect all text nodes from a tree walker
 * @param {TreeWalker & { currentNode: Text }} walker - SHOW_TEXT walker
 * @param {Text[]} acc
 * @returns {Text[]}
 */
const walkTextNodes = (walker, acc = []) =>
  walker.nextNode() ? walkTextNodes(walker, [...acc, walker.currentNode]) : acc;

/**
 * Collect text nodes matching a pattern using recursive walker
 * @param {*} document
 * @param {Element} root
 * @param {RegExp} pattern
 * @returns {Text[]}
 */
const collectTextNodes = (document, root, pattern) =>
  walkTextNodes(
    document.createTreeWalker(root, 4, {
      /** @param {Text} node */
      acceptNode: (node) => {
        if (!node.parentElement || hasSkipAncestor(node.parentElement))
          return 2;
        pattern.lastIndex = 0;
        return pattern.test(node.textContent) ? 1 : 2;
      },
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
 * Replace each text node whose parsed parts contain the link type with a
 * fragment built by the given node factory. The shared core of every
 * linkify transform.
 * @param {*} document
 * @param {Text[]} textNodes
 * @param {(text: string) => TextPart[]} parser
 * @param {string} linkType
 * @param {(part: TextPart) => Node} createNode
 */
const replaceMatchedTextNodes = (
  document,
  textNodes,
  parser,
  linkType,
  createNode,
) => {
  for (const textNode of textNodes) {
    const parts = parser(textNode.textContent);
    if (!parts.some((p) => p.type === linkType) || !textNode.parentNode)
      continue;
    const fragment = document.createDocumentFragment();
    for (const part of parts) fragment.appendChild(createNode(part));
    textNode.parentNode.replaceChild(fragment, textNode);
  }
};

/**
 * Check if content contains a phone number pattern (consecutive digits with optional spaces)
 * @param {string} content
 * @param {number | undefined} phoneLen
 * @returns {boolean}
 */
const hasPhonePattern = (content, phoneLen) =>
  phoneLen !== undefined &&
  phoneLen > 0 &&
  new RegExp(`\\b\\d(?:\\s*\\d){${phoneLen - 1}}\\b`).test(content);

/**
 * Linkify phone numbers in document
 * @param {*} document
 * @param {{ phoneNumberLength?: number }} config
 */
const linkifyPhones = (document, config) => {
  if (config.phoneNumberLength === undefined || config.phoneNumberLength <= 0) {
    return;
  }

  const phonePat = new RegExp(
    `\\b(\\d(?:\\s*\\d){${config.phoneNumberLength - 1}})\\b`,
    "g",
  );
  replaceMatchedTextNodes(
    document,
    collectTextNodes(document, document.body, phonePat),
    (text) =>
      parseTextByPattern(text, phonePat, (value) => ({ type: "phone", value })),
    "phone",
    (part) =>
      part.type === "phone"
        ? createSimpleLink(
            document,
            `tel:${part.value.replace(/\s/g, "")}`,
            part.value,
          )
        : document.createTextNode(part.value),
  );
};

/**
 * Build a regex that matches any of the link texts (longest first, word-bounded)
 * @param {string[]} texts
 * @returns {RegExp}
 */
const buildConfigLinksPattern = (texts) => {
  const sorted = [...texts].sort((a, b) => b.length - a.length);
  const alternation = sorted
    .map((text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`\\b(${alternation})\\b`, "g");
};

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

  replaceMatchedTextNodes(
    document,
    flatMap((prose) => collectTextNodes(document, prose, pattern))([
      ...document.querySelectorAll(".prose"),
    ]),
    (text) =>
      parseTextByPattern(text, pattern, (value) => ({
        type: "configLink",
        value,
      })),
    "configLink",
    (part) =>
      part.type === "configLink"
        ? createSimpleLink(document, linksMap[part.value], part.value)
        : document.createTextNode(part.value),
  );
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
  buildConfigLinksPattern,
  formatUrlDisplay,
  hasConfigLinks,
  hasPhonePattern,
  linkifyConfigLinks,
  linkifyPhones,
  // Exported for testing
  parseTextByPattern,
  SKIP_TAGS,
};
