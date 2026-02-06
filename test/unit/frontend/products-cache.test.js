import { describe, expect, mock, test } from "bun:test";
import {
  getCart,
  safeGetStorageJson,
  saveCart,
} from "#public/utils/cart-utils.js";

// Ensure site-config is available for Config module (reads DOM at import time)
// Must be set up before importing products-cache.js which imports Config
const siteConfig = document.createElement("script");
siteConfig.id = "site-config";
siteConfig.type = "application/json";
siteConfig.textContent = JSON.stringify({
  currency: "GBP",
  ecommerce_api_host: "test.example.com",
});
document.head.appendChild(siteConfig);

// Dynamic import after DOM setup - Config reads site-config at module load
const {
  CACHE_KEY,
  CACHE_TTL_MS,
  getCachedProducts,
  refreshCacheIfNeeded,
  validateBuyItems,
  validateCartWithCache,
} = await import("#public/utils/products-cache.js");

const withCleanStorage = async (fn) => {
  globalThis.localStorage.clear();
  try {
    return await fn();
  } finally {
    globalThis.localStorage.clear();
  }
};

const withMockedAlert = async (fn) => {
  const alertMock = mock();
  const origAlert = global.alert;
  global.alert = alertMock;
  try {
    return await fn(alertMock);
  } finally {
    global.alert = origAlert;
  }
};

const withMockedFetch = async (fetchImpl, fn) => {
  const origFetch = globalThis.fetch;
  const fetchMock = mock(fetchImpl);
  globalThis.fetch = fetchMock;
  try {
    return await fn(fetchMock);
  } finally {
    globalThis.fetch = origFetch;
  }
};

const productsOkFetch = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(MOCK_PRODUCTS),
  });

const expectSingleRemovalAlert = (alertMock, expectedName) => {
  expect(getCart()).toHaveLength(0);
  expect(alertMock).toHaveBeenCalledTimes(1);
  expect(alertMock.mock.calls[0][0]).toContain(expectedName);
};

const MOCK_PRODUCTS = [
  {
    sku: "MH6D2J",
    name: "Mini Gizmo",
    description: "Smaller than the big one",
    unit_price: 30,
    price_formatted: "0.30",
    currency: "GBP",
    stock: 3,
    in_stock: true,
  },
  {
    sku: "WEBDEV",
    name: "Web Dev",
    description: "",
    unit_price: 10000,
    price_formatted: "100.00",
    currency: "GBP",
    in_stock: true,
  },
  {
    sku: "GONE",
    name: "Discontinued",
    description: "",
    unit_price: 500,
    price_formatted: "5.00",
    currency: "GBP",
    in_stock: false,
  },
];

