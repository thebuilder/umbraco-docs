import { docsTheme } from "@thebuilder/umbraco-docs";
import { defineConfig } from "blume";
export default defineConfig({ title: "Fixture 2.2.3", description: "Compatibility fixture.", content: { root: "content" }, seo: { og: { enabled: false } }, theme: { ...docsTheme, mode: "system" } });
