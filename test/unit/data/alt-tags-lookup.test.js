import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Liquid } from "liquidjs";
import { normalizeImageUrl } from "#media/image-utils.js";
import { mockModule, rootDir } from "#test/test-utils.js";

const ALT_TAGS_FIXTURE = {
  images: [
    { path: "/images/products/red-widget/01.jpg", alt: "Red widget front" },
    { path: "/images/products/blue-widget/01.jpg", alt: "Blue widget front" },
    // Legacy entry written as a bare filename
    { path: "logo.png", alt: "Site logo" },
    { path: "https://cdn.example.com/photo.jpg", alt: "CDN photo" },
  ],
};

await mockModule("#data/alt-tags.json", () => ({
  default: ALT_TAGS_FIXTURE,
}));

const altTagsLookup = (await import("#data/altTagsLookup.js")).default;

const liquid = new Liquid({
  root: [join(rootDir, "src/_includes")],
  extname: ".html",
});
liquid.registerFilter("normalizeImageUrl", normalizeImageUrl);

/** Render get-alt-text.html the way Eleventy includes it. */
const renderAltText = (image, fallback) =>
  liquid.renderFile("get-alt-text.html", {
    image,
    fallback,
    altTagsLookup,
  });

// Every shape a template may pass for an image under the media root, e.g.
// "/images/products/red-widget/01.jpg" is reachable as all four of these.
const imageReferenceShapes = (mediaPath) => [
  `/images${mediaPath}`,
  `src/images${mediaPath}`,
  `images${mediaPath}`,
  mediaPath.replace(/^\//, ""),
];

describe("altTagsLookup", () => {
  test("keys entries by their normalised full path, not their basename", () => {
    expect(Object.keys(altTagsLookup)).toEqual(
      ALT_TAGS_FIXTURE.images.map(({ path }) => normalizeImageUrl(path)),
    );
    expect(altTagsLookup["01.jpg"]).toBeUndefined();
    expect(altTagsLookup["logo.png"]).toBeUndefined();
  });

  test("keeps alt text for same-named files in different directories", async () => {
    expect(await renderAltText("/images/products/red-widget/01.jpg")).toBe(
      "Red widget front",
    );
    expect(await renderAltText("/images/products/blue-widget/01.jpg")).toBe(
      "Blue widget front",
    );
    // A bare reference points at the media root, not at either product folder
    expect(await renderAltText("01.jpg", "Fallback alt")).toBe("Fallback alt");
  });

  test("matches every image reference shape for a registered path", async () => {
    for (const image of imageReferenceShapes("/products/red-widget/01.jpg")) {
      expect([image, await renderAltText(image)]).toEqual([
        image,
        "Red widget front",
      ]);
    }
  });

  test("matches a legacy bare-filename entry from a full image reference", async () => {
    expect(await renderAltText("src/images/logo.png")).toBe("Site logo");
    expect(await renderAltText("logo.png")).toBe("Site logo");
  });

  test("matches an external image entry by its full URL", async () => {
    expect(await renderAltText("https://cdn.example.com/photo.jpg")).toBe(
      "CDN photo",
    );
    expect(
      await renderAltText("https://cdn.example.com/other/photo.jpg", "Fallback"),
    ).toBe("Fallback");
  });

  test("uses the fallback argument when the image is not registered", async () => {
    expect(await renderAltText("/images/unknown.jpg", "Fallback alt")).toBe(
      "Fallback alt",
    );
  });

  test("renders empty alt text when neither the image nor a fallback exists", async () => {
    expect(await renderAltText("/images/unknown.jpg")).toBe("");
  });
});
