import { describe, expect, test } from "bun:test";
import contactFormFn from "#data/contact-form.js";
import eleventyComputed from "#data/eleventyComputed.js";
import quoteFieldsFn from "#data/quote-fields.js";

describe("eleventyComputed.contactForm", () => {
  test("delegates to the contact-form data module", () => {
    expect(eleventyComputed.contactForm()).toBe(contactFormFn());
  });
});

describe("eleventyComputed.quoteFields", () => {
  test("delegates to the quote-fields data module", () => {
    expect(eleventyComputed.quoteFields()).toBe(quoteFieldsFn());
  });
});
