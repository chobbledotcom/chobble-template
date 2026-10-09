// Slider Core - shared slider initialization logic
// Used by both main bundle (slider.js) and design system bundle (design-system.js)

/**
 * Initialize a single slider container
 * @param {HTMLElement} container - The slider container element
 * @param {Object} options - Configuration options
 * @param {string} [options.itemSelector] - Selector for slider items
 * @param {number} [options.defaultWidth] - Default scroll width
 * @returns {Function|null} State updater function for recalculation, or null if not initialized
 */
const initSlider = (container, options = {}) => {
  const slider = container.querySelector(".slider");
  const prevBtn = container.querySelector(".slider-prev");
  const nextBtn = container.querySelector(".slider-next");

  if (!slider || !prevBtn || !nextBtn) return null;
  if (slider.dataset.sliderInit) return null;
  slider.dataset.sliderInit = "true";

  // Scroll amount: width of the first item plus the flex gap.
  const getAmount = () => {
    const firstItem = slider.querySelector(
      options.itemSelector || ":scope > *",
    );
    if (!firstItem) return options.defaultWidth || 240;
    const gap = Number.parseFloat(getComputedStyle(slider).gap) || 16;
    return firstItem.offsetWidth + gap;
  };

  const updateState = () => {
    const overflows = slider.scrollWidth > slider.clientWidth;
    slider.classList.toggle("overflowing", overflows);

    const atStart = slider.scrollLeft <= 0;
    const atEnd =
      slider.scrollLeft >= slider.scrollWidth - slider.clientWidth - 1;

    prevBtn.toggleAttribute("disabled", atStart);
    nextBtn.toggleAttribute("disabled", atEnd);
  };

  const scroll = (direction) => (e) => {
    e.preventDefault();
    slider.scrollBy({ left: direction * getAmount(), behavior: "smooth" });
  };

  prevBtn.addEventListener("click", scroll(-1));
  nextBtn.addEventListener("click", scroll(1));
  slider.addEventListener("scroll", updateState, { passive: true });
  window.addEventListener("resize", updateState, { passive: true });

  updateState();
  return updateState;
};

/**
 * Initialize all sliders matching the container selector
 * @param {string} containerSelector - Selector for slider containers
 * @param {Object} options - Configuration options passed to initSlider
 */
export const initSliders = (
  containerSelector = ".slider-container",
  options = {},
) => {
  for (const container of document.querySelectorAll(containerSelector)) {
    const updateState = initSlider(container, options);
    if (updateState) {
      container.querySelector(".slider")._updateSliderState = updateState;
    }
  }
};
