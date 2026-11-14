/**
 * The contents block is filled in from the finished page, so every test here
 * hands the transform a page and reads back the list it built and the ids it
 * left on the headings — the two things the links depend on.
 */
import { describe, expect, test } from "vitest";
import {
  hasTableOfContents,
  processTableOfContents,
} from "#transforms/table-of-contents.js";
import { loadDOM } from "#utils/lazy-dom.js";

const TOC =
  '<nav class="table-of-contents" data-toc-levels="2,3"><h2 class="toc-title">On this page</h2></nav>';

/** A page with a contents block above whatever headings the test supplies. */
const page = (body, toc = TOC) =>
  `<!DOCTYPE html><html lang="en"><body><main id="content"><h1>Title</h1>${toc}${body}</main></body></html>`;

const fill = async (html) => {
  const dom = await loadDOM(html);
  processTableOfContents(dom.window.document);
  return dom.window.document;
};

/** The href of every link the contents lists, in order. */
const contentsLinks = (doc) =>
  [...doc.querySelectorAll("nav.table-of-contents a")].map((link) =>
    link.getAttribute("href"),
  );

describe("hasTableOfContents", () => {
  test("recognises the marker the block writes", () => {
    expect(hasTableOfContents(TOC)).toBe(true);
  });

  test("does not recognise a page without one", () => {
    expect(hasTableOfContents("<main><h2>Just a heading</h2></main>")).toBe(
      false,
    );
  });
});

describe("filling in the contents", () => {
  test("lists the page's headings at the levels the block names", async () => {
    const doc = await fill(page("<h2>First</h2><h2>Second</h2>"));
    expect(contentsLinks(doc)).toEqual(["#first", "#second"]);
  });

  test("leaves out headings at levels the block does not name", async () => {
    const doc = await fill(page("<h2>Listed</h2><h4>Skipped</h4>"));
    expect(contentsLinks(doc)).toEqual(["#listed"]);
  });

  test("gives each listed heading the id its link points at", async () => {
    const doc = await fill(page("<h2>What we collect</h2>"));
    expect(doc.querySelector("main h2:not(.toc-title)").id).toBe(
      "what-we-collect",
    );
  });

  test("keeps an id the author wrote rather than replacing it", async () => {
    const doc = await fill(page('<h2 id="chosen">A heading</h2>'));
    expect(contentsLinks(doc)).toEqual(["#chosen"]);
  });

  test("gives two headings that read the same distinct ids", async () => {
    const doc = await fill(page("<h2>Repeated</h2><h2>Repeated</h2>"));
    expect(contentsLinks(doc)).toEqual(["#repeated", "#repeated-2"]);
  });

  test("does not reuse an id another element on the page already has", async () => {
    const doc = await fill(page('<p id="intro">x</p><h2>Intro</h2>'));
    expect(contentsLinks(doc)).toEqual(["#intro-2"]);
  });

  test("nests a deeper heading under the one above it", async () => {
    const doc = await fill(page("<h2>Parent</h2><h3>Child</h3>"));
    const nested = doc.querySelectorAll("nav.table-of-contents li ol li a");
    expect([...nested].map((link) => link.getAttribute("href"))).toEqual([
      "#child",
    ]);
  });

  test("closes a nested run when the headings come back up a level", async () => {
    const doc = await fill(page("<h2>One</h2><h3>Under one</h3><h2>Two</h2>"));
    const topLevel = doc.querySelectorAll(
      "nav.table-of-contents > ol > li > a",
    );
    expect([...topLevel].map((link) => link.textContent)).toEqual([
      "One",
      "Two",
    ]);
  });

  test("names the landmark after its own visible title", async () => {
    const doc = await fill(page("<h2>A heading</h2>"));
    const toc = doc.querySelector("nav.table-of-contents");
    const titleId = toc.getAttribute("aria-labelledby");
    expect(doc.getElementById(titleId).textContent).toBe("On this page");
  });

  test("leaves its own title out of the list it builds", async () => {
    const doc = await fill(page("<h2>A heading</h2>"));
    expect(contentsLinks(doc)).toEqual(["#a-heading"]);
  });

  test("fills in both blocks on a page that has two", async () => {
    const doc = await fill(page(`<h2>A heading</h2>${TOC}`));
    const [first, second] = doc.querySelectorAll("nav.table-of-contents");
    expect(contentsLinks(doc)).toEqual(["#a-heading", "#a-heading"]);
    expect(first.getAttribute("aria-labelledby")).not.toBe(
      second.getAttribute("aria-labelledby"),
    );
  });

  test("ignores headings outside the page's main content", async () => {
    const doc = await fill(
      `<!DOCTYPE html><html lang="en"><body><main id="content">${TOC}<h2>In main</h2></main><footer><h2>In the footer</h2></footer></body></html>`,
    );
    expect(contentsLinks(doc)).toEqual(["#in-main"]);
  });

  test("leaves a page without a contents block alone", async () => {
    const doc = await fill(
      '<!DOCTYPE html><html lang="en"><body><main id="content"><h2>Untouched</h2></main></body></html>',
    );
    expect(doc.querySelector("main h2").id).toBe("");
  });

  test("falls back to a generic id for a heading with no text to slug", async () => {
    const doc = await fill(page("<h2><span aria-hidden='true'>—</span></h2>"));
    expect(contentsLinks(doc)).toEqual(["#section"]);
  });
});

describe("rejecting a contents that cannot be built", () => {
  test("fails on a page with none of the headings it names", async () => {
    await expect(fill(page("<p>No headings at all.</p>"))).rejects.toThrow(
      /no h2, h3 to list/,
    );
  });

  test("fails on a level no contents can list", async () => {
    const toc =
      '<nav class="table-of-contents" data-toc-levels="1,2"><h2 class="toc-title">On this page</h2></nav>';
    await expect(fill(page("<h2>A heading</h2>", toc))).rejects.toThrow(
      /include 1, and a contents can only list h2, h3, h4, h5, h6/,
    );
  });

  test("fails on a level that is not a number", async () => {
    const toc =
      '<nav class="table-of-contents" data-toc-levels="two"><h2 class="toc-title">On this page</h2></nav>';
    await expect(fill(page("<h2>A heading</h2>", toc))).rejects.toThrow(
      /table-of-contents: levels "two"/,
    );
  });

  test("fails on a block that never said which headings to list", async () => {
    // The block's own template always writes the attribute; hand-written HTML
    // with the same class is what reaches this.
    const toc =
      '<nav class="table-of-contents"><h2 class="toc-title">On this page</h2></nav>';
    await expect(fill(page("<h2>A heading</h2>", toc))).rejects.toThrow(
      /no data-toc-levels/,
    );
  });

  test("fails on a block whose title heading has been removed", async () => {
    const toc =
      '<nav class="table-of-contents" data-toc-levels="2"><p>Not a title</p></nav>';
    await expect(fill(page("<h2>A heading</h2>", toc))).rejects.toThrow(
      /no title heading/,
    );
  });
});
