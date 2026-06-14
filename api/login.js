// POST /api/login  { password }  -> cookie de sesión firmada
const crypto = require("crypto");
const { sign, getSession, cookieHeader, MAX_AGE } = require("../lib/session.js");

module.exports = async (req, res) => {
  const J = (c, o) => { res.statusCode = c; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };

  // GET -> ¿hay sesión activa? (para que el panel no pida contraseña en cada recarga)
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    return J(200, { auth: !!getSession(req) });
  }

  if (req.method !== "POST") return J(405, { error: "Método no permitido" });

  const pass = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!pass || !secret) return J(500, { error: "Falta configurar ADMIN_PASSWORD y SESSION_SECRET en Vercel." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  const given = Buffer.from(String(body.password || ""));
  const real = Buffer.from(pass);
  const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // retardo fijo: frena la fuerza bruta
    return J(401, { error: "Contraseña incorrecta." });
  }

  const token = sign({ exp: Date.now() + MAX_AGE * 1000, gen: process.env.SESSION_GENERATION || "1" }, secret);
  res.setHeader("Set-Cookie", cookieHeader(token, MAX_AGE));
  return J(200, { ok: true });
};
