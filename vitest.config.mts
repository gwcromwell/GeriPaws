import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/src/**/*.test.ts", "apps/**/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // Pin the runtime's local timezone so date/timezone-math tests are
    // hermetic — several of them construct `Date`s from date-only strings,
    // which are parsed as UTC but then manipulated with local-time setters,
    // so the *runner's* zone can otherwise change the result.
    env: { TZ: "UTC" },
  },
});
