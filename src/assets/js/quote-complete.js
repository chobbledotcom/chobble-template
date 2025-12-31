// Quote complete page
// Clears cart after successful quote submission

import { STORAGE_KEY } from "#assets/cart-utils.js";

// Only run on quote-complete page
if (document.body.classList.contains("quote-complete")) {
  localStorage.removeItem(STORAGE_KEY);
  document.querySelectorAll(".cart-icon").forEach((icon) => {
    icon.style.display = "none";
  });
}
