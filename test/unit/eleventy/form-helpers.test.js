import { describe, expect, test } from "bun:test";
import { configureFormHelpers } from "#eleventy/form-helpers.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("configureFormHelpers", () => {
  test("registers the addFieldTemplates filter", () => {
    const mockConfig = createMockEleventyConfig();
    configureFormHelpers(mockConfig);
    expect(mockConfig.filters.addFieldTemplates).toBeDefined();
  });

  test("registered filter maps field types to include templates", () => {
    const mockConfig = createMockEleventyConfig();
    configureFormHelpers(mockConfig);
    const addFieldTemplates = mockConfig.filters.addFieldTemplates;

    const result = addFieldTemplates([
      { name: "name", label: "Name" },
      { name: "email", type: "email", label: "Email" },
      { name: "message", type: "textarea", label: "Message" },
      { name: "topic", type: "select", label: "Topic", options: ["a", "b"] },
      { name: "pref", type: "radio", label: "Pref", options: ["x", "y"] },
      { name: "heading", type: "heading", label: "Extras" },
    ]);

    expect(result).toEqual([
      { name: "name", label: "Name", template: "form-field-input.html" },
      {
        name: "email",
        type: "email",
        label: "Email",
        template: "form-field-input.html",
      },
      {
        name: "message",
        type: "textarea",
        label: "Message",
        template: "form-field-textarea.html",
      },
      {
        name: "topic",
        type: "select",
        label: "Topic",
        options: ["a", "b"],
        template: "form-field-select.html",
      },
      {
        name: "pref",
        type: "radio",
        label: "Pref",
        options: ["x", "y"],
        template: "form-field-radio.html",
      },
      {
        name: "heading",
        type: "heading",
        label: "Extras",
        template: "form-field-heading.html",
      },
    ]);
  });
});
