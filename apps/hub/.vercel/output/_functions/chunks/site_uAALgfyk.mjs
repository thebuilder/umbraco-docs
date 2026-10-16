//#region src/format.ts
var statusLabels = {
	preview: "Preview",
	stable: "Stable",
	maintenance: "Maintenance",
	deprecated: "Deprecated"
};
function formatUmbraco(range) {
	const openEnded = /^>=(\d+(?:\.\d+)*)$/.exec(range.trim());
	if (openEnded) return `Umbraco ${openEnded[1]} or later`;
	const match = /^>=((\d+)(?:\.\d+)*)\s+<(\d+)$/.exec(range.trim());
	if (!match) return `Umbraco ${range}`;
	const [, lower, lowerMajor, upperMajor] = match;
	const lastMajor = Number(upperMajor) - 1;
	if (Number(lowerMajor) !== lastMajor) return `Umbraco ${lower} to ${lastMajor}.x`;
	return lower === lowerMajor ? `Umbraco ${lastMajor}` : `Umbraco ${lastMajor} (from ${lower})`;
}
function docsLabel(item) {
	const repo = item.links.github.replace(/\/$/, "");
	return item.links.docs === repo || item.links.docs.startsWith(`${repo}#`) || item.links.docs.startsWith(`${repo}/`) ? "README" : "Docs";
}
//#endregion
//#region src/site.ts
var tagline = "Small, focused packages for Umbraco, from backoffice extensions to headless frontend tools. Each one solves a single problem and ships its own docs.";
var U = {
	left: 60,
	right: 196,
	top: 44,
	bend: 136,
	width: 36
};
var RADIUS = (U.right - U.left) / 2;
/** The U streams from one tip to the other along its center line. */
var markFlow = {
	path: `M${U.left} ${U.top}V${U.bend}A${RADIUS} ${RADIUS} 0 0 0 ${U.right} ${U.bend}V${U.top}`,
	width: U.width,
	viewBox: 256
};
//#endregion
export { statusLabels as a, formatUmbraco as i, tagline as n, docsLabel as r, markFlow as t };
