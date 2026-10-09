import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { initSliders } from "#public/utils/slider-core.js";

let readyCallback = null;
const originalMatchMedia = window.matchMedia;
const originalRaf = window.requestAnimationFrame;
const originalCancelRaf = window.cancelAnimationFrame;

vi.mock("#public/utils/slider-core.js", () => ({
  initSliders: vi.fn(),
}));

vi.mock("#public/utils/on-ready.js", () => ({
  onReady: (callback) => {
    readyCallback = callback;
  },
}));

const { revealOnIntersect } = await import("#public/design-system.js");

// ============================================
// DOM fixtures
// ============================================

const mount = (html) => {
  document.body.innerHTML = `<div class="design-system">${html}</div>`;
};

const parallaxScene = () => {
  mount(`
    <div class="parallax" id="px-a"><div class="px-child"></div></div>
    <div class="parallax" id="px-b"><div class="px-child"></div></div>
  `);
  return {
    a: document.querySelector("#px-a"),
    b: document.querySelector("#px-b"),
  };
};

// ============================================
// IntersectionObserver + rAF doubles
// ============================================

let intersectionObservers = null;
const originalIntersectionObserver = window.IntersectionObserver;

class FakeIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.targets = [];
    intersectionObservers.push(this);
  }

  observe(target) {
    this.targets.push(target);
  }

  unobserve(target) {
    this.targets = this.targets.filter((el) => el !== target);
  }
}

const signalIntersection = (observer, isIntersecting, target) =>
  observer.callback([{ isIntersecting, target }], observer);

const fixtureObserver = (rootMargin) =>
  intersectionObservers.find(
    (observer) => observer.options.rootMargin === rootMargin,
  );

const parallaxObserver = () => fixtureObserver("50px 0px");

const revealObserver = () => fixtureObserver("0px 0px -50px 0px");

let rafQueue = null;
let rafId = null;

const runFrame = () => {
  const callbacks = rafQueue;
  rafQueue = [];
  for (const { callback } of callbacks) {
    callback();
  }
};

const setReducedMotion = (reduced) => {
  window.matchMedia = () => ({ matches: reduced });
};

const clickAnchor = (id) =>
  document
    .getElementById(id)
    .dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

beforeEach(() => {
  initSliders.mockClear();
  document.body.innerHTML = "";
  setReducedMotion(false);
  intersectionObservers = [];
  rafQueue = [];
  rafId = 0;
  window.IntersectionObserver = FakeIntersectionObserver;
  window.requestAnimationFrame = (callback) => {
    const id = rafId++;
    rafQueue.push({ id, callback });
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    rafQueue = rafQueue.filter((frame) => frame.id !== id);
  };
});

afterEach(() => {
  window.IntersectionObserver = originalIntersectionObserver;
  window.matchMedia = originalMatchMedia;
  window.requestAnimationFrame = originalRaf;
  window.cancelAnimationFrame = originalCancelRaf;
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  history.pushState(null, "", "/");
});

describe("revealOnIntersect", () => {
  test("shows an element once it scrolls into view, then stops watching it", () => {
    mount('<p data-reveal="x">hidden</p>');
    const el = document.querySelector("[data-reveal]");
    expect(el.classList.contains("is-visible")).toBe(false);

    revealOnIntersect(".design-system [data-reveal]", "is-visible");
    const observer = revealObserver();
    expect(observer.targets).toContain(el);

    signalIntersection(observer, true, el);
    expect(el.className).toBe("is-visible");
    expect(observer.targets).not.toContain(el);
  });

  test("leaves elements unseen until the observer reports them", () => {
    mount('<p data-reveal="x">hidden</p>');
    const el = document.querySelector("[data-reveal]");

    revealOnIntersect(".design-system [data-reveal]", "is-visible");
    signalIntersection(revealObserver(), false, el);

    expect(el.classList.contains("is-visible")).toBe(false);
  });

  test("shows everything immediately under reduced motion", () => {
    mount('<p data-reveal="x">hidden</p>');

    setReducedMotion(true);
    revealOnIntersect(".design-system [data-reveal]", "is-visible");

    expect(document.querySelector("[data-reveal]").className).toBe(
      "is-visible",
    );
    expect(intersectionObservers).toHaveLength(0);
  });

  test("does nothing when no elements match", () => {
    mount("<p>nothing</p>");

    revealOnIntersect(".design-system [data-reveal]", "is-visible");

    expect(intersectionObservers).toHaveLength(0);
  });
});

