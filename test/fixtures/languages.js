/**
 * The language declarations a translated site would put in
 * `_data/languages.json`, shared by every test that needs more than the one
 * language the template ships.
 */

/** @type {import("#lib/types").Language} */
export const EN = {
  code: "en",
  hreflang: "en-GB",
  og_locale: "en_GB",
  label: "English",
  home_url: "/",
  home_label: "Home",
  breadcrumb_label: "Breadcrumb",
  skip_to_content_label: "Skip to main content",
  search_label: "Search",
  navigation_label: "Main",
  menu_label: "Menu",
  close_menu_label: "Close menu",
  submenu_label: "Show submenu",
  gallery_label: "Image gallery",
  close_gallery_label: "Close gallery",
  previous_image_label: "Previous image",
  next_image_label: "Next image",
  gallery_images_label: "Images",
  download_label: "Download",
  load_more_label: "Load more",
  no_results_label: "No results found.",
  back_to_label: "Back to",
  result_count_one_label: "{count} result found.",
  result_count_other_label: "{count} results found.",
  redirect_label: "Redirecting…",
  redirect_link_label: "Click here if you are not redirected.",
  is_default: true,
};

/** @type {import("#lib/types").Language} */
export const DE = {
  code: "de",
  hreflang: "de",
  og_locale: "de_DE",
  label: "Deutsch",
  home_url: "/de/",
  home_label: "Startseite",
  breadcrumb_label: "Brotkrumennavigation",
  skip_to_content_label: "Zum Hauptinhalt springen",
  search_label: "Suchen",
  navigation_label: "Hauptnavigation",
  menu_label: "Menü",
  close_menu_label: "Menü schließen",
  submenu_label: "Untermenü anzeigen",
  gallery_label: "Bildergalerie",
  close_gallery_label: "Galerie schließen",
  previous_image_label: "Vorheriges Bild",
  next_image_label: "Nächstes Bild",
  gallery_images_label: "Bilder",
  download_label: "Herunterladen",
  load_more_label: "Mehr laden",
  no_results_label: "Keine Ergebnisse gefunden.",
  back_to_label: "Zurück zu",
  result_count_one_label: "{count} Ergebnis gefunden.",
  result_count_other_label: "{count} Ergebnisse gefunden.",
  redirect_label: "Weiterleitung…",
  redirect_link_label:
    "Hier klicken, falls die Weiterleitung nicht funktioniert.",
  is_default: false,
};

/**
 * A language published under a prefix inside another language's prefix, so a
 * URL can match two of them at once.
 * @type {import("#lib/types").Language}
 */
export const DE_AT = {
  ...DE,
  code: "de-at",
  hreflang: "de-AT",
  og_locale: "de_AT",
  label: "Deutsch (Österreich)",
  home_url: "/de/at/",
};

/** One page, written in both languages. */
export const ABOUT_GROUP = { en: "/about/", de: "/de/ueber-uns/" };
