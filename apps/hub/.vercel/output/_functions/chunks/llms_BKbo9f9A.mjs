import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { a as statusLabels, i as formatUmbraco, n as tagline } from "./site_uAALgfyk.mjs";
import { t as packages } from "./packages_BHlCTykp.mjs";
//#region src/pages/llms.txt.ts
var llms_txt_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = ({ site }) => {
	const entries = packages.map((item) => {
		const install = [item.links.nuget && `NuGet: ${item.links.nuget}`, item.links.npm && `npm: ${item.links.npm}`].filter(Boolean);
		const details = [
			`${statusLabels[item.status]}, ${formatUmbraco(item.compatibility.umbraco)}.`,
			...install.map((line) => `${line}.`),
			`Source: ${item.links.github}.`
		];
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
		""
	].join("\n");
	return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
//#endregion
//#region \0virtual:astro:page:src/pages/llms.txt@_@ts
var page = () => llms_txt_exports;
//#endregion
export { page };
