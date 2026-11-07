import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Liquid } from "liquidjs";
import { mockModule, rootDir } from "#test/test-utils.js";

const ALT_TAGS_FIXTURE = {
  images: [
    { path: "/images/products/red-widget/01.jpg", alt: "Red widget front" },
    { path: "/images/products/blue-widget/01.jpg", alt: "Blue widget front" },
    { path: "/images/legacy-photo.jpg", alt: "Legacy photo" },
    { path: "logo.png", alt: "Site logo" },
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

/** Render get-alt-text.html the way Eleventy includes it. */
const renderAltText = (image, fallback) =>
  liquid.renderFile("get-alt-text.html", {
    image,
    fallback,
    altTagsLookup,
  });

describe("altTagsLookup", () => {
  test("keys entries by their full path, not their basename", () => {
    expect(altTagsLookup["/images/products/red-widget/01.jpg"]).toBe(
      "Red widget front",
    );
    expect(altTagsLookup["/images/products/blue-widget/01.jpg"]).toBe(
      "Blue widget front",
    );
    expect(altTagsLookup["01.jpg"]).toBeUndefined();
  });

  test("keeps alt text for same-named files in different directories", async () => {
    expect(await renderAltText("/images/products/red-widget/01.jpg")).toBe(
      "Red widget front",
    );
    expect(await renderAltText("/images/products/blue-widget/01.jpg")).toBe(
      "Blue widget front",
    );
  });

  test("falls back to a basename key when the full path is not registered", async () => {
    expect(await renderAltText("src/images/logo.png")).toBe("Site logo");
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
