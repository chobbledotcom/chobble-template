// Main JS bundle - imports libraries from npm
// This file is processed by esbuild during build

// Turbo for fast page navigation
import "@hotwired/turbo";

// Botpoison for form spam protection (loaded globally)
import Botpoison from "@botpoison/browser";
window.Botpoison = Botpoison;
