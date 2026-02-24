// Order complete page
// Clears cart after successful payment

import { clearCart } from "#public/utils/cart-utils.js";

if (document.body.classList.contains("checkout-complete")) {
  clearCart({ hideIcons: true });
}
