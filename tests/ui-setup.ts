import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true,
  value() {
    this.setAttribute("open", "");
  },
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
  configurable: true,
  value() {
    this.removeAttribute("open");
  },
});
Object.defineProperty(window, "confirm", {
  configurable: true,
  value: vi.fn(() => true),
});
afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/#wardrobe");
  vi.clearAllMocks();
});
