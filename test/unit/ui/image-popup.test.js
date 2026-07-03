import { afterEach, describe, expect, test } from "bun:test";
import { initImagePopup, openImagePopup } from "#public/ui/image-popup.js";
import { imagePopupDialogHtml, popupSlideAlts } from "#test/test-utils.js";

const buildWrappers = (names) => {
  const source = document.createElement("div");
  source.innerHTML = names
    .map(
      (name) => `
        <div class="image-wrapper" style="background-image: url('data:image/webp;base64,abc'); aspect-ratio: 3/2">
          <picture>
            <source srcset="/images/${name}.webp" sizes="auto">
            <img src="/images/${name}.jpg" alt="${name}" sizes="auto" loading="lazy">
          </picture>
        </div>`,
    )
    .join("");
  return [...source.querySelectorAll(".image-wrapper")];
};

const setUpDialog = () => {
  document.body.innerHTML = imagePopupDialogHtml;
  initImagePopup();
  return document.getElementById("image-popup");
};

const openWith = (names, startIndex = 0) => {
  const dialog = setUpDialog();
  openImagePopup({ wrappers: buildWrappers(names), startIndex });
  return dialog;
};

const pressKey = (dialog, key) =>
  dialog.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );

const CURRENT_THUMB = '[data-popup-thumb][aria-current="true"]';

afterEach(() => {
  document.body.innerHTML = "";
});

describe("openImagePopup", () => {
  test("does nothing when there are no images", () => {
    const dialog = setUpDialog();

    openImagePopup({ wrappers: [], startIndex: 0 });

    expect(dialog.open).toBe(false);
  });

  test("opens the dialog with a slide per image, in order", () => {
    const dialog = openWith(["one", "two", "three"]);

    expect(dialog.open).toBe(true);
    expect(popupSlideAlts(dialog)).toEqual(["one", "two", "three"]);
  });

  test("starts at the requested index", () => {
    const dialog = openWith(["one", "two", "three"], 1);

    expect(dialog.dataset.index).toBe("1");
    expect(dialog.querySelectorAll(CURRENT_THUMB).length).toBe(1);
    expect(dialog.querySelector(CURRENT_THUMB).dataset.index).toBe("1");
  });

  test("clamps a start index past the end to the last image", () => {
    const dialog = openWith(["one", "two", "three"], 9);

    expect(dialog.dataset.index).toBe("2");
  });

  test("switches slide images to fullscreen sizes", () => {
    const dialog = openWith(["one"]);

    const slide = dialog.querySelector(".popup-slide");
    expect(slide.querySelector("img").getAttribute("sizes")).toBe("100vw");
    expect(slide.querySelector("source").getAttribute("sizes")).toBe("100vw");
  });

  test("leaves the source wrappers untouched", () => {
    const dialog = setUpDialog();
    const wrappers = buildWrappers(["one"]);

    openImagePopup({ wrappers, startIndex: 0 });

    expect(wrappers[0].querySelector("img").getAttribute("sizes")).toBe("auto");
    expect(dialog.open).toBe(true);
  });

  test("labels thumbnails with position and alt text", () => {
    const dialog = openWith(["one", "two"]);

    const labels = [...dialog.querySelectorAll("[data-popup-thumb]")].map(
      (thumb) => thumb.getAttribute("aria-label"),
    );
    expect(labels).toEqual([
      "Show image 1 of 2: one",
      "Show image 2 of 2: two",
    ]);
  });

  test("thumbnails contain a small copy of the image", () => {
    const dialog = openWith(["one", "two"]);

    const img = dialog.querySelector("[data-popup-thumb] img");
    expect(img.alt).toBe("one");
    expect(img.getAttribute("sizes")).toBe("96px");
  });

  test("shows thumbnails and arrows for multiple images", () => {
    const dialog = openWith(["one", "two"]);

    expect(dialog.querySelector("[data-popup-thumbs]").hidden).toBe(false);
    expect(dialog.querySelector('[data-nav="next"]').hidden).toBe(false);
  });

  test("announces the current position", () => {
    const dialog = openWith(["one", "two", "three"], 2);

    expect(dialog.querySelector("[data-popup-status]").textContent).toBe(
      "Image 3 of 3",
    );
  });

  test("disables the prev arrow on the first image only", () => {
    const dialog = openWith(["one", "two"]);

    expect(
      dialog.querySelector('[data-nav="prev"]').getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      dialog.querySelector('[data-nav="next"]').getAttribute("aria-disabled"),
    ).toBe("false");
  });

  test("hides thumbnails and arrows for a single image", () => {
    const dialog = openWith(["one"]);

    expect(dialog.querySelector("[data-popup-thumbs]").hidden).toBe(true);
    expect(dialog.querySelector('[data-nav="prev"]').hidden).toBe(true);
    expect(dialog.querySelector('[data-nav="next"]').hidden).toBe(true);
  });

  test("drops the LQIP background once the full image loads", () => {
    const dialog = openWith(["one"]);
    const wrapper = dialog.querySelector(".popup-slide .image-wrapper");

    dialog.querySelector(".popup-slide img").dispatchEvent(new Event("load"));

    expect(wrapper.style.backgroundImage).toBe("none");
  });

  test("keeps the LQIP background while the image is loading", () => {
    const dialog = openWith(["one"]);
    const wrapper = dialog.querySelector(".popup-slide .image-wrapper");

    expect(wrapper.style.backgroundImage).toContain("data:image/webp");
  });

  test("eager-loads the current image and its neighbours", () => {
    const dialog = openWith(["one", "two", "three", "four", "five"], 1);

    const loadings = [...dialog.querySelectorAll(".popup-slide img")].map(
      (img) => img.getAttribute("loading"),
    );
    expect(loadings).toEqual(["eager", "eager", "eager", "lazy", "lazy"]);
  });
});

