import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
//#region src/pages/sitemap.xml.ts
var sitemap_xml_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var routes = Object.keys({ "./index.astro": 0 }).filter((file) => !/\[|\/_/.test(file)).map((file) => file.slice(1).replace(/(index)?\.astro$/, "").replace(/([^/])$/, "$1/"));
var GET = ({ site }) => {
	const body = [
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		"<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
		...routes.map((route) => `  <url><loc>${new URL(route, site).href}</loc></url>`),
		"</urlset>",
		""
	].join("\n");
	return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
//#endregion
//#region \0virtual:astro:page:src/pages/sitemap.xml@_@ts
var page = () => sitemap_xml_exports;
//#endregion
export { page };
