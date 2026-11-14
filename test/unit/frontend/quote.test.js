import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PLATTER, TENT } from "#test/fixtures/products.js";
import { quoteItem } from "#utils/quote-item.js";

const { initQuote } = await import("#public/quote.js");

/** An add-to-quote form, as add-to-quote-button.html renders it. */
const addButton = (product) => {
  const item = quoteItem(product);
  const options = item.options.map(
    (_, i) => `<option value="${i}">${i}</option>`,
  );
  return `
    <form class="add-to-quote" data-quote-item='${JSON.stringify(item)}'>
      ${options.length > 1 ? `<select name="option">${options.join("")}</select>` : ""}
      <button type="submit">Add to quote</button>
      <a class="add-to-quote-added" href="/quote/" hidden>Added</a>
    </form>`;
};

const QUOTE_FORM = `
  <form class="contact-form">
    <input type="hidden" name="cart_items" value="">
    <input type="hidden" name="estimated_total" value="">
    <input type="hidden" name="hire_days" value="">
    <label>Start <input type="date" name="start_date"></label>
    <label>End <input type="date" name="end_date"></label>
    <button type="submit">Request a Quote</button>
  </form>`;

/** The quote-form block's markup, with or without its form. */
const quoteBlock = (form = QUOTE_FORM) => `
  <div class="contact-form-block quote-form-block" data-currency="GBP">
    <div class="quote-summary">
      <p class="quote-empty">Empty</p>
      <ul class="quote-items"></ul>
      <p class="quote-total-row" hidden><strong class="quote-total"></strong></p>
      <template>
        <li>
          <span class="quote-item-name"></span>
          <label>Quantity <input type="number" min="0"></label>
          <span class="quote-item-price"></span>
          <button type="button">Remove</button>
        </li>
      </template>
    </div>
    ${form}
  </div>`;

const QUOTE_LINK =
  '<a class="quote-link" href="/quote/" hidden><span class="quote-count">0</span></a>';

/** Put a page together and wire it up. */
const setupPage = (...parts) => {
  document.body.innerHTML = [QUOTE_LINK, ...parts].join("");
  initQuote();
};

/**
 * Send a product's add-to-quote form: "tent" for the tent, or the index of
 * the platter option to choose.
 */
const add = (product) => {
  const [tent, platter] = document.querySelectorAll("form.add-to-quote");
  if (product !== "tent") platter.querySelector("select").value = `${product}`;
  const form = product === "tent" ? tent : platter;
  form.dispatchEvent(new Event("submit", { cancelable: true }));
};

/** A page with both products and a quote block, after adding products. */
const quoteOf = (...products) => {
  setupPage(addButton(TENT), addButton(PLATTER), quoteBlock());
  for (const product of products) add(product);
};

const quoteLink = () => document.querySelector(".quote-link");

const shown = (selector) => !document.querySelector(selector).hidden;

const rows = () =>
  [...document.querySelectorAll(".quote-items li")].map((li) => [
    li.querySelector(".quote-item-name").textContent,
    li.querySelector("input").value,
    li.querySelector(".quote-item-price").textContent,
  ]);

const prices = () => rows().map((row) => row[2]);

const total = () => document.querySelector(".quote-total").textContent;

const field = (name) =>
  document.querySelector(`.contact-form [name="${name}"]`);

/** Set a date field the way a visitor does: a value, then a change event. */
const pickDate = (name, value) => {
  const input = field(name);
  input.value = value;
  input.dispatchEvent(new Event("change"));
};

/** Ask for a hire from one date to another. */
const hire = (start, end) => {
  pickDate("start_date", start);
  pickDate("end_date", end);
};

/** Type a quantity into the first line's quantity box. */
const setFirstQuantity = (value) => {
  const quantity = document.querySelector(".quote-items input");
  quantity.value = value;
  quantity.dispatchEvent(new Event("change"));
};