describe("keyboard navigation", () => {
  test("ArrowRight moves to the next image", () => {
    const dialog = openWith(["one", "two", "three"]);

    pressKey(dialog, "ArrowRight");

    expect(dialog.dataset.index).toBe("1");
    expect(dialog.querySelector("[data-popup-status]").textContent).toBe(
      "Image 2 of 3",
    );
  });

  test("ArrowLeft stops at the first image", () => {
    const dialog = openWith(["one", "two", "three"]);

    pressKey(dialog, "ArrowLeft");

    expect(dialog.dataset.index).toBe("0");
  });

  test("End jumps to the last image and Home back to the first", () => {
    const dialog = openWith(["one", "two", "three"]);

    pressKey(dialog, "End");
    expect(dialog.dataset.index).toBe("2");
    expect(
      dialog.querySelector('[data-nav="next"]').getAttribute("aria-disabled"),
    ).toBe("true");

    pressKey(dialog, "Home");
    expect(dialog.dataset.index).toBe("0");
  });

  test("swallows handled keys so the page does not also scroll", () => {
    const dialog = openWith(["one", "two"]);

    expect(pressKey(dialog, "ArrowRight")).toBe(false);
    expect(pressKey(dialog, "a")).toBe(true);
  });

  test("initialising twice does not double the listeners", () => {
    const dialog = openWith(["one", "two", "three"]);
    initImagePopup();

    dialog.querySelector('[data-nav="next"]').click();

    expect(dialog.dataset.index).toBe("1");
  });
});

describe("click navigation", () => {
  test("clicking the next arrow advances", () => {
    const dialog = openWith(["one", "two", "three"]);

    dialog.querySelector('[data-nav="next"]').click();

    expect(dialog.dataset.index).toBe("1");
  });

  test("clicking a disabled arrow does nothing", () => {
    const dialog = openWith(["one", "two", "three"]);

    dialog.querySelector('[data-nav="prev"]').click();

    expect(dialog.dataset.index).toBe("0");
    expect(dialog.open).toBe(true);
  });

  test("clicking the prev arrow goes back", () => {
    const dialog = openWith(["one", "two", "three"], 2);

    dialog.querySelector('[data-nav="prev"]').click();

    expect(dialog.dataset.index).toBe("1");
  });

  test("clicking a thumbnail jumps to that image", () => {
    const dialog = openWith(["one", "two", "three"]);

    dialog.querySelectorAll("[data-popup-thumb]")[2].click();

    expect(dialog.dataset.index).toBe("2");
    expect(dialog.querySelectorAll(CURRENT_THUMB).length).toBe(1);
  });

  test("clicking the close button closes the dialog", () => {
    const dialog = openWith(["one", "two"]);

    dialog.querySelector("[data-popup-close]").click();

    expect(dialog.open).toBe(false);
  });

  test("clicking a slide closes the dialog", () => {
    const dialog = openWith(["one", "two"]);

    dialog.querySelector(".popup-slide").click();

    expect(dialog.open).toBe(false);
  });
});

describe("scroll syncing", () => {
  const openWithTrackWidth = (names, startIndex = 0) => {
    const dialog = setUpDialog();
    const track = dialog.querySelector("[data-popup-track]");
    Object.defineProperty(track, "clientWidth", { value: 800 });
    openImagePopup({ wrappers: buildWrappers(names), startIndex });
    return { dialog, track };
  };

  test("thumb-scrolling the track updates the current image", () => {
    const { dialog, track } = openWithTrackWidth(["one", "two", "three"]);

    track.scrollLeft = 800;
    track.dispatchEvent(new Event("scroll"));

    expect(dialog.dataset.index).toBe("1");
  });

  test("jumps straight to the start slide on open", () => {
    const { track } = openWithTrackWidth(["one", "two", "three"], 2);

    expect(track.scrollLeft).toBe(1600);
  });

  test("scrolls the track when navigating by keyboard", () => {
    const { dialog, track } = openWithTrackWidth(["one", "two", "three"]);

    pressKey(dialog, "ArrowRight");

    expect(track.scrollLeft).toBe(800);
  });

  test("keeps the current thumbnail centered in the strip", () => {
    const { dialog } = openWithTrackWidth(["one", "two", "three"]);
    const thumbs = dialog.querySelector("[data-popup-thumbs]");
    Object.defineProperty(thumbs, "clientWidth", { value: 300 });
    const second = dialog.querySelectorAll("[data-popup-thumb]")[1];
    Object.defineProperty(second, "offsetLeft", { value: 400 });
    Object.defineProperty(second, "offsetWidth", { value: 100 });

    pressKey(dialog, "ArrowRight");

    expect(thumbs.scrollLeft).toBe(300);
  });

  test("ignores scroll events before the track has a layout", () => {
    const dialog = openWith(["one", "two"], 1);
    const track = dialog.querySelector("[data-popup-track]");

    track.dispatchEvent(new Event("scroll"));

    expect(dialog.dataset.index).toBe("1");
  });
});

describe("closing", () => {
  test("empties the track and thumbnails", () => {
    const dialog = openWith(["one", "two"]);

    dialog.close();

    expect(dialog.querySelectorAll(".popup-slide").length).toBe(0);
    expect(dialog.querySelectorAll("[data-popup-thumb]").length).toBe(0);
  });

  test("returns focus to the trigger element", () => {
    const dialog = setUpDialog();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);

    openImagePopup({
      wrappers: buildWrappers(["one"]),
      startIndex: 0,
      trigger,
    });
    dialog.close();

    expect(document.activeElement).toBe(trigger);
  });
});
