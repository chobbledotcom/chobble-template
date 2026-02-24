import { describe, expect, mock, test } from "bun:test";
import { getCart, saveCart } from "#public/utils/cart-utils.js";

// Mock dependencies at module level:
// - config.js: prevents DOM site-config conflicts with checkout.test.js
// - notify.js: captures notification calls for assertion
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

const setFetchMock = (data, ok = true) => {
  const fetchMock = mock(() =>
    Promise.resolve({
      ok,
      json: async () => data,
    }),
  );
  globalThis.fetch = fetchMock;
  return fetchMock;
};

const withCleanStorage = async (fn) => {
  const origFetch = globalThis.fetch;
  localStorage.clear();
  mockShowNotification.mockReset();
  const defaultFetchMock = setFetchMock(null);
  try {
    return await fn(defaultFetchMock);
  } finally {
    globalThis.fetch = origFetch;
    localStorage.clear();
  }
};

const expectSingleRemovalNotification = (expectedName) => {
  expect(getCart()).toHaveLength(0);
  expect(mockShowNotification).toHaveBeenCalledTimes(1);
  expect(mockShowNotification.mock.calls[0][0]).toContain(expectedName);
};

const MOCK_PRODUCTS = [
  { sku: "MH6D2J", name: "Mini Gizmo", unit_price: 30, in_stock: true },
  { sku: "WEBDEV", name: "Web Dev", unit_price: 10000, in_stock: true },
  { sku: "GONE", name: "Discontinued", unit_price: 500, in_stock: false },
];

