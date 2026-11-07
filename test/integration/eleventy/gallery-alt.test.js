import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createTestSite } from "#test/test-site-factory.js";

const altsOf = (nodes) => [...nodes].map((img) => img.getAttribute("alt"));

const POPUP_COPIES = ".gallery-full-size-images img";

// alt-tags.json is imported through the "#data" package alias, which resolves
// against the checkout rather than the temp site, so the lookup itself is
// replaced with a plain module instead.
const ALT_TAGS_LOOKUP = `export default {
  "party.jpg": "Lookup party alt",
  "dinner.jpg": "Lookup dinner alt",
};
`;

// Every way an image reaches gallery-full-size-images.html, with the alt text
// its visible image and its popup copy must both carry. Fixtures, page paths
// and expectations come from one row each so they cannot drift apart.
//
// The lookup is keyed by bare filename, so a single party.jpg entry covers
// every image with that name. The two gallery-block pages therefore declare
// their own alt text for the same file, which the lookup alone cannot represent.
const PAGES = [
  {
    slug: "gallery-item-alt",
    collection: "pages",
    // Block item objects in every alt state: declared, empty, and absent. All
    // three must resolve to the same value in the grid and in the popup.
    frontmatter: {
      name: "Gallery item alt",
      blocks: [
        {
          type: "gallery",
          items: [
            { image: "/images/party.jpg", alt: "Red chair in the window" },
            { image: "/images/dinner.jpg", alt: "" },
            { image: "/images/dinner.jpg" },
          ],
        },
      ],
    },
    visible: ".items .image-link img",
    alts: ["Red chair in the window", "Lookup dinner alt", "Lookup dinner alt"],
  },
  {
    slug: "gallery-colliding-alt",
    collection: "pages",
    frontmatter: {
      name: "Gallery colliding alt",
      blocks: [
        {
          type: "gallery",
          items: [
            { image: "/images/party.jpg", alt: "Blue table by the door" },
          ],
        },
      ],
    },
    visible: ".items .image-link img",
    alts: ["Blue table by the door"],
  },
  {
    // Product galleries pass bare image paths, so their alt text still comes
    // from the lookup, in the thumbnails and the hero image alike.
    slug: "gallery-image-paths",
    collection: "products",
    frontmatter: {
      name: "Path gallery",
      gallery: ["/images/party.jpg", "/images/dinner.jpg"],
      blocks: [{ type: "product-gallery" }],
    },
    visible: "#gallery img",
    hero: ".current-image img",
    alts: ["Lookup party alt", "Lookup dinner alt"],
  },
];

let site = null;

beforeAll(async () => {
  site = await createTestSite({
    images: ["party.jpg", "dinner.jpg"],
    files: PAGES.map(({ slug, collection, frontmatter }) => ({
      path: `${collection}/${slug}.md`,
      frontmatter: { ...frontmatter, permalink: `/${slug}/` },
    })),
  });
  site.addFile("_data/altTagsLookup.js", ALT_TAGS_LOOKUP);
  await site.build();
}, 30_000);

afterAll(() => site?.cleanup());

describe("gallery image alt text", () => {
  for (const page of PAGES) {
    test(`${page.slug} renders its popup copies with its images' alt text`, async () => {
      const doc = await site.getDoc(`${page.slug}/index.html`);

      expect(altsOf(doc.querySelectorAll(page.visible))).toEqual(page.alts);
      expect(altsOf(doc.querySelectorAll(POPUP_COPIES))).toEqual(page.alts);

      if (page.hero) {
        expect(altsOf(doc.querySelectorAll(page.hero))).toEqual(
          page.alts.slice(0, 1),
        );
      }
    });
  }
});
