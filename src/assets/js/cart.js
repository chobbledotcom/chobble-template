// Shopping Cart
// Manages cart state in localStorage and provides cart functionality
// Supports both PayPal and Stripe checkout

class ShoppingCart {
  // Minimum checkout amount in pounds (Stripe requires at least 30p)
  static MINIMUM_CHECKOUT_AMOUNT = 0.3;

  constructor() {
    this.storageKey = "shopping_cart";
    this.cartOverlay = null;
    this.cartIcon = null;
    this.stripe = null;
    this.documentListenersAttached = false;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }

    // Re-setup on Turbo navigation (Turbo replaces body content, so we need
    // to re-query DOM elements and re-attach element-specific listeners)
    document.addEventListener("turbo:load", () => this.setup());
  }

  setup() {
    this.cartOverlay = document.getElementById("cart-overlay");
    this.cartIcon = document.getElementById("cart-icon");

    if (!this.cartOverlay || !this.cartIcon) {
      console.error("Cart elements not found");
      return;
    }

    // Initialize Stripe if configured
    this.initStripe();

    // Reset product option selects on page load
    this.resetProductSelects();

    // Set up event listeners
    this.setupEventListeners();

    // Update cart display
    this.updateCartDisplay();
    this.updateCartCount();
  }

  initStripe() {
    const stripeKey = this.cartOverlay.dataset.stripeKey;
    if (stripeKey && typeof Stripe !== "undefined") {
      this.stripe = Stripe(stripeKey);
    }
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
        button.dataset.option = "";
        button.dataset.price = "";
        button.dataset.maxQuantity = "";
        button.textContent = "Add to Cart";
      }
    });
  }

  setupEventListeners() {
    // Element-specific listeners (need to re-attach after Turbo navigation
    // since Turbo replaces the body and these elements are recreated)

    // Cart icon click - open cart
    this.cartIcon.addEventListener("click", (e) => {
      e.preventDefault();
      this.openCart();
    });

    // Close cart button
    const closeBtn = this.cartOverlay.querySelector(".cart-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeCart());
    }

    // Close cart when clicking overlay background
    this.cartOverlay.addEventListener("click", (e) => {
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

        if (button && selectedOption && selectedOption.value) {
          button.disabled = false;
          button.dataset.option = selectedOption.dataset.name;
          button.dataset.price = selectedOption.dataset.price;
          button.dataset.maxQuantity = selectedOption.dataset.maxQuantity;
          button.textContent = `Add to Cart - £${selectedOption.dataset.price}`;
        }
      }
    });

    // Add to cart buttons
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-to-cart")) {
        e.preventDefault();
        const button = e.target;

        // For multi-option products, check if option is selected
        if (button.classList.contains("product-option-button")) {
          const select = button.parentElement.querySelector(
            ".product-options-select",
          );
          if (select && !select.value) {
            alert("Please select an option");
            return;
          }
        }

        const itemName = button.dataset.name;
        const optionName = button.dataset.option || "";
        const unitPrice = parseFloat(button.dataset.price);
        const maxQuantity = button.dataset.maxQuantity
          ? parseInt(button.dataset.maxQuantity)
          : null;

        // Build full item name including option if present
        const fullItemName = optionName
          ? `${itemName} - ${optionName}`
          : itemName;

        console.log("Add to cart clicked:", {
          fullItemName,
          unitPrice,
          maxQuantity,
          button,
        });

        if (fullItemName && !isNaN(unitPrice)) {
          this.addItem(fullItemName, unitPrice, 1, maxQuantity);
        } else {
          console.error("Invalid item data:", { fullItemName, unitPrice });
        }
      }
    });

    // Escape key to close cart
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.cartOverlay.classList.contains("active")) {
        this.closeCart();
      }
    });
  }

  // Get cart items from localStorage
  getCart() {
    try {
      const cart = localStorage.getItem(this.storageKey);
      return cart ? JSON.parse(cart) : [];
    } catch (e) {
      console.error("Error reading cart:", e);
      return [];
    }
  }

  // Save cart to localStorage
  saveCart(cart) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cart));
    } catch (e) {
      console.error("Error saving cart:", e);
    }
  }

  // Add item to cart
  addItem(itemName, unitPrice, quantity = 1, maxQuantity = null) {
    const cart = this.getCart();
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
    } else {
      cart.push({
        item_name: itemName,
        unit_price: unitPrice,
        quantity: quantity,
        max_quantity: maxQuantity,
      });
    }

    this.saveCart(cart);
    this.updateCartDisplay();
    this.updateCartCount();

    // Show feedback
    this.showAddedFeedback();
    console.log("Item added to cart, updated display and count");
  }

  // Remove item from cart
  removeItem(itemName) {
    let cart = this.getCart();
    cart = cart.filter((item) => item.item_name !== itemName);
    this.saveCart(cart);
    this.updateCartDisplay();
    this.updateCartCount();
  }

  // Update item quantity
  updateQuantity(itemName, quantity) {
    const cart = this.getCart();
    const item = cart.find((item) => item.item_name === itemName);

    if (item) {
      if (quantity <= 0) {
        this.removeItem(itemName);
      } else {
        // Check if max_quantity would be exceeded
        if (item.max_quantity && quantity > item.max_quantity) {
          alert(`The maximum quantity for this item is ${item.max_quantity}`);
          item.quantity = item.max_quantity;
        } else {
          item.quantity = quantity;
        }
        this.saveCart(cart);
        this.updateCartDisplay();
        this.updateCartCount();
      }
    }
  }

  // Calculate cart total
  getCartTotal() {
    const cart = this.getCart();
    return cart.reduce(
      (total, item) => total + item.unit_price * item.quantity,
      0,
    );
  }

  // Get total item count
  getItemCount() {
    const cart = this.getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
  }

  // Update cart count badge
  updateCartCount() {
    const count = this.getItemCount();
    const badge = this.cartIcon.querySelector(".cart-count");

    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "block" : "none";
    }

    // Toggle cart icon visibility based on item count
    if (count > 0) {
      this.cartIcon.style.display = "flex";
      console.log("Cart icon shown - items in cart:", count);
    } else {
      this.cartIcon.style.display = "none";
      console.log("Cart icon hidden - no items in cart");
    }
  }

  // Update cart display in overlay
  updateCartDisplay() {
    const cart = this.getCart();
    const cartItems = this.cartOverlay.querySelector(".cart-items");
    const cartEmpty = this.cartOverlay.querySelector(".cart-empty");
    const cartTotal = this.cartOverlay.querySelector(".cart-total-amount");
    const paypalBtn = this.cartOverlay.querySelector(".cart-checkout-paypal");
    const stripeBtn = this.cartOverlay.querySelector(".cart-checkout-stripe");
    const minimumMessage = this.cartOverlay.querySelector(".cart-minimum-message");

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
        <div class="cart-item" data-name="${this.escapeHtml(item.item_name)}">
          <div class="cart-item-info">
            <div class="cart-item-name">${this.escapeHtml(item.item_name)}</div>
            <div class="cart-item-price">${this.formatPrice(item.unit_price)}</div>
          </div>
          <div class="cart-item-controls">
            <div class="cart-item-quantity">
              <button class="qty-btn qty-decrease" data-name="${this.escapeHtml(item.item_name)}">−</button>
              <input type="number" class="qty-input" value="${item.quantity}" min="1"
                     ${item.max_quantity ? `max="${item.max_quantity}"` : ""}
                     data-name="${this.escapeHtml(item.item_name)}">
              <button class="qty-btn qty-increase" data-name="${this.escapeHtml(item.item_name)}">+</button>
            </div>
            <button class="cart-item-remove" data-name="${this.escapeHtml(item.item_name)}">Remove</button>
          </div>
        </div>
      `,
        )
        .join("");

      // Add event listeners for quantity controls
      cartItems.querySelectorAll(".qty-decrease").forEach((btn) => {
        btn.addEventListener("click", () => {
          const itemName = btn.dataset.name;
          const item = cart.find((i) => i.item_name === itemName);
          if (item) {
            this.updateQuantity(itemName, item.quantity - 1);
          }
        });
      });

      cartItems.querySelectorAll(".qty-increase").forEach((btn) => {
        btn.addEventListener("click", () => {
          const itemName = btn.dataset.name;
          const item = cart.find((i) => i.item_name === itemName);
          if (item) {
            this.updateQuantity(itemName, item.quantity + 1);
          }
        });
      });

      cartItems.querySelectorAll(".qty-input").forEach((input) => {
        input.addEventListener("change", () => {
          const itemName = input.dataset.name;
          const quantity = parseInt(input.value);
          if (!isNaN(quantity)) {
            this.updateQuantity(itemName, quantity);
          }
        });
      });

      cartItems.querySelectorAll(".cart-item-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.removeItem(btn.dataset.name);
        });
      });
    }

    // Update total
    if (cartTotal) {
      cartTotal.textContent = this.formatPrice(this.getCartTotal());
    }
  }

  // Open cart overlay
  openCart() {
    this.cartOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  // Close cart overlay
  closeCart() {
    this.cartOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  // Show "added to cart" feedback
  showAddedFeedback() {
    this.cartIcon.classList.add("cart-bounce");
    setTimeout(() => {
      this.cartIcon.classList.remove("cart-bounce");
    }, 600);
  }

  // Get checkout API URL if configured
  getCheckoutApiUrl() {
    return this.cartOverlay.dataset.checkoutApiUrl || null;
  }

  // Checkout with PayPal
  async checkoutWithPayPal() {
    const cart = this.getCart();
    if (cart.length === 0) return;

    const checkoutApiUrl = this.getCheckoutApiUrl();

    // If backend is configured, use PayPal Orders API
    if (checkoutApiUrl) {
      await this.checkoutWithPayPalBackend(checkoutApiUrl);
    } else {
      // Fall back to static URL redirect (no backend needed)
      this.checkoutWithPayPalStatic();
    }
  }

  // PayPal checkout via backend API
  async checkoutWithPayPalBackend(apiUrl) {
    const cart = this.getCart();

    try {
      const response = await fetch(`${apiUrl}/api/paypal/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cart }),
      });

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

  // PayPal checkout via static URL redirect (no backend)
  checkoutWithPayPalStatic() {
    const cart = this.getCart();
    const paypalEmail = this.cartOverlay.dataset.paypalEmail;

    if (!paypalEmail) {
      alert("PayPal is not configured");
      return;
    }

    // Build PayPal checkout URL
    const baseUrl = "https://www.paypal.com/cgi-bin/webscr";
    const params = new URLSearchParams();

    params.append("cmd", "_cart");
    params.append("upload", "1");
    params.append("business", paypalEmail);
    params.append("currency_code", "GBP");

    // Add each cart item
    cart.forEach((item, index) => {
      const itemNum = index + 1;
      params.append(`item_name_${itemNum}`, item.item_name);
      params.append(`amount_${itemNum}`, item.unit_price.toFixed(2));
      params.append(`quantity_${itemNum}`, item.quantity);
    });

    // Add return URL for after payment completion
    const returnUrl = `${window.location.origin}/order-complete/`;
    params.append("return", returnUrl);

    // Redirect to PayPal
    window.location.href = `${baseUrl}?${params.toString()}`;
  }

  // Checkout with Stripe - requires backend
  async checkoutWithStripe() {
    const cart = this.getCart();
    if (cart.length === 0) return;

    const stripeKey = this.cartOverlay.dataset.stripeKey;
    const checkoutApiUrl = this.getCheckoutApiUrl();

    if (!stripeKey) {
      alert("Stripe is not configured");
      return;
    }

    if (!checkoutApiUrl) {
      alert("Stripe checkout requires the checkout backend to be configured");
      return;
    }

    // Initialize Stripe if not already done
    if (!this.stripe && typeof Stripe !== "undefined") {
      this.stripe = Stripe(stripeKey);
    }

    if (!this.stripe) {
      alert("Stripe could not be loaded. Please try again.");
      return;
    }

    try {
      const response = await fetch(`${checkoutApiUrl}/api/stripe/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cart }),
      });

      if (response.ok) {
        const session = await response.json();

        // Prefer direct URL redirect if available
        if (session.url) {
          window.location.href = session.url;
          return;
        }

        // Fall back to Stripe.js redirect
        if (session.id) {
          const result = await this.stripe.redirectToCheckout({
            sessionId: session.id,
          });

          if (result.error) {
            alert(result.error.message);
          }
          return;
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create Stripe session");
      }
    } catch (error) {
      console.error("Stripe checkout failed:", error);
      alert("Failed to start checkout. Please try again.");
    }
  }

  // Helper: Format price
  formatPrice(price) {
    return `£${price.toFixed(2)}`;
  }

  // Helper: Escape HTML
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Clear cart (useful after successful checkout)
  clearCart() {
    this.saveCart([]);
    this.updateCartDisplay();
    this.updateCartCount();
  }
}

// Initialize cart when module loads
const cart = new ShoppingCart();

// Export for use in other modules if needed
export default cart;
