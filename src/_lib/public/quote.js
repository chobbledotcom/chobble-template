// The visitor's quote: add-to-quote buttons, the header's count, and the
// quote-form block. Loaded by every page of a site with products.
import {
  addItem,
  forgetCart,
  getCart,
  setQuantity,
} from "#public/quote/cart.js";
import { hireDays, linePrice, quoteTotal } from "#public/quote/pricing.js";
import { onReady } from "#public/utils/on-ready.js";
import { formatPrice } from "#utils/format-price.js";

/** @typedef {import("#public/quote/cart.js").CartItem} CartItem */

/**
 * Add the chosen option of a product to the quote when its add-to-quote
 * form is sent, then reveal the link to the quote.
 * @param {HTMLFormElement} form
 * @returns {(event: SubmitEvent) => void}
 */
const addToQuote = (form) => (event) => {
  event.preventDefault();
  const product = JSON.parse(form.dataset.quoteItem);
  const select = form.querySelector("select");
  const option = product.options[select ? Number(select.value) : 0];
  addItem({
    name: option.name,
    unit_price: option.unit_price,
    hire_prices: product.hire_prices,
    ...(product.max_quantity !== undefined && {
      max_quantity: product.max_quantity,
    }),
  });
  form.querySelector(".add-to-quote-added").hidden = false;
};

/** Wire up the add-to-quote buttons, the header count, and quote forms. */
export const initQuote = () => {
  const blocks = [...document.querySelectorAll(".quote-form-block")];
  /**
   * Show the quote in a quote-form block: its rows and estimated total, and
   * the same in the form's hidden fields, priced for the dates in the form.
   * An empty quote hides the form and shows the empty message.
   * @param {HTMLElement} block
   */
  const renderQuote = (block) => {
    const items = getCart();
    const form = block.querySelector("form");
    /** @param {string} name */
    const date = (name) => form?.querySelector(`input[name="${name}"]`)?.value;
    const days = hireDays(date("start_date"), date("end_date"));
    /** @param {number | null} amount */
    const price = (amount) =>
      amount === null ? "TBC" : formatPrice(amount, block.dataset.currency);
    const linePrices = items.map((item) => price(linePrice(days)(item)));
    /**
     * A row cloned from the block's template, whose quantity box and remove
     * button change the quote.
     * @param {CartItem} item
     * @param {number} index
     */
    const row = (item, index) => {
      const li = block.querySelector("template").content.firstElementChild;
      const clone = li.cloneNode(true);
      clone.querySelector(".quote-item-name").textContent = item.name;
      clone.querySelector(".quote-item-price").textContent = linePrices[index];
      const quantity = clone.querySelector("input");
      quantity.value = String(item.quantity);
      if (item.max_quantity !== undefined) {
        quantity.max = String(item.max_quantity);
      }
      quantity.addEventListener("change", () =>
        setQuantity(item.name, Number(quantity.value)),
      );
      clone
        .querySelector("button")
        .addEventListener("click", () => setQuantity(item.name, 0));
      return clone;
    };
    block.querySelector(".quote-items").replaceChildren(...items.map(row));
    const total = price(quoteTotal(items, days));
    block.querySelector(".quote-total").textContent = total;
    block.querySelector(".quote-total-row").hidden = items.length === 0;
    block.querySelector(".quote-empty").hidden = items.length > 0;
    if (!form) return;
    form.hidden = items.length === 0;
    form.elements.namedItem("cart_items").value = items
      .map((item, i) => `${item.quantity} x ${item.name}: ${linePrices[i]}`)
      .join("\n");
    form.elements.namedItem("estimated_total").value = total;
    form.elements.namedItem("hire_days").value = days === null ? "" : `${days}`;
  };
  const render = () => {
    const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
    for (const link of document.querySelectorAll(".quote-link")) {
      link.hidden = count === 0;
      link.querySelector(".quote-count").textContent = String(count);
    }
    for (const block of blocks) renderQuote(block);
  };
  /**
   * Keep the end date from coming before the start, and both from the
   * past, and re-price the quote when either changes.
   * @param {HTMLFormElement} form
   */
  const watchDates = (form) => {
    const today = new Date().toISOString().slice(0, 10);
    const start = form.querySelector('input[name="start_date"]');
    const end = form.querySelector('input[name="end_date"]');
    for (const input of [start, end].filter(Boolean)) {
      input.min = today;
      input.addEventListener("change", render);
    }
    start?.addEventListener("change", () => {
      if (end) end.min = start.value === "" ? today : start.value;
    });
  };
  for (const form of document.querySelectorAll("form.add-to-quote")) {
    form.addEventListener("submit", addToQuote(form));
  }
  document.addEventListener("quote-cart-change", render);
  for (const form of blocks.map((block) => block.querySelector("form"))) {
    if (!form) continue;
    watchDates(form);
    form.addEventListener("submit", forgetCart);
  }
  render();
};

onReady(initQuote);
