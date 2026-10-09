import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const originalGetComputedStyle = globalThis.getComputedStyle;
const documentPrototype = Object.getPrototypeOf(document);
const originalCreateElement = documentPrototype.createElement;
const originalAddEventListener = window.addEventListener;

let readyCallback = null;
let resizeHandlers = null;

vi.mock("#public/utils/on-ready.js", () => ({
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
    maxHeight: el.dataset.cssMaxHeight || "none",
  });

  globalThis.getComputedStyle = getStyle;
  window.getComputedStyle = getStyle;
};

const installCreateElement = (onCanvas, makeContext) => {
  documentPrototype.createElement = function createElement(...args) {
    const el = originalCreateElement.apply(this, args);
    if (String(args[0]).toLowerCase() === "canvas") {
      onCanvas?.();
      el.getContext =
        makeContext ??
        (() => ({
          font: "",
          letterSpacing: "0px",
          wordSpacing: "0px",
          measureText: (text) => ({ width: String(text).length * 8 }),
        }));
    }
    return el;
  };
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

beforeEach(() => {
  resetDom();
  installCreateElement();
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
  // Restores real timers even if a debounce assertion threw mid-test
  vi.useRealTimers();
});

describe("textHeight", () => {
  test.sequential("measures text using a cached font counter", () => {
    const font = "400 16px Arial";

    expect(masonry.textHeight("Title", font, 20, 200)).toBe(20);
    expect(masonry.textHeight("Two words", font, 20, 50)).toBe(40);
    expect(masonry.textHeight("Same cache", font, 20, 200)).toBe(20);
  });

  test.sequential("builds the canvas counter once per font, then caches it", () => {
    const onCanvas = vi.fn(() => undefined);
    installCreateElement(onCanvas);
    // A font string unique to this test, so the module-level cache starts empty
    // for it regardless of test order.
    const font = "400 16px UniqueMasonryCacheFont";
    masonry.textHeight("hello", font, 20, 200);
    masonry.textHeight("world", font, 20, 200);
    expect(onCanvas).toHaveBeenCalledTimes(1);
  });

  test.sequential("measures with the assigned font, not the canvas default", () => {
    // Font-aware mock: character width scales with the px size in ctx.font, and
    // the context starts at the real canvas default ("10px …"). If the assigned
    // font were appended instead of set, measurement would use 10px not 16px.
    installCreateElement(undefined, () => {
      const ctx = {
        font: "10px sans-serif",
        letterSpacing: "0px",
        wordSpacing: "0px",
      };
      ctx.measureText = (text) => {
        const px = Number(ctx.font.match(/(\d+)px/)?.[1] ?? 10);
        return { width: String(text).length * px };
      };
      return ctx;
    });
    // Unique font so the module cache is cold. At 16px/char, "abcd efgh ijk"
    // (13 chars) wraps to two lines in 160px (10 chars/line); at the default
    // 10px it would fit on one (16 chars/line).
    const font = "400 16px FontApplyProbe";
    expect(masonry.textHeight("abcd efgh ijk", font, 20, 160)).toBe(40);
  });
});

describe("masonry layout", () => {
  test.sequential("returns early when no masonry containers exist", () => {
    runReady();

    expect(resizeHandlers).toHaveLength(0);
  });

  test.sequential("returns early for an empty masonry container", () => {
    const grid = mountGrid("items masonry", "", 904);

    runReady();

    expect(grid.classList.contains("masonry-ready")).toBe(false);
    expect(grid.style.height).toBe("");
    expect(resizeHandlers).toHaveLength(1);
  });

  test.sequential("places regular item cards and reflows them after a debounced resize", async () => {
    vi.useFakeTimers();
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
          <button class="button" data-css-height="36px">Read more</button>
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

    const cards = [...grid.children];
    expect(grid.classList.contains("masonry-ready")).toBe(true);
    expect(cards[0].style.width).toBe("280px");
    expect(cards[0].style.transform).toBe("translate(0px, 0px)");
    expect(JSON.parse(cards[0].dataset.metrics)).toEqual({
      gap: 32,
      padX: 48,
      padY: 48,
      contentWidth: 230,
    });
    expect(grid.style.height.endsWith("px")).toBe(true);
    const heightBefore = grid.style.height;
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
    await vi.advanceTimersByTimeAsync(50);
    expect(cards[0].style.width).toBe("280px");
    resizeHandlers[0]();
    // Reflow must wait 100ms from the last trigger, not the first.
    await vi.advanceTimersByTimeAsync(99);
    expect(cards[0].style.width).toBe("280px");
    expect(cards[1].style.transform).toBe("translate(312px, 0px)");
    expect(grid.style.height).toBe(heightBefore);
    await vi.advanceTimersByTimeAsync(1);
    expect(cards[0].style.width).toBe("500px");
    expect(cards[1].style.transform.startsWith("translate(0px, ")).toBe(true);

    // Reflow re-assigns the height to the new single-column value. A `+=`
    // would append, producing invalid CSS that the DOM drops — leaving the
    // old value unchanged.
    expect(grid.style.height).toMatch(/^\d+(\.\d+)?px$/);
    expect(grid.style.height).not.toBe(heightBefore);
  });

  test.sequential("stacks single-column cards with exact heights and GAP spacing", () => {
    const card = "<li><p>One</p><p>Two</p></li>";
    // width 500 < MOBILE_BREAKPOINT → one column, so both cards stack.
    const grid = mountGrid("items masonry", card + card, 500);

    runReady();

    const cards = [...grid.children];
    const [a, b] = JSON.parse(cards[0].dataset.heights);
    // measureItemCard with no image: extraPadding = padY (48); sumWithGaps
    // adds CARD_BORDER (2) + both child heights + GAP once (two children).
    const cardH = 2 + a + b + 32 + 48;
    expect(cards[0].dataset.height).toBe(cardH.toFixed(1));
    expect(cards[0].style.width).toBe("500px");
    expect(cards[0].style.transform).toBe("translate(0px, 0px)");
    // Second card sits exactly one card-height + GAP below the first.
    expect(cards[1].style.transform).toBe(`translate(0px, ${cardH + 32}px)`);
    // Container height is both cards plus the single GAP between them.
    expect(grid.style.height).toBe(`${cardH + cardH + 32}px`);
  });

  test.sequential("measures item cards with images, content, and buttons", () => {
    const grid = mountGrid(
      "items masonry",
      `
        <li>
          <a class="image-link"><span class="image-wrapper" style="aspect-ratio: 2 / 1"></span></a>
          <p>Short</p>
        </li>
        <li>
          <a class="image-link"><span class="image-wrapper" style="aspect-ratio: 2 / 1"></span></a>
          <button class="button" data-css-height="44px">Buy</button>
        </li>
      `,
      500,
    );

    runReady();

    const cards = [...grid.children];
    // Card 0 — image + one content paragraph. Height is
    //   (imgHeight - CARD_BORDER) + [CARD_BORDER + p + (padY/2 + gap)]
    //   = imgHeight + p + 56.
    const img0 = Number.parseFloat(
      cards[0].querySelector(".image-wrapper").dataset.height,
    );
    const [p0] = JSON.parse(cards[0].dataset.heights);
    expect(cards[0].dataset.height).toBe((img0 + p0 + 56).toFixed(1));

    // Card 1 — image + button, no content children. The button still counts
    // as content, so the image extra-padding (padY/2 + gap) applies:
    //   (imgHeight - 2) + [2 + buttonHeight(44) + 56] = imgHeight + 100.
    const img1 = Number.parseFloat(
      cards[1].querySelector(".image-wrapper").dataset.height,
    );
    expect(JSON.parse(cards[1].dataset.heights)).toEqual([]);
    expect(cards[1].dataset.height).toBe((img1 + 44 + 56).toFixed(1));
  });

  test.sequential("measures wrapped text as more than one line", () => {
    // At contentWidth 450 (~56 chars/line) this wraps to multiple lines; a
    // single line would measure exactly one lineHeight (20).
    const long =
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron";
    const grid = mountGrid("items masonry", `<li><p>${long}</p></li>`, 500);

    runReady();

    const [h] = JSON.parse(grid.children[0].dataset.heights);
    expect(h).toBeGreaterThan(20);
  });

  test.sequential("throws when computed metrics cannot produce a valid height", () => {
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
    // The diagnostic's second sentence is concatenated on — assert it
    // survives intact (a broken `+` would splice NaN in its place).
    expect(() => runReady()).toThrow(
      "This usually means getComputedStyle returned NaN values",
    );
  });

  test.sequential("debounces resize so three staggered triggers reflow once after the last trigger", async () => {
    vi.useFakeTimers();
    const grid = mountGrid("items masonry", "<li><p>One</p></li>", 500);
    runReady();

    // getComputedStyle calls scale linearly with reflows, so a spy's call
    // count tells us how many reflows ran.
    const base = window.getComputedStyle;
    const counting = vi.fn((el) => base(el));
    globalThis.getComputedStyle = counting;
    window.getComputedStyle = counting;

    // Measure the cost of a single debounced reflow.
    resizeHandlers[0]();
    expect(counting).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(99);
    expect(counting).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const perReflow = counting.mock.calls.length;
    expect(perReflow).toBeGreaterThan(0);

    // Three triggers within the debounce window must collapse to one reflow.
    // Dropping clearTimeout would run three; a broken timer handle, two.
    counting.mockClear();
    setOffsetWidth(grid, 600);
    for (const elapsed of [50, 50, 99]) {
      resizeHandlers[0]();
      await vi.advanceTimersByTimeAsync(elapsed);
      expect(counting).not.toHaveBeenCalled();
    }
    expect(grid.children[0].style.width).toBe("500px");
    await vi.advanceTimersByTimeAsync(1);
    expect(counting).toHaveBeenCalledTimes(perReflow);
    expect(grid.children[0].style.width).toBe("600px");
    await vi.advanceTimersByTimeAsync(100);
    expect(counting).toHaveBeenCalledTimes(perReflow);
  });
});
