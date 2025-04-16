(() => {
	const initGallery = () => {
		const gallery = document.getElementById("gallery");
		const currentImage = document.querySelector(".current-image");

		if (!gallery || !currentImage) return;

		gallery.addEventListener("click", (event) => {
			const imageLink = event.target.closest(".image-link");

			if (imageLink) {
				event.preventDefault();

				const index = imageLink.getAttribute("data-index");
				const fullImage = document.querySelector(`.full-image-${index}`);

				if (fullImage) {
					currentImage.innerHTML = fullImage.innerHTML;
					currentImage.scrollIntoView({ behavior: "smooth" });
				}
			}
		});
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initGallery);
	} else {
		initGallery();
	}
})();
