// Shared cart/quote rendering via a createCartRenderer factory

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  formatPrice,
  getCart,
  updateCartIcon,
  updateItemQuantity,
} from "#public/utils/cart-utils.js";
import {
  getTemplate,
  populateItemFields,
  populateQuantityControls,
} from "#public/utils/template.js";

/**
 * createCartRenderer :: Config -> () -> void
 *
 * Returns a render function that reads the cart from localStorage
 * and updates the DOM. Calling the render function again re-renders
 * from scratch (used after quantity/remove changes).
 *
 * @param {Object} config
 * @param {() => Element|null} config.getContainer - Locates the root container element
 * @param {string} config.itemsSelector - CSS selector for the items list within the container
 * @param {string} config.templateId - Template element ID to clone per item
 * @param {string} [config.emptySelector] - CSS selector for the "empty cart" message element
 * @param {(template: DocumentFragment, item: Object) => void} [config.enrichItem]
 *   Optional function to populate extra template fields (e.g. subtitle, specs)
 * @param {(container: Element, cart: Object[]) => void} [config.onRender]
 *   Called after every render with the container and current cart contents
 */
const createCartRenderer = ({
  getContainer,
  itemsSelector,
  templateId,
  emptySelector,
  enrichItem,
  onRender,
}) => {
  const cloneAndPopulateItem = (item) => {
    const template = getTemplate(templateId, document);
    populateItemFields(template, item.item_name, formatPrice(item.unit_price));
    populateQuantityControls(template, item);
    if (enrichItem) enrichItem(template, item);
    return template;
  };

  const setEmptyVisibility = (container, isEmpty) => {
    const emptyEl = emptySelector && container.querySelector(emptySelector);
    if (emptyEl) emptyEl.style.display = isEmpty ? "block" : "none";
  };

  const populateCartItems = (itemsEl, cart, rerender) => {
    itemsEl.innerHTML = "";
    for (const item of cart) {
      itemsEl.appendChild(cloneAndPopulateItem(item));
    }
    attachQuantityHandlers((name, qty) => {
      updateItemQuantity(name, qty);
      rerender();
      updateCartIcon();
    });
    attachRemoveHandlers(() => {
      rerender();
      updateCartIcon();
    });
  };

  const renderCartView = () => {
    const container = getContainer();
    if (!container) return;

    const cart = getCart();
    const itemsEl = container.querySelector(itemsSelector);

    setEmptyVisibility(container, cart.length === 0);

    if (cart.length === 0) {
      itemsEl.innerHTML = "";
    } else {
      populateCartItems(itemsEl, cart, renderCartView);
    }

    if (onRender) onRender(container, cart);
  };

  return renderCartView;
};

export { createCartRenderer };
