// Quote complete page
// Clears cart after successful quote submission

(function () {
  localStorage.removeItem("shopping_cart");
  var cartIcon = document.getElementById("cart-icon");
  if (cartIcon) {
    cartIcon.style.display = "none";
  }
})();
