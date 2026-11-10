import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = await mkdtemp(join(tmpdir(), "glass-navigation-"));
async function freePort() {
  const reserve = createServer();
  await new Promise(resolve => reserve.listen(0, "127.0.0.1", resolve));
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  return port;
}
const port = await freePort(), debugPort = await freePort();
const preview = spawn(process.execPath, ["serve.mjs"], { cwd: root, env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" }, stdio: "ignore" });
const browser = spawn(process.env.CHROME_BIN ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome"), ["--headless", "--no-first-run", "--no-default-browser-check", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
let browserLog = "";
browser.stderr.on("data", chunk => { browserLog = (browserLog + chunk).slice(-2000); });
let socket, startupError;
browser.on("error", error => { startupError = error; });
preview.on("error", error => { startupError = error; });
const errors = [], pending = new Map();
let sequence = 0;
const base = `http://127.0.0.1:${port}`;

async function until(read, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (startupError) throw startupError;
    try { const value = await read(); if (value) return value; } catch (error) { if (Date.now() - start > timeout - 200) throw error; }
    await pause(80);
  }
  throw new Error("Timed out waiting for browser state");
}

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, message => { clearTimeout(timer); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function route(slug) {
  await evaluate(`document.querySelector('.sidebar a[href="/ru/docs/${slug}/"]').click()`);
  await until(() => evaluate(`location.pathname === '/ru/docs/${slug}/' && !document.body.hasAttribute('data-navigating') && !document.documentElement.hasAttribute('data-route-transition')`));
}
const check = (name, value) => { assert.ok(value, name); console.log(`ok ${name}`); };

try {
  await until(async () => (await fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(1000) })).ok, 30000).catch(error => { throw new Error(`${error.message}\n${browserLog}`); });
  await until(async () => (await fetch(`${base}/ru/docs/optics/`)).ok);
  const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  });
  await call("Runtime.enable"); await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: `${base}/ru/docs/optics/` });
  await until(() => evaluate(`document.querySelector('.nav-indicator')?.dataset.engine === 'webgl' && document.querySelector('.tools')?.dataset.engine === 'webgl'`));
  check("complete sidebar uses the real glass engine", await evaluate(`document.querySelectorAll('.nav-group').length === 6 && document.querySelectorAll('.sidebar a').length >= 24 && !document.querySelector('.tabs')`));
  await evaluate(`window.__shell = { header: document.querySelector('header'), sidebar: document.querySelector('.sidebar'), canvas: document.querySelector('.nav-indicator canvas') }`);
  await route("installation");
  check("section change preserves header, sidebar and glass canvas", await evaluate(`__shell.header === document.querySelector('header') && __shell.sidebar === document.querySelector('.sidebar') && __shell.canvas === document.querySelector('.nav-indicator canvas')`));
  await route("geometry");
  await evaluate("history.back()");
  await until(() => evaluate(`location.pathname === '/ru/docs/installation/' && !document.body.hasAttribute('data-navigating')`));
  await evaluate("history.forward()");
  await until(() => evaluate(`location.pathname === '/ru/docs/geometry/' && !document.body.hasAttribute('data-navigating')`));
  check("back and forward restore article and selection", await evaluate(`document.querySelector('h1').textContent === 'Геометрия' && document.querySelector('.sidebar a[aria-current]').pathname === location.pathname`));

  await evaluate(`window.__fetch = fetch; window.fetch = async (url, options) => { if (String(url).includes('/lighting/')) await new Promise(r => setTimeout(r, 180)); return __fetch(url, options); }; document.querySelector('.sidebar a[href="/ru/docs/lighting/"]').click(); document.querySelector('.sidebar a[href="/ru/docs/optics/"]').click()`);
  await until(() => evaluate(`location.pathname === '/ru/docs/optics/' && !document.body.hasAttribute('data-navigating')`));
  await pause(250); await evaluate("window.fetch = __fetch");
  check("latest navigation wins over a stale fetch", await evaluate(`location.pathname === '/ru/docs/optics/' && document.querySelector('h1').textContent === 'Оптика'`));

  await route("playground");
  await until(() => evaluate(`document.querySelectorAll('.controls input[type=range]').length > 20`));
  await evaluate(`document.querySelector('[data-shape="square"]').click()`);
  check("playground initializes after an asynchronous transition", await evaluate(`document.querySelectorAll('[data-added-shape]').length === 1`));
  await evaluate(`(async () => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2; const c = canvas.getContext('2d'); c.fillStyle = '#165ae5'; c.fillRect(0, 0, 2, 2); const blob = await new Promise(r => canvas.toBlob(r)); const transfer = new DataTransfer(); transfer.items.add(new File([blob], 'test.png', {type:'image/png'})); const input = document.querySelector('.upload input'); input.files = transfer.files; input.dispatchEvent(new Event('change')); })()`);
  await until(() => evaluate(`document.documentElement.hasAttribute('data-photo')`));
  await route("geometry");
  check("uploaded image persists across articles", await evaluate(`(() => {const p = document.querySelector('[data-stage] > canvas').getContext('2d').getImageData(0,0,1,1).data; return p[2] > 200 && p[0] < 40;})()`));
  await route("playground");
  check("revisiting does not duplicate demo controls", await evaluate(`document.querySelectorAll('.upload:not(.reset)').length === 1 && document.querySelectorAll('[data-added-shape]').length === 0 && document.querySelectorAll('.selection-caption').length === 1`));
  await route("examples");
  check("six configurable example scenes are available", await evaluate(`document.querySelectorAll('[data-scene]').length === 6`));
  for (const scene of ["navigation", "controls", "card", "search", "layers", "merge"]) {
    await evaluate(`document.querySelector('[data-scene="${scene}"]').click()`);
    await until(() => evaluate(`!!document.querySelector('.showcase-content [data-engine=webgl]')`));
    await evaluate(`(() => {const field = document.querySelector('.showcase-controls input[aria-label="Преломление"]'); field.value = '0.73'; field.dispatchEvent(new Event('input'));})()`);
    check(`example ${scene} changes the actual material`, await evaluate(`document.querySelector('[data-example-code]').textContent.includes('refraction="0.73"') && document.querySelector('.showcase-content [data-engine=webgl]') !== null`));
  }
  await route("performance");
  await route("reference");
  await pause(700);
  await evaluate(`window.__raf = requestAnimationFrame; window.__rafCount = 0; window.requestAnimationFrame = callback => { __rafCount++; return __raf(callback); }`);
  await until(async () => { await evaluate("window.__rafCount = 0"); await pause(200); return evaluate("__rafCount === 0"); }, 8000);
  check("leaving a benchmark stops its animation loop", true);
  await evaluate("window.requestAnimationFrame = __raf");

  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('.menu').click()`);
  check("mobile navigation opens as a modal with focus inside", await evaluate(`document.querySelector('.sidebar').getAttribute('aria-modal') === 'true' && document.querySelector('main').inert && document.activeElement.classList.contains('nav-close')`));
  await route("installation");
  check("following a mobile link closes the drawer", await evaluate(`!document.body.hasAttribute('data-menu-open') && !document.querySelector('main').inert && document.querySelector('.menu').getAttribute('aria-expanded') === 'false'`));
  await evaluate(`document.querySelector('.search-open').click()`);
  await until(() => evaluate(`document.querySelector('dialog.search').open`));
  await until(async () => {
    await evaluate(`(() => {const input = document.querySelector('dialog.search input'); input.value = 'Геометрия'; input.dispatchEvent(new Event('input'));})()`);
    return evaluate(`document.querySelectorAll('dialog.search a').length > 0`);
  });
  await evaluate(`document.querySelector('dialog.search a').click()`);
  await until(() => evaluate(`location.pathname.includes('/geometry/') && !document.body.hasAttribute('data-navigating')`));
  check("local search routes without leaving its dialog open", await evaluate(`!document.querySelector('dialog.search').open && __shell.header === document.querySelector('header')`));
  check("mobile layout has no horizontal overflow", await evaluate(`document.documentElement.scrollWidth <= innerWidth`));
  await route("examples");
  check("showcase controls fit the mobile layout", await evaluate(`document.querySelectorAll('[data-scene]').length === 6 && document.documentElement.scrollWidth <= innerWidth`));
  await route("geometry");

  await evaluate(`window.fetch = (url, options) => String(url).includes('/lighting/') ? Promise.reject(new Error('test offline')) : __fetch(url, options); document.querySelector('.sidebar a[href="/ru/docs/lighting/"]').click()`);
  await until(() => evaluate(`!!document.querySelector('.nav-error[role=alert]')`));
  check("failed fetch preserves the current article", await evaluate(`location.pathname.includes('/geometry/') && document.querySelector('h1').textContent === 'Геометрия'`));
  await evaluate(`window.fetch = __fetch; document.querySelector('.nav-error a').click()`);
  await until(() => evaluate(`location.pathname.includes('/lighting/') && !document.body.hasAttribute('data-navigating')`));
  check("retry recovers after a failed fetch", await evaluate(`!document.querySelector('.nav-error')`));
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await evaluate(`window.__transitions = 0; const start = document.startViewTransition.bind(document); document.startViewTransition = callback => { __transitions++; return start(callback); }`);
  await route("reference");
  check("reduced motion bypasses animated routing", await evaluate(`__transitions === 0`));
  assert.deepEqual(errors, [], "uncaught browser exceptions");
  check("no uncaught browser exceptions", true);
} finally {
  socket?.close();
  browser.kill(); preview.kill();
  await pause(400);
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
