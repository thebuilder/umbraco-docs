import { defineUmbracoPackage } from "@thebuilder/umbraco-docs";

// The single list of TheBuilder Umbraco packages. The hub renders it and
// publishes it as /packages.json for package docs sites to read.
export const packages = [
  defineUmbracoPackage({
    id: "thebuilder.blurplaceholder",
    name: "Blur Placeholder",
    summary: "Generate WebP, BlurHash, or ThumbHash placeholders for Umbraco Image media and deliver one frontend-ready string.",
    links: {
      docs: "https://blur.thebuilder.dk/",
      nuget: "https://www.nuget.org/packages/TheBuilder.BlurPlaceholder",
      marketplace: "https://marketplace.umbraco.com/package/thebuilder.blurplaceholder",
      github: "https://github.com/thebuilder/blur-placeholder",
    },
    logo: "/logos/blur-placeholder.svg",
    compatibility: { umbraco: ">=17.1 <19", dotnet: ">=10" },
    status: "stable",
    categories: ["Developer Tools", "Media"],
  }),
  defineUmbracoPackage({
    id: "thebuilder.webanalytics",
    name: "Web Analytics",
    summary: "Connect analytics providers and bring site-wide and page-level insights into the Umbraco backoffice.",
    links: {
      docs: "https://web-analytics.thebuilder.dk/",
      nuget: "https://www.nuget.org/packages/TheBuilder.WebAnalytics",
      marketplace: "https://marketplace.umbraco.com/package/thebuilder.webanalytics",
      github: "https://github.com/thebuilder/web-analytics",
    },
    logo: "/logos/web-analytics.svg",
    compatibility: { umbraco: ">=17.1 <19", dotnet: ">=10" },
    status: "stable",
    categories: ["Analytics", "Editor Tools"],
  }),
  defineUmbracoPackage({
    id: "thebuilder.aiimagedisclosure",
    name: "AI Image Disclosure",
    summary: "Check Umbraco images for signed C2PA claims of AI use. An OpenAI watermark check is optional.",
    links: {
      docs: "https://ai-image-disclosure.thebuilder.dk/",
      github: "https://github.com/thebuilder/umbraco-ai-image-disclosure",
    },
    logo: "/logos/ai-image-disclosure.svg",
    compatibility: { umbraco: ">=17.1 <19", dotnet: ">=10" },
    status: "preview",
    categories: ["Artificial Intelligence", "Editor Tools"],
  }),
  defineUmbracoPackage({
    id: "thebuilder.apptranslations",
    name: "App Translations",
    summary: "Let editors change the text in your application from the Umbraco backoffice, without a code change or a deploy.",
    links: {
      docs: "https://app-translations.thebuilder.dk/",
      github: "https://github.com/thebuilder/umbraco-app-translations",
    },
    logo: "/logos/app-translations.svg",
    compatibility: { umbraco: ">=17.1 <19", dotnet: ">=10" },
    status: "preview",
    categories: ["Editor Tools", "Headless"],
  }),
  defineUmbracoPackage({
    id: "thebuilder.apioidc",
    name: "API OIDC",
    summary: "Let frontends call the Umbraco Delivery API and your own API endpoints with the OIDC token their platform already issues, instead of a shared API key.",
    links: {
      docs: "https://api-oidc.thebuilder.dk/",
      nuget: "https://www.nuget.org/packages/TheBuilder.ApiOidc",
      marketplace: "https://marketplace.umbraco.com/package/thebuilder.apioidc",
      github: "https://github.com/thebuilder/umbraco-api-oidc",
    },
    logo: "/logos/api-oidc.svg",
    compatibility: { umbraco: ">=17.1 <19" },
    status: "preview",
    categories: ["Headless", "Developer Tools"],
  }),
  defineUmbracoPackage({
    id: "charlietango.umbracorichtext",
    name: "Umbraco Rich Text",
    summary: "Render the JSON rich text output from the Umbraco Content Delivery API with React, with full control over blocks and nodes.",
    links: {
      docs: "https://github.com/charlie-tango/umbraco-rich-text#readme",
      npm: "https://www.npmjs.com/package/@charlietango/umbraco-rich-text",
      github: "https://github.com/charlie-tango/umbraco-rich-text",
    },
    logo: "/logos/umbraco-rich-text.svg",
    compatibility: { umbraco: ">=12" },
    status: "stable",
    categories: ["Headless"],
  }),
];
