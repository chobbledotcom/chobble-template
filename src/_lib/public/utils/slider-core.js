// Slider Core - shared slider initialization logic
// Used by both main bundle (slider.js) and design system bundle (design-system.js)

/**
 * Get scroll amount for a slider (width of first child + gap)
 * @param {HTMLElement} slider - The slider element
 * @param {string} itemSelector - Selector for slider items (e.g., "li" or ".feature")
 * @param {number} defaultWidth - Default width if no items found
 * @returns {number} Scroll amount in pixels
 */
export const getScrollAmount = (
  slider,
  itemSelector = ":scope > *",
  defaultWidth = 240,
) => {
  const firstItem = slider.querySelector(itemSelector);
  if (!firstItem) return defaultWidth;
  const gap = parseFloat(getComputedStyle(slider).gap) || 16;
  return firstItem.offsetWidth + gap;
};

/**
 * Create state updater for a slider
 * @param {HTMLElement} slider - The slider element
 * @param {HTMLElement} prevBtn - Previous button
 * @param {HTMLElement} nextBtn - Next button
 * @returns {Function} State update function
 */
export const createStateUpdater = (slider, prevBtn, nextBtn) => () => {
  const overflows = slider.scrollWidth > slider.clientWidth;
  slider.classList.toggle("overflowing", overflows);

  const atStart = slider.scrollLeft <= 0;
  const atEnd =
    slider.scrollLeft >= slider.scrollWidth - slider.clientWidth - 1;

  prevBtn.toggleAttribute("disabled", atStart);
  nextBtn.toggleAttribute("disabled", atEnd);
};

/**
 * Create scroll handler for a slider
 * @param {HTMLElement} slider - The slider element
 * @param {Function} getAmount - Function returning scroll amount
 * @returns {Function} Curried scroll handler (direction => event => void)
 */
export const createScrollHandler =
  (slider, getAmount) => (direction) => (e) => {
    e.preventDefault();
    slider.scrollBy({ left: direction * getAmount(), behavior: "smooth" });
  };

/**
 * Initialize a single slider container
 * @param {HTMLElement} container - The slider container element
 * @param {Object} options - Configuration options
 * @param {string} options.itemSelector - Selector for slider items
 * @param {number} options.defaultWidth - Default scroll width
 * @returns {Function|null} State updater function for recalculation, or null if not initialized
 */
export const initSlider = (container, options = {}) => {
  const slider = container.querySelector(".slider");
  const prevBtn = container.querySelector(".slider-prev");
  const nextBtn = container.querySelector(".slider-next");

  if (!slider || !prevBtn || !nextBtn) return null;
  if (slider.dataset.sliderInit) return null;
  slider.dataset.sliderInit = "true";

  const getAmount = () =>
    getScrollAmount(slider, options.itemSelector, options.defaultWidth);
  const updateState = createStateUpdater(slider, prevBtn, nextBtn);
  const scroll = createScrollHandler(slider, getAmount);

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
