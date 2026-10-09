/**
 * Scroll Fade-In Effect
 * Uses IntersectionObserver for performant scroll-based animations.
 */
import { revealOnIntersect } from "#public/design-system.js";
import { onReady } from "#public/utils/on-ready.js";

onReady(() => {
  revealOnIntersect(".items > li", "scroll-visible");
});
