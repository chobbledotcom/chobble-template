/**
 * Scroll Fade-In Effect
 * Uses IntersectionObserver for performant scroll-based animations.
 * Selectors are configured in theme.scss via --scroll-fade-selectors CSS custom property.
 */
import { onReady } from "#assets/on-ready.js";

function initScrollFade() {
  // Read selectors from CSS custom property (set in theme.scss)
  const selectorsValue = getComputedStyle(
    document.documentElement,
  ).getPropertyValue("--scroll-fade-selectors");

  if (!selectorsValue || selectorsValue.trim() === "") {
    return; // No selectors configured, nothing to do
  }

  // Parse the selectors (remove quotes and trim)
  const selectors = selectorsValue.replace(/^["']|["']$/g, "").trim();

  if (!selectors) {
    return;
  }

  // Query all elements matching the selectors
  const elements = document.querySelectorAll(selectors);

  if (elements.length === 0) {
    return;
  }

  // Check for reduced motion preference
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Make all elements visible immediately
    elements.forEach((el) => el.classList.add("scroll-visible"));
    return;
  }

  // Create IntersectionObserver
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("scroll-visible");
          observer.unobserve(entry.target); // Stop observing once visible
        }
      });
    },
    {
      root: null, // viewport
      rootMargin: "0px 0px -50px 0px", // Trigger slightly before fully in view
      threshold: 0.1, // 10% visible
    },
  );

  // Observe all elements
  elements.forEach((el) => observer.observe(el));
}

onReady(initScrollFade);
