// Landing Page JavaScript - Lightweight scroll animations
// Uses IntersectionObserver for performant scroll-triggered animations

const initScrollReveal = () => {
  // Skip if user prefers reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Make all elements visible immediately
    for (const el of document.querySelectorAll("[data-scroll-reveal]")) {
      el.classList.add("is-visible");
    }
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          // Stop observing once revealed
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

  // Observe all elements with scroll reveal classes or data attributes
  const revealElements = document.querySelectorAll(
    ".scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale, [data-scroll-reveal]",
  );

  for (const el of revealElements) {
    observer.observe(el);
  }
};

// Smooth scroll for anchor links
const initSmoothScroll = () => {
  for (const anchor of document.querySelectorAll('a[href^="#"]')) {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (href === "#") return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        // Update URL without triggering scroll
        history.pushState(null, "", href);
      }
    });
  }
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initScrollReveal();
    initSmoothScroll();
  });
} else {
  initScrollReveal();
  initSmoothScroll();
}
