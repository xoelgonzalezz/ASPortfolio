// Servidor estático mínimo (sin dependencias) para previsualizar el portfolio
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 4321;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      return fs.readFile(path.join(ROOT, "404.html"), (e2, page) => {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(e2 ? "Not found" : page);
      });
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log("Portfolio en http://localhost:" + PORT));
