// POST /api/upload — subida de fotos mediante "client upload" de Vercel Blob.
// La foto va DIRECTA del navegador a Vercel Blob (no pasa por esta función), así que NO le
// afecta el límite de 4,5 MB del cuerpo de petición: sube a calidad completa, sin comprimir extra.
// Esta ruta solo: (1) firma un token de subida tras autenticar al editor, y
// (2) recibe el aviso de "subida completada" de Vercel (verificado por firma).
const { getSession } = require("../lib/session.js");
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN; // store público; explícito para no caer en OIDC/store conectado

module.exports = async (req, res) => {
  const J = (c, o) => { res.statusCode = c; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
  if (req.method !== "POST") return J(405, { error: "Método no permitido" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { return J(400, { error: "JSON inválido" }); } }

  try {
    const { handleUpload } = await import("@vercel/blob/client");
    const result = await handleUpload({
      token: TOKEN,
      body: body,
      request: req,
      onBeforeGenerateToken: async function () {
        // Solo el editor con sesión válida puede pedir un token de subida.
        if (!getSession(req)) throw new Error("No autorizado");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          addRandomSuffix: true,
          maximumSizeInBytes: 30 * 1024 * 1024,
        };
      },
      onUploadCompleted: async function () { /* el panel guarda la URL en content.json al Guardar */ },
    });
    return J(200, result);
  } catch (e) {
    console.error("upload error:", e && e.message);
    // 400 para que el webhook de Vercel reintente si fuese un fallo transitorio del callback.
    return J(400, { error: (e && e.message) || "No se pudo subir la imagen" });
  }
};
