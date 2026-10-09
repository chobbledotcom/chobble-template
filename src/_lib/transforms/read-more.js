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
const LABEL_TEXT = "Read more…";

const idState = { counter: 0 };
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

/** @param {Node} node */
const collectSiblings = (node) => {
  /** @param {any} n */
  const isDiv = (n) => n.nodeType === 1 && n.tagName === "DIV";
  /**
   * @param {any} cur
   * @param {Node[]} acc
   * @returns {Node[]}
   */
  const walk = (cur, acc) =>
    cur && !isDiv(cur) ? walk(cur.nextSibling, [...acc, cur]) : acc;
  return walk(node.nextSibling, []);
};

/**
 * Hidden-content container: inline span or block wrapper.
 * @param {*} document
 * @param {string} tagName
 */
const createContentContainer = (document, tagName) => {
  const container = document.createElement(tagName);
  container.className = "read-more-content";
  return container;
};

/**
 * Move an array of nodes into a parent element.
 * @param {Element} parent
 * @param {Node[]} children
 */
const appendChildren = (parent, children) => {
  for (const child of children) {
    parent.appendChild(child);
  }
};

/** @param {*} document */
const processReadMore = (document) => {
  resetIdCounter();

  const createToggleElements = () => {
    const id = `read-more-${++idState.counter}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.className = "read-more-toggle";
    checkbox.autocomplete = "off";
    checkbox.setAttribute("aria-hidden", "true");

    const label = document.createElement("label");
    label.htmlFor = id;
    label.className = "read-more-label";
    label.setAttribute("role", "button");
    label.setAttribute("tabindex", "0");
    label.textContent = LABEL_TEXT;

    return { checkbox, label };
  };

  /** @param {any} textNode */
  const transformMarker = (textNode) => {
    const split = splitAtMarker(textNode.textContent);
    if (!split || !textNode.parentElement?.parentElement) return false;

    const { checkbox, label } = createToggleElements();

    textNode.textContent = split.before;
    textNode.parentNode?.insertBefore(checkbox, textNode.nextSibling);
    textNode.parentNode?.insertBefore(label, checkbox.nextSibling);

    const inlineSpan = createContentContainer(document, "span");
    inlineSpan.appendChild(document.createTextNode(split.after));
    appendChildren(inlineSpan, collectSiblings(label));
    textNode.parentNode?.insertBefore(inlineSpan, label.nextSibling);

    const blockSiblings = collectSiblings(textNode.parentElement);
    if (blockSiblings.length > 0) {
      const blockWrapper = createContentContainer(document, "div");
      textNode.parentElement.parentNode?.insertBefore(
        blockWrapper,
        textNode.parentElement.nextSibling,
      );
      appendChildren(blockWrapper, blockSiblings);
    }

    return true;
  };

  const findMarkerNode = () => {
    const walker = document.createTreeWalker(document.body, 4, {
      acceptNode:
        /** @param {any} n */
        (n) => (READ_MORE_PATTERN.test(n.textContent) ? 1 : 2),
    });
    return walker.nextNode();
  };

  const processNext = () => {
    const node = findMarkerNode();
    if (node && transformMarker(node)) {
      processNext();
    }
  };

  processNext();
};

export {
  hasReadMoreMarker,
  processReadMore,
  READ_MORE_PATTERN,
  resetIdCounter,
  splitAtMarker,
};
