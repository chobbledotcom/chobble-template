// Main JS bundle - bundled by esbuild during build

/* jscpd:ignore-start -- bundle import block */
// NPM dependencies
import "instant.page";

// UI features. Each module exports an init function; the bundle owns the
// DOM-ready registration so modules stay importable before a page's DOM exists.
import { onReady } from "#public/utils/on-ready.js";
import "#public/ui/autosizes.js";
import { initGallery } from "#public/ui/gallery.js";
import { initImagePopup } from "#public/ui/image-popup.js";
import { initNavDropdown } from "#public/ui/nav-dropdown.js";
import "#public/ui/scroll-fade.js";
import { initSearch } from "#public/ui/search.js";
import "#public/ui/site-menu.js";
import "#public/ui/slider.js";
import "#public/ui/decrypt-text.js";

// Design system (scoped to .design-system containers)
import "#public/design-system.js";

// Theme
import "#public/theme/theme-editor.js";
import "#public/theme/theme-switcher.js";
/* jscpd:ignore-end */

onReady(initGallery);
onReady(initImagePopup);
onReady(initNavDropdown);
onReady(initSearch);
