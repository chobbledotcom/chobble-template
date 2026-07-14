import { describe, expect, test } from "bun:test";
import { Liquid } from "liquidjs";
import { resolveFormFields } from "#config/form-helpers.js";
import getContactForm from "#data/contact-form.js";
import siteData from "#data/site.json" with { type: "json" };
import { path, rootDir } from "#test/test-utils.js";
import { canonicalUrl } from "#utils/canonical-url.js";

const liquid = new Liquid({
  root: [path.join(rootDir, "src/_includes")],
  extname: ".html",
});

liquid.registerFilter("canonicalUrl", canonicalUrl);
liquid.registerFilter("contactFormFieldsForPage", resolveFormFields);

const SITE_URL = siteData.url;
const PAGE_NAME = 'Oak & "Leather" Chair';

const formData = (overrides = {}) => ({
  config: { form_target: "https://submit.example/form" },
  contactForm: getContactForm(),
  name: PAGE_NAME,
  page: { url: "/products/oak-chair/" },
  site: { name: "Example Shop" },
  tags: ["products"],
  ...overrides,
});

const renderFormTemplate = async (template, data) => {
  const html = await liquid.renderFile(template, data);
  const root = document.createElement("div");
  root.innerHTML = html;
  return { html, root };
};

const renderContactForm = (overrides) =>
  renderFormTemplate("contact-form.html", formData(overrides));

describe("form context templates", () => {
  test("submits the canonical current page URL as the source page", async () => {
    const pageUrl = "/products/oak-chair/?finish=oil&size=large";
    const { html, root } = await renderContactForm({ page: { url: pageUrl } });

    const sourcePage = root.querySelector('input[name="source_page"]');
    expect(sourcePage.value).toBe(canonicalUrl(pageUrl));
    expect(html).toContain(
      `value="${SITE_URL}/products/oak-chair/?finish=oil&amp;size=large"`,
    );
  });

  test("prefills the tag-specific field from the page name", async () => {
    const { html, root } = await renderContactForm({ title: "Legacy title" });

    const item = root.querySelector('input[name="item"]');
    expect(item.value).toBe(PAGE_NAME);
    expect(item.placeholder).toBe(PAGE_NAME);
    expect(html).toContain('value="Oak &amp; &#34;Leather&#34; Chair"');
  });

  test("falls back to the legacy title when a page has no name", async () => {
    const { root } = await renderContactForm({
      name: undefined,
      title: "Legacy product title",
    });

    expect(root.querySelector('input[name="item"]').value).toBe(
      "Legacy product title",
    );
  });

  test("passes explicit context safely to custom textarea fields", async () => {
    const context = 'Setup & "Training"';
    const { html, root } = await renderContactForm({
      fields_override: [
        {
          defaultFromPageTitle: true,
          label: "Context",
          name: "context",
          template: "form-field-textarea.html",
        },
      ],
      pageTitle: context,
    });

    const field = root.querySelector('textarea[name="context"]');
    expect(field.value).toBe(context);
    expect(field.placeholder).toBe(context);
    expect(html).toContain(">Setup &amp; &#34;Training&#34;</textarea>");
  });

  test("uses the paginated property as property contact context", async () => {
    const propertyName = 'Harbour & "Hill" Cottage';
    const { root } = await renderFormTemplate(
      "design-system/blocks/property-contact.html",
      formData({
        item: {
          data: {
            formspark_id: "property-form",
            name: propertyName,
            tags: ["properties"],
          },
          fileSlug: "harbour-hill-cottage",
        },
        name: undefined,
        tags: ["pages"],
      }),
    );

    expect(root.querySelector('input[name="property"]').value).toBe(
      propertyName,
    );
    expect(root.querySelector("form").action).toBe(
      "https://submit-form.com/property-form",
    );
  });
});
