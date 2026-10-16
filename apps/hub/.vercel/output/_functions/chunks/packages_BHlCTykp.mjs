//#region ../../packages/umbraco-docs/dist/validation.js
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value) {
	return typeof value === "string" && value.trim().length > 0;
}
function requireRecord(value, field) {
	if (!isRecord(value)) throw new TypeError(`${field} must be an object`);
	return value;
}
function requireString(value, field) {
	if (!isNonEmptyString(value)) throw new TypeError(`${field} must be a non-empty string`);
	return value;
}
//#endregion
//#region ../../packages/umbraco-docs/dist/package.js
var UMBRACO_PACKAGE_STATUSES = [
	"preview",
	"stable",
	"maintenance",
	"deprecated"
];
var stableId = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
var publicRootPath = /^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\s\\?#]+$/;
function isHttpsUrl(value) {
	if (typeof value !== "string") return false;
	try {
		const url = new URL(value);
		return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
	} catch {
		return false;
	}
}
function requireHttpsUrl(value, field) {
	if (!isHttpsUrl(value)) throw new TypeError(`${field} must be an absolute https URL`);
	return value;
}
function requireStatus(value) {
	const status = UMBRACO_PACKAGE_STATUSES.find((candidate) => candidate === value);
	if (!status) throw new TypeError("status is invalid");
	return status;
}
function validateUmbracoPackage(value) {
	const input = requireRecord(value, "package");
	const id = requireString(input.id, "id");
	if (!stableId.test(id)) throw new TypeError("id must be a stable lowercase dotted or dashed identifier");
	const logo = requireString(input.logo, "logo");
	if (!publicRootPath.test(logo) && !isHttpsUrl(logo)) throw new TypeError("logo must be a safe public-root path beginning with one /, or an absolute https URL");
	const rawLinks = requireRecord(input.links, "links");
	const nuget = rawLinks.nuget === void 0 ? void 0 : requireHttpsUrl(rawLinks.nuget, "links.nuget");
	const marketplace = rawLinks.marketplace === void 0 ? void 0 : requireHttpsUrl(rawLinks.marketplace, "links.marketplace");
	const npm = rawLinks.npm === void 0 ? void 0 : requireHttpsUrl(rawLinks.npm, "links.npm");
	const links = Object.freeze({
		docs: requireHttpsUrl(rawLinks.docs, "links.docs"),
		...nuget === void 0 ? {} : { nuget },
		...marketplace === void 0 ? {} : { marketplace },
		...npm === void 0 ? {} : { npm },
		github: requireHttpsUrl(rawLinks.github, "links.github")
	});
	const rawCompatibility = requireRecord(input.compatibility, "compatibility");
	const dotnet = rawCompatibility.dotnet === void 0 ? void 0 : requireString(rawCompatibility.dotnet, "compatibility.dotnet");
	const compatibility = Object.freeze({
		umbraco: requireString(rawCompatibility.umbraco, "compatibility.umbraco"),
		...dotnet === void 0 ? {} : { dotnet }
	});
	const status = requireStatus(input.status);
	const rawCategories = input.categories;
	if (rawCategories !== void 0 && (!Array.isArray(rawCategories) || rawCategories.some((category) => !isNonEmptyString(category)))) throw new TypeError("categories must contain only non-empty strings");
	return Object.freeze({
		id,
		name: requireString(input.name, "name"),
		summary: requireString(input.summary, "summary"),
		links,
		logo,
		compatibility,
		status,
		...rawCategories === void 0 ? {} : { categories: Object.freeze(rawCategories.map((category) => requireString(category, "category"))) }
	});
}
function defineUmbracoPackage(value) {
	return validateUmbracoPackage(value);
}
//#endregion
//#region src/packages.ts
var packages = [
	defineUmbracoPackage({
		id: "thebuilder.blurplaceholder",
		name: "Blur Placeholder",
		summary: "Generate WebP, BlurHash, or ThumbHash placeholders for Umbraco Image media and deliver one frontend-ready string.",
		links: {
			docs: "https://blur.thebuilder.dk/",
			nuget: "https://www.nuget.org/packages/TheBuilder.BlurPlaceholder",
			marketplace: "https://marketplace.umbraco.com/package/thebuilder.blurplaceholder",
			github: "https://github.com/thebuilder/blur-placeholder"
		},
		logo: "/logos/blur-placeholder.svg",
		compatibility: {
			umbraco: ">=17.1 <19",
			dotnet: ">=10"
		},
		status: "stable",
		categories: ["Developer Tools", "Media"]
	}),
	defineUmbracoPackage({
		id: "thebuilder.webanalytics",
		name: "Web Analytics",
		summary: "Connect analytics providers and bring site-wide and page-level insights into the Umbraco backoffice.",
		links: {
			docs: "https://web-analytics.thebuilder.dk/",
			nuget: "https://www.nuget.org/packages/TheBuilder.WebAnalytics",
			marketplace: "https://marketplace.umbraco.com/package/thebuilder.webanalytics",
			github: "https://github.com/thebuilder/web-analytics"
		},
		logo: "/logos/web-analytics.svg",
		compatibility: {
			umbraco: ">=17.1 <19",
			dotnet: ">=10"
		},
		status: "stable",
		categories: ["Analytics", "Editor Tools"]
	}),
	defineUmbracoPackage({
		id: "thebuilder.aiimagedisclosure",
		name: "AI Image Disclosure",
		summary: "Check Umbraco images for signed C2PA claims of AI use. An OpenAI watermark check is optional.",
		links: {
			docs: "https://ai-image-disclosure.thebuilder.dk/",
			github: "https://github.com/thebuilder/umbraco-ai-image-disclosure"
		},
		logo: "/logos/ai-image-disclosure.svg",
		compatibility: {
			umbraco: ">=17.1 <19",
			dotnet: ">=10"
		},
		status: "preview",
		categories: ["Artificial Intelligence", "Editor Tools"]
	}),
	defineUmbracoPackage({
		id: "thebuilder.apptranslations",
		name: "App Translations",
		summary: "Let editors change the text in your application from the Umbraco backoffice, without a code change or a deploy.",
		links: {
			docs: "https://app-translations.thebuilder.dk/",
			nuget: "https://www.nuget.org/packages/TheBuilder.AppTranslations",
			marketplace: "https://marketplace.umbraco.com/package/thebuilder.apptranslations",
			github: "https://github.com/thebuilder/umbraco-app-translations"
		},
		logo: "/logos/app-translations.svg",
		compatibility: {
			umbraco: ">=17.1 <19",
			dotnet: ">=10"
		},
		status: "preview",
		categories: ["Editor Tools", "Headless"]
	}),
	defineUmbracoPackage({
		id: "thebuilder.apioidc",
		name: "API OIDC",
		summary: "Let frontends call the Umbraco Delivery API and your own API endpoints with the OIDC token their platform already issues, instead of a shared API key.",
		links: {
			docs: "https://api-oidc.thebuilder.dk/",
			nuget: "https://www.nuget.org/packages/TheBuilder.ApiOidc",
			marketplace: "https://marketplace.umbraco.com/package/thebuilder.apioidc",
			github: "https://github.com/thebuilder/umbraco-api-oidc"
		},
		logo: "/logos/api-oidc.svg",
		compatibility: { umbraco: ">=17.1 <19" },
		status: "preview",
		categories: ["Headless", "Developer Tools"]
	}),
	defineUmbracoPackage({
		id: "charlietango.umbracorichtext",
		name: "Umbraco Rich Text",
		summary: "Render the JSON rich text output from the Umbraco Content Delivery API with React, with full control over blocks and nodes.",
		links: {
			docs: "https://github.com/charlie-tango/umbraco-rich-text#readme",
			npm: "https://www.npmjs.com/package/@charlietango/umbraco-rich-text",
			github: "https://github.com/charlie-tango/umbraco-rich-text"
		},
		logo: "/logos/umbraco-rich-text.svg",
		compatibility: { umbraco: ">=12" },
		status: "stable",
		categories: ["Headless"]
	})
];
//#endregion
export { packages as t };
