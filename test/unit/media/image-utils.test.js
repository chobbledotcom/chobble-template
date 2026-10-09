import { describe, expect, test, vi } from "vitest";
import {
  buildImageWrapperStyles,
  DEFAULT_IMAGE_OPTIONS,
  getImageCacheDir,
  normalizeImagePath,
  normalizeImageUrl,
  parseWidths,
  prepareImageAttributes,
} from "#media/image-utils.js";

const { filenameFormat } = DEFAULT_IMAGE_OPTIONS;

describe("getImageCacheDir", () => {
  test("defaults to the checkout's .image-cache", () => {
    vi.stubEnv("IMAGE_CACHE_DIR", "");
    expect(getImageCacheDir()).toBe(".image-cache");
    vi.unstubAllEnvs();
  });

  test("follows IMAGE_CACHE_DIR so test runs redirect processed output", () => {
    vi.stubEnv("IMAGE_CACHE_DIR", "/swept/test-cache");
    expect(getImageCacheDir()).toBe("/swept/test-cache");
    vi.unstubAllEnvs();
  });
});

describe("image-utils", () => {
  describe("normalizeImagePath", () => {
    test("prepends ./src for paths starting with /", () => {
      expect(normalizeImagePath("/images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./ for paths starting with src/", () => {
      expect(normalizeImagePath("src/images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./src/ for paths starting with images/", () => {
      expect(normalizeImagePath("images/photo.jpg")).toBe(
        "./src/images/photo.jpg",
      );
    });

    test("prepends ./src/images/ for bare filenames", () => {
      expect(normalizeImagePath("photo.jpg")).toBe("./src/images/photo.jpg");
    });
  });

  describe("normalizeImageUrl", () => {
    test("passes through paths already rooted at /", () => {
      expect(normalizeImageUrl("/images/photo.jpg")).toBe("/images/photo.jpg");
    });

    test("strips src/ prefix", () => {
      expect(normalizeImageUrl("src/images/photo.jpg")).toBe(
        "/images/photo.jpg",
      );
    });

    test("prepends / for paths starting with images/", () => {
      expect(normalizeImageUrl("images/photo.jpg")).toBe("/images/photo.jpg");
    });

    test("prepends /images/ for bare filenames", () => {
      expect(normalizeImageUrl("photo.jpg")).toBe("/images/photo.jpg");
    });

    test("passes through https:// URLs unchanged", () => {
      expect(normalizeImageUrl("https://example.com/photo.jpg")).toBe(
        "https://example.com/photo.jpg",
      );
    });

    test("passes through http:// URLs unchanged", () => {
      expect(normalizeImageUrl("http://example.com/photo.jpg")).toBe(
        "http://example.com/photo.jpg",
      );
    });

    test("passes through protocol-relative URLs unchanged", () => {
      expect(normalizeImageUrl("//cdn.example.com/photo.jpg")).toBe(
        "//cdn.example.com/photo.jpg",
      );
    });

    test("passes through data: URIs unchanged", () => {
      const dataUri = "data:image/png;base64,iVBORw0KGgo=";
      expect(normalizeImageUrl(dataUri)).toBe(dataUri);
    });
  });

  describe("parseWidths", () => {
    test("splits comma-separated string into array and appends auto", () => {
      expect(parseWidths("240,480,900")).toEqual(["240", "480", "900", "auto"]);
    });

    test("spreads input array and appends auto", () => {
      const widths = [240, 480, 900];
      const result = parseWidths(widths);
      expect(result).toEqual([240, 480, 900, "auto"]);
      expect(result).not.toBe(widths);
    });

    test("returns default widths with auto appended for null/undefined", () => {
      const result = parseWidths(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([240, 480, 900, 1300, "auto"]);
    });

    test("returns default widths with auto appended for empty string", () => {
      const result = parseWidths("");
      expect(result).toEqual([240, 480, 900, 1300, "auto"]);
    });
  });

  describe("prepareImageAttributes", () => {
    test("builds img and picture attributes with provided values", () => {
      const { imgAttributes, pictureAttributes } = prepareImageAttributes({
        alt: "A photo",
        sizes: "100vw",
        loading: "eager",
        classes: "featured",
      });
      expect(imgAttributes).toEqual({
        alt: "A photo",
        sizes: "100vw",
        loading: "eager",
        decoding: "async",
      });
      expect(pictureAttributes).toEqual({ class: "featured" });
    });

    test("uses defaults for missing img values", () => {
      const { imgAttributes } = prepareImageAttributes({});
      expect(imgAttributes).toEqual({
        alt: "",
        sizes: "auto",
        loading: "lazy",
        decoding: "async",
      });
    });

    test("preserves an explicitly null alt attribute", () => {
      expect(
        prepareImageAttributes({ alt: null }).imgAttributes.alt,
      ).toBeNull();
    });

    test.each([null, ""])("defaults empty sizes and loading (%j)", (value) => {
      const { imgAttributes } = prepareImageAttributes({
        sizes: value,
        loading: value,
      });
      expect(imgAttributes).toMatchObject({ sizes: "auto", loading: "lazy" });
    });

    test.each([
      undefined,
      null,
      "",
      "  ",
      "\t\n",
    ])("omits blank picture classes (%j)", (classes) => {
      expect(prepareImageAttributes({ classes }).pictureAttributes).toEqual({});
    });

    test("preserves whitespace around nonblank picture classes", () => {
      expect(
        prepareImageAttributes({ classes: "  hero featured  " })
          .pictureAttributes,
      ).toEqual({
        class: "  hero featured  ",
      });
    });
  });

  describe("buildImageWrapperStyles", () => {
    test("builds style string with all properties", () => {
      const styles = buildImageWrapperStyles({
        bgImage: "url(thumb.jpg)",
        aspectRatio: "16/9",
        maxWidth: 800,
      });
      expect(styles).toContain("background-image: url(thumb.jpg)");
      expect(styles).toContain("aspect-ratio: 16/9");
      expect(styles).toContain("max-width: min(800px, 100%)");
    });

    test("omits background image when null", () => {
      const styles = buildImageWrapperStyles({
        bgImage: null,
        aspectRatio: "16/9",
        maxWidth: 800,
      });
      expect(styles).not.toContain("background-image");
    });

    test("omits aspect ratio when null", () => {
      const styles = buildImageWrapperStyles({
        bgImage: null,
        aspectRatio: null,
        maxWidth: 800,
      });
      expect(styles).not.toContain("aspect-ratio");
    });

    test("omits max-width when skipMaxWidth is true", () => {
      const styles = buildImageWrapperStyles({
        bgImage: null,
        aspectRatio: "16/9",
        maxWidth: 800,
        skipMaxWidth: true,
      });
      expect(styles).not.toContain("max-width");
      expect(styles).toContain("aspect-ratio: 16/9");
    });

    test("omits max-width when maxWidth is not provided", () => {
      const styles = buildImageWrapperStyles({
        bgImage: null,
        aspectRatio: "16/9",
      });
      expect(styles).not.toContain("max-width");
    });
  });

  describe("filenameFormat", () => {
    test.each([
      ["src/images/products/photo.jpg", "products-photo-240.webp"],
      ["images/products/photo.jpg", "products-photo-240.webp"],
      [".\\src\\images\\products\\photo.jpg", "products-photo-240.webp"],
      ["/other/path/photo.jpg", "other-path-photo-240.webp"],
      ["./src/images/products/item.png", "products-item-240.webp"],
      ["./src/images/news/banner.webp", "news-banner-240.webp"],
      ["image-cache/photo-crop-abc123.jpeg", "photo-crop-abc123-240.webp"],
      [
        "/abs/path/.image-cache/photo-crop-abc123.jpeg",
        "photo-crop-abc123-240.webp",
      ],
      ["../.image-cache/photo-crop-abc123.jpeg", "photo-crop-abc123-240.webp"],
      ["foo/.image-cache/photo-crop-abc123.jpeg", "photo-crop-abc123-240.webp"],
    ])("normalizes source path %s in the output filename", (src, expected) => {
      expect(filenameFormat("id", src, 240, "webp")).toBe(expected);
    });

    test("generates correct filename for root images", () => {
      expect(filenameFormat("id", "./src/images/photo.jpg", 240, "webp")).toBe(
        "photo-240.webp",
      );
    });

    test("generates correct filename for nested images", () => {
      expect(
        filenameFormat("id", "./src/images/products/photo.jpg", 240, "webp"),
      ).toBe("products-photo-240.webp");
    });

    test("generates correct filename for deeply nested images", () => {
      expect(
        filenameFormat(
          "id",
          "./src/images/products/featured/photo.jpg",
          480,
          "jpeg",
        ),
      ).toBe("products-featured-photo-480.jpeg");
    });

    test("generates correct filename for non-images directories", () => {
      expect(
        filenameFormat("id", "./src/assets/icons/logo.png", 240, "webp"),
      ).toBe("assets-icons-logo-240.webp");
    });

    test("different paths with same filename produce different output", () => {
      const productsResult = filenameFormat(
        "id",
        "./src/images/products/photo.jpg",
        240,
        "webp",
      );
      const newsResult = filenameFormat(
        "id",
        "./src/images/news/photo.jpg",
        240,
        "webp",
      );
      expect(productsResult).not.toBe(newsResult);
      expect(productsResult).toBe("products-photo-240.webp");
      expect(newsResult).toBe("news-photo-240.webp");
    });

    test("generates correct filename for .image-cache paths (cropped images)", () => {
      expect(
        filenameFormat(
          "id",
          ".image-cache/photo-crop-abc123.jpeg",
          240,
          "webp",
        ),
      ).toBe("photo-crop-abc123-240.webp");
    });

    test("includes a readable crop ratio in transformed image filenames", () => {
      expect(
        filenameFormat("id", "./src/images/photo.jpg", 240, "webp", {
          manualCacheKey: "16/9",
        }),
      ).toBe("photo-jpg-crop-16x9-240.webp");
    });

    test("different crop ratios produce different filenames", () => {
      const square = filenameFormat(
        "id",
        "./src/images/photo.jpg",
        240,
        "webp",
        { manualCacheKey: "1/1" },
      );
      const widescreen = filenameFormat(
        "id",
        "./src/images/photo.jpg",
        240,
        "webp",
        { manualCacheKey: "16/9" },
      );

      expect(square).not.toBe(widescreen);
    });

    test("different source extensions produce different crop filenames", () => {
      const jpeg = filenameFormat("id", "./src/images/photo.jpg", 240, "webp", {
        manualCacheKey: "16/9",
      });
      const png = filenameFormat("id", "./src/images/photo.png", 240, "webp", {
        manualCacheKey: "16/9",
      });

      expect(jpeg).not.toBe(png);
    });
  });
});
