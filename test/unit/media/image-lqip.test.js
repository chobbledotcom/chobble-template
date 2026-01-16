import { describe, expect, test } from "bun:test";
import { filenameFormat, getPathAwareBasename } from "#media/image-lqip.js";

describe("image-lqip", () => {
  describe("getPathAwareBasename", () => {
    test("extracts basename for images in root images folder", () => {
      expect(getPathAwareBasename("./src/images/photo.jpg")).toBe("photo");
    });

    test("includes subdirectory in basename for nested images", () => {
      expect(getPathAwareBasename("./src/images/products/photo.jpg")).toBe(
        "products-photo",
      );
    });

    test("handles multiple subdirectory levels", () => {
      expect(
        getPathAwareBasename("./src/images/products/featured/photo.jpg"),
      ).toBe("products-featured-photo");
    });

    test("handles paths without ./ prefix", () => {
      expect(getPathAwareBasename("src/images/products/photo.jpg")).toBe(
        "products-photo",
      );
    });

    test("handles paths starting with images/", () => {
      expect(getPathAwareBasename("images/products/photo.jpg")).toBe(
        "products-photo",
      );
    });

    test("handles Windows-style backslashes", () => {
      expect(getPathAwareBasename(".\\src\\images\\products\\photo.jpg")).toBe(
        "products-photo",
      );
    });

    test("preserves path for non-images directories", () => {
      expect(getPathAwareBasename("./src/assets/icons/logo.png")).toBe(
        "assets-icons-logo",
      );
    });

    test("handles paths outside src directory", () => {
      expect(getPathAwareBasename("/other/path/photo.jpg")).toBe(
        "other-path-photo",
      );
    });

    test("handles various image extensions", () => {
      expect(getPathAwareBasename("./src/images/products/item.png")).toBe(
        "products-item",
      );
      expect(getPathAwareBasename("./src/images/news/banner.webp")).toBe(
        "news-banner",
      );
    });
  });

  describe("filenameFormat", () => {
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
  });
});
