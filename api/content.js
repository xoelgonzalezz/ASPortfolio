// GET  /api/content  -> contenido actual (Blob si existe, si no el seed del repo). Público.
// PUT  /api/content  -> guarda el contenido (requiere sesión). Crea un blob nuevo y borra los viejos.
const { getSession, sameOrigin } = require("../lib/session.js");
const seed = require("../content.json");

const PREFIX = "content/";
// Token explícito en cada llamada: fuerza el store del BLOB_READ_WRITE_TOKEN y evita
// que el SDK resuelva el store por OIDC / store conectado al proyecto (que es el privado).
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

module.exports = async (req, res) => {
  const J = (c, o) => { res.statusCode = c; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: PREFIX, token: TOKEN });
      if (!blobs || !blobs.length) return J(200, seed);
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const r = await fetch(blobs[0].url, { cache: "no-store" });
      if (!r.ok) throw new Error("fetch blob " + r.status);
      const data = await r.json();
      return J(200, data);
    } catch (e) {
      console.error("content GET: fallback al seed:", e && e.message);
      return J(200, seed);
    }
  }

  if (req.method === "PUT") {
    if (!sameOrigin(req)) return J(403, { error: "Origen no permitido" });
    if (!getSession(req)) return J(401, { error: "No autorizado" });
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { return J(400, { error: "JSON inválido" }); } }
    const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
    if (!isObj(body)) return J(400, { error: "Contenido inválido" });
    if (!Array.isArray(body.sections) || !isObj(body.site) || !isObj(body.hero) || !isObj(body.ui) || !isObj(body.about) || !isObj(body.contact)) {
      return J(400, { error: "Faltan campos obligatorios del contenido" });
    }
    if (JSON.stringify(body).length > 2 * 1024 * 1024) return J(413, { error: "Contenido demasiado grande" });

    try {
      const { put, list, del } = await import("@vercel/blob");
      const blob = await put(PREFIX + "data.json", JSON.stringify(body), {
        access: "public",
        addRandomSuffix: true,
        contentType: "application/json",
        token: TOKEN,
      });
      try {
        const { blobs } = await list({ prefix: PREFIX, token: TOKEN });
        const old = (blobs || []).filter((b) => b.url !== blob.url).map((b) => b.url);
        if (old.length) await del(old, { token: TOKEN });
      } catch (e) { /* la limpieza no es crítica */ }
      return J(200, { ok: true });
    } catch (e) {
      console.error("content PUT error", e);
      return J(500, { error: "No se pudo guardar el contenido" });
    }
  }

  return J(405, { error: "Método no permitido" });
};
