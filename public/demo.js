import { mountShowcase } from "./examples.js";

const base = document.body.dataset.base;
const engine = await import(`${base}/glass/index.js`);
const { defaults, motionDefaults, motionRanges, ranges, setSceneLight } = engine;
await import(`${base}/glass/define.js`);

const ru = location.pathname.includes("/ru/");
let photo = null;
let photoGeneration = 0;

function repaint() {
  document.documentElement.toggleAttribute("data-photo", Boolean(photo));
  for (const stage of document.querySelectorAll("[data-stage]")) {
    paint(stage.querySelector(":scope > canvas"));
    for (const glass of stage.querySelectorAll("edinstvo-glass, edinstvo-glass-group")) glass.invalidate();
  }
  dispatchEvent(new Event("docs:photo"));
}

async function usePhoto(file) {
  const generation = ++photoGeneration;
  if (file.size > 20 * 1024 * 1024) throw new Error(ru ? "Выбери изображение до 20 МиБ." : "Choose an image up to 20 MiB.");
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const text = (a,b) => String.fromCharCode(...header.subarray(a,b));
  const raster = header[0] === 255 && header[1] === 216 && header[2] === 255 || header[0] === 137 && text(1,4) === "PNG" || text(0,4) === "GIF8" || text(0,2) === "BM" || text(0,4) === "RIFF" && text(8,12) === "WEBP" || text(4,8) === "ftyp" && ["avif", "avis"].includes(text(8,12));
  if (!raster) throw new Error(ru ? "Выбери PNG, JPEG, WebP, AVIF, GIF или BMP." : "Choose PNG, JPEG, WebP, AVIF, GIF or BMP.");
  const image = await createImageBitmap(file);
  if (generation !== photoGeneration) { image.close(); return; }
  if (image.width * image.height > 64_000_000) { image.close(); throw new Error(ru ? "Слишком большое изображение: максимум 64 Мп." : "Image is too large: maximum 64 megapixels."); }
  const scale = Math.min(1800 / Math.max(image.width, image.height), 1);
  const canvas = Object.assign(document.createElement("canvas"), { width: image.width * scale, height: image.height * scale });
  try { canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); }
  finally { image.close(); }
  photo?.close?.();
  photo = canvas;
  for (const stage of document.querySelectorAll("[data-stage]")) stage.dataset.background = "photo";
  try {
    localStorage.setItem("glass-photo", canvas.toDataURL("image/jpeg", 0.85));
  } catch {}
  repaint();
}

async function restorePhoto() {
  try {
    const saved = localStorage.getItem("glass-photo");
    if (saved && saved.length < 8 * 1024 * 1024 && /^data:image\/(jpeg|png);base64,/.test(saved)) photo = await createImageBitmap(await (await fetch(saved)).blob());
  } catch {}
}

await restorePhoto();
document.documentElement.toggleAttribute("data-photo", Boolean(photo));

function paint(canvas) {
  const { width, height } = canvas.parentElement.getBoundingClientRect();
  canvas.width = width * 2;
  canvas.height = height * 2;
  const c = canvas.getContext("2d");
  c.scale(2, 2);
  const background = canvas.parentElement.dataset.background;
  if (photo && (!background || background === "photo")) {
    const scale = Math.max(width / photo.width, height / photo.height);
    c.drawImage(photo, (width - photo.width * scale) / 2, (height - photo.height * scale) / 2, photo.width * scale, photo.height * scale);
    return;
  }
  if (background === "type" || background === "grid") {
    c.fillStyle = background === "grid" ? "#262626" : "#eeeeee";
    c.fillRect(0, 0, width, height);
    c.strokeStyle = background === "grid" ? "#ffffff30" : "#00000012";
    c.lineWidth = 1;
    for (let x = 0; x < width; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, height); c.stroke(); }
    for (let y = 0; y < height; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(width, y); c.stroke(); }
    c.fillStyle = background === "grid" ? "#fafafa" : "#111111";
    c.font = `500 ${Math.min(width / 4.3, 110)}px -apple-system, sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("Glass", width / 2, height * 0.7);
    return;
  }
  const sky = c.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, "#e54d33");
  sky.addColorStop(0.55, "#f2b134");
  sky.addColorStop(1, "#1d4ed8");
  c.fillStyle = sky;
  c.fillRect(0, 0, width, height);
  c.strokeStyle = "rgb(255 255 255 / .9)";
  c.lineWidth = 2;
  for (let x = 40; x < width; x += 120) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, height);
    c.stroke();
  }
  c.fillStyle = "#111";
  c.font = `800 ${Math.min(width / 5, 96)}px -apple-system, "Segoe UI", sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("Glass", width / 2, height / 2);
}

