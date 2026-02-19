import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

const widgetProduct = {
  path: "products/test-widget.md",
  frontmatter: { title: "Test Widget", categories: ["widgets"] },
  content: "A test widget product.",
};

const widgetsCategory = (extra = {}) => ({
  path: "categories/widgets.md",
  frontmatter: { title: "Widgets", ...extra },
  content: "Category description.",
});

const categoryWithProduct = [
  {
    path: "categories/widgets.md",
    frontmatter: { title: "Widgets" },
    content: "",
  },
  {
    path: "products/no-image.md",
    frontmatter: { title: "No Image Product", categories: ["widgets"] },
    content: "",
  },
];

describe("category-products", () => {
  test("Category page renders products assigned to that category", async () => {
    await withTestSite(
      { files: [widgetsCategory(), widgetProduct] },
      async (site) => {
        const doc = await site.getDoc("/categories/widgets/index.html");
        const html = doc.body.innerHTML;

        expect(html.includes("Test Widget")).toBe(true);
        expect(html.includes('href="/products/test-widget/#content"')).toBe(
          true,
        );
      },
    );
  });

  test("Product without thumbnail shows placeholder by default", async () => {
    await withTestSite({ files: categoryWithProduct }, async (site) => {
      const doc = await site.getDoc("/categories/widgets/index.html");
      // With placeholder_images: true (default), products get placeholder thumbnails
      expect(doc.querySelector(".image-link") !== null).toBe(true);
    });
  });

  test("Product without thumbnail shows no image when placeholder_images disabled", async () => {
    await withTestSite(
      { config: { placeholder_images: false }, files: categoryWithProduct },
      async (site) => {
        const doc = await site.getDoc("/categories/widgets/index.html");
        // With placeholder_images: false, no thumbnail means no image rendered
        expect(doc.querySelector(".image-link")).toBe(null);
      },
    );
  });

  test("Category page renders below_products content after products", async () => {
    const categoryWithBelowProducts = widgetsCategory({
      below_products: "This text appears **below** the products.",
    });

    await withTestSite(
      { files: [categoryWithBelowProducts, widgetProduct] },
      (site) => {
        const html = site.getOutput("/categories/widgets/index.html");

        expect(html).toContain("This text appears");
        expect(html).toContain("<strong>below</strong>");
      },
    );
  });

  test("Category page omits below_products section when field is not set", async () => {
    await withTestSite({ files: [widgetsCategory()] }, (site) => {
      const html = site.getOutput("/categories/widgets/index.html");

      expect(html).not.toContain("below_products");
    });
  });

  test("News post without thumbnail gets no placeholder when placeholder_images disabled", async () => {
    await withTestSite(
      {
        config: { placeholder_images: false },
        files: [
          {
            path: "news/2024-01-01-no-thumb.md",
            frontmatter: { title: "News Without Thumbnail" },
            content: "News content without any images",
          },
        ],
      },
      async (site) => {
        // News posts without thumbnails should have no placeholder image when placeholder_images: false
        // This exercises the return null path in getPlaceholderIfEnabled (lines 51-52)
        const newsDoc = await site.getDoc("/news/no-thumb/index.html");
        expect(newsDoc.querySelector(".post-meta figure")).toBe(null);
        expect(newsDoc.querySelector(".post-meta img")).toBe(null);
      },
    );
  });
});
