// Quote page cart display
// Shows cart items with quantity controls and remove buttons

import { createCartRenderer } from "#public/utils/cart-renderer.js";
import { onReady } from "#public/utils/on-ready.js";
import { updateQuotePrice } from "#public/utils/quote-price-utils.js";
import { IDS } from "#public/utils/selectors.js";

const enrichQuoteItem = (template, item) => {
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
};

const renderCart = createCartRenderer({
  getContainer: () => document.getElementById("quote-cart"),
  itemsSelector: ".quote-cart-items",
  emptySelector: ".quote-cart-empty",
  templateId: IDS.QUOTE_CART_ITEM,
  enrichItem: enrichQuoteItem,
  onRender: (container, cart) => {
    const actionsEl = container.querySelector(".quote-cart-actions");
    if (actionsEl) {
      actionsEl.style.display = cart.length === 0 ? "none" : "flex";
    }
    updateQuotePrice();
  },
});

onReady(renderCart);
