// Shopping Cart
// Manages cart state in localStorage and provides cart functionality
// Supports both PayPal and Stripe checkout

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  formatPrice,
  getCart,
  saveCart,
  updateCartIcon,
  updateItemQuantity,
} from "#assets/cart-utils.js";
import Config from "#assets/config.js";
import { postJson } from "#assets/http.js";
import { onReady } from "#assets/on-ready.js";
import { IDS } from "#assets/selectors.js";
import {
  getTemplate,
  populateItemFields,
  populateQuantityControls,
} from "#assets/template.js";

// Constants
const CART_OVERLAY_ID = "cart-overlay";
const IS_ENQUIRY_MODE = Config.cart_mode === "quote";
const MINIMUM_CHECKOUT_AMOUNT = Config.cart_mode === "stripe" ? 0.3 : 0;

// Helper to get cart overlay element fresh each time
const getCartOverlay = () => document.getElementById(CART_OVERLAY_ID);

// Reset product option selects on page load
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

// Calculate cart total
const getCartTotal = () => {
  const cart = getCart();
  return cart.reduce(
    (total, item) => total + item.unit_price * item.quantity,
    0,
  );
};

// Update cart count badge
const updateCartCount = () => {
  updateCartIcon();
};

// Show "added to cart" feedback
const showAddedFeedback = () => {
  for (const icon of document.querySelectorAll(".cart-icon")) {
    icon.classList.add("cart-bounce");
    setTimeout(() => icon.classList.remove("cart-bounce"), 600);
  }
};

// Open cart overlay
const openCart = () => {
  const cartOverlay = getCartOverlay();
  if (cartOverlay) {
    cartOverlay.showModal();
  }
};

// Close cart overlay
const closeCart = () => {
  const cartOverlay = getCartOverlay();
  if (cartOverlay) {
    cartOverlay.close();
  }
};

// Render a single cart item using template
const renderCartItem = (item) => {
  const template = getTemplate(IDS.CART_ITEM);

  populateItemFields(template, item.item_name, formatPrice(item.unit_price));
  populateQuantityControls(template, item);

  return template;
};

const updateStripeBtn = (btn, isBelowMinimum) => {
  btn.style.display = isBelowMinimum ? "none" : "";
  btn.disabled = isBelowMinimum;
};

// Update checkout button states based on cart total
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

// Render cart items and attach handlers
const renderCartItems = (cartItems, cart) => {
  cartItems.innerHTML = "";
  for (const item of cart) {
    cartItems.appendChild(renderCartItem(item));
  }
  attachQuantityHandlers(cartItems, (name, qty) => updateQuantity(name, qty));
  attachRemoveHandlers(cartItems, '[data-action="remove"]', () => {
    updateCartDisplay();
    updateCartCount();
  });
};

const updateCartVisibility = (cartOverlay, isEmpty, total) => {
  const cartEmpty = cartOverlay.querySelector(".cart-empty");
  const cartTotal = cartOverlay.querySelector(".cart-total-amount");
  if (cartEmpty) cartEmpty.style.display = isEmpty ? "block" : "none";
  if (cartTotal) cartTotal.textContent = formatPrice(total);
  updateCheckoutButtons(cartOverlay, total);
};

// Update cart display in overlay
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

// Update item quantity using shared utility
const updateQuantity = (itemName, quantity) => {
  updateItemQuantity(itemName, quantity);
  updateCartDisplay();
  updateCartCount();
};

// Clamp quantity to max, alerting if exceeded
const clampQuantity = (quantity, maxQuantity) => {
  if (!maxQuantity || quantity <= maxQuantity) return quantity;
  alert(`The maximum quantity for this item is ${maxQuantity}`);
  return maxQuantity;
};

// Create updated item with added quantity
const withAddedQuantity = (item, quantity, maxQuantity, sku) => ({
  ...item,
  quantity: clampQuantity(item.quantity + quantity, maxQuantity),
  max_quantity: maxQuantity ?? item.max_quantity,
  sku: sku ?? item.sku,
});

// Update item at index, keeping others unchanged
const updateItemAt = (cart, index, updateFn) =>
  cart.map((item, i) => (i === index ? updateFn(item) : item));

// Append new item to cart
const appendItem = (cart, newItem) => [...cart, newItem];

