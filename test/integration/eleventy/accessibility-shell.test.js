/**
 * The parts of a page every site built from this template gets for free: the
 * skip link, the anchor it lands on, the named breadcrumb landmark, and the
 * in-page contents built from the page's own headings.
 *
 * These are checked against a real build rather than a rendered fragment,
 * because each one depends on the finished page: the contents is filled in
 * after every block has rendered, and the skip link only works if the anchor
 * it names is the one `<main>` actually carries.
 */
import { describe, expect, test } from "vitest";
import { useSharedSite } from "#test/test-site-factory.js";

describe("the accessibility shell of a built page", () => {
  const getSite = useSharedSite({
    config: { placeholder_images: false, show_breadcrumbs: true },
    files: [
      {
        path: "pages/privacy.md",
        frontmatter: {
          name: "Privacy",
          permalink: "/privacy/",
          eleventyNavigation: { key: "Privacy" },
          blocks: [
            { type: "table-of-contents", title: "On this page" },
            {
              type: "markdown",
              content: [
                "## What we collect",
                "",
                "Nothing at all.",
                "",
                "### Cookies",
                "",
                "None of those either.",
                "",
                "## How to contact us",
                "",
                "By post.",
              ].join("\n"),
            },
          ],
        },
      },
      {
        path: "pages/terms.md",
        frontmatter: {
          name: "Terms",
          permalink: "/terms/",
          no_breadcrumbs: true,
          blocks: [{ type: "markdown", content: "# Terms" }],
        },
      },
    ],
  });

  const privacy = () => getSite().getDoc("privacy/index.html");

  test("opens the body with a skip link", async () => {
    const doc = await privacy();
    const [firstLink] = doc.querySelectorAll("body a");
    expect(firstLink.className).toBe("skip-link");
    expect(firstLink.textContent).toBe("Skip to main content");
  });

  test("points the skip link at the main content it names", async () => {
    const doc = await privacy();
    const target = doc.querySelector("a.skip-link").getAttribute("href");
    expect(doc.querySelector(target).tagName).toBe("MAIN");
  });

  test("names the breadcrumb landmark", async () => {
    const doc = await privacy();
    const nav = doc.querySelector("nav[aria-label='Breadcrumb']");
    expect(nav.querySelector("ol.breadcrumbs")).not.toBeNull();
  });

  test("leaves the breadcrumbs off a page that opts out", async () => {
    const doc = await getSite().getDoc("terms/index.html");
    expect(doc.querySelector("ol.breadcrumbs")).toBeNull();
  });

  test("lists the page's own headings in its contents", async () => {
    const doc = await privacy();
    const links = doc.querySelectorAll("nav.table-of-contents a");
    expect([...links].map((link) => link.textContent)).toEqual([
      "What we collect",
      "Cookies",
      "How to contact us",
    ]);
  });

  test("nests a subheading under the heading it sits below", async () => {
    const doc = await privacy();
    const nested = doc.querySelectorAll("nav.table-of-contents li ol a");
    expect([...nested].map((link) => link.textContent)).toEqual(["Cookies"]);
  });

  test("gives every contents link a heading on the page to land on", async () => {
    const doc = await privacy();
    const links = [...doc.querySelectorAll("nav.table-of-contents a")];
    const landings = links.map((link) =>
      doc.querySelector(link.getAttribute("href")),
    );
    expect(landings.map((heading) => heading?.tagName)).toEqual([
      "H2",
      "H3",
      "H2",
    ]);
  });

  test("names the contents landmark after its own title", async () => {
    const doc = await privacy();
    const nav = doc.querySelector("nav.table-of-contents");
    const title = doc.getElementById(nav.getAttribute("aria-labelledby"));
    expect(title.textContent).toBe("On this page");
  });
});
