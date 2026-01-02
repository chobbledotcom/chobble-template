import { JSDOM } from "jsdom";
import { createTestRunner, expectStrictEqual } from "#test/test-utils.js";

// ============================================
// Test Setup Helpers
// ============================================

/**
 * Create a JSDOM environment and load the template.js module.
 * @param {string} bodyHtml - HTML to inject into the body
 * @returns {Promise<{ window, document, getTemplate, populateItemFields, populateQuantityControls }>}
 */
const createTestEnv = async (bodyHtml = "") => {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>${bodyHtml}</body></html>`,
    { url: "http://localhost" },
  );
  const { window } = dom;

  // Set up global environment for the module
  globalThis.document = window.document;

  // Import actual production code
  const templateModule = await import("#assets/template.js");

  return {
    window,
    document: window.document,
    getTemplate: templateModule.getTemplate,
    populateItemFields: templateModule.populateItemFields,
    populateQuantityControls: templateModule.populateQuantityControls,
  };
};

/**
 * Clean up global document after each test.
 */
const cleanup = () => {
  delete globalThis.document;
};

// ============================================
// getTemplate Tests
// ============================================

const getTemplateTests = [
  {
    name: "getTemplate-returns-cloned-content",
    description: "Returns cloned content from template element by ID",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="cart-item">
          <div class="item"><span>Item Content</span></div>
        </template>
      `);
      try {
        const clone = env.getTemplate("cart-item");
        expectStrictEqual(
          clone.firstElementChild.className,
          "item",
          "Cloned content should have correct class",
        );
        expectStrictEqual(
          clone.querySelector("span").textContent,
          "Item Content",
          "Cloned content should preserve text",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "getTemplate-returns-independent-clone",
    description: "Each call returns an independent clone, not the same node",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="reusable">
          <div class="box"></div>
        </template>
      `);
      try {
        const clone1 = env.getTemplate("reusable");
        const clone2 = env.getTemplate("reusable");
        clone1.firstElementChild.textContent = "Modified";

        expectStrictEqual(
          clone2.firstElementChild.textContent,
          "",
          "Second clone should not be affected by changes to first",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "getTemplate-returns-undefined-for-missing-id",
    description: "Returns undefined when template ID does not exist",
    asyncTest: async () => {
      const env = await createTestEnv("");
      try {
        const result = env.getTemplate("nonexistent");
        expectStrictEqual(
          result,
          undefined,
          "Should return undefined for missing template",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "getTemplate-handles-empty-template",
    description: "Returns empty document fragment for empty template",
    asyncTest: async () => {
      const env = await createTestEnv(`<template id="empty"></template>`);
      try {
        const clone = env.getTemplate("empty");
        expectStrictEqual(
          clone.childElementCount,
          0,
          "Empty template should have no children",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "getTemplate-preserves-nested-structure",
    description: "Cloned content preserves deeply nested HTML structure",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="nested">
          <div class="outer">
            <div class="inner">
              <span class="deepest">Deep Content</span>
            </div>
          </div>
        </template>
      `);
      try {
        const clone = env.getTemplate("nested");
        const deepest = clone.querySelector(".deepest");
        expectStrictEqual(
          deepest.textContent,
          "Deep Content",
          "Nested content should be preserved",
        );
      } finally {
        cleanup();
      }
    },
  },
];

// ============================================
// populateItemFields Tests
// ============================================

