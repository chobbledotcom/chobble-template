// Shopping Cart
// Manages cart state in localStorage and provides cart functionality
// Supports both PayPal and Stripe checkout

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  escapeHtml,
  formatPrice,
  getCart,
  removeItem,
  renderQuantityControls,
  saveCart,
  updateCartIcon,
} from "#assets/cart-utils.js";
import Config from "#assets/config.js";
import { onReady } from "#assets/on-ready.js";

// Constants
const CART_OVERLAY_ID = "cart-overlay";
const MINIMUM_CHECKOUT_AMOUNT = 0.3; // Stripe requires at least 30p

// Module state
let documentListenersAttached = false;
let isEnquiryMode = false;

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

// Update cart display in overlay
const updateCartDisplay = () => {
  const cartOverlay = getCartOverlay();
  if (!cartOverlay) return;

  const cart = getCart();
  const cartItems = cartOverlay.querySelector(".cart-items");
  const cartEmpty = cartOverlay.querySelector(".cart-empty");
  const cartTotal = cartOverlay.querySelector(".cart-total-amount");
  const paypalBtn = cartOverlay.querySelector(".cart-checkout-paypal");
  const stripeBtn = cartOverlay.querySelector(".cart-checkout-stripe");
  const minimumMessage = cartOverlay.querySelector(".cart-minimum-message");

  if (!cartItems) return;

  const total = getCartTotal();
  const isBelowMinimum = total <= MINIMUM_CHECKOUT_AMOUNT;

  if (cart.length === 0) {
    cartItems.innerHTML = "";
    if (cartEmpty) cartEmpty.style.display = "block";
    if (paypalBtn) paypalBtn.disabled = true;
    if (stripeBtn) {
      stripeBtn.disabled = true;
      stripeBtn.style.display = "";
    }
    if (minimumMessage) minimumMessage.style.display = "none";
  } else {
    if (cartEmpty) cartEmpty.style.display = "none";
    if (paypalBtn) paypalBtn.disabled = false;

    if (stripeBtn) {
      if (isBelowMinimum) {
        stripeBtn.style.display = "none";
      } else {
        stripeBtn.style.display = "";
        stripeBtn.disabled = false;
      }
    }
    if (minimumMessage) {
      minimumMessage.style.display = isBelowMinimum ? "block" : "none";
    }

    cartItems.innerHTML = cart
      .map(
        (item) => `
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
      `,
      )
      .join("");

    attachQuantityHandlers(cartItems, (name, qty) => updateQuantity(name, qty));
    attachRemoveHandlers(cartItems, ".cart-item-remove", () => {
      updateCartDisplay();
      updateCartCount();
    });
  }

  if (cartTotal) {
    cartTotal.textContent = formatPrice(getCartTotal());
  }
};

// Update item quantity
const updateQuantity = (itemName, quantity) => {
  const cart = getCart();
  const item = cart.find((item) => item.item_name === itemName);

  if (item) {
    if (quantity <= 0) {
      removeItem(itemName);
      updateCartDisplay();
      updateCartCount();
    } else {
      if (item.max_quantity && quantity > item.max_quantity) {
        alert(`The maximum quantity for this item is ${item.max_quantity}`);
        item.quantity = item.max_quantity;
      } else {
        item.quantity = quantity;
      }
      saveCart(cart);
      updateCartDisplay();
      updateCartCount();
    }
  }
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

// Set up event listeners
const setupEventListeners = () => {
  const cartOverlay = getCartOverlay();

  // Overlay-specific listeners (skip in enquiry mode)
  if (!isEnquiryMode && cartOverlay) {
    cartOverlay.addEventListener("click", (e) => {
      if (e.target === cartOverlay) {
        closeCart();
      }
    });

    const paypalBtn = cartOverlay.querySelector(".cart-checkout-paypal");
    if (paypalBtn) {
      paypalBtn.addEventListener("click", () => checkoutWithPayPal());
    }

    const stripeBtn = cartOverlay.querySelector(".cart-checkout-stripe");
    if (stripeBtn) {
      stripeBtn.addEventListener("click", () => checkoutWithStripe());
    }
  }

  // Document-level listeners using event delegation
  // Only attach these once since document persists across Turbo navigations
  if (documentListenersAttached) {
    return;
  }
  documentListenersAttached = true;

  // Product option select change
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("product-options-select")) {
      const select = e.target;
      const selectedOption = select.options[select.selectedIndex];
      const button = select.parentElement.querySelector(
        ".product-option-button",
      );

      if (button && selectedOption && selectedOption.value !== "") {
        try {
          const itemData = JSON.parse(button.dataset.item);
          const optionIndex = parseInt(selectedOption.value, 10);
          const option = itemData.options[optionIndex];
          button.disabled = false;
          button.textContent = `Add to Cart - £${option.unit_price}`;
        } catch (_err) {
          alert("Error loading product options. Please refresh the page.");
          button.disabled = false;
          button.textContent = "Add to Cart";
        }
      }
    }
  });

  // Click handler using event delegation for add-to-cart and cart icon
  document.addEventListener("click", (e) => {
    // Cart icon click - open cart or navigate to quote page
    if (e.target.closest(".cart-icon")) {
      e.preventDefault();
      if (isEnquiryMode) {
        window.location.href = "/quote/";
      } else {
        openCart();
      }
      return;
    }

    // Add to cart button click
    if (e.target.classList.contains("add-to-cart")) {
      e.preventDefault();
      const button = e.target;

      let itemData;
      try {
        itemData = JSON.parse(button.dataset.item);
      } catch (_err) {
        alert("Error adding item to cart. Please refresh the page.");
        return;
      }

      let optionIndex = 0;
      if (button.classList.contains("product-option-button")) {
        const select = button.parentElement.querySelector(
          ".product-options-select",
        );
        if (select && select.value === "") {
          alert("Please select an option");
          return;
        }
        optionIndex = parseInt(select.value, 10);
      }

      const option = itemData.options[optionIndex];
      const itemName = itemData.name;
      const optionName = option.name;
      const unitPrice = option.unit_price;
      const maxQuantity = option.max_quantity || null;
      const sku = option.sku || null;
      const specs = itemData.specs || null;

      const fullItemName =
        optionName && optionName !== itemName
          ? `${itemName} - ${optionName}`
          : itemName;

      if (fullItemName && !Number.isNaN(unitPrice)) {
        addItem(fullItemName, unitPrice, 1, maxQuantity, sku, specs);
      }
    }
  });
};

// Setup cart on page load
const setup = () => {
  isEnquiryMode = Config.cart_mode === "quote";

  // No cart functionality if cart_mode is not set
  if (!Config.cart_mode) {
    return;
  }

  resetProductSelects();
  setupEventListeners();

  if (!isEnquiryMode) {
    updateCartDisplay();
  }
  updateCartCount();
};

// Initialize cart when module loads
onReady(() => setup());

// Export for use in other modules if needed
export { addItem, clearCart, getCartTotal, openCart, closeCart };
