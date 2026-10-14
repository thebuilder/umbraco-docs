import assert from "node:assert/strict";
import test from "node:test";
import { DOCS_ACCENT, docsTheme } from "../dist/index.js";

/** WCAG 2 contrast ratio between two hex colors. */
function contrast(a, b) {
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// Blume's default page backgrounds and the label colors it picks for an accent fill.
const LIGHT_PAGE = "#ffffff";
const DARK_PAGE = "#020202";

test("the shared accent meets AA as link text and with its button label in both modes", () => {
  assert.ok(contrast(DOCS_ACCENT.light, LIGHT_PAGE) >= 4.5, "light accent on the light page");
  assert.ok(contrast(DOCS_ACCENT.light, "#ffffff") >= 4.5, "white label on the light accent");
  assert.ok(contrast(DOCS_ACCENT.dark, DARK_PAGE) >= 4.5, "dark accent on the dark page");
  assert.ok(contrast(DOCS_ACCENT.dark, DARK_PAGE) >= 4.5, "dark label on the dark accent");
});

test("docsTheme carries the shared accent per mode", () => {
  assert.deepEqual(docsTheme.accent, DOCS_ACCENT);
});
