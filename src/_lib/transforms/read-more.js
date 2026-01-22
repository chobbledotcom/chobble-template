/**
 * DOM transform for expanding "Read more.." sections.
 *
 * Scans content for [Read more..] markers and converts them into
 * CSS-only expandable sections using the checkbox hack pattern.
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

/** @param {HTMLDivElement} wrapper */
const createContentWrapper = (document) => {
  const wrapper = document.createElement("div");
  wrapper.className = "read-more-content";
  return wrapper;
};

const insertToggleMarkup = (
  textNode,
  document,
  split,
  checkbox,
  label,
  wrapper,
) => {
  if (split.before.trim()) {
    textNode.parentNode?.insertBefore(
      document.createTextNode(split.before),
      textNode,
    );
  }
  textNode.parentNode?.insertBefore(checkbox, textNode);
  textNode.parentNode?.insertBefore(label, textNode);
  textNode.parentNode?.insertBefore(wrapper, textNode);

  if (split.after.trim()) {
    wrapper.appendChild(document.createTextNode(split.after));
  }
};

const transformMarker = (document, textNode) => {
  const split = splitAtMarker(textNode.textContent);
  if (!split || !textNode.parentElement) return false;

  const { checkbox, label } = createToggleElements(
    document,
    nextId(),
    LABEL_TEXT,
  );
  const wrapper = createContentWrapper(document);

  insertToggleMarkup(textNode, document, split, checkbox, label, wrapper);

  for (const sib of collectSiblings(textNode.parentElement)) {
    wrapper.appendChild(sib);
  }

  textNode.remove();
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
  insertToggleMarkup,
  transformMarker,
};
