const root = document.documentElement;
const scene = document.querySelector("#site-scene");
const context = scene.getContext("2d");
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const dark = () => root.dataset.theme ? root.dataset.theme === "dark" : darkQuery.matches;
const surfaces = [];
const sidebar = document.querySelector(".sidebar");
const navigation = sidebar.querySelector("nav");
const selection = document.createElement("div");
selection.className = "nav-indicator";
selection.setAttribute("aria-hidden", "true");
navigation.prepend(selection);
let selectedSurface;
let frame = 0;

function placeSelection() {
  const active = sidebar.querySelector("a[aria-current]");
  if (!active) return;
  const rect = active.getBoundingClientRect(), parent = navigation.getBoundingClientRect();
  selection.style.transform = `translateY(${rect.top - parent.top}px)`;
  selection.style.width = `${rect.width}px`;
  selection.style.height = `${rect.height}px`;
  selectedSurface?.invalidate();
}

function paint() {
  frame = 0;
  const scale = Math.min(devicePixelRatio || 1, 2);
  scene.width = Math.round(innerWidth * scale);
  scene.height = Math.round(innerHeight * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  const light = context.createLinearGradient(0, 0, innerWidth, 280);
  const night = dark();
  light.addColorStop(0, night ? "#343434" : "#dedede");
  light.addColorStop(0.48, night ? "#232323" : "#eeeeee");
  light.addColorStop(1, night ? "#181818" : "#f6f6f6");
  context.fillStyle = light;
  context.fillRect(0, 0, innerWidth, innerHeight);
  context.strokeStyle = night ? "#ffffff0c" : "#ffffff80";
  context.beginPath(); context.moveTo(0, 62); context.lineTo(innerWidth, 62); context.stroke();
  for (const surface of surfaces) surface.invalidate();
}

function repaint() { frame ||= requestAnimationFrame(paint); }
paint();
try {
  const { attachGlass } = await import(`${document.body.dataset.base}/glass/index.js`);
  const material = { frost: 0.32, transparency: 0.9, lift: 0, refraction: 0.45, thickness: 10, depth: 12, dispersion: 0.12, bloom: 0, rim: 0.4, light: 0.25, lightSoftness: 0.6 };
  placeSelection();
  for (const element of [selection, document.querySelector(".tools")]) {
    surfaces.push(attachGlass(element, { source: scene, live: false, material, motion: { follow: 0.08, press: 0.04, jelly: 0.1, glow: 0.15 } }));
  }
  selectedSurface = surfaces[0];
  sidebar.toggleAttribute("data-glass-ready", selection.dataset.engine === "webgl");
} catch (error) {
  console.warn("Edinstvo Glass navigation uses its CSS fallback.", error);
}
addEventListener("resize", repaint, { passive: true });
addEventListener("resize", placeSelection, { passive: true });
addEventListener("docs:route", placeSelection);
new ResizeObserver(placeSelection).observe(navigation);
darkQuery.addEventListener("change", () => { root.dataset.mode = dark() ? "dark" : "light"; repaint(); });
new MutationObserver(repaint).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
addEventListener("pagehide", event => {
  if (event.persisted) return;
  cancelAnimationFrame(frame);
  surfaces.forEach(surface => surface.destroy());
});
