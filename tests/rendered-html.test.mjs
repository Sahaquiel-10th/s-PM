import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the application shell renders the 澄序 workspace", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>澄序/);
  assert.match(html, /正在打开工作台/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
});

test("projects, contacts and schedules expose edit and delete flows", async () => {
  const [page, api] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("server/api.mjs", root), "utf8"),
  ]);

  assert.match(page, /const openEditor/);
  assert.match(page, /function deleteRecord/);
  assert.match(page, /method: editingItem \? "PUT" : "POST"/);
  assert.match(page, /method: "DELETE"/);
  assert.match(page, /const title = `\$\{item \? "编辑" : "新建"\}\$\{label\}`/);

  for (const resource of ["projects", "contacts", "schedules"]) {
    assert.match(api, new RegExp(`const ${resource.slice(0, -1)}Match = url\\.pathname\\.match\\(\\/\\^\\\\\\/api\\\\\\/${resource}`));
  }
  assert.match(api, /projectMatch && req\.method === "PUT"/);
  assert.match(api, /projectMatch && req\.method === "DELETE"/);
  assert.match(api, /contactMatch && req\.method === "PUT"/);
  assert.match(api, /contactMatch && req\.method === "DELETE"/);
  assert.match(api, /scheduleMatch && req\.method === "PUT"/);
  assert.match(api, /scheduleMatch && req\.method === "DELETE"/);
  assert.match(api, /req\.method === "DELETE" && attachmentMatch/);
});

test("list records and calendar events provide rich hover details", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);

  assert.match(page, /function HoverDetails/);
  assert.match(page, /function EventHover/);
  assert.match(page, /className="hover-details"/);
  assert.match(page, /createPortal/);
  assert.match(page, /getBoundingClientRect/);
  assert.match(css, /\.hover-details/);
  assert.match(css, /position:fixed/);
  assert.match(css, /z-index:100/);
});
