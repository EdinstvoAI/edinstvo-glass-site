const home = document.body.dataset.home;
const russian = document.documentElement.lang === "ru";
const root = document.documentElement;

const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
root.dataset.mode = isDark() ? "dark" : "light";

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

document.querySelector(".menu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));

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
  dialog.showModal();
  input.select();
  index ??= await fetch(`${home}/search.json`).then((response) => response.json());
}

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

const links = new Map([...document.querySelectorAll('.toc a[href^="#"]')].map((link) => [decodeURIComponent(link.hash.slice(1)), link]));
const spy = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const link of links.values()) link.classList.remove("here");
    links.get(entry.target.id)?.classList.add("here");
  }
}, { rootMargin: "-120px 0px -70% 0px" });
for (const id of links.keys()) spy.observe(document.getElementById(id));
