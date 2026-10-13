import { wgslVitePlugin } from "@vgpu/wgsl/loader-vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://umbraco.thebuilder.dk",
  vite: {
    // Prepares .wgsl imports at build time, so the browser never loads the WGSL parser.
    plugins: [wgslVitePlugin({ minify: true })],
  },
});
