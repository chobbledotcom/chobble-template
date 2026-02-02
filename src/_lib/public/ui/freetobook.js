// FreeToBook Widget
// Opens a dialog with the FreeToBook availability widget

import { onReady } from "#public/utils/on-ready.js";

const getDialog = () => document.getElementById("freetobook-dialog");

const init = () => {
  document.addEventListener("click", (e) => {
    const button = e.target.closest(".check-availability");
    if (!button) return;

    const dialog = getDialog();
    if (dialog) {
      dialog.showModal();
    }
  });

  const dialog = getDialog();
  if (dialog) {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });
  }
};

onReady(init);
