(function () {
  var form = document.getElementById("search-form");
  if (!form) return;

  var keywordsDatalist = document.getElementById("keywords");
  if (!keywordsDatalist) return;

  var normalise = function (str) {
    return str
      .toLowerCase()
      .replace(/-/g, " ")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  var validKeywords = Array.from(keywordsDatalist.options).map(function (opt) {
    return normalise(opt.value);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("keyword");
    var keyword = normalise(input.value);
    var errorEl = document.getElementById("search-error");

    if (keyword && validKeywords.includes(keyword)) {
      errorEl.style.display = "none";
      window.location.href =
        "/search/" + encodeURIComponent(keyword.replace(/ /g, "-")) + "/";
    } else {
      errorEl.style.display = "block";
      input.focus();
    }
  });
})();
