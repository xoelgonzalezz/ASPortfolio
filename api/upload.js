// POST /api/upload  { dataUrl, filename }  -> sube la foto al Blob y devuelve { url }. Requiere sesión.
// La imagen llega ya reescalada desde el navegador como data URL (base64), bien por debajo del límite de 4.5 MB.
const { getSession, sameOrigin } = require("../lib/session.js");
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN; // explícito: fuerza el store público (evita OIDC/store conectado)

module.exports = async (req, res) => {
  const J = (c, o) => { res.statusCode = c; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
  if (req.method !== "POST") return J(405, { error: "Método no permitido" });
  if (!sameOrigin(req)) return J(403, { error: "Origen no permitido" });
  if (!getSession(req)) return J(401, { error: "No autorizado" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { return J(400, { error: "JSON inválido" }); } }
  const dataUrl = body && body.dataUrl;
  if (!dataUrl || typeof dataUrl !== "string") return J(400, { error: "Falta la imagen" });

  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return J(400, { error: "Formato de imagen no válido" });
  const contentType = m[1];
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (ALLOWED.indexOf(contentType) < 0) return J(415, { error: "Tipo no permitido (usa JPG, PNG, WEBP o GIF)" });
  if (m[2].length > 6 * 1024 * 1024) return J(413, { error: "Imagen demasiado grande" }); // límite sobre el base64 (~4.5 MB reales en Vercel)
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length) return J(400, { error: "Imagen vacía" });

  const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg").replace("+xml", "");
  const base =
    String(body.filename || "foto")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "foto";

  try {
    const { put } = await import("@vercel/blob");
    const blob = await put("fotos/" + base + "." + ext, buf, {
      access: "public",
      addRandomSuffix: true,
      contentType,
      token: TOKEN,
    });
    return J(200, { url: blob.url });
  } catch (e) {
    console.error("upload error", e);
    return J(500, { error: "No se pudo subir la imagen" });
  }
};
