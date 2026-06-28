import { describe, expect, test } from "bun:test";
import { useSharedSite } from "#test/test-site-factory.js";

const categoryProductsBlock = { type: "category-products" };

const widgetsCategory = {
  path: "categories/widgets.md",
  frontmatter: { name: "Widgets", blocks: [categoryProductsBlock] },
  content: "",
};

const widgetProduct = {
  path: "products/test-widget.md",
  frontmatter: {
    name: "Test Widget",
    categories: ["widgets"],
    blocks: [{ type: "markdown", content: "A test widget product." }],
  },
  content: "",
};

const noImageProduct = {
  path: "products/no-image.md",
  frontmatter: { name: "No Image Product", categories: ["widgets"] },
  content: "",
};

describe("category-products", () => {
  // Placeholder behaviour depends on the `placeholder_images` config, so tests
  // are grouped by config into two shared builds rather than one build each.
  describe("with placeholder_images enabled (default)", () => {
    const getSite = useSharedSite({
      files: [widgetsCategory, widgetProduct, noImageProduct],
    });

    test("Category page renders products assigned to that category", async () => {
      const doc = await getSite().getDoc("/categories/widgets/index.html");
      const html = doc.body.innerHTML;

      expect(html.includes("Test Widget")).toBe(true);
      expect(html.includes('href="/products/test-widget/"')).toBe(true);
    });

    test("Product without thumbnail shows placeholder by default", async () => {
      const doc = await getSite().getDoc("/categories/widgets/index.html");
      // With placeholder_images: true (default), products get placeholder thumbnails
      expect(doc.querySelector(".image-link") !== null).toBe(true);
    });
  });

  describe("with placeholder_images disabled", () => {
    const getSite = useSharedSite({
      config: { placeholder_images: false },
      files: [
        widgetsCategory,
        noImageProduct,
        {
          path: "news/2024-01-01-no-thumb.md",
          frontmatter: {
            name: "News Without Thumbnail",
            blocks: [
              { type: "markdown", content: "News content without any images" },
            ],
          },
          content: "",
        },
      ],
    });

    test("Product without thumbnail shows no image when placeholder_images disabled", async () => {
      const doc = await getSite().getDoc("/categories/widgets/index.html");
      // With placeholder_images: false, no thumbnail means no image rendered
      expect(doc.querySelector(".image-link")).toBe(null);
    });

    test("News post without thumbnail gets no placeholder when placeholder_images disabled", async () => {
      // News posts without thumbnails should have no placeholder image when placeholder_images: false
      // This exercises the return null path in getPlaceholderIfEnabled (lines 51-52)
      const newsDoc = await getSite().getDoc("/news/no-thumb/index.html");
      expect(newsDoc.querySelector(".post-meta figure")).toBe(null);
      expect(newsDoc.querySelector(".post-meta img")).toBe(null);
    });
  });
});
