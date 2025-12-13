// Quote complete page
// Clears cart after successful quote submission

import { STORAGE_KEY } from "./cart-utils.js";

// Only run on quote-complete page
if (document.body.classList.contains("quote-complete")) {
  localStorage.removeItem(STORAGE_KEY);
  const cartIcon = document.getElementById("cart-icon");
  if (cartIcon) {
    cartIcon.style.display = "none";
  }
}
