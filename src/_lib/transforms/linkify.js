/**
 * DOM transforms for auto-linking URLs, emails, and phone numbers in text.
 *
 * These transforms walk the DOM tree looking for text nodes that contain
 * linkable content and replace them with anchor elements.
 */

/** @typedef {{ type: "text" | "url" | "email" | "phone", value: string }} TextPart */

/** Matches http:// or https:// URLs in text */
const URL_PATTERN = /https?:\/\/[^\s<>]+/g;

/** Matches email addresses: chars@charswithatleastonedot */
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[\w-]+/g;

/** Tags to skip when processing text nodes */
const SKIP_TAGS = ["a", "script", "style", "code", "pre"];

/** Block-level elements - stop ancestor search when we hit one */
const BLOCK_TAGS = [
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
];

/** @type {(value: string) => TextPart} */
const textPart = (value) => ({ type: "text", value });
/** @type {(value: string) => TextPart} */
const urlPart = (value) => ({ type: "url", value });
/** @type {(value: string) => TextPart} */
const emailPart = (value) => ({ type: "email", value });
/** @type {(value: string) => TextPart} */
const phonePart = (value) => ({ type: "phone", value });

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
    { parts: /** @type {TextPart[]} */ ([]), lastIndex: 0 },
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
  if (SKIP_TAGS.includes(tag)) return true;
  if (BLOCK_TAGS.includes(tag)) return false;
  return hasSkipAncestor(element.parentElement);
};

/**
 * Check if a text node should be processed
 * @param {Text} node
 * @param {RegExp} pattern
 * @returns {boolean}
 */
const shouldProcessNode = (node, pattern) => {
  const parent = node.parentElement;
  if (!parent || hasSkipAncestor(parent)) {
    return false;
  }
  pattern.lastIndex = 0;
  return pattern.test(node.textContent ?? "");
};

/**
 * Collect text nodes matching a pattern using recursive walker
 * @param {*} document
 * @param {RegExp} pattern
 * @returns {Text[]}
 */
const collectTextNodes = (document, pattern) => {
  const walker = document.createTreeWalker(document.body, 4, {
    acceptNode: (node) =>
      shouldProcessNode(/** @type {Text} */ (node), pattern) ? 1 : 2,
  });
  const walkNodes = (acc) =>
    walker.nextNode()
      ? walkNodes([...acc, /** @type {Text} */ (walker.currentNode)])
      : acc;
  return walkNodes([]);
};

/**
 * Create link element for a URL
 * @param {*} document
 * @param {string} url
 * @param {boolean} targetBlank
 * @returns {HTMLAnchorElement}
 */
const createUrlLink = (document, url, targetBlank) => {
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

/**
 * Create link element for an email
 * @param {*} document
 * @param {string} email
 * @returns {HTMLAnchorElement}
 */
const createEmailLink = (document, email) => {
  const link = document.createElement("a");
  link.href = `mailto:${email}`;
  link.textContent = email;
  return link;
};

/**
 * Create link element for a phone number
 * @param {*} document
 * @param {string} phone
 * @returns {HTMLAnchorElement}
 */
const createPhoneLink = (document, phone) => {
  const link = document.createElement("a");
  link.href = `tel:${phone.replace(/\s/g, "")}`;
  link.textContent = phone;
  return link;
};

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
 * Create document fragment from parts
 * @param {*} document
 * @param {TextPart[]} parts
 * @param {boolean} targetBlank
 * @returns {DocumentFragment}
 */
const createLinkFragment = (document, parts, targetBlank) => {
  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    fragment.appendChild(createNodeForPart(document, part, targetBlank));
  }
  return fragment;
};

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
    const parts = parser(textNode.textContent ?? "");
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
 * @param {{ externalLinksTargetBlank?: boolean }} config
 */
const linkifyUrls = (document, config) => {
  const targetBlank = config?.externalLinksTargetBlank ?? false;
  processTextNodes(
    document,
    URL_PATTERN,
    (text) => parseTextByPattern(text, URL_PATTERN, urlPart),
    "url",
    targetBlank,
  );
};

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
 * Linkify phone numbers in document
 * @param {*} document
 * @param {{ phoneNumberLength?: number }} config
 */
const linkifyPhones = (document, config) => {
  const phoneLen = config?.phoneNumberLength ?? 11;
  if (phoneLen <= 0) return;

  const phonePat = new RegExp(`\\b(\\d(?:\\s*\\d){${phoneLen - 1}})\\b`, "g");
  processTextNodes(
    document,
    phonePat,
    (text) => parseTextByPattern(text, phonePat, phonePart),
    "phone",
    false,
  );
};

export {
  linkifyUrls,
  linkifyEmails,
  linkifyPhones,
  // Exported for testing
  parseTextByPattern,
  collectTextNodes,
  createUrlLink,
  createEmailLink,
  createPhoneLink,
  URL_PATTERN,
  EMAIL_PATTERN,
  SKIP_TAGS,
  BLOCK_TAGS,
};
