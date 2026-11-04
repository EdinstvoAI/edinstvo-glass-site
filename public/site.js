const base = document.body.dataset.base;
const root = document.documentElement;

document.querySelector(".theme").addEventListener("click", () => {
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});

document.querySelector(".menu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy");
  if (!button) return;
  await navigator.clipboard.writeText(button.nextElementSibling.textContent);
  button.textContent = "Copied";
  setTimeout(() => (button.textContent = "Copy"), 1200);
});

const dialog = document.querySelector("dialog.search");
const input = dialog.querySelector("input");
const list = dialog.querySelector("ul");
let index = null;

async function open() {
  dialog.showModal();
  input.select();
  index ??= await fetch(`${base}/search.json`).then((response) => response.json());
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
