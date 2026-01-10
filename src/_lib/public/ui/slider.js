// Slider navigation - minimal JS for scroll buttons
import { onReady } from "#public/utils/on-ready.js";
import { initSliders } from "#public/utils/slider-core.js";

const init = () => {
  initSliders(".slider-container", { itemSelector: "li", defaultWidth: 240 });
};

// Re-calculate button visibility for all sliders
const updateAllSliders = () => {
  for (const slider of document.querySelectorAll(".slider")) {
    if (slider._updateSliderState) {
      slider._updateSliderState();
    }
  }
};

onReady(init);

// Recalculate button visibility on Turbo render (e.g. cache restoration)
document.addEventListener("turbo:render", updateAllSliders);
