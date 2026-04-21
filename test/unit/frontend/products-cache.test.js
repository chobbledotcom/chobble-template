import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { getCart, saveCart } from "#public/utils/cart-utils.js";

// config.js reads `document` at import time, so every consumer has to stub it —
// no real module exists to restore to. notify.js is stubbed here to capture
// notification calls. Allowlisted in test/unit/code-quality/mock-module-usage.test.js.
const mockShowNotification = mock();
mock.module("#public/utils/config.js", () => ({
  default: { ecommerce_api_host: "test.example.com" },
}));
mock.module("#public/utils/notify.js", () => ({
  showNotification: (...args) => mockShowNotification(...args),
}));

const {
  CACHE_KEY,
  CACHE_TTL_MS,
  getCachedProducts,
  refreshCacheIfNeeded,
  validateBuyItems,
  validateCartWithCache,
} = await import("#public/utils/products-cache.js");

const cartBuyItem = (overrides = {}) => ({
  item_name: "Mini Gizmo",
  unit_price: 0.3,
  quantity: 1,
  sku: "MH6D2J",
  product_mode: "buy",
  ...overrides,
});

const cartHireItem = (overrides = {}) => ({
  item_name: "Hire Item",
  unit_price: 30,
  quantity: 1,
  sku: "HIRE1",
  product_mode: "hire",
  ...overrides,
});

const writeCache = (data, cachedAt = Date.now()) =>
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ data, cached_at: cachedAt }),
  );

const MOCK_PRODUCTS = [
  { sku: "MH6D2J", name: "Mini Gizmo", unit_price: 30, in_stock: true },
  { sku: "WEBDEV", name: "Web Dev", unit_price: 10000, in_stock: true },
  { sku: "GONE", name: "Discontinued", unit_price: 500, in_stock: false },
];

const installFetchMock = (data, ok = true) => {
  const fetchMock = mock(() => Promise.resolve({ ok, json: async () => data }));
  globalThis.fetch = fetchMock;
  return fetchMock;
};

const originalFetch = globalThis.fetch;
const fetchState = { mock: /** @type {ReturnType<typeof mock>} */ (mock()) };

beforeEach(() => {
  localStorage.clear();
  mockShowNotification.mockClear();
  fetchState.mock = installFetchMock(null);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  localStorage.clear();
});

describe("getCachedProducts", () => {
  test("returns null when no cache exists", () => {
    expect(getCachedProducts()).toBeNull();
  });

  test("returns data when cache is fresh", () => {
    writeCache(MOCK_PRODUCTS);
    expect(getCachedProducts()).toEqual(MOCK_PRODUCTS);
  });

  test("returns null when cache is older than CACHE_TTL_MS", () => {
    writeCache(MOCK_PRODUCTS, Date.now() - CACHE_TTL_MS - 1);
    expect(getCachedProducts()).toBeNull();
  });

  test("returns data when cache age is just under CACHE_TTL_MS", () => {
    writeCache(MOCK_PRODUCTS, Date.now() - CACHE_TTL_MS + 1000);
    expect(getCachedProducts()).toEqual(MOCK_PRODUCTS);
  });
});

const saveAndValidate = (cart) => {
  saveCart(cart);
  expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(true);
  expect(getCart()).toHaveLength(0);
};