describe("parallax", () => {
  test("translates the inner element while the item is on screen", () => {
    const scene = parallaxScene();
    readyCallback();

    const observer = parallaxObserver();
    expect(observer.targets).toEqual([scene.a, scene.b]);

    signalIntersection(observer, true, scene.a);
    signalIntersection(observer, false, scene.b);
    runFrame();

    // With a zero rect, progress is (innerHeight - 0)/(innerHeight + 0) = 1,
    // so the offset is (1 - 0.5) * 20 = 10.
    expect(scene.a.firstElementChild.style.transform).toBe("translateY(10%)");
    expect(scene.b.firstElementChild.style.transform).toBe("");
  });

  test("stops updating an element once it leaves the screen", () => {
    const scene = parallaxScene();
    readyCallback();

    const observer = parallaxObserver();
    signalIntersection(observer, true, scene.a);
    runFrame();
    // A stale offset from an earlier frame: leaving the screen must freeze
    // the element instead of re-applying fresh positions.
    scene.a.firstElementChild.style.transform = "translateY(42%)";

    signalIntersection(observer, false, scene.a);
    runFrame();

    expect(scene.a.firstElementChild.style.transform).toBe("translateY(42%)");
    expect(rafQueue).toHaveLength(0);
  });

  test("uses current geometry on each frame after reentry without duplicate updates", () => {
    const { a, b } = parallaxScene();
    const measureA = vi.spyOn(a, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight,
      height: window.innerHeight,
    });
    const measureB = vi.spyOn(b, "getBoundingClientRect");
    readyCallback();
    const observer = parallaxObserver();
    signalIntersection(observer, false, a);
    runFrame();
    expect(measureA).not.toHaveBeenCalled();

    signalIntersection(observer, true, a);
    signalIntersection(observer, true, a);
    runFrame();
    expect(a.firstElementChild.style.transform).toBe("translateY(-10%)");
    expect(measureA).toHaveBeenCalledTimes(1);

    signalIntersection(observer, false, a);
    measureA.mockReturnValue({ top: 0, height: window.innerHeight });
    runFrame();
    expect(measureA).toHaveBeenCalledTimes(1);

    signalIntersection(observer, true, a);
    runFrame();
    expect(a.firstElementChild.style.transform).toBe("translateY(0%)");
    expect(measureA).toHaveBeenCalledTimes(2);

    measureA.mockReturnValue({
      top: 0,
      height: window.innerHeight * 3,
    });
    runFrame();
    expect(a.firstElementChild.style.transform).toBe("translateY(-5%)");
    expect(measureA).toHaveBeenCalledTimes(3);
    expect(measureB).not.toHaveBeenCalled();
  });

  test("keeps other visible elements animating when one leaves", () => {
    const { a, b } = parallaxScene();
    const measureA = vi.spyOn(a, "getBoundingClientRect");
    const measureB = vi.spyOn(b, "getBoundingClientRect");
    readyCallback();
    const observer = parallaxObserver();
    signalIntersection(observer, true, a);
    signalIntersection(observer, true, b);
    runFrame();
    expect(measureA).toHaveBeenCalledTimes(1);
    expect(measureB).toHaveBeenCalledTimes(1);

    signalIntersection(observer, false, a);
    measureB.mockReturnValue({ top: window.innerHeight, height: 0 });
    runFrame();
    expect(measureA).toHaveBeenCalledTimes(1);
    expect(measureB).toHaveBeenCalledTimes(2);
    expect(b.firstElementChild.style.transform).toBe("translateY(-10%)");
  });

  test("does not animate premarked or newly inserted unobserved elements", () => {
    const { a } = parallaxScene();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="parallax parallax-active" id="outside"><div></div></div>',
    );
    readyCallback();
    document
      .querySelector(".design-system")
      .insertAdjacentHTML(
        "beforeend",
        '<div class="parallax parallax-active" id="late"><div></div></div>',
      );
    signalIntersection(parallaxObserver(), true, a);
    runFrame();

    expect(a.firstElementChild.style.transform).toBe("translateY(10%)");
    expect(
      document.querySelector("#outside").firstElementChild.style.transform,
    ).toBe("");
    expect(
      document.querySelector("#late").firstElementChild.style.transform,
    ).toBe("");
  });

  test("does not start an animation under reduced motion", () => {
    setReducedMotion(true);
    parallaxScene();
    readyCallback();

    expect(intersectionObservers).toHaveLength(0);
    expect(rafQueue).toHaveLength(0);
  });
});

