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

class ShoppingCart {
  // Minimum checkout amount in pounds (Stripe requires at least 30p)
  static MINIMUM_CHECKOUT_AMOUNT = 0.3;

  constructor() {
    this.cartOverlay = null;
    this.documentListenersAttached = false;
    this.isEnquiryMode = false;
    this.init();
  }

  init() {
    // Setup on DOM ready and Turbo navigation (Turbo replaces body content,
    // so we need to re-query DOM elements and re-attach element-specific listeners)
    onReady(() => this.setup());
  }

  setup() {
    // Check cart mode from config
    this.isEnquiryMode = Config.cart_mode === "quote";
    this.cartOverlay = document.getElementById("cart-overlay");

    // No cart functionality if cart_mode is not set
    if (!Config.cart_mode) {
      return;
    }

    // Reset product option selects on page load
    this.resetProductSelects();

    // Set up event listeners
    this.setupEventListeners();

    // Update cart display (only if not in enquiry mode)
    if (!this.isEnquiryMode) {
      this.updateCartDisplay();
    }
    this.updateCartCount();
  }

  resetProductSelects() {
    // Reset all product option selects to default "Please select option"
    const selects = document.querySelectorAll(".product-options-select");
    selects.forEach((select) => {
      // Reset to first option (index 0, which is "Please select option")
      select.selectedIndex = 0;

      // Also disable the associated button
      const button = select.parentElement.querySelector(
        ".product-option-button",
      );
      if (button) {
        button.disabled = true;
        button.textContent = "Add to Cart";
      }
    });
  }

