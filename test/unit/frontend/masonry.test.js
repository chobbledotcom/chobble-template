import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mockModule } from "#test/test-utils.js";

const originalGetComputedStyle = globalThis.getComputedStyle;
const documentPrototype = Object.getPrototypeOf(document);
const originalCreateElement = documentPrototype.createElement;
const originalAddEventListener = window.addEventListener;

let readyCallback = null;
let resizeHandlers = null;

await mockModule("#public/utils/on-ready.js", () => ({
  onReady: (callback) => {
    readyCallback = callback;
  },
}));

const masonry = await import("#public/masonry.js");

const resetDom = () => {
  document.body.innerHTML = "";
  document.body.className = "";
};

const setOffsetWidth = (el, width) => {
  Object.defineProperty(el, "offsetWidth", {
    configurable: true,
    value: width,
  });
};

const installComputedStyleStub = (lineHeight = "20px") => {
  const getStyle = (el) => ({
    fontWeight: el.dataset.fontWeight || "400",
    fontSize: el.dataset.fontSize || "16px",
    fontFamily: el.dataset.fontFamily || "Arial",
    lineHeight: el.dataset.lineHeight || lineHeight,
    height: el.dataset.cssHeight || "44px",
  });

  globalThis.getComputedStyle = getStyle;
  window.getComputedStyle = getStyle;
};

const mountGrid = (classes, items, width) => {
  document.body.innerHTML = `
    <section class="design-system">
      <ul class="${classes}">${items}</ul>
    </section>
  `;
  const grid = document.querySelector("ul");
  setOffsetWidth(grid, width);
  return grid;
};

const runReady = () => {
  expect(typeof readyCallback).toBe("function");
  readyCallback();
};

const expectReadyGrid = (grid, width, metrics) => {
  const cards = [...grid.children];
  expect(grid.classList.contains("masonry-ready")).toBe(true);
  expect(cards[0].style.width).toBe(width);
  expect(cards[0].style.transform).toBe("translate(0px, 0px)");
  expect(JSON.parse(cards[0].dataset.metrics)).toEqual(metrics);
  return cards;
};

beforeEach(() => {
  resetDom();
  documentPrototype.createElement = function createElement(...args) {
    const el = originalCreateElement.apply(this, args);
    const tagName = String(args[0]).toLowerCase();

    if (tagName === "canvas") {
      el.getContext = () => ({
        font: "",
        letterSpacing: "0px",
        wordSpacing: "0px",
        measureText: (text) => ({ width: String(text).length * 8 }),
      });
    }

    return el;
  };
  installComputedStyleStub();
  resizeHandlers = [];
  window.addEventListener = (type, handler, options) => {
    if (type === "resize") {
      resizeHandlers.push(handler);
      return;
    }

    return originalAddEventListener.call(window, type, handler, options);
  };
});

afterEach(() => {
  resetDom();
  documentPrototype.createElement = originalCreateElement;
  globalThis.getComputedStyle = originalGetComputedStyle;
  window.getComputedStyle = originalGetComputedStyle;
  window.addEventListener = originalAddEventListener;
  resizeHandlers = null;
});

describe("textHeight", () => {
  test("measures text using a cached font counter", () => {
    const font = "400 16px Arial";

    expect(masonry.textHeight("Title", font, 20, 200)).toBe(20);
    expect(masonry.textHeight("Two words", font, 20, 50)).toBe(40);
    expect(masonry.textHeight("Same cache", font, 20, 200)).toBe(20);
  });
});

