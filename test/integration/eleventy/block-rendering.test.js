import { describe, expect, test } from "vitest";
import { pageWithBlocks, useSharedSite } from "#test/test-site-factory.js";

const LINKS = [
  { icon: "&#9733;", text: "First", url: "/first/" },
  { icon: "&#9733;", text: "Second" },
];

const FAQS = [
  { question: "Is it free?", answer: "**Yes**, always." },
  { question: "Who runs it?", answer: "A charity." },
];

// Each block under test renders on its own page within one shared site, so
// the build runs once while each test inspects its own page.
const getSite = useSharedSite({
  files: [
    pageWithBlocks("features", [
      {
        type: "features",
        items: [{ name: "Alpha" }, { name: "Beta" }],
      },
    ]),
    pageWithBlocks("stats", [
      {
        type: "stats",
        items: [{ value: "99%", label: "Uptime" }, "24/7|Support"],
      },
    ]),
    pageWithBlocks("icon-links", [{ type: "icon-links", items: LINKS }]),
    pageWithBlocks("split-icon-links", [
      {
        type: "split-icon-links",
        content: "## Links",
        reverse: true,
        figure_items: LINKS,
      },
    ]),
    pageWithBlocks("cta", [
      {
        type: "cta",
        content: "## Go",
        button: { text: "Go", href: "/go/" },
      },
    ]),
    pageWithBlocks("snippet", [{ type: "snippet", reference: "promo" }]),
    pageWithBlocks("faqs", [{ type: "faqs", items: FAQS }]),
    pageWithBlocks("faqs-collapsible", [
      { type: "faqs", collapsible: true, items: FAQS },
    ]),
    {
      path: "snippets/promo.md",
      frontmatter: {
        name: "Promo",
        blocks: [{ type: "callout", content: "From the {{ name }} page" }],
      },
    },
  ],
});

const textsOf = (doc, selector) =>
  [...doc.querySelectorAll(selector)].map((node) => node.textContent.trim());

describe("item-list blocks", () => {
  test("features renders one revealed card per authored item", async () => {
    const doc = await getSite().getDoc("features/index.html");
    expect(textsOf(doc, ".features .feature h3")).toEqual(["Alpha", "Beta"]);
    expect(doc.querySelectorAll(".feature[data-reveal]")).toHaveLength(2);
  });

  test("stats renders object and pipe-delimited items", async () => {
    const doc = await getSite().getDoc("stats/index.html");
    expect(textsOf(doc, ".stats dt")).toEqual(["Uptime", "Support"]);
    expect(textsOf(doc, ".stats dd")).toEqual(["99%", "24/7"]);
  });

  test("a standalone icon-links block renders every link, revealed", async () => {
    const doc = await getSite().getDoc("icon-links/index.html");
    expect(textsOf(doc, ".icon-links__text")).toEqual(["First", "Second"]);
    expect(doc.querySelectorAll(".icon-links li[data-reveal]")).toHaveLength(2);
  });

  test("an icon-links figure renders its links without the reveal", async () => {
    const doc = await getSite().getDoc("split-icon-links/index.html");
    expect(textsOf(doc, "figure .icon-links__text")).toEqual([
      "First",
      "Second",
    ]);
    expect(doc.querySelectorAll("figure li[data-reveal]")).toHaveLength(0);
  });
});

describe("schema defaults reach the templates", () => {
  test("a reversed split reveals its text from the right", async () => {
    const doc = await getSite().getDoc("split-icon-links/index.html");
    expect(doc.querySelector(".split article").dataset.reveal).toBe("right");
    expect(doc.querySelector(".split figure").dataset.reveal).toBe("scale");
  });

  test("a CTA button without variant or size renders secondary and large", async () => {
    const doc = await getSite().getDoc("cta/index.html");
    expect(doc.querySelector(".cta a.btn").className).toBe(
      "btn btn--secondary btn--lg",
    );
  });

  test("snippet blocks are default-filled and resolve Liquid against the page", async () => {
    const doc = await getSite().getDoc("snippet/index.html");
    const callout = doc.querySelector("aside.callout");
    expect(callout.className).toBe("callout callout--info");
    expect(callout.textContent).toContain("From the snippet page");
  });
});

describe("faqs", () => {
  test("renders a definition list by default", async () => {
    const doc = await getSite().getDoc("faqs/index.html");
    expect(textsOf(doc, ".faqs dt")).toEqual(["Is it free?", "Who runs it?"]);
    expect(doc.querySelector(".faqs dd strong").textContent).toBe("Yes");
    expect(doc.querySelector(".faqs details")).toBeNull();
  });

  test("collapsible renders a closed accordion row per question", async () => {
    const doc = await getSite().getDoc("faqs-collapsible/index.html");
    const items = [...doc.querySelectorAll(".faqs--collapsible > details")];
    expect(items.map((item) => item.open)).toEqual([false, false]);
    expect(textsOf(doc, ".faqs__item > summary")).toEqual([
      "Is it free?",
      "Who runs it?",
    ]);
    expect(
      items[0].querySelector(".faqs__answer.prose strong").textContent,
    ).toBe("Yes");
  });
});
