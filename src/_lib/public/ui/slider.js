// Slider navigation - minimal JS for scroll buttons
import { onReady } from "#public/utils/on-ready.js";
import { initSliders } from "#public/utils/slider-core.js";

const init = () => {
  initSliders(".slider-container", { itemSelector: "li", defaultWidth: 240 });
};

onReady(init);
