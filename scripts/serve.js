/* Minimal static file server for local preview of /dist. No dependencies. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const PORT = process.env.PORT || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon"
};

function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  let fp = path.join(DIST, p);
  if (p.endsWith("/")) fp = path.join(fp, "index.html");
  else if (!path.extname(fp)) {
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, "index.html");
    else if (fs.existsSync(fp + ".html")) fp = fp + ".html";
    else fp = path.join(fp, "index.html");
  }
  return fp;
}

http.createServer((req, res) => {
  let fp = resolve(req.url);
  fs.readFile(fp, (err, data) => {
    if (err) {
      const nf = path.join(DIST, "404.html");
      if (fs.existsSync(nf)) { res.writeHead(404, { "Content-Type": TYPES[".html"] }); res.end(fs.readFileSync(nf)); }
      else { res.writeHead(404); res.end("Not found"); }
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Serving /dist at http://localhost:${PORT}`));