describe("masonry layout", () => {
  test("returns early when no masonry containers exist", () => {
    runReady();

    expect(resizeHandlers).toHaveLength(0);
  });

  test("returns early for an empty masonry container", () => {
    const grid = mountGrid("items masonry", "", 904);

    runReady();

    expect(grid.classList.contains("masonry-ready")).toBe(false);
    expect(grid.style.height).toBe("");
    expect(resizeHandlers).toHaveLength(1);
  });

  test("places regular item cards and reflows them after a debounced resize", async () => {
    const grid = mountGrid(
      "items masonry",
      `
        <li>
          <a class="image-link">
            <span class="image-wrapper" style="aspect-ratio: 4 / 3"></span>
          </a>
          <h3>First product</h3>
          <p>Short copy</p>
          <button class="button" data-css-height="44px">Buy</button>
        </li>
        <li>
          <a class="image-link">
            <span class="image-wrapper" style="aspect-ratio: 1 / 0"></span>
          </a>
          <h3>Second product with longer title</h3>
        </li>
        <li>
          <a class="image-link">
            <span class="image-wrapper"></span>
          </a>
          <button class="add-to-cart" data-css-height="36px">Add</button>
        </li>
        <li>
          <p>Text only card</p>
        </li>
        <li>
          <a class="image-link">
            <span class="image-wrapper" style="aspect-ratio: 1 / 1"></span>
          </a>
        </li>
      `,
      904,
    );

    runReady();

    const cards = expectReadyGrid(grid, "280px", {
      gap: 32,
      padX: 48,
      padY: 48,
      contentWidth: 230,
    });
    expect(grid.style.height.endsWith("px")).toBe(true);
    expect(resizeHandlers).toHaveLength(1);
    expect(cards[1].style.transform).toBe("translate(312px, 0px)");
    expect(cards[2].style.transform).toBe("translate(624px, 0px)");
    expect(JSON.parse(cards[0].dataset.heights)).toEqual([20, 20]);
    expect(cards[0].querySelector(".image-wrapper").dataset.height).toBe("210");
    expect(cards[1].querySelector(".image-wrapper").dataset.height).toBe(
      "null",
    );
    expect(cards[2].querySelector(".image-wrapper").dataset.height).toBe(
      "null",
    );
    expect(JSON.parse(cards[2].dataset.heights)).toEqual([]);

    setOffsetWidth(grid, 500);
    resizeHandlers[0]();
    resizeHandlers[0]();
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(cards[0].style.width).toBe("500px");
    expect(cards[1].style.transform.startsWith("translate(0px, ")).toBe(true);
  });

  test("places review cards with review-specific metrics", () => {
    const grid = mountGrid(
      "items masonry reviews-grid",
      `
        <li>
          <div class="review-header">
            <span class="rating">★★★★★</span>
            <time class="date">12 June 2026</time>
          </div>
          <div class="review"><p>Great service and helpful support</p></div>
          <p class="products">Product one and product two</p>
          <div class="author-info">
            <strong class="name">Ada Lovelace</strong>
            <a class="review-link">Verified source</a>
          </div>
        </li>
        <li>
          <time class="date">11 June 2026</time>
          <div class="review"><p>Good</p></div>
        </li>
        <li></li>
      `,
      640,
    );

    runReady();

    const cards = expectReadyGrid(grid, "640px", {
      gap: 16,
      padX: 48,
      padY: 48,
      contentWidth: 590,
    });
    expect(cards[1].style.transform.startsWith("translate(0px, ")).toBe(true);
    expect(cards[0].querySelector(".date").dataset.height).toBe("20");
    expect(cards[0].querySelector(".review p").dataset.height).toBe("20");
    expect(cards[0].querySelector(".products").dataset.height).toBe("20");
    expect(cards[0].querySelector(".name").dataset.height).toBe("20");
    expect(cards[0].querySelector(".review-link").dataset.height).toBe("20");
    expect(Number.parseFloat(cards[2].dataset.height)).toBeGreaterThan(32);
  });

  test("throws when computed metrics cannot produce a valid height", () => {
    installComputedStyleStub("normal");
    mountGrid(
      "items masonry",
      `
        <li>
          <p>Cannot measure this line height</p>
        </li>
      `,
      500,
    );

    expect(() => runReady()).toThrow(
      "Masonry container has 1 cards but computed height is NaN",
    );
  });
});
