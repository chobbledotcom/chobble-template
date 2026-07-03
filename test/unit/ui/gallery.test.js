import { afterEach, describe, expect, mock, test } from "bun:test";
import { initGallery, resolveStartIndex } from "#public/ui/gallery.js";
import { imagePopupDialogHtml, popupSlideAlts } from "#test/test-utils.js";

const setUpGallery = (names = ["one", "two", "three"]) => {
  const fullImages = names
    .map(
      (name, index) => `
        <div class="full-image-${index + 1}">
          <div class="image-wrapper">
            <img src="/images/${name}.jpg" alt="${name}" sizes="auto" loading="lazy">
          </div>
        </div>`,
    )
    .join("");
  const thumbnails = names
    .map(
      (name, index) => `
        <li>
          <a href="/images/${name}.jpg" data-index="${index + 1}" class="image-link">
            <figure><div class="image-wrapper"><img src="/images/${name}-thumb.jpg" alt="${name}"></div></figure>
          </a>
        </li>`,
    )
    .join("");
  document.body.innerHTML = `
    <div class="gallery" data-popup-scope>
      <div class="current-image">
        <a href="/images/${names[0]}.jpg" class="current-image-link" data-popup-trigger data-index="1">
          <div class="image-wrapper"><img src="/images/${names[0]}.jpg" alt="${names[0]}"></div>
        </a>
      </div>
      <div aria-hidden="true" class="gallery-full-size-images">${fullImages}</div>
      <ul id="gallery" class="image-gallery">${thumbnails}</ul>
    </div>
  ${imagePopupDialogHtml}`;
  initGallery();
};

const dialog = () => document.getElementById("image-popup");
const heroLink = () => document.querySelector(".current-image-link");
const thumbLink = (index) =>
  document.querySelector(`.image-link[data-index="${index}"]`);

// True when a click's default action (following the link) would run
const clickFollowsLink = (el) =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

afterEach(() => {
  document.body.innerHTML = "";
});

describe("popup triggers", () => {
  test("clicking the hero image opens the popup at the first image", () => {
    setUpGallery();

    heroLink().click();

    expect(dialog().open).toBe(true);
    expect(dialog().dataset.index).toBe("0");
  });

  test("collects every full-size image into the popup, in order", () => {
    setUpGallery();

    heroLink().click();

    expect(popupSlideAlts(dialog())).toEqual(["one", "two", "three"]);
  });

  test("opens the popup at the swapped-in image", () => {
    setUpGallery();

    thumbLink(3).click();
    heroLink().click();

    expect(dialog().dataset.index).toBe("2");
  });

  test("converts the 1-based data-index to a 0-based start index", () => {
    setUpGallery();

    expect(resolveStartIndex(heroLink())).toBe(0);
    expect(resolveStartIndex(thumbLink(3))).toBe(2);
  });

  test("throws when a trigger has no numeric data-index", () => {
    setUpGallery();
    heroLink().removeAttribute("data-index");

    expect(() => resolveStartIndex(heroLink())).toThrow("data-index");
  });

  test("swallows the click so the browser does not follow the link", () => {
    setUpGallery();

    expect(clickFollowsLink(heroLink())).toBe(false);
  });

  test("a trigger outside any gallery scope does nothing", () => {
    setUpGallery();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<a href="/images/lone.jpg" data-popup-trigger data-index="1" id="lone">x</a>',
    );

    document.getElementById("lone").click();

    expect(dialog().open).toBe(false);
  });
});

