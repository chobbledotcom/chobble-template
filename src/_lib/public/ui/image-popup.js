// Fullscreen image gallery popup.
//
// The static <dialog> skeleton lives in src/_includes/image-popup.html and is
// populated here with slides and thumbnails cloned from a gallery's hidden
// full-size images (see src/_lib/public/ui/gallery.js for the triggers).
//
// Slides sit in a horizontal scroll-snap track, so touch swiping, arrow keys,
// the quarter-width hover buttons, and thumbnail clicks all drive the same
// scroll position; a scroll listener keeps the index in sync. State lives in
// the dialog's dataset (data-index).
import { onReady } from "#public/utils/on-ready.js";

const TRACK = "[data-popup-track]";
const THUMBS = "[data-popup-thumbs]";
const STATUS = "[data-popup-status]";
const NAV = "[data-nav]";
const CLOSE = "[data-popup-close]";
const THUMB = "[data-popup-thumb]";

const SLIDE_SIZES = "100vw";
const THUMB_SIZES = "96px";

let returnFocusTo = null;

const clampIndex = (index, total) =>
  Math.min(Math.max(index, 0), Math.max(total - 1, 0));

const getDialog = () => document.getElementById("image-popup");
const getTrack = (dialog) => dialog.querySelector(TRACK);
const getThumbs = (dialog) => dialog.querySelector(THUMBS);
const getSlides = (dialog) => [...getTrack(dialog).children];

const getCurrentIndex = (dialog) => Number.parseInt(dialog.dataset.index, 10);

const setImageSizes = (root, sizes) => {
  for (const el of root.querySelectorAll("[sizes]")) {
    el.setAttribute("sizes", sizes);
  }
};

// The contain-fitted LQIP background peeks out around the loaded image's
// edges as a blurred halo, so drop it as soon as the real pixels arrive.
const clearLqipOnLoad = (clone) => {
  const img = clone.querySelector("img");
  if (!img) return;
  const clear = () => clone.style.setProperty("background-image", "none");
  if (img.complete) clear();
  else img.addEventListener("load", clear, { once: true });
};

const buildSlide = (wrapper) => {
  const slide = document.createElement("div");
  slide.className = "popup-slide";
  const clone = wrapper.cloneNode(true);
  setImageSizes(clone, SLIDE_SIZES);
  clearLqipOnLoad(clone);
  slide.appendChild(clone);
  return slide;
};

const buildThumb = (wrapper, index, total) => {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "popup-thumb";
  button.dataset.popupThumb = "";
  button.dataset.index = String(index);
  const alt = wrapper.querySelector("img")?.alt;
  const position = `Show image ${index + 1} of ${total}`;
  button.setAttribute("aria-label", alt ? `${position}: ${alt}` : position);
  const clone = wrapper.cloneNode(true);
  setImageSizes(clone, THUMB_SIZES);
  button.appendChild(clone);
  li.appendChild(button);
  return li;
};

const centerThumb = (thumbs, thumb) => {
  thumbs.scrollTo({
    left: thumb.offsetLeft - (thumbs.clientWidth - thumb.offsetWidth) / 2,
  });
};

const updateThumbs = (dialog, index) => {
  for (const thumb of getThumbs(dialog).querySelectorAll(THUMB)) {
    const isCurrent = Number.parseInt(thumb.dataset.index, 10) === index;
    if (isCurrent) {
      thumb.setAttribute("aria-current", "true");
      centerThumb(getThumbs(dialog), thumb);
    } else {
      thumb.removeAttribute("aria-current");
    }
  }
};

const updateNav = (dialog, index, total) => {
  for (const nav of dialog.querySelectorAll(NAV)) {
    const atEnd = nav.dataset.nav === "prev" ? index <= 0 : index >= total - 1;
    nav.setAttribute("aria-disabled", String(atEnd));
  }
};

// Eager-load the current slide and its neighbours so navigation feels instant.
const eagerLoadNeighbours = (dialog, index) => {
  const slides = getSlides(dialog);
  for (const neighbour of [index - 1, index, index + 1]) {
    const img = slides[neighbour]?.querySelector("img");
    if (img) img.setAttribute("loading", "eager");
  }
};

