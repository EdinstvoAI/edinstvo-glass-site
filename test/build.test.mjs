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
      assert.ok(html.includes(language === "ru" ? "Версия для разработки" : "Development preview"));
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

test("LLM text includes the new API and the development status", () => {
  const full = readFileSync("dist/llms-full.txt", "utf8");
  for (const text of ["adaptationDuration", "setSceneMaterial", "dispersion-mode", "view-box", "Development preview"]) assert.ok(full.includes(text), text);
});

test("browser scripts parse without running DOM code", () => {
  for (const script of ["public/demo.js", "public/site.js"]) execFileSync(process.execPath, ["--check", script]);
});
