/**
 * A site that publishes the same page in more than one language has to say so
 * in the rendered HTML: the language on the html element, a reciprocal
 * hreflang set with an x-default, the locale tags, a way to change language,
 * and a breadcrumb trail that does not send a reader back to the base
 * language. None of that is visible from the resolver's unit tests, so it is
 * checked here against a built site.
 */

import { describe, expect, test } from "vitest";
import siteData from "#data/site.json" with { type: "json" };
import { ABOUT_GROUP, DE, EN } from "#test/fixtures/languages.js";
import { useSharedSite } from "#test/test-site-factory.js";

const LANGUAGES = [EN, DE];
const TRANSLATIONS = [ABOUT_GROUP];
const SITE_URL = siteData.url;

const alternatesOf = (doc) =>
  [...doc.querySelectorAll('link[rel="alternate"]')].map((link) => [
    link.getAttribute("hreflang"),
    link.getAttribute("href"),
  ]);

const schemaOf = (doc) =>
  JSON.parse(
    doc.querySelector('script[type="application/ld+json"]').textContent,
  );

const languageLinksOf = (doc) =>
  [...doc.querySelectorAll("footer .language-links a")].map((link) => [
    link.getAttribute("hreflang"),
    link.getAttribute("href"),
    link.textContent.trim(),
  ]);

describe("a site publishing two languages", () => {
  const getSite = useSharedSite({
    config: { placeholder_images: false, show_breadcrumbs: true },
    dataFiles: [
      { filename: "languages.json", data: LANGUAGES },
      { filename: "translations.json", data: TRANSLATIONS },
    ],
    files: [
      {
        path: "pages/about.md",
        frontmatter: {
          name: "About",
          title: "About",
          permalink: "/about/",
          blocks: [{ type: "markdown", content: "# About" }],
        },
      },
      {
        path: "pages/ueber-uns.md",
        frontmatter: {
          name: "Über uns",
          title: "Über uns",
          permalink: "/de/ueber-uns/",
          blocks: [{ type: "markdown", content: "# Über uns" }],
        },
      },
      {
        path: "pages/untranslated.md",
        frontmatter: {
          name: "Only English",
          title: "Only English",
          permalink: "/only-english/",
          blocks: [{ type: "markdown", content: "# Only English" }],
        },
      },
    ],
  });

  test("names each page's language on the html element", async () => {
    const english = await getSite().getDoc("/about/index.html");
    const german = await getSite().getDoc("/de/ueber-uns/index.html");
    expect(english.documentElement.getAttribute("lang")).toBe("en");
    expect(german.documentElement.getAttribute("lang")).toBe("de");
  });

  test("gives both pages the same reciprocal hreflang set", async () => {
    const expected = [
      ["en-GB", `${SITE_URL}/about/`],
      ["x-default", `${SITE_URL}/about/`],
      ["de", `${SITE_URL}/de/ueber-uns/`],
    ];
    expect(alternatesOf(await getSite().getDoc("/about/index.html"))).toEqual(
      expected,
    );
    expect(
      alternatesOf(await getSite().getDoc("/de/ueber-uns/index.html")),
    ).toEqual(expected);
  });

  test("writes no hreflang for a page nobody has translated", async () => {
    expect(
      alternatesOf(await getSite().getDoc("/only-english/index.html")),
    ).toEqual([]);
  });

  test("names the locale and its alternates", async () => {
    const doc = await getSite().getDoc("/de/ueber-uns/index.html");
    const content = (property) =>
      [...doc.querySelectorAll(`meta[property="${property}"]`)].map((meta) =>
        meta.getAttribute("content"),
      );
    expect(content("og:locale")).toEqual(["de_DE"]);
    expect(content("og:locale:alternate")).toEqual(["en_GB"]);
  });

  test("links the other language from the footer", async () => {
    expect(
      languageLinksOf(await getSite().getDoc("/about/index.html")),
    ).toEqual([["de", "/de/ueber-uns/", "Deutsch"]]);
    expect(
      languageLinksOf(await getSite().getDoc("/de/ueber-uns/index.html")),
    ).toEqual([["en-GB", "/about/", "English"]]);
  });

  test("offers a language's home page where the page has no counterpart", async () => {
    expect(
      languageLinksOf(await getSite().getDoc("/only-english/index.html")),
    ).toEqual([["de", "/de/", "Deutsch"]]);
  });

  test("keeps a translated page's breadcrumbs in its own language", async () => {
    const doc = await getSite().getDoc("/de/ueber-uns/index.html");
    // The trail is a navigation landmark, and the landmark carries the name.
    const landmark = doc.querySelector("nav:has(> ol.breadcrumbs)");
    expect(landmark.getAttribute("aria-label")).toBe("Brotkrumennavigation");
    const first = landmark.querySelector("a");
    expect(first.getAttribute("href")).toBe("/de/");
    expect(first.textContent.trim()).toBe("Startseite");
  });

  test("publishes the page's own language in its schema", async () => {
    // meta.json carries one site-wide language, so without an override a German
    // page claimed English in its JSON-LD while its html element said German.
    const schema = schemaOf(await getSite().getDoc("/de/ueber-uns/index.html"));
    const languages = schema["@graph"]
      .map((item) => item.inLanguage)
      .filter(Boolean);
    expect(languages.length).toBeGreaterThan(0);
    expect([...new Set(languages)]).toEqual(["de"]);
  });

  test("says the same thing in the breadcrumb schema", async () => {
    // The visible trail and the BreadcrumbList come from one filter, so a
    // German page cannot show one trail and publish another.
    const schema = schemaOf(await getSite().getDoc("/de/ueber-uns/index.html"));
    const list = schema["@graph"].find(
      (item) => item["@type"] === "BreadcrumbList",
    );
    expect(
      list.itemListElement.map((entry) => [entry.item.name, entry.item["@id"]]),
    ).toEqual([
      ["Startseite", `${SITE_URL}/de/`],
      ["Über uns", `${SITE_URL}/de/ueber-uns/`],
    ]);
  });
});

