import assert from "node:assert/strict";
import test from "node:test";
import { formatUmbracoVersions } from "../dist/index.js";

test("formatUmbracoVersions words the hero's compatibility line", () => {
  assert.equal(formatUmbracoVersions(">=17.1 <19"), "Umbraco CMS 17.1 through 18.x");
  assert.equal(formatUmbracoVersions(">=17.4 <19"), "Umbraco CMS 17.4 through 18.x");
});

test("formatUmbracoVersions covers single majors, open ranges and anything else", () => {
  assert.equal(formatUmbracoVersions(">=17 <18"), "Umbraco CMS 17");
  assert.equal(formatUmbracoVersions(">=17.5 <18"), "Umbraco CMS 17.5 through 17.x");
  assert.equal(formatUmbracoVersions(">=12"), "Umbraco CMS 12 or later");
  assert.equal(formatUmbracoVersions("^17.0.0"), "Umbraco CMS ^17.0.0");
});
