// Main JS bundle - processed by esbuild during build

// NPM dependencies
import "@hotwired/turbo";
import Botpoison from "@botpoison/browser";

window.Botpoison = Botpoison;

// UI features
import "./ui/autosizes.js";
import "./ui/gallery.js";
import "./ui/scroll-fade.js";
import "./ui/search.js";
import "./ui/slider.js";
import "./ui/tabs.js";
import "./ui/availability-calendar.js";
import "./ui/shuffle-properties.js";

// Theme
import "./theme/theme-editor.js";
import "./theme/theme-switcher.js";

// Cart & Quote
import "./cart/cart.js";
import "./cart/quote.js";
import "./cart/quote-checkout.js";
import "./cart/quote-complete.js";
import "./cart/quote-steps.js";
import "./cart/hire-calculator.js";
import "./cart/stripe-checkout.js";
