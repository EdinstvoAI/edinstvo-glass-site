import "./router.js";

const home = document.body.dataset.home;
const russian = document.documentElement.lang === "ru";
const root = document.documentElement;

const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
root.dataset.mode = isDark() ? "dark" : "light";
document.querySelector("[data-search-shortcut]").textContent = navigator.platform.includes("Mac") ? "⌘ K" : "Ctrl K";

document.querySelector(".theme").addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  root.dataset.mode = next;
  const apply = () => {
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  };
  if (document.startViewTransition) document.startViewTransition(apply);
  else apply();
});

const sidebar = document.querySelector(".sidebar");
const menu = document.querySelector(".menu");
const narrow = matchMedia("(max-width: 600px)");
let menuOpen = false;

function navigationMenu(open, focus = true) {
  menuOpen = open && narrow.matches;
  sidebar.classList.toggle("open", menuOpen);
  sidebar.inert = narrow.matches && !menuOpen;
  if (menuOpen) sidebar.setAttribute("aria-modal", "true"); else sidebar.removeAttribute("aria-modal");
  if (menuOpen) sidebar.setAttribute("role", "dialog"); else sidebar.removeAttribute("role");
  document.body.toggleAttribute("data-menu-open", menuOpen);
  document.body.style.overflow = menuOpen ? "hidden" : "";
  menu.setAttribute("aria-expanded", String(menuOpen));
  for (const element of document.querySelectorAll("header, main, .toc, footer.site")) element.inert = menuOpen;
  if (focus) (menuOpen ? document.querySelector(".nav-close") : menu).focus();
}
menu.addEventListener("click", () => navigationMenu(true));
document.querySelector(".nav-close").addEventListener("click", () => navigationMenu(false));
document.querySelector(".nav-scrim").addEventListener("click", () => navigationMenu(false));
addEventListener("docs:close-menu", () => navigationMenu(false, false));
narrow.addEventListener("change", () => navigationMenu(false, false));
navigationMenu(false, false);
try { sidebar.scrollTop = Number(sessionStorage.getItem("glass-docs-nav-scroll")) || 0; } catch {}
function revealCurrent() {
  const active = sidebar.querySelector("a[aria-current]");
  if (!active) return;
  const item = active.getBoundingClientRect(), frame = sidebar.getBoundingClientRect();
  if (item.top < frame.top + 16) sidebar.scrollTop += item.top - frame.top - 16;
  else if (item.bottom > frame.bottom - 16) sidebar.scrollTop += item.bottom - frame.bottom + 16;
}
addEventListener("docs:route", revealCurrent);
addEventListener("pagehide", () => { try { sessionStorage.setItem("glass-docs-nav-scroll", sidebar.scrollTop); } catch {} });
revealCurrent();
addEventListener("keydown", event => {
  if (!menuOpen) return;
  if (event.key === "Escape") { event.preventDefault(); navigationMenu(false); }
  if (event.key === "Tab") {
    const focusable = [...sidebar.querySelectorAll("a, button")];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy");
  if (!button) return;
  await navigator.clipboard.writeText(button.nextElementSibling.textContent);
  const label = button.textContent;
  button.textContent = russian ? "Скопировано" : "Copied";
  setTimeout(() => (button.textContent = label), 1200);
});

const dialog = document.querySelector("dialog.search");
const input = dialog.querySelector("input");
const list = dialog.querySelector("ul");
let index = null;

async function open() {
  navigationMenu(false, false);
  dialog.showModal();
  input.select();
  index ??= await fetch(`${home}/search.json`).then((response) => response.json());
}
addEventListener("docs:search", async event => {
  await open(); input.value = event.detail ?? ""; input.dispatchEvent(new Event("input"));
});

function snippet(text, word) {
  const at = text.toLowerCase().indexOf(word);
  return at < 0 ? "" : text.slice(Math.max(at - 30, 0), at + 70);
}

input.addEventListener("input", () => {
  const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
  list.replaceChildren();
  if (!words.length || !index) return;
  const found = index
    .map((item) => ({ item, score: words.reduce((sum, word) => sum + (item.title.toLowerCase().includes(word) ? 3 : item.text.toLowerCase().includes(word) ? 1 : -99), 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  for (const { item } of found) {
    const row = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.title;
    const hint = document.createElement("small");
    hint.textContent = snippet(item.text, words[0]);
    link.append(hint);
    row.append(link);
    list.append(row);
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") list.querySelector("a")?.click();
});

document.querySelector(".search-open").addEventListener("click", open);
addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "k") {
    event.preventDefault();
    open();
  }
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

let links = new Map();
const spy = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const link of links.values()) link.classList.remove("here");
    links.get(entry.target.id)?.classList.add("here");
  }
}, { rootMargin: "-120px 0px -70% 0px" });
function contents() {
  spy.disconnect();
  links = new Map([...document.querySelectorAll('.toc a[href^="#"]')].map(link => [decodeURIComponent(link.hash.slice(1)), link]));
  for (const id of links.keys()) { const heading = document.getElementById(id); if (heading) spy.observe(heading); }
}
addEventListener("docs:route", contents);
contents();
