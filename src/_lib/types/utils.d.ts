/**
 * Utility types
 *
 * Types for utility functions like memoization.
 */

/**
 * Options for the memoize function
 */
export type MemoizeOptions<Args extends unknown[], _R> = {
  cacheKey?: (args: Args) => string | number;
};

/**
 * One language a site publishes, as declared in `_data/languages.json`.
 * Exactly one entry has `is_default`, which is the base language: the one
 * every URL outside another language's prefix is written in, and the one
 * `hreflang="x-default"` points at.
 */
export type Language = {
  code: string;
  hreflang: string;
  og_locale: string;
  label: string;
  home_url: string;
  home_label: string;
  breadcrumb_label: string;
  skip_to_content_label: string;
  search_label: string;
  navigation_label: string;
  menu_label: string;
  close_menu_label: string;
  submenu_label: string;
  gallery_label: string;
  close_gallery_label: string;
  previous_image_label: string;
  next_image_label: string;
  gallery_images_label: string;
  download_label: string;
  load_more_label: string;
  no_results_label: string;
  back_to_label: string;
  result_count_one_label: string;
  result_count_other_label: string;
  redirect_label: string;
  redirect_link_label: string;
  is_default?: boolean;
};
