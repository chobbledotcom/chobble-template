/**
 * Scroll Fade-In Effect
 * Uses IntersectionObserver for performant scroll-based animations.
 */
import { onReady } from "#public/utils/on-ready.js";

const SCROLL_FADE_SELECTOR = ".items > li";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const createScrollObserver = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("scroll-visible");
          observer.unobserve(e.target);
        }
      }
    },
    { root: null, rootMargin: "0px 0px -50px 0px", threshold: 0.1 },
  );
  return observer;
};

function initScrollFade() {
  const elements = document.querySelectorAll(SCROLL_FADE_SELECTOR);
  if (elements.length === 0) return;

  if (prefersReducedMotion()) {
    for (const el of elements) el.classList.add("scroll-visible");
    return;
  }

  const observer = createScrollObserver();
  for (const el of elements) observer.observe(el);
}

onReady(initScrollFade);
