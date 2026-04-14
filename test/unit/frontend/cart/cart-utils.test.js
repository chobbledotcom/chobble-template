// Unit tests for cart-utils.js
// All tests call the real exported functions and verify observable behavior.

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

const mockShowNotification = mock();
mock.module("#public/utils/notify.js", () => ({
  showNotification: (...args) => mockShowNotification(...args),
}));

import {
  attachQuantityHandlers,
  attachRemoveHandlers,
  clampQuantity,
  clearCart,
  formatPrice,
  getCart,
  getCheckoutItems,
  saveCart,
  updateCartIcon,
  updateItemQuantity,
} from "#public/utils/cart-utils.js";
import { CART_STORAGE_KEY } from "#test/test-utils.js";

// formatPrice reads the currency from <script id="site-config">.
// Install it once for this file; clearing happens on localStorage/body, not head.
beforeAll(() => {
  const existing = document.getElementById("site-config");
  if (existing) existing.remove();
  const script = document.createElement("script");
  script.id = "site-config";
  script.type = "application/json";
  script.textContent = JSON.stringify({ currency: "GBP" });
  document.head.appendChild(script);
});

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  mockShowNotification.mockReset();
});

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("getCart / saveCart", () => {
  test("getCart returns empty array when no cart stored", () => {
    expect(getCart()).toEqual([]);
  });

  test("saveCart then getCart returns the same items", () => {
    const items = [
      { item_name: "Widget", unit_price: 15, quantity: 2, sku: "W1" },
    ];
    saveCart(items);
    expect(getCart()).toEqual(items);
  });

  test("getCart throws when localStorage contains invalid JSON", () => {
    localStorage.setItem(CART_STORAGE_KEY, "not valid json {{{");
    expect(() => getCart()).toThrow();
  });
});

describe("formatPrice", () => {
  test("formats whole pounds without decimals", () => {
    expect(formatPrice(10)).toBe("£10");
    expect(formatPrice(100)).toBe("£100");
  });

  test("formats fractional amounts with two decimals", () => {
    expect(formatPrice(5.5)).toBe("£5.50");
    expect(formatPrice(0.3)).toBe("£0.30");
    expect(formatPrice(99.99)).toBe("£99.99");
  });
});

describe("getCheckoutItems", () => {
  test("returns only sku and quantity, omitting prices and names", () => {
    saveCart([
      {
        item_name: "Product A",
        unit_price: 99.99,
        quantity: 2,
        sku: "A",
        max_quantity: 10,
      },
      { item_name: "Product B", unit_price: 49.99, quantity: 1, sku: "B" },
    ]);
    const items = getCheckoutItems();
    expect(items).toEqual([
      { sku: "A", quantity: 2 },
      { sku: "B", quantity: 1 },
    ]);
  });

  test("returns empty array when cart is empty", () => {
    expect(getCheckoutItems()).toEqual([]);
  });
});

