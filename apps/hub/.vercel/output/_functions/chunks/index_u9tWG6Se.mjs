import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { C as createAstro, a as Fragment, c as renderSlot, d as renderTemplate, f as maybeRenderHead, h as createRenderInstruction, i as renderComponent, m as addAttribute, p as renderHead } from "./server_BipkryXT.mjs";
import { t as createComponent } from "./compiler_DVh95OHi.mjs";
import { a as statusLabels, i as formatUmbraco, n as tagline, r as docsLabel, t as markFlow } from "./site_uAALgfyk.mjs";
import { t as packages } from "./packages_BHlCTykp.mjs";
//#region ../../node_modules/.pnpm/astro@7.3.8_@types+node@24.13.3_@vercel+functions@3.9.11_esbuild@0.28.2_jiti@2.7.0_yaml@2.9.1/node_modules/astro/dist/runtime/server/render/script.js
/**
* Relies on the `renderScript: true` compiler option
* @experimental
*/
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
//#endregion
//#region ../../packages/umbraco-docs/components/HeroParticles.astro
createAstro("https://umbraco.thebuilder.dk");
var $$HeroParticles = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HeroParticles;
	const { logo, flow } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<div class="udocs-particles" data-udocs-particles${addAttribute(logo, "data-logo")}${addAttribute(flow ? JSON.stringify(flow) : void 0, "data-flow")} aria-hidden="true"><img class="udocs-particles__fallback"${addAttribute(logo, "src")} alt="" decoding="async"><canvas class="udocs-particles__canvas"></canvas></div>${renderScript($$result, "/vercel/sandbox/primary/packages/umbraco-docs/components/HeroParticles.astro?astro&type=script&index=0&lang.ts")}`;
}, "/vercel/sandbox/primary/packages/umbraco-docs/components/HeroParticles.astro", void 0);
//#endregion
//#region ../../packages/umbraco-docs/components/LandingHero.astro
createAstro("https://umbraco.thebuilder.dk");
var $$LandingHero = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$LandingHero;
	const { title, eyebrow, description, logo, logoAlt = "", accent, compatibility, layout = "centered" } = Astro.props;
	const split = layout === "split";
	return renderTemplate`${maybeRenderHead($$result)}<section class="udocs-hero"${addAttribute(layout, "data-layout")} aria-labelledby="udocs-hero-title">${renderSlot($$result, $$slots["background"])}<div class="udocs-hero__glow" aria-hidden="true"></div><div class="udocs-shell udocs-hero__inner"><div class="udocs-hero__copy">${logo && !split && renderTemplate`<img class="udocs-hero__logo"${addAttribute(logo, "src")} width="72" height="72"${addAttribute(logoAlt, "alt")} data-udocs-reveal>`}${eyebrow && renderTemplate`<p class="udocs-hero__eyebrow" data-udocs-reveal>${eyebrow}</p>`}<h1 id="udocs-hero-title" class="udocs-hero__title" data-udocs-reveal>${title}${accent && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` <span class="udocs-hero__accent">${accent}</span>` })}`}</h1>${description && renderTemplate`<p class="udocs-hero__description" data-udocs-reveal>${description}</p>`}<div class="udocs-hero__actions" data-udocs-reveal>${renderSlot($$result, $$slots["actions"])}</div>${renderSlot($$result, $$slots["install"])}${compatibility && renderTemplate`<p class="udocs-hero__compatibility" data-udocs-reveal>${compatibility}</p>`}</div>${split && renderTemplate`<div class="udocs-hero__art" data-udocs-hero-art>${logo && renderTemplate`<img class="udocs-hero__art-logo"${addAttribute(logo, "src")}${addAttribute(logoAlt, "alt")} data-udocs-reveal>`}</div>`}</div>${renderSlot($$result, $$slots["default"])}</section>`;
}, "/vercel/sandbox/primary/packages/umbraco-docs/components/LandingHero.astro", void 0);
//#endregion
//#region ../../packages/umbraco-docs/components/LandingRoot.astro
createAstro("https://umbraco.thebuilder.dk");
var $$LandingRoot = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$LandingRoot;
	const { class: className } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(["udocs-landing", className], "class:list")} data-udocs-root><script>
    // Hide reveal targets before they first paint, so they animate in rather than out. The reveal
    // behavior takes over when it loads; if it never does, show everything instead.
    (() => {
      const root = document.currentScript.parentElement;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
      root.dataset.udocsMotion = "true";
      setTimeout(() => { if (!root.dataset.udocsObserved) root.dataset.udocsMotion = "false"; }, 3000);
    })();
  <\/script>${renderSlot($$result, $$slots["default"])}</div>${renderScript($$result, "/vercel/sandbox/primary/packages/umbraco-docs/components/LandingRoot.astro?astro&type=script&index=0&lang.ts")}`;
}, "/vercel/sandbox/primary/packages/umbraco-docs/components/LandingRoot.astro", void 0);
//#endregion
//#region ../../packages/umbraco-docs/components/SectionHeading.astro
createAstro("https://umbraco.thebuilder.dk");
var $$SectionHeading = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$SectionHeading;
	const { id, title, description, align = "center" } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<header${addAttribute(["udocs-section-heading", `udocs-section-heading--${align}`], "class:list")} data-udocs-reveal><span class="udocs-section-heading__rule" aria-hidden="true"></span><h2${addAttribute(id, "id")}>${title}</h2>${description && renderTemplate`<p>${description}</p>`}</header>`;
}, "/vercel/sandbox/primary/packages/umbraco-docs/components/SectionHeading.astro", void 0);
//#endregion
//#region ../../node_modules/.pnpm/@vercel+analytics@2.0.1_react@19.3.0/node_modules/@vercel/analytics/dist/astro/index.astro
createAstro("https://umbraco.thebuilder.dk");
var $$Index$1 = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index$1;
	const propsStr = JSON.stringify(Astro.props);
	const paramsStr = JSON.stringify(Astro.params);
	return renderTemplate`${renderComponent($$result, "vercel-analytics", "vercel-analytics", {
		"data-props": propsStr,
		"data-params": paramsStr,
		"data-pathname": Astro.url.pathname
	})}${renderScript($$result, "/vercel/sandbox/primary/node_modules/.pnpm/@vercel+analytics@2.0.1_react@19.3.0/node_modules/@vercel/analytics/dist/astro/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/vercel/sandbox/primary/node_modules/.pnpm/@vercel+analytics@2.0.1_react@19.3.0/node_modules/@vercel/analytics/dist/astro/index.astro", void 0);
//#endregion
//#region src/layouts/Layout.astro
createAstro("https://umbraco.thebuilder.dk");
var $$Layout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Layout;
	const { title, description, ogImage } = Astro.props;
	const canonical = new URL(Astro.url.pathname, Astro.site);
	const ogImageUrl = new URL(ogImage, Astro.site);
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${title}</title><meta name="description"${addAttribute(description, "content")}><link rel="canonical"${addAttribute(canonical, "href")}><link rel="icon" type="image/svg+xml" href="/mark.svg"><link rel="alternate" type="application/json" href="/packages.json" title="Package registry"><meta property="og:type" content="website"><meta property="og:site_name" content="TheBuilder Umbraco"><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:url"${addAttribute(canonical, "content")}><meta property="og:image"${addAttribute(ogImageUrl, "content")}><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image"${addAttribute(ogImageUrl, "content")}><script>
      // Apply a saved theme before first paint; without one the page follows the system.
      try {
        const theme = localStorage.getItem("hub-theme");
        if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
      } catch {}
    <\/script>${renderHead($$result)}</head><body><button class="hub-theme-toggle" type="button" aria-label="Dark theme" aria-pressed="false"><svg data-icon="moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg><svg data-icon="sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg></button><script>
      (() => {
        const root = document.documentElement;
        const button = document.querySelector(".hub-theme-toggle");
        const systemDark = matchMedia("(prefers-color-scheme: dark)");
        const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches;
        const sync = () => button.setAttribute("aria-pressed", String(isDark()));
        sync();
        systemDark.addEventListener("change", sync);
        button.addEventListener("click", () => {
          const theme = isDark() ? "light" : "dark";
          root.dataset.theme = theme;
          try { localStorage.setItem("hub-theme", theme); } catch {}
          sync();
        });
      })();
    <\/script><main>${renderSlot($$result, $$slots["default"])}</main>${renderComponent($$result, "Analytics", $$Index$1, {})}<footer class="hub-footer"><p class="udocs-shell">Curated by <a href="https://thebuilder.dk" rel="noopener">TheBuilder</a>. Each package links to its own source and license.</p></footer></body></html>`;
}, "/vercel/sandbox/primary/apps/hub/src/layouts/Layout.astro", void 0);
//#endregion
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
var $$Index = createComponent(($$result, $$props, $$slots) => {
	const profileUrl = "https://github.com/thebuilder";
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Umbraco packages curated by TheBuilder",
		"description": tagline,
		"ogImage": "/og/index.png"
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "LandingRoot", $$LandingRoot, { "class": "hub" }, { "default": ($$result) => renderTemplate`${renderComponent($$result, "LandingHero", $$LandingHero, {
		"title": "Umbraco packages,",
		"accent": "built to stay out of the way",
		"description": tagline
	}, {
		"background": ($$result) => renderTemplate`${renderComponent($$result, "HeroParticles", $$HeroParticles, {
			"slot": "background",
			"logo": "/mark.svg",
			"flow": markFlow
		})}`,
		"actions": ($$result) => renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "slot": "actions" }, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<a class="hub-button hub-button--secondary"${addAttribute(profileUrl, "href")} rel="noopener"><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.49-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.87.87 2.33.67.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"></path></svg>TheBuilder on GitHub</a>` })}`
	})}<section id="packages" class="udocs-shell hub-packages" aria-labelledby="packages-title">${renderComponent($$result, "SectionHeading", $$SectionHeading, {
		"id": "packages-title",
		"title": "Packages",
		"description": `${packages.length} packages, from stable releases to early previews.`
	})}<ul class="hub-packages__list" role="list">${packages.map((item) => renderTemplate`<li data-udocs-reveal><article class="hub-package"><div class="hub-package__header"><img${addAttribute(item.logo, "src")} width="48" height="48" alt="" loading="lazy"><div><h3><a class="hub-package__link"${addAttribute(item.links.docs, "href")}>${item.name}</a></h3><p class="hub-package__meta"><span${addAttribute(["hub-status", `hub-status--${item.status}`], "class:list")}>${statusLabels[item.status]}</span><span>${formatUmbraco(item.compatibility.umbraco)}</span></p></div></div><p class="hub-package__summary">${item.summary}</p><ul class="hub-package__links" role="list"${addAttribute(`${item.name} links`, "aria-label")}><li><a${addAttribute(item.links.docs, "href")}>${docsLabel(item)}</a></li>${item.links.nuget && renderTemplate`<li><a${addAttribute(item.links.nuget, "href")} rel="noopener">NuGet</a></li>`}${item.links.marketplace && renderTemplate`<li><a${addAttribute(item.links.marketplace, "href")} rel="noopener">Marketplace</a></li>`}${item.links.npm && renderTemplate`<li><a${addAttribute(item.links.npm, "href")} rel="noopener">npm</a></li>`}<li><a${addAttribute(item.links.github, "href")} rel="noopener">GitHub</a></li></ul></article></li>`)}</ul></section>` })}` })}`;
}, "/vercel/sandbox/primary/apps/hub/src/pages/index.astro", void 0);
var $$file = "/vercel/sandbox/primary/apps/hub/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };
