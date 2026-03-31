// Design System JavaScript
// Scroll animations, slider functionality, and video facades
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

const applyParallaxOffset = (el) => {
  const rect = el.getBoundingClientRect();
  const progress =
    (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
  const offset = (progress - 0.5) * 20;
  el.firstElementChild.style.transform = `translateY(${offset}%)`;
};

const initParallax = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const activeSet = new Set();
  observeIntersections(
    `${SCOPE} .parallax`,
    (entered, target) => {
      activeSet[entered ? "add" : "delete"](target);
    },
    { rootMargin: "50px 0px" },
  );

  const tick = () => {
    for (const el of activeSet) {
      applyParallaxOffset(el);
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

// Video facade - replace thumbnail with iframe from server-rendered <template> on click
const initVideoFacades = () => {
  for (const button of document.querySelectorAll(`${SCOPE} .video-facade`)) {
    button.addEventListener("click", () => {
      const template = button.querySelector("template");
      if (!template) return;

      const wrapper = document.createElement("div");
      wrapper.className = "video-wrapper";
      wrapper.appendChild(template.content.cloneNode(true));

      button.replaceWith(wrapper);
    });
  }
};

const init = () => {
  // Scroll reveal - animate elements as they enter viewport
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const el of document.querySelectorAll(`${SCOPE} [data-reveal]`)) {
      el.classList.add("is-visible");
    }
  } else {
    observeIntersections(
      `${SCOPE} [data-reveal]`,
      (visible, target, observer) => {
        if (visible) {
          target.classList.add("is-visible");
          observer.unobserve(target);
        }
      },
      { rootMargin: "0px 0px -50px 0px", threshold: 0.1 },
    );
  }

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

  initVideoFacades();
};

onReady(init);
