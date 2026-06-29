import { describe, expect, test } from "bun:test";
import { useSharedSite } from "#test/test-site-factory.js";

const BUTTONS = [
  { text: "Primary Action", href: "/go/" },
  { text: "Ghost Action", href: "/other/", variant: "ghost", size: "lg" },
];

/** Class names of an element's children, for asserting render order */
const childClasses = (el) => [...el.children].map((child) => child.className);

/** A standalone page carrying a single design-system block */
const pageWithBlock = (slug, block) => ({
  path: `pages/${slug}.md`,
  frontmatter: { name: slug, permalink: `/${slug}/`, blocks: [block] },
});

const imageBackground = (overlay) => ({
  type: "image-background",
  image: "src/images/party.jpg",
  ...overlay,
});

// Each block under test renders on its own page within a single shared site.
// Building once (instead of once per test) avoids spawning a full Eleventy
// build per case; each test still inspects its own page in isolation.
const getSite = useSharedSite({
  images: ["party.jpg"],
  files: [
    pageWithBlock("hero", {
      type: "hero",
      badge: "New",
      content: "# Big Heading\n\nLead paragraph text.",
      buttons: BUTTONS,
    }),
    pageWithBlock(
      "overlay-markdown",
      imageBackground({ content: "## Overlay Heading" }),
    ),
    pageWithBlock(
      "overlay-badge-buttons",
      imageBackground({
        badge: "Featured",
        content: "## Overlay Heading",
        buttons: BUTTONS,
      }),
    ),
    pageWithBlock("overlay-media-only", imageBackground({})),
    {
      // Page-level `text`/`href`/`variant` data must not leak into the
      // button partial and override each hero button's own fields.
      path: "pages/hero-leak.md",
      frontmatter: {
        name: "hero-leak",
        permalink: "/hero-leak/",
        text: "LEAKED",
        href: "/leaked/",
        variant: "danger",
        blocks: [{ type: "hero", content: "# Heading", buttons: BUTTONS }],
      },
    },
  ],
});

describe("hero block", () => {
  test("renders badge, prose-wrapped markdown content, then buttons", async () => {
    const doc = await getSite().getDoc("hero/index.html");
    const header = doc.querySelector("header.hero");
    expect(header).not.toBeNull();

    expect(header.querySelector(".badge").textContent).toBe("New");

    const prose = header.querySelector(".prose");
    expect(prose.querySelector("h1").textContent).toBe("Big Heading");
    expect(prose.textContent).toContain("Lead paragraph text.");

    expect(childClasses(header)).toEqual(["badge", "prose", "actions"]);

    const buttons = header.querySelectorAll(".actions a.btn");
    expect(buttons.length).toBe(2);
    expect(buttons[0].className).toBe("btn btn--primary");
    expect(buttons[0].getAttribute("href")).toBe("/go/");
    expect(buttons[1].className).toBe("btn btn--ghost btn--lg");
  });

  test("hero buttons ignore page-level text/href/variant data", async () => {
    const doc = await getSite().getDoc("hero-leak/index.html");
    const buttons = doc.querySelectorAll("header.hero .actions a.btn");
    expect(buttons.length).toBe(2);
    // Each button keeps its own fields despite the page exposing top-level
    // `text` ("LEAKED"), `href` ("/leaked/"), and `variant` ("danger").
    expect(buttons[0].textContent).toBe("Primary Action");
    expect(buttons[0].getAttribute("href")).toBe("/go/");
    expect(buttons[0].className).toBe("btn btn--primary");
    expect(buttons[1].textContent).toBe("Ghost Action");
    expect(buttons[1].className).toBe("btn btn--ghost btn--lg");
  });
});

describe("image-background overlay", () => {
  test("renders markdown-only content in a .prose inside the figcaption", async () => {
    const doc = await getSite().getDoc("overlay-markdown/index.html");
    const prose = doc.querySelector(".image-background figcaption .prose");
    expect(prose).not.toBeNull();
    expect(prose.querySelector("h2").textContent).toBe("Overlay Heading");
  });

  test("renders badge and buttons around the prose content", async () => {
    const doc = await getSite().getDoc("overlay-badge-buttons/index.html");
    const figcaption = doc.querySelector(".image-background figcaption");
    expect(figcaption.querySelector(".badge").textContent).toBe("Featured");
    expect(childClasses(figcaption)).toEqual(["badge", "prose", "actions"]);
    expect(figcaption.querySelectorAll(".actions a.btn").length).toBe(2);
  });

  test("renders no figure when the block is media-only", async () => {
    const doc = await getSite().getDoc("overlay-media-only/index.html");
    const background = doc.querySelector(".image-background");
    expect(background).not.toBeNull();
    expect(background.querySelector("figure")).toBeNull();
  });
});
