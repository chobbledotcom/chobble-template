// Site configuration - reads from JSON injected by config-script.html

class Config {
  static #data = null;

  static #load() {
    if (!this.#data) {
      const el = document.getElementById("site-config");
      this.#data = JSON.parse(el.textContent);
    }
    return this.#data;
  }

  static get cart_mode() {
    return this.#load().cart_mode;
  }

  static get checkout_api_url() {
    return this.#load().checkout_api_url;
  }
}

export default Config;
