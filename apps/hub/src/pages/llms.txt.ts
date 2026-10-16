import type { APIRoute } from "astro";

import { formatUmbraco } from "../format.ts";
import { packages } from "../packages.ts";
import { tagline } from "../site.ts";

// llms.txt (https://llmstxt.org): the package list as Markdown for language models.
export const GET: APIRoute = ({ site }) => {
  const entries = packages.map((item) => {
    const install = [
      item.links.nuget && `NuGet: ${item.links.nuget}`,
      item.links.npm && `npm: ${item.links.npm}`,
    ].filter(Boolean);
    const details = [`${formatUmbraco(item.compatibility.umbraco)}.`, ...install.map((line) => `${line}.`), `Source: ${item.links.github}.`];
    return `- [${item.name}](${item.links.docs}): ${item.summary} ${details.join(" ")}`;
  });

  const body = [
    "# TheBuilder Umbraco",
    "",
    `> ${tagline}`,
    "",
    "Each link below goes to the package's own documentation, which covers installation and configuration.",
    "",
    "## Packages",
    "",
    ...entries,
    "",
    "## Optional",
    "",
    `- [Package registry](${new URL("/packages.json", site).href}): The same list as JSON, with links, logos, status, and supported versions.`,
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
