// Quote page cart display
// Shows cart items with quantity controls and remove buttons

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  formatPrice,
  getCart,
  updateCartIcon,
  updateItemQuantity,
} from "#public/utils/cart-utils.js";
import { onReady } from "#public/utils/on-ready.js";
import { updateQuotePrice } from "#public/utils/quote-price-utils.js";
import { IDS } from "#public/utils/selectors.js";
import {
  getTemplate,
  populateItemFields,
  populateQuantityControls,
} from "#public/utils/template.js";

function handleQuantityUpdate(itemName, quantity) {
  updateItemQuantity(itemName, quantity);
  renderCart();
  updateCartIcon();
}

function renderQuoteItem(item) {
  const template = getTemplate(IDS.QUOTE_CART_ITEM, document);

  populateItemFields(template, item.item_name, formatPrice(item.unit_price));

  const subtitleLi = template.querySelector('[data-field="subtitle"]');
  if (item.subtitle) {
    subtitleLi.textContent = item.subtitle;
  } else {
    subtitleLi.style.display = "none";
  }

  const specsLi = template.querySelector(".quote-cart-item-specs");
  if (item.specs && item.specs.length > 0) {
    specsLi.querySelector('[data-field="specs"]').textContent = item.specs
      .map((s) => `${s.name}: ${s.value}`)
      .join(", ");
  } else {
    specsLi.remove();
  }

  populateQuantityControls(template, item);

  return template;
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById("quote-cart");
  if (!container) return;

  const itemsEl = container.querySelector(".quote-cart-items");
  const emptyEl = container.querySelector(".quote-cart-empty");
  const actionsEl = container.querySelector(".quote-cart-actions");

  if (cart.length === 0) {
    emptyEl.style.display = "block";
    itemsEl.innerHTML = "";
    actionsEl.style.display = "none";
  } else {
    emptyEl.style.display = "none";
    actionsEl.style.display = "block";

    itemsEl.innerHTML = "";
    for (const item of cart) {
      itemsEl.appendChild(renderQuoteItem(item));
    }

    attachQuantityHandlers(handleQuantityUpdate);
    attachRemoveHandlers(() => {
      renderCart();
      updateCartIcon();
    });
  }

  updateQuotePrice();
}

onReady(renderCart);
