import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Playwright の e2e テストを除外
    exclude: ["**/node_modules/**", "**/tests/e2e/**", "**/*.e2e.spec.*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/tests/e2e/**", "**/.next/**", "**/node_modules/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
