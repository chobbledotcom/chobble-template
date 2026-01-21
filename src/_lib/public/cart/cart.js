// Shopping Cart
// Manages cart state in localStorage and provides cart functionality
// Supports both PayPal and Stripe checkout

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  formatPrice,
  getCart,
  getCheckoutItems,
  saveCart,
  updateCartIcon,
  updateItemQuantity,
} from "#public/utils/cart-utils.js";
import Config from "#public/utils/config.js";
import { postJson } from "#public/utils/http.js";
import { onReady } from "#public/utils/on-ready.js";
import { IDS } from "#public/utils/selectors.js";
import {
  getTemplate,
  populateItemFields,
  populateQuantityControls,
} from "#public/utils/template.js";

const CART_OVERLAY_ID = "cart-overlay";
const IS_ENQUIRY_MODE = Config.cart_mode === "quote";
const MINIMUM_CHECKOUT_AMOUNT = Config.cart_mode === "stripe" ? 0.3 : 0;

const getCartOverlay = () => document.getElementById(CART_OVERLAY_ID);

const resetProductSelects = () => {
  const selects = document.querySelectorAll(".product-options-select");
  for (const select of selects) {
    select.selectedIndex = 0;
    const button = select.parentElement.querySelector(".product-option-button");
    if (button) {
      button.disabled = true;
      button.textContent = "Add to Cart";
    }
  }
};

const getCartTotal = () => {
  const cart = getCart();
  return cart.reduce(
    (total, item) => total + item.unit_price * item.quantity,
    0,
  );
};

const showAddedFeedback = () => {
  for (const icon of document.querySelectorAll(".cart-icon")) {
    icon.classList.add("cart-bounce");
    setTimeout(() => icon.classList.remove("cart-bounce"), 600);
  }
};

const openCart = () => {
  const cartOverlay = getCartOverlay();
  if (cartOverlay) {
    cartOverlay.showModal();
  }
};

const closeCart = () => {
  const cartOverlay = getCartOverlay();
  if (cartOverlay) {
    cartOverlay.close();
  }
};

const renderCartItem = (item) => {
  const template = getTemplate(IDS.CART_ITEM, document);

  populateItemFields(template, item.item_name, formatPrice(item.unit_price));
  populateQuantityControls(template, item);

  return template;
};

const updateStripeBtn = (btn, isBelowMinimum) => {
  btn.style.display = isBelowMinimum ? "none" : "";
  btn.disabled = isBelowMinimum;
};

const updateCheckoutButtons = (cartOverlay, total) => {
  const isBelowMinimum = total <= MINIMUM_CHECKOUT_AMOUNT;
  const paypalBtn = cartOverlay.querySelector(".cart-checkout-paypal");
  const stripeBtn = cartOverlay.querySelector(".cart-checkout-stripe");
  const minMsg = cartOverlay.querySelector(".cart-minimum-message");

  if (paypalBtn) paypalBtn.disabled = total === 0;
  if (stripeBtn) updateStripeBtn(stripeBtn, isBelowMinimum);
  if (minMsg)
    minMsg.style.display = isBelowMinimum && total > 0 ? "block" : "none";
};

const renderCartItems = (cartItems, cart) => {
  cartItems.innerHTML = "";
  for (const item of cart) {
    cartItems.appendChild(renderCartItem(item));
  }
  attachQuantityHandlers((name, qty) => updateQuantity(name, qty));
  attachRemoveHandlers(() => {
    updateCartDisplay();
    updateCartIcon();
  });
};

const updateCartVisibility = (cartOverlay, isEmpty, total) => {
  const cartEmpty = cartOverlay.querySelector(".cart-empty");
  const cartTotal = cartOverlay.querySelector(".cart-total-amount");
  if (cartEmpty) cartEmpty.style.display = isEmpty ? "block" : "none";
  if (cartTotal) cartTotal.textContent = formatPrice(total);
  updateCheckoutButtons(cartOverlay, total);
};

const updateCartDisplay = () => {
  const cartOverlay = getCartOverlay();
  const cartItems = cartOverlay?.querySelector(".cart-items");
  if (!cartItems) return;

  const cart = getCart();
  const isEmpty = cart.length === 0;
  if (isEmpty) cartItems.innerHTML = "";
  else renderCartItems(cartItems, cart);
  updateCartVisibility(cartOverlay, isEmpty, getCartTotal());
};

const updateQuantity = (itemName, quantity) => {
  updateItemQuantity(itemName, quantity);
  updateCartDisplay();
  updateCartIcon();
};

const clampQuantity = (quantity, maxQuantity) => {
  if (!maxQuantity || quantity <= maxQuantity) return quantity;
  alert(`The maximum quantity for this item is ${maxQuantity}`);
  return maxQuantity;
};

const withAddedQuantity = (item, quantity, maxQuantity, sku) => ({
  ...item,
  quantity: clampQuantity(item.quantity + quantity, maxQuantity),
  max_quantity: maxQuantity ?? item.max_quantity,
  sku: sku ?? item.sku,
});

