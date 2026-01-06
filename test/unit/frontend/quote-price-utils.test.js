// Quote price utilities tests
// Tests the field details collection and display functions

import { describe, expect, mock, test } from "bun:test";
import {
  collectFieldDetails,
  getFieldLabel,
  getFieldValue,
  setupDetailsBlurHandlers,
} from "#public/utils/quote-price-utils.js";

describe("quote-price-utils", () => {
  // ----------------------------------------
  // getFieldValue Tests (with DOM)
  // ----------------------------------------
  describe("getFieldValue", () => {
    test("returns value for text input", () => {
      document.body.innerHTML = '<input type="text" id="name" value="John" />';
      const field = document.getElementById("name");
      expect(getFieldValue(field)).toBe("John");
    });

    test("returns empty string for empty input", () => {
      document.body.innerHTML = '<input type="text" id="name" value="" />';
      const field = document.getElementById("name");
      expect(getFieldValue(field)).toBe("");
    });

    test("returns checked radio value", () => {
      document.body.innerHTML = `
        <input type="radio" name="pref" value="A" />
        <input type="radio" name="pref" value="B" checked />
      `;
      const field = document.querySelector('input[type="radio"]');
      expect(getFieldValue(field)).toBe("B");
    });

    test("returns empty string for unchecked radio group", () => {
      document.body.innerHTML = `
        <input type="radio" name="pref" value="A" />
        <input type="radio" name="pref" value="B" />
      `;
      const field = document.querySelector('input[type="radio"]');
      expect(getFieldValue(field)).toBe("");
    });

    test("returns selected option text for select", () => {
      document.body.innerHTML = `
        <select id="event_type">
          <option value="">Choose...</option>
          <option value="wedding" selected>Wedding</option>
        </select>
      `;
      const field = document.getElementById("event_type");
      expect(getFieldValue(field)).toBe("Wedding");
    });

    test("returns first option text when no selection", () => {
      document.body.innerHTML = `
        <select id="event_type">
          <option value="">Choose...</option>
        </select>
      `;
      const field = document.getElementById("event_type");
      expect(getFieldValue(field)).toBe("Choose...");
    });

    test("returns value for textarea", () => {
      document.body.innerHTML =
        '<textarea id="message">Hello World</textarea>';
      const field = document.getElementById("message");
      expect(getFieldValue(field)).toBe("Hello World");
    });
  });

  // ----------------------------------------
  // getFieldLabel Tests (with DOM)
  // ----------------------------------------
  describe("getFieldLabel", () => {
    test("returns label text for field with label", () => {
      document.body.innerHTML = `
        <label for="name">Your Name</label>
        <input id="name" type="text" />
      `;
      const field = document.getElementById("name");
      expect(getFieldLabel(field)).toBe("Your Name");
    });

    test("returns field id when no label exists", () => {
      document.body.innerHTML = '<input id="orphan" type="text" />';
      const field = document.getElementById("orphan");
      expect(getFieldLabel(field)).toBe("orphan");
    });

    test("returns legend text for radio button", () => {
      document.body.innerHTML = `
        <fieldset>
          <legend>Contact Preference</legend>
          <input type="radio" name="contact" value="Email" />
        </fieldset>
      `;
      const field = document.querySelector('input[type="radio"]');
      expect(getFieldLabel(field)).toBe("Contact Preference");
    });

    test("returns radio name when no legend exists", () => {
      document.body.innerHTML =
        '<input type="radio" name="orphan_radio" value="A" />';
      const field = document.querySelector('input[type="radio"]');
      expect(getFieldLabel(field)).toBe("orphan_radio");
    });
  });

  // ----------------------------------------
  // collectFieldDetails Tests (with DOM)
  // ----------------------------------------
  describe("collectFieldDetails", () => {
    test("collects details from text inputs with values", () => {
      document.body.innerHTML = `
        <div class="container">
          <label for="name">Your Name</label>
          <input id="name" type="text" value="John Doe" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Your Name", value: "John Doe" }]);
    });

    test("excludes empty fields", () => {
      document.body.innerHTML = `
        <div class="container">
          <label for="name">Your Name</label>
          <input id="name" type="text" value="" />
          <label for="email">Email</label>
          <input id="email" type="text" value="test@example.com" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Email", value: "test@example.com" }]);
    });

    test("collects multiple filled fields in order", () => {
      document.body.innerHTML = `
        <div class="container">
          <label for="name">Your Name</label>
          <input id="name" type="text" value="Jane" />
          <label for="email">Email</label>
          <input id="email" type="email" value="jane@test.com" />
          <label for="phone">Phone</label>
          <input id="phone" type="tel" value="555-1234" />
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([
        { key: "Your Name", value: "Jane" },
        { key: "Email", value: "jane@test.com" },
        { key: "Phone", value: "555-1234" },
      ]);
    });

    test("collects checked radio value", () => {
      document.body.innerHTML = `
        <div class="container">
          <fieldset>
            <legend>Preferred Contact</legend>
            <input type="radio" name="contact" value="Email" checked />
            <input type="radio" name="contact" value="Phone" />
          </fieldset>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Preferred Contact", value: "Email" }]);
    });

    test("excludes unchecked radio groups", () => {
      document.body.innerHTML = `
        <div class="container">
          <fieldset>
            <legend>Preferred Contact</legend>
            <input type="radio" name="contact" value="Email" />
            <input type="radio" name="contact" value="Phone" />
          </fieldset>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([]);
    });

    test("deduplicates radio buttons by name", () => {
      document.body.innerHTML = `
        <div class="container">
          <fieldset>
            <legend>Preference</legend>
            <input type="radio" name="pref" value="A" checked />
            <input type="radio" name="pref" value="B" />
            <input type="radio" name="pref" value="C" />
          </fieldset>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details.length).toBe(1);
      expect(details[0]).toEqual({ key: "Preference", value: "A" });
    });

    test("collects select field value", () => {
      document.body.innerHTML = `
        <div class="container">
          <label for="event_type">Event Type</label>
          <select id="event_type">
            <option value="">Choose...</option>
            <option value="wedding" selected>Wedding</option>
          </select>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Event Type", value: "Wedding" }]);
    });

    test("collects textarea value", () => {
      document.body.innerHTML = `
        <div class="container">
          <label for="message">Message</label>
          <textarea id="message">Hello there</textarea>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([{ key: "Message", value: "Hello there" }]);
    });

    test("excludes empty textarea", () => {
      document.body.innerHTML = `
        <div class="container">
          <label for="message">Message</label>
          <textarea id="message"></textarea>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([]);
    });

    test("returns empty array for container with no fields", () => {
      document.body.innerHTML = '<div class="container"><p>No fields</p></div>';
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([]);
    });

    test("collects mixed field types", () => {
      document.body.innerHTML = `
        <div class="container">
          <label for="name">Name</label>
          <input id="name" type="text" value="John" />
          <label for="event">Event</label>
          <select id="event">
            <option value="">Choose...</option>
            <option value="party" selected>Party</option>
          </select>
          <fieldset>
            <legend>Contact</legend>
            <input type="radio" name="contact" value="Email" checked />
          </fieldset>
          <label for="notes">Notes</label>
          <textarea id="notes">Some notes</textarea>
        </div>
      `;
      const container = document.querySelector(".container");
      const details = collectFieldDetails(container);
      expect(details).toEqual([
        { key: "Name", value: "John" },
        { key: "Event", value: "Party" },
        { key: "Contact", value: "Email" },
        { key: "Notes", value: "Some notes" },
      ]);
    });
  });

  // ----------------------------------------
  // setupDetailsBlurHandlers Tests (with DOM)
  // ----------------------------------------
  describe("setupDetailsBlurHandlers", () => {
    test("does nothing when no form container exists", () => {
      document.body.innerHTML = "<div>No form here</div>";
      expect(() => setupDetailsBlurHandlers()).not.toThrow();
    });

    test("attaches blur handler to form container", () => {
      document.body.innerHTML = `
        <form>
          <input id="name" type="text" />
        </form>
        <div id="quote-price-container"></div>
      `;
      const getDays = mock(() => 1);
      setupDetailsBlurHandlers(getDays);
      const field = document.getElementById("name");

      // Trigger blur event
      field.dispatchEvent(new FocusEvent("blur", { bubbles: false }));

      // getDays should have been called
      expect(getDays).toHaveBeenCalled();
    });

    test("attaches change handler for radio buttons", () => {
      document.body.innerHTML = `
        <form>
          <input type="radio" name="pref" value="A" />
          <input type="radio" name="pref" value="B" />
        </form>
        <div id="quote-price-container"></div>
      `;
      const getDays = mock(() => 2);
      setupDetailsBlurHandlers(getDays);
      const radio = document.querySelector('input[type="radio"]');

      // Trigger change event
      radio.dispatchEvent(new Event("change", { bubbles: true }));

      expect(getDays).toHaveBeenCalled();
    });

    test("attaches change handler for select elements", () => {
      document.body.innerHTML = `
        <form>
          <select id="event">
            <option value="a">A</option>
            <option value="b">B</option>
          </select>
        </form>
        <div id="quote-price-container"></div>
      `;
      const getDays = mock(() => 3);
      setupDetailsBlurHandlers(getDays);
      const select = document.getElementById("event");

      // Trigger change event
      select.dispatchEvent(new Event("change", { bubbles: true }));

      expect(getDays).toHaveBeenCalled();
    });

    test("uses quote-steps container if available", () => {
      document.body.innerHTML = `
        <div class="quote-steps">
          <input id="name" type="text" />
        </div>
        <div id="quote-price-container"></div>
      `;
      const getDays = mock(() => 1);
      setupDetailsBlurHandlers(getDays);
      const field = document.getElementById("name");

      field.dispatchEvent(new FocusEvent("blur", { bubbles: false }));

      expect(getDays).toHaveBeenCalled();
    });
  });
});
