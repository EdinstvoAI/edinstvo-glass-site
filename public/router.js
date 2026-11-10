const home = document.body.dataset.home;
const base = document.body.dataset.base;
const russian = document.documentElement.lang === "ru";
let navigation = 0;
let request;
let transition;
let dispose = () => {};
let displayed = location.href;
let examples;

async function fade(element, frames, duration) {
  const current = element.animate(frames, { duration, easing: "cubic-bezier(.32,.72,0,1)", fill: "both" });
  transition = current;
  await current.finished.catch(() => {});
  current.cancel();
  if (transition === current) transition = null;
}

function saveScroll() {
  history.replaceState({ ...history.state, docScroll: scrollY }, "");
}

async function prepare(main) {
  if (!main.querySelector("[data-stage], [data-playground]")) return null;
  examples ??= import(`${base}/demo.js`);
  return examples;
}
async function mount(main, id) {
  const module = await prepare(main);
  if (module && id === navigation && main.isConnected) dispose = module.mountDemos(main);
}

function scrollToPage(url, position) {
  let target;
  try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch {}
  if (target) target.scrollIntoView();
  else scrollTo({ top: position, behavior: "instant" });
}

async function navigate(url, { pop = false, position = 0 } = {}) {
  const id = ++navigation;
  request?.abort();
  transition?.cancel();
  request = new AbortController();
  if (!pop) saveScroll();
  document.body.dataset.navigating = "";
  document.querySelector("main").setAttribute("aria-busy", "true");
  dispatchEvent(new Event("docs:close-menu"));
  document.querySelector("dialog.search")?.close();
  try {
    const response = await fetch(url.href, { signal: request.signal, headers: { Accept: "text/html" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (new URL(response.url).origin !== location.origin || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Unexpected document response");
    const page = new DOMParser().parseFromString(await response.text(), "text/html");
    const article = page.querySelector("main"), contents = page.querySelector(".toc");
    if (!article || !contents || page.documentElement.lang !== document.documentElement.lang) throw new Error("Invalid documentation page");
    const module = await prepare(article);
    if (id !== navigation) return;

    const replace = () => {
      if (id !== navigation) return;
      dispose(); dispose = () => {};
      const main = document.importNode(article, true);
      document.querySelector("main").replaceWith(main);
      document.querySelector(".toc").replaceWith(document.importNode(contents, true));
      document.title = page.title;
      displayed = url.href;
      document.querySelector(".lang").href = page.querySelector(".lang").getAttribute("href");
      for (const link of document.querySelectorAll(".sidebar a")) {
        if (new URL(link.href).pathname === url.pathname) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
      if (!pop) history.pushState({ docScroll: 0 }, "", url.href);
      dispatchEvent(new Event("docs:route"));
      scrollToPage(url, position);
      main.tabIndex = -1;
      main.focus({ preventScroll: true });
      if (module) dispose = module.mountDemos(main);
      scrollToPage(url, position);
      return main;
    };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) await fade(document.querySelector("main"), [{ opacity: 1 }, { opacity: 0 }], 60);
    if (id !== navigation) return;
    const main = replace();
    if (!reduced && main) await fade(main, [{ opacity: 0 }, { opacity: 1 }], 150);
  } catch (error) {
    if (id !== navigation || error.name === "AbortError") return;
    const main = document.querySelector("main");
    main.querySelector(".nav-error")?.remove();
    const notice = document.createElement("p"), retry = document.createElement("a");
    notice.className = "nav-error"; notice.setAttribute("role", "alert");
    notice.append(russian ? "Не удалось загрузить страницу. " : "Could not load this page. ");
    retry.href = url.href; retry.textContent = russian ? "Повторить" : "Try again";
    notice.append(retry); main.prepend(notice);
    console.warn("Documentation navigation failed.", error);
  } finally {
    if (id === navigation) {
      delete document.body.dataset.navigating;
      document.querySelector("main").removeAttribute("aria-busy");
    }
  }
}

document.addEventListener("click", event => {
  const link = event.target.closest("a[href]");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute("download")) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || !url.pathname.startsWith(`${home}/`)) return;
  const current = new URL(displayed);
  if (url.pathname === current.pathname && url.search === current.search) {
    if (!url.hash) { event.preventDefault(); dispatchEvent(new Event("docs:close-menu")); scrollTo({ top: 0, behavior: "instant" }); }
    return;
  }
  event.preventDefault();
  navigate(url);
});
addEventListener("popstate", event => navigate(new URL(location.href), { pop: true, position: event.state?.docScroll ?? 0 }));
addEventListener("pagehide", saveScroll);
history.scrollRestoration = "manual";
saveScroll();
mount(document.querySelector("main"), navigation).catch(error => console.warn("Documentation examples could not initialize.", error));