// Add item to cart (functional - no mutation)
const addItem = (
  itemName,
  unitPrice,
  quantity = 1,
  maxQuantity = null,
  sku = null,
  specs = null,
  hirePrices = null,
  productMode = null,
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
  };

  const newCart =
    existingIndex >= 0
      ? updateItemAt(cart, existingIndex, (item) =>
          withAddedQuantity(item, quantity, maxQuantity, sku),
        )
      : appendItem(cart, newItem);

  saveCart(newCart);
  updateCartDisplay();
  updateCartCount();
  showAddedFeedback();
};

// PayPal checkout via backend API
const paypalCheckout = async (apiUrl) => {
  const cart = getCart();
  const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));
  const order = await postJson(apiUrl, { items });

  if (order?.url) {
    window.location.href = order.url;
  } else {
    alert("Failed to start checkout. Please try again.");
  }
};

// Checkout with PayPal
const checkoutWithPayPal = async () => {
  const cart = getCart();
  if (cart.length === 0) return;

  const checkoutApiUrl = Config.checkout_api_url;
  await paypalCheckout(checkoutApiUrl);
};

// Checkout with Stripe - redirects to dedicated checkout page
const checkoutWithStripe = () => {
  const cart = getCart();
  if (cart.length === 0) return;

  window.location.href = "/stripe-checkout/";
};

// Clear cart (useful after successful checkout)
const clearCart = () => {
  saveCart([]);
  updateCartDisplay();
  updateCartCount();
};

// Get the selected option index from a product button
const getOptionIndex = (button) =>
  button.classList.contains("product-option-button")
    ? parseInt(
        button.parentElement.querySelector(".product-options-select").value,
        10,
      )
    : 0;

// Build full item name from base name and option
const buildFullItemName = (itemName, optionName) =>
  optionName && optionName !== itemName
    ? `${itemName} - ${optionName}`
    : itemName;

// Handle product option select change - update button text with price
const handleOptionChange = (e) => {
  if (!e.target.classList.contains("product-options-select")) return;

  const select = e.target;
  const selectedOption = select.options[select.selectedIndex];
  const button = select.parentElement.querySelector(".product-option-button");

  if (button && selectedOption && selectedOption.value !== "") {
    const itemData = JSON.parse(button.dataset.item);
    const option = itemData.options[parseInt(selectedOption.value, 10)];
    button.disabled = false;
    button.textContent = `Add to Cart - £${option.unit_price}`;
  }
};

// Handle cart icon click - open cart or navigate to quote page
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

// Validate product option selection
const validateProductOption = (button) => {
  if (!button.classList.contains("product-option-button")) return true;
  const select = button.parentElement.querySelector(".product-options-select");
  if (select && select.value === "") {
    alert("Please select an option");
    return false;
  }
  return true;
};

// Extract item details from add-to-cart button
const extractItemFromButton = (button) => {
  const itemData = JSON.parse(button.dataset.item);
  const option = itemData.options[getOptionIndex(button)];

  return {
    name: buildFullItemName(itemData.name, option.name),
    unitPrice: option.unit_price,
    maxQuantity: option.max_quantity || null,
    sku: option.sku || null,
    specs: itemData.specs || null,
    hirePrices: itemData.hire_prices || null,
    productMode: itemData.product_mode || null,
  };
};

// Handle add to cart button click
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
  );
};

// Set up cart overlay listeners (checkout buttons, backdrop click)
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

// Set up document-level event listeners (only once)
const setupDocumentListeners = () => {
  if (document.documentElement.dataset.cartListenersAttached) return;
  document.documentElement.dataset.cartListenersAttached = "true";

  document.addEventListener("change", handleOptionChange);
  document.addEventListener("click", (e) => {
    if (handleCartIconClick(e)) return;
    handleAddToCart(e);
  });
};

// Set up all event listeners
const setupEventListeners = () => {
  setupOverlayListeners();
  setupDocumentListeners();
};

// Setup cart on page load
const setup = () => {
  // No cart functionality if cart_mode is not set
  if (!Config.cart_mode) {
    return;
  }

  resetProductSelects();
  setupEventListeners();

  if (IS_ENQUIRY_MODE === false) {
    updateCartDisplay();
  }
  updateCartCount();
};

// Initialize cart when module loads
onReady(() => setup());

// Export for use in other modules if needed
export { addItem, clearCart, getCartTotal, openCart, closeCart };