function drag(element) {
  let from = null;
  element.addEventListener("pointerdown", (event) => {
    const { x, y } = new DOMMatrix(getComputedStyle(element).translate === "none" ? "" : `translate(${getComputedStyle(element).translate.split(" ").join(",")})`).transformPoint();
    from = [event.clientX - x, event.clientY - y];
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener("pointermove", (event) => {
    if (from) element.style.translate = `${event.clientX - from[0]}px ${event.clientY - from[1]}px`;
  });
  element.addEventListener("pointerup", () => (from = null));
}

export function mountDemos(container) {
const disposals = [];
const frames = new Set();
let alive = true;
function frame(callback) {
  const handle = requestAnimationFrame(now => { frames.delete(handle); if (alive) callback(now); });
  frames.add(handle);
}

for (const stage of container.querySelectorAll("[data-stage]")) {
  const canvas = document.createElement("canvas");
  stage.prepend(canvas);
  paint(canvas);
  const resize = new ResizeObserver(() => {
    if (!alive) return;
    paint(canvas);
    for (const glass of stage.querySelectorAll("edinstvo-glass, edinstvo-glass-group")) glass.invalidate();
  });
  resize.observe(stage);
  disposals.push(() => resize.disconnect());
  stage.querySelectorAll("[data-drag]").forEach(drag);
  const upload = document.createElement("label");
  upload.className = "upload";
  upload.textContent = ru ? "Своё изображение" : "Your image";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp";
  input.hidden = true;
  input.addEventListener("change", async () => {
    if (!input.files[0]) return;
    try { await usePhoto(input.files[0]); upload.title = ""; upload.textContent = ru ? "Своё изображение" : "Your image"; upload.append(input); input.value = ""; }
    catch (error) { upload.title = error.message; input.value = ""; upload.textContent = error.message; upload.append(input); }
  });
  upload.append(input);
  const reset = Object.assign(document.createElement("button"), { type: "button", className: "upload reset", textContent: ru ? "Сбросить" : "Reset" });
  reset.addEventListener("click", () => {
    photoGeneration++;
    photo?.close?.(); photo = null;
    for (const current of document.querySelectorAll("[data-stage]")) if (current.dataset.background === "photo") current.dataset.background = current.matches("[data-showcase-stage]") ? "type" : "spectrum";
    try {
      localStorage.removeItem("glass-photo");
    } catch {}
    repaint();
  });
  stage.append(upload, reset);
}

for (const showcase of container.querySelectorAll("[data-showcase]")) disposals.push(mountShowcase(showcase, engine, { paint, drag }));

for (const toggle of container.querySelectorAll("[data-toggle]")) {
  toggle.addEventListener("click", () => toggle.classList.toggle("open"));
}

for (const stage of container.querySelectorAll("[data-drift]")) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) break;
  const pieces = [...stage.querySelectorAll("[data-drag]")];
  let seen = false;
  let touched = false;
  stage.addEventListener("pointerdown", () => (touched = true), { once: true });
  const visibility = new IntersectionObserver(([entry]) => {
    if (!alive) return;
    seen = entry.isIntersecting;
    if (seen) frame(drift);
  });
  visibility.observe(stage);
  disposals.push(() => visibility.disconnect());
  function drift(now) {
    if (!seen || touched) return;
    const t = now / 1000;
    pieces.forEach((piece, i) => {
      const x = Math.sin(t * (0.5 + i * 0.17) + i * 2) * (46 + i * 34) + (1 - i) * 26 * (Math.sin(t * 0.4) + 1);
      const y = Math.cos(t * (0.42 + i * 0.13) + i) * (40 + i * 16);
      piece.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    frame(drift);
  }
}

const playground = container.querySelector("[data-playground]");
if (playground) {
  const stage = playground.querySelector(".stage");
  const controls = playground.querySelector(".controls");
  const output = container.querySelector("#snippet");
  const start = { ...defaults, ...motionDefaults };
  const name = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const changed = {};
  let selected = stage.querySelector("edinstvo-glass");
  const fields = new Map();
  const selectedName = document.createElement("p"); selectedName.className = "selection-caption"; selectedName.setAttribute("aria-live", "polite"); controls.append(selectedName);
  const write = () => {
    const attributes = Object.entries(changed).map(([key, value]) => ` ${name(key)}="${value}"`).join("");
    output.textContent = `<edinstvo-glass${attributes}></edinstvo-glass>`;
  };
  for (const [key, [min, max]] of Object.entries({ ...ranges, ...motionRanges })) {
    const label = document.createElement("label");
    const value = document.createElement("output");
    const input = Object.assign(document.createElement("input"), { type: "range", min, max, step: max - min > 2 ? 1 : 0.01, value: start[key] });
    input.setAttribute("aria-label", name(key));
    value.textContent = (+start[key]).toFixed(2);
    label.append(name(key), value, input);
    input.addEventListener("input", () => {
      const number = +(+input.value).toFixed(2);
      value.textContent = number.toFixed(2);
      changed[key] = number;
      selected.setAttribute(name(key), number);
      write();
    });
    controls.append(label);
    fields.set(key, { input, value });
  }
  const choices = [];
  for (const [key, options] of [["adaptation", ["off", "tint", "contrast", "full"]], ["dispersionMode", ["artistic", "physical"]], ["shape", ["rounded-rect", "circle", "ellipse", "superellipse", "path"]]]) {
    if (key === "adaptation" && !engine.setSceneMaterial || key === "shape" && !engine.geometryDefaults || key === "dispersionMode" && !engine.geometryDefaults) continue;
    const label = document.createElement("label"), input = document.createElement("select");
    label.textContent = name(key); input.setAttribute("aria-label", name(key));
    for (const option of options) input.add(new Option(option, option));
    label.append(input); controls.prepend(label); choices.push({ key, input, options });
    input.addEventListener("change", () => {
      selected.setAttribute(name(key), input.value);
      if (key === "shape" && input.value === "path") { selected.setAttribute("path", "M50 0L100 100H0Z"); selected.setAttribute("view-box", "0 0 100 100"); }
      select(selected);
    });
  }
  function select(piece) {
    selected?.removeAttribute("data-selected"); selected = piece; selected.setAttribute("data-selected", ""); selected.tabIndex = 0;
    selectedName.textContent = ru ? "Настройки выбранной фигуры" : "Selected shape settings";
    for (const key of Object.keys(changed)) delete changed[key];
    for (const [key, { input, value }] of fields) {
      const raw = selected.getAttribute(name(key));
      input.value = raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : start[key];
      value.textContent = Number(input.value).toFixed(2);
      input.disabled = key === "merge" && !selected.closest("edinstvo-glass-group");
      if (input.disabled) input.title = ru ? "Слияние требует группы; пример есть в разделе «Слияние»." : "Merging requires a group; see the Merge guide.";
      if (raw !== null) changed[key] = Number(input.value);
    }
    for (const { key, input, options } of choices) { input.value = selected.getAttribute(name(key)) ?? start[key] ?? options[0]; if (selected.hasAttribute(name(key))) changed[key] = input.value; }
    for (const [key, attribute] of [["path", "path"], ["viewBox", "view-box"]]) if (selected.hasAttribute(attribute)) changed[key] = selected.getAttribute(attribute);
    write();
  }
  for (const event of ["pointerdown", "focusin"]) stage.addEventListener(event, event => { const piece = event.target.closest("edinstvo-glass"); if (piece) select(piece); });
  select(selected);
  for (const button of container.querySelectorAll("[data-shape]")) {
    button.addEventListener("click", () => {
      if (button.dataset.shape === "clear") {
        stage.querySelectorAll("[data-added-shape]").forEach((piece) => piece.remove());
        select(stage.querySelector("edinstvo-glass"));
        return;
      }
      const piece = document.createElement("edinstvo-glass");
      piece.className = button.dataset.shape;
      piece.dataset.drag = "";
      piece.dataset.addedShape = "";
      piece.style.cssText = `position:absolute;left:${10 + Math.random() * 50}%;top:${10 + Math.random() * 40}%`;
      for (const [key, value] of Object.entries(changed)) piece.setAttribute(name(key), value);
      if (engine.geometryDefaults) piece.setAttribute("shape", button.dataset.shape.startsWith("dot") ? "circle" : "rounded-rect");
      stage.append(piece);
      drag(piece);
      select(piece);
    });
  }
}

for (const [attribute, selector, available] of [["adaptation", "[data-adaptation-control]", Boolean(engine.setSceneMaterial)], ["shape", "[data-geometry-control]", Boolean(engine.geometryDefaults)]]) {
  const control = container.querySelector(selector);
  if (!control) continue;
  const stage = container.querySelector(attribute === "shape" ? "[data-geometry-demo]" : "[data-adaptation-demo]");
  if (!available) {
    control.disabled = true;
    stage.querySelectorAll("edinstvo-glass").forEach(glass => glass.remove());
    const message = document.createElement("p"); message.className = "preview-message";
    message.textContent = ru ? "Обновите пакет, чтобы открыть этот пример." : "Update the package to use this example."; stage.append(message);
  } else control.addEventListener("change", () => stage.querySelectorAll("edinstvo-glass").forEach(glass => glass.setAttribute(attribute, control.value)));
}

for (const panel of container.querySelectorAll("[data-lights]")) {
  const read = () => {
    const light = {};
    for (const input of panel.querySelectorAll("input:not([type=checkbox])")) light[input.name] = input.type === "range" ? Number(input.value) : input.value;
    setSceneLight(light);
  };
  panel.addEventListener("input", (event) => {
    if (event.target.type !== "checkbox") return read();
    for (const glass of container.querySelectorAll(".stage edinstvo-glass")) {
      if (event.target.checked) {
        if (!glass.hasAttribute(event.target.name)) {
          glass.setAttribute(event.target.name, "0.7");
          glass.dataset.added = (glass.dataset.added ?? "") + event.target.name + " ";
        }
      } else if (glass.dataset.added?.includes(event.target.name)) {
        glass.removeAttribute(event.target.name);
        glass.dataset.added = glass.dataset.added.replace(event.target.name + " ", "");
      }
    }
  });
  read();
}

for (const stage of container.querySelectorAll("[data-load]")) {
  const controls = container.querySelector("[data-load-controls]");
  const count = controls.querySelector("[name=count]");
  const moving = controls.querySelector("[name=moving]");
  const pieces = [];
  const fit = () => {
    while (pieces.length < count.value) {
      const glass = document.createElement("edinstvo-glass");
      glass.className = "dot";
      glass.setAttribute("frost", "0.2");
      glass.style.cssText = `position:absolute;left:${5 + Math.random() * 75}%;top:${5 + Math.random() * 65}%`;
      stage.append(glass);
      pieces.push({ glass, phase: Math.random() * 6.28 });
    }
    while (pieces.length > count.value) pieces.pop().glass.remove();
  };
  count.addEventListener("input", fit);
  fit();
  const show = (name, text) => (container.querySelector(`[data-${name}]`).textContent = text);
  let last = performance.now();
  let frames = [];
  let shown = last;
  const tick = (now) => {
    frames.push(now - last);
    last = now;
    if (moving.checked) {
      for (const { glass, phase } of pieces) {
        glass.style.translate = `${Math.sin(now / 700 + phase) * 40}px ${Math.cos(now / 900 + phase) * 30}px`;
        glass.invalidate();
      }
    }
    if (now - shown > 500) {
      const average = frames.reduce((sum, frame) => sum + frame, 0) / frames.length;
      show("fps", Math.round(1000 / average));
      show("average", `${average.toFixed(1)} ms`);
      show("worst", `${Math.max(...frames).toFixed(1)} ms`);
      frames = [];
      shown = now;
    }
    frame(tick);
  };
  frame(tick);
}

return () => {
  alive = false;
  photoGeneration++;
  frames.forEach(cancelAnimationFrame);
  disposals.forEach(dispose => dispose());
  if (container.querySelector("[data-lights]")) setSceneLight(null);
};
}
