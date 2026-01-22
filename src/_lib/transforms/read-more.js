/**
 * DOM transform for expanding "Read more.." sections.
 *
 * Scans content for [Read more..] markers and converts them into
 * CSS-only expandable sections using the checkbox hack pattern.
 *
 * Works inline: text before marker stays visible, text after (including
 * rest of line AND following paragraphs) gets hidden until clicked.
 */

const READ_MORE_PATTERN = /\[Read more\.{1,3}\]/i;
const LABEL_TEXT = "Read more\u2026";

const idState = { counter: 0 };
const nextId = () => `read-more-${++idState.counter}`;
const resetIdCounter = () => {
  idState.counter = 0;
};

/** @param {string} content */
const hasReadMoreMarker = (content) => READ_MORE_PATTERN.test(content);

/** @param {string} text */
const splitAtMarker = (text) => {
  const match = READ_MORE_PATTERN.exec(text);
  if (!match) return null;
  return {
    before: text.slice(0, match.index),
    after: text.slice(match.index + match[0].length),
  };
};

/** @param {Document} document */
const createToggleElements = (document, id, labelText) => {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = id;
  checkbox.className = "read-more-toggle";
  checkbox.setAttribute("aria-hidden", "true");

  const label = document.createElement("label");
  label.htmlFor = id;
  label.className = "read-more-label";
  label.setAttribute("role", "button");
  label.setAttribute("tabindex", "0");
  label.textContent = labelText;

  return { checkbox, label };
};

/** @param {Document} document */
const findMarkerNode = (document) => {
  const walker = document.createTreeWalker(document.body, 4, {
    acceptNode: (n) => (READ_MORE_PATTERN.test(n.textContent) ? 1 : 2),
  });
  return walker.nextNode();
};

/** @param {Node} node */
const collectSiblings = (node) => {
  const walk = (cur, acc) => (cur ? walk(cur.nextSibling, [...acc, cur]) : acc);
  return walk(node.nextSibling, []);
};

/** @param {Document} document */
const createContentWrapper = (document) => {
  const wrapper = document.createElement("div");
  wrapper.className = "read-more-content";
  return wrapper;
};

/** @param {Document} document */
const createInlineWrapper = (document) => {
  const wrapper = document.createElement("span");
  wrapper.className = "read-more-content read-more-inline";
  return wrapper;
};

const insertAfterElement = (element, ...toInsert) => {
  toInsert.reduce((prev, el) => {
    prev.parentNode?.insertBefore(el, prev.nextSibling);
    return el;
  }, element);
};

const addInlineContent = (document, label, afterText) => {
  if (!afterText.trim()) return false;
  const inlineWrapper = createInlineWrapper(document);
  inlineWrapper.textContent = afterText;
  label.parentNode?.insertBefore(inlineWrapper, label.nextSibling);
  return true;
};

const addBlockContent = (grandparent, label, siblings, hasInline) => {
  if (siblings.length === 0) return;
  const blockWrapper = grandparent.ownerDocument.createElement("div");
  blockWrapper.className = "read-more-content";
  const insertAfter = hasInline
    ? label.nextSibling?.nextSibling
    : label.nextSibling;
  grandparent.insertBefore(blockWrapper, insertAfter);
  for (const sib of siblings) {
    blockWrapper.appendChild(sib);
  }
};

const transformMarker = (document, textNode) => {
  const split = splitAtMarker(textNode.textContent);
  if (!split || !textNode.parentElement?.parentElement) return false;

  const followingSiblings = collectSiblings(textNode.parentElement);
  const { checkbox, label } = createToggleElements(
    document,
    nextId(),
    LABEL_TEXT,
  );

  textNode.textContent = split.before;
  insertAfterElement(textNode.parentElement, checkbox, label);

  const hasInline = addInlineContent(document, label, split.after);
  addBlockContent(
    textNode.parentElement.parentElement,
    label,
    followingSiblings,
    hasInline,
  );

  return true;
};

/** @param {Document} document */
const processReadMore = (document) => {
  resetIdCounter();

  const processNext = () => {
    const node = findMarkerNode(document);
    if (node && transformMarker(document, node)) {
      processNext();
    }
  };

  processNext();
};

export {
  processReadMore,
  hasReadMoreMarker,
  READ_MORE_PATTERN,
  splitAtMarker,
  createToggleElements,
  resetIdCounter,
  nextId,
  findMarkerNode,
  collectSiblings,
  createContentWrapper,
  createInlineWrapper,
  insertAfterElement,
  addInlineContent,
  addBlockContent,
  transformMarker,
};
