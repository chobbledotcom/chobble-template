import { describe, expect, test } from "bun:test";
import { loadDOM, withDOMSlot } from "#utils/lazy-dom.js";

describe("loadDOM", () => {
  test("returns a DOM with the provided HTML", async () => {
    const dom = await loadDOM("<html><body><p>hello</p></body></html>");
    expect(dom.window.document.querySelector("p").textContent).toBe("hello");
  });

  test("serialize returns HTML string", async () => {
    const dom = await loadDOM("<html><body><p>x</p></body></html>");
    const html = dom.serialize();
    expect(html).toContain("<p>x</p>");
    expect(typeof html).toBe("string");
  });

  test("serialize includes doctype when present", async () => {
    const dom = await loadDOM("<!DOCTYPE html><html><body></body></html>");
    expect(dom.serialize().toLowerCase()).toContain("<!doctype html>");
  });

  test("supports adding nodes via document API", async () => {
    const dom = await loadDOM("<html><body></body></html>");
    const span = dom.window.document.createElement("span");
    span.textContent = "added";
    dom.window.document.body.appendChild(span);
    expect(dom.serialize()).toContain("<span>added</span>");
  });

  test("constructor without HTML produces empty document", async () => {
    const dom = await loadDOM();
    expect(dom.window.document.body).toBeDefined();
  });

  test("respects caller-provided settings overrides", async () => {
    const dom = await loadDOM("<html></html>", {
      settings: { disableComputedStyleRendering: false },
    });
    expect(dom.window.document.documentElement).toBeDefined();
  });

  test("swallows rejections from happyDOM.close() during serialize", async () => {
    const dom = await loadDOM("<html><body>x</body></html>");
    dom.window.happyDOM.close = () => Promise.reject(new Error("close fail"));
    expect(() => dom.serialize()).not.toThrow();
  });
});

const macrotaskSleep = (ms = 5) => new Promise((r) => setTimeout(r, ms));

class ConcurrencyTracker {
  #inFlight = 0;
  #peak = 0;

  enter() {
    this.#inFlight += 1;
    if (this.#inFlight > this.#peak) this.#peak = this.#inFlight;
  }

  leave() {
    this.#inFlight -= 1;
  }

  get peak() {
    return this.#peak;
  }
}

describe("withDOMSlot", () => {
  test("runs the callback and returns its value", async () => {
    expect(await withDOMSlot(async () => 42)).toBe(42);
  });

  test("propagates errors from the callback", async () => {
    await expect(
      withDOMSlot(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });

  test("releases its slot when the callback throws", async () => {
    await expect(
      withDOMSlot(async () => {
        throw new Error("first fails");
      }),
    ).rejects.toThrow("first fails");
    expect(await withDOMSlot(async () => "second succeeds")).toBe(
      "second succeeds",
    );
  });

  test("limits concurrent in-flight callbacks to the cap (4)", async () => {
    const tracker = new ConcurrencyTracker();
    const task = async () => {
      tracker.enter();
      await macrotaskSleep();
      tracker.leave();
    };
    await Promise.all(Array.from({ length: 12 }, () => withDOMSlot(task)));
    expect(tracker.peak).toBeLessThanOrEqual(4);
    expect(tracker.peak).toBeGreaterThan(0);
  });

  test("runs every queued task when more tasks are submitted than slots", async () => {
    const completions = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        withDOMSlot(async () => {
          await macrotaskSleep(1);
          return i;
        }),
      ),
    );
    expect(completions).toHaveLength(8);
    expect(new Set(completions).size).toBe(8);
  });
});