const addItem = (
  itemName,
  unitPrice,
  quantity = 1,
  maxQuantity,
  sku,
  specs,
  hirePrices,
  productMode,
  subtitle,
) => {
  const cart = getCart();
  const existingIndex = cart.findIndex((item) => item.item_name === itemName);

  const newItem = {
    item_name: itemName,
    unit_price: unitPrice,
    quantity,
    max_quantity: maxQuantity,
    sku,
    specs,
    hire_prices: hirePrices,
    product_mode: productMode,
    subtitle,
  };

  const newCart =
    existingIndex >= 0
      ? cart.map((item, i) =>
          i === existingIndex
            ? withAddedQuantity(item, quantity, maxQuantity, sku)
            : item,
        )
      : [...cart, newItem];

  saveCart(newCart);
  updateCartDisplay();
  updateCartIcon();
  showAddedFeedback();
};

const checkoutWithPayPal = async () => {
  const cart = getCart();
  if (cart.length === 0) return;

  const items = getCheckoutItems();
  const order = await postJson(Config.checkout_api_url, { items });

  if (order?.url) {
    window.location.href = order.url;
  } else {
    alert("Failed to start checkout. Please try again.");
  }
};

const checkoutWithStripe = () => {
  const cart = getCart();
  if (cart.length === 0) return;

  window.location.href = "/stripe-checkout/";
};

const clearCart = () => {
  saveCart([]);
  updateCartDisplay();
  updateCartIcon();
};

const getOptionIndex = (button) =>
  button.classList.contains("product-option-button")
    ? parseInt(
        button.parentElement.querySelector(".product-options-select").value,
        10,
      )
    : 0;

const buttonOption = (button, optionIndex = getOptionIndex(button)) => {
  const itemData = JSON.parse(button.dataset.item);
  return { itemData, option: itemData.options[optionIndex] };
};

const buildFullItemName = (itemName, optionName) =>
  optionName && optionName !== itemName
    ? `${itemName} - ${optionName}`
    : itemName;

const handleOptionChange = (e) => {
  if (!e.target.classList.contains("product-options-select")) return;

  const select = e.target;
  const selectedOption = select.options[select.selectedIndex];
  const button = select.parentElement.querySelector(".product-option-button");

  if (button && selectedOption && selectedOption.value !== "") {
    const { option } = buttonOption(button, parseInt(selectedOption.value, 10));
    button.disabled = false;
    button.textContent = `Add to Cart - £${option.unit_price}`;
  }
};

const handleCartIconClick = (e) => {
  if (!e.target.closest(".cart-icon")) return false;

  e.preventDefault();
  if (IS_ENQUIRY_MODE) {
    window.location.href = "/quote/";
  } else {
    openCart();
  }
  return true;
};

const validateProductOption = (button) => {
  if (!button.classList.contains("product-option-button")) return true;
  const select = button.parentElement.querySelector(".product-options-select");
  if (select && select.value === "") {
    alert("Please select an option");
    return false;
  }
  return true;
};

const extractItemFromButton = (button) => {
  const { itemData, option } = buttonOption(button);

  return {
    name: buildFullItemName(itemData.name, option.name),
    unitPrice: option.unit_price,
    maxQuantity: option.max_quantity,
    sku: option.sku,
    specs: itemData.specs,
    hirePrices: itemData.hire_prices,
    productMode: itemData.product_mode,
    subtitle: itemData.subtitle,
  };
};

const handleAddToCart = (e) => {
  if (!e.target.classList.contains("add-to-cart")) return;
  e.preventDefault();

  const button = e.target;
  if (!validateProductOption(button)) return;

  const item = extractItemFromButton(button);
  addItem(
    item.name,
    item.unitPrice,
    1,
    item.maxQuantity,
    item.sku,
    item.specs,
    item.hirePrices,
    item.productMode,
    item.subtitle,
  );
};

const setupOverlayListeners = () => {
  const cartOverlay = getCartOverlay();
  if (IS_ENQUIRY_MODE || !cartOverlay) return;

  cartOverlay.addEventListener("click", (e) => {
    if (e.target === cartOverlay) closeCart();
  });

  const paypalBtn = cartOverlay.querySelector(".cart-checkout-paypal");
  if (paypalBtn) paypalBtn.addEventListener("click", checkoutWithPayPal);

  const stripeBtn = cartOverlay.querySelector(".cart-checkout-stripe");
  if (stripeBtn) stripeBtn.addEventListener("click", checkoutWithStripe);
};

const setupDocumentListeners = () => {
  if (document.documentElement.dataset.cartListenersAttached) return;
  document.documentElement.dataset.cartListenersAttached = "true";

  document.addEventListener("change", handleOptionChange);
  document.addEventListener("click", (e) => {
    if (handleCartIconClick(e)) return;
    handleAddToCart(e);
  });
};

const setup = () => {
  // No cart functionality if cart_mode is not set
  if (!Config.cart_mode) {
    return;
  }

  resetProductSelects();
  setupOverlayListeners();
  setupDocumentListeners();

  if (IS_ENQUIRY_MODE === false) {
    updateCartDisplay();
  }
  updateCartIcon();
};

onReady(() => setup());

export { addItem, clearCart, getCartTotal, openCart, closeCart };
