import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { defineUmbracoPackage, loadUmbracoPackages } from "../dist/index.js";

const entry = {
  id: "thebuilder.example",
  name: "Example",
  summary: "An example Umbraco package.",
  links: { docs: "https://example.com/docs", github: "https://github.com/thebuilder/example" },
  logo: "https://umbraco.thebuilder.dk/logos/example.svg",
  compatibility: { umbraco: ">=17.1 <19" },
  status: "stable",
};

// Serves one canned response per path; /slow never answers within the test timeout.
async function withServer(run) {
  const routes = {
    "/ok": [200, { version: 1, packages: [entry, { ...entry, id: "Not Valid" }] }],
    "/v2": [200, { version: 2, packages: [entry] }],
    "/error": [500, { message: "boom" }],
  };
  const server = createServer((request, response) => {
    if (request.url === "/slow") return setTimeout(() => response.end("{}"), 1_000);
    const [status, body] = routes[request.url] ?? [404, {}];
    response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("loadUmbracoPackages returns validated packages and skips invalid entries", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  await withServer(async (base) => {
    const packages = await loadUmbracoPackages({ url: `${base}/ok` });
    assert.deepEqual(packages.map((item) => item.id), ["thebuilder.example"]);
    assert.equal(packages[0].logo, entry.logo);
    assert.equal(Object.isFrozen(packages[0]), true);
  });
  assert.equal(warn.mock.callCount(), 1);
  assert.match(warn.mock.calls[0].arguments[0], /Skipping package Not Valid/);
});

test("loadUmbracoPackages falls back when the registry can't be used", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const fallback = [defineUmbracoPackage({ ...entry, id: "thebuilder.fallback", logo: "/fallback.svg" })];
  await withServer(async (base) => {
    for (const path of ["/v2", "/error", "/missing", "/slow"]) {
      const packages = await loadUmbracoPackages({ url: `${base}${path}`, fallback, timeoutMs: 200 });
      assert.deepEqual(packages.map((item) => item.id), ["thebuilder.fallback"], path);
    }
    assert.deepEqual(await loadUmbracoPackages({ url: `${base}/error` }), []);
  });
  assert.equal(warn.mock.callCount(), 5);
  assert.match(warn.mock.calls[0].arguments[0], /version 1 registry/);
  assert.match(warn.mock.calls[1].arguments[0], /HTTP 500/);
});
