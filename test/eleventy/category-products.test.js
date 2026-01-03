import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

describe("category-products", () => {
  test("Category page renders products assigned to that category", async () => {
    await withTestSite(
      {
        files: [
          {
            path: "categories/widgets.md",
            frontmatter: {
              title: "Widgets",
            },
            content: "Category description.",
          },
          {
            path: "products/test-widget.md",
            frontmatter: {
              title: "Test Widget",
              categories: ["widgets"],
            },
            content: "A test widget product.",
          },
        ],
      },
      (site) => {
        const doc = site.getDoc("/categories/widgets/index.html");
        const html = doc.body.innerHTML;

        expect(html.includes("Test Widget")).toBe(true);
        expect(html.includes('href="/products/test-widget/#content"')).toBe(
          true,
        );
      },
    );
  });
});
