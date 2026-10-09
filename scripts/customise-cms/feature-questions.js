/**
 * The optional-feature questions, asked in order. Keys match CmsFeatures.
 * no_index always applies because the pages collection is always enabled.
 * Shared data only: importing this module does not load config or prompt users.
 * @type {[keyof import("#scripts/customise-cms/config.js").CmsFeatures, string][]}
 */
export const FEATURE_QUESTIONS = [
  ["permalinks", "Do you want custom permalinks on items?"],
  ["redirects", "Do you want redirect_from support (for URL redirects)?"],
  ["faqs", "Do you want FAQs on items?"],
  ["galleries", "Do you want image galleries on items?"],
  [
    "external_navigation_urls",
    "Do you want to link to external URLs in your navigation?",
  ],
  [
    "no_index",
    "Do you want to hide pages/news from listings (no_index field)?",
  ],
];
