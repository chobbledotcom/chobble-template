// Design System JavaScript
// Scroll animations, slider functionality, and marquees
// All functionality is scoped to elements within .design-system containers

import { onReady } from "#public/utils/on-ready.js";
import { initSliders } from "#public/utils/slider-core.js";

const SCOPE = ".design-system";

const observeIntersections = (selector, callback, options) => {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      callback(entry.isIntersecting, entry.target, observer);
    }
  }, options);

  for (const el of document.querySelectorAll(selector)) {
    observer.observe(el);
  }

  return observer;
};

/**
 * Reveal elements as they scroll into view: adds visibleClass once per
 * element, immediately when the user prefers reduced motion.
 * Shared by the design-system reveal and the items scroll-fade.
 */
export const revealOnIntersect = (selector, visibleClass) => {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const el of elements) el.classList.add(visibleClass);
    return;
  }

  observeIntersections(
    selector,
    (visible, target, observer) => {
      if (visible) {
        target.classList.add(visibleClass);
        observer.unobserve(target);
      }
    },
    { rootMargin: "0px 0px -50px 0px", threshold: 0.1 },
  );
};

const init = () => {
  /**
   * @param {HTMLElement} el
   */
  const applyParallaxOffset = (el) => {
    const rect = el.getBoundingClientRect();
    const progress =
      (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    const offset = (progress - 0.5) * 20;
    el.firstElementChild.style.transform = `translateY(${offset}%)`;
  };

  const initParallax = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Fixed lookup for initially observed elements; only visible elements own a RAF.
    const animations = new WeakMap(
      Array.from(document.querySelectorAll(`${SCOPE} .parallax`), (el) => [
        el,
        { frame: null },
      ]),
    );
    const startTick = (el) => {
      applyParallaxOffset(el);
      animations.get(el).frame = requestAnimationFrame(() => startTick(el));
    };
    const setVisible = (el, entered) => {
      const state = animations.get(el);
      el.classList.toggle("parallax-active", entered);
      if (state.frame !== null) cancelAnimationFrame(state.frame);
      state.frame = entered ? requestAnimationFrame(() => startTick(el)) : null;
    };
    observeIntersections(
      `${SCOPE} .parallax`,
      (entered, target) => setVisible(target, entered),
      { rootMargin: "50px 0px" },
    );
  };

  const cloneAsHidden = (el, parent) => {
    const clone = el.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    if (clone.tagName === "A") clone.setAttribute("tabindex", "-1");
    parent.appendChild(clone);
  };

  const fillTrack = (track, originals, minWidth) => {
    while (track.scrollWidth < minWidth) {
      for (const child of originals) cloneAsHidden(child, track);
    }
  };

  const initMarquees = () => {
    const marquees = Array.from(
      document.querySelectorAll(`${SCOPE} .marquee-images`),
    ).flatMap((container) => {
      const track = container.querySelector(".marquee-images__track");
      return track && track.children.length > 0 ? [{ container, track }] : [];
    });
    for (const { container, track } of marquees) {
      fillTrack(track, [...track.children], container.offsetWidth);
      for (const child of [...track.children]) cloneAsHidden(child, track);

      container.classList.add("marquee-images--ready");
    }
  };

  // Scroll reveal - animate elements as they enter viewport
  revealOnIntersect(`${SCOPE} [data-reveal]`, "is-visible");

  // Smooth scroll for anchor links within design system
  for (const anchor of document.querySelectorAll(`${SCOPE} a[href^="#"]`)) {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (href === "#") return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", href);
      }
    });
  }

  // Parallax - translate image based on scroll position
  initParallax();

  // Initialize sliders within design system with default settings
  initSliders(`${SCOPE} .slider-container`, {
    itemSelector: ":scope > *",
    defaultWidth: 340,
  });

  initMarquees();
};

onReady(init);
