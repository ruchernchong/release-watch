import { defineConfig } from "nitro";

export default defineConfig({
  // modules: ["workflow/nitro"],
  alias: {
    "@api": "./src",
  },
  routes: {
    "/**": "./src/index.ts",
  },
});
