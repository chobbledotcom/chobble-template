// Main JS bundle - processed by esbuild during build

// NPM dependencies
import "@hotwired/turbo";
import Botpoison from "@botpoison/browser";

window.Botpoison = Botpoison;

// Site JS
import "./autosizes.js";
import "./gallery.js";
import "./scroll-fade.js";
import "./search.js";
import "./slider.js";
import "./tabs.js";
import "./theme-editor.js";
import "./theme-switcher.js";

// Cart (has its own sub-modules)
import "./cart.js";
import "./quote.js";
import "./quote-checkout.js";
import "./quote-complete.js";
import "./quote-steps.js";
import "./quote-steps-progress.js";

// Stripe checkout (standalone page)
import "./stripe-checkout.js";

// Availability calendar for properties
import "./availability-calendar.js";

// Property shuffle for consistent random ordering
import "./shuffle-properties.js";
