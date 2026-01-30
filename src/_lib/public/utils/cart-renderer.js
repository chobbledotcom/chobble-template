// Shared cart/quote rendering
// Factory that creates a self-updating cart renderer from configuration.
// Both the cart overlay and quote page use the same render loop:
// get cart → show/hide empty state → render items → attach handlers → post-render hook

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

// renderItem :: (templateId, enrichItem?) -> item -> DocumentFragment
// Clones a template, populates standard fields and quantity controls,
// then optionally applies an enrichment function for extra fields.
const renderItem = (templateId, enrichItem) => (item) => {
  const template = getTemplate(templateId, document);
  populateItemFields(template, item.item_name, formatPrice(item.unit_price));
  populateQuantityControls(template, item);
  if (enrichItem) enrichItem(template, item);
  return template;
};

// attachHandlers :: (() -> void) -> void
// Wires up quantity and remove buttons to re-render and update the cart icon.
const attachHandlers = (render) => {
  attachQuantityHandlers((name, qty) => {
    updateItemQuantity(name, qty);
    render();
    updateCartIcon();
  });
  attachRemoveHandlers(() => {
    render();
    updateCartIcon();
  });
};

// updateEmptyState :: (Element, string, boolean) -> void
// Shows or hides the empty-cart message element.
const updateEmptyState = (container, emptySelector, isEmpty) => {
  if (!emptySelector) return;
  const emptyEl = container.querySelector(emptySelector);
  if (emptyEl) emptyEl.style.display = isEmpty ? "block" : "none";
};

// populateItems :: ((item) -> Node, Element, Object[], () -> void) -> void
// Clears the container, appends rendered items, and attaches handlers.
const populateItems = (renderSingleItem, itemsEl, cart, render) => {
  itemsEl.innerHTML = "";
  for (const item of cart) {
    itemsEl.appendChild(renderSingleItem(item));
  }
  attachHandlers(render);
};

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
  const renderSingleItem = renderItem(templateId, enrichItem);

  const render = () => {
    const container = getContainer();
    if (!container) return;

    const cart = getCart();
    const itemsEl = container.querySelector(itemsSelector);

    updateEmptyState(container, emptySelector, cart.length === 0);

    if (cart.length === 0) {
      itemsEl.innerHTML = "";
    } else {
      populateItems(renderSingleItem, itemsEl, cart, render);
    }

    if (onRender) onRender(container, cart);
  };

  return render;
};

export { createCartRenderer };
