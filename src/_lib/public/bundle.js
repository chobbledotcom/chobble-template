// Main JS bundle - processed by esbuild during build

// NPM dependencies
import "@hotwired/turbo";
import Botpoison from "@botpoison/browser";

window.Botpoison = Botpoison;

// UI features
import "#assets/ui/autosizes.js";
import "#assets/ui/gallery.js";
import "#assets/ui/scroll-fade.js";
import "#assets/ui/search.js";
import "#assets/ui/slider.js";
import "#assets/ui/tabs.js";
import "#assets/ui/availability-calendar.js";
import "#assets/ui/shuffle-properties.js";

// Theme
import "#assets/theme/theme-editor.js";
import "#assets/theme/theme-switcher.js";

// Cart & Quote
import "#assets/cart/cart.js";
import "#assets/cart/quote.js";
import "#assets/cart/quote-checkout.js";
import "#assets/cart/quote-complete.js";
import "#assets/cart/quote-steps.js";
import "#assets/cart/hire-calculator.js";
import "#assets/cart/stripe-checkout.js";
