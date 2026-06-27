import { describe, expect, test } from "bun:test";
import { homePage, withTestSite } from "#test/test-site-factory.js";

const BUTTONS = [
  { text: "Primary Action", href: "/go/" },
  { text: "Ghost Action", href: "/other/", variant: "ghost", size: "lg" },
];

/** Build a one-block home page and pass the rendered document to `check` */
const withRenderedBlock = (block, images, check) =>
  withTestSite({ images, files: [homePage([block])] }, async (site) =>
    check(await site.getDoc("index.html")),
  );

/** Class names of an element's children, for asserting render order */
const childClasses = (el) => [...el.children].map((child) => child.className);

describe("hero block", () => {
  test("renders badge, prose-wrapped markdown content, then buttons", async () => {
    const hero = {
      type: "hero",
      badge: "New",
      content: "# Big Heading\n\nLead paragraph text.",
      buttons: BUTTONS,
    };
    await withRenderedBlock(hero, [], (doc) => {
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
  }, 30_000);
});

describe("image-background overlay", () => {
  const imageBackground = (overlay) => ({
    type: "image-background",
    image: "src/images/party.jpg",
    ...overlay,
  });

  test("renders markdown-only content in a .prose inside the figcaption", async () => {
    const block = imageBackground({ content: "## Overlay Heading" });
    await withRenderedBlock(block, ["party.jpg"], (doc) => {
      const prose = doc.querySelector(".image-background figcaption .prose");
      expect(prose).not.toBeNull();
      expect(prose.querySelector("h2").textContent).toBe("Overlay Heading");
    });
  }, 30_000);

  test("renders badge and buttons around the prose content", async () => {
    const block = imageBackground({
      badge: "Featured",
      content: "## Overlay Heading",
      buttons: BUTTONS,
    });
    await withRenderedBlock(block, ["party.jpg"], (doc) => {
      const figcaption = doc.querySelector(".image-background figcaption");
      expect(figcaption.querySelector(".badge").textContent).toBe("Featured");
      expect(childClasses(figcaption)).toEqual(["badge", "prose", "actions"]);
      expect(figcaption.querySelectorAll(".actions a.btn").length).toBe(2);
    });
  }, 30_000);

  test("renders no figure when the block is media-only", async () => {
    await withRenderedBlock(imageBackground({}), ["party.jpg"], (doc) => {
      const background = doc.querySelector(".image-background");
      expect(background).not.toBeNull();
      expect(background.querySelector("figure")).toBeNull();
    });
  }, 30_000);
});
