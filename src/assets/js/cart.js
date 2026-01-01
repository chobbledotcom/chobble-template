// Shopping Cart
// Manages cart state in localStorage and provides cart functionality
// Supports both PayPal and Stripe checkout

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  escapeHtml,
  formatPrice,
  getCart,
  renderQuantityControls,
  saveCart,
  updateCartIcon,
  updateItemQuantity,
} from "#assets/cart-utils.js";
import Config from "#assets/config.js";
import { onReady } from "#assets/on-ready.js";

// Constants
const CART_OVERLAY_ID = "cart-overlay";
const IS_ENQUIRY_MODE = Config.cart_mode === "quote";
const MINIMUM_CHECKOUT_AMOUNT = Config.cart_mode === "stripe" ? 0.3 : 0;

// Helper to get cart overlay element fresh each time
const getCartOverlay = () => document.getElementById(CART_OVERLAY_ID);

// Reset product option selects on page load
const resetProductSelects = () => {
  const selects = document.querySelectorAll(".product-options-select");
  selects.forEach((select) => {
    select.selectedIndex = 0;
    const button = select.parentElement.querySelector(".product-option-button");
    if (button) {
      button.disabled = true;
      button.textContent = "Add to Cart";
    }
  });
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
  document.querySelectorAll(".cart-icon").forEach((icon) => {
    icon.classList.add("cart-bounce");
    setTimeout(() => icon.classList.remove("cart-bounce"), 600);
  });
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

// Render a single cart item as HTML
const renderCartItem = (item) => `
  <div class="cart-item" data-name="${escapeHtml(item.item_name)}">
    <div class="cart-item-info">
      <div class="cart-item-name">${escapeHtml(item.item_name)}</div>
      <div class="cart-item-price">${formatPrice(item.unit_price)}</div>
    </div>
    <div class="cart-item-controls">
      ${renderQuantityControls(item)}
      <button class="cart-item-remove" data-name="${escapeHtml(item.item_name)}">Remove</button>
    </div>
  </div>
`;

// Update checkout button states based on cart total
const updateCheckoutButtons = (cartOverlay, total) => {
  const paypalBtn = cartOverlay.querySelector(".cart-checkout-paypal");
  const stripeBtn = cartOverlay.querySelector(".cart-checkout-stripe");
  const minimumMessage = cartOverlay.querySelector(".cart-minimum-message");
  const isBelowMinimum = total <= MINIMUM_CHECKOUT_AMOUNT;

  if (paypalBtn) paypalBtn.disabled = total === 0;

  if (stripeBtn) {
    stripeBtn.style.display = isBelowMinimum ? "none" : "";
    stripeBtn.disabled = isBelowMinimum;
  }

  if (minimumMessage) {
    minimumMessage.style.display =
      isBelowMinimum && total > 0 ? "block" : "none";
  }
};

// Update cart display in overlay
const updateCartDisplay = () => {
  const cartOverlay = getCartOverlay();
  if (!cartOverlay) return;

  const cart = getCart();
  const cartItems = cartOverlay.querySelector(".cart-items");
  const cartEmpty = cartOverlay.querySelector(".cart-empty");
  const cartTotal = cartOverlay.querySelector(".cart-total-amount");

  if (!cartItems) return;

  const total = getCartTotal();
  const isEmpty = cart.length === 0;

  cartItems.innerHTML = isEmpty ? "" : cart.map(renderCartItem).join("");
  if (cartEmpty) cartEmpty.style.display = isEmpty ? "block" : "none";

  if (!isEmpty) {
    attachQuantityHandlers(cartItems, (name, qty) => updateQuantity(name, qty));
    attachRemoveHandlers(cartItems, ".cart-item-remove", () => {
      updateCartDisplay();
      updateCartCount();
    });
  }

  updateCheckoutButtons(cartOverlay, total);
  if (cartTotal) cartTotal.textContent = formatPrice(total);
};

// Update item quantity using shared utility
const updateQuantity = (itemName, quantity) => {
  updateItemQuantity(itemName, quantity);
  updateCartDisplay();
  updateCartCount();
};

// Add item to cart
const addItem = (
  itemName,
  unitPrice,
  quantity = 1,
  maxQuantity = null,
  sku = null,
  specs = null,
) => {
  const cart = getCart();
  const existingItem = cart.find((item) => item.item_name === itemName);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (maxQuantity && newQuantity > maxQuantity) {
      alert(`The maximum quantity for this item is ${maxQuantity}`);
      existingItem.quantity = maxQuantity;
    } else {
      existingItem.quantity = newQuantity;
    }
    if (maxQuantity !== null) {
      existingItem.max_quantity = maxQuantity;
    }
    if (sku !== null) {
      existingItem.sku = sku;
    }
  } else {
    cart.push({
      item_name: itemName,
      unit_price: unitPrice,
      quantity: quantity,
      max_quantity: maxQuantity,
      sku: sku,
      specs: specs,
    });
  }

  saveCart(cart);
  updateCartDisplay();
  updateCartCount();
  showAddedFeedback();
};

// Helper to POST minimal cart data (sku + quantity only) for validated checkout
const postSkus = async (url) => {
  const cart = getCart();
  const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });
};

// PayPal checkout via backend API
const paypalCheckout = async (apiUrl) => {
  try {
    const response = await postSkus(apiUrl);

    if (response.ok) {
      const order = await response.json();
      if (order.url) {
        window.location.href = order.url;
      } else {
        throw new Error("No approval URL returned");
      }
    } else {
      const error = await response.json();
      throw new Error(error.error || "Failed to create PayPal order");
    }
  } catch (_error) {
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

// Handle add to cart button click
const handleAddToCart = (e) => {
  if (!e.target.classList.contains("add-to-cart")) return;

  e.preventDefault();
  const button = e.target;

  // For product options, validate selection first
  if (button.classList.contains("product-option-button")) {
    const select = button.parentElement.querySelector(
      ".product-options-select",
    );
    if (select && select.value === "") {
      alert("Please select an option");
      return;
    }
  }

  const itemData = JSON.parse(button.dataset.item);
  const option = itemData.options[getOptionIndex(button)];
  const fullItemName = buildFullItemName(itemData.name, option.name);

  if (fullItemName && !Number.isNaN(option.unit_price)) {
    addItem(
      fullItemName,
      option.unit_price,
      1,
      option.max_quantity || null,
      option.sku || null,
      itemData.specs || null,
    );
  }
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

  if (!IS_ENQUIRY_MODE) {
    updateCartDisplay();
  }
  updateCartCount();
};

// Initialize cart when module loads
onReady(() => setup());

// Export for use in other modules if needed
export { addItem, clearCart, getCartTotal, openCart, closeCart };