describe("products-cache", () => {
  // ----------------------------------------
  // Cache Reading Tests
  // ----------------------------------------
  test("getCachedProducts returns null when no cache exists", () => {
    withCleanStorage(() => {
      expect(getCachedProducts()).toBeNull();
    });
  });

  test("getCachedProducts returns data when cache is fresh", () => {
    withCleanStorage(() => {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: MOCK_PRODUCTS, cached_at: Date.now() }),
      );
      expect(getCachedProducts()).toEqual(MOCK_PRODUCTS);
    });
  });

  test("getCachedProducts returns null when cache is expired", () => {
    withCleanStorage(() => {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: MOCK_PRODUCTS,
          cached_at: Date.now() - CACHE_TTL_MS - 1000,
        }),
      );
      expect(getCachedProducts()).toBeNull();
    });
  });

  // ----------------------------------------
  // validateBuyItems Tests
  // ----------------------------------------
  test("validateBuyItems keeps non-buy items unchanged", () => {
    withCleanStorage(() => {
      const cart = [
        {
          item_name: "Hire Item",
          unit_price: 30,
          quantity: 1,
          sku: "HIRE1",
          product_mode: "hire",
        },
      ];
      saveCart(cart);
      expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(false);
      expect(getCart()).toEqual(cart);
    });
  });

  test("validateBuyItems removes unavailable items (unmatched SKU and out-of-stock)", () => {
    const cases = [
      { item_name: "Unknown Product", unit_price: 10, sku: "DOESNT_EXIST" },
      { item_name: "Discontinued", unit_price: 5, sku: "GONE" },
    ];

    for (const { item_name, unit_price, sku } of cases) {
      withCleanStorage(() => {
        saveCart([
          { item_name, unit_price, quantity: 1, sku, product_mode: "buy" },
        ]);
        expect(validateBuyItems(getCart(), MOCK_PRODUCTS)).toBe(true);
        expectSingleRemovalNotification(item_name);
        expect(mockShowNotification.mock.calls[0][0]).toContain(
          "no longer available",
        );
      });
    }
  });

  test("validateBuyItems updates unit_price from API (pence to pounds)", () => {
    withCleanStorage(() => {
      const cart = [
        {
          item_name: "Mini Gizmo",
          unit_price: 0.5,
          quantity: 1,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ];
      saveCart(cart);
      // Price changed from 0.5 to 0.30 (30 pence / 100)
      expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(true);
      expect(getCart()[0].unit_price).toBe(0.3);
    });
  });

  test("validateBuyItems does not modify cart when prices match", () => {
    withCleanStorage(() => {
      const cart = [
        {
          item_name: "Mini Gizmo",
          unit_price: 0.3,
          quantity: 2,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ];
      saveCart(cart);
      expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(false);
    });
  });

  test("validateBuyItems handles mixed buy and non-buy items", () => {
    withCleanStorage(() => {
      const cart = [
        {
          item_name: "Hire Item",
          unit_price: 30,
          quantity: 1,
          sku: "HIRE1",
          product_mode: "hire",
        },
        {
          item_name: "Valid Buy",
          unit_price: 100,
          quantity: 1,
          sku: "WEBDEV",
          product_mode: "buy",
        },
        {
          item_name: "Invalid Buy",
          unit_price: 10,
          quantity: 1,
          sku: "NOPE",
          product_mode: "buy",
        },
      ];
      saveCart(cart);

      expect(validateBuyItems(cart, MOCK_PRODUCTS)).toBe(true);

      const updatedCart = getCart();
      expect(updatedCart).toHaveLength(2);
      expect(updatedCart[0].item_name).toBe("Hire Item");
      expect(updatedCart[1].item_name).toBe("Valid Buy");
      expect(updatedCart[1].unit_price).toBe(100);

      expect(mockShowNotification).toHaveBeenCalledTimes(1);
      expect(mockShowNotification.mock.calls[0][0]).toContain("Invalid Buy");
    });
  });

  test("validateBuyItems notifies for each removed item individually", () => {
    withCleanStorage(() => {
      const cart = [
        {
          item_name: "Gone Item A",
          unit_price: 5,
          quantity: 1,
          sku: "GONE",
          product_mode: "buy",
        },
        {
          item_name: "Gone Item B",
          unit_price: 10,
          quantity: 1,
          sku: "UNKNOWN",
          product_mode: "buy",
        },
      ];
      saveCart(cart);

      validateBuyItems(cart, MOCK_PRODUCTS);

      expect(mockShowNotification).toHaveBeenCalledTimes(2);
      expect(mockShowNotification.mock.calls[0][0]).toContain("Gone Item A");
      expect(mockShowNotification.mock.calls[1][0]).toContain("Gone Item B");
    });
  });

  // ----------------------------------------
  // Cache Constants Tests
  // ----------------------------------------
  test("CACHE_TTL_MS is 1 hour", () => {
    expect(CACHE_TTL_MS).toBe(60 * 60 * 1000);
  });

  test("CACHE_KEY is products_cache", () => {
    expect(CACHE_KEY).toBe("products_cache");
  });

  // ----------------------------------------
  // validateCartWithCache Tests
  // ----------------------------------------
  test("validateCartWithCache skips fetch if no buy-mode items", async () => {
    await withCleanStorage(async (fetchMock) => {
      saveCart([
        {
          item_name: "Hire",
          unit_price: 10,
          quantity: 1,
          product_mode: "hire",
        },
      ]);
      await validateCartWithCache();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  test("validateCartWithCache fetches products and validates cart", async () => {
    await withCleanStorage(async () => {
      const fetchMock = setFetchMock(MOCK_PRODUCTS);
      saveCart([
        {
          item_name: "Mini Gizmo",
          unit_price: 0.5,
          quantity: 1,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ]);
      await validateCartWithCache();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getCart()[0].unit_price).toBe(0.3);
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
      expect(cache.data).toEqual(MOCK_PRODUCTS);
    });
  });

  test("validateCartWithCache uses cached products when fresh", async () => {
    await withCleanStorage(async (fetchMock) => {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: MOCK_PRODUCTS, cached_at: Date.now() }),
      );
      saveCart([
        {
          item_name: "Mini Gizmo",
          unit_price: 0.3,
          quantity: 1,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ]);
      await validateCartWithCache();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  test("validateCartWithCache notifies when API is unreachable", async () => {
    await withCleanStorage(async () => {
      setFetchMock(null, false);
      saveCart([
        {
          item_name: "Gizmo",
          unit_price: 0.3,
          quantity: 1,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ]);
      await validateCartWithCache();
      expect(mockShowNotification).toHaveBeenCalledTimes(1);
      expect(mockShowNotification.mock.calls[0][0]).toContain(
        "Unable to reach the store",
      );
    });
  });

  test("validateCartWithCache removes unavailable items after fetch", async () => {
    await withCleanStorage(async () => {
      setFetchMock(MOCK_PRODUCTS);
      saveCart([
        {
          item_name: "Unknown",
          unit_price: 10,
          quantity: 1,
          sku: "NOPE",
          product_mode: "buy",
        },
      ]);
      await validateCartWithCache();
      expectSingleRemovalNotification("Unknown");
    });
  });

  // ----------------------------------------
  // refreshCacheIfNeeded Tests
  // ----------------------------------------
  test("refreshCacheIfNeeded does nothing with empty cart", () => {
    withCleanStorage((fetchMock) => {
      saveCart([]);
      refreshCacheIfNeeded();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  test("refreshCacheIfNeeded does nothing with only hire items", () => {
    withCleanStorage((fetchMock) => {
      saveCart([
        {
          item_name: "Hire",
          unit_price: 10,
          quantity: 1,
          product_mode: "hire",
        },
      ]);
      refreshCacheIfNeeded();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  test("refreshCacheIfNeeded triggers fetch for buy items", () => {
    withCleanStorage(() => {
      const fetchMock = setFetchMock(MOCK_PRODUCTS);
      saveCart([
        {
          item_name: "Gizmo",
          unit_price: 0.3,
          quantity: 1,
          sku: "MH6D2J",
          product_mode: "buy",
        },
      ]);
      refreshCacheIfNeeded();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
