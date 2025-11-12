// PayPal Shopping Cart
// Manages cart state in localStorage and provides cart functionality

class PayPalCart {
  constructor() {
    this.storageKey = 'paypal_cart';
    this.cartOverlay = null;
    this.cartIcon = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.cartOverlay = document.getElementById('cart-overlay');
    this.cartIcon = document.getElementById('cart-icon');

    if (!this.cartOverlay || !this.cartIcon) {
      console.error('Cart elements not found');
      return;
    }

    // Set up event listeners
    this.setupEventListeners();

    // Update cart display
    this.updateCartDisplay();
    this.updateCartCount();
  }

  setupEventListeners() {
    // Cart icon click - open cart
    this.cartIcon.addEventListener('click', (e) => {
      e.preventDefault();
      this.openCart();
    });

    // Close cart button
    const closeBtn = this.cartOverlay.querySelector('.cart-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeCart());
    }

    // Close cart when clicking overlay background
    this.cartOverlay.addEventListener('click', (e) => {
      if (e.target === this.cartOverlay) {
        this.closeCart();
      }
    });

    // Checkout button
    const checkoutBtn = this.cartOverlay.querySelector('.cart-checkout');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.checkout());
    }

    // Add to cart buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-to-cart')) {
        e.preventDefault();
        const button = e.target;
        const itemName = button.dataset.name;
        const unitPrice = parseFloat(button.dataset.price);

        if (itemName && !isNaN(unitPrice)) {
          this.addItem(itemName, unitPrice);
        }
      }
    });

    // Escape key to close cart
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.cartOverlay.classList.contains('active')) {
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
      console.error('Error reading cart:', e);
      return [];
    }
  }

  // Save cart to localStorage
  saveCart(cart) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }

  // Add item to cart
  addItem(itemName, unitPrice, quantity = 1) {
    const cart = this.getCart();
    const existingItem = cart.find(item => item.item_name === itemName);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        item_name: itemName,
        unit_price: unitPrice,
        quantity: quantity
      });
    }

    this.saveCart(cart);
    this.updateCartDisplay();
    this.updateCartCount();

    // Show feedback
    this.showAddedFeedback();
  }

  // Remove item from cart
  removeItem(itemName) {
    let cart = this.getCart();
    cart = cart.filter(item => item.item_name !== itemName);
    this.saveCart(cart);
    this.updateCartDisplay();
    this.updateCartCount();
  }

  // Update item quantity
  updateQuantity(itemName, quantity) {
    const cart = this.getCart();
    const item = cart.find(item => item.item_name === itemName);

    if (item) {
      if (quantity <= 0) {
        this.removeItem(itemName);
      } else {
        item.quantity = quantity;
        this.saveCart(cart);
        this.updateCartDisplay();
        this.updateCartCount();
      }
    }
  }

  // Calculate cart total
  getCartTotal() {
    const cart = this.getCart();
    return cart.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
  }

  // Get total item count
  getItemCount() {
    const cart = this.getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
  }

  // Update cart count badge
  updateCartCount() {
    const count = this.getItemCount();
    const badge = this.cartIcon.querySelector('.cart-count');

    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  }

  // Update cart display in overlay
  updateCartDisplay() {
    const cart = this.getCart();
    const cartItems = this.cartOverlay.querySelector('.cart-items');
    const cartEmpty = this.cartOverlay.querySelector('.cart-empty');
    const cartTotal = this.cartOverlay.querySelector('.cart-total-amount');
    const checkoutBtn = this.cartOverlay.querySelector('.cart-checkout');

    if (!cartItems) return;

    if (cart.length === 0) {
      cartItems.innerHTML = '';
      if (cartEmpty) cartEmpty.style.display = 'block';
      if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
      if (cartEmpty) cartEmpty.style.display = 'none';
      if (checkoutBtn) checkoutBtn.disabled = false;

      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" data-name="${this.escapeHtml(item.item_name)}">
          <div class="cart-item-info">
            <div class="cart-item-name">${this.escapeHtml(item.item_name)}</div>
            <div class="cart-item-price">${this.formatPrice(item.unit_price)}</div>
          </div>
          <div class="cart-item-controls">
            <div class="cart-item-quantity">
              <button class="qty-btn qty-decrease" data-name="${this.escapeHtml(item.item_name)}">−</button>
              <input type="number" class="qty-input" value="${item.quantity}" min="1"
                     data-name="${this.escapeHtml(item.item_name)}">
              <button class="qty-btn qty-increase" data-name="${this.escapeHtml(item.item_name)}">+</button>
            </div>
            <button class="cart-item-remove" data-name="${this.escapeHtml(item.item_name)}">Remove</button>
          </div>
        </div>
      `).join('');

      // Add event listeners for quantity controls
      cartItems.querySelectorAll('.qty-decrease').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemName = btn.dataset.name;
          const item = cart.find(i => i.item_name === itemName);
          if (item) {
            this.updateQuantity(itemName, item.quantity - 1);
          }
        });
      });

      cartItems.querySelectorAll('.qty-increase').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemName = btn.dataset.name;
          const item = cart.find(i => i.item_name === itemName);
          if (item) {
            this.updateQuantity(itemName, item.quantity + 1);
          }
        });
      });

      cartItems.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', () => {
          const itemName = input.dataset.name;
          const quantity = parseInt(input.value);
          if (!isNaN(quantity)) {
            this.updateQuantity(itemName, quantity);
          }
        });
      });

      cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
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
    this.cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Close cart overlay
  closeCart() {
    this.cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Show "added to cart" feedback
  showAddedFeedback() {
    this.cartIcon.classList.add('cart-bounce');
    setTimeout(() => {
      this.cartIcon.classList.remove('cart-bounce');
    }, 600);
  }

  // Checkout - redirect to PayPal
  checkout() {
    const cart = this.getCart();
    if (cart.length === 0) return;

    const paypalEmail = this.cartOverlay.dataset.paypalEmail;
    if (!paypalEmail) {
      alert('PayPal email not configured');
      return;
    }

    // Build PayPal checkout URL
    const baseUrl = 'https://www.paypal.com/cgi-bin/webscr';
    const params = new URLSearchParams();

    params.append('cmd', '_cart');
    params.append('upload', '1');
    params.append('business', paypalEmail);
    params.append('currency_code', 'GBP'); // You can make this configurable

    // Add each cart item
    cart.forEach((item, index) => {
      const itemNum = index + 1;
      params.append(`item_name_${itemNum}`, item.item_name);
      params.append(`amount_${itemNum}`, item.unit_price.toFixed(2));
      params.append(`quantity_${itemNum}`, item.quantity);
    });

    // Redirect to PayPal
    window.location.href = `${baseUrl}?${params.toString()}`;
  }

  // Helper: Format price
  formatPrice(price) {
    return `£${price.toFixed(2)}`;
  }

  // Helper: Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize cart when module loads
const cart = new PayPalCart();

// Export for use in other modules if needed
export default cart;
