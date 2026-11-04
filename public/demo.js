const base = document.body.dataset.base;
const { defaults, motionDefaults, motionRanges, ranges, setSceneLight } = await import(`${base}/glass/index.js`);
await import(`${base}/glass/define.js`);

let photo = null;

function paint(canvas) {
  const { width, height } = canvas.parentElement.getBoundingClientRect();
  canvas.width = width * 2;
  canvas.height = height * 2;
  const c = canvas.getContext("2d");
  c.scale(2, 2);
  if (photo) {
    const scale = Math.max(width / photo.width, height / photo.height);
    c.drawImage(photo, (width - photo.width * scale) / 2, (height - photo.height * scale) / 2, photo.width * scale, photo.height * scale);
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

for (const stage of document.querySelectorAll("[data-stage]")) {
  const canvas = document.createElement("canvas");
  stage.prepend(canvas);
  paint(canvas);
  new ResizeObserver(() => {
    paint(canvas);
    for (const glass of stage.querySelectorAll("edinstvo-glass, edinstvo-glass-group")) glass.invalidate();
  }).observe(stage);
  stage.querySelectorAll("[data-drag]").forEach(drag);
  const upload = document.createElement("label");
  upload.className = "upload";
  upload.textContent = location.pathname.includes("/ru/") ? "Своё изображение" : "Your image";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.hidden = true;
  input.addEventListener("change", async () => {
    if (!input.files[0]) return;
    photo = await createImageBitmap(input.files[0]);
    for (const other of document.querySelectorAll("[data-stage]")) {
      paint(other.querySelector(":scope > canvas"));
      for (const glass of other.querySelectorAll("edinstvo-glass, edinstvo-glass-group")) glass.invalidate();
    }
  });
  upload.append(input);
  stage.append(upload);
}

for (const toggle of document.querySelectorAll("[data-toggle]")) {
  toggle.addEventListener("click", () => toggle.classList.toggle("open"));
}

for (const stage of document.querySelectorAll("[data-drift]")) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) break;
  const pieces = [...stage.querySelectorAll("[data-drag]")];
  let seen = false;
  let touched = false;
  stage.addEventListener("pointerdown", () => (touched = true), { once: true });
  new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting;
    if (seen) requestAnimationFrame(drift);
  }).observe(stage);
  function drift(now) {
    if (!seen || touched) return;
    const t = now / 1000;
    pieces.forEach((piece, i) => {
      const x = Math.sin(t * (0.5 + i * 0.17) + i * 2) * (46 + i * 34) + (1 - i) * 26 * (Math.sin(t * 0.4) + 1);
      const y = Math.cos(t * (0.42 + i * 0.13) + i) * (40 + i * 16);
      piece.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    requestAnimationFrame(drift);
  }
}

const playground = document.querySelector("[data-playground]");
if (playground) {
  const glass = playground.querySelector("edinstvo-glass");
  const controls = playground.querySelector(".controls");
  const output = document.querySelector("#snippet");
  const start = { ...defaults, ...motionDefaults };
  const name = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const changed = {};
  const write = () => {
    const attributes = Object.entries(changed).map(([key, value]) => ` ${name(key)}="${value}"`).join("");
    output.textContent = `<edinstvo-glass${attributes}></edinstvo-glass>`;
  };
  for (const [key, [min, max]] of Object.entries({ ...ranges, ...motionRanges })) {
    const label = document.createElement("label");
    const value = document.createElement("output");
    const input = Object.assign(document.createElement("input"), { type: "range", min, max, step: (max - min) / 100, value: start[key] });
    value.textContent = (+start[key]).toFixed(2);
    label.append(name(key), value, input);
    input.addEventListener("input", () => {
      const number = +(+input.value).toFixed(2);
      value.textContent = number.toFixed(2);
      changed[key] = number;
      glass.setAttribute(name(key), number);
      write();
    });
    controls.append(label);
  }
  write();
}

for (const panel of document.querySelectorAll("[data-lights]")) {
  const read = () => {
    const light = {};
    for (const input of panel.querySelectorAll("input:not([type=checkbox])")) light[input.name] = input.type === "range" ? Number(input.value) : input.value;
    setSceneLight(light);
  };
  panel.addEventListener("input", (event) => {
    if (event.target.type !== "checkbox") return read();
    for (const glass of document.querySelectorAll(".stage edinstvo-glass")) {
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

for (const stage of document.querySelectorAll("[data-load]")) {
  const controls = document.querySelector("[data-load-controls]");
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
  const show = (name, text) => (document.querySelector(`[data-${name}]`).textContent = text);
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
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
