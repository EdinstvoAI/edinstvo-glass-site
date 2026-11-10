import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { execFileSync } from "node:child_process";

test("new topics are available in both languages and local search", () => {
  for (const language of ["en", "ru"]) {
    const prefix = language === "ru" ? "ru/docs" : "docs";
    const search = JSON.parse(readFileSync(`dist/${prefix}/search.json`, "utf8"));
    for (const topic of ["optics", "adaptation", "geometry"]) {
      const html = readFileSync(`dist/${prefix}/${topic}/index.html`, "utf8");
      assert.ok(html.includes(`<html lang="${language}">`));
      assert.ok(search.some(entry => entry.url.endsWith(`/${topic}/`)));
      assert.ok(!html.includes(language === "ru" ? "Версия для разработки" : "Development preview"));
    }
  }
});

test("built internal links resolve to existing documents and assets", () => {
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  const root = resolve("dist");
  for (const file of walk("dist").filter(file => file.endsWith(".html"))) {
    const html = readFileSync(file, "utf8");
    const page = new URL(file.replace(/^dist/, ""), "https://docs.test");
    for (const [, reference] of html.matchAll(/<(?:a|script|link|img|source)\b[^>]*?\b(?:href|src)="([^"<>]+)"/g)) {
      const url = new URL(reference.replaceAll("&amp;", "&"), page);
      if (url.origin !== page.origin) continue;
      let target = join(root, decodeURIComponent(url.pathname));
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
      assert.ok(existsSync(target), `${file}: broken reference ${reference}`);
    }
  }
});

test("LLM text includes the published API without preview notices", () => {
  const full = readFileSync("dist/llms-full.txt", "utf8");
  for (const text of ["adaptationDuration", "setSceneMaterial", "dispersion-mode", "view-box"]) assert.ok(full.includes(text), text);
  assert.ok(!full.includes("Development preview"));
});

test("browser scripts parse without running DOM code", () => {
  for (const script of ["public/demo.js", "public/site.js", "public/chrome.js", "public/router.js", "public/examples.js"]) execFileSync(process.execPath, ["--check", script]);
});

test("each page has a complete sidebar and one active destination", () => {
  for (const prefix of ["docs", "ru/docs"]) {
    for (const topic of ["", "optics/", "playground/"]) {
      const html = readFileSync(`dist/${prefix}/${topic}index.html`, "utf8");
      const sidebar = html.match(/<aside class="sidebar"[^>]*>([^]*?)<\/aside>/)[1];
      for (const target of ["installation", "web-components", "optics", "lighting", "figma", "playground", "reference"]) assert.ok(sidebar.includes(`/${target}/`), target);
      assert.equal((sidebar.match(/aria-current="page"/g) ?? []).length, 1);
      assert.equal((html.match(/<header>/g) ?? []).length, 1);
      assert.ok(!html.includes('class="tabs"'));
      assert.ok(!/<script[^>]*src="[^"]*demo.js"/.test(html));
    }
  }
});

test("API examples escape HTML exactly once", () => {
  for (const prefix of ["docs", "ru/docs"]) {
    const html = readFileSync(`dist/${prefix}/reference/index.html`, "utf8");
    assert.ok(html.includes('&lt;edinstvo-glass frost="0.3"&gt;'));
    assert.ok(!html.includes("&amp;lt;edinstvo-glass"));
  }
});
