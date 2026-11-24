import { docsTheme } from "@thebuilder/umbraco-docs";
import { pageflock } from "@thebuilder/umbraco-docs/analytics";
import { defineConfig } from "blume";
export default defineConfig({ title: "Fixture 2.2.7", description: "Compatibility fixture.", content: { root: "content" }, seo: { og: { enabled: false } }, analytics: [pageflock("fixture-thebuilder-dk")], theme: { ...docsTheme, mode: "system" } });
