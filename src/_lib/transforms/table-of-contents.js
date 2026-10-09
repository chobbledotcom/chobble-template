/**
 * Fills in the `table-of-contents` block from the headings a page ends up with.
 *
 * The block writes an empty landmark; this runs once the whole page exists, so
 * the contents list every heading inside `<main>` at the levels the block
 * names, whichever blocks happened to write them. That is the only way a
 * contents can be right on a page assembled from blocks: no single block knows
 * what the others rendered.
 *
 * Listed headings get an `id` to link to, keeping any the author wrote, and
 * the entries nest the way the headings do — an `h3` under the `h2` above it —
 * so a screen reader reads the page's structure rather than a flat run of
 * links.
 */
import { slugify } from "#utils/slug-utils.js";

/** @typedef {{ level: number, text: string, id: string }} Heading */
/** @typedef {{ text: string, id: string, children: Entry[] }} Entry */

const TOC_SELECTOR = "nav.table-of-contents";
const LEVELS_ATTRIBUTE = "data-toc-levels";
const LISTABLE_LEVELS = [2, 3, 4, 5, 6];

/**
 * Whether a page has a contents block to fill in. Checked against the HTML
 * string before anything is parsed, so pages without one never pay for a DOM.
 * @param {string} content
 * @returns {boolean}
 */
const hasTableOfContents = (content) => content.includes(LEVELS_ATTRIBUTE);

/**
 * The first id in the series `base`, `base-2`, `base-3`, … that the page is
 * not already using. The page itself is the record of which ids are taken:
 * each heading gets its id as it is listed, so the next lookup sees it.
 * @param {*} document
 * @param {string} base
 * @param {number} [attempt] - 1 offers `base` itself, 2 offers `base-2`, …
 * @returns {string}
 */
const freeId = (document, base, attempt = 1) => {
  const candidate = attempt === 1 ? base : `${base}-${attempt}`;
  return document.getElementById(candidate)
    ? freeId(document, base, attempt + 1)
    : candidate;
};

/**
 * Group each heading's deeper headings underneath it, turning the page's flat
 * run of headings into the tree the contents renders.
 * @param {Heading[]} headings
 * @returns {Entry[]}
 */
const nest = (headings) => {
  const [first, ...rest] = headings;
  if (!first) return [];
  const next = rest.findIndex((heading) => heading.level <= first.level);
  const end = next === -1 ? rest.length : next;
  return [
    { text: first.text, id: first.id, children: nest(rest.slice(0, end)) },
    ...nest(rest.slice(end)),
  ];
};

/**
 * One `<ol>` of entries, each nesting its own children.
 * @param {*} document
 * @param {Entry[]} entries
 * @returns {Element}
 */
const renderList = (document, entries) => {
  const list = document.createElement("ol");
  for (const entry of entries) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${entry.id}`;
    link.textContent = entry.text;
    item.appendChild(link);
    if (entry.children.length > 0) {
      item.appendChild(renderList(document, entry.children));
    }
    list.appendChild(item);
  }
  return list;
};

/**
 * Fill in every contents block on the page.
 * @param {*} document
 */
const processTableOfContents = (document) => {
  const blocks = [...document.querySelectorAll(TOC_SELECTOR)];
  if (blocks.length === 0) return;

  /**
   * The id to link a heading by: its own when it has one, otherwise a slug of
   * its text, made unique against every id already on the page.
   * @param {Element} heading
   * @returns {string}
   */
  const anchorFor = (heading) => {
    if (heading.id) return heading.id;
    heading.id = freeId(document, slugify(heading.textContent) || "section");
    return heading.id;
  };

  /**
   * The heading levels a block names, as numbers. An unlistable level is an
   * authoring mistake that would otherwise silently shorten the contents, so
   * it fails the build instead.
   * @param {string} value - The block's `data-toc-levels`
   * @returns {number[]}
   */
  const parseLevels = (value) => {
    const levels = value.split(",").map((part) => Number(part.trim()));
    const unlistable = levels.filter(
      (level) => !LISTABLE_LEVELS.includes(level),
    );
    if (unlistable.length > 0) {
      throw new Error(
        `table-of-contents: levels "${value}" include ${unlistable.join(", ")}, ` +
          `and a contents can only list h${LISTABLE_LEVELS.join(", h")}.`,
      );
    }
    return levels;
  };

  /**
   * The headings one block covers: everything in `<main>` at one of its
   * levels, less the titles of the contents blocks themselves.
   * @param {number[]} levels
   * @returns {Element[]}
   */
  const listableHeadings = (levels) => {
    const selector = levels.map((level) => `main h${level}`).join(", ");
    return [...document.querySelectorAll(selector)].filter(
      (heading) => !heading.closest(TOC_SELECTOR),
    );
  };

  /**
   * Name the landmark after its own visible title, by id, so that a page with
   * two contents blocks names both of them.
   * @param {Element} toc
   */
  const nameLandmark = (toc) => {
    const title = toc.querySelector(".toc-title");
    if (!title) {
      throw new Error("table-of-contents: block has no title heading");
    }
    toc.setAttribute("aria-labelledby", anchorFor(title));
  };

  /** @param {Element} toc */
  const fillContents = (toc) => {
    const named = toc.getAttribute(LEVELS_ATTRIBUTE);
    if (named === null) {
      throw new Error(
        `table-of-contents: a block with no ${LEVELS_ATTRIBUTE} cannot say ` +
          "which headings to list.",
      );
    }
    const levels = parseLevels(named);
    const headings = listableHeadings(levels);
    if (headings.length === 0) {
      throw new Error(
        `table-of-contents: the page has no h${levels.join(", h")} to list. ` +
          "Give the page those headings, or name the levels it does use.",
      );
    }
    nameLandmark(toc);
    const entries = headings.map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      text: heading.textContent.trim(),
      id: anchorFor(heading),
    }));
    toc.appendChild(renderList(document, nest(entries)));
  };

  for (const toc of blocks) {
    fillContents(toc);
  }
};

export { hasTableOfContents, processTableOfContents };
