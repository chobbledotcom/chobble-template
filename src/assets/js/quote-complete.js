// Quote complete page
// Clears cart after successful quote submission

import { STORAGE_KEY } from "./cart-utils.js";

localStorage.removeItem(STORAGE_KEY);
const cartIcon = document.getElementById("cart-icon");
if (cartIcon) {
  cartIcon.style.display = "none";
}
