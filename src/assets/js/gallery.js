import { onReady } from "./on-ready.js";

let gallery, currentImage, imagePopup;

const loadImage = (event) => {
  const imageLink = event.target.closest(".image-link");
  if (!imageLink) return;

  event.preventDefault();

  const index = imageLink.getAttribute("data-index");
  const fullImage = document.querySelector(`.full-image-${index}`);

  if (!fullImage) return;

  currentImage.innerHTML = fullImage.innerHTML;

  const rect = currentImage.getBoundingClientRect();
  if (Math.abs(rect.top) > 50) {
    currentImage.scrollIntoView({ behavior: "smooth" });
  }
};

const openPopup = (event) => {
  if (!imagePopup) return;

  // Find the largest image src from srcset
  const picture = currentImage.querySelector("picture");
  if (!picture) return;

  const img = picture.querySelector("img");
  if (!img) return;

  // Get srcset and find the largest image
  const sources = picture.querySelectorAll("source");
  let largestSrc = img.src;
  let largestWidth = 0;

  sources.forEach((source) => {
    const srcset = source.getAttribute("srcset");
    if (!srcset) return;

    // Parse srcset to find largest image
    srcset.split(",").forEach((entry) => {
      const parts = entry.trim().split(/\s+/);
      if (parts.length >= 2) {
        const width = parseInt(parts[1], 10);
        if (width > largestWidth) {
          largestWidth = width;
          largestSrc = parts[0];
        }
      }
    });
  });

  const popupImg = imagePopup.querySelector("img");
  popupImg.src = largestSrc;
  popupImg.alt = img.alt || "";

  imagePopup.showModal();
};

const closePopup = () => {
  if (imagePopup) {
    imagePopup.close();
  }
};

const initGallery = () => {
  gallery = document.getElementById("gallery");
  currentImage = document.querySelector(".current-image");
  imagePopup = document.getElementById("image-popup");

  if (!gallery || !currentImage) return;

  gallery.removeEventListener("click", loadImage);
  gallery.addEventListener("click", loadImage);

  // Image popup functionality
  if (currentImage && imagePopup) {
    currentImage.removeEventListener("click", openPopup);
    currentImage.addEventListener("click", openPopup);

    // Close on backdrop or image click
    imagePopup.removeEventListener("click", closePopup);
    imagePopup.addEventListener("click", closePopup);
  }
};

onReady(initGallery);