const populateItemFieldsTests = [
  {
    name: "populateItemFields-sets-data-name",
    description: "Sets data-name attribute on first element child",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="item">
          <div class="cart-item">
            <span data-field="name"></span>
            <span data-field="price"></span>
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("item");
        env.populateItemFields(template, "Widget", "$10.00");

        expectStrictEqual(
          template.firstElementChild.dataset.name,
          "Widget",
          "data-name should be set to item name",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateItemFields-sets-name-field",
    description: "Sets text content of element with data-field='name'",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="item">
          <div class="cart-item">
            <span data-field="name"></span>
            <span data-field="price"></span>
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("item");
        env.populateItemFields(template, "Gadget Pro", "$25.99");

        const nameField = template.querySelector('[data-field="name"]');
        expectStrictEqual(
          nameField.textContent,
          "Gadget Pro",
          "Name field should display item name",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateItemFields-sets-price-field",
    description: "Sets text content of element with data-field='price'",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="item">
          <div class="cart-item">
            <span data-field="name"></span>
            <span data-field="price"></span>
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("item");
        env.populateItemFields(template, "Test Item", "$99.99");

        const priceField = template.querySelector('[data-field="price"]');
        expectStrictEqual(
          priceField.textContent,
          "$99.99",
          "Price field should display formatted price",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateItemFields-handles-empty-name",
    description: "Handles empty string name without error",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="item">
          <div class="cart-item">
            <span data-field="name"></span>
            <span data-field="price"></span>
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("item");
        env.populateItemFields(template, "", "$0.00");

        expectStrictEqual(
          template.firstElementChild.dataset.name,
          "",
          "Should handle empty name",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateItemFields-handles-special-characters-in-name",
    description: "Handles special characters in item name",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="item">
          <div class="cart-item">
            <span data-field="name"></span>
            <span data-field="price"></span>
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("item");
        const specialName = "Widget <script> & 'Quote'";
        env.populateItemFields(template, specialName, "$10.00");

        const nameField = template.querySelector('[data-field="name"]');
        expectStrictEqual(
          nameField.textContent,
          specialName,
          "Should preserve special characters in name",
        );
      } finally {
        cleanup();
      }
    },
  },
];

// ============================================
// populateQuantityControls Tests
// ============================================

const populateQuantityControlsTests = [
  {
    name: "populateQuantityControls-sets-data-name-on-all-elements",
    description: "Sets data-name attribute on all elements with [data-name]",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="quantity">
          <div class="controls">
            <button data-name="" data-action="decrease">-</button>
            <input type="number" data-name="" value="1" />
            <button data-name="" data-action="increase">+</button>
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("quantity");
        const item = { item_name: "ProductA", quantity: 3 };
        env.populateQuantityControls(template, item);

        const elementsWithDataName = template.querySelectorAll(
          "[data-name='ProductA']",
        );
        expectStrictEqual(
          elementsWithDataName.length,
          3,
          "All three elements should have data-name set",
        );
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateQuantityControls-sets-input-value",
    description: "Sets number input value to item quantity",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="quantity">
          <div class="controls">
            <input type="number" value="1" />
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("quantity");
        const item = { item_name: "TestItem", quantity: 5 };
        env.populateQuantityControls(template, item);

        const input = template.querySelector("input[type='number']");
        expectStrictEqual(input.value, "5", "Input value should be 5");
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateQuantityControls-sets-max-quantity-when-provided",
    description: "Sets max attribute on input when item has max_quantity",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="quantity">
          <div class="controls">
            <input type="number" value="1" />
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("quantity");
        const item = {
          item_name: "LimitedItem",
          quantity: 2,
          max_quantity: 10,
        };
        env.populateQuantityControls(template, item);

        const input = template.querySelector("input[type='number']");
        expectStrictEqual(input.max, "10", "Max attribute should be set to 10");
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateQuantityControls-does-not-set-max-when-not-provided",
    description: "Does not set max attribute when max_quantity is undefined",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="quantity">
          <div class="controls">
            <input type="number" value="1" />
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("quantity");
        const item = { item_name: "UnlimitedItem", quantity: 1 };
        env.populateQuantityControls(template, item);

        const input = template.querySelector("input[type='number']");
        expectStrictEqual(input.max, "", "Max attribute should not be set");
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateQuantityControls-handles-zero-quantity",
    description: "Handles quantity of zero correctly",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="quantity">
          <div class="controls">
            <input type="number" value="1" />
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("quantity");
        const item = { item_name: "ZeroItem", quantity: 0 };
        env.populateQuantityControls(template, item);

        const input = template.querySelector("input[type='number']");
        expectStrictEqual(input.value, "0", "Input value should be 0");
      } finally {
        cleanup();
      }
    },
  },
  {
    name: "populateQuantityControls-handles-max-quantity-of-one",
    description: "Sets max to 1 when max_quantity is 1",
    asyncTest: async () => {
      const env = await createTestEnv(`
        <template id="quantity">
          <div class="controls">
            <input type="number" value="1" />
          </div>
        </template>
      `);
      try {
        const template = env.getTemplate("quantity");
        const item = { item_name: "UniqueItem", quantity: 1, max_quantity: 1 };
        env.populateQuantityControls(template, item);

        const input = template.querySelector("input[type='number']");
        expectStrictEqual(
          input.max,
          "1",
          "Max should be set to 1 for unique items",
        );
      } finally {
        cleanup();
      }
    },
  },
];

// ============================================
// Combine and run all tests
// ============================================

const allTestCases = [
  ...getTemplateTests,
  ...populateItemFieldsTests,
  ...populateQuantityControlsTests,
];

createTestRunner("template", allTestCases);
