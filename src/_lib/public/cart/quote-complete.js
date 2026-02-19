// Quote complete page
// Clears cart after successful quote submission

import { clearCart } from "#public/utils/cart-utils.js";

// Only run on quote-complete page
if (document.body.classList.contains("quote-complete")) {
  clearCart({ hideIcons: true });
}
