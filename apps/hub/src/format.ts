import type { UmbracoPackage } from "@thebuilder/umbraco-docs";

export const statusLabels: Record<UmbracoPackage["status"], string> = {
  preview: "Preview",
  stable: "Stable",
  maintenance: "Maintenance",
  deprecated: "Deprecated",
};

// Turns ">=17.1 <19" into "Umbraco 17.1 to 18.x", ">=17.5 <18" into
// "Umbraco 17 (from 17.5)" and ">=17.5" into "Umbraco 17.5 or later";
// anything else is shown as written.
export function formatUmbraco(range: string): string {
  const openEnded = /^>=(\d+(?:\.\d+)*)$/.exec(range.trim());
  if (openEnded) return `Umbraco ${openEnded[1]} or later`;
  const match = /^>=((\d+)(?:\.\d+)*)\s+<(\d+)$/.exec(range.trim());
  if (!match) return `Umbraco ${range}`;
  const [, lower, lowerMajor, upperMajor] = match;
  const lastMajor = Number(upperMajor) - 1;
  if (Number(lowerMajor) !== lastMajor) return `Umbraco ${lower} to ${lastMajor}.x`;
  return lower === lowerMajor ? `Umbraco ${lastMajor}` : `Umbraco ${lastMajor} (from ${lower})`;
}

export function docsLabel(item: UmbracoPackage): string {
  const repo = item.links.github.replace(/\/$/, "");
  const inRepo = item.links.docs === repo || item.links.docs.startsWith(`${repo}#`) || item.links.docs.startsWith(`${repo}/`);
  return inRepo ? "README" : "Docs";
}
