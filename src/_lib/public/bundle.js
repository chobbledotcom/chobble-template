// Main JS bundle - processed by Bun during build

// NPM dependencies
import "instant.page";
import Botpoison from "@botpoison/browser";

window.Botpoison = Botpoison;

// UI features
import "#public/ui/autosizes.js";
import "#public/ui/gallery.js";
import "#public/ui/mobile-menu-collapse.js";
import "#public/ui/scroll-fade.js";
import "#public/ui/search.js";
import "#public/ui/slider.js";
import "#public/ui/tabs.js";
import "#public/ui/shuffle-properties.js";
import "#public/ui/sort-dropdown.js";
import "#public/ui/category-filter.js";
import "#public/ui/contact-form-submit.js";

// Design system (scoped to .design-system containers)
import "#public/design-system.js";

// Theme
import "#public/theme/theme-editor.js";
import "#public/theme/theme-switcher.js";

// Cart & Quote
import "#public/cart/cart.js";
import "#public/cart/quote.js";
import "#public/cart/quote-checkout.js";
import "#public/cart/quote-complete.js";
import "#public/cart/order-complete.js";
import "#public/cart/quote-steps.js";
import "#public/ui/quote-steps-progress.js";
import "#public/cart/hire-calculator.js";
import "#public/cart/stripe-checkout.js";
