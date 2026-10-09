import { beforeEach, describe, expect, test, vi } from "vitest";
import { computeExternalImageHtml } from "#media/image-external.js";
import { LQIP_WIDTH } from "#media/image-lqip.js";
import { expectAsyncThrows } from "#test/test-utils.js";

const imageFn = vi.fn();
const processFormats = vi.fn(() => Promise.resolve({ raw: true }));
const prepareLqipMetadata = vi.fn(() =>
  Promise.resolve({
    bgImage: "url(data:lqip)",
    htmlMetadata: { webp: [{ width: 320 }, { width: 800 }] },
  }),
);
const wrapProcessedImage = vi.fn(() => Promise.resolve("<div>wrapped</div>"));

vi.mock("#media/image-lqip.js", async (importOriginal) => ({
  ...(await importOriginal()),
  getEleventyImg: () => Promise.resolve({ default: imageFn }),
}));
vi.mock("#media/image-pipeline.js", () => ({
  processFormats: (...args) => processFormats(...args),
  prepareLqipMetadata: (...args) => prepareLqipMetadata(...args),
  wrapProcessedImage: (...args) => wrapProcessedImage(...args),
}));

describe("computeExternalImageHtml", () => {
  beforeEach(() => vi.clearAllMocks());

  test("processes the url through the pipeline into wrapped html", async () => {
    const result = await computeExternalImageHtml({
      imageName: "https://example.com/pic.jpg",
      alt: "Sample Picture",
      loading: "lazy",
      classes: "hero",
      sizes: "100vw",
      widths: "400",
      aspectRatio: "16/9",
    });

    expect(result).toBe("<div>wrapped</div>");

    const [passedImageFn, src, imageOptions, widths] =
      processFormats.mock.calls[0];
    expect(passedImageFn).toBe(imageFn);
    expect(src).toBe("https://example.com/pic.jpg");
    expect(widths[0]).toBe(LQIP_WIDTH);
    expect(widths).toContain("400");

    // The filename format eleventy-img will call: slugified alt + a
    // short url hash, then per-width naming.
    expect(imageOptions.slug).toBe("sample-picture-58e7ee87");
    expect(
      imageOptions.filenameFormat("id", src, 320, "webp", imageOptions),
    ).toBe(`${imageOptions.slug}-320.webp`);

    expect(wrapProcessedImage).toHaveBeenCalledWith(
      { webp: [{ width: 320 }, { width: 800 }] },
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        classes: "hero",
        style: expect.stringContaining("800"),
      }),
    );
  });

  test("falls back to a generic slug when alt text is missing", async () => {
    await computeExternalImageHtml({
      imageName: "https://example.com/other.jpg",
      alt: null,
      loading: null,
      classes: null,
      sizes: null,
      widths: null,
      aspectRatio: null,
    });

    const options = processFormats.mock.calls.at(-1)[2];
    expect(options.slug).toMatch(/^external-image-[0-9a-f]{8}$/);
  });

  test("deduplicates concurrent work despite different local-only noLqip flags", async () => {
    const props = {
      imageName: "https://example.com/shared.jpg",
      alt: "Shared",
    };
    const results = await Promise.all([
      computeExternalImageHtml({ ...props, noLqip: true }),
      computeExternalImageHtml({ ...props, noLqip: false }),
    ]);

    expect(results).toEqual(["<div>wrapped</div>", "<div>wrapped</div>"]);
    expect(processFormats).toHaveBeenCalledTimes(1);
  });

  test("does not retain settled processing results", async () => {
    const props = {
      imageName: "https://example.com/repeated.jpg",
      alt: "Repeated",
    };
    await computeExternalImageHtml(props);
    await computeExternalImageHtml(props);

    expect(processFormats).toHaveBeenCalledTimes(2);
  });

  test("propagates processing failures without preventing a retry", async () => {
    const error = new Error("External image download failed");
    processFormats.mockRejectedValueOnce(error);
    const props = { imageName: "https://example.com/retry.jpg", alt: "Retry" };

    expect(await expectAsyncThrows(() => computeExternalImageHtml(props))).toBe(
      error,
    );
    await expect(computeExternalImageHtml(props)).resolves.toBe(
      "<div>wrapped</div>",
    );
    expect(processFormats).toHaveBeenCalledTimes(2);
  });
});
