import { defineOgConfig } from "@thebuilder/umbraco-docs/og";
import { fileURLToPath } from "node:url";

export default defineOgConfig({
  contentDir: fileURLToPath(new URL("./src/pages", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  prefix: "/og",
  brand: "TheBuilder · Umbraco",
  // Rendered from the hero's own shaders by scripts/render-og-backdrop.ts.
  background: "/og/backdrop.png",
  root: {
    title: "Umbraco packages",
    description: "Built to stay out of the way.",
  },
});
