import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

// ============================================
// Test Setup Helpers
// ============================================

/**
 * Create a happy-dom environment and load the template.js module.
 * @param {string} bodyHtml - HTML to inject into the body
 * @returns {Promise<{ window, document, getTemplate, populateItemFields, populateQuantityControls }>}
 */
const createTestEnv = async (bodyHtml = "") => {
  const window = new Window({ url: "http://localhost" });
  window.document.write(`<!DOCTYPE html><html><body>${bodyHtml}</body></html>`);

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

describe("template", () => {
  test("Returns cloned content from template element by ID", async () => {
    const env = await createTestEnv(`
        <template id="cart-item">
          <div class="item"><span>Item Content</span></div>
        </template>
      `);
    try {
      const clone = env.getTemplate("cart-item");
      expect(clone.firstElementChild.className).toBe("item");
      expect(clone.querySelector("span").textContent).toBe("Item Content");
    } finally {
      cleanup();
    }
  });

  test("Each call returns an independent clone, not the same node", async () => {
    const env = await createTestEnv(`
        <template id="reusable">
          <div class="box"></div>
        </template>
      `);
    try {
      const clone1 = env.getTemplate("reusable");
      const clone2 = env.getTemplate("reusable");
      clone1.firstElementChild.textContent = "Modified";

      expect(clone2.firstElementChild.textContent).toBe("");
    } finally {
      cleanup();
    }
  });

  test("Returns undefined when template ID does not exist", async () => {
    const env = await createTestEnv("");
    try {
      const result = env.getTemplate("nonexistent");
      expect(result).toBe(undefined);
    } finally {
      cleanup();
    }
  });

  test("Returns empty document fragment for empty template", async () => {
    const env = await createTestEnv(`<template id="empty"></template>`);
    try {
      const clone = env.getTemplate("empty");
      expect(clone.childElementCount).toBe(0);
    } finally {
      cleanup();
    }
  });

  test("Cloned content preserves deeply nested HTML structure", async () => {
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
      expect(deepest.textContent).toBe("Deep Content");
    } finally {
      cleanup();
    }
  });

  // ============================================
  // populateItemFields Tests
  // ============================================

  test("Sets data-name attribute on first element child", async () => {
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

      expect(template.firstElementChild.dataset.name).toBe("Widget");
    } finally {
      cleanup();
    }
  });

  test("Sets text content of element with data-field='name'", async () => {
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
      expect(nameField.textContent).toBe("Gadget Pro");
    } finally {
      cleanup();
    }
  });

  test("Sets text content of element with data-field='price'", async () => {
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
      expect(priceField.textContent).toBe("$99.99");
    } finally {
      cleanup();
    }
  });

  test("Handles empty string name without error", async () => {
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

      expect(template.firstElementChild.dataset.name).toBe("");
    } finally {
      cleanup();
    }
  });

  test("Handles special characters in item name", async () => {
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
      expect(nameField.textContent).toBe(specialName);
    } finally {
      cleanup();
    }
  });

  // ============================================
  // populateQuantityControls Tests
  // ============================================

  test("Sets data-name attribute on all elements with [data-name]", async () => {
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
      expect(elementsWithDataName).toHaveLength(3);
    } finally {
      cleanup();
    }
  });

  test("Sets number input value to item quantity", async () => {
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
      expect(input.value).toBe("5");
    } finally {
      cleanup();
    }
  });

  test("Sets max attribute on input when item has max_quantity", async () => {
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
      expect(input.max).toBe("10");
    } finally {
      cleanup();
    }
  });

  test("Does not set max attribute when max_quantity is undefined", async () => {
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
      expect(input.max).toBe("");
    } finally {
      cleanup();
    }
  });

  test("Handles quantity of zero correctly", async () => {
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
      expect(input.value).toBe("0");
    } finally {
      cleanup();
    }
  });

  test("Sets max to 1 when max_quantity is 1", async () => {
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
      expect(input.max).toBe("1");
    } finally {
      cleanup();
    }
  });
});