describe("validateBuyItems", () => {
  test("returns false and leaves cart untouched for non-buy items", () => {
    const cart = [cartHireItem()];
    saveCart(cart);
    expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(false);
    expect(getCart()).toEqual(cart);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  test("removes item with unmatched SKU and notifies user", () => {
    const cart = [cartBuyItem({ item_name: "Unknown", sku: "DOESNT_EXIST" })];
    saveAndValidate(cart);
    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    expect(mockShowNotification.mock.calls[0][0]).toContain("Unknown");
    expect(mockShowNotification.mock.calls[0][0]).toContain("no longer available");
  });

  test("removes out-of-stock item and notifies user", () => {
    const cart = [cartBuyItem({ item_name: "Discontinued", sku: "GONE" })];
    saveAndValidate(cart);
    expect(mockShowNotification.mock.calls[0][0]).toContain("Discontinued");
  });

  test("updates unit_price from API (pence to pounds) and reports change", () => {
    const cart = [cartBuyItem({ unit_price: 0.5 })];
    saveCart(cart);
    expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(true);
    expect(getCart()[0].unit_price).toBe(0.3);
  });

  test("reports no change and leaves cart untouched when prices already match", () => {
    const cart = [cartBuyItem({ unit_price: 0.3, quantity: 2 })];
    saveCart(cart);
    expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(false);
    expect(getCart()).toEqual(cart);
  });

  test("preserves quantity when updating prices", () => {
    const cart = [cartBuyItem({ unit_price: 0.5, quantity: 7 })];
    saveCart(cart);
    validateBuyItems(cart, MOCK_PRODUCTS);
    expect(getCart()[0].quantity).toBe(7);
  });

  test("keeps non-buy items when removing invalid buy items", () => {
    const cart = [
      cartHireItem(),
      cartBuyItem({ item_name: "Valid", sku: "WEBDEV", unit_price: 100 }),
      cartBuyItem({ item_name: "Invalid", sku: "NOPE" }),
    ];
    saveCart(cart);
    expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(true);

    const updated = getCart();
    expect(updated.map((item) => item.item_name)).toEqual([
      "Hire Item",
      "Valid",
    ]);
    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    expect(mockShowNotification.mock.calls[0][0]).toContain("Invalid");
  });

  test("notifies once per removed item", () => {
    const cart = [
      cartBuyItem({ item_name: "Gone A", sku: "GONE" }),
      cartBuyItem({ item_name: "Gone B", sku: "UNKNOWN" }),
    ];
    saveCart(cart);
    validateBuyItems(cart, MOCK_PRODUCTS);

    expect(mockShowNotification).toHaveBeenCalledTimes(2);
    expect(mockShowNotification.mock.calls[0][0]).toContain("Gone A");
    expect(mockShowNotification.mock.calls[1][0]).toContain("Gone B");
  });

  test("returns false when cart and products are both empty", () => {
    saveCart([]);
    expect(validateBuyItems([], [])).toBe(false);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });
});

describe("validateCartWithCache", () => {
  test("does not fetch when cart has no buy-mode items", async () => {
    saveCart([cartHireItem()]);
    await validateCartWithCache();
    expect(fetchState.mock).not.toHaveBeenCalled();
  });

  test("fetches and caches products when cache is empty", async () => {
    fetchState.mock = installFetchMock(MOCK_PRODUCTS);
    saveCart([cartBuyItem({ unit_price: 0.5 })]);

    await validateCartWithCache();

    expect(fetchState.mock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)).data).toEqual(
      MOCK_PRODUCTS,
    );
    expect(getCart()[0].unit_price).toBe(0.3);
  });

  test("uses cached products when cache is fresh, skipping fetch", async () => {
    writeCache(MOCK_PRODUCTS);
    saveCart([cartBuyItem()]);

    await validateCartWithCache();

    expect(fetchState.mock).not.toHaveBeenCalled();
  });

  test("notifies when API is unreachable", async () => {
    fetchState.mock = installFetchMock(null, false);
    saveCart([cartBuyItem()]);

    await validateCartWithCache();

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    expect(mockShowNotification.mock.calls[0][0]).toContain(
      "Unable to reach the store",
    );
  });

  test("does not write cache when fetch fails", async () => {
    fetchState.mock = installFetchMock(null, false);
    saveCart([cartBuyItem()]);

    await validateCartWithCache();

    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  test("removes unavailable items after a successful fetch", async () => {
    fetchState.mock = installFetchMock(MOCK_PRODUCTS);
    saveCart([cartBuyItem({ item_name: "Unknown", sku: "NOPE" })]);

    await validateCartWithCache();

    expect(getCart()).toHaveLength(0);
    expect(mockShowNotification.mock.calls[0][0]).toContain("Unknown");
  });

  test("does not refresh cache or modify cart when products were already cached", async () => {
    writeCache(MOCK_PRODUCTS);
    const cart = [cartBuyItem({ unit_price: 0.3, quantity: 4 })];
    saveCart(cart);

    await validateCartWithCache();

    expect(getCart()).toEqual(cart);
  });
});

describe("refreshCacheIfNeeded", () => {
  test("does nothing for an empty cart", () => {
    saveCart([]);
    refreshCacheIfNeeded();
    expect(fetchState.mock).not.toHaveBeenCalled();
  });

  test("does nothing for a cart with only hire items", () => {
    saveCart([cartHireItem()]);
    refreshCacheIfNeeded();
    expect(fetchState.mock).not.toHaveBeenCalled();
  });

  test("triggers a fetch when the cart has at least one buy item", () => {
    fetchState.mock = installFetchMock(MOCK_PRODUCTS);
    saveCart([cartHireItem(), cartBuyItem()]);

    refreshCacheIfNeeded();

    expect(fetchState.mock).toHaveBeenCalledTimes(1);
  });
});
