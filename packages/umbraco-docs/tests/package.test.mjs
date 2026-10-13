import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defineUmbracoPackage } from "../dist/index.js";

const valid = {
  id: "thebuilder.example",
  name: "Example",
  summary: "An example Umbraco package.",
  links: {
    docs: "https://example.com/docs",
    nuget: "https://nuget.org/packages/Example",
    marketplace: "https://marketplace.umbraco.com/package/example",
    github: "https://github.com/thebuilder/example",
  },
  logo: "/logo.svg",
  compatibility: { umbraco: ">=17 <19", dotnet: ">=10" },
  status: "stable",
  categories: ["Developer Tools"],
};

test("defineUmbracoPackage preserves typed product facts", () => {
  const manifest = defineUmbracoPackage(valid);
  assert.equal(manifest.id, "thebuilder.example");
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.links), true);
  assert.equal(Object.isFrozen(manifest.compatibility), true);
  assert.equal(Object.isFrozen(manifest.categories), true);
});

test("defineUmbracoPackage rejects unsafe links and logo paths", () => {
  assert.throws(() => defineUmbracoPackage({ ...valid, logo: "logo.svg" }), /public-root path/);
  assert.throws(() => defineUmbracoPackage({ ...valid, logo: "//example.com/logo.svg" }), /public-root path/);
  assert.throws(() => defineUmbracoPackage({ ...valid, links: { ...valid.links, docs: "http://example.com" } }), /absolute https URL/);
});

test("defineUmbracoPackage lists unreleased packages without registry links", () => {
  const { nuget, marketplace, ...links } = valid.links;
  const manifest = defineUmbracoPackage({ ...valid, status: "preview", links });
  assert.deepEqual(Object.keys(manifest.links), ["docs", "github"]);
  assert.throws(() => defineUmbracoPackage({ ...valid, links: { ...links, nuget: "http://nuget.org" } }), /links\.nuget must be an absolute https URL/);
});

test("defineUmbracoPackage keeps npm links for frontend packages", () => {
  const { nuget, marketplace, ...links } = valid.links;
  const manifest = defineUmbracoPackage({ ...valid, links: { ...links, npm: "https://www.npmjs.com/package/example" } });
  assert.equal(manifest.links.npm, "https://www.npmjs.com/package/example");
  assert.throws(() => defineUmbracoPackage({ ...valid, links: { ...links, npm: "npmjs.com/package/example" } }), /links\.npm must be an absolute https URL/);
});

test("defineUmbracoPackage reports malformed JavaScript input at the boundary", () => {
  assert.throws(() => defineUmbracoPackage(null), /package must be an object/);
  assert.throws(() => defineUmbracoPackage({ id: "example" }), /logo must be a non-empty string/);
});

test("landing component styles can override unlayered host resets", async () => {
  const css = await readFile(new URL("../styles/landing.css", import.meta.url), "utf8");

  assert.doesNotMatch(css, /@layer\s+udocs\.components/);
  assert.match(css, /^\.udocs-shell\s*\{/m);
});
