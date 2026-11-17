import { describe, expect, test } from "vitest";
import siteData from "#data/site.json" with { type: "json" };
import { pageWithBlocks, useSharedSite } from "#test/test-site-factory.js";

const CUSTOM_FIELDS = [
  { label: "Your details", type: "heading", note: "So we can reply." },
  { label: "Full name", required: true, placeholder: "Ada Lovelace" },
  { label: "Email", name: "email", type: "email", note: "Never shared." },
  { label: "Service", type: "select", options: ["Design", "Hosting"] },
  {
    label: "Contact me by",
    name: "method",
    type: "radio",
    required: true,
    options: ["Email", "Phone"],
    note: "Pick one.",
  },
  { label: "Message", type: "textarea", rows: 3, placeholder: "Hello" },
  { label: "Call me back", name: "callback", type: "checkbox" },
];

const pages = [
  pageWithBlocks("default-form", [{ type: "contact-form" }]),
  pageWithBlocks("custom-form", [
    {
      type: "contact-form",
      content: "## Talk to us",
      fields: CUSTOM_FIELDS,
      submit_text: "Send",
      redirect: "/sent/",
    },
  ]),
];

const getFormsparkSite = useSharedSite({
  files: pages,
  config: { formspark_id: "abc123", botpoison_public_key: "pk_test" },
});

const getTargetSite = useSharedSite({
  files: pages,
  config: {
    contact_form_target: "https://forms.example.org/send",
    formspark_id: "abc123",
  },
});

const getUnconfiguredSite = useSharedSite({ files: pages });

/** Each named control of a form as [name, tag, type, required]. */
const controlsOf = (form) =>
  [...form.querySelectorAll("label > input, textarea, select")].map((el) => [
    el.getAttribute("name"),
    el.tagName.toLowerCase(),
    el.getAttribute("type"),
    el.hasAttribute("required"),
  ]);

const hiddenValue = (form, name) =>
  form.querySelector(`input[type="hidden"][name="${name}"]`).value;