describe("clampQuantity", () => {
  test("returns requested quantity when under max", () => {
    expect(clampQuantity(3, 5)).toBe(3);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  test("returns requested quantity when equal to max (no notification)", () => {
    expect(clampQuantity(5, 5)).toBe(5);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  test("clamps and notifies when quantity exceeds max", () => {
    expect(clampQuantity(10, 5)).toBe(5);
    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    expect(mockShowNotification.mock.calls[0][0]).toContain("5");
  });

  test("returns requested quantity unchanged when max is falsy", () => {
    expect(clampQuantity(9999, null)).toBe(9999);
    expect(clampQuantity(9999, 0)).toBe(9999);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });
});

describe("updateItemQuantity", () => {
  test("changes quantity for existing item", () => {
    saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
    const result = updateItemQuantity("Widget", 5);
    expect(result).toBe(true);
    expect(getCart()[0].quantity).toBe(5);
  });

  test("removes item when quantity is 0", () => {
    saveCart([
      { item_name: "Keep", unit_price: 10, quantity: 1 },
      { item_name: "Drop", unit_price: 5, quantity: 3 },
    ]);
    updateItemQuantity("Drop", 0);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].item_name).toBe("Keep");
  });

  test("removes item when quantity is negative", () => {
    saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
    updateItemQuantity("Widget", -1);
    expect(getCart()).toEqual([]);
  });

  test("caps at max_quantity and notifies user", () => {
    saveCart([
      { item_name: "Limited", unit_price: 10, quantity: 2, max_quantity: 5 },
    ]);
    updateItemQuantity("Limited", 10);
    expect(getCart()[0].quantity).toBe(5);
    expect(mockShowNotification).toHaveBeenCalledTimes(1);
  });

  test("returns false and leaves cart unchanged for unknown item", () => {
    saveCart([{ item_name: "Widget", unit_price: 10, quantity: 2 }]);
    const result = updateItemQuantity("NotInCart", 5);
    expect(result).toBe(false);
    expect(getCart()[0].quantity).toBe(2);
  });
});

// Renders a cart icon and returns its elements for assertions.
const setupCartIcon = ({ alwaysShow = false } = {}) => {
  document.body.innerHTML = `
    <div class="cart-icon ${alwaysShow ? "always-show" : ""}" style="display: none;">
      <span class="cart-count" style="display: none;">0</span>
    </div>
  `;
  const icon = document.querySelector(".cart-icon");
  const badge = icon.querySelector(".cart-count");
  return { icon, badge };
};

describe("updateCartIcon", () => {
  test("shows icon and sums quantities across items when cart has items", () => {
    const { icon, badge } = setupCartIcon();
    saveCart([
      { item_name: "A", unit_price: 10, quantity: 2 },
      { item_name: "B", unit_price: 5, quantity: 3 },
    ]);
    updateCartIcon();
    expect(icon.style.display).toBe("flex");
    expect(badge.textContent).toBe("5");
    expect(badge.style.display).toBe("block");
  });

  test("hides icon and badge when cart is empty", () => {
    const { icon, badge } = setupCartIcon();
    icon.style.display = "flex";
    badge.style.display = "block";
    saveCart([]);
    updateCartIcon();
    expect(icon.style.display).toBe("none");
    expect(badge.style.display).toBe("none");
  });

  test("keeps 'always-show' icons visible even when cart is empty", () => {
    const { icon } = setupCartIcon({ alwaysShow: true });
    saveCart([]);
    updateCartIcon();
    expect(icon.style.display).toBe("flex");
  });
});

describe("clearCart", () => {
  test("removes cart data and refreshes icons to empty state", () => {
    const { icon } = setupCartIcon();
    icon.style.display = "flex";
    saveCart([{ item_name: "X", unit_price: 1, quantity: 1 }]);
    clearCart();
    expect(getCart()).toEqual([]);
    expect(icon.style.display).toBe("none");
  });

  test("with hideIcons: true hides icons without running the icon update", () => {
    const { icon, badge } = setupCartIcon({ alwaysShow: true });
    icon.style.display = "flex";
    badge.textContent = "3";
    saveCart([{ item_name: "X", unit_price: 1, quantity: 3 }]);
    clearCart({ hideIcons: true });
    expect(getCart()).toEqual([]);
    // always-show would normally keep icon visible - hideIcons forces hide.
    expect(icon.style.display).toBe("none");
  });
});

// Renders the standard quantity controls, attaches handlers, and returns refs.
const setupQuantityHandlers = ({
  name = "Widget",
  cartQty = 3,
  inputValue = cartQty,
} = {}) => {
  saveCart(
    cartQty === null
      ? []
      : [{ item_name: name, unit_price: 10, quantity: cartQty }],
  );
  document.body.innerHTML = `
    <button class="quantity-decrease" data-name="${name}">−</button>
    <input type="number" class="quantity-input" data-name="${name}" value="${inputValue}">
    <button class="quantity-increase" data-name="${name}">+</button>
  `;
  const onUpdate = mock();
  attachQuantityHandlers(onUpdate);
  return {
    decrease: document.querySelector(".quantity-decrease"),
    increase: document.querySelector(".quantity-increase"),
    input: document.querySelector(".quantity-input"),
    onUpdate,
  };
};

describe("attachQuantityHandlers", () => {
  test("decrease button calls onUpdate with quantity - 1", () => {
    const { decrease, onUpdate } = setupQuantityHandlers();
    decrease.click();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith("Widget", 2);
  });

  test("increase button calls onUpdate with quantity + 1", () => {
    const { increase, onUpdate } = setupQuantityHandlers();
    increase.click();
    expect(onUpdate).toHaveBeenCalledWith("Widget", 4);
  });

  test("input change dispatches the entered quantity", () => {
    const { input, onUpdate } = setupQuantityHandlers({ inputValue: 7 });
    input.dispatchEvent(new Event("change"));
    expect(onUpdate).toHaveBeenCalledWith("Widget", 7);
  });

  test("input change is ignored when the value is not a number", () => {
    const { input, onUpdate } = setupQuantityHandlers({ inputValue: "" });
    input.dispatchEvent(new Event("change"));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  test("decrease button for item not in cart does nothing", () => {
    const { decrease, onUpdate } = setupQuantityHandlers({ cartQty: null });
    decrease.click();
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe("attachRemoveHandlers", () => {
  test("click on remove button removes item from cart and calls onRemove", () => {
    saveCart([
      { item_name: "Keep", unit_price: 10, quantity: 1 },
      { item_name: "Drop", unit_price: 5, quantity: 2 },
    ]);
    document.body.innerHTML = `
      <button data-action="remove" data-name="Drop">Remove</button>
    `;
    const onRemove = mock();
    attachRemoveHandlers(onRemove);
    document.querySelector('[data-action="remove"]').click();
    expect(onRemove).toHaveBeenCalledTimes(1);
    const cart = getCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].item_name).toBe("Keep");
  });
});
