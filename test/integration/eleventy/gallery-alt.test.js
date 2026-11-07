import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createTestSite } from "#test/test-site-factory.js";

const altsOf = (images) => [...images].map((img) => img.getAttribute("alt"));

const THUMBNAILS = ".items .image-link img";
const POPUP_COPIES = ".gallery-full-size-images img";

// alt-tags.json is imported through the "#data" package alias, which resolves
// against the checkout rather than the temp site, so the lookup itself is
// replaced with a plain module instead.
const ALT_TAGS_LOOKUP = `export default {
  "party.jpg": "Lookup party alt",
  "dinner.jpg": "Lookup dinner alt",
};
`;

// The lookup is keyed by bare filename, so one party.jpg entry covers every
// image with that name. The two pages therefore declare their own alt text
// for the same file, which the lookup alone cannot represent.
const EXPECTED_ALTS = {
  "gallery-item-alt": ["Red chair in the window", "Lookup dinner alt"],
  "gallery-colliding-alt": ["Blue table by the door"],
};

let site = null;

beforeAll(async () => {
  site = await createTestSite({
    images: ["party.jpg", "dinner.jpg"],
    files: [
      {
        path: "pages/gallery-item-alt.md",
        frontmatter: {
          name: "gallery-item-alt",
          permalink: "/gallery-item-alt/",
          blocks: [
            {
              type: "gallery",
              items: [
                { image: "/images/party.jpg", alt: "Red chair in the window" },
                { image: "/images/dinner.jpg" },
              ],
            },
          ],
        },
      },
      {
        path: "pages/gallery-colliding-alt.md",
        frontmatter: {
          name: "gallery-colliding-alt",
          permalink: "/gallery-colliding-alt/",
          blocks: [
            {
              type: "gallery",
              items: [
                { image: "/images/party.jpg", alt: "Blue table by the door" },
              ],
            },
          ],
        },
      },
    ],
  });
  site.addFile("_data/altTagsLookup.js", ALT_TAGS_LOOKUP);
  await site.build();
}, 30_000);

afterAll(() => site?.cleanup());

describe("gallery block image alt text", () => {
  test("thumbnails and their popup copies both use each item's alt text", async () => {
    for (const [slug, expected] of Object.entries(EXPECTED_ALTS)) {
      const doc = await site.getDoc(`${slug}/index.html`);
      expect(altsOf(doc.querySelectorAll(THUMBNAILS))).toEqual(expected);
      expect(altsOf(doc.querySelectorAll(POPUP_COPIES))).toEqual(expected);
    }
  });
});
