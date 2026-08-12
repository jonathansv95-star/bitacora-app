const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const DIST = path.join(__dirname, "dist");
const PUERTO = Number(process.env.PORT || process.argv[2] || 5173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function leer(ruta) {
  try {
    return { contenido: fs.readFileSync(ruta), tipo: MIME[path.extname(ruta)] || "application/octet-stream" };
  } catch (e) {
    return null;
  }
}

http
  .createServer(function (req, res) {
    try {
      var ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (ruta === "/") ruta = "/index.html";
      var archivo = path.join(DIST, path.normalize(ruta).replace(/^(\.\.[\\/])+/, ""));

      var encontrado = leer(archivo);
      if (!encontrado) encontrado = leer(path.join(DIST, "index.html"));

      if (!encontrado) {
        res.writeHead(404);
        res.end("404 - No encontrado");
        return;
      }
      res.writeHead(200, { "Content-Type": encontrado.tipo });
      res.end(encontrado.contenido);
    } catch (e) {
      res.writeHead(500);
      res.end("Error interno: " + e.message);
    }
  })
  .listen(PUERTO, "0.0.0.0", function () {
    console.log("Bitacora web lista (servidor de la planta)");
    console.log("Abre http://localhost:" + PUERTO + " en esta PC");
    console.log("Y desde otra PC de la red usa una de estas direcciones:");
    var ifaces = os.networkInterfaces();
    for (var nombre in ifaces) {
      (ifaces[nombre] || []).forEach(function (i) {
        if (i.family === "IPv4" && !i.internal) {
          console.log("  http://" + i.address + ":" + PUERTO + "   [" + nombre + "]");
        }
      });
    }
    console.log("Presiona Ctrl+C para detener el servidor.");
  });