describe("thumbnail hero swapping", () => {
  test("swaps the scope's hero image in place", () => {
    setUpGallery();

    thumbLink(2).click();

    expect(heroLink().querySelector("img").alt).toBe("two");
    expect(heroLink().dataset.index).toBe("2");
    expect(heroLink().href).toBe(thumbLink(2).href);
  });

  test("swallows the thumbnail click so the link is not followed", () => {
    setUpGallery();

    expect(clickFollowsLink(thumbLink(2))).toBe(false);
  });

  test("clones the full-size image rather than moving it", () => {
    setUpGallery();

    thumbLink(2).click();

    expect(
      document.querySelectorAll(".full-image-2 .image-wrapper").length,
    ).toBe(1);
  });

  test("scrolls the page to the hero image when it is off-screen", () => {
    setUpGallery();
    const scrollIntoView = mock();
    heroLink().getBoundingClientRect = () => ({ top: 200 });
    heroLink().scrollIntoView = scrollIntoView;

    thumbLink(2).click();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  test("an image link without a gallery scope is left alone", () => {
    document.body.innerHTML = `
      <a href="/images/solo.jpg" data-index="1" class="image-link" id="solo">
        <img src="/images/solo-thumb.jpg" alt="solo">
      </a>
    ${imagePopupDialogHtml}`;
    initGallery();

    document.getElementById("solo").click();

    expect(dialog().open).toBe(false);
  });
});

// Slider centering math depends on element geometry, which happy-dom
// renders as zero, so each scenario stubs the rects it needs.
describe("slider thumbnail centering", () => {
  const setUpSliderGallery = () => {
    setUpGallery();
    const slider = document.getElementById("gallery");
    slider.classList.add("slider");
    setRect(slider, { left: 0, right: 300 });
    const items = [...slider.querySelectorAll("li")];
    for (const li of items) {
      Object.defineProperty(li, "offsetWidth", { value: 100 });
    }
    const scrollBy = mock();
    slider.scrollBy = scrollBy;
    return { items, scrollBy };
  };

  const setRect = (el, rect) =>
    Object.assign(el, {
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, ...rect }),
    });

  test("scrolls a thumbnail into view from the right, revealing a neighbour", () => {
    const { items, scrollBy } = setUpSliderGallery();
    setRect(items[0], { left: 50, right: 150 });
    setRect(items[1], { left: 350, right: 450 });
    setRect(items[2], { left: 460, right: 560 });

    thumbLink(2).click();

    expect(scrollBy).toHaveBeenCalledWith({ left: 200, behavior: "smooth" });
  });

  test("scrolls an edge thumbnail into view from the left without overshoot", () => {
    const { items, scrollBy } = setUpSliderGallery();
    setRect(items[0], { left: -150, right: -50 });
    setRect(items[1], { left: -40, right: 60 });
    setRect(items[2], { left: 70, right: 170 });

    thumbLink(1).click();

    expect(scrollBy).toHaveBeenCalledWith({ left: -150, behavior: "smooth" });
  });

  test("treats the last thumbnail as an edge without overshoot", () => {
    const { items, scrollBy } = setUpSliderGallery();
    setRect(items[0], { left: -250, right: -150 });
    setRect(items[1], { left: -140, right: -40 });
    setRect(items[2], { left: 350, right: 450 });

    thumbLink(3).click();

    expect(scrollBy).toHaveBeenCalledWith({ left: 150, behavior: "smooth" });
  });

  test("initialising twice does not double the listeners", () => {
    const { items, scrollBy } = setUpSliderGallery();
    initGallery();
    setRect(items[1], { left: 350, right: 450 });

    thumbLink(2).click();

    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  test("nudges the strip to half-reveal a hidden next neighbour", () => {
    const { items, scrollBy } = setUpSliderGallery();
    setRect(items[0], { left: -10, right: 90 });
    setRect(items[1], { left: 100, right: 200 });
    setRect(items[2], { left: 260, right: 360 });

    thumbLink(2).click();

    expect(scrollBy).toHaveBeenCalledWith({ left: 10, behavior: "smooth" });
  });

  test("nudges the strip back to half-reveal a hidden previous neighbour", () => {
    const { items, scrollBy } = setUpSliderGallery();
    setRect(items[0], { left: -60, right: 40 });
    setRect(items[1], { left: 100, right: 200 });
    setRect(items[2], { left: 205, right: 305 });

    thumbLink(2).click();

    expect(scrollBy).toHaveBeenCalledWith({ left: -10, behavior: "smooth" });
  });

  test("leaves the strip alone when the thumbnail and neighbours are visible", () => {
    const { items, scrollBy } = setUpSliderGallery();
    setRect(items[0], { left: -1, right: 99 });
    setRect(items[1], { left: 100, right: 200 });
    setRect(items[2], { left: 201, right: 301 });

    thumbLink(2).click();

    expect(scrollBy).not.toHaveBeenCalled();
  });
});