describe("contact-form block", () => {
  test("posts to Formspark when only formspark_id is set", async () => {
    const doc = await getFormsparkSite().getDoc("default-form/index.html");
    const form = doc.querySelector("form.contact-form");
    expect(form.getAttribute("action")).toBe("https://submit-form.com/abc123");
    expect(form.getAttribute("method")).toBe("POST");
  });

  test("prefers contact_form_target over formspark_id", async () => {
    const doc = await getTargetSite().getDoc("default-form/index.html");
    expect(doc.querySelector("form.contact-form").getAttribute("action")).toBe(
      "https://forms.example.org/send",
    );
  });

  test("asks for name, email, phone and message by default", async () => {
    const doc = await getFormsparkSite().getDoc("default-form/index.html");
    const form = doc.querySelector("form.contact-form");
    expect(controlsOf(form)).toEqual([
      ["name", "input", "text", true],
      ["email", "input", "email", true],
      ["phone", "input", "tel", false],
      ["message", "textarea", null, true],
    ]);
    expect(form.querySelector("textarea").getAttribute("rows")).toBe("6");
    expect(form.querySelector("button[type=submit]").textContent).toBe(
      "Send Enquiry",
    );
  });

  test("names the site in the email settings and redirects to the thank-you page", async () => {
    const doc = await getFormsparkSite().getDoc("default-form/index.html");
    const form = doc.querySelector("form.contact-form");
    expect(hiddenValue(form, "_redirect")).toBe(`${siteData.url}/thank-you/`);
    expect(hiddenValue(form, "_email.from")).toBe(
      `${siteData.name} contact form`,
    );
    expect(hiddenValue(form, "_email.subject")).toBe(
      `New message from the ${siteData.name} website`,
    );
  });

  test("renders a block's own fields in order, named after their labels unless named", async () => {
    const doc = await getFormsparkSite().getDoc("custom-form/index.html");
    const form = doc.querySelector("form.contact-form");
    expect(controlsOf(form)).toEqual([
      ["Full name", "input", "text", true],
      ["email", "input", "email", false],
      ["Service", "select", null, false],
      ["method", "input", "radio", true],
      ["method", "input", "radio", true],
      ["Message", "textarea", null, false],
      ["callback", "input", "checkbox", false],
    ]);
    expect(form.querySelector("h3").textContent).toBe("Your details");
    expect(form.querySelector("h3 + p").textContent).toBe("So we can reply.");
    expect(form.querySelector("button[type=submit]").textContent).toBe("Send");
    expect(hiddenValue(form, "_redirect")).toBe(`${siteData.url}/sent/`);
  });

  test("renders placeholders, notes, rows and options as authored", async () => {
    const doc = await getFormsparkSite().getDoc("custom-form/index.html");
    const form = doc.querySelector("form.contact-form");
    expect(
      form.querySelector('input[name="Full name"]').getAttribute("placeholder"),
    ).toBe("Ada Lovelace");
    const message = form.querySelector("textarea");
    expect(message.getAttribute("rows")).toBe("3");
    expect(message.getAttribute("placeholder")).toBe("Hello");
    expect(
      [...form.querySelectorAll("small")].map((note) => note.textContent),
    ).toEqual(["Never shared.", "Pick one."]);
    expect(
      [...form.querySelectorAll("select option")].map((option) => option.value),
    ).toEqual(["", "Design", "Hosting"]);
    expect(form.querySelector("fieldset legend").textContent).toBe(
      "Contact me by",
    );
    expect(
      [...form.querySelectorAll('input[type="radio"]')].map((el) => el.value),
    ).toEqual(["Email", "Phone"]);
  });

  test("puts a checkbox before its label text", async () => {
    const doc = await getFormsparkSite().getDoc("custom-form/index.html");
    const label = doc.querySelector('input[name="callback"]').parentElement;
    expect(label.tagName).toBe("LABEL");
    const parts = [...label.childNodes]
      .filter((node) => node.nodeType === 1 || node.textContent.trim())
      .map((node) => node.nodeName);
    expect(parts).toEqual(["INPUT", "#text"]);
    expect(label.textContent.trim()).toBe("Call me back");
  });

  test("puts a block's content beside the form", async () => {
    const doc = await getFormsparkSite().getDoc("custom-form/index.html");
    const block = doc.querySelector(".contact-form-block");
    expect(block.querySelector(".prose h2").textContent).toBe("Talk to us");
    expect(block.querySelector(".prose + form.contact-form")).not.toBeNull();
  });

  test("protects the form with Botpoison only when a public key is set", async () => {
    const protectedDoc = await getFormsparkSite().getDoc(
      "default-form/index.html",
    );
    const protectedForm = protectedDoc.querySelector("form.contact-form");
    expect(protectedForm.dataset.botpoisonPublicKey).toBe("pk_test");
    expect(protectedForm.querySelector("noscript")).not.toBeNull();

    const plainDoc = await getTargetSite().getDoc("default-form/index.html");
    const plainForm = plainDoc.querySelector("form.contact-form");
    expect(plainForm.hasAttribute("data-botpoison-public-key")).toBe(false);
    expect(plainForm.querySelector("noscript")).toBeNull();
  });

  test("loads the contact form script on a page with a form", async () => {
    const doc = await getFormsparkSite().getDoc("default-form/index.html");
    expect(
      doc
        .querySelector('script[src*="/assets/js/contact-form.js"]')
        .getAttribute("type"),
    ).toBe("module");
  });

  test("says the form is not configured when the site has nowhere to post it", async () => {
    const doc = await getUnconfiguredSite().getDoc("custom-form/index.html");
    const block = doc.querySelector(".contact-form-block");
    expect(block.querySelector("form")).toBeNull();
    expect(block.querySelector("h3").textContent).toBe(
      "Contact form not configured",
    );
    expect(doc.querySelector('script[src*="contact-form.js"]')).toBeNull();
  });
});
