// Static file server for the exported web bundle (expo/dist) on :8080.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../dist", import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript",
  ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon",
  ".json": "application/json", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2",
};
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "x://y").pathname);
    let file = normalize(join(ROOT, path === "/" ? "/index.html" : path));
    if (!file.startsWith(ROOT)) file = join(ROOT, "index.html");
    let body;
    try { body = await readFile(file); } catch { file = join(ROOT, "index.html"); body = await readFile(file); }
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch (e) { res.writeHead(500).end(String(e)); }
}).listen(8080, () => console.log("dist served on http://localhost:8080"));
