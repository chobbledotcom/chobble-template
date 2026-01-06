// Site configuration - reads from JSON injected by config-script.html
const el = document.getElementById("site-config");
const Config = JSON.parse(el.textContent);
export default Config;
