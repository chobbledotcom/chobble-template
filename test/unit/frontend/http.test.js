import { describe, expect, mock, test } from "bun:test";
import { withMockFetch } from "#test/test-utils.js";

mock.restore();
const { fetchJson, postJson } = await import("#public/utils/http.js");

const withRejectedFetch = async (fn) => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = mock(() => Promise.reject(new Error("Network error")));
  try {
    return await fn();
  } finally {
    globalThis.fetch = origFetch;
  }
};

describe("fetchJson", () => {
  test("returns parsed JSON on success", async () => {
    await withMockFetch({ id: 1 }, {}, async () => {
      const result = await fetchJson("https://api.example.com/data");
      expect(result).toEqual({ id: 1 });
    });
  });

  test("returns null on non-OK response", async () => {
    await withMockFetch({}, { ok: false, status: 404 }, async () => {
      const result = await fetchJson("https://api.example.com/missing");
      expect(result).toBeNull();
    });
  });

  test("returns null on network error", async () => {
    await withRejectedFetch(async () => {
      const result = await fetchJson("https://api.example.com/down");
      expect(result).toBeNull();
    });
  });
});

describe("postJson", () => {
  test("posts JSON and returns parsed response", async () => {
    const origFetch = globalThis.fetch;
    const fetchMock = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ url: "https://checkout.stripe.com/x" }),
      }),
    );
    globalThis.fetch = fetchMock;
    try {
      const result = await postJson("https://api.example.com/checkout", {
        items: [{ sku: "ABC", quantity: 1 }],
      });

      expect(result).toEqual({ url: "https://checkout.stripe.com/x" });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.example.com/checkout");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(options.body)).toEqual({
        items: [{ sku: "ABC", quantity: 1 }],
      });
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test("returns null on non-OK response", async () => {
    await withMockFetch({}, { ok: false, status: 500 }, async () => {
      const result = await postJson("https://api.example.com/checkout", {});
      expect(result).toBeNull();
    });
  });

  test("returns null on network error", async () => {
    await withRejectedFetch(async () => {
      const result = await postJson("https://api.example.com/checkout", {});
      expect(result).toBeNull();
    });
  });
});