describe("quote", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  describe("adding products", () => {
    test("keeps the header's quote link hidden while the quote is empty", () => {
      setupPage(addButton(TENT));
      expect(quoteLink().hidden).toBe(true);
    });

    test("shows the header's quote link with the number of items added", () => {
      quoteOf("tent", 0);
      expect(quoteLink().hidden).toBe(false);
      expect(quoteLink().textContent).toBe("2");
    });

    test("reveals the link to the quote once a product is added", () => {
      quoteOf("tent");
      expect(shown(".add-to-quote-added")).toBe(true);
    });

    test("adds the option chosen from a product's options", () => {
      quoteOf(1);
      expect(rows()).toEqual([["Platter - Large", "1", "£99.50"]]);
    });

    test("counts a product added twice as two of one line", () => {
      quoteOf(0, 0);
      expect(rows()).toEqual([["Platter - Small", "2", "£90"]]);
    });

    test("adds no more of a product than its max_quantity", () => {
      quoteOf("tent", "tent", "tent");
      expect(rows()[0][1]).toBe("2");
    });
  });

  describe("the quote-form block", () => {
    test("shows the empty message and no form while the quote is empty", () => {
      quoteOf();
      expect(shown(".quote-empty")).toBe(true);
      expect(shown(".contact-form")).toBe(false);
      expect(shown(".quote-total-row")).toBe(false);
    });

    test("shows the form and total once the quote holds something", () => {
      quoteOf(0);
      expect(shown(".quote-empty")).toBe(false);
      expect(shown(".contact-form")).toBe(true);
      expect(total()).toBe("£45");
    });

    test("prices a hired product TBC until both dates are given", () => {
      quoteOf("tent");
      pickDate("start_date", "2026-06-05");
      expect([...prices(), total()]).toEqual(["TBC", "TBC"]);
    });

    test("prices a hired product by the days between its dates, counting both", () => {
      quoteOf("tent");
      hire("2026-06-05", "2026-06-07");
      expect(prices()).toEqual(["£180"]);
    });

    test("prices a length of hire without an option of its own TBC", () => {
      quoteOf("tent");
      hire("2026-06-05", "2026-06-06");
      expect(prices()).toEqual(["TBC"]);
    });

    test("prices dates that end before they start TBC", () => {
      quoteOf("tent");
      hire("2026-06-05", "2026-06-04");
      expect(field("hire_days").value).toBe("");
      expect(prices()).toEqual(["TBC"]);
    });

    test("totals every line of the quote", () => {
      quoteOf("tent", 1);
      hire("2026-06-05", "2026-06-05");
      expect(total()).toBe("£179.50");
    });

    test("sends the quote's lines, total and days of hire with the form", () => {
      quoteOf("tent", 0, 0);
      hire("2026-06-05", "2026-06-07");
      expect(field("cart_items").value).toBe(
        "1 x Tent: £180\n2 x Platter - Small: £90",
      );
      expect(field("estimated_total").value).toBe("£270");
      expect(field("hire_days").value).toBe("3");
    });

    test("changes a line's quantity from its quantity box", () => {
      quoteOf(0);
      setFirstQuantity("3");
      expect(rows()).toEqual([["Platter - Small", "3", "£135"]]);
    });

    test("removes a line whose quantity is set to none", () => {
      quoteOf(0);
      setFirstQuantity("0");
      expect(rows()).toEqual([]);
    });

    test("removes a line with its remove button", () => {
      quoteOf(0, 1);
      document.querySelector(".quote-items button").click();
      expect(rows().map(([name]) => name)).toEqual(["Platter - Large"]);
    });

    test("limits a line's quantity box to its max_quantity", () => {
      quoteOf("tent");
      expect(document.querySelector(".quote-items input").max).toBe("2");
    });

    test("keeps both dates from the past", () => {
      quoteOf();
      expect(field("start_date").min).toBe("2026-06-01");
      expect(field("end_date").min).toBe("2026-06-01");
    });

    test("keeps the end date from coming before the start date", () => {
      quoteOf();
      pickDate("start_date", "2026-06-10");
      expect(field("end_date").min).toBe("2026-06-10");
      pickDate("start_date", "");
      expect(field("end_date").min).toBe("2026-06-01");
    });

    test("forgets the quote once it is sent, keeping the lines being sent", () => {
      quoteOf(0);
      const form = document.querySelector(".contact-form");
      form.addEventListener("submit", (event) => event.preventDefault());
      form.dispatchEvent(new Event("submit", { cancelable: true }));
      expect(field("cart_items").value).toBe("1 x Platter - Small: £45");
      quoteOf();
      expect(rows()).toEqual([]);
    });

    test("shows the quote beside a block whose form is not configured", () => {
      setupPage(addButton(TENT), addButton(PLATTER), quoteBlock(""));
      add(0);
      expect(rows()).toEqual([["Platter - Small", "1", "£45"]]);
    });
  });

  describe("the stored quote", () => {
    test.each([
      { stored: '{"name":"Tent"}', kind: "a value that is not a list" },
      {
        stored:
          '[{"name":"Tent","unit_price":80,"quantity":0,"hire_prices":{}}]',
        kind: "a line with no quantity",
      },
      {
        stored: '[{"name":"Tent","quantity":1}]',
        kind: "a line without prices",
      },
    ])("reads $kind as an empty quote", ({ stored }) => {
      localStorage.setItem("quote_cart", stored);
      quoteOf();
      expect(rows()).toEqual([]);
      expect(quoteLink().hidden).toBe(true);
    });
  });
});
