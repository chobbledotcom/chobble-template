// Slider navigation - minimal JS for scroll buttons
import { onReady } from "#assets/on-ready.js";

function initSliders() {
  document.querySelectorAll(".slider-container").forEach((container) => {
    const slider = container.querySelector(".slider");
    const prevBtn = container.querySelector(".slider-prev");
    const nextBtn = container.querySelector(".slider-next");

    if (!slider || !prevBtn || !nextBtn) return;

    // Skip if already initialized
    if (slider.dataset.sliderInit) return;
    slider.dataset.sliderInit = "true";

    // Get scroll amount (width of first item + gap)
    const getScrollAmount = () => {
      const firstItem = slider.querySelector("li");
      if (!firstItem) return 240;
      const style = getComputedStyle(slider);
      const gap = parseFloat(style.gap) || 16;
      return firstItem.offsetWidth + gap;
    };

    // Check if slider overflows and update button states
    const updateState = () => {
      const overflows = slider.scrollWidth > slider.clientWidth;
      slider.classList.toggle("overflowing", overflows);

      const atStart = slider.scrollLeft <= 0;
      const atEnd =
        slider.scrollLeft >= slider.scrollWidth - slider.clientWidth - 1;

      prevBtn.toggleAttribute("disabled", atStart);
      nextBtn.toggleAttribute("disabled", atEnd);
    };

    // Store updateState for later recalculation
    slider._updateSliderState = updateState;

    // Scroll handlers
    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      slider.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
    });

    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      slider.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
    });

    // Update state on scroll and resize
    slider.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState, { passive: true });

    // Initial state
    updateState();
  });
}

// Re-calculate button visibility for all sliders
function updateAllSliders() {
  document.querySelectorAll(".slider").forEach((slider) => {
    if (slider._updateSliderState) {
      slider._updateSliderState();
    }
  });
}

onReady(initSliders);

// Recalculate button visibility on Turbo render (e.g. cache restoration)
document.addEventListener("turbo:render", updateAllSliders);
