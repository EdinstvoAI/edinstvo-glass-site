import { createReadStream, existsSync, statSync, realpathSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("dist", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".ttf": "font/ttf" };
const port = Number(process.env.PORT) || 4392;

createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://x").pathname); }
  catch { response.writeHead(400).end(); return; }
  if (pathname.includes("\0") || pathname.split(/[\\/]/).some(part => part.startsWith("."))) { response.writeHead(404).end(); return; }
  let file = resolve(root, pathname.replace(/^\/+/, ""));
  try {
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!file.startsWith(root + sep) || !existsSync(file) || !realpathSync(file).startsWith(root + sep) || !statSync(file).isFile()) { response.writeHead(404).end(); return; }
  } catch { response.writeHead(404).end(); return; }
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).on("error", () => response.destroy()).pipe(response);
}).listen(port, process.env.HOST ?? "127.0.0.1", () => console.log(`http://localhost:${port}`));