describe("marquees", () => {
  test("clones children until the track is wide enough, hidden from assistive tech", () => {
    mount(`
      <div class="marquee-images" id="mq">
        <div class="marquee-images__track">
          <span>one</span>
          <a href="#clone-target">two</a>
        </div>
      </div>
    `);
    const container = document.getElementById("mq");
    const track = container.querySelector(".marquee-images__track");
    Object.defineProperty(container, "offsetWidth", {
      configurable: true,
      value: 900,
    });
    // Wide enough per child that cloning the two originals once (4 children)
    // clears the 900px minimum, keeping the clone count deterministic.
    Object.defineProperty(track, "scrollWidth", {
      configurable: true,
      get: () => track.children.length * 300,
    });

    readyCallback();

    // fillTrack clones both originals (2 -> 4 children: 1200px >= 900),
    // then the post-fill loop clones every child once more (4 -> 8).
    expect(track.children).toHaveLength(8);
    const clones = [...track.children].filter((child) =>
      child.hasAttribute("aria-hidden"),
    );
    expect(clones).toHaveLength(6);
    // Link clones are also skipped by keyboard focus: the single <a> is
    // cloned once by fillTrack, then twice more by the post-fill pass.
    expect(
      clones.filter((clone) => clone.getAttribute("tabindex") === "-1"),
    ).toHaveLength(3);
    expect(container.classList.contains("marquee-images--ready")).toBe(true);
  });

  test("skips containers without a non-empty track", () => {
    mount(`
      <div class="marquee-images" id="mq-empty"></div>
      <div class="marquee-images" id="mq-childless">
        <div class="marquee-images__track"></div>
      </div>
    `);

    readyCallback();

    expect(document.getElementById("mq-empty").className).toBe(
      "marquee-images",
    );
    expect(document.getElementById("mq-childless").className).toBe(
      "marquee-images",
    );
  });
});

describe("smooth scroll anchors", () => {
  test("scrolls to the target and records the hash on click", () => {
    mount(`
      <a id="go" href="#section">go</a>
      <div id="section">target</div>
    `);
    const target = document.getElementById("section");
    target.scrollIntoView = vi.fn();
    readyCallback();

    expect(clickAnchor("go")).toBe(false);
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(location.hash).toBe("#section");
  });

  test("leaves # links alone", () => {
    mount('<a id="top" href="#">top</a>');
    readyCallback();

    expect(clickAnchor("top")).toBe(true);
  });

  test("leaves broken anchors to the browser", () => {
    mount('<a id="broken" href="#nowhere-missing">broken</a>');
    readyCallback();

    // No handler intercepted the click; the browser does its default thing.
    expect(clickAnchor("broken")).toBe(true);
  });
});

describe("init wiring", () => {
  test("initialises the design-system sliders", () => {
    mount("<div></div>");

    readyCallback();

    expect(initSliders).toHaveBeenCalledExactlyOnceWith(
      ".design-system .slider-container",
      {
        itemSelector: ":scope > *",
        defaultWidth: 340,
      },
    );
  });
});