  setupEventListeners() {
    // Overlay-specific listeners (skip in enquiry mode)
    if (!this.isEnquiryMode && this.cartOverlay) {
      // Light dismiss: close cart when clicking on the backdrop
      // The dialog element receives click events that pass through the backdrop
      this.cartOverlay.addEventListener("click", (e) => {
        // If the click target is the dialog itself (not its children),
        // it means the click was on the backdrop area
        if (e.target === this.cartOverlay) {
          this.closeCart();
        }
      });

      // PayPal checkout button
      const paypalBtn = this.cartOverlay.querySelector(".cart-checkout-paypal");
      if (paypalBtn) {
        paypalBtn.addEventListener("click", () => this.checkoutWithPayPal());
      }

      // Stripe checkout button
      const stripeBtn = this.cartOverlay.querySelector(".cart-checkout-stripe");
      if (stripeBtn) {
        stripeBtn.addEventListener("click", () => this.checkoutWithStripe());
      }
    }

    // Document-level listeners using event delegation
    // Only attach these once since document persists across Turbo navigations
    if (this.documentListenersAttached) {
      return;
    }
    this.documentListenersAttached = true;

    // Product option select change
    document.addEventListener("change", (e) => {
      if (e.target.classList.contains("product-options-select")) {
        const select = e.target;
        const selectedOption = select.options[select.selectedIndex];
        const button = select.parentElement.querySelector(
          ".product-option-button",
        );

        if (button && selectedOption && selectedOption.value !== "") {
          // Parse the item data to get the selected option's price
          try {
            const itemData = JSON.parse(button.dataset.item);
            const optionIndex = parseInt(selectedOption.value);
            const option = itemData.options[optionIndex];
            button.disabled = false;
            button.textContent = `Add to Cart - £${option.unit_price}`;
          } catch (err) {
            console.error("[cart.js] Failed to parse item data:", err.message);
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
        if (this.isEnquiryMode) {
          window.location.href = "/quote/";
        } else {
          this.openCart();
        }
        return;
      }

      // Add to cart button click
      if (e.target.classList.contains("add-to-cart")) {
        e.preventDefault();
        const button = e.target;

        // Parse the item data
        let itemData;
        try {
          itemData = JSON.parse(button.dataset.item);
        } catch (err) {
          console.error("[cart.js] Failed to parse item data:", err.message);
          alert("Error adding item to cart. Please refresh the page.");
          return;
        }

        // Determine which option to use
        let optionIndex = 0;
        if (button.classList.contains("product-option-button")) {
          const select = button.parentElement.querySelector(
            ".product-options-select",
          );
          if (select && select.value === "") {
            alert("Please select an option");
            return;
          }
          optionIndex = parseInt(select.value);
        }

        const option = itemData.options[optionIndex];
        const itemName = itemData.name;
        const optionName = option.name;
        const unitPrice = option.unit_price;
        const maxQuantity = option.max_quantity || null;
        const sku = option.sku || null;
        const specs = itemData.specs || null;

        // Build full item name including option if present (avoid "Name - Name" duplication)
        const fullItemName =
          optionName && optionName !== itemName
            ? `${itemName} - ${optionName}`
            : itemName;

        if (fullItemName && !isNaN(unitPrice)) {
          this.addItem(fullItemName, unitPrice, 1, maxQuantity, sku, specs);
        } else {
          console.error("[cart] Invalid item data:", fullItemName, unitPrice);
        }
      }
    });

    // Note: Escape key handling is automatic with <dialog> element
  }

  // Add item to cart
  addItem(
    itemName,
    unitPrice,
    quantity = 1,
    maxQuantity = null,
    sku = null,
    specs = null,
  ) {
    const cart = getCart();
    const existingItem = cart.find((item) => item.item_name === itemName);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      // Check if max_quantity would be exceeded
      if (maxQuantity && newQuantity > maxQuantity) {
        alert(`The maximum quantity for this item is ${maxQuantity}`);
        existingItem.quantity = maxQuantity;
      } else {
        existingItem.quantity = newQuantity;
      }
      // Update max_quantity if provided (in case it changed)
      if (maxQuantity !== null) {
        existingItem.max_quantity = maxQuantity;
      }
      // Update SKU if provided
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
    this.updateCartDisplay();
    this.updateCartCount();
    this.showAddedFeedback();
  }

  // Update item quantity
  updateQuantity(itemName, quantity) {
    const cart = getCart();
    const item = cart.find((item) => item.item_name === itemName);

    if (item) {
      if (quantity <= 0) {
        removeItem(itemName);
        this.updateCartDisplay();
        this.updateCartCount();
      } else {
        // Check if max_quantity would be exceeded
        if (item.max_quantity && quantity > item.max_quantity) {
          alert(`The maximum quantity for this item is ${item.max_quantity}`);
          item.quantity = item.max_quantity;
        } else {
          item.quantity = quantity;
        }
        saveCart(cart);
        this.updateCartDisplay();
        this.updateCartCount();
      }
    }
  }

  // Calculate cart total
  getCartTotal() {
    const cart = getCart();
    return cart.reduce(
      (total, item) => total + item.unit_price * item.quantity,
      0,
    );
  }

  // Update cart count badge
  updateCartCount() {
    updateCartIcon();
  }

  // Update cart display in overlay
  updateCartDisplay() {
    // Skip if no cart overlay (e.g., in quote/enquiry mode)
    if (!this.cartOverlay) return;

    const cart = getCart();
    const cartItems = this.cartOverlay.querySelector(".cart-items");
    const cartEmpty = this.cartOverlay.querySelector(".cart-empty");
    const cartTotal = this.cartOverlay.querySelector(".cart-total-amount");
    const paypalBtn = this.cartOverlay.querySelector(".cart-checkout-paypal");
    const stripeBtn = this.cartOverlay.querySelector(".cart-checkout-stripe");
    const minimumMessage = this.cartOverlay.querySelector(
      ".cart-minimum-message",
    );

    if (!cartItems) return;

    const total = this.getCartTotal();
    const isBelowMinimum = total <= ShoppingCart.MINIMUM_CHECKOUT_AMOUNT;

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

      // Hide Stripe button and show message if below minimum checkout amount
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

      // Add event listeners using shared utilities
      attachQuantityHandlers(cartItems, (name, qty) =>
        this.updateQuantity(name, qty),
      );
      attachRemoveHandlers(cartItems, ".cart-item-remove", () => {
        this.updateCartDisplay();
        this.updateCartCount();
      });
    }

    // Update total
    if (cartTotal) {
      cartTotal.textContent = formatPrice(this.getCartTotal());
    }
  }

  // Open cart overlay
  openCart() {
    this.cartOverlay.showModal();
  }

  // Close cart overlay
  closeCart() {
    this.cartOverlay.close();
  }

  // Show "added to cart" feedback
  showAddedFeedback() {
    document.querySelectorAll(".cart-icon").forEach((icon) => {
      icon.classList.add("cart-bounce");
      setTimeout(() => icon.classList.remove("cart-bounce"), 600);
    });
  }

  // Get checkout API URL if configured
  getCheckoutApiUrl() {
    return Config.checkout_api_url;
  }

  // Checkout with PayPal
  async checkoutWithPayPal() {
    const cart = getCart();
    if (cart.length === 0) return;

    const checkoutApiUrl = this.getCheckoutApiUrl();
    await this.paypalCheckout(checkoutApiUrl);
  }

  // Helper to POST cart data to an API endpoint
  async postCartToApi(url) {
    const cart = getCart();
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cart }),
    });
  }

  // Helper to POST minimal cart data (sku + quantity only) for validated checkout
  async postSkus(url) {
    const cart = getCart();
    const items = cart.map(({ sku, quantity }) => ({ sku, quantity }));
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });
  }

  // PayPal checkout via backend API
  async paypalCheckout(apiUrl) {
    try {
      const response = await this.postSkus(apiUrl);

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
    } catch (error) {
      console.error("PayPal checkout failed:", error);
      alert("Failed to start checkout. Please try again.");
    }
  }

  // Checkout with Stripe - redirects to dedicated checkout page
  checkoutWithStripe() {
    const cart = getCart();
    if (cart.length === 0) return;

    // Redirect to dedicated Stripe checkout page
    // This page loads Stripe JS and handles the checkout flow
    window.location.href = "/stripe-checkout/";
  }

  // Clear cart (useful after successful checkout)
  clearCart() {
    saveCart([]);
    this.updateCartDisplay();
    this.updateCartCount();
  }
}

// Initialize cart when module loads
const cart = new ShoppingCart();

// Export for use in other modules if needed
export default cart;
