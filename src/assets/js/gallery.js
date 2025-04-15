(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const gallerySwitcherLinks = document.querySelectorAll(".gallery-switcher");
    const currentImage = document.querySelector(".current-image");
    if (!currentImage) return;
    gallerySwitcherLinks.forEach((el) => {
      el.addEventListener("click", (event) => {
        const imageLink = event.target.closest(".image-link");
        event.preventDefault();
        const index = imageLink.getAttribute("data-index");
        const fullImage = document.querySelector(`.full-image-${index}`);
        currentImage.innerHTML = fullImage.innerHTML;
        currentImage.scrollIntoView({ behavior: "smooth" });
      });
    });
  });
})();
