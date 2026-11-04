const base = document.body.dataset.base;
const { defaults, motionDefaults, motionRanges, ranges } = await import(`${base}/glass/index.js`);
await import(`${base}/glass/define.js`);

function paint(canvas) {
  const { width, height } = canvas.parentElement.getBoundingClientRect();
  canvas.width = width * 2;
  canvas.height = height * 2;
  const c = canvas.getContext("2d");
  c.scale(2, 2);
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
