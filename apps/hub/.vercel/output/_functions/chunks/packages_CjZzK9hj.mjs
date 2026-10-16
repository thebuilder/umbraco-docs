import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as packages } from "./packages_BHlCTykp.mjs";
//#region src/pages/packages.json.ts
var packages_json_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = ({ site }) => {
	const registry = {
		version: 1,
		packages: packages.map((item) => ({
			...item,
			logo: new URL(item.logo, site).href
		}))
	};
	return new Response(`${JSON.stringify(registry, null, 2)}\n`, { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
//#endregion
//#region \0virtual:astro:page:src/pages/packages.json@_@ts
var page = () => packages_json_exports;
//#endregion
export { page };
