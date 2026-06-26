import { describe, expect, test } from "bun:test";
import { withTestSite } from "#test/test-site-factory.js";

/**
 * Menu `cards: true` rendering. Exercises the real Eleventy build so the
 * menu block, the no-link card partial, the shared `_items.scss` markup, and
 * the Stripe cart controls all render through the production pipeline.
 *
 * Uses `pages/` pages (with explicit permalinks) carrying the `menu` block so
 * `page.fileSlug` drives `getCategoriesByMenu`, and so the menus-collection
 * PDF pipeline is not triggered.
 *
 * Cart-mode branches (quote / disabled) are covered by the mocked-config unit
 * test in test/unit/menu-items/menu-items.11tydata.test.js: the `withTestSite`
 * harness symlinks `_lib` to the real repo while copying `_data`, so
 * `getConfig()` in an 11tydata file can bind to a different config instance
 * than the template `config` global, making non-default `cart_mode` overrides
 * unreliable at the render level. The default site config is `stripe`, which
 * both instances agree on, so Stripe cart rendering is asserted here.
 */

const rowsPage = {
  path: "pages/rows.md",
  frontmatter: {
    name: "Rows",
    permalink: "/rows/",
    blocks: [{ type: "menu" }],
  },
  content: "",
};

const menuItemFile = (slug, frontmatter) => ({
  path: `menu-items/${slug}.md`,
  frontmatter: { menu_categories: ["mains"], ...frontmatter },
  content: "",
});

const burgerMenuItem = () =>
  menuItemFile("burger", {
    name: "Beyond Burger",
    price: "£15.00",
    description: "Juicy plant burger with chips.",
    is_vegan: true,
    sku: "MBRGR1",
    thumbnail: "/images/party.jpg",
  });

const saladMenuItem = () =>
  menuItemFile("salad", {
    name: "Greek Salad",
    price: "£9.00",
    description: "Crispy fresh salad.",
  });

const cardsSite = ({ menus = ["cards"], items = [], extra = [] } = {}) => ({
  images: ["party.jpg"],
  files: [
    {
      path: "pages/cards.md",
      frontmatter: {
        name: "Cards",
        permalink: "/cards/",
        blocks: [{ type: "menu", cards: true }],
      },
      content: "",
    },
    {
      path: "menu-categories/mains.md",
      frontmatter: { name: "Mains", order: 1, menus },
      content: "",
    },
    ...items,
    ...extra,
  ],
});

const cardByName = (doc, name) =>
  [...doc.querySelectorAll(".menu-card-item")].find((li) =>
    li.textContent.includes(name),
  );

describe("menu block cards mode", () => {
  test("cards: true renders ul.items.menu-card-items; rows renders ul.menu-items", async () => {
    await withTestSite(
      cardsSite({
        menus: ["cards", "rows"],
        items: [burgerMenuItem(), saladMenuItem()],
        extra: [rowsPage],
      }),
      async (site) => {
        const cardsDoc = await site.getDoc("/cards/index.html");
        const rowsDoc = await site.getDoc("/rows/index.html");

        // Cards page uses the card grid, not the classic rows.
        expect(
          cardsDoc.querySelector("ul.items.menu-card-items"),
        ).not.toBeNull();
        expect(cardsDoc.querySelector("ul.menu-items")).toBeNull();
        expect(
          cardsDoc.querySelectorAll("ul.menu-card-items > li.menu-card-item"),
        ).toHaveLength(2);

        // Rows page keeps the classic layout and has no card grid.
        expect(rowsDoc.querySelector("ul.menu-items")).not.toBeNull();
        expect(rowsDoc.querySelector("ul.items.menu-card-items")).toBeNull();
        expect(rowsDoc.querySelectorAll("ul.menu-items > li")).toHaveLength(2);
      },
    );
  });

  test("card mode renders name, dietary key, price, description, thumbnail, and no anchors", async () => {
    await withTestSite(
      cardsSite({ items: [burgerMenuItem(), saladMenuItem()] }),
      async (site) => {
        const doc = await site.getDoc("/cards/index.html");

        const burger = cardByName(doc, "Beyond Burger");
        expect(burger).toBeDefined();
        expect(burger.querySelector("h3").textContent).toContain(
          "Beyond Burger",
        );
        expect(burger.querySelector("h3").textContent).toContain("VE");
        expect(burger.querySelector(".price").textContent.trim()).toBe(
          "£15.00",
        );
        expect(burger.textContent).toContain("Juicy plant burger with chips.");
        // Thumbnail renders in a no-link wrapper; title and image are not links.
        expect(burger.querySelector(".menu-card-image")).not.toBeNull();
        expect(burger.querySelector(".menu-card-image a")).toBeNull();
        expect(burger.querySelector("h3 a")).toBeNull();

        // Text-only card (no thumbnail) still renders content cleanly.
        const salad = cardByName(doc, "Greek Salad");
        expect(salad).toBeDefined();
        expect(salad.querySelector(".menu-card-image")).toBeNull();
        expect(salad.querySelector(".price").textContent.trim()).toBe("£9.00");
      },
    );
  });

  test("stripe mode renders Add to Cart + quantity only for SKU-backed items", async () => {
    await withTestSite(
      cardsSite({
        items: [
          menuItemFile("burger", {
            name: "Beyond Burger",
            price: "£15.00",
            sku: "MBRGR1",
            thumbnail: "/images/party.jpg",
          }),
          menuItemFile("salad", { name: "Greek Salad", price: "£9.00" }),
        ],
      }),
      async (site) => {
        const doc = await site.getDoc("/cards/index.html");

        // SKU-backed item gets cart controls with quantity selector.
        const burger = cardByName(doc, "Beyond Burger");
        expect(burger.querySelector(".add-to-cart")).not.toBeNull();
        expect(burger.querySelector(".add-to-cart").textContent.trim()).toBe(
          "Add to Cart",
        );
        expect(burger.querySelector(".item-quantity")).not.toBeNull();

        // No-SKU item renders no cart controls in stripe mode.
        const salad = cardByName(doc, "Greek Salad");
        expect(salad.querySelector(".add-to-cart")).toBeNull();
        expect(salad.querySelector(".item-quantity")).toBeNull();
      },
    );
  });
});
