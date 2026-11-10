export function mountShowcase(root, engine, { paint, drag }) {
  const ru = document.documentElement.lang === "ru";
  const text = (en, russian) => ru ? russian : en;
  const stage = root.querySelector("[data-showcase-stage]"), canvas = stage.querySelector(":scope > canvas");
  stage.id = "showcase-scene"; stage.setAttribute("role", "tabpanel");
  const panel = root.querySelector(".showcase-controls"), code = document.createElement("code");
  root.querySelector("[data-example-code]").append(code);
  const scene = document.createElement("div"); scene.className = "showcase-content"; stage.append(scene);
  const events = new AbortController();
  const svg = path => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  const home = svg("m4 11 8-7 8 7v9h-6v-6h-4v6H4z");
  const search = svg("M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0");
  const stack = svg("m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5");
  const sun = svg("M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0");
  const scenes = [
    ["navigation", text("Navigation", "Навигация"), () => `<edinstvo-glass class="example-nav" data-label="${text("Navigation bar", "Панель навигации")}"><div role="tablist"><button type="button" role="tab" aria-selected="true" data-demo-action="tab">${home}<span>${text("Home", "Главная")}</span></button><button type="button" role="tab" aria-selected="false" data-demo-action="tab">${stack}<span>${text("Library", "Коллекция")}</span></button><button type="button" role="tab" aria-selected="false" data-demo-action="tab">${search}<span>${text("Explore", "Обзор")}</span></button></div></edinstvo-glass>`],
    ["controls", text("Controls", "Управление"), () => `<edinstvo-glass class="example-panel" data-label="${text("Control panel", "Панель управления")}"><div class="example-heading">${text("Material controls", "Настройки материала")}</div><div class="example-actions"><button type="button" data-demo-action="frost" aria-pressed="false">${stack}${text("Frost", "Матовость")}</button><button type="button" data-demo-action="glow" aria-pressed="false">${sun}${text("Light", "Свет")}</button></div><label class="example-slider">${text("Transparency", "Прозрачность")}<input type="range" min="0" max="1" step="0.01" value="0.96" data-demo-transparency></label></edinstvo-glass>`],
    ["card", text("Card", "Карточка"), () => `<edinstvo-glass class="example-card" data-label="${text("Material card", "Стеклянная карточка")}"><div class="example-mark">${stack}</div><strong>Edinstvo Glass</strong><p>${text("A material you can compose.", "Материал, который можно настроить.")}</p><button type="button" data-demo-action="configure">${text("Configure", "Настроить")} <span aria-hidden="true">↗</span></button></edinstvo-glass>`],
    ["search", text("Search", "Поиск"), () => `<edinstvo-glass class="example-search" data-label="${text("Search field", "Поле поиска")}"><form>${search}<input type="search" aria-label="${text("Search documentation", "Поиск по документации")}" placeholder="${text("Search documentation", "Поиск по документации")}"><button type="submit" aria-label="${text("Search", "Найти")}">↵</button></form></edinstvo-glass>`],
    ["layers", text("Layers", "Слои"), () => [0, 1, 2].map(layer => `<edinstvo-glass class="example-layer" layer="${layer}" data-label="${text("Layer", "Слой")} ${layer + 1}" data-drag style="left:calc(50% - ${130 - layer * 35}px);top:${75 + layer * 55}px"><span class="example-layer-number">0${layer + 1}</span><span>${[text("Background", "Задний"), text("Middle", "Средний"), text("Foreground", "Передний")][layer]}</span></edinstvo-glass>`).join("")],
    ["merge", text("Merge", "Слияние"), () => `<edinstvo-glass-group class="example-merge" merge="32"><edinstvo-glass data-label="${text("Left surface", "Левая поверхность")}" data-drag style="left:12px"></edinstvo-glass><edinstvo-glass data-label="${text("Right surface", "Правая поверхность")}" data-drag style="left:100px"></edinstvo-glass><edinstvo-glass data-label="${text("Independent surface", "Отдельная поверхность")}" merge="0" data-drag style="left:214px"></edinstvo-glass></edinstvo-glass-group>`],
  ];
  const title = document.createElement("p"); title.className = "selection-caption"; title.setAttribute("aria-live", "polite"); panel.append(title);
  const fields = new Map();
  let selected, owner;
  const kebab = key => key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  const defaults = { transparency: 0.96, frost: 0.18, refraction: 0.6, depth: 14, thickness: 10, dispersion: 0.2, rim: 0.55, light: 0.3, lightSoftness: 0.5, lift: 0, bloom: 0 };
  const backgroundMaterial = () => ({ adaptation: stage.dataset.background === "photo" ? "full" : "off", tint: stage.dataset.background === "grid" ? "#000" : "#fff", foreground: stage.dataset.background === "photo" ? "auto" : stage.dataset.background === "grid" ? "#fff" : "#202020" });
  function updateBackground() {
    for (const piece of scene.querySelectorAll("edinstvo-glass,edinstvo-glass-group")) piece.material = { ...piece.material, ...backgroundMaterial() };
    if (selected) select(selected);
    paint(canvas);
  }
  function write() {
    const attributes = Object.entries(owner.material).map(([key, value]) => ` ${kebab(key)}="${value}"`).join("");
    const motion = ["follow", "jelly", "glow", "morph"].filter(key => selected.hasAttribute(key)).map(key => ` ${key}="${selected.getAttribute(key)}"`).join("");
    code.textContent = owner.matches("edinstvo-glass-group") ? `<edinstvo-glass-group${attributes} merge="32">\n  <edinstvo-glass></edinstvo-glass>\n  <edinstvo-glass></edinstvo-glass>\n</edinstvo-glass-group>` : `<edinstvo-glass${attributes}${motion}>\n  ${selected.dataset.label}\n</edinstvo-glass>`;
  }
  function select(piece) {
    selected?.removeAttribute("data-selected"); selected = piece; selected.setAttribute("data-selected", "");
    owner = selected.hasAttribute("data-grouped") ? selected.closest("edinstvo-glass-group") : selected;
    title.textContent = selected.dataset.label;
    for (const [key, field] of fields) {
      field.input.value = field.motion ? selected.getAttribute(key) ?? engine.motionDefaults[key] : owner.material[key] ?? engine.defaults[key];
      field.output.textContent = Number(field.input.value).toFixed(2);
    }
    write();
  }
  for (const [key, label] of [["transparency", text("Transparency", "Прозрачность")], ["frost", text("Frost", "Матовость")], ["refraction", text("Refraction", "Преломление")], ["depth", text("Depth", "Глубина")], ["thickness", text("Thickness", "Толщина")], ["dispersion", text("Dispersion", "Дисперсия")], ["follow", text("Follow", "За курсором")], ["jelly", text("Jelly", "Желе")], ["glow", text("Touch light", "Свет касания")]]) {
    const motion = Object.hasOwn(engine.motionRanges, key), limits = (motion ? engine.motionRanges : engine.ranges)[key];
    if (!limits) continue;
    const row = document.createElement("label"), output = document.createElement("output"), input = document.createElement("input");
    input.type = "range"; input.min = limits[0]; input.max = limits[1]; input.step = limits[1] > 2 ? "1" : "0.01"; input.setAttribute("aria-label", label);
    row.append(label, output, input); panel.append(row); fields.set(key, { input, output, motion });
    input.addEventListener("input", () => { if (motion) selected.setAttribute(key, input.value); else owner.material = { ...owner.material, [key]: Number(input.value) }; output.textContent = Number(input.value).toFixed(2); write(); });
  }
  const backgroundLabel = document.createElement("label"), background = document.createElement("select");
  backgroundLabel.textContent = text("Background", "Фон"); background.setAttribute("aria-label", text("Background", "Фон"));
  for (const [value, label] of [["type", text("Typography", "Типографика")], ["grid", text("Grid", "Сетка")], ["spectrum", text("Spectrum", "Спектр")], ["photo", text("Your image", "Своё изображение")]]) background.add(new Option(label, value));
  stage.dataset.background = document.documentElement.hasAttribute("data-photo") ? "photo" : "type";
  const photoState = () => { background.querySelector('[value="photo"]').disabled = !document.documentElement.hasAttribute("data-photo"); background.value = stage.dataset.background; };
  photoState(); backgroundLabel.append(background); panel.prepend(backgroundLabel);
  background.addEventListener("change", () => { stage.dataset.background = background.value; updateBackground(); });
  addEventListener("docs:photo", () => { photoState(); updateBackground(); }, { signal: events.signal });
  function render(id) {
    const template = scenes.find(([key]) => key === id);
    scene.innerHTML = template[2]();
    stage.setAttribute("aria-labelledby", `scene-${id}`);
    for (const piece of scene.querySelectorAll("edinstvo-glass,edinstvo-glass-group")) { piece.source = canvas; piece.material = { ...defaults, ...backgroundMaterial() }; if (piece.matches("edinstvo-glass")) { piece.tabIndex = 0; piece.setAttribute("role", "group"); piece.setAttribute("aria-label", piece.dataset.label); } }
    for (const piece of scene.querySelectorAll("[data-drag]")) drag(piece);
    for (const tab of root.querySelectorAll("[data-scene]")) { const active = tab.dataset.scene === id; tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; }
    select(scene.querySelector("edinstvo-glass")); paint(canvas);
  }
  const tabs = root.querySelector(".scene-picker");
  for (const [id, label] of scenes) { const button = document.createElement("button"); button.type = "button"; button.id = `scene-${id}`; button.dataset.scene = id; button.setAttribute("role", "tab"); button.setAttribute("aria-controls", "showcase-scene"); button.textContent = label; button.addEventListener("click", () => render(id)); tabs.append(button); }
  tabs.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); const buttons = [...tabs.querySelectorAll("button")], index = buttons.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].click(); buttons[next].focus();
  });
  scene.addEventListener("pointerdown", event => { const piece = event.target.closest("edinstvo-glass"); if (piece) select(piece); });
  scene.addEventListener("focusin", event => { const piece = event.target.closest("edinstvo-glass"); if (piece && piece !== selected) select(piece); });
  scene.addEventListener("click", event => {
    const button = event.target.closest("[data-demo-action]"); if (!button) return;
    const action = button.dataset.demoAction;
    if (action === "tab") for (const tab of button.parentElement.querySelectorAll("button")) tab.setAttribute("aria-selected", String(tab === button));
    if (action === "configure") fields.get("refraction").input.focus();
    if (action === "frost" || action === "glow") { const on = button.getAttribute("aria-pressed") !== "true"; button.setAttribute("aria-pressed", String(on)); const key = action === "frost" ? "frost" : "light"; owner.material = { ...owner.material, [key]: on ? 0.8 : defaults[key] }; select(selected); }
  });
  scene.addEventListener("input", event => { if (event.target.matches("[data-demo-transparency]")) { owner.material = { ...owner.material, transparency: Number(event.target.value) }; select(selected); } });
  scene.addEventListener("submit", event => { event.preventDefault(); dispatchEvent(new CustomEvent("docs:search", { detail: event.target.querySelector("input").value })); });
  render("navigation");
  return () => events.abort();
}
