import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const base = process.env.BASE ?? "";
const github = "https://github.com/EdinstvoAI/edinstvo-glass";
const version = JSON.parse(readFileSync("node_modules/@edinstvo/glass/package.json", "utf8")).version;

const nav = [
  ["Getting started", [["", "Introduction"], ["installation", "Installation"]]],
  ["Essentials", [["material", "Material"], ["motion", "Motion"], ["merge", "Merge"], ["layers", "Layers"], ["backdrop", "Backdrop"]]],
  ["Try it", [["playground", "Playground"], ["examples", "Examples"]]],
  ["Reference", [["reference", "API"], ["limits", "Limits"]]],
];

const pages = nav.flatMap(([group, items]) => items.map(([slug, title]) => ({ group, slug, title })));
const href = (slug) => `${base}/${slug ? `${slug}/` : ""}`;
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const anchor = (text) => plain(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function render(page, index) {
  const raw = readFileSync(`content/${page.slug || "index"}.html`, "utf8");
  const toc = [];
  const body = raw
    .replace(/<pre data-code="(\w+)">([\s\S]*?)<\/pre>/g, (_, language, code) => `<div class="code"><button class="copy" type="button">Copy</button><pre><code data-language="${language}">${escape(code.trim())}</code></pre></div>`)
    .replace(/<h2>(.*?)<\/h2>/g, (_, text) => {
      const id = anchor(text);
      toc.push([id, plain(text)]);
      return `<h2 id="${id}"><a href="#${id}">${text}</a></h2>`;
    });
  const sidebar = nav.map(([group, items]) => `<p>${group}</p><ul>${items.map(([slug, title]) => `<li><a href="${href(slug)}"${slug === page.slug ? ' aria-current="page"' : ""}>${title}</a></li>`).join("")}</ul>`).join("");
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const live = /data-stage|data-playground/.test(raw);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title} · Edinstvo Glass</title>
<meta name="description" content="Real glass for the web. One WebGL material, the same on macOS and Windows.">
<link rel="icon" href="${base}/logo.png">
<link rel="stylesheet" href="${base}/site.css">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<script type="module" src="${base}/site.js"></script>
${live ? `<script type="module" src="${base}/demo.js"></script>` : ""}
</head>
<body data-base="${base}">
<header>
  <a class="logo" href="${href("")}"><img src="${base}/logo.png" alt="Edinstvo Glass" width="74" height="36"></a>
  <span class="version">${version}</span>
  <button class="search-open" type="button"><span>Search</span><kbd>⌘K</kbd></button>
  <nav>
    <button class="menu" type="button" aria-label="Menu">Menu</button>
    <button class="theme" type="button" aria-label="Switch theme"></button>
    <a href="${github}">GitHub</a>
  </nav>
</header>
<div class="layout">
  <aside class="sidebar">${sidebar}</aside>
  <main>
    <p class="group">${page.group}</p>
    <h1>${page.title}</h1>
    ${body}
    <footer>
      ${prev ? `<a href="${href(prev.slug)}"><small>Previous</small>${prev.title}</a>` : "<span></span>"}
      ${next ? `<a class="next" href="${href(next.slug)}"><small>Next</small>${next.title}</a>` : ""}
    </footer>
  </main>
  <aside class="toc">${toc.length ? `<p>On this page</p><ul>${toc.map(([id, text]) => `<li><a href="#${id}">${text}</a></li>`).join("")}</ul>` : ""}</aside>
</div>
<dialog class="search"><input type="search" placeholder="Search the docs" aria-label="Search the docs"><ul></ul></dialog>
</body>
</html>
`;
}

rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", { recursive: true });
cpSync("node_modules/@edinstvo/glass/dist", "dist/glass", { recursive: true, filter: (file) => !/\.(map|d\.ts)$/.test(file) });

const search = [];
pages.forEach((page, index) => {
  const file = join("dist", page.slug, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(page, index));
  const raw = readFileSync(`content/${page.slug || "index"}.html`, "utf8");
  search.push({ title: page.title, url: href(page.slug), text: plain(raw) });
  for (const [, heading] of raw.matchAll(/<h2>(.*?)<\/h2>/g)) search.push({ title: `${page.title} › ${plain(heading)}`, url: `${href(page.slug)}#${anchor(heading)}`, text: "" });
});
writeFileSync("dist/search.json", JSON.stringify(search));
writeFileSync("dist/404.html", readFileSync("dist/index.html"));
