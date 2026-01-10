// Landing Page JavaScript
// Scroll animations and slider functionality

import { initSliders } from "#public/utils/slider-core.js";

// =============================================================================
// INIT
// =============================================================================

const init = () => {
  // Scroll reveal - animate elements as they enter viewport
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const el of document.querySelectorAll("[data-reveal]")) {
      el.classList.add("is-visible");
    }
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        root: null,
        rootMargin: "0px 0px -50px 0px",
        threshold: 0.1,
      },
    );

    for (const el of document.querySelectorAll("[data-reveal]")) {
      observer.observe(el);
    }
  }

  // Smooth scroll for anchor links
  for (const anchor of document.querySelectorAll('a[href^="#"]')) {
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

  // Initialize sliders with landing page defaults
  initSliders(".slider-container", { itemSelector: ":scope > *", defaultWidth: 340 });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
