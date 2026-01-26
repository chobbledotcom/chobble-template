import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
  getTemplate,
  populateItemFields,
  populateQuantityControls,
} from "#public/utils/template.js";
import { bracket } from "#toolkit/test-utils/resource.js";

// ============================================
// Test Setup
// ============================================

/** Shared template HTML for item field tests */
const ITEM_TEMPLATE_HTML = `
  <template id="item">
    <div class="cart-item">
      <span data-field="name"></span>
      <span data-field="price"></span>
    </div>
  </template>
`;

/** Shared template HTML for quantity control tests */
const QUANTITY_TEMPLATE_HTML = `
  <template id="quantity">
    <div class="controls">
      <button class="quantity-decrease" data-name="">-</button>
      <input type="number" class="quantity-input" data-name="" value="1" />
      <button class="quantity-increase" data-name="">+</button>
    </div>
  </template>
`;

/** Simple quantity template for tests that only need input */
const SIMPLE_QUANTITY_TEMPLATE_HTML = `
  <template id="quantity">
    <div class="controls">
      <input type="number" value="1" />
    </div>
  </template>
`;

/**
 * Create an isolated test environment with automatic cleanup.
 * Uses the bracket pattern to ensure window.close() is always called.
 */
const withTemplateEnv = bracket(
  (bodyHtml) => {
    const window = new Window();
    const doc = window.document;
    doc.body.innerHTML = bodyHtml;
    return {
      window,
      document: doc,
      getTemplate: (id) => getTemplate(id, doc),
      populateItemFields,
      populateQuantityControls,
    };
  },
  (env) => env.window.close(),
);

// ============================================
// getTemplate Tests
// ============================================

describe("template", () => {
  test("Returns cloned content from template element by ID", () =>
    withTemplateEnv(
      `<template id="cart-item">
        <div class="item"><span>Item Content</span></div>
      </template>`,
      (env) => {
        const clone = env.getTemplate("cart-item");
        expect(clone.firstElementChild.className).toBe("item");
        expect(clone.querySelector("span").textContent).toBe("Item Content");
      },
    ));

  test("Each call returns an independent clone, not the same node", () =>
    withTemplateEnv(
      `<template id="reusable"><div class="box"></div></template>`,
      (env) => {
        const clone1 = env.getTemplate("reusable");
        const clone2 = env.getTemplate("reusable");
        clone1.firstElementChild.textContent = "Modified";
        expect(clone2.firstElementChild.textContent).toBe("");
      },
    ));

  test("Returns empty document fragment for empty template", () =>
    withTemplateEnv(`<template id="empty"></template>`, (env) => {
      const clone = env.getTemplate("empty");
      expect(clone.childElementCount).toBe(0);
    }));

  test("Cloned content preserves deeply nested HTML structure", () =>
    withTemplateEnv(
      `<template id="nested">
        <div class="outer">
          <div class="inner">
            <span class="deepest">Deep Content</span>
          </div>
        </div>
      </template>`,
      (env) => {
        const clone = env.getTemplate("nested");
        const deepest = clone.querySelector(".deepest");
        expect(deepest.textContent).toBe("Deep Content");
      },
    ));

  // ============================================
  // populateItemFields Tests
  // ============================================

  describe("populateItemFields", () => {
    const testWithItemTemplate = (callback) =>
      withTemplateEnv(ITEM_TEMPLATE_HTML, callback);

    test("Sets data-name attribute on first element child", () =>
      testWithItemTemplate((env) => {
        const template = env.getTemplate("item");
        env.populateItemFields(template, "Widget", "$10.00");
        expect(template.firstElementChild.dataset.name).toBe("Widget");
      }));

    test("Sets text content of element with data-field='name'", () =>
      testWithItemTemplate((env) => {
        const template = env.getTemplate("item");
        env.populateItemFields(template, "Gadget Pro", "$25.99");
        const nameField = template.querySelector('[data-field="name"]');
        expect(nameField.textContent).toBe("Gadget Pro");
      }));

    test("Sets text content of element with data-field='price'", () =>
      testWithItemTemplate((env) => {
        const template = env.getTemplate("item");
        env.populateItemFields(template, "Test Item", "$99.99");
        const priceField = template.querySelector('[data-field="price"]');
        expect(priceField.textContent).toBe("$99.99");
      }));

    test("Handles empty string name without error", () =>
      testWithItemTemplate((env) => {
        const template = env.getTemplate("item");
        env.populateItemFields(template, "", "$0.00");
        expect(template.firstElementChild.dataset.name).toBe("");
      }));

    test("Handles special characters in item name", () =>
      testWithItemTemplate((env) => {
        const template = env.getTemplate("item");
        const specialName = "Widget <script> & 'Quote'";
        env.populateItemFields(template, specialName, "$10.00");
        const nameField = template.querySelector('[data-field="name"]');
        expect(nameField.textContent).toBe(specialName);
      }));
  });

  // ============================================
  // populateQuantityControls Tests
  // ============================================

  describe("populateQuantityControls", () => {
    test("Sets data-name attribute on all elements with [data-name]", () =>
      withTemplateEnv(QUANTITY_TEMPLATE_HTML, (env) => {
        const template = env.getTemplate("quantity");
        const item = { item_name: "ProductA", quantity: 3 };
        env.populateQuantityControls(template, item);

        const elementsWithDataName = template.querySelectorAll(
          "[data-name='ProductA']",
        );
        expect(elementsWithDataName).toHaveLength(3);
      }));

    /** Helper for tests that only need the simple input template */
    const testWithSimpleQuantity = (callback) =>
      withTemplateEnv(SIMPLE_QUANTITY_TEMPLATE_HTML, callback);

    /** Get the input element from a quantity template */
    const getQuantityInput = (template) =>
      template.querySelector("input[type='number']");

    const quantityTestCases = [
      {
        name: "Sets number input value to item quantity",
        item: { item_name: "TestItem", quantity: 5 },
        check: (input) => expect(input.value).toBe("5"),
      },
      {
        name: "Sets max attribute on input when item has max_quantity",
        item: { item_name: "LimitedItem", quantity: 2, max_quantity: 10 },
        check: (input) => expect(input.max).toBe("10"),
      },
      {
        name: "Does not set max attribute when max_quantity is undefined",
        item: { item_name: "UnlimitedItem", quantity: 1 },
        check: (input) => expect(input.max).toBe(""),
      },
      {
        name: "Handles quantity of zero correctly",
        item: { item_name: "ZeroItem", quantity: 0 },
        check: (input) => expect(input.value).toBe("0"),
      },
      {
        name: "Sets max to 1 when max_quantity is 1",
        item: { item_name: "UniqueItem", quantity: 1, max_quantity: 1 },
        check: (input) => expect(input.max).toBe("1"),
      },
    ];

    for (const { name, item, check } of quantityTestCases) {
      test(name, () =>
        testWithSimpleQuantity((env) => {
          const template = env.getTemplate("quantity");
          env.populateQuantityControls(template, item);
          check(getQuantityInput(template));
        }),
      );
    }
  });
});
