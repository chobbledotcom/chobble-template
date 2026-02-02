/**
 * DOM transform for expanding "Read more.." sections.
 *
 * Scans content for [Read more..] markers inside paragraphs and converts
 * them into CSS-only expandable sections using the checkbox hack pattern.
 *
 * Works inline: text before marker stays visible, text after (rest of line
 * AND following paragraphs) gets hidden until clicked.
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

const findMarkerNode = (document) => {
  const walker = document.createTreeWalker(document.body, 4, {
    acceptNode: (n) => (READ_MORE_PATTERN.test(n.textContent) ? 1 : 2),
  });
  return walker.nextNode();
};

/** @param {Node} node */
const collectSiblings = (node) => {
  const isDiv = (n) => n.nodeType === 1 && n.tagName === "DIV";
  const walk = (cur, acc) =>
    cur && !isDiv(cur) ? walk(cur.nextSibling, [...acc, cur]) : acc;
  return walk(node.nextSibling, []);
};

const createInlineSpan = (document) => {
  const span = document.createElement("span");
  span.className = "read-more-content";
  return span;
};

const createBlockWrapper = (document) => {
  const wrapper = document.createElement("div");
  wrapper.className = "read-more-content";
  return wrapper;
};

/** Collect all sibling nodes after the given node within the same parent. */
const collectInlineSiblings = (node) => {
  const nodes = [];
  let cursor = node.nextSibling;
  while (cursor) {
    nodes.push(cursor);
    cursor = cursor.nextSibling;
  }
  return nodes;
};

const wrapInlineContent = (
  document,
  afterText,
  remainingNodes,
  insertAfter,
) => {
  const hasContent = afterText.trim() || remainingNodes.length > 0;
  if (!hasContent) return;

  const span = createInlineSpan(document);
  if (afterText) {
    span.appendChild(document.createTextNode(afterText));
  }
  for (const node of remainingNodes) {
    span.appendChild(node);
  }
  insertAfter.parentNode?.insertBefore(span, insertAfter.nextSibling);
};

const wrapBlockContent = (document, parentElement) => {
  const followingSiblings = collectSiblings(parentElement);
  if (followingSiblings.length === 0) return;

  const blockWrapper = createBlockWrapper(document);
  parentElement.parentNode?.insertBefore(
    blockWrapper,
    parentElement.nextSibling,
  );
  for (const sib of followingSiblings) {
    blockWrapper.appendChild(sib);
  }
};

const transformMarker = (document, textNode) => {
  const split = splitAtMarker(textNode.textContent);
  if (!split || !textNode.parentElement?.parentElement) return false;

  const { checkbox, label } = createToggleElements(
    document,
    nextId(),
    LABEL_TEXT,
  );

  textNode.textContent = split.before;
  textNode.parentNode?.insertBefore(checkbox, textNode.nextSibling);
  textNode.parentNode?.insertBefore(label, checkbox.nextSibling);

  wrapInlineContent(document, split.after, collectInlineSiblings(label), label);
  wrapBlockContent(document, textNode.parentElement);

  return true;
};

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
  createInlineSpan,
  createBlockWrapper,
  transformMarker,
};