const navPage = (path, permalink, key, extra = {}) => ({
  path,
  frontmatter: {
    name: key,
    permalink,
    eleventyNavigation: { key },
    blocks: [{ type: "markdown", content: `# ${key}` }],
    ...extra,
  },
});

const footerSnippet = (path, text) => ({
  path,
  frontmatter: { name: "Footer" },
  content: text,
});

describe("a translated site's header and footer", () => {
  const getSite = useSharedSite({
    config: {
      placeholder_images: false,
      collapse_menu: "always",
      language_switcher: "header",
    },
    dataFiles: [
      { filename: "languages.json", data: LANGUAGES },
      { filename: "translations.json", data: TRANSLATIONS },
      {
        filename: "site.json",
        data: { ...siteData, logo: "/images/party.jpg" },
      },
    ],
    images: ["party.jpg"],
    files: [
      navPage("pages/en/index.md", "/", "Home"),
      navPage("pages/en/about.md", "/about/", "About"),
      navPage("pages/de/index.md", "/de/", "Startseite"),
      navPage("pages/de/ueber-uns.md", "/de/ueber-uns/", "Über uns"),
      // A menu entry linking elsewhere has no URL or layout of its own; its
      // language comes from where the file sits
      navPage("pages/de/kontakt.md", false, "Kontakt", {
        layout: false,
        eleventyNavigation: { key: "Kontakt", url: "https://kontakt.test/" },
      }),
      footerSnippet("snippets/footer-content.md", "Shared footer"),
      footerSnippet("snippets/de/footer-content.md", "Deutsche Fußzeile"),
    ],
  });

  const doc = (path) => getSite().getDoc(path);
  const menuOf = (page) =>
    [...page.querySelectorAll(".site-menu a")].map((link) =>
      link.textContent.trim(),
    );

  test("gives each language its own menu", async () => {
    expect(menuOf(await doc("/about/index.html"))).toEqual(["About", "Home"]);
    expect(menuOf(await doc("/de/ueber-uns/index.html"))).toEqual([
      "Kontakt",
      "Startseite",
      "Über uns",
    ]);
  });

  test("marks the current page in the menu", async () => {
    const current = (await doc("/de/ueber-uns/index.html")).querySelector(
      '.site-menu [aria-current="page"]',
    );
    expect(current.getAttribute("href")).toBe("/de/ueber-uns/");
  });

  test("names the header and its menu buttons in the page's language", async () => {
    const nav = (await doc("/de/ueber-uns/index.html")).querySelector(
      "nav.site-nav",
    );
    expect(nav.getAttribute("aria-label")).toBe(DE.navigation_label);
    expect(nav.querySelector(".menu-toggle").textContent.trim()).toBe(
      DE.menu_label,
    );
    expect(nav.querySelector(".menu-close").getAttribute("aria-label")).toBe(
      DE.close_menu_label,
    );
    expect(nav.dataset.submenuLabel).toBe(DE.submenu_label);
  });

  test("names the image gallery controls in the page's language", async () => {
    const popup = (await doc("/de/ueber-uns/index.html")).querySelector(
      "#image-popup",
    );
    expect(popup.getAttribute("aria-label")).toBe(DE.gallery_label);
    expect(
      popup.querySelector("[data-popup-close]").getAttribute("aria-label"),
    ).toBe(DE.close_gallery_label);
  });

  test("puts the language switcher in the header when configured", async () => {
    const page = await doc("/about/index.html");
    const switcher = page.querySelector("nav.site-nav .language-links a");
    expect(switcher.getAttribute("href")).toBe("/de/ueber-uns/");
    expect(page.querySelector("footer .language-links")).toBeNull();
  });

  test("renders a language's own snippet, falling back to the shared one", async () => {
    const footerText = async (path) =>
      (await doc(path)).querySelector("footer").textContent;
    expect(await footerText("/de/ueber-uns/index.html")).toContain(
      "Deutsche Fußzeile",
    );
    expect(await footerText("/about/index.html")).toContain("Shared footer");
  });

  test("links the logo, as authored, to the language's home page", async () => {
    const logo = (await doc("/de/ueber-uns/index.html")).querySelector(
      "a.site-logo",
    );
    expect(logo.getAttribute("href")).toBe("/de/");
    expect(logo.querySelector("img").getAttribute("alt")).toBe(siteData.name);
    expect(logo.querySelector("img").getAttribute("loading")).toBe("eager");
    // Served as authored, not turned into raster variants
    expect(logo.querySelector("img").getAttribute("src")).toBe(
      "/images/party.jpg",
    );
    expect(logo.querySelector("picture")).toBeNull();
  });
});

describe("a site with no navigation pages", () => {
  const getSite = useSharedSite({
    files: [
      navPage("pages/index.md", "/", "Home", { eleventyNavigation: false }),
    ],
  });

  test("renders no menu or menu toggle", async () => {
    const nav = (await getSite().getDoc("/index.html")).querySelector(
      "nav.site-nav",
    );
    expect(nav.querySelector(".site-menu")).toBeNull();
    expect(nav.querySelector(".menu-toggle")).toBeNull();
  });
});
