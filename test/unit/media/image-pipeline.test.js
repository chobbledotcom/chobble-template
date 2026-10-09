import { describe, expect, test, vi } from "vitest";

const generateHTML = vi.fn(() => "<picture>generated</picture>");
const extractLqipFromMetadata = vi.fn(() => Promise.resolve("url(data:lqip)"));
const removeLqip = vi.fn((metadata) => ({ ...metadata, lqipRemoved: true }));

vi.mock("#media/image-lqip.js", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getEleventyImg: () => Promise.resolve({ generateHTML }),
    extractLqipFromMetadata: (...args) => extractLqipFromMetadata(...args),
    removeLqip: (...args) => removeLqip(...args),
  };
});

const {
  prepareLqipMetadata,
  processFormats,
  resolveOutput,
  wrapImageHtml,
  wrapProcessedImage,
} = await import("#media/image-pipeline.js");
const { JPEG_FALLBACK_WIDTH } = await import("#media/image-utils.js");

describe("wrapImageHtml", () => {
  test("wraps inner html in the image-wrapper div with style", async () => {
    const html = await wrapImageHtml("<picture>x</picture>", {
      classes: null,
      style: "aspect-ratio: 1/1",
    });
    expect(html).toBe(
      '<div class="image-wrapper" style="aspect-ratio: 1/1"><picture>x</picture></div>',
    );
  });

  test("appends extra classes after image-wrapper", async () => {
    const html = await wrapImageHtml("<img>", { classes: "hero", style: null });
    expect(html).toContain('class="image-wrapper hero"');
  });
});

describe("processFormats", () => {
  test("runs webp and jpeg passes and merges their metadata", async () => {
    const imageFn = vi.fn((_path, options) =>
      Promise.resolve(
        options.formats[0] === "webp"
          ? { webp: [{ width: 240 }] }
          : { jpeg: [{ width: JPEG_FALLBACK_WIDTH }] },
      ),
    );

    const merged = await processFormats(imageFn, "./src/images/a.jpg", {
      outputDir: ".image-cache",
    });

    expect(merged).toEqual({
      webp: [{ width: 240 }],
      jpeg: [{ width: JPEG_FALLBACK_WIDTH }],
    });
    const jpegCall = imageFn.mock.calls.find(
      ([, options]) => options.formats[0] === "jpeg",
    );
    expect(jpegCall[1].widths).toEqual([JPEG_FALLBACK_WIDTH]);
  });

  test("passes the requested widths through to each format pass", async () => {
    const imageFn = vi.fn(() => Promise.resolve({}));

    await processFormats(imageFn, "a.jpg", {}, [64, "auto"], [900]);

    const [webpCall, jpegCall] = imageFn.mock.calls;
    expect(webpCall[1].widths).toEqual([64, "auto"]);
    expect(jpegCall[1].widths).toEqual([900]);
  });
});

describe("prepareLqipMetadata", () => {
  test("extracts the LQIP background and strips it from the metadata", async () => {
    const metadata = { webp: [{ width: 64 }, { width: 240 }] };

    const { bgImage, htmlMetadata } = await prepareLqipMetadata(metadata);

    expect(bgImage).toBe("url(data:lqip)");
    expect(htmlMetadata.lqipRemoved).toBe(true);
    expect(extractLqipFromMetadata).toHaveBeenCalledWith(metadata);
  });

  test("passes metadata through untouched when extraction is disabled", async () => {
    const metadata = { webp: [{ width: 240 }] };

    const result = await prepareLqipMetadata(metadata, false);

    expect(result).toEqual({ bgImage: null, htmlMetadata: metadata });
  });
});

describe("wrapProcessedImage", () => {
  test("generates picture html and wraps it with classes and style", async () => {
    const html = await wrapProcessedImage(
      { webp: [] },
      { alt: "x" },
      { class: "hero" },
      { classes: "hero", style: "aspect-ratio: 16/9" },
    );

    expect(generateHTML).toHaveBeenCalledWith(
      { webp: [] },
      { alt: "x" },
      { class: "hero" },
    );
    expect(html).toBe(
      '<div class="image-wrapper hero" style="aspect-ratio: 16/9"><picture>generated</picture></div>',
    );
  });
});

describe("resolveOutput", () => {
  test("returns the html string when no element is requested", async () => {
    expect(await resolveOutput("<div>x</div>", false, null)).toBe(
      "<div>x</div>",
    );
  });

  test("returns a DOM element when requested", async () => {
    const element = await resolveOutput("<div>x</div>", true, document);
    expect(element.tagName).toBe("DIV");
    expect(element.textContent).toBe("x");
  });
});
