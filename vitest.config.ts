import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.ui.test.{tsx,jsx}"],
    setupFiles: ["tests/ui-setup.ts"],
    environmentOptions: { jsdom: { url: "http://localhost/#wardrobe" } },
  },
});
