// Sesión firmada (HMAC) para el panel. Sin dependencias externas.
// El token es:  base64url(payload) + "." + hmacSHA256(payload, SESSION_SECRET)
const crypto = require("crypto");
const COOKIE = "asp_session";
const MAX_AGE = 2 * 24 * 3600; // 2 días en segundos (panel de admin)

function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return data + "." + mac;
}

function verify(token, secret) {
  if (!token || typeof token !== "string" || token.indexOf(".") < 0) return null;
  const idx = token.lastIndexOf(".");
  const data = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const out = {};
  const h = req.headers && req.headers.cookie;
  if (!h) return out;
  h.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function getSession(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const payload = verify(parseCookies(req)[COOKIE], secret);
  if (!payload) return null;
  // revocación global: cambiar SESSION_GENERATION en Vercel invalida todas las sesiones de golpe
  if ((payload.gen || "1") !== (process.env.SESSION_GENERATION || "1")) return null;
  return payload;
}

// Defensa CSRF en profundidad: rechaza mutaciones cuyo Origin sea de otro sitio.
// Permisivo si no hay cabecera Origin (algunas peticiones same-origin la omiten).
function sameOrigin(req) {
  const origin = req.headers && req.headers.origin;
  if (!origin) return true;
  try {
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
    return new URL(origin).host.toLowerCase() === host;
  } catch (e) {
    return false;
  }
}

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

module.exports = { sign, verify, getSession, sameOrigin, parseCookies, cookieHeader, COOKIE, MAX_AGE };
