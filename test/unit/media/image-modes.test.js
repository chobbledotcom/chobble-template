import { afterEach, describe, expect, test, vi } from "vitest";

const IMAGE_IMPORT_TIMEOUT = 10_000;

/**
 * PLACEHOLDER_MODE is read at module load, so these tests mock build-mode
 * (and the external processor) and re-import image.js fresh each time.
 */
const importImage = async ({ placeholderMode, externalStub } = {}) => {
  if (placeholderMode !== undefined) {
    vi.doMock("#build/build-mode.js", () => ({
      PLACEHOLDER_MODE: placeholderMode,
      FAST_INACCURATE_BUILDS: false,
    }));
  }
  if (externalStub) {
    vi.doMock("#media/image-external.js", () => ({
      computeExternalImageHtml: externalStub,
    }));
  }
  vi.resetModules();
  return import("#media/image.js");
};

afterEach(() => {
  vi.doUnmock("#build/build-mode.js");
  vi.doUnmock("#media/image-external.js");
  vi.resetModules();
});

describe("processAndWrapImage in placeholder mode", () => {
  test(
    "local images render the placeholder instead of processing",
    async () => {
      const { processAndWrapImage } = await importImage({
        placeholderMode: true,
      });

      const html = await processAndWrapImage({
        imageName: "party.jpg",
        alt: "A party",
        classes: "hero",
        returnElement: false,
        document: null,
      });

      expect(html).toContain("data:image/png");
      expect(html).toContain('alt="A party"');
    },
    IMAGE_IMPORT_TIMEOUT,
  );

  test(
    "external urls render the placeholder instead of fetching",
    async () => {
      const { processAndWrapImage } = await importImage({
        placeholderMode: true,
      });

      const html = await processAndWrapImage({
        imageName: "https://example.com/remote.jpg",
        alt: "Remote",
        returnElement: false,
        document: null,
      });

      expect(html).toContain("data:image/png");
      expect(html).toContain('alt="Remote"');
    },
    IMAGE_IMPORT_TIMEOUT,
  );
});

describe("processAndWrapImage with external urls", () => {
  test("delegates external urls to the external image processor", async () => {
    const externalStub = vi.fn(() => Promise.resolve("<div>external</div>"));
    const { processAndWrapImage } = await importImage({
      placeholderMode: false,
      externalStub,
    });

    const html = await processAndWrapImage({
      imageName: "https://example.com/remote.jpg",
      alt: "Remote",
      widths: "300",
      returnElement: false,
      document: null,
    });

    expect(html).toBe("<div>external</div>");
    expect(externalStub).toHaveBeenCalledWith(
      expect.objectContaining({
        imageName: "https://example.com/remote.jpg",
        alt: "Remote",
      }),
    );
  });
});