const setCurrentIndex = (dialog, index) => {
  const total = getSlides(dialog).length;
  dialog.dataset.index = String(index);
  dialog.querySelector(STATUS).textContent = `Image ${index + 1} of ${total}`;
  updateNav(dialog, index, total);
  updateThumbs(dialog, index);
  eagerLoadNeighbours(dialog, index);
};

// "auto" defers to the track's CSS scroll-behavior (instant under reduced motion).
const scrollToSlide = (dialog, index, behavior = "auto") => {
  const track = getTrack(dialog);
  track.scrollTo({ left: index * track.clientWidth, behavior });
};

const goTo = (dialog, index) => {
  const clamped = clampIndex(index, getSlides(dialog).length);
  setCurrentIndex(dialog, clamped);
  scrollToSlide(dialog, clamped);
};

const navigate = (dialog, direction) =>
  goTo(dialog, getCurrentIndex(dialog) + direction);

const populate = (dialog, wrappers) => {
  const hasMultiple = wrappers.length > 1;
  getTrack(dialog).replaceChildren(...wrappers.map(buildSlide));
  const thumbs = getThumbs(dialog);
  thumbs.hidden = !hasMultiple;
  thumbs.replaceChildren(
    ...(hasMultiple
      ? wrappers.map((w, i) => buildThumb(w, i, wrappers.length))
      : []),
  );
  for (const nav of dialog.querySelectorAll(NAV)) nav.hidden = !hasMultiple;
};

export const openImagePopup = ({ wrappers, startIndex, trigger }) => {
  const dialog = getDialog();
  if (!dialog || wrappers.length === 0) return;

  returnFocusTo = trigger;
  populate(dialog, wrappers);
  dialog.showModal();
  setCurrentIndex(dialog, clampIndex(startIndex, wrappers.length));
  scrollToSlide(dialog, getCurrentIndex(dialog), "instant");
};

const handleNavClick = (dialog, nav) => {
  if (nav.getAttribute("aria-disabled") === "true") return;
  navigate(dialog, nav.dataset.nav === "prev" ? -1 : 1);
};

const handleDialogClick = (event) => {
  const nav = event.target.closest(NAV);
  if (nav) return handleNavClick(event.currentTarget, nav);
  const thumb = event.target.closest(THUMB);
  if (thumb) {
    return goTo(event.currentTarget, Number.parseInt(thumb.dataset.index, 10));
  }
  if (event.target.closest(CLOSE)) return event.currentTarget.close();
  if (event.target.closest(THUMBS)) return;
  // Anything else - the image, empty stage space, or the backdrop - closes.
  event.currentTarget.close();
};

const KEY_ACTIONS = {
  ArrowLeft: (dialog) => navigate(dialog, -1),
  ArrowRight: (dialog) => navigate(dialog, 1),
  Home: (dialog) => goTo(dialog, 0),
  End: (dialog) => goTo(dialog, getSlides(dialog).length - 1),
};

const handleDialogKeydown = (event) => {
  const action = KEY_ACTIONS[event.key];
  if (!action) return;
  event.preventDefault();
  action(event.currentTarget);
};

const handleDialogClose = (event) => {
  getTrack(event.currentTarget).replaceChildren();
  getThumbs(event.currentTarget).replaceChildren();
  delete event.currentTarget.dataset.index;
  if (returnFocusTo?.isConnected) returnFocusTo.focus();
  returnFocusTo = null;
};

const syncFromScroll = (dialog) => {
  const track = getTrack(dialog);
  if (!track.clientWidth) return;
  const index = clampIndex(
    Math.round(track.scrollLeft / track.clientWidth),
    getSlides(dialog).length,
  );
  if (index !== getCurrentIndex(dialog)) setCurrentIndex(dialog, index);
};

const handleTrackScroll = (event) =>
  syncFromScroll(event.currentTarget.closest("dialog"));

export const initImagePopup = () => {
  const dialog = getDialog();
  if (!dialog) return;

  dialog.removeEventListener("click", handleDialogClick);
  dialog.addEventListener("click", handleDialogClick);
  dialog.removeEventListener("keydown", handleDialogKeydown);
  dialog.addEventListener("keydown", handleDialogKeydown);
  dialog.removeEventListener("close", handleDialogClose);
  dialog.addEventListener("close", handleDialogClose);

  const track = getTrack(dialog);
  track.removeEventListener("scroll", handleTrackScroll);
  track.addEventListener("scroll", handleTrackScroll, { passive: true });
};

onReady(initImagePopup);
