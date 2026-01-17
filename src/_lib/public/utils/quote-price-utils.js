// Quote price display utilities
// Renders a price summary for cart items with hire pricing

import { isHireItem } from "#public/cart/hire-calculator.js";
import { getRadioValue } from "#public/cart/quote-steps.js";
import { formatPrice, getCart } from "#public/utils/cart-utils.js";
import { IDS } from "#public/utils/selectors.js";
import { getTemplate } from "#public/utils/template.js";
import {
  filter,
  map,
  pipe,
  pluralize,
  reduce,
  uniqueBy,
} from "#utils/array-utils.js";

const parsePrice = (priceStr) => {
  if (typeof priceStr === "number") return priceStr;
  if (!priceStr) return 0;
  const matches = String(priceStr).match(/[\d.]+/);
  return matches ? Number.parseFloat(matches[0]) : 0;
};

const sum = reduce((acc, n) => acc + n, 0);

// Returns null if hire item lacks price for that day count
const getPriceForDays = (days) => (item) => {
  if (!isHireItem(item)) {
    return item.unit_price * item.quantity;
  }
  const price = item.hire_prices[days];
  return price ? parsePrice(price) * item.quantity : null;
};

const formatItemName = (item) =>
  item.quantity > 1 ? `${item.item_name} (×${item.quantity})` : item.item_name;

const formatItemPrice = (price) =>
  price === null ? "TBC" : formatPrice(price);

const calculateTotal = (cart, days) => {
  const prices = map(getPriceForDays(days))(cart);
  if (prices.includes(null)) {
    return { total: 0, canCalculate: false };
  }
  return { total: sum(prices), canCalculate: true };
};

const formatHireLength = pluralize("day");
const formatItemCount = pluralize("item in order", "items in order");

const countItems = pipe(
  map((item) => item.quantity),
  sum,
);

const getFieldLabels = () =>
  JSON.parse(document.querySelector(".quote-field-labels").textContent);

const isRadio = (field) => field.type === "radio";
const isSelect = (field) => field.tagName === "SELECT";
const hasValue = (field) =>
  isRadio(field) ? getRadioValue(field.name) !== "" : field.value !== "";

const getSelectDisplayValue = (field) =>
  field.options[field.selectedIndex]?.text || "";

const getFieldValue = (field) => {
  if (isRadio(field)) return getRadioValue(field.name);
  if (isSelect(field)) return getSelectDisplayValue(field);
  return field.value;
};

const getLabelFromFieldMap = (field) =>
  getFieldLabels()[field.name || field.id];

const getFieldId = (field) => (isRadio(field) ? field.name : field.id);

const fieldToDetail = (field) => ({
  key: getLabelFromFieldMap(field),
  value: getFieldValue(field),
});

const collectFieldDetails = (container) => {
  if (container === null) return [];
  const fields = [...container.querySelectorAll("input, select, textarea")];
  return pipe(
    filter(hasValue),
    uniqueBy(getFieldId),
    map(fieldToDetail),
  )(fields);
};

const createItemElement = (item, days) => {
  const template = getTemplate(IDS.QUOTE_PRICE_ITEM, document);
  const price = getPriceForDays(days)(item);
  template.querySelector('[data-field="name"]').textContent =
    formatItemName(item);
  template.querySelector('[data-field="price"]').textContent =
    formatItemPrice(price);
  return template;
};

const populateItems = (container, cart, days) => {
  container.innerHTML = "";
  for (const item of cart) {
    container.appendChild(createItemElement(item, days));
  }
};

const createDetailElement = (detail) => {
  const template = getTemplate(IDS.QUOTE_PRICE_DETAIL);
  template.querySelector('[data-field="key"]').textContent = detail.key;
  template.querySelector('[data-field="value"]').textContent = detail.value;
  return template;
};

const populateDetails = (container, details) => {
  container.innerHTML = "";
  for (const detail of details) {
    container.appendChild(createDetailElement(detail));
  }
};

const getFormContainer = () =>
  document.querySelector(".quote-steps") || document.querySelector("form");

const renderQuotePrice = (container, days = 1) => {
  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  const template = getTemplate(IDS.QUOTE_PRICE, document);
  const { total, canCalculate } = calculateTotal(cart, days);
  const itemCount = countItems(cart);

  template.querySelector('[data-field="item-count"]').textContent =
    formatItemCount(itemCount);
  template.querySelector('[data-field="hire-length"]').textContent =
    formatHireLength(days);
  template.querySelector('[data-field="total"]').textContent = canCalculate
    ? formatPrice(total)
    : "TBC";

  const itemsContainer = template.querySelector('[data-field="items"]');
  populateItems(itemsContainer, cart, days);

  const detailsContainer = template.querySelector('[data-field="details"]');
  const details = collectFieldDetails(getFormContainer());
  populateDetails(detailsContainer, details);
  detailsContainer.parentElement.style.display =
    details.length === 0 ? "none" : "";

  container.innerHTML = "";
  container.appendChild(template);
  container.style.display = "block";
};

const updateQuotePrice = (days = 1) => {
  const container = document.getElementById("quote-price");
  if (container) renderQuotePrice(container, days);
};

const setupDetailsBlurHandlers = (getDays = () => 1) => {
  const formContainer = getFormContainer();
  if (formContainer === null) return;
  const handleBlur = (event) => {
    const target = event.target;
    if (target.matches("input, select, textarea")) {
      updateQuotePrice(getDays());
    }
  };

  // Use capture phase to catch blur events which don't bubble
  formContainer.addEventListener("blur", handleBlur, true);

  // Also handle change for radios/selects which may not blur naturally
  formContainer.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches('input[type="radio"], select')) {
      updateQuotePrice(getDays());
    }
  });
};

export { setupDetailsBlurHandlers, updateQuotePrice };
