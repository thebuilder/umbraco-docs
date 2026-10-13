import { defineOgConfig } from "@thebuilder/umbraco-docs/og";
import { fileURLToPath } from "node:url";

export default defineOgConfig({
  contentDir: fileURLToPath(new URL("./src/pages", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  prefix: "/og",
  brand: "TheBuilder · Umbraco",
  logo: "/mark.svg",
  root: {
    title: "Umbraco packages",
    description: "Focused packages for modern Umbraco projects.",
  },
});
