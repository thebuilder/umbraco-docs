import type { UmbracoPackage } from "@thebuilder/umbraco-docs";

export function docsLabel(item: UmbracoPackage): string {
  const repo = item.links.github.replace(/\/$/, "");
  const inRepo = item.links.docs === repo || item.links.docs.startsWith(`${repo}#`) || item.links.docs.startsWith(`${repo}/`);
  return inRepo ? "README" : "Docs";
}
