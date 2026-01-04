/**
 * Scroll Fade-In Effect
 * Uses IntersectionObserver for performant scroll-based animations.
 * Selectors are configured in theme.scss via --scroll-fade-selectors CSS custom property.
 */
import { onReady } from "#assets/on-ready.js";

const getScrollFadeSelectors = () => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    "--scroll-fade-selectors",
  );
  return value?.replace(/^["']|["']$/g, "").trim() || null;
};

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
  const selectors = getScrollFadeSelectors();
  if (!selectors) return;

  const elements = document.querySelectorAll(selectors);
  if (elements.length === 0) return;

  if (prefersReducedMotion()) {
    for (const el of elements) el.classList.add("scroll-visible");
    return;
  }

  const observer = createScrollObserver();
  for (const el of elements) observer.observe(el);
}

onReady(initScrollFade);
