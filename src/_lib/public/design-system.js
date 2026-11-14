// Design System JavaScript
// Scroll animations, slider functionality, marquees, and video playback
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

  const initVideoFacades = () => {
    for (const button of document.querySelectorAll(`${SCOPE} .video-facade`)) {
      button.addEventListener("click", () => {
        const wrapper = document.createElement("div");
        wrapper.className = "video-wrapper";
        wrapper.appendChild(
          button.querySelector("template").content.cloneNode(true),
        );
        button.replaceWith(wrapper);
      });
    }
  };

  /**
   * Whether a message from a YouTube player says the video is playing.
   * State 1 is "playing"; it arrives either as a state change or inside
   * the player's periodic info delivery.
   * @param {unknown} raw
   */
  const isPlayingMessage = (raw) => {
    if (typeof raw !== "string") return false;
    const isStateChange = raw.includes('"onStateChange"');
    if (!isStateChange && !raw.includes('"infoDelivery"')) return false;
    const info = JSON.parse(raw).info;
    return (isStateChange ? info : info?.playerState) === 1;
  };

  /**
   * Fade out a YouTube background's thumbnail once its video is playing.
   * A player only reports its state to a window that asked to listen.
   */
  const initVideoBackgrounds = () => {
    const players = Array.from(
      document.querySelectorAll(`${SCOPE} [data-youtube-video]`),
      (container) => ({
        iframe: container.querySelector("iframe"),
        thumbnail: container.querySelector(".video-background__thumbnail"),
      }),
    );
    if (players.length === 0) return;

    window.addEventListener("message", (event) => {
      if (!isPlayingMessage(event.data)) return;
      players
        .find((player) => player.iframe.contentWindow === event.source)
        ?.thumbnail.classList.add("is-hidden");
    });

    for (const player of players) {
      const subscribe = () =>
        player.iframe.contentWindow.postMessage(
          '{"event":"listening","id":"1","channel":"widget"}',
          "*",
        );
      player.iframe.addEventListener("load", subscribe);
      subscribe();
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

  initVideoFacades();
  initVideoBackgrounds();
};

onReady(init);
