// Design System JavaScript
// Scroll animations, slider functionality, and video facades
// All functionality is scoped to elements within .design-system containers

import { onReady } from "#public/utils/on-ready.js";
import { initSliders } from "#public/utils/slider-core.js";

const SCOPE = ".design-system";

// Video facade - replace thumbnail with iframe on click
const initVideoFacades = () => {
  for (const button of document.querySelectorAll(`${SCOPE} .video-facade`)) {
    button.addEventListener("click", () => {
      if (!button.dataset.videoId) return;

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${button.dataset.videoId}?autoplay=1`;
      iframe.title =
        button.getAttribute("aria-label")?.replace("Play ", "") || "";
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      );
      iframe.setAttribute("allowfullscreen", "");

      const wrapper = document.createElement("div");
      wrapper.className = "video-wrapper";
      wrapper.appendChild(iframe);

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
        rootMargin: "0px 0px -50px 0px",
        threshold: 0.1,
      },
    );

    for (const el of document.querySelectorAll(`${SCOPE} [data-reveal]`)) {
      observer.observe(el);
    }
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

  // Initialize sliders within design system with landing page defaults
  initSliders(`${SCOPE} .slider-container`, {
    itemSelector: ":scope > *",
    defaultWidth: 340,
  });

  // Initialize video facades for click-to-play
  initVideoFacades();
};

onReady(init);
