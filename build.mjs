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

const ru = JSON.parse(readFileSync("content/ru.json", "utf8"));
const icons = {
  "Getting started": '<path d="M5 19c2-6 6-10 14-14-4 8-8 12-14 14Zm0 0 3-1M9 11l4 4"/>',
  Essentials: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4Zm16 0h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6Z"/>',
  "Try it": '<path d="M8 6v12l10-6Z"/>',
  Reference: '<path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 5l-4 14"/>',
};
const icon = (group) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[group]}</svg>`;
const pages = nav.flatMap(([group, items]) => items.map(([slug, title]) => ({ group, slug, title })));
let lang = "en";
const t = (text) => (lang === "ru" ? ru.ui[text] ?? text : text);
const home = (language) => `${base}${language === "ru" ? "/ru" : ""}`;
const href = (slug, language = lang) => `${home(language)}/${slug ? `${slug}/` : ""}`;

function translate(slug, raw) {
  if (lang === "en") return raw;
  const strings = [...ru[slug || "index"]];
  const pattern = /<(p|h2|th|b|span)>(.*?)<\/\1>|<td>(?!<code>)(.*?)<\/td>/g;
  const result = raw.replace(pattern, (match, tag, inner, cell) => {
    if (cell !== undefined && /^-?\d/.test(cell)) return `<td>${cell.replace(" to ", " – ")}</td>`;
    const next = strings.shift();
    if (next === undefined) throw new Error(`ru.json is short for ${slug}: ${match}`);
    return tag ? `<${tag}>${next}</${tag}>` : `<td>${next}</td>`;
  });
  if (strings.length) throw new Error(`ru.json has extra strings for ${slug}: ${strings[0]}`);
  return result.replace(/>(Get started|Open the playground)</g, (_, text) => `>${t(text)}<`);
}
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const anchor = (text) => plain(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

function render(page, index) {
  const raw = translate(page.slug, readFileSync(`content/${page.slug || "index"}.html`, "utf8"));
  const toc = [];
  const body = raw
    .replace(/<pre data-code="(\w+)">([\s\S]*?)<\/pre>/g, (_, language, code) => `<div class="code"><button class="copy" type="button">${t("Copy")}</button><pre><code data-language="${language}">${escape(code.trim())}</code></pre></div>`)
    .replace(/href="([a-z]+)\/"/g, (_, slug) => `href="${href(slug)}"`)
    .replace(/<h2>(.*?)<\/h2>/g, (_, text) => {
      const id = anchor(text);
      toc.push([id, plain(text)]);
      return `<h2 id="${id}"><a href="#${id}">${text}</a></h2>`;
    });
  const [, items] = nav.find(([group]) => group === page.group);
  const sidebar = `<ul>${items.map(([slug, title]) => `<li><a href="${href(slug)}"${slug === page.slug ? ' aria-current="page"' : ""}>${t(title)}</a></li>`).join("")}</ul>`;
  const tabs = nav.map(([group, [[slug]]]) => `<a href="${href(slug)}"${group === page.group ? ' aria-current="true"' : ""}>${icon(group)}${t(group)}</a>`).join("");
  const links = [[github, "GitHub"], ["https://www.npmjs.com/package/@edinstvo/glass", "npm"], [`${github}-documentation-/edit/main/content/${lang === "ru" ? "ru.json" : `${page.slug || "index"}.html`}`, t("Edit this page")]];
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const live = /data-stage|data-playground/.test(raw);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t(page.title)} · Edinstvo Glass</title>
<meta name="description" content="Real glass for the web. One WebGL material, the same on macOS and Windows.">
<link rel="icon" href="${base}/logo.png">
<link rel="stylesheet" href="${base}/site.css">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<script type="module" src="${base}/site.js"></script>
${live ? `<script type="module" src="${base}/demo.js"></script>` : ""}
</head>
<body data-base="${base}" data-home="${home(lang)}">
<header>
  <a class="logo" href="${href("")}"><img src="${base}/logo.png" alt="Edinstvo Glass" width="74" height="36"></a>
  <span class="version">${version}</span>
  <button class="search-open" type="button"><span>${t("Search")}</span><kbd>⌘K</kbd></button>
  <nav>
    <button class="menu" type="button" aria-label="${t("Menu")}">${t("Menu")}</button>
    <button class="theme" type="button" aria-label="Switch theme"></button>
    <a href="${href(page.slug, lang === "ru" ? "en" : "ru")}">${lang === "ru" ? "EN" : "RU"}</a>
    <a href="${github}">GitHub</a>
  </nav>
</header>
<div class="tabs"><div>${tabs}</div></div>
<div class="layout">
  <aside class="sidebar">${sidebar}</aside>
  <main>
    <p class="crumbs">${t(page.group)}<span>›</span><b>${t(page.title)}</b></p>
    <h1>${t(page.title)}</h1>
    ${body}
    <footer>
      ${prev ? `<a href="${href(prev.slug)}"><small>${t("Previous")}</small>${t(prev.title)}</a>` : "<span></span>"}
      ${next ? `<a class="next" href="${href(next.slug)}"><small>${t("Next")}</small>${t(next.title)}</a>` : ""}
    </footer>
  </main>
  <aside class="toc">${toc.length ? `<p>${t("On this page")}</p><ul>${toc.map(([id, text]) => `<li><a href="#${id}">${text}</a></li>`).join("")}</ul><hr>` : ""}<p>${t("Links")}</p><ul>${links.map(([url, text]) => `<li><a href="${url}">${text} ↗</a></li>`).join("")}</ul></aside>
</div>
<dialog class="search"><input type="search" placeholder="${t("Search the docs")}" aria-label="${t("Search the docs")}"><ul></ul></dialog>
</body>
</html>
`;
}

rmSync("dist", { recursive: true, force: true });
cpSync("public", "dist", { recursive: true });
cpSync("node_modules/@edinstvo/glass/dist", "dist/glass", { recursive: true, filter: (file) => !/\.(map|d\.ts)$/.test(file) });

for (lang of ["en", "ru"]) {
  const search = [];
  const root = lang === "ru" ? "dist/ru" : "dist";
  pages.forEach((page, index) => {
    const file = join(root, page.slug, "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, render(page, index));
    const raw = translate(page.slug, readFileSync(`content/${page.slug || "index"}.html`, "utf8"));
    search.push({ title: t(page.title), url: href(page.slug), text: plain(raw) });
    for (const [, heading] of raw.matchAll(/<h2>(.*?)<\/h2>/g)) search.push({ title: `${t(page.title)} › ${plain(heading)}`, url: `${href(page.slug)}#${anchor(heading)}`, text: "" });
  });
  writeFileSync(`${root}/search.json`, JSON.stringify(search));
}
writeFileSync("dist/404.html", readFileSync("dist/index.html"));
