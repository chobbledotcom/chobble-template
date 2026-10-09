import { describe, expect, test } from "vitest";
import siteData from "#data/site.json" with { type: "json" };
import { PLATTER, TENT } from "#test/fixtures/products.js";
import { pageWithBlocks, useSharedSite } from "#test/test-site-factory.js";
import { quoteItem } from "#utils/quote-item.js";

/** A product page in src/products/ holding the add-to-quote block. */
const product = (slug, frontmatter) => ({
  path: `products/${slug}.md`,
  frontmatter: { ...frontmatter, blocks: [{ type: "add-to-quote" }] },
});

const QUOTE_PAGES = [
  pageWithBlocks("list", [{ type: "items", collection: "products" }]),
  pageWithBlocks("quote", [{ type: "quote-form", content: "## Your quote" }]),
];

const getShopSite = useSharedSite({
  files: [
    product("tent", TENT),
    product("platter", PLATTER),
    product("leaflet", { name: "Leaflet" }),
    ...QUOTE_PAGES,
  ],
  config: { formspark_id: "abc123", currency: "EUR" },
});

const getNoProductsSite = useSharedSite({
  files: [pageWithBlocks("plain", [{ type: "markdown", content: "Hi" }])],
});

const buttonOf = (doc) => doc.querySelector("form.add-to-quote");

/** The quote page's form, with the value of each hidden field it sends. */
const quoteForm = async () => {
  const doc = await getShopSite().getDoc("quote/index.html");
  const form = doc.querySelector(".quote-form-block form");
  const hidden = Object.fromEntries(
    [...form.querySelectorAll('input[type="hidden"]')].map((input) => [
      input.name,
      input.value,
    ]),
  );
  return { form, hidden };
};

describe("quotes", () => {
  test("gives a product page the quote data its add-to-quote button carries", async () => {
    const doc = await getShopSite().getDoc("products/tent/index.html");
    expect(JSON.parse(buttonOf(doc).dataset.quoteItem)).toEqual(
      JSON.parse(JSON.stringify(quoteItem(TENT))),
    );
  });

  test("labels a hire product's button with its one-day price", async () => {
    const doc = await getShopSite().getDoc("products/tent/index.html");
    expect(buttonOf(doc).querySelector("button").textContent).toBe(
      "Add to quote - from €80",
    );
  });

  test("offers each option of a product with several, priced", async () => {
    const doc = await getShopSite().getDoc("products/platter/index.html");
    expect(
      [...buttonOf(doc).querySelectorAll("option")].map((o) => [
        o.value,
        o.textContent,
      ]),
    ).toEqual([
      ["0", "Small - €45"],
      ["1", "Large - €99.50"],
    ]);
  });

  test("renders no button on a product without options", async () => {
    const doc = await getShopSite().getDoc("products/leaflet/index.html");
    expect(buttonOf(doc)).toBeNull();
  });

  test("puts an add-to-quote button on each listed product with options", async () => {
    const doc = await getShopSite().getDoc("list/index.html");
    const buttons = [...doc.querySelectorAll(".items form.add-to-quote")];
    expect(
      buttons.map((form) => JSON.parse(form.dataset.quoteItem).name),
    ).toEqual(["Platter", "Tent"]);
  });

  test("links to the quote from the header of a site with products", async () => {
    const doc = await getShopSite().getDoc("list/index.html");
    const link = doc.querySelector("nav.site-nav a.quote-link");
    expect(link.getAttribute("href")).toBe("/quote/");
    expect(link.hasAttribute("hidden")).toBe(true);
    expect(
      doc.querySelector('script[src^="/assets/js/quote.js"]'),
    ).not.toBeNull();
  });

  test("leaves the quote link out of a site without products", async () => {
    const doc = await getNoProductsSite().getDoc("plain/index.html");
    expect(doc.querySelector(".quote-link")).toBeNull();
    expect(doc.querySelector('script[src^="/assets/js/quote.js"]')).toBeNull();
  });

  test("shows the quote beside the form that sends it", async () => {
    const doc = await getShopSite().getDoc("quote/index.html");
    const block = doc.querySelector(".quote-form-block");
    expect(block.dataset.currency).toBe("EUR");
    expect(block.querySelector(".quote-summary h2").textContent).toBe(
      "Your quote",
    );
    expect(
      block.querySelector(".quote-summary + form.contact-form"),
    ).not.toBeNull();
  });

  test("posts the quote to the form service, landing on the quote-sent page", async () => {
    const { form, hidden } = await quoteForm();
    expect(form.getAttribute("action")).toBe("https://submit-form.com/abc123");
    expect(hidden).toEqual({
      _redirect: `${siteData.url}/quote-sent/`,
      "_email.template.footer": "false",
      "_email.from": `${siteData.name} quote request`,
      "_email.subject": `New quote request from the ${siteData.name} website`,
      cart_items: "",
      estimated_total: "",
      hire_days: "",
    });
  });

  test("asks for contact details, hire dates and a message by default", async () => {
    const { form } = await quoteForm();
    expect(
      [...form.querySelectorAll("label > input, textarea")].map((el) => [
        el.getAttribute("name"),
        el.getAttribute("type"),
      ]),
    ).toEqual([
      ["name", "text"],
      ["email", "email"],
      ["phone", "tel"],
      ["start_date", "date"],
      ["end_date", "date"],
      ["message", null],
    ]);
    expect(form.querySelector("button[type=submit]").textContent).toBe(
      "Request a Quote",
    );
  });
});