describe("products-cache", () => {
  // ----------------------------------------
  // safeGetStorageJson Tests
  // ----------------------------------------
  test("safeGetStorageJson returns null for missing key", () => {
    withCleanStorage(() => {
      const result = safeGetStorageJson("nonexistent");
      expect(result).toBeNull();
    });
  });

  test("safeGetStorageJson parses valid JSON", () => {
    withCleanStorage(() => {
      localStorage.setItem("test_key", JSON.stringify({ foo: "bar" }));
      const result = safeGetStorageJson("test_key");
      expect(result).toEqual({ foo: "bar" });
    });
  });

  test("safeGetStorageJson returns null for corrupt JSON", () => {
    withCleanStorage(() => {
      localStorage.setItem("test_key", "not valid json {{{");
      const errorMock = mock();
      const originalError = console.error;
      console.error = errorMock;
      try {
        const result = safeGetStorageJson("test_key");
        expect(result).toBeNull();
        expect(errorMock).toHaveBeenCalledTimes(1);
        expect(errorMock.mock.calls[0][0].includes("Failed to parse")).toBe(
          true,
        );
      } finally {
        console.error = originalError;
      }
    });
  });

  // ----------------------------------------
  // Cache Reading Tests
  // ----------------------------------------
  test("getCachedProducts returns null when no cache exists", () => {
    withCleanStorage(() => {
      const result = getCachedProducts();
      expect(result).toBeNull();
    });
  });

  test("getCachedProducts returns data when cache is fresh", () => {
    withCleanStorage(() => {
      const cache = {
        data: MOCK_PRODUCTS,
        cached_at: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

      const result = getCachedProducts();
      expect(result).toEqual(MOCK_PRODUCTS);
    });
  });

  test("getCachedProducts returns null when cache is expired", () => {
    withCleanStorage(() => {
      const cache = {
        data: MOCK_PRODUCTS,
        cached_at: Date.now() - CACHE_TTL_MS - 1000,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

      const result = getCachedProducts();
      expect(result).toBeNull();
    });
  });

  test("getCachedProducts returns null for corrupt cache data", () => {
    withCleanStorage(() => {
      localStorage.setItem(CACHE_KEY, "corrupt{{{");
      const originalError = console.error;
      console.error = () => {
        // suppress expected error logging
      };
      try {
        const result = getCachedProducts();
        expect(result).toBeNull();
      } finally {
        console.error = originalError;
      }
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

      const result = validateBuyItems(cart, MOCK_PRODUCTS);
      expect(result).toBe(false);
      expect(getCart()).toEqual(cart);
    });
  });

  test("validateBuyItems removes unavailable items (unmatched SKU and out-of-stock)", () => {
    const cases = [
      { item_name: "Unknown Product", unit_price: 10, sku: "DOESNT_EXIST" },
      { item_name: "Discontinued", unit_price: 5, sku: "GONE" },
    ];

    for (const { item_name, unit_price, sku } of cases) {
      withCleanStorage(() =>
        withMockedAlert((alertMock) => {
          saveCart([
            { item_name, unit_price, quantity: 1, sku, product_mode: "buy" },
          ]);

          expect(validateBuyItems(getCart(), MOCK_PRODUCTS)).toBe(true);
          expectSingleRemovalAlert(alertMock, item_name);
          expect(alertMock.mock.calls[0][0]).toContain("no longer available");
        }),
      );
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

      const result = validateBuyItems(cart, MOCK_PRODUCTS);
      // Price changed from 0.5 to 0.30 (30 pence / 100)
      expect(result).toBe(true);
      const updatedCart = getCart();
      expect(updatedCart[0].unit_price).toBe(0.3);
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

      const result = validateBuyItems(cart, MOCK_PRODUCTS);
      expect(result).toBe(false);
    });
  });

  test("validateBuyItems handles mixed buy and non-buy items", () => {
    withCleanStorage(() =>
      withMockedAlert((alertMock) => {
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

        const result = validateBuyItems(cart, MOCK_PRODUCTS);
        expect(result).toBe(true);

        const updatedCart = getCart();
        expect(updatedCart).toHaveLength(2);
        expect(updatedCart[0].item_name).toBe("Hire Item");
        expect(updatedCart[1].item_name).toBe("Valid Buy");
        expect(updatedCart[1].unit_price).toBe(100);

        expect(alertMock).toHaveBeenCalledTimes(1);
        expect(alertMock.mock.calls[0][0]).toContain("Invalid Buy");
      }),
    );
  });

  test("validateBuyItems alerts for each removed item individually", () => {
    withCleanStorage(() =>
      withMockedAlert((alertMock) => {
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

        expect(alertMock).toHaveBeenCalledTimes(2);
        expect(alertMock.mock.calls[0][0]).toContain("Gone Item A");
        expect(alertMock.mock.calls[1][0]).toContain("Gone Item B");
      }),
    );
  });

  // ----------------------------------------
  // Cache TTL Tests
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
  test("validateCartWithCache skips if no buy-mode items in cart", async () => {
    await withCleanStorage(() =>
      withMockedFetch(
        () => {
          // no-op: fetch should not be called in this test
        },
        async (fetchMock) => {
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
        },
      ),
    );
  });

  test("validateCartWithCache fetches products and validates cart", async () => {
    await withCleanStorage(() =>
      withMockedFetch(productsOkFetch, async (fetchMock) =>
        withMockedAlert(async () => {
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
        }),
      ),
    );
  });

  test("validateCartWithCache uses cached products when fresh", async () => {
    await withCleanStorage(() =>
      withMockedFetch(
        () => {
          // no-op: fetch should not be called in this test
        },
        async (fetchMock) => {
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
        },
      ),
    );
  });

  test("validateCartWithCache alerts when API is unreachable", async () => {
    await withCleanStorage(() =>
      withMockedFetch(
        () => Promise.reject(new Error("Network error")),
        async () =>
          withMockedAlert(async (alertMock) => {
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
            expect(alertMock).toHaveBeenCalledTimes(1);
            expect(alertMock.mock.calls[0][0]).toContain(
              "Unable to reach the store",
            );
          }),
      ),
    );
  });

  test("validateCartWithCache removes unavailable items after fetch", async () => {
    await withCleanStorage(() =>
      withMockedFetch(productsOkFetch, async () =>
        withMockedAlert(async (alertMock) => {
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
          expectSingleRemovalAlert(alertMock, "Unknown");
        }),
      ),
    );
  });

  // ----------------------------------------
  // refreshCacheIfNeeded Tests
  // ----------------------------------------
  test("refreshCacheIfNeeded does nothing with empty cart", () => {
    withCleanStorage(() =>
      withMockedFetch(
        () => {
          // no-op: fetch should not be called in this test
        },
        (fetchMock) => {
          saveCart([]);
          refreshCacheIfNeeded();
          expect(fetchMock).not.toHaveBeenCalled();
        },
      ),
    );
  });

  test("refreshCacheIfNeeded does nothing with only hire items", () => {
    withCleanStorage(() =>
      withMockedFetch(
        () => {
          // no-op: fetch should not be called in this test
        },
        (fetchMock) => {
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
        },
      ),
    );
  });

  test("refreshCacheIfNeeded triggers fetch for buy items", () => {
    withCleanStorage(() =>
      withMockedFetch(productsOkFetch, (fetchMock) => {
        withMockedAlert(() => {
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
      }),
    );
  });
});
